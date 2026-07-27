/**
 * Amortization Engine Service
 * Generates exact repayment schedules based on Monthly Interest Rate (% per month), Daily Rate (% per day), and Tenure in Months
 */

export function generateAmortizationSchedule({
  principalAmount,
  monthlyInterestRate = 2.0, // e.g., 2% per month
  interestType = 'REDUCING_BALANCE', // 'FLAT_RATE' | 'REDUCING_BALANCE'
  tenureMonths = 4, // Loan tenure in months (e.g., 4 months)
  repaymentFrequency = 'DAILY', // 'DAILY' | 'WEEKLY' | 'MONTHLY'
  startDate = new Date()
}) {
  const principal = parseFloat(principalAmount);
  const monthlyRate = parseFloat(monthlyInterestRate);
  const dailyRatePct = monthlyRate / 30; // Daily Rate = Monthly Rate / 30
  const months = parseFloat(tenureMonths) || 1;
  const tenureDays = Math.round(months * 30); // Total Days = Months * 30

  let installmentCount = 1;
  let daysPerInstallment = 1;

  if (repaymentFrequency === 'DAILY') {
    installmentCount = tenureDays;
    daysPerInstallment = 1;
  } else if (repaymentFrequency === 'WEEKLY') {
    installmentCount = Math.ceil(tenureDays / 7);
    daysPerInstallment = 7;
  } else if (repaymentFrequency === 'MONTHLY') {
    installmentCount = Math.ceil(months);
    daysPerInstallment = 30;
  }

  const schedule = [];
  let remainingPrincipal = principal;

  if (interestType === 'FLAT_RATE') {
    // Total Interest = Principal * (Monthly Rate / 100) * Months
    const totalInterest = Math.round(principal * (monthlyRate / 100) * months);
    const totalPayable = principal + totalInterest;
    const emiAmount = Math.round(totalPayable / installmentCount);
    const principalPerEmi = Math.round(principal / installmentCount);
    const interestPerEmi = emiAmount - principalPerEmi;

    let currentDate = new Date(startDate);

    for (let i = 1; i <= installmentCount; i++) {
      currentDate.setDate(currentDate.getDate() + daysPerInstallment);
      const isLast = i === installmentCount;

      const principalComponent = isLast ? remainingPrincipal : principalPerEmi;
      const interestComponent = interestPerEmi;
      const installmentTotal = principalComponent + interestComponent;

      remainingPrincipal = Math.max(0, remainingPrincipal - principalComponent);

      schedule.push({
        installment_number: i,
        due_date: currentDate.toISOString().slice(0, 10),
        principal_due: principalComponent,
        interest_due: interestComponent,
        total_due: installmentTotal,
        remaining_principal: remainingPrincipal
      });
    }
  } else {
    // Reducing Balance Amortization with Daily Rate
    const dailyRateFraction = dailyRatePct / 100;
    const totalInterest = Math.round(principal * dailyRateFraction * tenureDays);
    const totalPayable = principal + totalInterest;
    const emiAmount = Math.round(totalPayable / installmentCount);

    let currentDate = new Date(startDate);

    for (let i = 1; i <= installmentCount; i++) {
      currentDate.setDate(currentDate.getDate() + daysPerInstallment);
      const isLast = i === installmentCount;

      const interestComponent = Math.round(remainingPrincipal * dailyRateFraction * daysPerInstallment);
      const principalComponent = isLast ? remainingPrincipal : Math.min(remainingPrincipal, emiAmount - interestComponent);
      const installmentTotal = principalComponent + interestComponent;

      remainingPrincipal = Math.max(0, remainingPrincipal - principalComponent);

      schedule.push({
        installment_number: i,
        due_date: currentDate.toISOString().slice(0, 10),
        principal_due: principalComponent,
        interest_due: interestComponent,
        total_due: installmentTotal,
        remaining_principal: remainingPrincipal
      });
    }
  }

  return schedule;
}
