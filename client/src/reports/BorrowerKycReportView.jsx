import React, { useState, useMemo, useEffect } from 'react';
import { Users, Search, ChevronLeft, ChevronRight, Download, Printer, FileDown } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { exportToCsv } from '../utils/csvExport';
import ReportPreviewModal from '../components/ReportPreviewModal';

const KYC_KEY = {
  VERIFIED: 'fin.kyc_verified',
  PENDING: 'fin.kyc_pending'
};

export default function BorrowerKycReportView({ borrowers = [], loans = [], branchesList = [], tenant, user, selectedBranch = 'ALL' }) {
  const { t } = useLanguage();
  const [branch, setBranch] = useState('');
  useEffect(() => {
    if (selectedBranch && selectedBranch !== 'ALL') setBranch(selectedBranch);
  }, [selectedBranch]);
  const hasBranchSelected = branch !== '';
  const [kycStatus, setKycStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const byBranch = useMemo(() => {
    if (branch === 'ALL') return borrowers;
    if (!branch) return [];
    return borrowers.filter(b => b.branch === branch);
  }, [borrowers, branch]);

  const byKyc = useMemo(() => (kycStatus === 'ALL' ? byBranch : byBranch.filter(b => b.kyc_status === kycStatus)), [byBranch, kycStatus]);

  const rows = useMemo(() => byKyc.map(b => {
    const borrowerLoans = loans.filter(l => l.borrower_id === b.id);
    return {
      ...b,
      loanCount: borrowerLoans.length,
      totalExposure: borrowerLoans.reduce((s, l) => s + (l.pending_amount || 0), 0)
    };
  }), [byKyc, loans]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return rows.filter(b => !q || b.full_name.toLowerCase().includes(q) || b.borrower_code.toLowerCase().includes(q));
  }, [rows, searchQuery]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedRows = filtered.slice(startIndex, startIndex + pageSize);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const stats = useMemo(() => ({
    total: byBranch.length,
    verified: byBranch.filter(b => b.kyc_status === 'VERIFIED').length,
    pending: byBranch.filter(b => b.kyc_status === 'PENDING').length
  }), [byBranch]);

  const PDF_COLUMNS = [
    { label: t('col.code') }, { label: t('col.customer_name') }, { label: t('col.phone') },
    { label: t('fin.branch_label') }, { label: t('col.address') }, { label: t('fin.city_label') },
    { label: t('fin.state_label') }, { label: t('fin.aadhaar_label') }, { label: t('fin.pan_label') },
    { label: t('fin.occupation_label') }, { label: t('fin.monthly_income_label'), align: 'right' },
    { label: t('fin.guarantor_label') }, { label: t('fin.guarantor_phone_label') },
    { label: t('fin.kyc_status_label') }, { label: t('fin.kyc_verified_at_label') },
    { label: t('fin.loans_count_label'), align: 'right' }, { label: t('col.outstanding_rs'), align: 'right' }
  ];

  const buildRows = () => filtered.map(b => [
    b.borrower_code, b.full_name, b.phone, b.branch, b.address_line1 || '—', b.city || '—', b.state || '—',
    b.aadhaar_number || '—', b.pan_number || '—', b.occupation || '—', fmt(b.monthly_income),
    b.guarantor_name || '—', b.guarantor_phone || '—', b.kyc_status, b.kyc_verified_at || '—',
    b.loanCount, fmt(b.totalExposure)
  ]);

  const handleExport = () => {
    exportToCsv(`borrower-kyc-report-${branch || 'none'}.csv`, PDF_COLUMNS.map(c => c.label), buildRows());
  };

  const [showPreview, setShowPreview] = useState(false);
  const previewProps = {
    company: tenant,
    reportTitle: t('fin.borrower_kyc_report_title'),
    reportSubtitle: t('fin.borrower_kyc_report_subtitle'),
    filters: { [t('fin.branch_label')]: branch === 'ALL' ? t('fin.all_branches') : (branch || '—'), [t('fin.kyc_status_label')]: kycStatus },
    columns: PDF_COLUMNS,
    rows: buildRows(),
    generatedBy: user?.name
  };

  return (
    <div className="fin-page">
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: '#FDF4FF', border: '1px solid #F0ABFC', color: '#A21CAF' }}>
              <Users style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('fin.borrower_kyc_report_title')}</h1>
              <p className="fin-page-header__subtitle">{t('fin.borrower_kyc_report_subtitle')}</p>
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
            <span className="fin-header-stat__value">{hasBranchSelected ? stats.total : '—'}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.kyc_verified')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">{hasBranchSelected ? stats.verified : '—'}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.kyc_pending')}</span>
            <span className={stats.pending > 0 ? 'fin-header-stat__value fin-header-stat__value--bad' : 'fin-header-stat__value'}>
              {hasBranchSelected ? stats.pending : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="fin-filterbar">
        <div className="fin-field">
          <label>{t('fin.branch_label')}</label>
          <select className="fin-select" value={branch} onChange={(e) => { setBranch(e.target.value); setCurrentPage(1); }} disabled={Boolean(selectedBranch && selectedBranch !== 'ALL')}>
            <option value="">{t('fin.select_branch_placeholder')}</option>
            <option value="ALL">{t('fin.all_branches')}</option>
            {branchesList.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        </div>
        <div className="fin-field">
          <label>{t('fin.kyc_status_label')}</label>
          <select className="fin-select" value={kycStatus} onChange={(e) => { setKycStatus(e.target.value); setCurrentPage(1); }}>
            <option value="ALL">{t('fin.all_statuses')}</option>
            <option value="VERIFIED">{t('fin.kyc_verified')}</option>
            <option value="PENDING">{t('fin.kyc_pending')}</option>
          </select>
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
              <th>{t('col.code')}</th>
              <th>{t('col.customer_name')}</th>
              <th>{t('col.phone')}</th>
              <th>{t('fin.branch_label')}</th>
              <th>{t('col.address')}</th>
              <th>{t('fin.city_label')}</th>
              <th>{t('fin.state_label')}</th>
              <th>{t('fin.aadhaar_label')}</th>
              <th>{t('fin.pan_label')}</th>
              <th>{t('fin.occupation_label')}</th>
              <th className="num">{t('fin.monthly_income_label')}</th>
              <th>{t('fin.guarantor_label')}</th>
              <th>{t('fin.guarantor_phone_label')}</th>
              <th>{t('fin.kyc_status_label')}</th>
              <th>{t('fin.kyc_verified_at_label')}</th>
              <th className="num">{t('fin.loans_count_label')}</th>
              <th className="num">{t('col.outstanding_rs')}</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr><td colSpan="17" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>{hasBranchSelected ? t('fin.no_results_hint') : t('fin.select_branch_hint')}</td></tr>
            ) : pagedRows.map(b => (
              <tr key={b.id}>
                <td className="code">{b.borrower_code}</td>
                <td>{b.full_name}</td>
                <td>{b.phone}</td>
                <td>{b.branch}</td>
                <td>{b.address_line1 || '—'}</td>
                <td>{b.city || '—'}</td>
                <td>{b.state || '—'}</td>
                <td>{b.aadhaar_number || '—'}</td>
                <td>{b.pan_number || '—'}</td>
                <td>{b.occupation || '—'}</td>
                <td className="num">{b.monthly_income ? `₹${fmt(b.monthly_income)}` : '—'}</td>
                <td>{b.guarantor_name || '—'}</td>
                <td>{b.guarantor_phone || '—'}</td>
                <td>
                  <span className={`fin-badge ${b.kyc_status === 'VERIFIED' ? 'fin-badge--ok' : 'fin-badge--warn'}`}>
                    {KYC_KEY[b.kyc_status] ? t(KYC_KEY[b.kyc_status]) : b.kyc_status}
                  </span>
                </td>
                <td>{b.kyc_verified_at || '—'}</td>
                <td className="num">{b.loanCount}</td>
                <td className="num" style={{ fontWeight: 600, color: '#0F172A' }}>₹{fmt(b.totalExposure)}</td>
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
