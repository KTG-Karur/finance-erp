import React from 'react';
import { User, Phone, MapPin, Receipt, Clock } from 'lucide-react';

export default function RightBorrowerPanel({ loan, onCollect }) {
  if (!loan) {
    return (
      <div className="w-80 bg-white border border-gray-200/90 rounded-lg p-6 text-center text-gray-500 text-xs font-mono flex flex-col items-center justify-center h-full shadow-xs">
        <User className="w-8 h-8 text-gray-300 mb-2" />
        <span>Select any loan row from the data grid to view borrower details & payment history.</span>
      </div>
    );
  }

  const interestDue = Math.round(loan.principal_amount * 0.02);

  return (
    <div className="w-80 bg-white border border-gray-200/90 rounded-lg p-3 flex flex-col justify-between h-full font-sans text-xs shadow-xs overflow-y-auto space-y-3">
      {/* Borrower Header Details */}
      <div className="space-y-3">
        <div className="border-b border-gray-200 pb-2 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">{loan.borrower_name}</h3>
            <p className="text-[11px] font-mono text-blue-700 font-bold">{loan.loan_account_no}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ${
            loan.status === 'ACTIVE'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : loan.status === 'OVERDUE'
              ? 'bg-red-50 text-red-800 border-red-300'
              : 'bg-gray-100 text-gray-700 border-gray-300'
          }`}>
            {loan.status}
          </span>
        </div>

        {/* KYC Details */}
        <div className="bg-gray-50/80 border border-gray-200/80 rounded-md p-2.5 space-y-1.5 text-[11px] font-mono">
          <div className="flex items-center text-gray-700 space-x-2">
            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{loan.phone}</span>
          </div>
          <div className="flex items-center text-gray-700 space-x-2">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{loan.branch || 'Main Branch'}</span>
          </div>
          <div className="flex justify-between text-gray-600 border-t border-gray-200/80 pt-1.5">
            <span>Aadhaar: <strong className="text-gray-900">{loan.aadhaar || '4589-1234-8971'}</strong></span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>PAN: <strong className="text-gray-900">{loan.pan || 'ABCDE1234F'}</strong></span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Guarantor: <strong className="text-gray-900">{loan.guarantor || 'Self'}</strong></span>
          </div>
        </div>

        {/* Financial Balances Summary */}
        <div className="bg-blue-50/60 border border-blue-200/80 rounded-md p-2.5 space-y-1.5 text-[11px] font-mono">
          <div className="flex justify-between text-gray-600">
            <span>Principal Amount:</span>
            <span className="text-gray-900 font-bold tabular-nums">₹{Number(loan.principal_amount).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Collected So Far:</span>
            <span className="text-emerald-700 font-bold tabular-nums">₹{Number(loan.collected_amount).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Interest Due:</span>
            <span className="text-blue-800 font-bold tabular-nums">₹{interestDue.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between border-t border-blue-200/80 pt-1 text-xs font-bold">
            <span className="text-gray-700">Outstanding Balance:</span>
            <span className="text-red-700 tabular-nums">₹{Number(loan.pending_amount).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Quick Collection Action */}
        {loan.status !== 'CLOSED' && (
          <button
            onClick={() => onCollect(loan)}
            className="w-full py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs flex items-center justify-center space-x-1.5 transition"
          >
            <Receipt className="w-4 h-4" />
            <span>Collect Payment Voucher</span>
          </button>
        )}

        {/* Payment History Timeline */}
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-600 flex items-center justify-between">
            <span>Payment History</span>
            <Clock className="w-3.5 h-3.5 text-gray-400" />
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="bg-gray-50/80 border border-gray-200/80 rounded-md p-2 flex justify-between items-center">
              <div>
                <span className="font-bold text-gray-900 block">REC-20260723-01</span>
                <span className="text-[10px] text-gray-500">23 Jul 2026 • CASH</span>
              </div>
              <span className="font-bold text-emerald-700 tabular-nums">₹500</span>
            </div>

            <div className="bg-gray-50/80 border border-gray-200/80 rounded-md p-2 flex justify-between items-center">
              <div>
                <span className="font-bold text-gray-900 block">REC-20260722-04</span>
                <span className="text-[10px] text-gray-500">22 Jul 2026 • UPI</span>
              </div>
              <span className="font-bold text-emerald-700 tabular-nums">₹500</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
