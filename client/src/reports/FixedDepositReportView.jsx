import React, { useState, useMemo } from 'react';
import { Banknote, Search, ChevronLeft, ChevronRight, Download, Printer, FileDown } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { exportToCsv } from '../utils/csvExport';
import ReportPreviewModal from '../components/ReportPreviewModal';

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
  const { t, tStatus } = useLanguage();
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

      {/* MNC Header Card */}
      <div className="fin-header-card" style={{ background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 24px' }}>
        <div className="fin-page-header">
          <div className="fin-page-header__left" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="fin-page-header__icon" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669', width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Banknote style={{ width: 22, height: 22 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Fixed Deposit Treasury Report
              </h1>
              <p className="fin-page-header__subtitle" style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                {t('fin.fd_report_subtitle')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={() => setShowPreview(true)} disabled={filtered.length === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <Printer style={{ width: 14, height: 14, color: '#059669' }} />
              <span>Print Preview</span>
            </button>
            <button type="button" onClick={() => setShowPreview(true)} disabled={filtered.length === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <FileDown style={{ width: 14, height: 14, color: '#2563EB' }} />
              <span>Export PDF</span>
            </button>
            <button type="button" onClick={handleExport} disabled={filtered.length === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7, border: 'none', background: '#059669', color: '#FFFFFF', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(5,150,105,0.25)' }}>
              <Download style={{ width: 14, height: 14 }} />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Corporate Summary Stat Cards */}
        <div className="fin-header-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 20 }}>
          <div className="fin-header-stat" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '12px 16px', borderRadius: 10 }}>
            <span className="fin-header-stat__label" style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Active Principal</span>
            <span className="fin-header-stat__value" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'block', marginTop: 2 }}>₹{fmt(stats.totalPrincipal)}</span>
          </div>
          <div className="fin-header-stat" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '12px 16px', borderRadius: 10 }}>
            <span className="fin-header-stat__label" style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Maturity Liability</span>
            <span className="fin-header-stat__value fin-header-stat__value--good" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669', display: 'block', marginTop: 2 }}>₹{fmt(stats.totalMaturityValue)}</span>
          </div>
          <div className="fin-header-stat" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '12px 16px', borderRadius: 10 }}>
            <span className="fin-header-stat__label" style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Active Accounts</span>
            <span className="fin-header-stat__value" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563EB', display: 'block', marginTop: 2 }}>{stats.activeCount}</span>
          </div>
          <div className="fin-header-stat" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '12px 16px', borderRadius: 10 }}>
            <span className="fin-header-stat__label" style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Due in 30 Days</span>
            <span className={stats.upcomingCount > 0 ? 'fin-header-stat__value' : 'fin-header-stat__value'} style={{ fontSize: '1.2rem', fontWeight: 800, color: stats.upcomingCount > 0 ? '#DC2626' : '#0F172A', display: 'block', marginTop: 2 }}>{stats.upcomingCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, margin: '18px 0 12px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setCurrentPage(1); }}
            style={{ height: 34, padding: '0 10px', borderRadius: 7, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.78rem', fontWeight: 600, color: '#0F172A', outline: 'none' }}
          >
            <option value="ALL">All Statuses ({fixedDeposits.length})</option>
            <option value="ACTIVE">Active Accounts</option>
            <option value="MATURED">Matured Accounts</option>
            <option value="CLOSED_PREMATURE">Premature Exits</option>
          </select>

          <button
            type="button"
            onClick={() => { setUpcomingOnly(v => !v); setCurrentPage(1); }}
            style={{
              height: 34, padding: '0 12px', borderRadius: 7,
              border: upcomingOnly ? '1px solid #FDE68A' : '1px solid #CBD5E1',
              background: upcomingOnly ? '#FFFBEB' : '#FFFFFF',
              color: upcomingOnly ? '#B45309' : '#475569',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            Maturities Due in 30 Days {stats.upcomingCount > 0 && `(${stats.upcomingCount})`}
          </button>
        </div>

        <div style={{ position: 'relative', width: 240 }}>
          <Search style={{ position: 'absolute', left: 10, top: 9, width: 14, height: 14, color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search account or customer..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', height: 34, paddingLeft: 30, borderRadius: 7, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Grid Table */}
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
              <th style={{ textAlign: 'center' }}>{t('col.status')}</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr><td colSpan="11" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>No fixed deposit records found.</td></tr>
            ) : pagedRows.map(f => (
              <tr key={f.id}>
                <td className="code" style={{ fontWeight: 700, color: '#059669' }}>{f.fd_account_no}</td>
                <td style={{ fontWeight: 600, color: '#0F172A' }}>{f.customer_name}</td>
                <td style={{ color: '#64748B', fontSize: '0.75rem' }}>{borrowerMap[f.borrower_id]?.phone || '—'}</td>
                <td style={{ color: '#475569', fontSize: '0.75rem' }}>{f.scheme === 'CUMULATIVE' ? 'Cumulative' : 'Monthly Payout'}</td>
                <td className="num" style={{ fontWeight: 600 }}>₹{fmt(f.principal_amount)}</td>
                <td className="num">{f.interest_rate}%</td>
                <td style={{ color: '#64748B' }}>{f.tenure_months} mo</td>
                <td style={{ color: '#64748B', fontSize: '0.75rem' }}>{f.booking_date}</td>
                <td style={{ fontSize: '0.75rem' }}>{f.maturity_date}</td>
                <td className="num" style={{ fontWeight: 700, color: '#059669' }}>₹{fmt(f.maturity_value)}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`fin-badge ${f.status === 'ACTIVE' ? 'fin-badge--ok' : f.status === 'MATURED' ? 'fin-badge--info' : 'fin-badge--warn'}`}>
                    {tStatus(f.status)}
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
