import React, { useState, useMemo } from 'react';
import { Wallet, Search, ChevronLeft, ChevronRight, Download, Printer, FileDown } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { exportToCsv } from '../../utils/csvExport';
import ReportPreviewModal from '../../components/ReportPreviewModal';

const TXN_TYPE_KEY = {
  CAPITAL_INJECTION: 'fin.txn_capital_injection',
  TOP_UP: 'fin.txn_top_up',
  YIELD_PAYOUT: 'fin.txn_yield_payout'
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function InvestorCapitalReportView({ investors = [], investorTransactions = [], tenant, user }) {
  const { t } = useLanguage();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [applied, setApplied] = useState({ from: '', to: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const investorNameMap = useMemo(() => {
    const m = {};
    investors.forEach(i => { m[i.id] = i.name; });
    return m;
  }, [investors]);

  const handleSearch = (e) => {
    e.preventDefault();
    setApplied({ from: fromDate, to: toDate });
  };

  const byRange = useMemo(() => investorTransactions.filter(tx => (!applied.from || tx.date >= applied.from) && (!applied.to || tx.date <= applied.to)), [investorTransactions, applied]);

  const rows = useMemo(() => investors.map(inv => {
    const txs = byRange.filter(tx => tx.investor_id === inv.id);
    const contributed = txs.filter(tx => tx.type === 'CAPITAL_INJECTION' || tx.type === 'TOP_UP').reduce((s, tx) => s + tx.amount, 0);
    const returnsPaid = txs.filter(tx => tx.type === 'YIELD_PAYOUT').reduce((s, tx) => s + tx.amount, 0);
    return { ...inv, contributed, returnsPaid, netBalance: contributed - returnsPaid, txnCount: txs.length };
  }), [investors, byRange]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return rows.filter(r => !q || r.name.toLowerCase().includes(q) || r.investor_code.toLowerCase().includes(q));
  }, [rows, searchQuery]);

  const txnRows = useMemo(() => byRange
    .filter(tx => {
      const q = searchQuery.toLowerCase().trim();
      return !q || (investorNameMap[tx.investor_id] || '').toLowerCase().includes(q);
    })
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)), [byRange, searchQuery, investorNameMap]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedRows = filtered.slice(startIndex, startIndex + pageSize);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const totalContributed = filtered.reduce((s, r) => s + r.contributed, 0);
  const totalReturns = filtered.reduce((s, r) => s + r.returnsPaid, 0);

  const SUMMARY_COLUMNS = [
    { label: t('col.code') }, { label: t('fin.investor_name_label') }, { label: t('col.phone') }, { label: t('col.email_address') },
    { label: t('fin.bank_name_label') }, { label: t('fin.account_no_label') }, { label: t('fin.ifsc_label') },
    { label: t('fin.capital_contributed_label'), align: 'right' }, { label: t('fin.returns_paid_label'), align: 'right' },
    { label: t('fin.net_balance_label'), align: 'right' }
  ];

  const TXN_COLUMNS = [
    { label: t('col.date') }, { label: t('fin.investor_name_label') }, { label: t('fin.txn_type_label') },
    { label: t('col.amount_rs'), align: 'right' }, { label: t('col.notes') }
  ];

  const buildSummaryRows = () => filtered.map(r => [
    r.investor_code, r.name, r.phone, r.email, r.bank_name, r.account_no, r.ifsc_no,
    fmt(r.contributed), fmt(r.returnsPaid), fmt(r.netBalance)
  ]);

  const buildTxnRows = () => txnRows.map(tx => [
    tx.date, investorNameMap[tx.investor_id] || '—', tx.type, fmt(tx.amount), tx.notes || '—'
  ]);

  const handleExport = () => {
    exportToCsv('investor-capital-report.csv', SUMMARY_COLUMNS.map(c => c.label), buildSummaryRows());
  };

  const [showPreview, setShowPreview] = useState(false);
  const previewProps = {
    company: tenant,
    reportTitle: t('fin.investor_capital_report_title'),
    reportSubtitle: t('fin.investor_capital_report_subtitle'),
    filters: { [t('fin.from_label')]: applied.from || '—', [t('fin.to_label')]: applied.to || '—' },
    columns: SUMMARY_COLUMNS,
    rows: buildSummaryRows(),
    generatedBy: user?.name
  };

  const [showPreviewTxns, setShowPreviewTxns] = useState(false);
  const previewPropsTxns = {
    company: tenant,
    reportTitle: `${t('fin.investor_capital_report_title')} — ${t('fin.transaction_history_label')}`,
    reportSubtitle: t('fin.investor_capital_report_subtitle'),
    filters: { [t('fin.from_label')]: applied.from || '—', [t('fin.to_label')]: applied.to || '—' },
    columns: TXN_COLUMNS,
    rows: buildTxnRows(),
    generatedBy: user?.name
  };

  return (
    <div className="fin-page">
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#B45309' }}>
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
            <span className="fin-header-stat__label">{t('fin.capital_contributed_label')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">₹{fmt(totalContributed)}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.returns_paid_label')}</span>
            <span className="fin-header-stat__value">₹{fmt(totalReturns)}</span>
          </div>
        </div>
      </div>

      <form className="fin-filterbar" onSubmit={handleSearch}>
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
              <th>{t('col.code')}</th>
              <th>{t('fin.investor_name_label')}</th>
              <th>{t('col.phone')}</th>
              <th>{t('col.email_address')}</th>
              <th>{t('fin.bank_name_label')}</th>
              <th>{t('fin.account_no_label')}</th>
              <th>{t('fin.ifsc_label')}</th>
              <th className="num">{t('fin.capital_contributed_label')}</th>
              <th className="num">{t('fin.returns_paid_label')}</th>
              <th className="num">{t('fin.net_balance_label')}</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr><td colSpan="10" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>{t('fin.no_results_hint')}</td></tr>
            ) : pagedRows.map(r => (
              <tr key={r.id}>
                <td className="code">{r.investor_code}</td>
                <td>{r.name}</td>
                <td>{r.phone}</td>
                <td>{r.email}</td>
                <td>{r.bank_name}</td>
                <td>{r.account_no}</td>
                <td>{r.ifsc_no}</td>
                <td className="num">₹{fmt(r.contributed)}</td>
                <td className="num">₹{fmt(r.returnsPaid)}</td>
                <td className="num" style={{ fontWeight: 600, color: '#0F172A' }}>₹{fmt(r.netBalance)}</td>
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

      <div className="fin-filterbar" style={{ marginTop: 18 }}>
        <div className="fin-filterbar__label" style={{ marginBottom: 0 }}>{t('fin.transaction_history_label')}</div>
        <button type="button" className="fin-btn-primary" style={{ background: '#475569', marginLeft: 'auto' }} onClick={() => setShowPreviewTxns(true)} disabled={txnRows.length === 0}>
          <FileDown style={{ width: 14, height: 14 }} />
          <span>{t('fin.export_pdf_btn')}</span>
        </button>
      </div>

      <div className="fin-tablewrap">
        <table className="fin-grid-table">
          <thead>
            <tr>
              <th>{t('col.date')}</th>
              <th>{t('fin.investor_name_label')}</th>
              <th>{t('fin.txn_type_label')}</th>
              <th className="num">{t('col.amount_rs')}</th>
              <th>{t('col.notes')}</th>
            </tr>
          </thead>
          <tbody>
            {txnRows.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px 0', color: '#94A3B8' }}>{t('fin.no_results_hint')}</td></tr>
            ) : txnRows.map(tx => (
              <tr key={tx.id}>
                <td>{tx.date}</td>
                <td>{investorNameMap[tx.investor_id] || '—'}</td>
                <td><span className="fin-tag">{TXN_TYPE_KEY[tx.type] ? t(TXN_TYPE_KEY[tx.type]) : tx.type}</span></td>
                <td className="num">₹{fmt(tx.amount)}</td>
                <td>{tx.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPreview && <ReportPreviewModal {...previewProps} onClose={() => setShowPreview(false)} />}
      {showPreviewTxns && <ReportPreviewModal {...previewPropsTxns} onClose={() => setShowPreviewTxns(false)} />}
    </div>
  );
}
