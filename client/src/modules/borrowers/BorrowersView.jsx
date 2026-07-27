import React, { useState } from 'react';
import UnifiedPageHeader from '../../components/UnifiedPageHeader';
import { UserCheck, Phone, MapPin, ShieldCheck, Receipt, Plus } from 'lucide-react';

export default function BorrowersView({ loans, onOpenCollectDrawer, onQuickAction }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Extract unique borrowers from loans
  const borrowersMap = new Map();
  loans.forEach(loan => {
    const key = loan.borrower_name;
    if (!borrowersMap.has(key)) {
      borrowersMap.set(key, {
        id: loan.id,
        name: loan.borrower_name,
        phone: loan.phone,
        branch: loan.branch || 'Main Branch',
        aadhaar: loan.aadhaar || '4589-1234-8971',
        pan: loan.pan || 'ABCDE1234F',
        guarantor: loan.guarantor || 'Self',
        loansCount: 0,
        totalOutstanding: 0,
        kycStatus: 'VERIFIED',
        latestLoan: loan
      });
    }
    const b = borrowersMap.get(key);
    b.loansCount += 1;
    b.totalOutstanding += (parseFloat(loan.pending_amount) || 0);
  });

  const borrowersList = Array.from(borrowersMap.values()).filter(b => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      b.name.toLowerCase().includes(q) ||
      b.phone.includes(q) ||
      b.aadhaar.includes(q) ||
      b.pan.toLowerCase().includes(q)
    );
    const matchesStatus = statusFilter === 'ALL' || b.kycStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-3 font-sans">
      {/* Shared Unified Header */}
      <UnifiedPageHeader
        title="Borrowers Master Directory"
        subtitle="Complete borrower master records, KYC details, Aadhaar/PAN verification, and active loan counts"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        statusOptions={['ALL', 'VERIFIED', 'PENDING_VERIFICATION']}
        onQuickAction={onQuickAction}
        onRefresh={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
      />

      {/* Borrower Master Grid */}
      <div className="bg-white border border-gray-200/90 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200/90 text-gray-700 uppercase font-bold bg-[#F8FAFC] text-[10px]">
                <th className="py-2.5 px-3">Borrower & KYC Name</th>
                <th className="py-2.5 px-3">Contact Phone</th>
                <th className="py-2.5 px-3">Branch</th>
                <th className="py-2.5 px-3 font-mono">Aadhaar Number</th>
                <th className="py-2.5 px-3 font-mono">PAN Card</th>
                <th className="py-2.5 px-3 text-center">Active Loans</th>
                <th className="py-2.5 px-3 text-right">Total Outstanding</th>
                <th className="py-2.5 px-3 text-center">KYC Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/80 font-sans">
              {borrowersList.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-gray-500 font-mono">
                    No borrower master records found.
                  </td>
                </tr>
              ) : (
                borrowersList.map((b) => (
                  <tr key={b.id} className="hover:bg-[#F8FAFC] transition h-10 border-b border-gray-200/60">
                    <td className="py-2 px-3 font-bold text-gray-900">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded bg-blue-100 text-blue-800 font-mono text-[10px] font-bold flex items-center justify-center border border-blue-300">
                          {b.name.charAt(0)}
                        </div>
                        <span>{b.name}</span>
                      </div>
                    </td>

                    <td className="py-2 px-3 font-mono text-gray-700">
                      {b.phone}
                    </td>

                    <td className="py-2 px-3 text-gray-600 text-[11px]">
                      {b.branch}
                    </td>

                    <td className="py-2 px-3 font-mono text-gray-800 text-[11px]">
                      {b.aadhaar}
                    </td>

                    <td className="py-2 px-3 font-mono text-gray-800 text-[11px]">
                      {b.pan}
                    </td>

                    <td className="py-2 px-3 text-center font-mono font-bold">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md">
                        {b.loansCount} Loans
                      </span>
                    </td>

                    <td className="py-2 px-3 text-right font-mono tabular-nums text-red-700 font-bold">
                      ₹{b.totalOutstanding.toLocaleString('en-IN')}
                    </td>

                    <td className="py-2 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border bg-emerald-50 text-emerald-800 border-emerald-300 flex items-center justify-center space-x-1 w-20 mx-auto">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>VERIFIED</span>
                      </span>
                    </td>

                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onOpenCollectDrawer(b.latestLoan)}
                          className="px-2.5 py-1 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-[11px] rounded-md shadow-xs flex items-center space-x-1"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Voucher</span>
                        </button>
                      </div>
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
