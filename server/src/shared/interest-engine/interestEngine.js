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
    // CONSTANT_FLAT
    const totalInterest = Math.round(P * (monthlyRate / 100) * months);
    const totalPayable = P + totalInterest;
    const emi = Math.ceil(totalPayable / periodsCount);
    const principalPerPeriod = Math.floor(P / periodsCount);
    const interestPerPeriod = emi - principalPerPeriod;

    let cumP = 0;
    let cumI = 0;
    for (let i = 1; i <= periodsCount; i++) {
      let pP = principalPerPeriod;
      let iP = interestPerPeriod;

      if (i === periodsCount) {
        pP = P - cumP;
        iP = totalInterest - cumI;
      }
      cumP += pP;
      cumI += iP;

      const dueDate = new Date(base);
      dueDate.setDate(dueDate.getDate() + i * periodDays);

      schedule.push({
        period: i,
        due_date: dueDate.toISOString().slice(0, 10),
        principal: pP,
        interest: iP,
        emi: pP + iP,
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
