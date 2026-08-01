import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Download,
  Eye,
  X,
  FileSpreadsheet,
  TrendingUp,
  CheckCircle2,
  Lock,
  Building,
  User,
  Clock,
  Printer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function CollectionsHistoryView({ collections, onQuickAction }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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

  // Calculate Pagination
  const totalPages = Math.ceil(filteredCollections.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCollections = filteredCollections.slice(startIndex, startIndex + pageSize);

  const totalAuditedAmount = collections.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
  const cashAmount = collections.filter(c => c.payment_mode === 'CASH').reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
  const digitalAmount = totalAuditedAmount - cashAmount;
  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const exportCSV = () => {
    const headers = ["S.No", "Receipt No", "Borrower Name", "Collector Agent", "Amount", "Payment Mode", "Date"];
    const rows = filteredCollections.map((c, i) => [
      i + 1,
      c.receipt_no,
      `"${c.borrower_name || ''}"`,
      `"${c.collector_name || ''}"`,
      c.amount,
      c.payment_mode,
      c.collection_date
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Receipt_Audit_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="active-loans-page">
      
      {/* ── 1. Executive Top Header with Logo Icon Badge ────────── */}
      <div className="active-loans-header">
        <div className="header-left">
          <div className="header-badge-icon" style={{ background: '#F3E8FF', borderColor: '#E9D5FF', color: '#7C3AED' }}>
            <ShieldCheck style={{ width: 20, height: 20 }} />
          </div>
          <div className="header-text">
            <h1 style={{ fontWeight: 600 }}>Receipts</h1>
            <p style={{ fontWeight: 400 }}>Chronological log of every recorded payment receipt across loan accounts</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn-disburse"
            onClick={exportCSV}
            style={{ background: '#7C3AED', fontWeight: 500 }}
          >
            <Download style={{ width: 15, height: 15 }} />
            <span>Export Audit Report</span>
          </button>
        </div>
      </div>

      {/* ── 2. Top Summary KPI Strip ───────────────────────────── */}
      <div className="loans-kpi-grid">
        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--purple">
            <FileSpreadsheet style={{ width: 20, height: 20 }} />
          </div>
          <div className="loan-kpi-card__info">
            <span>Total Audited Log Entries</span>
            <strong style={{ fontWeight: 600 }}>{collections.length} Logs</strong>
          </div>
        </div>

        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--green">
            <TrendingUp style={{ width: 20, height: 20 }} />
          </div>
          <div className="loan-kpi-card__info">
            <span>Total Audited Collection Volume</span>
            <strong style={{ fontWeight: 600 }}>₹{fmt(totalAuditedAmount)}</strong>
          </div>
        </div>

        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--blue">
            <Lock style={{ width: 20, height: 20 }} />
          </div>
          <div className="loan-kpi-card__info">
            <span>Cash Collections</span>
            <strong style={{ fontWeight: 600 }}>₹{fmt(cashAmount)}</strong>
          </div>
        </div>

        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--orange">
            <CheckCircle2 style={{ width: 20, height: 20 }} />
          </div>
          <div className="loan-kpi-card__info">
            <span>Digital Collections (UPI/Bank/Cheque)</span>
            <strong style={{ fontWeight: 600 }}>₹{fmt(digitalAmount)}</strong>
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
              placeholder="Search by receipt no, borrower name, collector, or mode..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div className="loans-toolbar__tabs">
            <button
              className={`loans-toolbar__tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              style={{ fontWeight: 500 }}
            >
              All Logs ({filteredCollections.length})
            </button>
            <button
              className={`loans-toolbar__tab-btn ${statusFilter === 'CASH' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('CASH'); setCurrentPage(1); }}
              style={{ fontWeight: 500 }}
            >
              Cash Receipts
            </button>
            <button
              className={`loans-toolbar__tab-btn ${statusFilter === 'UPI' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('UPI'); setCurrentPage(1); }}
              style={{ fontWeight: 500 }}
            >
              UPI Transfers
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. Audit Log Master Table with S.No & Pagination ──────────── */}
      <div className="loans-table-card">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: 50, textAlign: 'center' }}>S.No</th>
                <th>Receipt No</th>
                <th>Borrower & Loan Account</th>
                <th>Collector Agent</th>
                <th style={{ textAlign: 'right' }}>Amount Collected (₹)</th>
                <th style={{ textAlign: 'center' }}>Payment Mode</th>
                <th>Transaction Date</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCollections.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                    No audit log records match your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedCollections.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center', color: '#64748B', fontWeight: 500 }}>
                      {startIndex + idx + 1}
                    </td>

                    <td>
                      <span className="acc-no" style={{ color: '#7C3AED', fontWeight: 600 }}>
                        {item.receipt_no}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#0F172A', fontSize: '0.82rem', fontWeight: 500 }}>
                          {item.borrower_name || `Loan #${item.loan_id}`}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Account ID: {item.loan_id}</span>
                      </div>
                    </td>

                    <td>
                      <span style={{ color: '#334155', fontSize: '0.78rem', fontWeight: 500 }}>
                        {item.collector_name || 'Sarah Collector'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                      ₹{fmt(item.amount)}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        background: '#F1F5F9',
                        color: '#334155',
                        border: '1px solid #CBD5E1'
                      }}>
                        {item.payment_mode}
                      </span>
                    </td>

                    <td>
                      <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 500 }}>
                        {item.collection_date || new Date().toISOString().slice(0, 10)}
                      </span>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: '0.68rem',
                        fontWeight: 500,
                        background: '#ECFDF5',
                        color: '#047857',
                        border: '1px solid #A7F3D0'
                      }}>
                        <CheckCircle2 style={{ width: 11, height: 11 }} />
                        <span>RECORDED</span>
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setSelectedAuditLog(item)}
                          style={{
                            border: '1px solid #E9D5FF',
                            background: '#F3E8FF',
                            color: '#7C3AED',
                            fontSize: '0.72rem',
                            fontWeight: 500,
                            padding: '5px 10px',
                            borderRadius: 7,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title="Inspect System Audit Log Details"
                        >
                          <Eye style={{ width: 12, height: 12 }} />
                          <span>Inspect Log</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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

      {/* ── 5. Audit Log Inspector Modal ────────────────────────────── */}
      {selectedAuditLog && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card">
            
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: '#F3E8FF', color: '#7C3AED' }}>
                  <ShieldCheck style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3 style={{ fontWeight: 600 }}>Receipt Detail</h3>
                  <p style={{ fontWeight: 400 }}>Full breakdown of this recorded payment</p>
                </div>
              </div>
              <button onClick={() => setSelectedAuditLog(null)} className="close-btn" type="button">
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
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#7C3AED' }}>{selectedAuditLog.receipt_no}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Status</span>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#059669' }}>RECORDED</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Borrower Name</span>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>{selectedAuditLog.borrower_name}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Collector ID</span>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155' }}>{selectedAuditLog.collector_name || 'Sarah Collector'}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 8, borderTop: '1px solid #E2E8F0' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Payment Mode</span>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#2563EB' }}>{selectedAuditLog.payment_mode}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Total Amount</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#059669' }}>₹{fmt(selectedAuditLog.amount)}</div>
                  </div>
                </div>

                <div style={{ paddingTop: 8, borderTop: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Principal / Interest Split</span>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}>
                      ₹{fmt(selectedAuditLog.principalPaid || 0)} / ₹{fmt(selectedAuditLog.interestPaid || 0)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Collection Date</span>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#475569' }}>{selectedAuditLog.collection_date || '—'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="saas-modal-footer" style={{ padding: '14px 20px' }}>
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="btn-submit"
                style={{ background: '#7C3AED', fontWeight: 500 }}
              >
                Close Audit Inspection
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
