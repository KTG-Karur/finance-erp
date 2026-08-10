import React, { useState, useMemo } from 'react';
import { Layers, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { computeAccountBalances, computeLedgerFolio, filterEntriesInRange, filterEntriesByBranch } from '../../utils/accounting';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartStr() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
}

// One account at a time: pick it, narrow the date range if needed, Search — see
// every transaction on that account in order, with a running balance.
export default function GeneralLedgerView({ chartOfAccounts = [], journalEntries = [], branchesList = [] }) {
  const { t } = useLanguage();
  const balancesAll = useMemo(() => computeAccountBalances(chartOfAccounts, journalEntries), [chartOfAccounts, journalEntries]);
  const accountName = (acc) => (acc?.name_key ? t(acc.name_key) : acc?.name);

  const [accountCode, setAccountCode] = useState(chartOfAccounts[0]?.code || '');
  const [fromDate, setFromDate] = useState(monthStartStr());
  const [toDate, setToDate] = useState(todayStr());
  const [applied, setApplied] = useState({ account: chartOfAccounts[0]?.code || '', from: monthStartStr(), to: todayStr() });
  const [branch, setBranch] = useState('');
  const [instantSearch, setInstantSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const handleSearch = (e) => {
    e.preventDefault();
    setApplied({ account: accountCode, from: fromDate, to: toDate });
  };

  const hasBranchSelected = branch !== '';
  const selectedAccount = balancesAll.find(a => a.code === applied.account) || null;
  const byBranch = useMemo(() => filterEntriesByBranch(journalEntries, branch), [journalEntries, branch]);
  const scopedEntries = useMemo(() => filterEntriesInRange(byBranch, applied.from || null, applied.to || null), [byBranch, applied.from, applied.to]);
  const folio = useMemo(
    () => (selectedAccount ? computeLedgerFolio(selectedAccount, scopedEntries) : []),
    [selectedAccount, scopedEntries]
  );

  const visibleFolio = folio.filter(row => {
    const q = instantSearch.toLowerCase().trim();
    return !q || row.narration.toLowerCase().includes(q);
  }).slice().reverse();

  const totalPages = Math.ceil(visibleFolio.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedFolio = visibleFolio.slice(startIndex, startIndex + pageSize);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const fmtSigned = n => (n < 0 ? `-₹${fmt(Math.abs(n))}` : `₹${fmt(n)}`);
  const totalDebit = folio.reduce((s, r) => s + (r.debit || 0), 0);
  const totalCredit = folio.reduce((s, r) => s + (r.credit || 0), 0);

  return (
    <div className="fin-page">
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669' }}>
              <Layers style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('fin.gl_title')}</h1>
              <p className="fin-page-header__subtitle">{t('fin.gl_subtitle')}</p>
            </div>
          </div>
        </div>

        <div className="fin-header-stats">
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.account_label')}</span>
            <span className="fin-header-stat__value">{selectedAccount ? accountName(selectedAccount) : '—'}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.col_debit')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">₹{fmt(totalDebit)}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.col_credit')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--bad">₹{fmt(totalCredit)}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.closing_balance')}</span>
            <span className="fin-header-stat__value">{hasBranchSelected && selectedAccount ? fmtSigned(selectedAccount.balance) : '—'}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.results_count')}</span>
            <span className="fin-header-stat__value">{folio.length}</span>
          </div>
        </div>
      </div>

      <form className="fin-filterbar" onSubmit={handleSearch}>
        <div className="fin-field" style={{ minWidth: 220 }}>
          <label>{t('fin.account_label')}</label>
          <select className="fin-select" value={accountCode} onChange={(e) => { setAccountCode(e.target.value); setCurrentPage(1); }}>
            {chartOfAccounts.map(acc => (
              <option key={acc.code} value={acc.code}>{accountName(acc)}</option>
            ))}
          </select>
        </div>

        <div className="fin-field">
          <label>{t('fin.branch_label')}</label>
          <select className="fin-select" value={branch} onChange={(e) => { setBranch(e.target.value); setCurrentPage(1); }}>
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
        <div className="fin-field" style={{ flex: '1 1 200px', minWidth: 180 }}>
          <label>{t('fin.find_transactions_placeholder')}</label>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 9, top: 9, width: 13, height: 13, color: '#94A3B8' }} />
            <input
              className="fin-input"
              style={{ paddingLeft: 28, width: '100%', boxSizing: 'border-box' }}
              type="text"
              placeholder={t('fin.find_transactions_placeholder')}
              value={instantSearch}
              onChange={(e) => { setInstantSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>
        <button type="submit" className="fin-search-btn">{t('fin.search_btn')}</button>
      </form>

      <div className="fin-tablewrap">
        <table className="fin-grid-table">
          <thead>
            <tr>
              <th>{t('col.date')}</th>
              <th>{t('col.transaction_description')}</th>
              <th>{t('fin.voucher_type_col')}</th>
              <th>{t('fin.branch_label')}</th>
              <th className="num">{t('fin.col_debit')}</th>
              <th className="num">{t('fin.col_credit')}</th>
              <th className="num">{t('col.balance')}</th>
            </tr>
          </thead>
          <tbody>
            {pagedFolio.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>{hasBranchSelected ? t('fin.no_results_hint') : t('fin.select_branch_hint')}</td></tr>
            ) : pagedFolio.map(row => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td>{row.narration}</td>
                <td><span className="fin-tag">{row.ref_type || '—'}</span></td>
                <td style={{ color: '#64748B', fontSize: '0.78rem' }}>{row.branch || '—'}</td>
                <td className="num">{row.debit ? `₹${fmt(row.debit)}` : '—'}</td>
                <td className="num">{row.credit ? `₹${fmt(row.credit)}` : '—'}</td>
                <td className="num" style={{ fontWeight: 600, color: '#0F172A' }}>{fmtSigned(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-pagination">
          <div className="table-pagination__info">
            Showing <strong>{visibleFolio.length === 0 ? 0 : startIndex + 1}</strong> to <strong>{Math.min(startIndex + pageSize, visibleFolio.length)}</strong> of <strong>{visibleFolio.length}</strong> entries
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
    </div>
  );
}
