import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Receipt, 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  X,
  CreditCard,
  Calculator,
  Percent
} from 'lucide-react';

export default function OperationalWorkspaceView({ loans, collections, onOpenCollectDrawer, onQuickAction }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedLoanId, setSelectedLoanId] = useState(loans[0]?.id || null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Calculator Form & Output State (Months & Daily Interest Basis)
  const [calcForm, setCalcForm] = useState({
    principal: 50000,
    monthlyRate: 2.0, // 2% per month
    tenureMonths: 4, // 4 months tenure
    interestType: 'REDUCING_BALANCE',
    frequency: 'DAILY'
  });
  const [calcResults, setCalcResults] = useState(null);

  useEffect(() => {
    runCalculator();
  }, [calcForm]);

  const runCalculator = () => {
    const P = parseFloat(calcForm.principal) || 0;
    const mRate = parseFloat(calcForm.monthlyRate) || 0;
    const dailyRatePct = mRate / 30; // Per Day Interest Rate (%)
    const months = parseFloat(calcForm.tenureMonths) || 1;
    const totalDays = Math.round(months * 30); // Convert months to days

    // Per day interest amount on principal
    const dailyInterestAmt = Math.round(P * (dailyRatePct / 100));

    let installmentCount = totalDays;
    let daysPerInstallment = 1;

    if (calcForm.frequency === 'WEEKLY') {
      installmentCount = Math.ceil(totalDays / 7);
      daysPerInstallment = 7;
    } else if (calcForm.frequency === 'MONTHLY') {
      installmentCount = Math.ceil(months);
      daysPerInstallment = 30;
    }

    const schedule = [];
    let remainingPrincipal = P;

    if (calcForm.interestType === 'FLAT_RATE') {
      const totalInterest = Math.round(P * (mRate / 100) * months);
      const totalPayable = P + totalInterest;
      const emiAmount = Math.round(totalPayable / installmentCount);
      const principalPerEmi = Math.round(P / installmentCount);
      const interestPerEmi = emiAmount - principalPerEmi;

      let currentDate = new Date();

      for (let i = 1; i <= installmentCount; i++) {
        currentDate.setDate(currentDate.getDate() + daysPerInstallment);
        const isLast = i === installmentCount;

        const pComp = isLast ? remainingPrincipal : principalPerEmi;
        const iComp = interestPerEmi;
        const totalComp = pComp + iComp;

        remainingPrincipal = Math.max(0, remainingPrincipal - pComp);

        schedule.push({
          installment_no: i,
          due_date: currentDate.toISOString().slice(0, 10),
          principal_due: pComp,
          interest_due: iComp,
          total_due: totalComp,
          remaining_principal: remainingPrincipal
        });
      }

      setCalcResults({
        principal: P,
        monthlyRate: mRate,
        dailyRatePct: dailyRatePct.toFixed(4),
        dailyInterestAmt,
        tenureMonths: months,
        totalDays,
        totalInterest,
        totalPayable,
        emiAmount,
        installmentCount,
        schedule
      });
    } else {
      // Reducing Balance Math
      const dailyRateFraction = dailyRatePct / 100;
      const totalInterest = Math.round(P * dailyRateFraction * totalDays);
      const totalPayable = P + totalInterest;
      const emiAmount = Math.round(totalPayable / installmentCount);

      let currentDate = new Date();

      for (let i = 1; i <= installmentCount; i++) {
        currentDate.setDate(currentDate.getDate() + daysPerInstallment);
        const isLast = i === installmentCount;

        const iComp = Math.round(remainingPrincipal * dailyRateFraction * daysPerInstallment);
        const pComp = isLast ? remainingPrincipal : Math.min(remainingPrincipal, emiAmount - iComp);
        const totalComp = pComp + iComp;

        remainingPrincipal = Math.max(0, remainingPrincipal - pComp);

        schedule.push({
          installment_no: i,
          due_date: currentDate.toISOString().slice(0, 10),
          principal_due: pComp,
          interest_due: iComp,
          total_due: totalComp,
          remaining_principal: remainingPrincipal
        });
      }

      setCalcResults({
        principal: P,
        monthlyRate: mRate,
        dailyRatePct: dailyRatePct.toFixed(4),
        dailyInterestAmt,
        tenureMonths: months,
        totalDays,
        totalInterest,
        totalPayable,
        emiAmount,
        installmentCount,
        schedule
      });
    }
  };

  const selectedLoan = loans.find(l => l.id === selectedLoanId) || loans[0];

  const filteredLoans = loans.filter(loan => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      loan.borrower_name.toLowerCase().includes(q) ||
      loan.loan_account_no.toLowerCase().includes(q) ||
      loan.phone.includes(q)
    );
    const matchesStatus = statusFilter === 'ALL' || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalTodayCollection = collections.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  const totalPortfolioValue = loans.reduce((sum, l) => sum + (parseFloat(l.pending_amount) || 0), 0);
  const overdueLoansCount = loans.filter(l => l.status === 'OVERDUE').length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Premium Toolbar */}
      <div className="toolbar">
        <div className="toolbar__left">
          <div className="search-input-wrap">
            <Search className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search account, borrower, phone..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">All Loans ({loans.length})</option>
            <option value="ACTIVE">Active ({loans.filter(l => l.status === 'ACTIVE').length})</option>
            <option value="OVERDUE">Overdue ({overdueLoansCount})</option>
            <option value="CLOSED">Closed ({loans.filter(l => l.status === 'CLOSED').length})</option>
          </select>
        </div>

        <div className="toolbar__right">
          <button onClick={() => setIsCalculatorOpen(true)} className="btn btn--secondary btn--sm">
            <Calculator style={{ width: 13, height: 13 }} />
            <span>Calculator</span>
          </button>
          <button onClick={() => onQuickAction('BORROWER')} className="btn btn--secondary btn--sm">
            <Plus style={{ width: 13, height: 13 }} />
            <span>+ Borrower</span>
          </button>
          <button onClick={() => onQuickAction('LOAN')} className="btn btn--primary btn--sm">
            <Plus style={{ width: 13, height: 13 }} />
            <span>Disburse Loan</span>
          </button>
        </div>
      </div>

      {/* Main Split View */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Loan Table Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="table-scroll thin-scroll">
            <table className="erp-table">
              <thead className="erp-table__head">
                <tr>
                  <th className="erp-table__th">Account No</th>
                  <th className="erp-table__th">Borrower Name</th>
                  <th className="erp-table__th">Phone</th>
                  <th className="erp-table__th">Branch / Collector</th>
                  <th className="erp-table__th erp-table__th--right">Principal (₹)</th>
                  <th className="erp-table__th erp-table__th--right">Collected (₹)</th>
                  <th className="erp-table__th erp-table__th--right">Pending (₹)</th>
                  <th className="erp-table__th">Next Due</th>
                  <th className="erp-table__th erp-table__th--center">Status</th>
                  <th className="erp-table__th erp-table__th--right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="erp-table__empty">No loan accounts match the current filter.</td>
                  </tr>
                ) : (
                  filteredLoans.map((loan) => {
                    const isSelected = selectedLoan?.id === loan.id;
                    const statusCls = loan.status === 'ACTIVE' ? 'status-badge--active'
                      : loan.status === 'OVERDUE' ? 'status-badge--overdue'
                      : 'status-badge--closed';
                    return (
                      <tr
                        key={loan.id}
                        onClick={() => setSelectedLoanId(loan.id)}
                        className={`erp-table__row${isSelected ? ' erp-table__row--selected' : ''}`}
                      >
                        <td className="erp-table__td erp-table__td--account">{loan.loan_account_no}</td>
                        <td className="erp-table__td erp-table__td--name">{loan.borrower_name}</td>
                        <td className="erp-table__td erp-table__td--phone">{loan.phone}</td>
                        <td className="erp-table__td erp-table__td--muted">{loan.branch}</td>
                        <td className="erp-table__td erp-table__td--amount">{Number(loan.principal_amount).toLocaleString('en-IN')}</td>
                        <td className="erp-table__td erp-table__td--amount-positive">{Number(loan.collected_amount).toLocaleString('en-IN')}</td>
                        <td className="erp-table__td erp-table__td--amount-total">{Number(loan.pending_amount).toLocaleString('en-IN')}</td>
                        <td className="erp-table__td erp-table__td--muted" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 13 }}>
                          {loan.next_due || '—'}
                        </td>
                        <td className="erp-table__td erp-table__td--center">
                          <span className={`status-badge ${statusCls}`}>{loan.status}</span>
                        </td>
                        <td className="erp-table__td erp-table__td--right">
                          {loan.status !== 'CLOSED' && (
                            <button
                              className="collect-btn"
                              onClick={(e) => { e.stopPropagation(); onOpenCollectDrawer(loan); }}
                            >Collect</button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Fixed Borrower Details Panel (Updates in-place on row select) */}
        {selectedLoan && (
          <div className="w-80 bg-white p-3.5 overflow-y-auto space-y-3 shrink-0 flex flex-col font-sans">
            <div className="border-b border-gray-200 pb-2 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono text-gray-400 font-bold uppercase">Account Details</span>
                <h3 className="text-sm font-bold text-gray-900">{selectedLoan.borrower_name}</h3>
                <span className="text-xs text-blue-600 font-mono font-bold">{selectedLoan.loan_account_no}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                selectedLoan.status === 'ACTIVE' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {selectedLoan.status}
              </span>
            </div>

            {/* Financial Figures Breakdown */}
            <div className="bg-gray-50 border border-gray-200 rounded p-2.5 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Principal Disbursed:</span>
                <span className="font-bold text-gray-900">₹{Number(selectedLoan.principal_amount).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Payable Amount:</span>
                <span className="font-bold text-gray-900">₹{Number(selectedLoan.total_payable).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Total Collected:</span>
                <span className="font-bold">₹{Number(selectedLoan.collected_amount).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 font-bold text-gray-900">
                <span>Pending Balance:</span>
                <span className="text-red-600">₹{Number(selectedLoan.pending_amount).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* KYC & Identity Info */}
            <div className="space-y-2 text-xs">
              <span className="text-[10px] font-mono text-gray-400 font-bold uppercase block">KYC & Contact Info</span>
              <div className="space-y-1 font-mono text-gray-700">
                <div>Phone: <strong>{selectedLoan.phone}</strong></div>
                <div>Aadhaar: <strong>{selectedLoan.aadhaar || '4589-1234-8971'}</strong></div>
                <div>PAN Card: <strong>{selectedLoan.pan || 'ABCDE1234F'}</strong></div>
                <div>Guarantor: <strong>{selectedLoan.guarantor || 'Self'}</strong></div>
                <div>Branch: <strong>{selectedLoan.branch}</strong></div>
              </div>
            </div>

            {/* Quick Action Button for Selected Account */}
            <div className="pt-2">
              <button
                onClick={() => onOpenCollectDrawer(selectedLoan)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded transition flex items-center justify-center space-x-1"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Post Collection Voucher</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Status Bar (Operational Metrics & Live Counters) */}
      <div className="h-8 bg-white border-t border-gray-200 px-4 flex items-center justify-between text-[11px] font-mono shrink-0">
        <div className="flex items-center space-x-6">
          <span>Active Accounts: <strong className="text-gray-900">{loans.filter(l => l.status === 'ACTIVE').length}</strong></span>
          <span>•</span>
          <span>Today's Collections: <strong className="text-emerald-700">₹{totalTodayCollection.toLocaleString('en-IN')}</strong></span>
          <span>•</span>
          <span>Total Portfolio Outstanding: <strong className="text-gray-900">₹{totalPortfolioValue.toLocaleString('en-IN')}</strong></span>
        </div>

        <div className="flex items-center space-x-4 text-gray-500">
          <span>Overdue: <strong className="text-red-600">{overdueLoansCount}</strong></span>
          <span>Status: <strong className="text-emerald-700 font-bold">READY</strong></span>
        </div>
      </div>

      {/* OPERATIONAL WORKSPACE MONTHLY & DAILY LOAN CALCULATOR MODAL */}
      {isCalculatorOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full p-4 space-y-3 border border-gray-200 shadow-xl max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <div className="flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-gray-900 uppercase">Monthly & Per-Day Loan Interest Calculator</h3>
              </div>
              <button
                onClick={() => setIsCalculatorOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inputs Grid (Tenure in Months) */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Principal Loan (₹)</label>
                <input
                  type="number"
                  value={calcForm.principal}
                  onChange={(e) => setCalcForm({ ...calcForm, principal: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded p-2 text-gray-900 font-bold font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Monthly Interest (% / Month)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={calcForm.monthlyRate}
                    onChange={(e) => setCalcForm({ ...calcForm, monthlyRate: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded p-2 pr-6 text-blue-600 font-bold font-mono text-xs"
                  />
                  <span className="absolute right-2 top-2 text-gray-400 font-mono text-[10px]">%</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Tenure (Months)</label>
                <input
                  type="number"
                  step="0.5"
                  value={calcForm.tenureMonths}
                  onChange={(e) => setCalcForm({ ...calcForm, tenureMonths: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded p-2 text-gray-900 font-bold font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Method</label>
                <select
                  value={calcForm.interestType}
                  onChange={(e) => setCalcForm({ ...calcForm, interestType: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded p-2 text-gray-900 font-bold text-xs"
                >
                  <option value="REDUCING_BALANCE">Reducing Balance</option>
                  <option value="FLAT_RATE">Flat Rate</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Frequency</label>
                <select
                  value={calcForm.frequency}
                  onChange={(e) => setCalcForm({ ...calcForm, frequency: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded p-2 text-gray-900 font-bold text-xs"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
            </div>

            {/* Calculated Results Summary */}
            {calcResults && (
              <div className="space-y-3 font-mono">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 bg-blue-50/70 border border-blue-200 rounded p-3 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-500 font-sans block">Tenure Duration:</span>
                    <span className="font-bold text-gray-900 text-xs">{calcResults.tenureMonths} Months ({calcResults.totalDays} Days)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-sans block">Calculated Per-Day Rate:</span>
                    <span className="font-bold text-purple-700 text-xs">{calcResults.dailyRatePct}% / day</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-sans block">Daily Interest Amount:</span>
                    <span className="font-bold text-emerald-700 text-xs">₹{calcResults.dailyInterestAmt} / day</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-sans block">Total Interest Charge:</span>
                    <span className="font-bold text-gray-900 text-xs">₹{calcResults.totalInterest.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-sans block">Installment Amount:</span>
                    <span className="font-bold text-red-600 text-xs">₹{calcResults.emiAmount.toLocaleString('en-IN')} / {calcForm.frequency.toLowerCase()}</span>
                  </div>
                </div>

                {/* Schedule Table */}
                <div className="overflow-x-auto max-h-[280px] border border-gray-200 rounded">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-gray-100 border-b border-gray-200">
                      <tr className="text-gray-600 font-bold uppercase text-[10px]">
                        <th className="py-2 px-3">Inst #</th>
                        <th className="py-2 px-3">Due Date</th>
                        <th className="py-2 px-3 text-right">Principal (₹)</th>
                        <th className="py-2 px-3 text-right">Daily Interest (₹)</th>
                        <th className="py-2 px-3 text-right">Installment Total (₹)</th>
                        <th className="py-2 px-3 text-right">Remaining Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono">
                      {calcResults.schedule.map((row) => (
                        <tr key={row.installment_no} className="hover:bg-gray-50 h-8">
                          <td className="py-1 px-3 text-blue-600 font-bold">{row.installment_no}</td>
                          <td className="py-1 px-3 text-gray-700">{row.due_date}</td>
                          <td className="py-1 px-3 text-right tabular-nums">₹{row.principal_due.toLocaleString('en-IN')}</td>
                          <td className="py-1 px-3 text-right tabular-nums text-emerald-700 font-bold">₹{row.interest_due.toLocaleString('en-IN')}</td>
                          <td className="py-1 px-3 text-right tabular-nums font-bold text-gray-900">₹{row.total_due.toLocaleString('en-IN')}</td>
                          <td className="py-1 px-3 text-right tabular-nums text-gray-600">₹{row.remaining_principal.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200 flex justify-end space-x-2">
              <button
                onClick={() => setIsCalculatorOpen(false)}
                className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded transition"
              >
                Close Calculator
              </button>
              <button
                onClick={() => {
                  setIsCalculatorOpen(false);
                  onQuickAction('LOAN');
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded transition flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Disburse Loan With Calculations</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
