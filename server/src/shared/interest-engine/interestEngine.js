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
    // CONSTANT_FLAT
    const totalInterest = Math.round(P * (monthlyRate / 100) * months * 100) / 100;
    const totalPayable = Math.round((P + totalInterest) * 100) / 100;
    const emi = Math.round((totalPayable / periodsCount) * 100) / 100;
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

export function calculatePaymentAllocation(schedule, amountPaid, penaltyAmount = 0) {
  let remaining = parseFloat(amountPaid) || 0;

  const penaltyPaid = Math.min(remaining, penaltyAmount);
  remaining -= penaltyPaid;

  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;

  for (const row of schedule) {
    const iDue = row.interest - (row.interest_paid || 0);
    if (iDue > 0) {
      const iCover = Math.min(remaining, iDue);
      totalInterestPaid += iCover;
      remaining -= iCover;
    }
  }

  for (const row of schedule) {
    const pDue = row.principal - (row.principal_paid || 0);
    if (pDue > 0) {
      const pCover = Math.min(remaining, pDue);
      totalPrincipalPaid += pCover;
      remaining -= pCover;
    }
  }

  return {
    penaltyPaid,
    interestPaid: totalInterestPaid,
    principalPaid: totalPrincipalPaid,
    excessAmount: remaining
  };
}

function daysBetween(fromDateStr, toDateStr) {
  if (!fromDateStr || !toDateStr) return 0;
  const from = new Date(fromDateStr);
  const to = new Date(toDateStr);
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);
  const diffMs = to.getTime() - from.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

// A loan that's never been paid accrues interest from its disbursement date.
// A loan that already shows collected_amount > 0 but has no last_payment_date
// on file (seeded/legacy data) is treated as "paid yesterday" rather than
// piling up its entire lifetime of interest onto the next payment.
function resolveLastPaymentDate(loan, referenceDateStr) {
  const today = referenceDateStr || new Date().toISOString().slice(0, 10);
  if (!loan) return today;
  if (loan.last_payment_date) {
    return loan.last_payment_date instanceof Date
      ? loan.last_payment_date.toISOString().slice(0, 10)
      : String(loan.last_payment_date).slice(0, 10);
  }
  if ((parseFloat(loan.collected_amount) || 0) > 0) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  return loan.loan_date
    ? (loan.loan_date instanceof Date ? loan.loan_date.toISOString().slice(0, 10) : String(loan.loan_date).slice(0, 10))
    : today;
}

// Interest-Only loans have no repayment_schedules rows (no fixed installment
// plan) — interest accrues live, day-by-day, since the last payment. This is
// the server-side mirror of client/src/utils/loanCalculations.js's
// calculatePaymentAllocation INTEREST_ONLY branch: CONSTANT_FLAT always bases
// interest on the original principal; FLEXIBLE_REDUCING bases it on whatever
// is currently outstanding. Without this, collections against an
// Interest-Only loan would allocate 100% of the payment as principal with
// zero interest recognized — silently losing all interest revenue and
// misreporting every such collection.
export function calculateInterestOnlyAllocation({ loan, amount, penalty = 0, paymentDate }) {
  const today = paymentDate || new Date().toISOString().slice(0, 10);
  let remaining = parseFloat(amount) || 0;

  const penaltyPaid = Math.min(remaining, parseFloat(penalty) || 0);
  remaining -= penaltyPaid;

  const interestCalculation = loan?.interest_calculation || 'FLEXIBLE_REDUCING';
  const principalBase = interestCalculation === 'CONSTANT_FLAT'
    ? (parseFloat(loan?.principal_amount) || 0)
    : (parseFloat(loan?.pending_amount) || 0);

  const lastPaymentDate = resolveLastPaymentDate(loan, today);
  const days = daysBetween(lastPaymentDate, today);
  const dailyRate = (parseFloat(loan?.monthly_interest_rate) || 0) / 100 / 30;
  const interestDue = Math.round(principalBase * dailyRate * days);

  const interestPaid = Math.min(remaining, Math.max(0, interestDue));
  const principalPaid = Math.max(0, remaining - interestPaid);

  return { penaltyPaid, interestPaid, principalPaid, excessAmount: 0, daysSinceLastPayment: days, interestDue };
}
