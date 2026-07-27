import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

export default function QuickActionModal({ type, isOpen, onClose, onSubmit }) {
  if (!isOpen) return null;

  const [form, setForm] = useState({
    name: '',
    phone: '',
    aadhaar: '',
    pan: '',
    category: 'OFFICE_RENT',
    amount: '',
    notes: '',
    type: 'CASH_IN'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(type, form);
    onClose();
  };

  const getTitle = () => {
    switch(type) {
      case 'BORROWER': return 'Add New Borrower Master';
      case 'EXPENSE': return 'Record Daily Expense Voucher';
      case 'CASH_ENTRY': return 'Record Cash Book Journal Entry';
      default: return 'Quick Action Entry';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white erp-border rounded shadow-2xl text-gray-900 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-300 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center space-x-2">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>{getTitle()}</span>
          </h3>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-900 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs font-sans">
          {type === 'BORROWER' && (
            <>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase">Borrower Full Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full bg-white border border-gray-300 rounded p-2 text-gray-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600 uppercase">Mobile Phone</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="10-digit number"
                    className="w-full bg-white border border-gray-300 rounded p-2 text-gray-900 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600 uppercase">Aadhaar No</label>
                  <input
                    type="text"
                    value={form.aadhaar}
                    onChange={(e) => setForm({ ...form, aadhaar: e.target.value })}
                    placeholder="12-digit Aadhaar"
                    className="w-full bg-white border border-gray-300 rounded p-2 text-gray-900 font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase">PAN Card Number</label>
                <input
                  type="text"
                  value={form.pan}
                  onChange={(e) => setForm({ ...form, pan: e.target.value })}
                  placeholder="10-character PAN"
                  className="w-full bg-white border border-gray-300 rounded p-2 text-gray-900 font-mono uppercase"
                />
              </div>
            </>
          )}

          {type === 'EXPENSE' && (
            <>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase">Expense Head Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded p-2 text-gray-900 font-semibold"
                >
                  <option value="OFFICE_RENT">Office Rent</option>
                  <option value="PETROL_ALLOWANCE">Field Petrol Allowance</option>
                  <option value="TEA_REFRESHMENTS">Tea & Refreshments</option>
                  <option value="STATIONERY">Stationery & Print</option>
                  <option value="ELECTRICITY">Electricity Bill</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase">Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="Expense Amount"
                  className="w-full bg-white border border-gray-300 rounded p-2 text-gray-900 font-mono tabular-nums"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase">Voucher Remarks</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Voucher narration..."
                  rows="2"
                  className="w-full bg-white border border-gray-300 rounded p-2 text-gray-900"
                />
              </div>
            </>
          )}

          {type === 'CASH_ENTRY' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600 uppercase">Entry Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded p-2 text-gray-900 font-bold"
                  >
                    <option value="CASH_IN" className="text-emerald-700">CASH IN (+)</option>
                    <option value="CASH_OUT" className="text-red-700">CASH OUT (-)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600 uppercase">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="Cash Amount"
                    className="w-full bg-white border border-gray-300 rounded p-2 text-gray-900 font-mono tabular-nums"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase">Narration / Particulars</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Enter cash journal narration..."
                  rows="2"
                  className="w-full bg-white border border-gray-300 rounded p-2 text-gray-900"
                />
              </div>
            </>
          )}

          <div className="pt-2 flex justify-end space-x-2 border-t border-gray-300">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-gray-600 hover:bg-gray-100 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded shadow-sm"
            >
              Submit Voucher Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
