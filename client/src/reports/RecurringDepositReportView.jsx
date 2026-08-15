import React, { useState, useMemo } from 'react';
import { Banknote, Search, ChevronLeft, ChevronRight, Download, Printer, FileDown } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { exportToCsv } from '../utils/csvExport';
import ReportPreviewModal from '../components/ReportPreviewModal';
import DropdownSelect from '../components/DropdownSelect';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(dateStr) {
  const today = new Date(`${todayStr()}T00:00:00Z`);
  const target = new Date(`${dateStr}T00:00:00Z`);
  return Math.round((target - today) / 86400000);
}

export default function RecurringDepositReportView({ recurringDeposits = [], borrowers = [], tenant, user }) {
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

  const byStatus = useMemo(() => (status === 'ALL' ? recurringDeposits : recurringDeposits.filter(r => r.status === status)), [recurringDeposits, status]);
  const byUpcoming = useMemo(() => (upcomingOnly ? byStatus.filter(r => r.status === 'ACTIVE' && daysUntil(r.maturity_date) >= 0 && daysUntil(r.maturity_date) <= 30) : byStatus), [byStatus, upcomingOnly]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return byUpcoming.filter(r => !q || r.customer_name.toLowerCase().includes(q) || r.rd_account_no.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => (a.maturity_date < b.maturity_date ? -1 : a.maturity_date > b.maturity_date ? 1 : 0));
  }, [byUpcoming, searchQuery]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedRows = filtered.slice(startIndex, startIndex + pageSize);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const stats = useMemo(() => ({
    totalDeposited: recurringDeposits.filter(r => r.status === 'ACTIVE').reduce((s, r) => s + (r.monthly_installment || 0) * (r.tenure_months || 0), 0),
    totalMaturityValue: recurringDeposits.reduce((s, r) => s + (r.maturity_value || 0), 0),
    activeCount: recurringDeposits.filter(r => r.status === 'ACTIVE').length,
    upcomingCount: recurringDeposits.filter(r => r.status === 'ACTIVE' && daysUntil(r.maturity_date) >= 0 && daysUntil(r.maturity_date) <= 30).length
  }), [recurringDeposits]);

  const paidCount = (r) => (r.installments || []).filter(i => i.status === 'PAID').length;

  const PDF_COLUMNS = [
    { label: t('col.rd_account_no') }, { label: t('col.customer_name') }, { label: t('col.phone') },
    { label: t('col.monthly_installment_rs'), align: 'right' }, { label: t('fin.interest_rate_label'), align: 'right' },
    { label: t('fin.tenure_months_label') }, { label: 'Paid' }, { label: t('fin.booking_date_label') }, { label: t('fin.maturity_date_label') },
    { label: t('fin.maturity_value_label'), align: 'right' }, { label: t('col.status') }
  ];

  const buildRows = () => filtered.map(r => [
    r.rd_account_no, r.customer_name, borrowerMap[r.borrower_id]?.phone || '—',
    fmt(r.monthly_installment), r.interest_rate, r.tenure_months, `${paidCount(r)}/${r.tenure_months}`, r.booking_date, r.maturity_date,
    fmt(r.maturity_value), r.status
  ]);

  const handleExport = () => {
    exportToCsv('recurring-deposit-report.csv', PDF_COLUMNS.map(c => c.label), buildRows());
  };

  const [showPreview, setShowPreview] = useState(false);
  const previewProps = {
    company: tenant,
    reportTitle: t('fin.rd_report_title'),
    reportSubtitle: t('fin.rd_report_subtitle'),
    filters: { [t('col.status')]: status, [t('fin.upcoming_maturities_label')]: upcomingOnly ? '30d' : '—' },
    columns: PDF_COLUMNS,
    rows: buildRows(),
    generatedBy: user?.name
  };

  return (
    <div className="fin-page">

      <div className="fin-header-card" style={{ background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)', border: '1px solid #E2E8F0', borderRadius: 12, padding: '18px 24px' }}>
        <div className="fin-page-header">
          <div className="fin-page-header__left" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="fin-page-header__icon" style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Banknote style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.01em' }}>
                {t('fin.rd_report_title')}
              </h1>
              <p className="fin-page-header__subtitle" style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                {t('fin.rd_report_subtitle')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={() => setShowPreview(true)} disabled={filtered.length === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <Printer style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} />
              <span>Print Preview</span>
            </button>
            <button type="button" onClick={() => setShowPreview(true)} disabled={filtered.length === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <FileDown style={{ width: 14, height: 14, color: 'var(--color-info, #2563EB)' }} />
              <span>Export PDF</span>
            </button>
            <button type="button" onClick={handleExport} disabled={filtered.length === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7, border: 'none', background: 'var(--brand-primary, #15803D)', color: '#FFFFFF', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb),0.25)' }}>
              <Download style={{ width: 14, height: 14 }} />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, margin: '18px 0 12px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <DropdownSelect
            value={status}
            onChange={(e) => { setStatus(e.target.value); setCurrentPage(1); }}
            buttonStyle={{ height: 34, minWidth: 170 }}
            options={[
              { value: 'ALL', label: `All Statuses (${recurringDeposits.length})` },
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

      <div className="fin-tablewrap">
        <table className="fin-grid-table">
          <thead>
            <tr>
              <th>{t('col.rd_account_no')}</th>
              <th>{t('col.customer_name')}</th>
              <th>{t('col.phone')}</th>
              <th className="num">{t('col.monthly_installment_rs')}</th>
              <th className="num">{t('fin.interest_rate_label')}</th>
              <th>{t('fin.tenure_months_label')}</th>
              <th style={{ textAlign: 'center' }}>Paid</th>
              <th>{t('fin.booking_date_label')}</th>
              <th>{t('fin.maturity_date_label')}</th>
              <th className="num">{t('fin.maturity_value_label')}</th>
              <th style={{ textAlign: 'center' }}>{t('col.status')}</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr><td colSpan="11" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>No recurring deposit records found.</td></tr>
            ) : pagedRows.map(r => (
              <tr key={r.id}>
                <td className="code" style={{ fontWeight: 700, color: 'var(--brand-primary, #15803D)' }}>{r.rd_account_no}</td>
                <td style={{ fontWeight: 600, color: '#0F172A' }}>{r.customer_name}</td>
                <td style={{ color: '#64748B', fontSize: '0.75rem' }}>{borrowerMap[r.borrower_id]?.phone || '—'}</td>
                <td className="num" style={{ fontWeight: 600 }}>₹{fmt(r.monthly_installment)}</td>
                <td className="num">{r.interest_rate}%</td>
                <td style={{ color: '#64748B' }}>{r.tenure_months} mo</td>
                <td style={{ textAlign: 'center', color: '#64748B', fontSize: '0.78rem' }}>{paidCount(r)}/{r.tenure_months}</td>
                <td style={{ color: '#64748B', fontSize: '0.75rem' }}>{r.booking_date}</td>
                <td style={{ fontSize: '0.75rem' }}>{r.maturity_date}</td>
                <td className="num" style={{ fontWeight: 700, color: 'var(--brand-primary, #15803D)' }}>₹{fmt(r.maturity_value)}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`fin-badge ${r.status === 'ACTIVE' ? 'fin-badge--ok' : r.status === 'MATURED' ? 'fin-badge--info' : 'fin-badge--warn'}`}>
                    {tStatus(r.status)}
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
