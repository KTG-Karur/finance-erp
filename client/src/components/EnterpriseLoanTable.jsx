import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Receipt, ChevronLeft, ChevronRight } from 'lucide-react';

export default function EnterpriseLoanTable({ loans, selectedLoan, onSelectLoan, onCollect }) {
  const [sortField, setSortField] = useState('loan_account_no');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const sortedLoans = useMemo(() => {
    return [...loans].sort((a, b) => {
      let valA = a[sortField] ?? '';
      let valB = b[sortField] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });
  }, [loans, sortField, sortAsc]);

  const totalPages = Math.ceil(sortedLoans.length / pageSize) || 1;
  const paginatedLoans = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedLoans.slice(start, start + pageSize);
  }, [sortedLoans, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="bg-white border border-gray-200/90 rounded-lg flex flex-col justify-between h-full shadow-xs">
      {/* 40px Dense Data Table */}
      <div className="overflow-x-auto overflow-y-auto max-h-[560px]">
        <table className="w-full text-left text-xs border-collapse font-sans">
          <thead className="bg-[#F8FAFC] sticky top-0 z-20 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px]">
            <tr>
              <th 
                onClick={() => handleSort('borrower_name')}
                className="py-2 px-3 cursor-pointer hover:text-black sticky left-0 z-30 bg-[#F8FAFC] border-r border-gray-200 min-w-[140px]"
              >
                <div className="flex items-center justify-between">
                  <span>Borrower</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>

              <th onClick={() => handleSort('loan_account_no')} className="py-2 px-2 cursor-pointer hover:text-black min-w-[100px]">
                <div className="flex items-center justify-between">
                  <span>Loan No</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>

              <th className="py-2 px-2 min-w-[80px]">Branch</th>
              <th className="py-2 px-2 min-w-[80px]">Collector</th>

              <th onClick={() => handleSort('principal_amount')} className="py-2 px-2 text-right cursor-pointer hover:text-black min-w-[85px]">
                <span>Principal</span>
              </th>

              <th className="py-2 px-2 text-right min-w-[80px]">Interest</th>
              <th className="py-2 px-2 text-right min-w-[80px]">Today's Due</th>

              <th onClick={() => handleSort('collected_amount')} className="py-2 px-2 text-right cursor-pointer hover:text-black min-w-[85px]">
                <span>Collected</span>
              </th>

              <th onClick={() => handleSort('pending_amount')} className="py-2 px-2 text-right cursor-pointer hover:text-black min-w-[90px]">
                <span>Outstanding</span>
              </th>

              <th className="py-2 px-2 text-center min-w-[70px]">Overdue</th>
              <th className="py-2 px-2 text-center min-w-[75px]">Status</th>
              <th className="py-2 px-2 text-right min-w-[80px] sticky right-0 bg-[#F8FAFC] border-l border-gray-200">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200/80 font-sans">
            {paginatedLoans.length === 0 ? (
              <tr>
                <td colSpan="12" className="py-8 text-center text-gray-500 font-mono">
                  No financial records found.
                </td>
              </tr>
            ) : (
              paginatedLoans.map((loan) => {
                const isSelected = selectedLoan?.id === loan.id;
                const daysOverdue = loan.daysOverdue || (loan.status === 'OVERDUE' ? 14 : 0);
                const interestDue = Math.round(loan.principal_amount * 0.02);
                const todaysDue = loan.installment_amount || 500;

                return (
                  <tr 
                    key={loan.id} 
                    onClick={() => onSelectLoan(loan)}
                    className={`hover:bg-[#F1F5F9]/60 transition h-10 border-b border-gray-200/60 cursor-pointer ${
                      isSelected ? 'bg-blue-50/70 font-semibold' : ''
                    }`}
                  >
                    {/* Sticky Borrower Cell */}
                    <td className="py-1.5 px-3 sticky left-0 z-10 bg-white border-r border-gray-200 font-bold text-gray-900 sticky-col-light">
                      <div className="truncate text-xs text-gray-900">{loan.borrower_name}</div>
                    </td>

                    <td className="py-1.5 px-2 font-mono font-bold text-blue-700 text-[11px]">
                      {loan.loan_account_no}
                    </td>

                    <td className="py-1.5 px-2 text-gray-600 text-[11px] truncate">
                      {loan.branch || 'Main Branch'}
                    </td>

                    <td className="py-1.5 px-2 text-gray-700 text-[11px] truncate">
                      {loan.collector || 'Sarah C.'}
                    </td>

                    <td className="py-1.5 px-2 text-right font-mono tabular-nums text-gray-900 font-semibold">
                      ₹{Number(loan.principal_amount).toLocaleString('en-IN')}
                    </td>

                    <td className="py-1.5 px-2 text-right font-mono tabular-nums text-blue-800 font-semibold">
                      ₹{interestDue.toLocaleString('en-IN')}
                    </td>

                    <td className="py-1.5 px-2 text-right font-mono tabular-nums text-amber-800 font-bold">
                      ₹{todaysDue.toLocaleString('en-IN')}
                    </td>

                    <td className="py-1.5 px-2 text-right font-mono tabular-nums text-emerald-700 font-bold">
                      ₹{Number(loan.collected_amount).toLocaleString('en-IN')}
                    </td>

                    <td className="py-1.5 px-2 text-right font-mono tabular-nums text-red-700 font-bold">
                      ₹{Number(loan.pending_amount).toLocaleString('en-IN')}
                    </td>

                    <td className="py-1.5 px-2 text-center font-mono text-[11px]">
                      {daysOverdue > 0 ? (
                        <span className="text-red-800 font-bold bg-red-100/80 border border-red-300 px-1.5 py-0.5 rounded-md">
                          {daysOverdue} d
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>

                    <td className="py-1.5 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ${
                        loan.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : loan.status === 'OVERDUE'
                          ? 'bg-red-50 text-red-800 border-red-300'
                          : 'bg-gray-100 text-gray-700 border-gray-300'
                      }`}>
                        {loan.status}
                      </span>
                    </td>

                    <td className="py-1.5 px-2 text-right sticky right-0 bg-white border-l border-gray-200">
                      {loan.status !== 'CLOSED' ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); onCollect(loan); }}
                          className="px-2.5 py-1 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-[11px] rounded-md flex items-center justify-center space-x-1 ml-auto shadow-xs"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Collect</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-mono uppercase">Closed</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="bg-white border-t border-gray-200/90 px-3 py-2 flex items-center justify-between text-xs text-gray-600 font-mono">
        <div>
          Showing {paginatedLoans.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, sortedLoans.length)} of {sortedLoans.length} Loans
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-white border border-gray-200/90 text-gray-900 rounded-md px-1.5 py-0.5"
            >
              <option value="12">12</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1 rounded-md bg-white border border-gray-200/90 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1 rounded-md bg-white border border-gray-200/90 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
