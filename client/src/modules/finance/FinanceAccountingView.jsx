import React, { useState, useEffect } from 'react';
import UnifiedPageHeader from '../../components/UnifiedPageHeader';
import { BookOpen, DollarSign, CreditCard, TrendingUp, MinusCircle, FileText, PieChart, Plus, Check } from 'lucide-react';

export default function FinanceAccountingView({ initialSubTab = 'cash-book', onQuickAction }) {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const cashBookEntries = [
    { id: 1, date: '2026-07-24', description: 'Opening Cash Balance in Branch Vault', type: 'INFLOW', amount: 35000, category: 'VAULT_OPENING' },
    { id: 2, date: '2026-07-24', description: 'Daily Field Collection (Rajesh Kumar - LN-001)', type: 'INFLOW', amount: 500, category: 'COLLECTION' },
    { id: 3, date: '2026-07-24', description: 'Office Fuel & Conveyance Allowance', type: 'OUTFLOW', amount: 450, category: 'EXPENSE' },
    { id: 4, date: '2026-07-24', description: 'Daily Field Collection (Priya Sharma - LN-002)', type: 'INFLOW', amount: 1000, category: 'COLLECTION' },
    { id: 5, date: '2026-07-24', description: 'New Loan Disbursal (Suresh Patel)', type: 'OUTFLOW', amount: 75000, category: 'DISBURSAL' }
  ];

  const ledgerAccounts = [
    { code: '1001', name: 'Cash in Hand (Branch Vault)', type: 'ASSET', balance: '₹45,800', status: 'DEBIT' },
    { code: '1200', name: 'Loan Portfolio Outstanding', type: 'ASSET', balance: '₹28,50,000', status: 'DEBIT' },
    { code: '2001', name: 'Capital Account (Promoters)', type: 'LIABILITY', balance: '₹25,00,000', status: 'CREDIT' },
    { code: '4001', name: 'Interest Income Collected', type: 'REVENUE', balance: '₹4,20,000', status: 'CREDIT' },
    { code: '4002', name: 'Late Fee & Fine Penalties', type: 'REVENUE', balance: '₹45,000', status: 'CREDIT' },
    { code: '5001', name: 'Office Operational Expenses', type: 'EXPENSE', balance: '₹32,500', status: 'DEBIT' }
  ];

  const expensesList = [
    { id: 101, voucher_no: 'EXP-20260724-01', payee: 'Indian Oil Fuel Pump', category: 'Conveyance', amount: 450, date: '2026-07-24', status: 'APPROVED' },
    { id: 102, voucher_no: 'EXP-20260723-04', payee: 'Sri Krishna Stationery', category: 'Office Supplies', amount: 800, date: '2026-07-23', status: 'APPROVED' },
    { id: 103, voucher_no: 'EXP-20260722-02', payee: 'BSNL Fiber Internet', category: 'Utilities', amount: 1250, date: '2026-07-22', status: 'APPROVED' }
  ];

  return (
    <div className="space-y-3 font-sans">
      {/* 1. Header */}
      <UnifiedPageHeader
        title="Finance & General Ledger Accounting"
        subtitle="Maintain double-entry bookkeeping, daily cash book, general ledger accounts, and P&L financial reports"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onQuickAction={onQuickAction}
        onRefresh={() => setSearchQuery('')}
      />

      {/* 2. Sub-Tab Navigation Bar */}
      <div className="bg-white border border-gray-200/90 rounded-lg p-1.5 flex items-center space-x-2 text-xs font-semibold shadow-xs">
        <button
          onClick={() => setActiveSubTab('cash-book')}
          className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition ${
            activeSubTab === 'cash-book' ? 'bg-[#2563EB] text-white font-bold shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Cash Book Journal</span>
        </button>

        <button
          onClick={() => setActiveSubTab('general-ledger')}
          className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition ${
            activeSubTab === 'general-ledger' ? 'bg-[#2563EB] text-white font-bold shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>General Ledger</span>
        </button>

        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition ${
            activeSubTab === 'expenses' ? 'bg-[#2563EB] text-white font-bold shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <MinusCircle className="w-3.5 h-3.5" />
          <span>Expenses Vouchers</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pnl')}
          className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition ${
            activeSubTab === 'pnl' ? 'bg-[#2563EB] text-white font-bold shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>Income Statement (P&L)</span>
        </button>
      </div>

      {/* 3. Sub-Tab Views */}
      {activeSubTab === 'cash-book' && (
        <div className="bg-white border border-gray-200/90 rounded-lg p-3 space-y-3 shadow-xs font-mono">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <h3 className="text-xs font-bold text-gray-900 font-sans uppercase">Daily Cash Inflows & Outflows Journal</h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
              Closing Vault Balance: ₹45,800
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-gray-200 text-gray-700 uppercase font-bold bg-[#F8FAFC] text-[10px]">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Transaction Description</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">Inflow (₹)</th>
                  <th className="py-2 px-3 text-right">Outflow (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/80 font-mono">
                {cashBookEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition h-10">
                    <td className="py-2 px-3 text-gray-600 text-[11px]">{entry.date}</td>
                    <td className="py-2 px-3 font-sans font-bold text-gray-900">{entry.description}</td>
                    <td className="py-2 px-3 text-[10px]">
                      <span className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded-md font-bold text-gray-800">
                        {entry.category}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold text-emerald-700">
                      {entry.type === 'INFLOW' ? `+₹${entry.amount.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold text-red-700">
                      {entry.type === 'OUTFLOW' ? `-₹${entry.amount.toLocaleString('en-IN')}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'general-ledger' && (
        <div className="bg-white border border-gray-200/90 rounded-lg p-3 space-y-3 shadow-xs">
          <div className="border-b border-gray-200 pb-2">
            <h3 className="text-xs font-bold text-gray-900 uppercase">General Ledger Chart of Accounts</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-700 uppercase font-bold bg-[#F8FAFC] text-[10px]">
                  <th className="py-2 px-3">Account Code</th>
                  <th className="py-2 px-3">Account Name</th>
                  <th className="py-2 px-3">Account Type</th>
                  <th className="py-2 px-3 text-right font-mono">Current Balance</th>
                  <th className="py-2 px-3 text-center">DR / CR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/80 font-mono">
                {ledgerAccounts.map((acc) => (
                  <tr key={acc.code} className="hover:bg-gray-50 transition h-10">
                    <td className="py-2 px-3 font-bold text-blue-700">{acc.code}</td>
                    <td className="py-2 px-3 font-sans font-bold text-gray-900">{acc.name}</td>
                    <td className="py-2 px-3 text-[10px]">
                      <span className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded-md font-bold text-gray-800">
                        {acc.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-gray-900 tabular-nums">{acc.balance}</td>
                    <td className="py-2 px-3 text-center text-[10px] font-bold">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md">
                        {acc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'expenses' && (
        <div className="bg-white border border-gray-200/90 rounded-lg p-3 space-y-3 shadow-xs">
          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <h3 className="text-xs font-bold text-gray-900 uppercase">Operational Expenses Vouchers Register</h3>
            <button
              onClick={() => onQuickAction('EXPENSE')}
              className="px-3 py-1 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Expense Voucher</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-700 uppercase font-bold bg-[#F8FAFC] text-[10px]">
                  <th className="py-2 px-3 font-mono">Voucher No</th>
                  <th className="py-2 px-3">Payee Vendor</th>
                  <th className="py-2 px-3">Expense Category</th>
                  <th className="py-2 px-3 font-mono">Date</th>
                  <th className="py-2 px-3 text-right font-mono">Amount (₹)</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/80 font-mono">
                {expensesList.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50 transition h-10">
                    <td className="py-2 px-3 text-blue-700 font-bold">{exp.voucher_no}</td>
                    <td className="py-2 px-3 font-sans font-bold text-gray-900">{exp.payee}</td>
                    <td className="py-2 px-3 font-sans text-gray-700">{exp.category}</td>
                    <td className="py-2 px-3 text-gray-600 text-[11px]">{exp.date}</td>
                    <td className="py-2 px-3 text-right font-bold text-red-700 tabular-nums">₹{exp.amount.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3 text-center text-[10px] font-bold">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-md">
                        {exp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(activeSubTab === 'pnl' || activeSubTab === 'income-statement') && (
        <div className="bg-white border border-gray-200/90 rounded-lg p-4 space-y-4 shadow-xs font-sans">
          <div className="border-b border-gray-200 pb-2">
            <h3 className="text-sm font-bold text-gray-900 uppercase">Income Statement (Profit & Loss) — FY 2026-27</h3>
            <p className="text-xs text-gray-500 font-mono">Tenant Financial Accounting Report</p>
          </div>

          <div className="max-w-2xl space-y-3 font-mono text-xs">
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-md p-3 space-y-2">
              <div className="font-bold text-emerald-900 uppercase text-[11px]">1. Gross Operating Revenues</div>
              <div className="flex justify-between text-gray-800 pl-3">
                <span>Interest Income Collected:</span>
                <span className="font-bold tabular-nums">₹4,20,000</span>
              </div>
              <div className="flex justify-between text-gray-800 pl-3">
                <span>Late Penalties & Fees:</span>
                <span className="font-bold tabular-nums">₹45,000</span>
              </div>
              <div className="flex justify-between border-t border-emerald-300 pt-1 font-bold text-emerald-900 text-sm">
                <span>Total Gross Income:</span>
                <span className="tabular-nums">₹4,65,000</span>
              </div>
            </div>

            <div className="bg-red-50/60 border border-red-200 rounded-md p-3 space-y-2">
              <div className="font-bold text-red-900 uppercase text-[11px]">2. Operational Expenses</div>
              <div className="flex justify-between text-gray-800 pl-3">
                <span>Field Collection Expenses & Fuel:</span>
                <span className="font-bold tabular-nums">₹18,500</span>
              </div>
              <div className="flex justify-between text-gray-800 pl-3">
                <span>Office Administrative Expenses:</span>
                <span className="font-bold tabular-nums">₹14,000</span>
              </div>
              <div className="flex justify-between border-t border-red-300 pt-1 font-bold text-red-900 text-sm">
                <span>Total Operating Expenses:</span>
                <span className="tabular-nums">₹32,500</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-300 rounded-md p-3 flex justify-between items-center text-sm font-bold text-blue-950">
              <span>Net Profit (EBITDA):</span>
              <span className="text-base font-bold text-emerald-700 tabular-nums">₹4,32,500</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
