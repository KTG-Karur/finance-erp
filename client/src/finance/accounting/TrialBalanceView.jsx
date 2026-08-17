import React, { useState, useMemo, useEffect } from 'react';
import { Scale, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { computeAccountBalances, computeTrialBalance, filterEntriesUpTo, filterEntriesByBranch } from '../../utils/accounting';
import DropdownSelect from '../../components/DropdownSelect';
import SharedDatePicker from '../../components/common/SharedDatePicker';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Plain-language label + color per raw account type, so the table never shows
// jargon like ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE directly to staff.
const ACCOUNT_TYPE_META = {
  ASSET: { key: 'fin.acct_type_asset', bg: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary-hover, #0E5327)', border: 'var(--brand-primary-border, #A3F5C1)' },
  LIABILITY: { key: 'fin.acct_type_liability', bg: 'var(--color-danger-light, #FEF2F2)', color: 'var(--color-danger-hover, #B91C1C)', border: 'var(--color-danger-border, #FECACA)' },
  EQUITY: { key: 'fin.acct_type_equity', bg: 'var(--color-info-light, #EFF6FF)', color: '#1D4ED8', border: 'var(--color-info-border, #BFDBFE)' },
  REVENUE: { key: 'fin.acct_type_revenue', bg: 'var(--brand-primary-light, #F0FDF4)', color: 'var(--brand-primary-hover, #15803D)', border: '#BBF7D0' },
  EXPENSE: { key: 'fin.acct_type_expense', bg: '#FFF7ED', color: '#C2410C', border: '#FFEDD5' }
};

export default function TrialBalanceView({ chartOfAccounts = [], journalEntries = [], branchesList = [], selectedBranch = 'ALL' }) {
  const { t } = useLanguage();
  const [asOfDate, setAsOfDate] = useState(todayStr());
  const [applied, setApplied] = useState(todayStr());
  const [branch, setBranch] = useState(() => (selectedBranch && selectedBranch !== 'ALL' ? selectedBranch : 'ALL'));
  useEffect(() => {
    setBranch(selectedBranch && selectedBranch !== 'ALL' ? selectedBranch : 'ALL');
  }, [selectedBranch]);
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
  const difference = Math.abs(totals.debit - totals.credit);
  const isBalanced = Math.round(difference * 100) === 0;

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  return (
    <div className="fin-page">
      {/* ── Executive Header: Left Title/Subtitle & Right Financial Info Summary ── */}
      <div className="fin-header-card" style={{ background: '#FFFFFF', border: `1px solid ${isBalanced ? '#E2E8F0' : '#FECACA'}`, padding: '20px 24px', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          {/* Left Title & Description */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: isBalanced ? 'var(--brand-primary-light, #F0FDF4)' : '#FEF2F2', border: `1px solid ${isBalanced ? '#BBF7D0' : '#FECACA'}`, color: isBalanced ? 'var(--brand-primary-hover, #15803D)' : '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isBalanced ? <Scale style={{ width: 20, height: 20 }} /> : <AlertTriangle style={{ width: 20, height: 20 }} />}
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
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0F172A' }}>₹{fmt(totals.debit)}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748B', textTransform: 'uppercase' }}>Total Credit</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0F172A' }}>₹{fmt(totals.credit)}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748B', textTransform: 'uppercase' }}>Reconciliation Status</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isBalanced ? 'var(--brand-primary-hover, #0E5327)' : '#DC2626' }}>
                {isBalanced ? t('fin.balanced_badge') : `Mismatch Off by ₹${fmt(difference)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mismatch Highlight Warning Banner ── */}
      {!isBalanced && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          margin: '12px 0',
          borderRadius: 8,
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#991B1B',
          fontSize: '0.82rem',
          fontWeight: 600,
          boxShadow: '0 2px 4px rgba(220, 38, 38, 0.08)'
        }}>
          <AlertTriangle style={{ width: 18, height: 18, flexShrink: 0, color: '#DC2626' }} />
          <span>
            <strong>Trial Balance Mismatch Detected ({branch === 'ALL' ? 'All Branches' : `Branch: ${branch}`}):</strong> Total Debit (₹{fmt(totals.debit)}) does not match Total Credit (₹{fmt(totals.credit)}). Discrepancy amount: <strong>₹{fmt(difference)}</strong>.
          </span>
        </div>
      )}

      {/* ── Search & Filter Controls Bar ── */}
      <form className="fin-filterbar" onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
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
            <label>{t('fin.as_of_label')}</label>
            <SharedDatePicker
              value={asOfDate}
              max={todayStr()}
              onChange={(e) => setAsOfDate(e.target.value)}
              buttonStyle={{ height: 36, minWidth: 140 }}
            />
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
              <th>Category</th>
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
              displayTrialBalance.map(row => {
                const typeMeta = ACCOUNT_TYPE_META[row.type];
                return (
                  <tr key={row.code}>
                    <td style={{ fontWeight: 500, color: '#0F172A' }}>{row.name_key ? t(row.name_key) : row.name}</td>
                    <td>
                      {typeMeta ? (
                        <span className="fin-tag" style={{ background: typeMeta.bg, color: typeMeta.color, border: `1px solid ${typeMeta.border}` }}>
                          {t(typeMeta.key)}
                        </span>
                      ) : row.type}
                    </td>
                    <td className="num" style={{ fontWeight: row.debit ? 500 : 400 }}>{row.debit ? `₹${fmt(row.debit)}` : '—'}</td>
                    <td className="num" style={{ fontWeight: row.credit ? 500 : 400 }}>{row.credit ? `₹${fmt(row.credit)}` : '—'}</td>
                  </tr>
                );
              })
            )}
            <tr className="fin-row-total" style={{ background: isBalanced ? undefined : '#FEF2F2', borderTop: isBalanced ? undefined : '2px solid #FCA5A5' }}>
              <td colSpan="2" style={{ fontWeight: 600, color: isBalanced ? undefined : '#991B1B' }}>
                {t('fin.total_row')} {!isBalanced && '(MISMATCH DETECTED)'}
              </td>
              <td className="num" style={{ fontWeight: 700, color: isBalanced ? '#0F172A' : '#DC2626' }}>₹{fmt(totals.debit)}</td>
              <td className="num" style={{ fontWeight: 700, color: isBalanced ? '#0F172A' : '#DC2626' }}>₹{fmt(totals.credit)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
