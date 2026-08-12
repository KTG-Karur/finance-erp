import React, { useState, useMemo, useEffect } from 'react';
import { Banknote, Search, ChevronLeft, ChevronRight, Download, Printer, FileDown } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { exportToCsv } from '../utils/csvExport';
import ReportPreviewModal from '../components/ReportPreviewModal';
import { refTimeMap } from '../utils/accounting';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function CollectionsReportView({ collections = [], loans = [], branchesList = [], journalEntries = [], tenant, user, selectedBranch = 'ALL' }) {
  const { t } = useLanguage();
  const [branch, setBranch] = useState('');
  useEffect(() => {
    if (selectedBranch && selectedBranch !== 'ALL') setBranch(selectedBranch);
  }, [selectedBranch]);
  const hasBranchSelected = branch !== '';
  const [paymentMode, setPaymentMode] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [applied, setApplied] = useState({ from: '', to: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const loanBranchMap = useMemo(() => {
    const m = {};
    loans.forEach(l => { m[l.id] = l.branch; });
    return m;
  }, [loans]);

  const loanAccMap = useMemo(() => {
    const m = {};
    loans.forEach(l => { m[l.id] = l.loan_account_no; });
    return m;
  }, [loans]);

  const timeMap = useMemo(() => refTimeMap(journalEntries), [journalEntries]);
  const collectedAt = (c) => fmtTime(timeMap[`COLLECTION:${c.id}`]);

  const handleSearch = (e) => {
    e.preventDefault();
    setApplied({ from: fromDate, to: toDate });
  };

  const byBranch = useMemo(() => {
    if (branch === 'ALL') return collections;
    if (!branch) return [];
    return collections.filter(c => loanBranchMap[c.loan_id] === branch);
  }, [collections, branch, loanBranchMap]);

  const byRange = useMemo(() => byBranch.filter(c => (!applied.from || c.collection_date >= applied.from) && (!applied.to || c.collection_date <= applied.to)), [byBranch, applied]);
  const byMode = useMemo(() => (paymentMode === 'ALL' ? byRange : byRange.filter(c => c.payment_mode === paymentMode)), [byRange, paymentMode]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return byMode.filter(c => !q || c.borrower_name.toLowerCase().includes(q) || c.voucher_no.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => (a.collection_date < b.collection_date ? 1 : a.collection_date > b.collection_date ? -1 : 0));
  }, [byMode, searchQuery]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedRows = filtered.slice(startIndex, startIndex + pageSize);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const totalCollected = filtered.reduce((s, c) => s + (c.amount || 0), 0);

  const PDF_COLUMNS = [
    { label: t('col.voucher_no') }, { label: t('col.date') }, { label: t('col.date_time') },
    { label: t('col.loan_account') }, { label: t('col.customer_name') }, { label: t('fin.branch_label') },
    { label: t('col.collector') }, { label: t('col.principal'), align: 'right' }, { label: t('col.interest'), align: 'right' },
    { label: t('fin.penalty_label'), align: 'right' }, { label: t('col.amount_rs'), align: 'right' }, { label: t('col.payment_mode') }
  ];

  const buildRows = () => filtered.map(c => [
    c.voucher_no, c.collection_date, collectedAt(c), loanAccMap[c.loan_id] || '—', c.borrower_name,
    loanBranchMap[c.loan_id] || '—', c.collector_name, fmt(c.principalPaid), fmt(c.interestPaid),
    fmt(c.penalty), fmt(c.amount), c.payment_mode
  ]);

  const handleExport = () => {
    exportToCsv(`collections-report-${branch || 'none'}.csv`, PDF_COLUMNS.map(c => c.label), buildRows());
  };

  const [showPreview, setShowPreview] = useState(false);
  const previewProps = {
    company: tenant,
    reportTitle: t('fin.collections_report_title'),
    reportSubtitle: t('fin.collections_report_subtitle'),
    filters: {
      [t('fin.branch_label')]: branch === 'ALL' ? t('fin.all_branches') : (branch || '—'),
      [t('fin.from_label')]: applied.from || '—',
      [t('fin.to_label')]: applied.to || '—',
      [t('col.payment_mode')]: paymentMode
    },
    columns: PDF_COLUMNS,
    rows: buildRows(),
    totalsRow: [t('fin.total_row'), '', '', '', '', '', '', '', '', '', fmt(totalCollected), ''],
    generatedBy: user?.name
  };

  return (
    <div className="fin-page">
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)' }}>
              <Banknote style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('fin.collections_report_title')}</h1>
              <p className="fin-page-header__subtitle">{t('fin.collections_report_subtitle')}</p>
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
            <span className="fin-header-stat__value">{hasBranchSelected ? filtered.length : '—'}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.total_collected_label')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">{hasBranchSelected ? `₹${fmt(totalCollected)}` : '—'}</span>
          </div>
        </div>
      </div>

      <form className="fin-filterbar" onSubmit={handleSearch}>
        <div className="fin-field">
          <label>{t('fin.branch_label')}</label>
          <select className="fin-select" value={branch} onChange={(e) => { setBranch(e.target.value); setCurrentPage(1); }} disabled={Boolean(selectedBranch && selectedBranch !== 'ALL')}>
            <option value="">{t('fin.select_branch_placeholder')}</option>
            <option value="ALL">{t('fin.all_branches')}</option>
            {branchesList.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        </div>
        <div className="fin-field">
          <label>{t('col.payment_mode')}</label>
          <select className="fin-select" value={paymentMode} onChange={(e) => { setPaymentMode(e.target.value); setCurrentPage(1); }}>
            <option value="ALL">{t('fin.all_modes')}</option>
            <option value="CASH">{t('fin.mode_cash')}</option>
            <option value="UPI">{t('fin.mode_upi')}</option>
            <option value="BANK_TRANSFER">{t('fin.mode_bank_transfer')}</option>
          </select>
        </div>
        <div className="fin-field">
          <label>{t('fin.from_label')}</label>
          <input type="date" className="fin-input" value={fromDate} max={toDate || todayStr()} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="fin-field">
          <label>{t('fin.to_label')}</label>
          <input type="date" className="fin-input" value={toDate} max={todayStr()} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="fin-field" style={{ minWidth: 160 }}>
          <label>{t('fin.find_transactions_placeholder')}</label>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 9, top: 9, width: 13, height: 13, color: '#94A3B8' }} />
            <input className="fin-input" style={{ paddingLeft: 28, width: '100%', boxSizing: 'border-box' }} type="text" placeholder={t('fin.find_transactions_placeholder')} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
          </div>
        </div>
        <button type="submit" className="fin-search-btn">{t('fin.search_btn')}</button>
      </form>

      <div className="fin-tablewrap">
        <table className="fin-grid-table">
          <thead>
            <tr>
              <th>{t('col.voucher_no')}</th>
              <th>{t('col.date')}</th>
              <th>{t('col.date_time')}</th>
              <th>{t('col.loan_account')}</th>
              <th>{t('col.customer_name')}</th>
              <th>{t('fin.branch_label')}</th>
              <th>{t('col.collector')}</th>
              <th className="num">{t('col.principal')}</th>
              <th className="num">{t('col.interest')}</th>
              <th className="num">{t('fin.penalty_label')}</th>
              <th className="num">{t('col.amount_rs')}</th>
              <th>{t('col.payment_mode')}</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr><td colSpan="12" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>{hasBranchSelected ? t('fin.no_results_hint') : t('fin.select_branch_hint')}</td></tr>
            ) : pagedRows.map(c => (
              <tr key={c.id}>
                <td className="code">{c.voucher_no}</td>
                <td>{c.collection_date}</td>
                <td>{collectedAt(c)}</td>
                <td className="code">{loanAccMap[c.loan_id] || '—'}</td>
                <td>{c.borrower_name}</td>
                <td>{loanBranchMap[c.loan_id] || '—'}</td>
                <td>{c.collector_name}</td>
                <td className="num">₹{fmt(c.principalPaid)}</td>
                <td className="num">₹{fmt(c.interestPaid)}</td>
                <td className="num">₹{fmt(c.penalty)}</td>
                <td className="num" style={{ fontWeight: 600, color: '#0F172A' }}>₹{fmt(c.amount)}</td>
                <td><span className="fin-tag">{c.payment_mode}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-pagination">
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
      </div>

      {showPreview && <ReportPreviewModal {...previewProps} onClose={() => setShowPreview(false)} />}
    </div>
  );
}
