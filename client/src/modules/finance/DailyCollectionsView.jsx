import React, { useState } from 'react';
import {
  Receipt,
  Printer,
  Search,
  Plus,
  TrendingUp,
  Banknote,
  Smartphone,
  Building,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function DailyCollectionsView({ collections, loans, onOpenCollectDrawer, onQuickAction }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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

  // Calculate Pagination
  const totalPages = Math.ceil(filteredCollections.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCollections = filteredCollections.slice(startIndex, startIndex + pageSize);

  const totalToday = collections.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  const cashToday = collections.filter(c => c.payment_mode === 'CASH').reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  const upiToday = collections.filter(c => c.payment_mode === 'UPI' || c.payment_mode === 'BANK_TRANSFER').reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  return (
    <div className="active-loans-page">
      
      {/* ── 1. Executive Top Header with Logo Badge Icon ──────────── */}
      <div className="active-loans-header">
        <div className="header-left">
          <div className="header-badge-icon" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#059669' }}>
            <Receipt style={{ width: 20, height: 20 }} />
          </div>
          <div className="header-text">
            <h1 style={{ fontWeight: 600 }}>Daily Collection Center</h1>
            <p style={{ fontWeight: 400 }}>Track field collector receipts, daily cash drawer reconciliation, and print official vouchers</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn-disburse"
            onClick={() => {
              const activeLoan = loans.find(l => l.status === 'ACTIVE') || loans[0];
              if (activeLoan) onOpenCollectDrawer(activeLoan);
            }}
            style={{ background: '#059669', fontWeight: 500 }}
          >
            <Plus style={{ width: 15, height: 15 }} />
            <span>Record Daily Collection</span>
          </button>
        </div>
      </div>

      {/* ── 2. Top Summary KPI Strip ───────────────────────────── */}
      <div className="loans-kpi-grid">
        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--green">
            <TrendingUp style={{ width: 20, height: 20 }} />
          </div>
          <div className="loan-kpi-card__info">
            <span>Total Daily Collections</span>
            <strong style={{ fontWeight: 600 }}>₹{fmt(totalToday)}</strong>
          </div>
        </div>

        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--blue">
            <Banknote style={{ width: 20, height: 20 }} />
          </div>
          <div className="loan-kpi-card__info">
            <span>Cash Collections</span>
            <strong style={{ fontWeight: 600 }}>₹{fmt(cashToday)}</strong>
          </div>
        </div>

        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--purple">
            <Smartphone style={{ width: 20, height: 20 }} />
          </div>
          <div className="loan-kpi-card__info">
            <span>UPI & Online Digital Receipts</span>
            <strong style={{ fontWeight: 600 }}>₹{fmt(upiToday)}</strong>
          </div>
        </div>

        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--orange">
            <FileSpreadsheet style={{ width: 20, height: 20 }} />
          </div>
          <div className="loan-kpi-card__info">
            <span>Total Vouchers Issued</span>
            <strong style={{ fontWeight: 600 }}>{collections.length} Receipts</strong>
          </div>
        </div>
      </div>

      {/* ── 3. Interactive Toolbar & Search (Non-collapsing) ─────────── */}
      <div className="loans-toolbar">
        <div className="loans-toolbar__left">
          <div className="loans-toolbar__search">
            <Search className="search-icon" style={{ width: 15, height: 15 }} />
            <input
              type="text"
              placeholder="Search by receipt no, customer name, or collector agent..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div className="loans-toolbar__tabs">
            <button
              className={`loans-toolbar__tab-btn ${modeFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => { setModeFilter('ALL'); setCurrentPage(1); }}
              style={{ fontWeight: 500 }}
            >
              All Receipts ({filteredCollections.length})
            </button>
            <button
              className={`loans-toolbar__tab-btn ${modeFilter === 'CASH' ? 'active' : ''}`}
              onClick={() => { setModeFilter('CASH'); setCurrentPage(1); }}
              style={{ fontWeight: 500 }}
            >
              Cash Payments
            </button>
            <button
              className={`loans-toolbar__tab-btn ${modeFilter === 'UPI' ? 'active' : ''}`}
              onClick={() => { setModeFilter('UPI'); setCurrentPage(1); }}
              style={{ fontWeight: 500 }}
            >
              UPI Digital
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. Master Receipts Data Table with S.No & Pagination ──────── */}
      <div className="loans-table-card">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: 50, textAlign: 'center' }}>S.No</th>
                <th>Receipt No</th>
                <th>Customer Name</th>
                <th>Collector Agent</th>
                <th style={{ textAlign: 'right' }}>Principal Portion</th>
                <th style={{ textAlign: 'right' }}>Interest Portion</th>
                <th style={{ textAlign: 'right' }}>Total Amount (₹)</th>
                <th style={{ textAlign: 'center' }}>Payment Mode</th>
                <th>Collection Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCollections.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                    No daily collection receipts recorded yet.
                  </td>
                </tr>
              ) : (
                paginatedCollections.map((c, idx) => {
                  const amount = parseFloat(c.amount) || 0;
                  const interestPortion = c.interestPaid || Math.round(amount * 0.15);
                  const principalPortion = c.principalPaid || (amount - interestPortion);

                  return (
                    <tr key={c.id}>
                      <td style={{ textAlign: 'center', color: '#64748B', fontWeight: 500 }}>
                        {startIndex + idx + 1}
                      </td>

                      <td>
                        <span className="acc-no" style={{ color: '#2563EB', fontWeight: 600 }}>
                          {c.receipt_no}
                        </span>
                      </td>

                      <td>
                        <span style={{ color: '#0F172A', fontSize: '0.82rem', fontWeight: 500 }}>
                          {c.borrower_name || `Loan #${c.loan_id}`}
                        </span>
                      </td>

                      <td>
                        <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 500 }}>
                          {c.collector_name || 'Sarah Collector'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right', color: '#334155', fontWeight: 500 }}>
                        ₹{fmt(principalPortion)}
                      </td>

                      <td style={{ textAlign: 'right', color: '#2563EB', fontWeight: 500 }}>
                        ₹{fmt(interestPortion)}
                      </td>

                      <td style={{ textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                        ₹{fmt(amount)}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          background: c.payment_mode === 'CASH' ? '#F1F5F9' : '#EFF6FF',
                          color: c.payment_mode === 'CASH' ? '#334155' : '#1D4ED8',
                          border: `1px solid ${c.payment_mode === 'CASH' ? '#CBD5E1' : '#BFDBFE'}`
                        }}>
                          {c.payment_mode}
                        </span>
                      </td>

                      <td>
                        <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 500 }}>
                          {c.collection_date || new Date().toISOString().slice(0, 10)}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(c)}
                            style={{
                              border: '1px solid #BFDBFE',
                              background: '#EFF6FF',
                              color: '#1D4ED8',
                              fontSize: '0.72rem',
                              fontWeight: 500,
                              padding: '5px 10px',
                              borderRadius: 7,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Inspect Receipt Details"
                          >
                            <Eye style={{ width: 12, height: 12 }} />
                            <span>View</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(c)}
                            style={{
                              border: 'none',
                              background: '#059669',
                              color: '#FFFFFF',
                              fontSize: '0.72rem',
                              fontWeight: 500,
                              padding: '5px 10px',
                              borderRadius: 7,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              boxShadow: '0 1px 3px rgba(5, 150, 105, 0.2)'
                            }}
                            title="Print Official Receipt Voucher"
                          >
                            <Printer style={{ width: 12, height: 12 }} />
                            <span>Print</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="table-pagination">
          <div className="table-pagination__info">
            Showing <strong>{filteredCollections.length === 0 ? 0 : startIndex + 1}</strong> to <strong>{Math.min(startIndex + pageSize, filteredCollections.length)}</strong> of <strong>{filteredCollections.length}</strong> entries
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

      {/* ── 5. Official Receipt Voucher Preview Modal ────────────────── */}
      {selectedReceipt && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card">
            
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: '#ECFDF5', color: '#059669' }}>
                  <Receipt style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3 style={{ fontWeight: 600 }}>Official Payment Receipt</h3>
                  <p style={{ fontWeight: 400 }}>Knock The Globe Technologies • Finance ERP</p>
                </div>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="close-btn" type="button">
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div className="saas-modal-body" style={{ padding: 20 }}>
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Receipt Number</span>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#059669' }}>{selectedReceipt.receipt_no}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Date</span>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#0F172A' }}>{selectedReceipt.collection_date}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Customer Name</span>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>{selectedReceipt.borrower_name}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Collector Agent</span>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155' }}>{selectedReceipt.collector_name || 'Sarah Collector'}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 8, borderTop: '1px solid #E2E8F0' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Payment Mode</span>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#2563EB' }}>{selectedReceipt.payment_mode}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Amount Collected</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#059669' }}>₹{fmt(selectedReceipt.amount)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="saas-modal-footer" style={{ padding: '14px 20px' }}>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="btn-cancel"
                style={{ fontWeight: 500 }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-submit"
                style={{ background: '#059669', fontWeight: 500 }}
              >
                <Printer style={{ width: 14, height: 14, marginRight: 6 }} />
                <span>Print Official Voucher</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
