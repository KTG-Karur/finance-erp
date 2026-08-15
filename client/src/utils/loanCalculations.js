import { evaluateFormula } from './formulaEngine';

// Shared loan payment allocation engine.
//
// A loan's repayment behavior is defined by two independent axes (set on its Loan
// Scheme, copied onto the loan at disbursement):
//
//   Repayment Method     EMI | INTEREST_ONLY
//   Interest Calculation CONSTANT_FLAT | FLEXIBLE_REDUCING
//
// giving four real combinations:
//   EMI + Constant        Fixed principal & fixed interest every period, both flat
//                          for the whole tenure — a pre-built schedule at disbursement.
//   EMI + Flexible         Fixed EMI, but interest is computed on the *reducing*
//                          balance each period so the principal/interest split shifts
//                          — standard bank amortization, also a pre-built schedule.
//   Interest Only + Constant   Interest every period is on the ORIGINAL principal,
//                              regardless of any principal already paid down.
//   Interest Only + Flexible   Interest is on the CURRENT outstanding principal,
//                              accrued live day-by-day since the last payment; any
//                              extra paid beyond interest due reduces principal.
//
// For every combination, whenever a specific period/payment's interest is being
// settled, it is always collected before that period's principal — paying more than
// what's owed for interest just accelerates principal payoff (prepayment).

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
 * disbursement date (`loan_date`). A loan that already shows a collected amount
 * (e.g. seeded/demo data, or a record from before this tracking existed) has clearly
 * been paid before even though we don't know exactly when — treating that as "last
 * paid at disbursement" would wrongly pile up interest for the loan's entire
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

// Loans created before this scheme-aware engine existed (or created without a
// matched scheme) have no `repayment_method` / `interest_calculation` fields.
// Defaulting them to Interest Only + Flexible reproduces the live day-based
// behavior this app already used (and was validated against), so existing loans
// don't silently change numbers — only loans created against a real Loan Scheme
// going forward get EMI/Constant handling.
export function resolveRepaymentMethod(loan) {
  if (loan?.repayment_method === 'EMI' || loan?.repayment_method === 'INTEREST_ONLY') {
    return loan.repayment_method;
  }
  // A loan with no repayment_method at all keeps the pre-existing "assume
  // Interest Only" default (see note above). A loan that *does* have one, but
  // holding a stale non-canonical value (e.g. 'FIXED_EMI' from before schemes
  // wrote the new field correctly), was always meant to be an EMI loan.
  if (loan?.repayment_method) return 'EMI';
  return loan?.repayment_mode === 'EMI' ? 'EMI' : 'INTEREST_ONLY';
}

export function resolveInterestCalculation(loan) {
  if (loan?.interest_calculation) return loan.interest_calculation;
  if (loan?.repayment_mode === 'FLEXIBLE') return 'FLEXIBLE_REDUCING';
  return 'FLEXIBLE_REDUCING';
}

/**
 * Loan Schemes created before the Repayment Method / Interest Calculation split
 * only carry the old combined `repayment_mode` field
 * ('FIXED_EMI' | 'INTEREST_ONLY' | 'FLEXIBLE'). New loans must still honor whatever
 * that scheme was actually configured as, so these map the old value onto the new
 * two-axis model the same way it's already interpreted elsewhere in the app.
 *
 * `repayment_method` is only ever meaningful as exactly 'EMI' or 'INTEREST_ONLY' —
 * the engine's `=== 'EMI'` checks elsewhere depend on that. Any other value found
 * there (e.g. a legacy 'FIXED_EMI'/'FLEXIBLE' string saved directly into the new
 * field) is treated the same as if it had only ever been a `repayment_mode`.
 */
export function resolveSchemeRepaymentMethod(scheme) {
  if (scheme?.repayment_method === 'EMI' || scheme?.repayment_method === 'INTEREST_ONLY') {
    return scheme.repayment_method;
  }
  const legacy = scheme?.repayment_method || scheme?.repayment_mode;
  return legacy === 'INTEREST_ONLY' ? 'INTEREST_ONLY' : 'EMI';
}

export function resolveSchemeInterestCalculation(scheme) {
  if (scheme?.interest_calculation) return scheme.interest_calculation;
  const legacy = scheme?.repayment_method || scheme?.repayment_mode;
  return legacy === 'FLEXIBLE' ? 'FLEXIBLE_REDUCING' : 'CONSTANT_FLAT';
}

/**
 * Builds the fixed period-by-period repayment schedule for an EMI loan (Constant
 * or Flexible). This is generated once, at disbursement, and stored on the loan —
 * EMI payments are always settled against this schedule, never recomputed live from
 * elapsed days, since the whole point of EMI is a pre-agreed fixed installment.
 */

// Evaluates a custom formula's token array and never throws — mirrors the shape the
// rest of this file already returns errors in, so a broken/incomplete custom formula
// degrades to a safe zero instead of crashing the live collection-screen previews that
// call calculatePaymentAllocation on every render.
function evalCustomFormula(tokens, vars) {
  return evaluateFormula(tokens || [], vars);
}

export function generateEmiSchedule({
  principal,
  monthlyInterestRate,
  tenureMonths,
  tenureDays,
  repaymentFrequency = 'DAILY',
  interestCalculation = 'CONSTANT_FLAT',
  startDate
}) {
  const P = parseFloat(principal) || 0;
  const monthlyRate = parseFloat(monthlyInterestRate) || 0;
  const months = parseFloat(tenureMonths) || 1;
  const totalDays = tenureDays ? Math.max(Math.round(tenureDays), 1) : Math.max(Math.round(months * 30), 1);
  const dailyRate = monthlyRate / 100 / 30;

  let periodsCount;
  let periodDays;
  if (repaymentFrequency === 'WEEKLY') {
    periodsCount = Math.max(Math.round(totalDays / 7), 1);
    periodDays = 7;
  } else if (repaymentFrequency === 'MONTHLY') {
    periodsCount = Math.max(Math.round(totalDays / 30), 1);
    periodDays = 30;
  } else {
    periodsCount = totalDays;
    periodDays = 1;
  }

  const base = startDate ? new Date(startDate) : new Date();
  const schedule = [];

  if (interestCalculation === 'FLEXIBLE_REDUCING') {
    // Standard reducing-balance amortization: EMI is fixed, but interest is charged
    // on the remaining balance each period so its share of the EMI shrinks over time.
    const ratePerPeriod = repaymentFrequency === 'WEEKLY' ? (dailyRate * 7) : repaymentFrequency === 'MONTHLY' ? (dailyRate * 30) : dailyRate;
    const r = ratePerPeriod;
    const emi = r > 0
      ? Math.ceil((P * r * Math.pow(1 + r, periodsCount)) / (Math.pow(1 + r, periodsCount) - 1))
      : Math.ceil(P / periodsCount);

    let balance = P;
    let cumPrincipal = 0;
    for (let i = 1; i <= periodsCount; i++) {
      const isLast = (i === periodsCount);
      let interest = Math.round(balance * r * 100) / 100;
      let principalPortion = Math.round((emi - interest) * 100) / 100;
      
      if (isLast || principalPortion > balance) {
        principalPortion = Math.max(0, Math.round((P - cumPrincipal) * 100) / 100);
      }
      
      principalPortion = Math.max(0, principalPortion);
      cumPrincipal = Math.round((cumPrincipal + principalPortion) * 100) / 100;
      balance = Math.max(0, Math.round((P - cumPrincipal) * 100) / 100);

      const dueDate = new Date(base);
      dueDate.setDate(dueDate.getDate() + i * periodDays);

      schedule.push({
        period: i,
        due_date: dueDate.toISOString().slice(0, 10),
        principal: principalPortion,
        interest,
        emi: Math.round((principalPortion + interest) * 100) / 100,
        balance,
        principal_paid: 0,
        interest_paid: 0
      });
    }
  } else {
    // CONSTANT_FLAT: Total interest computed from single-day rate x exact days
    const totalInterest = Math.round(P * dailyRate * totalDays * 100) / 100;
    const totalPayable = Math.round((P + totalInterest) * 100) / 100;
    const basePrincipalPerPeriod = Math.round((P / periodsCount) * 100) / 100;
    const baseInterestPerPeriod = Math.round((totalInterest / periodsCount) * 100) / 100;

    let cumP = 0;
    let cumI = 0;
    for (let i = 1; i <= periodsCount; i++) {
      const isLast = (i === periodsCount);
      let pP = isLast ? Math.max(0, Math.round((P - cumP) * 100) / 100) : basePrincipalPerPeriod;
      let iP = isLast ? Math.max(0, Math.round((totalInterest - cumI) * 100) / 100) : baseInterestPerPeriod;

      cumP = Math.round((cumP + pP) * 100) / 100;
      cumI = Math.round((cumI + iP) * 100) / 100;
      const balance = Math.max(0, Math.round((P - cumP) * 100) / 100);

      const dueDate = new Date(base);
      dueDate.setDate(dueDate.getDate() + i * periodDays);

      schedule.push({
        period: i,
        due_date: dueDate.toISOString().slice(0, 10),
        principal: pP,
        interest: iP,
        emi: Math.round((pP + iP) * 100) / 100,
        balance,
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
 * Paying more than one period's EMI simply walks forward and pays off subsequent
 * periods in full (a prepayment that clears future installments early); paying less
 * than a period's EMI partially pays down that same period (interest first) and
 * leaves the remainder owed for next time.
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
    // Only non-zero if the payment exceeds the entire remaining schedule (loan
    // closed out early with money left over) — callers should treat this as change
    // to hand back or refuse up front.
    unappliedAmount: Math.max(0, Math.round(remaining))
  };
}

/**
 * Custom-formula counterpart to generateEmiSchedule — used only when a loan's scheme
 * has formula_type 'CUSTOM' and accrual_mode 'SCHEDULED'. Reuses the exact same
 * periods/periodDays/due-date logic as generateEmiSchedule so a custom schedule has the
 * same shape and behaves identically to a built-in EMI schedule everywhere it's
 * consumed (allocateEmiPayment, the Loan Detail schedule table, overdue-period checks).
 * The final period always closes the remaining balance exactly — a custom formula can
 * never leave a loan with a phantom, un-closeable balance.
 */
export function generateCustomSchedule({
  principal,
  monthlyInterestRate,
  tenureMonths,
  repaymentFrequency = 'DAILY',
  interestFormula,
  installmentFormula,
  startDate
}) {
  const P = parseFloat(principal) || 0;
  const monthlyRate = parseFloat(monthlyInterestRate) || 0;
  const months = parseFloat(tenureMonths) || 1;
  const totalDays = Math.max(Math.round(months * 30), 1);

  let periodsCount;
  let periodDays;
  if (repaymentFrequency === 'WEEKLY') {
    periodsCount = Math.max(Math.round(totalDays / 7), 1);
    periodDays = 7;
  } else if (repaymentFrequency === 'MONTHLY') {
    periodsCount = Math.max(Math.round(months), 1);
    periodDays = 30;
  } else {
    periodsCount = totalDays;
    periodDays = 1;
  }

  const base = startDate ? new Date(startDate) : new Date();
  const rate = monthlyRate / 100;
  const schedule = [];
  let balance = P;

  for (let i = 1; i <= periodsCount; i++) {
    const vars = { principal: P, outstanding: balance, rate, days: periodDays, tenure_days: totalDays, period: i, periods: periodsCount };

    const interestResult = evalCustomFormula(interestFormula, vars);
    const interest = interestResult.error ? 0 : Math.max(0, Math.round(interestResult.value));

    let principalPortion;
    if (i === periodsCount) {
      principalPortion = balance;
    } else {
      const installmentResult = evalCustomFormula(installmentFormula, vars);
      const installment = installmentResult.error ? interest : Math.round(installmentResult.value);
      principalPortion = Math.max(0, Math.min(balance, installment - interest));
    }
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
      interest_paid: 0,
      error: interestResult.error || null
    });
  }

  return schedule;
}

// Custom + LIVE: mirrors the built-in INTEREST_ONLY branch's shape and guarantees
// exactly, so interestPortion + principalPortion always equals the payment amount and
// every collection journal entry it produces balances.
function calculateCustomLivePayment({ loan, amount, paymentDate }) {
  const lastPaymentDate = resolveLastPaymentDate(loan, paymentDate);
  const days = daysBetween(lastPaymentDate, paymentDate);
  const vars = {
    principal: loan?.principal_amount || 0,
    outstanding: loan?.pending_amount || 0,
    rate: (parseFloat(loan?.monthly_interest_rate) || 0) / 100,
    days,
    tenure_days: loan?.tenure_days || 0
  };

  const result = evalCustomFormula(loan?.interest_formula, vars);
  const interestDue = result.error ? 0 : Math.max(0, Math.round(result.value));
  const interestPortion = Math.min(amount, interestDue);
  const principalPortion = Math.max(0, amount - interestPortion);
  const newPendingPrincipal = Math.max(0, (loan?.pending_amount || 0) - principalPortion);

  return {
    strategy: 'CUSTOM_LIVE',
    daysSinceLastPayment: days,
    interestDue,
    interestPortion,
    principalPortion,
    newPendingPrincipal,
    error: result.error || null
  };
}

// Custom + SCHEDULED: mirrors the built-in EMI branch's shape exactly, reusing
// allocateEmiPayment unchanged so the interest-first-per-period allocation logic is
// identical to a built-in EMI loan.
function calculateCustomScheduledPayment({ loan, amount }) {
  const schedule = (loan?.repayment_schedule && loan.repayment_schedule.length)
    ? loan.repayment_schedule
    : generateCustomSchedule({
        principal: loan?.principal_amount,
        monthlyInterestRate: loan?.monthly_interest_rate,
        tenureMonths: (loan?.tenure_days || 120) / 30,
        repaymentFrequency: loan?.repayment_frequency || 'DAILY',
        interestFormula: loan?.interest_formula,
        installmentFormula: loan?.installment_formula,
        startDate: loan?.loan_date
      });

  const result = allocateEmiPayment({ schedule, paymentAmount: amount });

  return {
    strategy: 'CUSTOM_SCHEDULED',
    interestPortion: result.interestPortion,
    principalPortion: result.principalPortion,
    newPendingPrincipal: Math.max(0, (loan?.pending_amount || 0) - result.principalPortion),
    updatedSchedule: result.updatedSchedule,
    unappliedAmount: result.unappliedAmount,
    daysSinceLastPayment: null
  };
}

/**
 * Estimates a custom-formula loan's total payable at creation time (before any
 * payments exist) — the CUSTOM counterpart to the flat estimate formulas used for
 * built-in scheme types. Returns null for any non-custom loan so callers can do
 * `estimateCustomTotalPayable(loan) ?? <existing flat formula>` and leave every
 * built-in scheme's total_payable calculation completely unchanged.
 */
export function estimateCustomTotalPayable(loan) {
  if (loan?.formula_type !== 'CUSTOM') return null;

  if (loan.accrual_mode === 'SCHEDULED') {
    const schedule = generateCustomSchedule({
      principal: loan.principal_amount,
      monthlyInterestRate: loan.monthly_interest_rate,
      tenureMonths: (loan.tenure_days || 120) / 30,
      repaymentFrequency: loan.repayment_frequency || 'DAILY',
      interestFormula: loan.interest_formula,
      installmentFormula: loan.installment_formula,
      startDate: loan.loan_date
    });
    const totalInterest = schedule.reduce((sum, row) => sum + (row.interest || 0), 0);
    return (loan.principal_amount || 0) + totalInterest;
  }

  const vars = {
    principal: loan.principal_amount || 0,
    outstanding: loan.principal_amount || 0,
    rate: (parseFloat(loan.monthly_interest_rate) || 0) / 100,
    days: loan.tenure_days || 0,
    tenure_days: loan.tenure_days || 0
  };
  const result = evalCustomFormula(loan.interest_formula, vars);
  const totalInterest = result.error ? 0 : Math.max(0, Math.round(result.value));
  return (loan.principal_amount || 0) + totalInterest;
}

/**
 * Single entry point used by every collection screen. Reads the loan's configured
 * Repayment Method + Interest Calculation and dispatches to the matching strategy.
 */
export function calculatePaymentAllocation({ loan, paymentAmount, paymentDate }) {
  const amount = parseFloat(paymentAmount) || 0;

  if (loan?.formula_type === 'CUSTOM') {
    return loan.accrual_mode === 'SCHEDULED'
      ? calculateCustomScheduledPayment({ loan, amount })
      : calculateCustomLivePayment({ loan, amount, paymentDate });
  }

  const repaymentMethod = resolveRepaymentMethod(loan);
  const interestCalculation = resolveInterestCalculation(loan);

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

  // INTEREST_ONLY — Constant bases interest on the original principal every time;
  // Flexible bases it on the current outstanding balance, accrued day-by-day.
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
