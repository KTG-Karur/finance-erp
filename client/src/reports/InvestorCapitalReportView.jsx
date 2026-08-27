import React, { useState, useMemo } from 'react';
import { Wallet, Search, ChevronLeft, ChevronRight, Download, Printer, FileDown } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { exportToCsv } from '../utils/csvExport';
import ReportPreviewModal from '../components/ReportPreviewModal';

// A point-in-time snapshot of the investor master records — there's no transaction
// history left to report on (investors are a Master-style record now, not an
// operational ledger), so this is a flat listing, not a period/date-range report.
export default function InvestorCapitalReportView({ investors = [], tenant, user }) {
  const { t, tStatus } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return investors.filter(i => !q || i.name.toLowerCase().includes(q) || (i.phone || '').includes(q));
  }, [investors, searchQuery]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedRows = filtered.slice(startIndex, startIndex + pageSize);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const totalCapital = filtered
    .filter(i => (i.status || 'ACTIVE') === 'ACTIVE')
    .reduce((s, i) => s + (Number(i.capital_amount) || 0), 0);

  const COLUMNS = [
    { label: t('fin.investor_name_label') }, { label: t('col.phone') },
    { label: 'Capital Amount', align: 'right' },
    { label: t('col.status') }, { label: 'Join Date' }
  ];

  const buildRows = () => filtered.map(i => [
    i.name, i.phone,
    fmt(i.capital_amount),
    tStatus(i.status || 'ACTIVE'), i.join_date || '—'
  ]);

  const handleExport = () => {
    exportToCsv('investor-capital-report.csv', COLUMNS.map(c => c.label), buildRows());
  };

  const [showPreview, setShowPreview] = useState(false);
  const previewProps = {
    company: tenant,
    reportTitle: t('fin.investor_capital_report_title'),
    reportSubtitle: t('fin.investor_capital_report_subtitle'),
    filters: { [t('fin.results_count')]: filtered.length },
    columns: COLUMNS,
    rows: buildRows(),
    generatedBy: user?.name
  };

  return (
    <div className="fin-page fin-report-page">
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: 'var(--color-warning-light, #FFFBEB)', border: '1px solid var(--color-warning-border, #FDE68A)', color: 'var(--color-warning-hover, #B45309)' }}>
              <Wallet style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('fin.investor_capital_report_title')}</h1>
              <p className="fin-page-header__subtitle">{t('fin.investor_capital_report_subtitle')}</p>
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
            <span className="fin-header-stat__value">{filtered.length}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">Total Capital (Active)</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">₹{fmt(totalCapital)}</span>
          </div>
        </div>
      </div>

      <form className="fin-filterbar" onSubmit={(e) => e.preventDefault()}>
        <div className="fin-field" style={{ minWidth: 220 }}>
          <label>Search</label>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 9, top: 9, width: 13, height: 13, color: '#94A3B8' }} />
            <input className="fin-input" style={{ paddingLeft: 28, width: '100%', boxSizing: 'border-box' }} type="text" placeholder="Search by name or phone" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
          </div>
        </div>
      </form>

      <div className="fin-tablewrap">
        <table className="fin-grid-table">
          <thead>
            <tr>
              <th>{t('fin.investor_name_label')}</th>
              <th>{t('col.phone')}</th>
              <th className="num">Capital Amount</th>
              <th>{t('col.status')}</th>
              <th>Join Date</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>{t('fin.no_results_hint')}</td></tr>
            ) : pagedRows.map(i => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td>{i.phone}</td>
                <td className="num" style={{ fontWeight: 600, color: '#0F172A' }}>₹{fmt(i.capital_amount)}</td>
                <td>{tStatus(i.status || 'ACTIVE')}</td>
                <td>{i.join_date || '—'}</td>
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
    </div>
  );
}
