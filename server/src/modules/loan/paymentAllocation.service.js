/**
 * Shared loan payment allocation engine (server-side source of truth).
 *
 * A loan's repayment behavior is defined by two independent axes:
 *   Repayment Method     EMI | INTEREST_ONLY
 *   Interest Calculation CONSTANT_FLAT | FLEXIBLE_REDUCING
 *
 * giving four combinations:
 *   EMI + Constant        Fixed principal & fixed interest every period, both flat
 *                          for the whole tenure — a pre-built schedule at disbursement.
 *   EMI + Flexible         Fixed EMI, but interest is computed on the *reducing*
 *                          balance each period so the principal/interest split shifts
 *                          — standard bank amortization, also a pre-built schedule.
 *   Interest Only + Constant   Interest every period is on the ORIGINAL principal,
 *                              regardless of any principal already paid down.
 *   Interest Only + Flexible   Interest is on the CURRENT outstanding principal,
 *                              accrued live day-by-day since the last payment; any
 *                              extra paid beyond interest due reduces principal.
 *
 * For every combination, whenever a specific period/payment's interest is being
 * settled, it is always collected before that period's principal — paying more than
 * what's owed for interest just accelerates principal payoff (prepayment).
 */

export function daysBetween(fromDateStr, toDateStr) {
  if (!fromDateStr || !toDateStr) return 0;
  const from = new Date(fromDateStr);
  const to = new Date(toDateStr);
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);
  const diffMs = to.getTime() - from.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Resolves which date to accrue interest from for an Interest-Only loan that has no
 * explicit `last_payment_date` yet. A loan that has never been paid accrues from its
 * disbursement date (`loan_date`). A loan that already shows a collected amount has
 * clearly been paid before even though we don't know exactly when — treating that as
 * "last paid at disbursement" would wrongly pile up interest for the loan's entire
 * lifetime on the next payment, so it defaults to "paid yesterday" instead.
 */
export function resolveLastPaymentDate(loan, referenceDateStr) {
  const today = referenceDateStr || new Date().toISOString().slice(0, 10);
  if (!loan) return today;
  if (loan.last_payment_date) return loan.last_payment_date;

  if ((loan.collected_amount || 0) > 0) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  return loan.loan_date || today;
}

// Loans created before this scheme-aware engine existed have no repayment_method /
// interest_calculation fields. Defaulting them to Interest Only + Flexible keeps
// their behavior as live day-based accrual on the outstanding balance.
export function resolveRepaymentMethod(loan) {
  return loan?.repayment_method || 'INTEREST_ONLY';
}

export function resolveInterestCalculation(loan) {
  return loan?.interest_calculation || 'FLEXIBLE_REDUCING';
}

/**
 * Builds the fixed period-by-period repayment schedule for an EMI loan (Constant or
 * Flexible). Generated once, at disbursement, and stored on the loan — EMI payments
 * are always settled against this schedule, never recomputed live from elapsed days.
 */
export function generateEmiSchedule({
  principal,
  monthlyInterestRate,
  tenureMonths,
  repaymentFrequency = 'DAILY',
  interestCalculation = 'CONSTANT_FLAT',
  startDate
}) {
  const P = parseFloat(principal) || 0;
  const monthlyRate = parseFloat(monthlyInterestRate) || 0;
  const months = parseFloat(tenureMonths) || 1;
  const totalDays = Math.max(Math.round(months * 30), 1);

  let periodsCount;
  let ratePerPeriod;
  let periodDays;
  if (repaymentFrequency === 'WEEKLY') {
    periodsCount = Math.max(Math.round(totalDays / 7), 1);
    ratePerPeriod = (monthlyRate / 100 / 30) * 7;
    periodDays = 7;
  } else if (repaymentFrequency === 'MONTHLY') {
    periodsCount = Math.max(Math.round(months), 1);
    ratePerPeriod = monthlyRate / 100;
    periodDays = 30;
  } else {
    periodsCount = totalDays;
    ratePerPeriod = monthlyRate / 100 / 30;
    periodDays = 1;
  }

  const base = startDate ? new Date(startDate) : new Date();
  const schedule = [];

  if (interestCalculation === 'FLEXIBLE_REDUCING') {
    const r = ratePerPeriod;
    const emi = r > 0
      ? Math.ceil((P * r * Math.pow(1 + r, periodsCount)) / (Math.pow(1 + r, periodsCount) - 1))
      : Math.ceil(P / periodsCount);

    let balance = P;
    for (let i = 1; i <= periodsCount; i++) {
      const interest = Math.round(balance * r);
      let principalPortion = emi - interest;
      if (i === periodsCount || principalPortion > balance) {
        principalPortion = balance;
      }
      principalPortion = Math.max(0, Math.round(principalPortion));
      balance = Math.max(0, balance - principalPortion);

      const dueDate = new Date(base);
      dueDate.setDate(dueDate.getDate() + i * periodDays);

      schedule.push({
        period: i,
        due_date: dueDate.toISOString().slice(0, 10),
        principal: principalPortion,
        interest,
        emi: principalPortion + interest,
        principal_paid: 0,
        interest_paid: 0
      });
    }
  } else {
    const principalPerPeriod = Math.round(P / periodsCount);
    const interestPerPeriod = Math.round(P * ratePerPeriod);
    let allocatedPrincipal = 0;

    for (let i = 1; i <= periodsCount; i++) {
      let principalPortion = principalPerPeriod;
      if (i === periodsCount) {
        principalPortion = Math.max(0, P - allocatedPrincipal);
      }
      allocatedPrincipal += principalPortion;

      const dueDate = new Date(base);
      dueDate.setDate(dueDate.getDate() + i * periodDays);

      schedule.push({
        period: i,
        due_date: dueDate.toISOString().slice(0, 10),
        principal: principalPortion,
        interest: interestPerPeriod,
        emi: principalPortion + interestPerPeriod,
        principal_paid: 0,
        interest_paid: 0
      });
    }
  }

  return schedule;
}

/**
 * Applies a payment against a fixed EMI schedule. Within whichever period the
 * payment lands on, that period's interest is always settled before its principal.
 */
export function allocateEmiPayment({ schedule, paymentAmount }) {
  let remaining = parseFloat(paymentAmount) || 0;
  let principalPortion = 0;
  let interestPortion = 0;
  const updatedSchedule = (schedule || []).map(row => ({ ...row }));

  for (const row of updatedSchedule) {
    if (remaining <= 0) break;
    const interestOwed = row.interest - (row.interest_paid || 0);
    const principalOwed = row.principal - (row.principal_paid || 0);
    if (interestOwed <= 0 && principalOwed <= 0) continue;

    if (interestOwed > 0) {
      const pay = Math.min(remaining, interestOwed);
      row.interest_paid = (row.interest_paid || 0) + pay;
      interestPortion += pay;
      remaining -= pay;
    }
    if (remaining > 0 && principalOwed > 0) {
      const pay = Math.min(remaining, principalOwed);
      row.principal_paid = (row.principal_paid || 0) + pay;
      principalPortion += pay;
      remaining -= pay;
    }
  }

  return {
    interestPortion: Math.round(interestPortion),
    principalPortion: Math.round(principalPortion),
    updatedSchedule,
    unappliedAmount: Math.max(0, Math.round(remaining))
  };
}

/**
 * Single entry point used by the collection service. Reads the loan's configured
 * Repayment Method + Interest Calculation and dispatches to the matching strategy.
 */
export function calculatePaymentAllocation({ loan, paymentAmount, paymentDate }) {
  const repaymentMethod = resolveRepaymentMethod(loan);
  const interestCalculation = resolveInterestCalculation(loan);
  const amount = parseFloat(paymentAmount) || 0;

  if (repaymentMethod === 'EMI') {
    const schedule = (loan?.repayment_schedule && loan.repayment_schedule.length)
      ? loan.repayment_schedule
      : generateEmiSchedule({
          principal: loan?.principal_amount,
          monthlyInterestRate: loan?.monthly_interest_rate,
          tenureMonths: (loan?.tenure_days || 120) / 30,
          repaymentFrequency: loan?.repayment_frequency || 'DAILY',
          interestCalculation,
          startDate: loan?.loan_date
        });

    const result = allocateEmiPayment({ schedule, paymentAmount: amount });

    return {
      strategy: `EMI_${interestCalculation}`,
      interestPortion: result.interestPortion,
      principalPortion: result.principalPortion,
      newPendingPrincipal: Math.max(0, (loan?.pending_amount || 0) - result.principalPortion),
      updatedSchedule: result.updatedSchedule,
      unappliedAmount: result.unappliedAmount,
      daysSinceLastPayment: null
    };
  }

  const principalBase = interestCalculation === 'CONSTANT_FLAT'
    ? (loan?.principal_amount || 0)
    : (loan?.pending_amount || 0);

  const lastPaymentDate = resolveLastPaymentDate(loan, paymentDate);
  const days = daysBetween(lastPaymentDate, paymentDate);
  const dailyRate = (parseFloat(loan?.monthly_interest_rate) || 0) / 100 / 30;
  const interestDue = Math.round(principalBase * dailyRate * days);

  const interestPortion = Math.min(amount, Math.max(0, interestDue));
  const principalPortion = Math.max(0, amount - interestPortion);
  const newPendingPrincipal = Math.max(0, (loan?.pending_amount || 0) - principalPortion);

  return {
    strategy: `INTEREST_ONLY_${interestCalculation}`,
    daysSinceLastPayment: days,
    interestDue,
    interestPortion,
    principalPortion,
    newPendingPrincipal
  };
}
