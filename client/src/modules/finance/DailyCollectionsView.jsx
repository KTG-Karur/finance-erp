import React, { useState } from 'react';
import UnifiedPageHeader from '../../components/UnifiedPageHeader';
import { Receipt, Printer, DollarSign, CreditCard, TrendingUp, Calendar, UserCheck } from 'lucide-react';

export default function DailyCollectionsView({ collections, loans, onOpenCollectDrawer, onQuickAction }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState('ALL');

  const filteredCollections = collections.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (c.receipt_no && c.receipt_no.toLowerCase().includes(q)) ||
      (c.borrower_name && c.borrower_name.toLowerCase().includes(q)) ||
      (c.collector_name && c.collector_name.toLowerCase().includes(q))
    );
    const matchesMode = modeFilter === 'ALL' || c.payment_mode === modeFilter;
    return matchesSearch && matchesMode;
  });

  const totalToday = collections.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  const cashToday = collections.filter(c => c.payment_mode === 'CASH').reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  const upiToday = collections.filter(c => c.payment_mode === 'UPI').reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

  return (
    <div className="space-y-3 font-sans">
      {/* 1. Shared Unified Header */}
      <UnifiedPageHeader
        title="Daily Collections Center & Cash Vouchers"
        subtitle="Manage daily agent field collections, cash drawer reconciliation, and official receipt printing"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={modeFilter}
        setStatusFilter={setModeFilter}
        statusOptions={['ALL', 'CASH', 'UPI', 'BANK_TRANSFER']}
        onQuickAction={onQuickAction}
        onRefresh={() => { setSearchQuery(''); setModeFilter('ALL'); }}
      />

      {/* 2. Collection Summary Metrics Strip */}
      <div className="bg-white border border-gray-200/90 rounded-lg px-4 py-2.5 flex items-center justify-between shadow-xs h-[58px] text-xs font-sans">
        <div className="flex items-center space-x-6">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 block leading-tight">Total Daily Collections</span>
            <span className="text-sm font-bold text-emerald-700 font-mono tabular-nums">
              ₹{totalToday.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="h-6 w-px bg-gray-200" />

          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 block leading-tight">Cash Collections</span>
            <span className="text-sm font-bold text-gray-900 font-mono tabular-nums">
              ₹{cashToday.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="h-6 w-px bg-gray-200" />

          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 block leading-tight">Digital / UPI Receipts</span>
            <span className="text-sm font-bold text-blue-700 font-mono tabular-nums">
              ₹{upiToday.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            const activeLoan = loans.find(l => l.status === 'ACTIVE');
            if (activeLoan) onOpenCollectDrawer(activeLoan);
          }}
          className="px-4 py-2 bg-[#15803D] hover:bg-emerald-800 text-white font-bold rounded-md text-xs flex items-center space-x-1.5 shadow-xs transition"
        >
          <Receipt className="w-4 h-4" />
          <span>New Daily Collection Voucher</span>
        </button>
      </div>

      {/* 3. Daily Receipts Journal Grid */}
      <div className="bg-white border border-gray-200/90 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[560px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200/90 text-gray-700 uppercase font-bold bg-[#F8FAFC] text-[10px]">
                <th className="py-2.5 px-3">Receipt No</th>
                <th className="py-2.5 px-3">Borrower Account</th>
                <th className="py-2.5 px-3">Collector Agent</th>
                <th className="py-2.5 px-3 text-right">Principal Paid</th>
                <th className="py-2.5 px-3 text-right">Interest Earned</th>
                <th className="py-2.5 px-3 text-right">Late Penalty</th>
                <th className="py-2.5 px-3 text-right">Total Amount</th>
                <th className="py-2.5 px-3 text-center">Payment Mode</th>
                <th className="py-2.5 px-3">Collection Date</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/80 font-mono">
              {filteredCollections.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-gray-500 font-sans">
                    No daily collection vouchers recorded yet.
                  </td>
                </tr>
              ) : (
                filteredCollections.map((c) => {
                  const amount = parseFloat(c.amount) || 0;
                  const interestPortion = Math.round(amount * 0.15);
                  const principalPortion = amount - interestPortion;
                  const penalty = c.penalty || 0;

                  return (
                    <tr key={c.id} className="hover:bg-[#F8FAFC] transition h-10 border-b border-gray-200/60">
                      <td className="py-2 px-3 text-blue-700 font-bold">
                        {c.receipt_no}
                      </td>

                      <td className="py-2 px-3 font-sans">
                        <div className="font-bold text-gray-900">{c.borrower_name || `Loan #${c.loan_id}`}</div>
                      </td>

                      <td className="py-2 px-3 font-sans text-gray-700">
                        {c.collector_name || 'Sarah Collector'}
                      </td>

                      <td className="py-2 px-3 text-right tabular-nums text-gray-800">
                        ₹{principalPortion.toLocaleString('en-IN')}
                      </td>

                      <td className="py-2 px-3 text-right tabular-nums text-blue-800 font-bold">
                        ₹{interestPortion.toLocaleString('en-IN')}
                      </td>

                      <td className="py-2 px-3 text-right tabular-nums text-red-700">
                        ₹{penalty.toLocaleString('en-IN')}
                      </td>

                      <td className="py-2 px-3 text-right tabular-nums text-emerald-700 font-bold text-sm">
                        ₹{(amount + penalty).toLocaleString('en-IN')}
                      </td>

                      <td className="py-2 px-3 text-center font-sans">
                        <span className="px-2 py-0.5 bg-gray-100 border border-gray-300 text-gray-800 rounded-md text-[10px] font-bold">
                          {c.payment_mode}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-gray-600 text-[11px]">
                        {c.collection_date}
                      </td>

                      <td className="py-2 px-3 text-right font-sans">
                        <button
                          onClick={() => window.print()}
                          className="p-1 rounded bg-white border border-gray-300 hover:bg-gray-50 text-gray-700"
                          title="Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
