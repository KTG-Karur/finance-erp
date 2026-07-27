import React, { useState } from 'react';
import EnterpriseLoanTable from '../../components/EnterpriseLoanTable';

export default function DashboardOverviewView({ loans, collections, onQuickAction, onOpenCollectDrawer }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Compute 4 essential operational figures for today's workspace
  const todaysCollection = collections.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  const activeLoansCount = loans.filter(l => l.status === 'ACTIVE').length;
  const overdueCount = loans.filter(l => l.status === 'OVERDUE').length;
  const totalPendingBalance = loans.reduce((sum, l) => sum + (parseFloat(l.pending_amount) || 0), 0);

  // Filter loans for the primary data table
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

  return (
    <div className="h-full flex flex-col space-y-3 font-sans">
      {/* 1. Single Compact Financial Summary Strip (Merged KPIs) */}
      <div className="bg-white border border-gray-200 rounded-md px-4 py-2.5 flex items-center justify-between shadow-none shrink-0 text-xs">
        <div className="flex items-center space-x-6">
          <div>
            <span className="text-[11px] font-semibold text-gray-500 block leading-tight">Today's Collection</span>
            <span className="text-sm font-bold text-gray-900 font-mono tabular-nums">
              ₹{todaysCollection.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="h-6 w-px bg-gray-200" />

          <div>
            <span className="text-[11px] font-semibold text-gray-500 block leading-tight">Active Portfolio</span>
            <span className="text-sm font-bold text-gray-900 font-mono tabular-nums">
              ₹{totalPendingBalance.toLocaleString('en-IN')} <span className="text-xs text-gray-500 font-normal">({activeLoansCount} loans)</span>
            </span>
          </div>

          <div className="h-6 w-px bg-gray-200" />

          <div>
            <span className="text-[11px] font-semibold text-gray-500 block leading-tight">Overdue Accounts</span>
            <span className={`text-sm font-bold font-mono tabular-nums ${overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {overdueCount} Accounts
            </span>
          </div>
        </div>

        {/* Unified Primary Action Button */}
        <button
          onClick={() => onQuickAction('LOAN')}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition"
        >
          + Disburse New Loan
        </button>
      </div>

      {/* 2. Workspace Control Toolbar (Filter & Search) */}
      <div className="bg-white border border-gray-200 rounded-md p-2 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center space-x-3 flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search account no, borrower name, phone..."
            className="w-full bg-white border border-gray-200 rounded px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-gray-500 font-medium text-[11px]">Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded px-2.5 py-1 text-xs text-gray-900 font-medium focus:outline-none focus:border-blue-600"
          >
            <option value="ALL">All Loans ({loans.length})</option>
            <option value="ACTIVE">Active ({loans.filter(l => l.status === 'ACTIVE').length})</option>
            <option value="OVERDUE">Overdue ({overdueCount})</option>
            <option value="CLOSED">Closed ({loans.filter(l => l.status === 'CLOSED').length})</option>
          </select>
        </div>
      </div>

      {/* 3. Primary Data Table (Occupies > 70% of Workspace Height) */}
      <div className="flex-1 min-h-[540px] bg-white border border-gray-200 rounded-md overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
              <tr className="text-gray-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Account No</th>
                <th className="py-2.5 px-3">Borrower Name</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">Branch</th>
                <th className="py-2.5 px-3 text-right font-mono">Disbursed</th>
                <th className="py-2.5 px-3 text-right font-mono">Collected</th>
                <th className="py-2.5 px-3 text-right font-mono">Pending Balance</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-500 font-sans">
                    No loan records match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-gray-50 transition h-10">
                    <td className="py-2 px-3 text-blue-600 font-bold font-mono">
                      {loan.loan_account_no}
                    </td>

                    <td className="py-2 px-3 font-sans font-bold text-gray-900">
                      {loan.borrower_name}
                    </td>

                    <td className="py-2 px-3 text-gray-600">
                      {loan.phone}
                    </td>

                    <td className="py-2 px-3 font-sans text-gray-600">
                      {loan.branch}
                    </td>

                    <td className="py-2 px-3 text-right tabular-nums text-gray-700">
                      ₹{Number(loan.principal_amount).toLocaleString('en-IN')}
                    </td>

                    <td className="py-2 px-3 text-right tabular-nums text-emerald-700">
                      ₹{Number(loan.collected_amount).toLocaleString('en-IN')}
                    </td>

                    <td className="py-2 px-3 text-right tabular-nums font-bold text-gray-900">
                      ₹{Number(loan.pending_amount).toLocaleString('en-IN')}
                    </td>

                    <td className="py-2 px-3 text-center font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                        loan.status === 'ACTIVE'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : loan.status === 'OVERDUE'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {loan.status}
                      </span>
                    </td>

                    <td className="py-2 px-3 text-right font-sans">
                      {loan.status !== 'CLOSED' && (
                        <button
                          onClick={() => onOpenCollectDrawer(loan)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded transition"
                        >
                          Collect
                        </button>
                      )}
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
