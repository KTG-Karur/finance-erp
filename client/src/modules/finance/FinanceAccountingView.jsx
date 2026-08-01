import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CreditCard,
  TrendingUp,
  MinusCircle,
  PieChart,
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  FileText,
  Building,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function FinanceAccountingView({ initialSubTab = 'cash-book', onQuickAction, expenseVouchers = [] }) {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const cashBookEntries = [
    { id: 1, date: '2026-07-27', description: 'Opening Cash Balance in Branch Vault', type: 'INFLOW', amount: 35000, category: 'VAULT_OPENING', balance: 35000 },
    { id: 2, date: '2026-07-27', description: 'Daily Field Collection (Rajesh Kumar - LN-001)', type: 'INFLOW', amount: 500, category: 'COLLECTION', balance: 35500 },
    { id: 3, date: '2026-07-27', description: 'Office Fuel & Conveyance Allowance', type: 'OUTFLOW', amount: 450, category: 'EXPENSE', balance: 35050 },
    { id: 4, date: '2026-07-27', description: 'Daily Field Collection (Priya Sharma - LN-002)', type: 'INFLOW', amount: 1000, category: 'COLLECTION', balance: 36050 },
    { id: 5, date: '2026-07-27', description: 'New Loan Disbursal (Suresh Patel)', type: 'OUTFLOW', amount: 75000, category: 'DISBURSAL', balance: -38950 },
    { id: 6, date: '2026-07-27', description: 'Capital Cash Infusion by Promoter', type: 'INFLOW', amount: 84750, category: 'CAPITAL', balance: 45800 }
  ];

  const ledgerAccounts = [
    { code: '1001', name: 'Cash in Hand (Branch Vault)', type: 'ASSET', balance: 45800, status: 'DEBIT' },
    { code: '1200', name: 'Loan Portfolio Outstanding', type: 'ASSET', balance: 2850000, status: 'DEBIT' },
    { code: '2001', name: 'Capital Account (Promoters)', type: 'LIABILITY', balance: 2500000, status: 'CREDIT' },
    { code: '4001', name: 'Interest Income Collected', type: 'REVENUE', balance: 420000, status: 'CREDIT' },
    { code: '4002', name: 'Late Fee & Fine Penalties', type: 'REVENUE', balance: 45000, status: 'CREDIT' },
    { code: '5001', name: 'Office Operational Expenses', type: 'EXPENSE', balance: 32500, status: 'DEBIT' }
  ];

  const expensesList = expenseVouchers;

  const filteredCashEntries = cashBookEntries.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    return !q || c.description.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  });

  // Calculate Pagination
  const totalPages = Math.ceil(filteredCashEntries.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCashEntries = filteredCashEntries.slice(startIndex, startIndex + pageSize);

  const totalInflow = cashBookEntries.filter(c => c.type === 'INFLOW').reduce((acc, c) => acc + c.amount, 0);
  const totalOutflow = cashBookEntries.filter(c => c.type === 'OUTFLOW').reduce((acc, c) => acc + c.amount, 0);
  const closingBalance = 45800;

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  return (
    <div className="active-loans-page">
      
      {/* ── 1. Executive Top Header with Logo Icon Badge ──────────── */}
      <div className="active-loans-header">
        <div className="header-left">
          <div className="header-badge-icon" style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#2563EB' }}>
            <BookOpen style={{ width: 20, height: 20 }} />
          </div>
          <div className="header-text">
            <h1 style={{ fontWeight: 600 }}>Cash Book & General Ledger</h1>
            <p style={{ fontWeight: 400 }}>Maintain daily cash inflows, vault balance, chart of accounts, and financial journal entries</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn-disburse"
            onClick={() => onQuickAction?.(activeSubTab === 'expenses' ? 'EXPENSE' : 'CASH_ENTRY')}
            style={{ background: '#2563EB', fontWeight: 500 }}
          >
            <Plus style={{ width: 15, height: 15 }} />
            <span>{activeSubTab === 'expenses' ? 'New Expense Voucher' : 'Record Cash Journal'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Top Summary KPI Strip ───────────────────────────── */}
      <div className="loans-kpi-grid">
        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--blue">
            <CreditCard style={{ width: 20, height: 20 }} />
          </div>
          <div className="loan-kpi-card__info">
            <span>Branch Vault Closing Cash</span>
            <strong style={{ fontWeight: 600 }}>₹{fmt(closingBalance)}</strong>
          </div>
        </div>

        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--green">
            <ArrowUpRight style={{ width: 20, height: 20 }} />
          </div>
          <div className="loan-kpi-card__info">
            <span>Total Daily Cash Inflows</span>
            <strong style={{ fontWeight: 600, color: '#059669' }}>+₹{fmt(totalInflow)}</strong>
          </div>
        </div>

        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--orange">
            <ArrowDownRight style={{ width: 20, height: 20 }} />
          </div>
          <div className="loan-kpi-card__info">
            <span>Total Daily Cash Outflows</span>
            <strong style={{ fontWeight: 600, color: '#DC2626' }}>-₹{fmt(totalOutflow)}</strong>
          </div>
        </div>

        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--purple">
            <TrendingUp style={{ width: 20, height: 20 }} />
          </div>
          <div className="loan-kpi-card__info">
            <span>Net Financial Balance</span>
            <strong style={{ fontWeight: 600 }}>Reconciled & Balanced</strong>
          </div>
        </div>
      </div>

      {/* ── 3. Interactive Toolbar & Sub-Tab Switcher (Non-collapsing) ── */}
      <div className="loans-toolbar">
        <div className="loans-toolbar__left">
          <div className="loans-toolbar__search">
            <Search className="search-icon" style={{ width: 15, height: 15 }} />
            <input
              type="text"
              placeholder="Search descriptions, account codes, or expense payees..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div className="loans-toolbar__tabs">
            <button
              className={`loans-toolbar__tab-btn ${activeSubTab === 'cash-book' ? 'active' : ''}`}
              onClick={() => { setActiveSubTab('cash-book'); setCurrentPage(1); }}
              style={{ fontWeight: 500 }}
            >
              Cash Book Journal
            </button>
            <button
              className={`loans-toolbar__tab-btn ${activeSubTab === 'general-ledger' ? 'active' : ''}`}
              onClick={() => { setActiveSubTab('general-ledger'); setCurrentPage(1); }}
              style={{ fontWeight: 500 }}
            >
              General Ledger (COA)
            </button>
            <button
              className={`loans-toolbar__tab-btn ${activeSubTab === 'expenses' ? 'active' : ''}`}
              onClick={() => { setActiveSubTab('expenses'); setCurrentPage(1); }}
              style={{ fontWeight: 500 }}
            >
              Expense Vouchers
            </button>
            <button
              className={`loans-toolbar__tab-btn ${activeSubTab === 'pnl' ? 'active' : ''}`}
              onClick={() => { setActiveSubTab('pnl'); setCurrentPage(1); }}
              style={{ fontWeight: 500 }}
            >
              Income Statement (P&L)
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. Sub-Tab 1: Cash Book Journal View ─────────────────────── */}
      {activeSubTab === 'cash-book' && (
        <div className="loans-table-card">
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 50, textAlign: 'center' }}>S.No</th>
                  <th>Date</th>
                  <th>Transaction Description</th>
                  <th>Category Tag</th>
                  <th style={{ textAlign: 'right' }}>Inflow (+₹)</th>
                  <th style={{ textAlign: 'right' }}>Outflow (-₹)</th>
                  <th style={{ textAlign: 'right' }}>Vault Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCashEntries.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                      No cash book journal entries found.
                    </td>
                  </tr>
                ) : (
                  paginatedCashEntries.map((entry, idx) => (
                    <tr key={entry.id}>
                      <td style={{ textAlign: 'center', color: '#64748B', fontWeight: 500 }}>
                        {startIndex + idx + 1}
                      </td>

                      <td>
                        <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 500 }}>
                          {entry.date}
                        </span>
                      </td>

                      <td>
                        <span style={{ color: '#0F172A', fontSize: '0.82rem', fontWeight: 500 }}>
                          {entry.description}
                        </span>
                      </td>

                      <td>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          background: '#F1F5F9',
                          color: '#334155'
                        }}>
                          {entry.category}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right', color: entry.type === 'INFLOW' ? '#059669' : '#94A3B8', fontWeight: 500 }}>
                        {entry.type === 'INFLOW' ? `+₹${fmt(entry.amount)}` : '-'}
                      </td>

                      <td style={{ textAlign: 'right', color: entry.type === 'OUTFLOW' ? '#DC2626' : '#94A3B8', fontWeight: 500 }}>
                        {entry.type === 'OUTFLOW' ? `-₹${fmt(entry.amount)}` : '-'}
                      </td>

                      <td style={{ textAlign: 'right', color: '#0F172A', fontWeight: 600 }}>
                        ₹{fmt(entry.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="table-pagination">
            <div className="table-pagination__info">
              Showing <strong>{filteredCashEntries.length === 0 ? 0 : startIndex + 1}</strong> to <strong>{Math.min(startIndex + pageSize, filteredCashEntries.length)}</strong> of <strong>{filteredCashEntries.length}</strong> entries
            </div>
            <div className="table-pagination__controls">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft style={{ width: 14, height: 14 }} />
                <span>Previous</span>
              </button>
              <span className="page-indicator">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <span>Next</span>
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ── 5. Sub-Tab 2: General Ledger Chart of Accounts ───────────── */}
      {activeSubTab === 'general-ledger' && (
        <div className="loans-table-card">
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 50, textAlign: 'center' }}>S.No</th>
                  <th>Account Code</th>
                  <th>Account Name</th>
                  <th>Account Type</th>
                  <th style={{ textAlign: 'center' }}>DR / CR Status</th>
                  <th style={{ textAlign: 'right' }}>Current Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {ledgerAccounts.map((acc, idx) => (
                  <tr key={acc.code}>
                    <td style={{ textAlign: 'center', color: '#64748B', fontWeight: 500 }}>
                      {idx + 1}
                    </td>

                    <td>
                      <span className="acc-no" style={{ color: '#2563EB', fontWeight: 600 }}>
                        {acc.code}
                      </span>
                    </td>

                    <td>
                      <span style={{ color: '#0F172A', fontSize: '0.82rem', fontWeight: 500 }}>
                        {acc.name}
                      </span>
                    </td>

                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        background: '#F1F5F9',
                        color: '#334155'
                      }}>
                        {acc.type}
                      </span>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        background: acc.status === 'DEBIT' ? '#EFF6FF' : '#ECFDF5',
                        color: acc.status === 'DEBIT' ? '#1D4ED8' : '#047857',
                        border: `1px solid ${acc.status === 'DEBIT' ? '#BFDBFE' : '#A7F3D0'}`
                      }}>
                        {acc.status}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right', color: '#0F172A', fontWeight: 600 }}>
                      ₹{fmt(acc.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 6. Sub-Tab 3: Expense Vouchers Register ──────────────────── */}
      {activeSubTab === 'expenses' && (
        <div className="loans-table-card">
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 50, textAlign: 'center' }}>S.No</th>
                  <th>Voucher No</th>
                  <th>Payee Vendor</th>
                  <th>Expense Category</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {expensesList.map((exp, idx) => (
                  <tr key={exp.id}>
                    <td style={{ textAlign: 'center', color: '#64748B', fontWeight: 500 }}>
                      {idx + 1}
                    </td>

                    <td>
                      <span className="acc-no" style={{ color: '#DC2626', fontWeight: 600 }}>
                        {exp.voucher_no}
                      </span>
                    </td>

                    <td>
                      <span style={{ color: '#0F172A', fontSize: '0.82rem', fontWeight: 500 }}>
                        {exp.payee}
                      </span>
                    </td>

                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        background: '#F1F5F9',
                        color: '#334155'
                      }}>
                        {exp.category}
                      </span>
                    </td>

                    <td>
                      <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 500 }}>
                        {exp.date}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right', color: '#DC2626', fontWeight: 600 }}>
                      ₹{fmt(exp.amount)}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        background: exp.status === 'PENDING_APPROVAL' ? '#FFFBEB' : '#ECFDF5',
                        color: exp.status === 'PENDING_APPROVAL' ? '#92400E' : '#047857',
                        border: exp.status === 'PENDING_APPROVAL' ? '1px solid #FDE68A' : '1px solid #A7F3D0'
                      }}>
                        {exp.status === 'PENDING_APPROVAL' ? 'PENDING APPROVAL' : exp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 7. Sub-Tab 4: Income Statement (P&L Preview) ─────────────── */}
      {activeSubTab === 'pnl' && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 14,
          padding: 24,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>
            Profit & Loss Summary (Month to Date)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ padding: 16, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500, textTransform: 'uppercase' }}>Gross Operating Revenue</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#059669', marginTop: 4 }}>
                ₹{fmt(465000)}
              </div>
              <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '4px 0 0 0' }}>Includes Interest Income & Fine Penalties</p>
            </div>

            <div style={{ padding: 16, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500, textTransform: 'uppercase' }}>Operating Expenses</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#DC2626', marginTop: 4 }}>
                ₹{fmt(32500)}
              </div>
              <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '4px 0 0 0' }}>Includes Conveyance, Supplies & Internet</p>
            </div>
          </div>

          <div style={{
            padding: 18,
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 600, textTransform: 'uppercase' }}>Net Operating Profit (Pre-Tax)</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#047857', marginTop: 2 }}>
                ₹{fmt(465000 - 32500)}
              </div>
            </div>
            <span style={{
              background: '#FFFFFF',
              color: '#047857',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.75rem',
              fontWeight: 600,
              border: '1px solid #A7F3D0'
            }}>
              NET PROFIT MARGIN: 93%
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
