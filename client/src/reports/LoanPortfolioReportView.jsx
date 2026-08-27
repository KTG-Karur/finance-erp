import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Search, ChevronLeft, ChevronRight, Download, Printer, FileDown, History } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { exportToCsv } from '../utils/csvExport';
import ReportPreviewModal from '../components/ReportPreviewModal';
import { refTimeMap } from '../utils/accounting';
import DropdownSelect from '../components/DropdownSelect';
import PrintablePaymentHistorySheet from '../finance/loan/PrintablePaymentHistorySheet';

const STATUS_KEY = {
  ACTIVE: 'fin.status_active',
  OVERDUE: 'fin.status_overdue',
  CLOSED: 'fin.status_closed',
  PENDING: 'fin.status_pending'
};

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function LoanPortfolioReportView({ loans = [], borrowers = [], receipts = [], branchesList = [], journalEntries = [], tenant, user, selectedBranch = 'ALL' }) {
  const { t } = useLanguage();
  // Individual loan's full transaction/payment history — the report table
  // itself only ever showed one summary row per loan; this opens the same
  // printable statement sheet used elsewhere in the app (Loan Detail's
  // Export PDF, Loans register's History pill) for whichever specific loan
  // was clicked, so this report can drill into one account, not just the
  // whole portfolio at once.
  const [historyLoan, setHistoryLoan] = useState(null);
  const [branch, setBranch] = useState(() => (selectedBranch && selectedBranch !== 'ALL' ? selectedBranch : 'ALL'));
  useEffect(() => {
    setBranch(selectedBranch && selectedBranch !== 'ALL' ? selectedBranch : 'ALL');
  }, [selectedBranch]);
  const hasBranchSelected = branch !== '';
  const [status, setStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const timeMap = useMemo(() => refTimeMap(journalEntries), [journalEntries]);

  const byBranch = useMemo(() => {
    if (branch === 'ALL') return loans;
    if (!branch) return [];
    return loans.filter(l => l.branch === branch);
  }, [loans, branch]);

  const byStatus = useMemo(() => (status === 'ALL' ? byBranch : byBranch.filter(l => l.status === status)), [byBranch, status]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return byStatus.filter(l => !q || l.loan_account_no.toLowerCase().includes(q) || l.borrower_name.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => (a.loan_date < b.loan_date ? 1 : a.loan_date > b.loan_date ? -1 : 0));
  }, [byStatus, searchQuery]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedLoans = filtered.slice(startIndex, startIndex + pageSize);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const stats = useMemo(() => ({
    count: byStatus.length,
    totalPrincipal: byStatus.reduce((s, l) => s + (l.principal_amount || 0), 0),
    totalOutstanding: byStatus.reduce((s, l) => s + (l.pending_amount || 0), 0),
    overdueCount: byStatus.filter(l => l.status === 'OVERDUE').length
  }), [byStatus]);

  const disbursedAt = (l) => fmtTime(timeMap[`DISBURSAL:${l.id}`]);

  const PDF_COLUMNS = [
    { label: t('col.loan_account') }, { label: t('col.date') }, { label: t('col.date_time') },
    { label: t('col.customer_name') }, { label: t('col.phone') }, { label: t('fin.branch_label') },
    { label: t('col.collector') }, { label: t('col.principal_rs'), align: 'right' }, { label: t('fin.total_payable_label'), align: 'right' },
    { label: t('col.collected_rs'), align: 'right' }, { label: t('col.outstanding_rs'), align: 'right' },
    { label: t('fin.installment_label'), align: 'right' }, { label: t('fin.tenure_days_label') },
    { label: t('col.frequency') }, { label: t('fin.next_due_label') }, { label: t('fin.last_payment_label') },
    { label: t('fin.days_overdue_label') }, { label: t('col.status') }
  ];

  const buildRows = () => filtered.map(l => [
    l.loan_account_no, l.loan_date, disbursedAt(l), l.borrower_name, l.phone, l.branch, l.collector || '—',
    fmt(l.principal_amount), fmt(l.total_payable), fmt(l.collected_amount), fmt(l.pending_amount),
    fmt(l.installment_amount), l.tenure_days ?? '—', l.repayment_frequency || '—', l.next_due || '—',
    l.last_payment_date || '—', l.daysOverdue ?? 0, l.status
  ]);

  const handleExport = () => {
    exportToCsv(
      `loan-portfolio-report-${branch || 'none'}.csv`,
      PDF_COLUMNS.map(c => c.label),
      buildRows()
    );
  };

  const [showPreview, setShowPreview] = useState(false);
  const previewProps = {
    company: tenant,
    reportTitle: t('fin.loan_portfolio_report_title'),
    reportSubtitle: t('fin.loan_portfolio_report_subtitle'),
    filters: { [t('fin.branch_label')]: branch === 'ALL' ? t('fin.all_branches') : (branch || '—'), [t('col.status')]: status },
    columns: PDF_COLUMNS,
    rows: buildRows(),
    generatedBy: user?.name
  };

  return (
    <div className="fin-page fin-report-page">
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: 'var(--color-info-light, #EFF6FF)', border: '1px solid var(--color-info-border, #BFDBFE)', color: '#1D4ED8' }}>
              <FileText style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('fin.loan_portfolio_report_title')}</h1>
              <p className="fin-page-header__subtitle">{t('fin.loan_portfolio_report_subtitle')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="fin-btn-primary" style={{ background: '#475569' }} onClick={() => setShowPreview(true)} disabled={filtered.length === 0}>
              <Printer style={{ width: 14, height: 14 }} />
              <span>{t('fin.print_btn')}</span>
            </button>
            <button type="button" className="fin-btn-primary" style={{ background: '#475569' }} onClick={() => setShowPreview(true)} disabled={filtered.length === 0}>
              <FileDown style={{ width: 14, height: 14 }} />
              <span>{t('fin.export_pdf_btn')}</span>
            </button>
            <button type="button" className="fin-btn-primary" onClick={handleExport} disabled={filtered.length === 0}>
              <Download style={{ width: 14, height: 14 }} />
              <span>{t('fin.export_csv_btn')}</span>
            </button>
          </div>
        </div>

        <div className="fin-header-stats">
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.results_count')}</span>
            <span className="fin-header-stat__value">{hasBranchSelected ? stats.count : '—'}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('col.principal_rs')}</span>
            <span className="fin-header-stat__value">{hasBranchSelected ? `₹${fmt(stats.totalPrincipal)}` : '—'}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('col.outstanding_rs')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--bad">{hasBranchSelected ? `₹${fmt(stats.totalOutstanding)}` : '—'}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.status_overdue')}</span>
            <span className={stats.overdueCount > 0 ? 'fin-header-stat__value fin-header-stat__value--bad' : 'fin-header-stat__value fin-header-stat__value--good'}>
              {hasBranchSelected ? stats.overdueCount : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="fin-filterbar">
        <div className="fin-field">
          <label>{t('fin.branch_label')}</label>
          <DropdownSelect
            value={branch}
            onChange={(e) => { setBranch(e.target.value); setCurrentPage(1); }}
            disabled={Boolean(selectedBranch && selectedBranch !== 'ALL')}
            buttonStyle={{ height: 36, minWidth: 160 }}
            options={[
              { value: '', label: t('fin.select_branch_placeholder') || '— Select Branch —' },
              { value: 'ALL', label: t('fin.all_branches') || 'All Branches' },
              ...branchesList.map(b => ({ value: b.name, label: b.name }))
            ]}
          />
        </div>
        <div className="fin-field">
          <label>{t('col.status')}</label>
          <DropdownSelect
            value={status}
            onChange={(e) => { setStatus(e.target.value); setCurrentPage(1); }}
            buttonStyle={{ height: 36, minWidth: 140 }}
            options={[
              { value: 'ALL', label: t('fin.all_statuses') || 'All Statuses' },
              { value: 'ACTIVE', label: t('fin.status_active') || 'Active' },
              { value: 'OVERDUE', label: t('fin.status_overdue') || 'Overdue' },
              { value: 'CLOSED', label: t('fin.status_closed') || 'Closed' },
              { value: 'PENDING', label: t('fin.status_pending') || 'Pending' }
            ]}
          />
        </div>
        <div className="fin-field" style={{ minWidth: 160 }}>
          <label>{t('fin.find_transactions_placeholder')}</label>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 9, top: 9, width: 13, height: 13, color: '#94A3B8' }} />
            <input className="fin-input" style={{ paddingLeft: 28, width: '100%', boxSizing: 'border-box' }} type="text" placeholder={t('fin.find_transactions_placeholder')} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
          </div>
        </div>
      </div>

      <div className="fin-tablewrap">
        <table className="fin-grid-table">
          <thead>
            <tr>
              <th>{t('col.loan_account')}</th>
              <th>{t('col.date')}</th>
              <th>{t('col.date_time')}</th>
              <th>{t('col.customer_name')}</th>
              <th>{t('col.phone')}</th>
              <th>{t('fin.branch_label')}</th>
              <th>{t('col.collector')}</th>
              <th className="num">{t('col.principal_rs')}</th>
              <th className="num">{t('fin.total_payable_label')}</th>
              <th className="num">{t('col.collected_rs')}</th>
              <th className="num">{t('col.outstanding_rs')}</th>
              <th className="num">{t('fin.installment_label')}</th>
              <th>{t('fin.tenure_days_label')}</th>
              <th>{t('col.frequency')}</th>
              <th>{t('fin.next_due_label')}</th>
              <th>{t('fin.last_payment_label')}</th>
              <th className="num">{t('fin.days_overdue_label')}</th>
              <th>{t('col.status')}</th>
              <th style={{ textAlign: 'right' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {pagedLoans.length === 0 ? (
              <tr><td colSpan="19" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>{hasBranchSelected ? t('fin.no_results_hint') : t('fin.select_branch_hint')}</td></tr>
            ) : pagedLoans.map(l => (
              <tr key={l.id}>
                <td className="code">{l.loan_account_no}</td>
                <td>{l.loan_date}</td>
                <td>{disbursedAt(l)}</td>
                <td>{l.borrower_name}</td>
                <td>{l.phone}</td>
                <td>{l.branch}</td>
                <td>{l.collector || '—'}</td>
                <td className="num">₹{fmt(l.principal_amount)}</td>
                <td className="num">₹{fmt(l.total_payable)}</td>
                <td className="num">₹{fmt(l.collected_amount)}</td>
                <td className="num" style={{ fontWeight: 600, color: '#0F172A' }}>₹{fmt(l.pending_amount)}</td>
                <td className="num">₹{fmt(l.installment_amount)}</td>
                <td>{l.tenure_days ?? '—'}</td>
                <td>{l.repayment_frequency || '—'}</td>
                <td>{l.next_due || '—'}</td>
                <td>{l.last_payment_date || '—'}</td>
                <td className="num">{l.daysOverdue ?? 0}</td>
                <td>
                  <span className={`fin-badge ${l.status === 'OVERDUE' ? 'fin-badge--warn' : l.status === 'CLOSED' ? 'fin-badge--ok' : ''}`}>
                    {STATUS_KEY[l.status] ? t(STATUS_KEY[l.status]) : l.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => setHistoryLoan(l)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', borderRadius: 6, padding: '4px 9px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <History style={{ width: 11, height: 11 }} />
                    <span>Details</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-pagination table-pagination--under">
        <div className="table-pagination__info">
          Showing <strong>{filtered.length === 0 ? 0 : startIndex + 1}</strong> to <strong>{Math.min(startIndex + pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> entries
        </div>
        <div className="table-pagination__controls">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
            <ChevronLeft style={{ width: 14, height: 14 }} />
            <span>Previous</span>
          </button>
          <span className="page-indicator">Page {safePage} of {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
            <span>Next</span>
            <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      {showPreview && <ReportPreviewModal {...previewProps} onClose={() => setShowPreview(false)} />}

      {historyLoan && (
        <PrintablePaymentHistorySheet
          loan={historyLoan}
          borrower={borrowers.find(b => b.id === historyLoan.borrower_id || b.phone === historyLoan.phone) || {}}
          receipts={receipts}
          tenant={tenant}
          onClose={() => setHistoryLoan(null)}
        />
      )}
    </div>
  );
}
