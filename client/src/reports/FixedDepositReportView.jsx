import React, { useState, useMemo } from 'react';
import { Banknote, Search, ChevronLeft, ChevronRight, Download, Printer, FileDown, History } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { exportToCsv } from '../utils/csvExport';
import ReportPreviewModal from '../components/ReportPreviewModal';
import DropdownSelect from '../components/DropdownSelect';
import TransactionHistoryModal from '../components/TransactionHistoryModal';

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

export default function FixedDepositReportView({ fixedDeposits = [], borrowers = [], journalEntries = [], tenant, user }) {
  const { t, tStatus } = useLanguage();
  // One specific FD's full transaction history — the table itself only ever
  // showed one summary row per account.
  const [historyFd, setHistoryFd] = useState(null);
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
    <div className="fin-page fin-report-page">

      {/* MNC Header Card */}
      <div className="fin-header-card" style={{ background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)', border: '1px solid #E2E8F0', borderRadius: 12, padding: '18px 24px' }}>
        <div className="fin-page-header">
          <div className="fin-page-header__left" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="fin-page-header__icon" style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Banknote style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.01em' }}>
                Fixed Deposit Treasury Report
              </h1>
              <p className="fin-page-header__subtitle" style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                {t('fin.fd_report_subtitle')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="fin-btn-primary" style={{ background: '#475569' }} onClick={() => setShowPreview(true)} disabled={filtered.length === 0}>
              <Printer style={{ width: 14, height: 14 }} />
              <span>Print Preview</span>
            </button>
            <button type="button" className="fin-btn-primary" style={{ background: '#475569' }} onClick={() => setShowPreview(true)} disabled={filtered.length === 0}>
              <FileDown style={{ width: 14, height: 14 }} />
              <span>Export PDF</span>
            </button>
            <button type="button" className="fin-btn-primary" onClick={handleExport} disabled={filtered.length === 0}>
              <Download style={{ width: 14, height: 14 }} />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, margin: '18px 0 12px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <DropdownSelect
            value={status}
            onChange={(e) => { setStatus(e.target.value); setCurrentPage(1); }}
            buttonStyle={{ height: 34, minWidth: 170 }}
            options={[
              { value: 'ALL', label: `All Statuses (${fixedDeposits.length})` },
              { value: 'ACTIVE', label: 'Active Accounts' },
              { value: 'MATURED', label: 'Matured Accounts' },
              { value: 'CLOSED_PREMATURE', label: 'Premature Exits' }
            ]}
          />

          <button
            type="button"
            onClick={() => { setUpcomingOnly(v => !v); setCurrentPage(1); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              height: 34,
              padding: '0 12px',
              borderRadius: 7,
              border: upcomingOnly ? '1px solid var(--brand-primary-border, #A7F3D0)' : '1px solid #CBD5E1',
              background: upcomingOnly ? 'var(--brand-primary-light, #ECFDF5)' : '#FFFFFF',
              color: upcomingOnly ? 'var(--brand-primary, #059669)' : '#334155',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ lineHeight: 1 }}>Maturities Due in 30 Days</span>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              borderRadius: 12,
              padding: '2px 7px',
              background: upcomingOnly ? 'var(--brand-primary, #059669)' : '#F1F5F9',
              color: upcomingOnly ? '#FFFFFF' : '#64748B',
              border: `1px solid ${upcomingOnly ? 'var(--brand-primary, #059669)' : '#CBD5E1'}`,
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>{stats.upcomingCount}</span>
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
              <th style={{ textAlign: 'right' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr><td colSpan="12" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>No fixed deposit records found.</td></tr>
            ) : pagedRows.map(f => (
              <tr key={f.id}>
                <td className="code" style={{ fontWeight: 700, color: 'var(--brand-primary, #15803D)' }}>{f.fd_account_no}</td>
                <td style={{ fontWeight: 600, color: '#0F172A' }}>{f.customer_name}</td>
                <td style={{ color: '#64748B', fontSize: '0.75rem' }}>{borrowerMap[f.borrower_id]?.phone || '—'}</td>
                <td style={{ color: '#475569', fontSize: '0.75rem' }}>{f.scheme === 'CUMULATIVE' ? 'Cumulative' : 'Monthly Payout'}</td>
                <td className="num" style={{ fontWeight: 600 }}>₹{fmt(f.principal_amount)}</td>
                <td className="num">{f.interest_rate}%</td>
                <td style={{ color: '#64748B' }}>{f.tenure_months} mo</td>
                <td style={{ color: '#64748B', fontSize: '0.75rem' }}>{f.booking_date}</td>
                <td style={{ fontSize: '0.75rem' }}>{f.maturity_date}</td>
                <td className="num" style={{ fontWeight: 700, color: 'var(--brand-primary, #15803D)' }}>₹{fmt(f.maturity_value)}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`fin-badge ${f.status === 'ACTIVE' ? 'fin-badge--ok' : f.status === 'MATURED' ? 'fin-badge--info' : 'fin-badge--warn'}`}>
                    {tStatus(f.status)}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => setHistoryFd(f)}
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

      {historyFd && (
        <TransactionHistoryModal
          title="Fixed Deposit Transaction History"
          accountLabel={`${historyFd.fd_account_no} — ${historyFd.customer_name}`}
          tenant={tenant}
          entries={journalEntries.filter(e =>
            ['FD_BOOKING', 'FD_INTEREST_PAYOUT', 'FD_MATURITY', 'FD_PREMATURE_CLOSE'].includes(e.ref_type) &&
            String(e.ref_id) === String(historyFd.id)
          )}
          onClose={() => setHistoryFd(null)}
        />
      )}
    </div>
  );
}
