import React, { useState, useMemo } from 'react';
import { Scale } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { computeAccountBalances, computeTrialBalance, filterEntriesUpTo, filterEntriesByBranch } from '../../utils/accounting';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function TrialBalanceView({ chartOfAccounts = [], journalEntries = [], branchesList = [] }) {
  const { t } = useLanguage();
  const [asOfDate, setAsOfDate] = useState(todayStr());
  const [applied, setApplied] = useState(todayStr());
  const [branch, setBranch] = useState('');
  const [hideZeroBalances, setHideZeroBalances] = useState(true);
  const hasBranchSelected = branch !== '';

  const handleSearch = (e) => {
    e.preventDefault();
    setApplied(asOfDate);
  };

  const byBranch = useMemo(() => filterEntriesByBranch(journalEntries, branch), [journalEntries, branch]);
  const scopedEntries = useMemo(() => filterEntriesUpTo(byBranch, applied), [byBranch, applied]);
  const balances = useMemo(() => computeAccountBalances(chartOfAccounts, scopedEntries), [chartOfAccounts, scopedEntries]);
  const allTrialBalance = useMemo(() => computeTrialBalance(balances), [balances]);

  const displayTrialBalance = useMemo(() => {
    if (!hideZeroBalances) return allTrialBalance;
    return allTrialBalance.filter(r => (r.debit || 0) > 0 || (r.credit || 0) > 0);
  }, [allTrialBalance, hideZeroBalances]);

  const totals = allTrialBalance.reduce((acc, r) => ({ debit: acc.debit + r.debit, credit: acc.credit + r.credit }), { debit: 0, credit: 0 });
  const isBalanced = Math.round((totals.debit - totals.credit) * 100) === 0;

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  return (
    <div className="fin-page">
      {/* ── Executive Header: Left Title/Subtitle & Right Financial Info Summary ── */}
      <div className="fin-header-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '20px 24px', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          {/* Left Title & Description */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scale style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>{t('fin.trial_balance_title')}</h1>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '2px 0 0', fontWeight: 400 }}>{t('fin.trial_balance_subtitle')}</p>
            </div>
          </div>

          {/* Right Executive Financial Info (No Pills) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748B', textTransform: 'uppercase' }}>Total Debit</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#047857' }}>₹{fmt(totals.debit)}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748B', textTransform: 'uppercase' }}>Total Credit</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#B91C1C' }}>₹{fmt(totals.credit)}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748B', textTransform: 'uppercase' }}>Reconciliation Status</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: isBalanced ? '#047857' : '#D97706' }}>
                {isBalanced ? t('fin.balanced_badge') : `Off by ₹${fmt(Math.abs(totals.debit - totals.credit))}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls Bar ── */}
      <form className="fin-filterbar" onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div className="fin-field">
            <label>{t('fin.branch_label')}</label>
            <select className="fin-select" value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">{t('fin.select_branch_placeholder')}</option>
              <option value="ALL">{t('fin.all_branches')}</option>
              {branchesList.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div className="fin-field">
            <label>{t('fin.as_of_label')}</label>
            <input type="date" className="fin-input" value={asOfDate} max={todayStr()} onChange={(e) => setAsOfDate(e.target.value)} />
          </div>
          <button type="submit" className="fin-search-btn" style={{ marginTop: 22 }}>{t('fin.search_btn')}</button>
        </div>

        {/* Hide Zero-Balance Accounts Toggle */}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#475569', cursor: 'pointer', marginTop: 16 }}>
          <input
            type="checkbox"
            checked={hideZeroBalances}
            onChange={(e) => setHideZeroBalances(e.target.checked)}
            style={{ borderRadius: 4, cursor: 'pointer' }}
          />
          <span>Hide zero-balance accounts ({allTrialBalance.length - displayTrialBalance.length} hidden)</span>
        </label>
      </form>

      {!hasBranchSelected && (
        <div className="fin-meta-row" style={{ marginBottom: 12 }}>{t('fin.select_branch_hint')}</div>
      )}

      {/* ── Trial Balance Table (Account Code Removed) ── */}
      <div className="fin-tablewrap">
        <table className="fin-grid-table">
          <thead>
            <tr>
              <th>{t('fin.col_account_name')}</th>
              <th>Category / Account Type</th>
              <th className="num">{t('fin.col_debit')} (₹)</th>
              <th className="num">{t('fin.col_credit')} (₹)</th>
            </tr>
          </thead>
          <tbody>
            {displayTrialBalance.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '36px 0', color: '#94A3B8' }}>
                  No active account balances found for the selected branch & date.
                </td>
              </tr>
            ) : (
              displayTrialBalance.map(row => (
                <tr key={row.code}>
                  <td style={{ fontWeight: 500, color: '#0F172A' }}>{row.name_key ? t(row.name_key) : row.name}</td>
                  <td style={{ color: '#64748B', fontSize: '0.78rem', fontWeight: 400 }}>{row.type}</td>
                  <td className="num" style={{ fontWeight: row.debit ? 500 : 400 }}>{row.debit ? `₹${fmt(row.debit)}` : '—'}</td>
                  <td className="num" style={{ fontWeight: row.credit ? 500 : 400 }}>{row.credit ? `₹${fmt(row.credit)}` : '—'}</td>
                </tr>
              ))
            )}
            <tr className="fin-row-total">
              <td colSpan="2" style={{ fontWeight: 600 }}>{t('fin.total_row')}</td>
              <td className="num" style={{ fontWeight: 600, color: '#047857' }}>₹{fmt(totals.debit)}</td>
              <td className="num" style={{ fontWeight: 600, color: '#B91C1C' }}>₹{fmt(totals.credit)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
