import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, Download, Printer, FileDown } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { computeAccountBalances, computeProfitAndLoss, filterEntriesInRange, filterEntriesByBranch } from '../utils/accounting';
import { exportToCsv } from '../utils/csvExport';
import ReportPreviewModal from '../components/ReportPreviewModal';
import DropdownSelect from '../components/DropdownSelect';
import SharedDatePicker from '../components/common/SharedDatePicker';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function FinancialStatementsReportView({ chartOfAccounts = [], journalEntries = [], branchesList = [], tenant, user, selectedBranch = 'ALL' }) {
  const { t } = useLanguage();
  const [branch, setBranch] = useState(() => (selectedBranch && selectedBranch !== 'ALL' ? selectedBranch : 'ALL'));
  useEffect(() => {
    setBranch(selectedBranch && selectedBranch !== 'ALL' ? selectedBranch : 'ALL');
  }, [selectedBranch]);
  const hasBranchSelected = branch !== '';
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [applied, setApplied] = useState({ from: '', to: '' });

  const handleSearch = (e) => {
    e.preventDefault();
    setApplied({ from: fromDate, to: toDate });
  };

  const byBranch = useMemo(() => filterEntriesByBranch(journalEntries, branch), [journalEntries, branch]);
  const scopedEntries = useMemo(() => filterEntriesInRange(byBranch, applied.from || null, applied.to || null), [byBranch, applied]);
  const balances = useMemo(() => computeAccountBalances(chartOfAccounts, scopedEntries), [chartOfAccounts, scopedEntries]);
  const pnl = useMemo(() => computeProfitAndLoss(balances), [balances]);

  const accountNameMap = useMemo(() => {
    const m = {};
    chartOfAccounts.forEach(a => { m[a.code] = a.name_key ? t(a.name_key) : a.name; });
    return m;
  }, [chartOfAccounts, t]);

  const transactionRows = useMemo(() => scopedEntries.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)), [scopedEntries]);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const isProfit = pnl.netProfit >= 0;

  const PNL_COLUMNS = [{ label: t('col.type') }, { label: t('fin.col_account_name') }, { label: t('col.amount_rs'), align: 'right' }];
  const buildPnlRows = () => [
    ...pnl.revenueLines.map(a => [t('fin.pnl_revenue_section'), a.name_key ? t(a.name_key) : a.name, fmt(a.balance)]),
    ...pnl.expenseLines.map(a => [t('fin.pnl_expense_section'), a.name_key ? t(a.name_key) : a.name, fmt(a.balance)])
  ];

  const TXN_COLUMNS = [
    { label: t('col.date') }, { label: t('col.date_time') }, { label: t('col.voucher_no') }, { label: t('fin.voucher_type_col') },
    { label: t('col.transaction_description') }, { label: t('fin.branch_label') }, { label: t('fin.col_debit'), align: 'right' },
    { label: t('fin.col_credit'), align: 'right' }, { label: t('fin.created_by_label') }
  ];

  const lineTotal = (je, side) => je.lines.reduce((s, l) => s + (l[side] || 0), 0);

  const buildTxnRows = () => transactionRows.map(je => [
    je.date, fmtTime(je.created_at), je.id, je.ref_type, je.narration, je.branch || '—',
    fmt(lineTotal(je, 'debit')), fmt(lineTotal(je, 'credit')), je.created_by || '—'
  ]);

  const handleExport = () => {
    const rows = [
      ...buildPnlRows(),
      [t('fin.pnl_net_profit'), '', fmt(pnl.netProfit)]
    ];
    exportToCsv(`financial-statement-${branch || 'none'}.csv`, PNL_COLUMNS.map(c => c.label), rows);
  };

  const [showPreview, setShowPreview] = useState(false);
  const previewProps = {
    company: tenant,
    reportTitle: t('fin.financial_statements_report_title'),
    reportSubtitle: t('fin.financial_statements_report_subtitle'),
    filters: {
      [t('fin.branch_label')]: branch === 'ALL' ? t('fin.all_branches') : (branch || '—'),
      [t('fin.from_label')]: applied.from || '—',
      [t('fin.to_label')]: applied.to || '—'
    },
    columns: PNL_COLUMNS,
    rows: buildPnlRows(),
    totalsRow: [t('fin.pnl_net_profit'), '', fmt(pnl.netProfit)],
    generatedBy: user?.name
  };

  const [showPreviewTxns, setShowPreviewTxns] = useState(false);
  const previewPropsTxns = {
    company: tenant,
    reportTitle: `${t('fin.financial_statements_report_title')} — ${t('fin.supporting_transactions_label')}`,
    reportSubtitle: t('fin.financial_statements_report_subtitle'),
    filters: {
      [t('fin.branch_label')]: branch === 'ALL' ? t('fin.all_branches') : (branch || '—'),
      [t('fin.from_label')]: applied.from || '—',
      [t('fin.to_label')]: applied.to || '—'
    },
    columns: TXN_COLUMNS,
    rows: buildTxnRows(),
    generatedBy: user?.name
  };

  return (
    <div className="fin-page fin-report-page">
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: 'var(--brand-primary-light, #F0FDF4)', border: '1px solid #BBF7D0', color: 'var(--brand-primary-hover, #15803D)' }}>
              <TrendingUp style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('fin.financial_statements_report_title')}</h1>
              <p className="fin-page-header__subtitle">{t('fin.financial_statements_report_subtitle')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="fin-btn-primary" style={{ background: '#475569' }} onClick={() => setShowPreview(true)} disabled={!hasBranchSelected}>
              <Printer style={{ width: 14, height: 14 }} />
              <span>{t('fin.print_btn')}</span>
            </button>
            <button type="button" className="fin-btn-primary" style={{ background: '#475569' }} onClick={() => setShowPreview(true)} disabled={!hasBranchSelected}>
              <FileDown style={{ width: 14, height: 14 }} />
              <span>{t('fin.export_pdf_btn')}</span>
            </button>
            <button type="button" className="fin-btn-primary" onClick={handleExport} disabled={!hasBranchSelected}>
              <Download style={{ width: 14, height: 14 }} />
              <span>{t('fin.export_csv_btn')}</span>
            </button>
          </div>
        </div>

        <div className="fin-header-stats">
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.pnl_revenue_section')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">{hasBranchSelected ? `₹${fmt(pnl.totalRevenue)}` : '—'}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.pnl_expense_section')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--bad">{hasBranchSelected ? `₹${fmt(pnl.totalExpense)}` : '—'}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.pnl_net_profit')}</span>
            <span className={`fin-header-stat__value ${isProfit ? 'fin-header-stat__value--good' : 'fin-header-stat__value--bad'}`}>
              {hasBranchSelected ? `₹${fmt(pnl.netProfit)}` : '—'}
            </span>
          </div>
        </div>
      </div>

      <form className="fin-filterbar" onSubmit={handleSearch}>
        <div className="fin-field">
          <label>{t('fin.branch_label')}</label>
          <DropdownSelect
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
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
          <label>{t('fin.from_label')}</label>
          <SharedDatePicker
            value={fromDate}
            max={toDate || todayStr()}
            onChange={(e) => setFromDate(e.target.value)}
            buttonStyle={{ height: 36, minWidth: 140 }}
          />
        </div>
        <div className="fin-field">
          <label>{t('fin.to_label')}</label>
          <SharedDatePicker
            value={toDate}
            max={todayStr()}
            onChange={(e) => setToDate(e.target.value)}
            buttonStyle={{ height: 36, minWidth: 140 }}
          />
        </div>
        <button type="submit" className="fin-search-btn">{t('fin.search_btn')}</button>
      </form>

      {!hasBranchSelected && (
        <div className="fin-meta-row">{t('fin.select_branch_hint')}</div>
      )}

      <div className="fin-split">
        <div className="fin-tablewrap">
          <table className="fin-grid-table">
            <thead>
              <tr>
                <th colSpan="2">{t('fin.pnl_revenue_section')}</th>
              </tr>
            </thead>
            <tbody>
              {!hasBranchSelected ? (
                <tr><td colSpan="2" style={{ textAlign: 'center', padding: '30px 0', color: '#94A3B8' }}>{t('fin.select_branch_hint')}</td></tr>
              ) : pnl.revenueLines.length === 0 ? (
                <tr><td colSpan="2" style={{ textAlign: 'center', padding: '30px 0', color: '#94A3B8' }}>{t('fin.no_results_hint')}</td></tr>
              ) : pnl.revenueLines.map(a => (
                <tr key={a.code}>
                  <td>{a.name_key ? t(a.name_key) : a.name}</td>
                  <td className="num">₹{fmt(a.balance)}</td>
                </tr>
              ))}
              {hasBranchSelected && (
                <tr className="fin-row-total">
                  <td>{t('fin.total_row')}</td>
                  <td className="num">₹{fmt(pnl.totalRevenue)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="fin-tablewrap">
          <table className="fin-grid-table">
            <thead>
              <tr>
                <th colSpan="2">{t('fin.pnl_expense_section')}</th>
              </tr>
            </thead>
            <tbody>
              {!hasBranchSelected ? (
                <tr><td colSpan="2" style={{ textAlign: 'center', padding: '30px 0', color: '#94A3B8' }}>{t('fin.select_branch_hint')}</td></tr>
              ) : pnl.expenseLines.length === 0 ? (
                <tr><td colSpan="2" style={{ textAlign: 'center', padding: '30px 0', color: '#94A3B8' }}>{t('fin.no_results_hint')}</td></tr>
              ) : pnl.expenseLines.map(a => (
                <tr key={a.code}>
                  <td>{a.name_key ? t(a.name_key) : a.name}</td>
                  <td className="num">₹{fmt(a.balance)}</td>
                </tr>
              ))}
              {hasBranchSelected && (
                <tr className="fin-row-total">
                  <td>{t('fin.total_row')}</td>
                  <td className="num">₹{fmt(pnl.totalExpense)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasBranchSelected && (
        <div className={`fin-net-bar ${isProfit ? 'fin-net-bar--profit' : 'fin-net-bar--loss'}`}>
          <span className="fin-net-bar__label">{t('fin.pnl_net_profit')}</span>
          <span className={`fin-net-bar__value ${isProfit ? 'fin-net-bar__value--profit' : 'fin-net-bar__value--loss'}`}>₹{fmt(pnl.netProfit)}</span>
        </div>
      )}

      {hasBranchSelected && (
        <>
          <div className="fin-filterbar" style={{ marginTop: 18 }}>
            <div className="fin-filterbar__label" style={{ marginBottom: 0 }}>{t('fin.supporting_transactions_label')}</div>
            <button type="button" className="fin-btn-primary" style={{ background: '#475569', marginLeft: 'auto' }} onClick={() => setShowPreviewTxns(true)} disabled={transactionRows.length === 0}>
              <FileDown style={{ width: 14, height: 14 }} />
              <span>{t('fin.export_pdf_btn')}</span>
            </button>
          </div>

          <div className="fin-tablewrap">
            <table className="fin-grid-table">
              <thead>
                <tr>
                  <th>{t('col.date')}</th>
                  <th>{t('col.date_time')}</th>
                  <th>{t('col.voucher_no')}</th>
                  <th>{t('fin.voucher_type_col')}</th>
                  <th>{t('col.transaction_description')}</th>
                  <th>{t('fin.branch_label')}</th>
                  <th className="num">{t('fin.col_debit')}</th>
                  <th className="num">{t('fin.col_credit')}</th>
                  <th>{t('fin.created_by_label')}</th>
                </tr>
              </thead>
              <tbody>
                {transactionRows.length === 0 ? (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '30px 0', color: '#94A3B8' }}>{t('fin.no_results_hint')}</td></tr>
                ) : transactionRows.map(je => (
                  <tr key={je.id}>
                    <td>{je.date}</td>
                    <td>{fmtTime(je.created_at)}</td>
                    <td className="code">{je.id}</td>
                    <td><span className="fin-tag">{je.ref_type}</span></td>
                    <td>{je.narration}</td>
                    <td>{je.branch || '—'}</td>
                    <td className="num">₹{fmt(lineTotal(je, 'debit'))}</td>
                    <td className="num">₹{fmt(lineTotal(je, 'credit'))}</td>
                    <td>{je.created_by || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showPreview && <ReportPreviewModal {...previewProps} onClose={() => setShowPreview(false)} />}
      {showPreviewTxns && <ReportPreviewModal {...previewPropsTxns} onClose={() => setShowPreviewTxns(false)} />}
    </div>
  );
}
