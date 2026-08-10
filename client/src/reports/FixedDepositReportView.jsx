import React, { useState, useMemo } from 'react';
import { Banknote, Search, ChevronLeft, ChevronRight, Download, Printer, FileDown } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { exportToCsv } from '../../utils/csvExport';
import ReportPreviewModal from '../../components/ReportPreviewModal';

const STATUS_KEY = {
  ACTIVE: 'fin.status_active',
  MATURED: 'fin.fd_status_matured',
  CLOSED_PREMATURE: 'fin.fd_status_closed_premature'
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(dateStr) {
  const today = new Date(`${todayStr()}T00:00:00Z`);
  const target = new Date(`${dateStr}T00:00:00Z`);
  return Math.round((target - today) / 86400000);
}

export default function FixedDepositReportView({ fixedDeposits = [], borrowers = [], tenant, user }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState('ALL');
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const borrowerMap = useMemo(() => {
    const m = {};
    borrowers.forEach(b => { m[b.id] = b; });
    return m;
  }, [borrowers]);

  const byStatus = useMemo(() => (status === 'ALL' ? fixedDeposits : fixedDeposits.filter(f => f.status === status)), [fixedDeposits, status]);
  const byUpcoming = useMemo(() => (upcomingOnly ? byStatus.filter(f => f.status === 'ACTIVE' && daysUntil(f.maturity_date) >= 0 && daysUntil(f.maturity_date) <= 30) : byStatus), [byStatus, upcomingOnly]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return byUpcoming.filter(f => !q || f.customer_name.toLowerCase().includes(q) || f.fd_account_no.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => (a.maturity_date < b.maturity_date ? -1 : a.maturity_date > b.maturity_date ? 1 : 0));
  }, [byUpcoming, searchQuery]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedRows = filtered.slice(startIndex, startIndex + pageSize);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const stats = useMemo(() => ({
    totalPrincipal: fixedDeposits.reduce((s, f) => s + (f.principal_amount || 0), 0),
    totalMaturityValue: fixedDeposits.reduce((s, f) => s + (f.maturity_value || 0), 0),
    activeCount: fixedDeposits.filter(f => f.status === 'ACTIVE').length,
    upcomingCount: fixedDeposits.filter(f => f.status === 'ACTIVE' && daysUntil(f.maturity_date) >= 0 && daysUntil(f.maturity_date) <= 30).length
  }), [fixedDeposits]);

  const PDF_COLUMNS = [
    { label: t('col.fd_account_no') }, { label: t('col.customer_name') }, { label: t('col.phone') },
    { label: t('col.scheme') }, { label: t('col.principal_rs'), align: 'right' }, { label: t('fin.interest_rate_label'), align: 'right' },
    { label: t('fin.tenure_months_label') }, { label: t('fin.booking_date_label') }, { label: t('fin.maturity_date_label') },
    { label: t('fin.maturity_value_label'), align: 'right' }, { label: t('col.status') }
  ];

  const buildRows = () => filtered.map(f => [
    f.fd_account_no, f.customer_name, borrowerMap[f.borrower_id]?.phone || '—', f.scheme,
    fmt(f.principal_amount), f.interest_rate, f.tenure_months, f.booking_date, f.maturity_date,
    fmt(f.maturity_value), f.status
  ]);

  const handleExport = () => {
    exportToCsv('fixed-deposit-report.csv', PDF_COLUMNS.map(c => c.label), buildRows());
  };

  const [showPreview, setShowPreview] = useState(false);
  const previewProps = {
    company: tenant,
    reportTitle: t('fin.fd_report_title'),
    reportSubtitle: t('fin.fd_report_subtitle'),
    filters: { [t('col.status')]: status, [t('fin.upcoming_maturities_label')]: upcomingOnly ? '30d' : '—' },
    columns: PDF_COLUMNS,
    rows: buildRows(),
    generatedBy: user?.name
  };

  return (
    <div className="fin-page">
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669' }}>
              <Banknote style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('fin.fd_report_title')}</h1>
              <p className="fin-page-header__subtitle">{t('fin.fd_report_subtitle')}</p>
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
            <span className="fin-header-stat__label">{t('col.principal_rs')}</span>
            <span className="fin-header-stat__value">₹{fmt(stats.totalPrincipal)}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.maturity_value_label')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">₹{fmt(stats.totalMaturityValue)}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.status_active')}</span>
            <span className="fin-header-stat__value">{stats.activeCount}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.upcoming_maturities_label')}</span>
            <span className={stats.upcomingCount > 0 ? 'fin-header-stat__value fin-header-stat__value--bad' : 'fin-header-stat__value'}>{stats.upcomingCount}</span>
          </div>
        </div>
      </div>

      <div className="fin-filterbar">
        <div className="fin-field">
          <label>{t('col.status')}</label>
          <select className="fin-select" value={status} onChange={(e) => { setStatus(e.target.value); setCurrentPage(1); }}>
            <option value="ALL">{t('fin.all_statuses')}</option>
            <option value="ACTIVE">{t('fin.status_active')}</option>
            <option value="MATURED">{t('fin.fd_status_matured')}</option>
            <option value="CLOSED_PREMATURE">{t('fin.fd_status_closed_premature')}</option>
          </select>
        </div>
        <div className="fin-quickrow" style={{ alignSelf: 'flex-end' }}>
          <button
            type="button"
            className={`fin-quick-pill${upcomingOnly ? ' fin-quick-pill--active' : ''}`}
            onClick={() => { setUpcomingOnly(v => !v); setCurrentPage(1); }}
          >
            {t('fin.upcoming_maturities_label')} (30d)
          </button>
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
              <th>{t('col.fd_account_no')}</th>
              <th>{t('col.customer_name')}</th>
              <th>{t('col.phone')}</th>
              <th>{t('col.scheme')}</th>
              <th className="num">{t('col.principal_rs')}</th>
              <th className="num">{t('fin.interest_rate_label')}</th>
              <th>{t('fin.tenure_months_label')}</th>
              <th>{t('fin.booking_date_label')}</th>
              <th>{t('fin.maturity_date_label')}</th>
              <th className="num">{t('fin.maturity_value_label')}</th>
              <th>{t('col.status')}</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr><td colSpan="11" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>{t('fin.no_results_hint')}</td></tr>
            ) : pagedRows.map(f => (
              <tr key={f.id}>
                <td className="code">{f.fd_account_no}</td>
                <td>{f.customer_name}</td>
                <td>{borrowerMap[f.borrower_id]?.phone || '—'}</td>
                <td>{f.scheme}</td>
                <td className="num">₹{fmt(f.principal_amount)}</td>
                <td className="num">{f.interest_rate}%</td>
                <td>{f.tenure_months}</td>
                <td>{f.booking_date}</td>
                <td>{f.maturity_date}</td>
                <td className="num" style={{ fontWeight: 600, color: '#0F172A' }}>₹{fmt(f.maturity_value)}</td>
                <td>
                  <span className={`fin-badge ${f.status === 'ACTIVE' ? 'fin-badge--ok' : 'fin-badge--warn'}`}>
                    {STATUS_KEY[f.status] ? t(STATUS_KEY[f.status]) : f.status}
                  </span>
                </td>
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
