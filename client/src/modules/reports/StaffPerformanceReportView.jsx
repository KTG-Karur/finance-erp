import React, { useState, useMemo } from 'react';
import { UserCog, Search, Download, Printer, FileDown } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { exportToCsv } from '../../utils/csvExport';
import ReportPreviewModal from '../../components/ReportPreviewModal';
import { refTimeMap } from '../../utils/accounting';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function StaffPerformanceReportView({ employees = [], loans = [], collections = [], branchesList = [], journalEntries = [], tenant, user }) {
  const { t } = useLanguage();
  const [branch, setBranch] = useState('');
  const hasBranchSelected = branch !== '';
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [applied, setApplied] = useState({ from: '', to: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const timeMap = useMemo(() => refTimeMap(journalEntries), [journalEntries]);

  const handleSearch = (e) => {
    e.preventDefault();
    setApplied({ from: fromDate, to: toDate });
  };

  const loanBranchMap = useMemo(() => {
    const m = {};
    loans.forEach(l => { m[l.id] = l.branch; });
    return m;
  }, [loans]);

  const inBranch = (br) => (branch === 'ALL' ? true : br === branch);
  const inRange = (d) => (!applied.from || d >= applied.from) && (!applied.to || d <= applied.to);

  const scopedLoans = useMemo(() => (hasBranchSelected ? loans.filter(l => inBranch(l.branch) && l.status !== 'PENDING' && inRange(l.loan_date)) : []), [loans, branch, applied, hasBranchSelected]);
  const scopedCollections = useMemo(() => (hasBranchSelected ? collections.filter(c => inBranch(loanBranchMap[c.loan_id]) && inRange(c.collection_date)) : []), [collections, branch, applied, loanBranchMap, hasBranchSelected]);

  const rows = useMemo(() => employees.map(emp => {
    const empCollections = scopedCollections.filter(c => c.collector_name === emp.name);
    const empLoans = scopedLoans.filter(l => l.collector === emp.name);
    return {
      ...emp,
      empCollections,
      empLoans,
      collectionsCount: empCollections.length,
      collectionsAmount: empCollections.reduce((s, c) => s + (c.amount || 0), 0),
      loansCount: empLoans.length,
      loansAmount: empLoans.reduce((s, l) => s + (l.principal_amount || 0), 0)
    };
  }).filter(r => r.collectionsCount > 0 || r.loansCount > 0 || !hasBranchSelected), [employees, scopedCollections, scopedLoans, hasBranchSelected]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return rows.filter(r => !q || r.name.toLowerCase().includes(q));
  }, [rows, searchQuery]);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const totals = useMemo(() => ({
    collectionsAmount: filtered.reduce((s, r) => s + r.collectionsAmount, 0),
    loansAmount: filtered.reduce((s, r) => s + r.loansAmount, 0)
  }), [filtered]);

  const SUMMARY_COLUMNS = [
    { label: t('fin.employee_name_label') }, { label: t('col.email_address') }, { label: t('col.role') },
    { label: t('fin.collections_count_label'), align: 'right' }, { label: t('fin.collections_amount_label'), align: 'right' },
    { label: t('fin.loans_disbursed_count_label'), align: 'right' }, { label: t('fin.loans_disbursed_amount_label'), align: 'right' }
  ];

  const DETAIL_COLUMNS = [
    { label: t('fin.employee_name_label') }, { label: t('col.type') }, { label: t('col.date') }, { label: t('col.date_time') },
    { label: t('fin.reference_no_label') }, { label: t('col.customer_name') }, { label: t('col.amount_rs'), align: 'right' }
  ];

  const buildSummaryRows = () => filtered.map(r => [r.name, r.email, r.role, r.collectionsCount, fmt(r.collectionsAmount), r.loansCount, fmt(r.loansAmount)]);

  const buildDetailRows = () => {
    const out = [];
    filtered.forEach(r => {
      r.empCollections.forEach(c => out.push([
        r.name, t('fin.collections_count_label'), c.collection_date, fmtTime(timeMap[`COLLECTION:${c.id}`]), c.receipt_no, c.borrower_name, fmt(c.amount)
      ]));
      r.empLoans.forEach(l => out.push([
        r.name, t('fin.loans_disbursed_count_label'), l.loan_date, fmtTime(timeMap[`DISBURSAL:${l.id}`]), l.loan_account_no, l.borrower_name, fmt(l.principal_amount)
      ]));
    });
    return out.sort((a, b) => (a[2] < b[2] ? 1 : a[2] > b[2] ? -1 : 0));
  };

  const handleExport = () => {
    exportToCsv(`staff-performance-report-${branch || 'none'}.csv`, SUMMARY_COLUMNS.map(c => c.label), buildSummaryRows());
  };

  const [showPreview, setShowPreview] = useState(false);
  const previewProps = {
    company: tenant,
    reportTitle: t('fin.staff_performance_report_title'),
    reportSubtitle: t('fin.staff_performance_report_subtitle'),
    filters: {
      [t('fin.branch_label')]: branch === 'ALL' ? t('fin.all_branches') : (branch || '—'),
      [t('fin.from_label')]: applied.from || '—',
      [t('fin.to_label')]: applied.to || '—'
    },
    columns: SUMMARY_COLUMNS,
    rows: buildSummaryRows(),
    totalsRow: [t('fin.total_row'), '', '', '', fmt(totals.collectionsAmount), '', fmt(totals.loansAmount)],
    generatedBy: user?.name
  };

  const [showPreviewDetail, setShowPreviewDetail] = useState(false);
  const previewPropsDetail = {
    company: tenant,
    reportTitle: `${t('fin.staff_performance_report_title')} — ${t('fin.transaction_history_label')}`,
    reportSubtitle: t('fin.staff_performance_report_subtitle'),
    filters: {
      [t('fin.branch_label')]: branch === 'ALL' ? t('fin.all_branches') : (branch || '—'),
      [t('fin.from_label')]: applied.from || '—',
      [t('fin.to_label')]: applied.to || '—'
    },
    columns: DETAIL_COLUMNS,
    rows: buildDetailRows(),
    generatedBy: user?.name
  };

  return (
    <div className="fin-page">
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', color: '#4338CA' }}>
              <UserCog style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('fin.staff_performance_report_title')}</h1>
              <p className="fin-page-header__subtitle">{t('fin.staff_performance_report_subtitle')}</p>
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
            <span className="fin-header-stat__label">{t('fin.collections_amount_label')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">{hasBranchSelected ? `₹${fmt(totals.collectionsAmount)}` : '—'}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.loans_disbursed_amount_label')}</span>
            <span className="fin-header-stat__value">{hasBranchSelected ? `₹${fmt(totals.loansAmount)}` : '—'}</span>
          </div>
        </div>
      </div>

      <form className="fin-filterbar" onSubmit={handleSearch}>
        <div className="fin-field">
          <label>{t('fin.branch_label')}</label>
          <select className="fin-select" value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="">{t('fin.select_branch_placeholder')}</option>
            <option value="ALL">{t('fin.all_branches')}</option>
            {branchesList.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
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
            <input className="fin-input" style={{ paddingLeft: 28, width: '100%', boxSizing: 'border-box' }} type="text" placeholder={t('fin.find_transactions_placeholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <button type="submit" className="fin-search-btn">{t('fin.search_btn')}</button>
      </form>

      <div className="fin-tablewrap">
        <table className="fin-grid-table">
          <thead>
            <tr>
              <th>{t('fin.employee_name_label')}</th>
              <th>{t('col.email_address')}</th>
              <th>{t('col.role')}</th>
              <th className="num">{t('fin.collections_count_label')}</th>
              <th className="num">{t('fin.collections_amount_label')}</th>
              <th className="num">{t('fin.loans_disbursed_count_label')}</th>
              <th className="num">{t('fin.loans_disbursed_amount_label')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>{hasBranchSelected ? t('fin.no_results_hint') : t('fin.select_branch_hint')}</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.email}</td>
                <td>{r.role}</td>
                <td className="num">{r.collectionsCount}</td>
                <td className="num">₹{fmt(r.collectionsAmount)}</td>
                <td className="num">{r.loansCount}</td>
                <td className="num" style={{ fontWeight: 600, color: '#0F172A' }}>₹{fmt(r.loansAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasBranchSelected && (
        <>
          <div className="fin-filterbar" style={{ marginTop: 18 }}>
            <div className="fin-filterbar__label" style={{ marginBottom: 0 }}>{t('fin.transaction_history_label')}</div>
            <button type="button" className="fin-btn-primary" style={{ background: '#475569', marginLeft: 'auto' }} onClick={() => setShowPreviewDetail(true)} disabled={filtered.length === 0}>
              <FileDown style={{ width: 14, height: 14 }} />
              <span>{t('fin.export_pdf_btn')}</span>
            </button>
          </div>

          <div className="fin-tablewrap">
            <table className="fin-grid-table">
              <thead>
                <tr>
                  <th>{t('fin.employee_name_label')}</th>
                  <th>{t('col.type')}</th>
                  <th>{t('col.date')}</th>
                  <th>{t('col.date_time')}</th>
                  <th>{t('fin.reference_no_label')}</th>
                  <th>{t('col.customer_name')}</th>
                  <th className="num">{t('col.amount_rs')}</th>
                </tr>
              </thead>
              <tbody>
                {buildDetailRows().length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px 0', color: '#94A3B8' }}>{t('fin.no_results_hint')}</td></tr>
                ) : buildDetailRows().map((row, idx) => (
                  <tr key={idx}>
                    <td>{row[0]}</td>
                    <td><span className="fin-tag">{row[1]}</span></td>
                    <td>{row[2]}</td>
                    <td>{row[3]}</td>
                    <td className="code">{row[4]}</td>
                    <td>{row[5]}</td>
                    <td className="num">₹{row[6]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showPreview && <ReportPreviewModal {...previewProps} onClose={() => setShowPreview(false)} />}
      {showPreviewDetail && <ReportPreviewModal {...previewPropsDetail} onClose={() => setShowPreviewDetail(false)} />}
    </div>
  );
}
