import React, { useState } from 'react';
import { X, PlusCircle } from 'lucide-react';

export default function NewLoanModal({ isOpen, onClose, onSubmit }) {
  if (!isOpen) return null;

  const [form, setForm] = useState({
    borrower_name: '',
    phone: '',
    principal_amount: 50000,
    monthly_interest_rate: 2.0, // 2% per month
    tenure_months: 4, // 4 months
    installment_amount: 500
  });

  const [loading, setLoading] = useState(false);

  const calculateInstallment = (principal, monthlyRate, tenureMonths) => {
    const p = parseFloat(principal) || 0;
    const mRate = parseFloat(monthlyRate) || 0;
    const months = parseFloat(tenureMonths) || 1;
    const totalDays = Math.round(months * 30);
    const dailyRatePct = mRate / 30;

    const totalInterest = Math.round(p * (dailyRatePct / 100) * totalDays);
    const totalPayable = p + totalInterest;

    return {
      totalPayable,
      dailyEmi: Math.ceil(totalPayable / totalDays),
      dailyInterestAmt: Math.round(p * (dailyRatePct / 100))
    };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedForm = { ...form, [name]: value };

    if (name === 'principal_amount' || name === 'monthly_interest_rate' || name === 'tenure_months') {
      const calc = calculateInstallment(
        name === 'principal_amount' ? value : form.principal_amount,
        name === 'monthly_interest_rate' ? value : form.monthly_interest_rate,
        name === 'tenure_months' ? value : form.tenure_months
      );
      updatedForm.installment_amount = calc.dailyEmi;
    }

    setForm(updatedForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...form,
        principal_amount: parseFloat(form.principal_amount),
        interest_rate: parseFloat(form.monthly_interest_rate),
        tenure_days: Math.round(parseFloat(form.tenure_months) * 30)
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calcDetails = calculateInstallment(form.principal_amount, form.monthly_interest_rate, form.tenure_months);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white erp-border rounded shadow-2xl text-gray-900 overflow-hidden font-sans">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PlusCircle className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">Disburse New Loan Account</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-900 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs font-sans">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-600 uppercase">Borrower Full Name</label>
              <input
                type="text"
                name="borrower_name"
                value={form.borrower_name}
                onChange={handleChange}
                placeholder="e.g. Rajesh Kumar"
                required
                className="w-full bg-white border border-gray-300 rounded p-2 text-xs text-gray-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-600 uppercase">Contact Phone</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="10-digit mobile"
                required
                className="w-full bg-white border border-gray-300 rounded p-2 text-xs text-gray-900 font-mono focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-600 uppercase">Principal (₹)</label>
              <input
                type="number"
                name="principal_amount"
                value={form.principal_amount}
                onChange={handleChange}
                required
                className="w-full bg-white border border-gray-300 rounded p-2 text-xs font-mono text-gray-900 tabular-nums focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-600 uppercase">Interest (% / Month)</label>
              <input
                type="number"
                step="0.1"
                name="monthly_interest_rate"
                value={form.monthly_interest_rate}
                onChange={handleChange}
                required
                className="w-full bg-white border border-gray-300 rounded p-2 text-xs font-mono text-blue-600 tabular-nums focus:border-blue-600 focus:outline-none font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-600 uppercase">Tenure (Months)</label>
              <input
                type="number"
                step="0.5"
                name="tenure_months"
                value={form.tenure_months}
                onChange={handleChange}
                required
                className="w-full bg-white border border-gray-300 rounded p-2 text-xs font-mono text-gray-900 tabular-nums focus:border-blue-600 focus:outline-none font-bold"
              />
            </div>
          </div>

          {/* Auto-Calculation Preview */}
          <div className="bg-blue-50/70 border border-blue-200 rounded p-3 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-gray-700">
              <span>Tenure Duration:</span>
              <span className="font-bold text-gray-900">{form.tenure_months} Months ({Math.round(form.tenure_months * 30)} Days)</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Daily Interest Amount:</span>
              <span className="font-bold text-emerald-700">₹{calcDetails.dailyInterestAmt} / day</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Total Payable Amount:</span>
              <span className="text-gray-900 font-bold tabular-nums">₹{calcDetails.totalPayable.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-gray-700 border-t border-blue-200 pt-1">
              <span>Calculated Daily Installment:</span>
              <span className="text-red-600 font-bold tabular-nums">₹{calcDetails.dailyEmi} / day</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2 border-t border-gray-300">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-bold text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded text-xs shadow-sm"
            >
              {loading ? 'Disbursing...' : 'Confirm Loan Disbursal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
