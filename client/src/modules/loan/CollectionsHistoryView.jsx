import React, { useState } from 'react';
import UnifiedPageHeader from '../../components/UnifiedPageHeader';

export default function CollectionsHistoryView({ collections, onQuickAction }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredCollections = collections.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (item.receipt_no && item.receipt_no.toLowerCase().includes(q)) ||
      (item.borrower_name && item.borrower_name.toLowerCase().includes(q)) ||
      (item.collector_name && item.collector_name.toLowerCase().includes(q)) ||
      (item.payment_mode && item.payment_mode.toLowerCase().includes(q))
    );
    const matchesMode = statusFilter === 'ALL' || item.payment_mode === statusFilter;
    return matchesSearch && matchesMode;
  });

  return (
    <div className="space-y-3 font-sans">
      {/* Shared Unified Header */}
      <UnifiedPageHeader
        title="Receipt History & Immutable Audit Logs"
        subtitle="Complete daily loan collection journal records across the tenant"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        statusOptions={['ALL', 'CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE']}
        onQuickAction={onQuickAction}
        onRefresh={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
      />

      {/* Audit Log Table */}
      <div className="bg-white border border-gray-200/90 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200/90 text-gray-700 uppercase font-bold bg-[#F8FAFC] text-[10px]">
                <th className="py-2.5 px-3">Receipt No</th>
                <th className="py-2.5 px-3">Borrower & Loan Account</th>
                <th className="py-2.5 px-3">Collector</th>
                <th className="py-2.5 px-3 text-right">Amount Collected</th>
                <th className="py-2.5 px-3 text-center">Payment Mode</th>
                <th className="py-2.5 px-3">Collection Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/80 font-mono">
              {filteredCollections.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-500 font-sans">
                    No collection receipts logged yet.
                  </td>
                </tr>
              ) : (
                filteredCollections.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FAFC] transition h-10 border-b border-gray-200/60">
                    <td className="py-2 px-3 text-blue-700 font-bold">
                      {item.receipt_no}
                    </td>

                    <td className="py-2 px-3 font-sans">
                      <div className="font-bold text-gray-900">{item.borrower_name || `Loan #${item.loan_id}`}</div>
                      <div className="text-[11px] text-gray-500 font-mono">Account ID: {item.loan_id}</div>
                    </td>

                    <td className="py-2 px-3 font-sans text-gray-800">
                      {item.collector_name || 'Sarah Collector (ID: 2)'}
                    </td>

                    <td className="py-2 px-3 text-right tabular-nums text-emerald-700 font-bold text-sm">
                      ₹{Number(item.amount).toLocaleString('en-IN')}
                    </td>

                    <td className="py-2 px-3 text-center font-sans">
                      <span className="px-2 py-0.5 bg-gray-100 border border-gray-300 text-gray-800 rounded-md text-[11px] font-bold">
                        {item.payment_mode}
                      </span>
                    </td>

                    <td className="py-2 px-3 text-gray-600 text-[11px]">
                      {item.collection_date}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
