import React, { useState, useMemo, useEffect } from 'react';
import { Layers, Search, ChevronLeft, ChevronRight, Plus, X, Clock } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { ACCOUNT_TYPES, computeLedgerFolio, filterEntriesByBranch } from '../../utils/accounting';
import api from '../../api/client';
import SharedDropdown from '../../components/common/SharedDropdown';
import SharedDatePicker from '../../components/common/SharedDatePicker';

function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return '—';
  const cleanStr = String(dateStr).slice(0, 10);
  const parts = cleanStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function todayStr() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function monthStartStr() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

export default function GeneralLedgerView({
  chartOfAccounts = [],
  journalEntries = [],
  branchesList = [],
  selectedBranch = 'ALL',
  onCreateOpeningBalance,
  tenant
}) {
  const { t } = useLanguage();
  const accountName = (acc) => (acc?.name_key ? t(acc.name_key) : acc?.name);

  const [accountCode, setAccountCode] = useState(() => chartOfAccounts[0]?.code || '1001');
  const [fromDate, setFromDate] = useState(monthStartStr());
  const [toDate, setToDate] = useState(todayStr());
  const [applied, setApplied] = useState({
    account: chartOfAccounts[0]?.code || '1001',
    from: monthStartStr(),
    to: todayStr()
  });
  const [datePreset, setDatePreset] = useState('MONTH');
  const [branch, setBranch] = useState(() => (selectedBranch && selectedBranch !== 'ALL' ? selectedBranch : 'ALL'));

  useEffect(() => {
    setBranch(selectedBranch && selectedBranch !== 'ALL' ? selectedBranch : 'ALL');
  }, [selectedBranch]);

  useEffect(() => {
    if (chartOfAccounts.length > 0) {
      if (!accountCode || !chartOfAccounts.some(a => a.code === accountCode)) {
        const firstCode = chartOfAccounts[0].code;
        setAccountCode(firstCode);
        setApplied(prev => ({ ...prev, account: firstCode }));
      }
    }
  }, [chartOfAccounts, accountCode]);

  const [instantSearch, setInstantSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    setCurrentPage(1);
    const today = todayStr();
    if (preset === 'TODAY') {
      setFromDate(today);
      setToDate(today);
      setApplied(prev => ({ ...prev, from: today, to: today }));
    } else if (preset === 'MONTH') {
      const start = monthStartStr();
      setFromDate(start);
      setToDate(today);
      setApplied(prev => ({ ...prev, from: start, to: today }));
    } else if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
      setApplied(prev => ({ ...prev, from: '', to: '' }));
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setApplied({ account: accountCode, from: fromDate, to: toDate });
    setCurrentPage(1);
  };

  const selectedAccount = useMemo(() => {
    return chartOfAccounts.find(a => a.code === accountCode) || chartOfAccounts[0] || null;
  }, [chartOfAccounts, accountCode]);

  // Branch-scoped journal entries
  const byBranch = useMemo(() => {
    return filterEntriesByBranch(journalEntries, branch);
  }, [journalEntries, branch]);

  // Calculate opening balance before `applied.from` and filter scoped period entries
  const { openingBalance, periodEntries } = useMemo(() => {
    if (!selectedAccount) return { openingBalance: 0, periodEntries: [] };
    const normalSide = ACCOUNT_TYPES[selectedAccount.type] || 'DEBIT';

    let ob = 0;
    const scoped = [];

    byBranch.forEach(je => {
      const vDate = je.date || je.created_at?.slice(0, 10) || '';
      const isBefore = applied.from && vDate < applied.from;
      const isAfter = applied.to && vDate > applied.to;

      if (isBefore) {
        (je.lines || []).forEach(l => {
          if (l.account_code === selectedAccount.code) {
            const dr = Number(l.debit) || 0;
            const cr = Number(l.credit) || 0;
            const signed = normalSide === 'DEBIT' ? (dr - cr) : (cr - dr);
            ob += signed;
          }
        });
      } else if (!isAfter) {
        scoped.push(je);
      }
    });

    return { openingBalance: ob, periodEntries: scoped };
  }, [byBranch, selectedAccount, applied.from, applied.to]);

  // Compute ledger folio with running balance
  const { fullFolioWithOB, periodFolioRows, totalDebit, totalCredit, closingBalance } = useMemo(() => {
    if (!selectedAccount) return { fullFolioWithOB: [], periodFolioRows: [], totalDebit: 0, totalCredit: 0, closingBalance: 0 };
    const res = computeLedgerFolio(selectedAccount, periodEntries, openingBalance);

    const rows = res.rows;
    const totDr = rows.reduce((s, r) => s + (r.debit || 0), 0);
    const totCr = rows.reduce((s, r) => s + (r.credit || 0), 0);

    const obRow = applied.from ? [{
      id: `OB-${selectedAccount.code}`,
      date: applied.from,
      narration: 'Opening Balance b/f',
      ref_type: 'OPENING',
      branch: branch === 'ALL' ? 'All Branches' : branch,
      voucher_type: null,
      debit: null,
      credit: null,
      balance: openingBalance,
      isOpeningBalance: true
    }] : [];

    return {
      fullFolioWithOB: [...obRow, ...rows],
      periodFolioRows: rows,
      totalDebit: totDr,
      totalCredit: totCr,
      closingBalance: res.closingBalance
    };
  }, [selectedAccount, periodEntries, openingBalance, applied.from, branch]);

  // Instant text filter (preserves opening balance row if present)
  const visibleFolio = useMemo(() => {
    const q = instantSearch.toLowerCase().trim();
    if (!q) return fullFolioWithOB;
    return fullFolioWithOB.filter(row => {
      if (row.isOpeningBalance) return true;
      return (
        (row.narration && row.narration.toLowerCase().includes(q)) ||
        (row.ref_type && row.ref_type.toLowerCase().includes(q)) ||
        (row.branch && row.branch.toLowerCase().includes(q))
      );
    });
  }, [fullFolioWithOB, instantSearch]);

  const totalPages = Math.ceil(visibleFolio.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedFolio = visibleFolio.slice(startIndex, startIndex + pageSize);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const normalSide = selectedAccount ? (ACCOUNT_TYPES[selectedAccount.type] || 'DEBIT') : 'DEBIT';
  const fmtSigned = (n) => {
    const num = Number(n || 0);
    return `₹${fmt(Math.abs(num))}`;
  };

  return (
    <div className="fin-page general-ledger-page">
      {/* ── Standard ERP Header Card ──────────────────────────────── */}
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)' }}>
              <Layers style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('fin.gl_title')}</h1>
              <p className="fin-page-header__subtitle">{t('fin.gl_subtitle')}</p>
            </div>
          </div>
        </div>

        {/* ── Header Stat Badges ───────────────────────────────────── */}
        <div className="fin-header-stats">
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.account_label')}:</span>
            <span className="fin-header-stat__value" style={{ fontWeight: 600 }}>
              {selectedAccount ? `${accountName(selectedAccount)} (${selectedAccount.code})` : '—'}
            </span>
          </div>
          {applied.from && (
            <div className="fin-header-stat">
              <span className="fin-header-stat__label">Opening Balance:</span>
              <span className="fin-header-stat__value" style={{ fontWeight: 600, color: openingBalance < 0 ? 'var(--color-danger, #DC2626)' : '#0F172A' }}>
                {fmtSigned(openingBalance)}
              </span>
            </div>
          )}
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.col_debit')}:</span>
            <span className="fin-header-stat__value">₹{fmt(totalDebit)}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.col_credit')}:</span>
            <span className="fin-header-stat__value">₹{fmt(totalCredit)}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.closing_balance')}:</span>
            <span className="fin-header-stat__value" style={{ fontWeight: 700, color: closingBalance < 0 ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)' }}>
              {fmtSigned(closingBalance)}
            </span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.results_count')}:</span>
            <span className="fin-header-stat__value">{periodFolioRows.length} entries</span>
          </div>
        </div>
      </div>

      {/* ── Standard ERP Filter Bar ───────────────────────────────── */}
      <form className="fin-filterbar" onSubmit={handleSearch}>
        <div className="fin-field fin-field--account">
          <label>{t('fin.account_label')}</label>
          <SharedDropdown
            value={accountCode}
            onChange={(e) => {
              const newCode = e.target.value;
              setAccountCode(newCode);
              setApplied(prev => ({ ...prev, account: newCode }));
              setCurrentPage(1);
            }}
            searchable
            buttonStyle={{ height: 38, width: '100%' }}
            options={chartOfAccounts.map(acc => ({
              value: acc.code,
              label: `${accountName(acc)} (${acc.code})`
            }))}
          />
        </div>

        <div className="fin-field fin-field--branch">
          <label>{t('fin.branch_label')}</label>
          <SharedDropdown
            value={branch}
            onChange={(e) => { setBranch(e.target.value); setCurrentPage(1); }}
            disabled={Boolean(selectedBranch && selectedBranch !== 'ALL')}
            buttonStyle={{ height: 38, width: '100%' }}
            options={[
              { value: 'ALL', label: t('fin.all_branches') || 'All Branches' },
              ...branchesList.map(b => ({ value: b.name, label: b.name }))
            ]}
          />
        </div>

        <div className="fin-field fin-field--date">
          <label>{t('fin.from_label')}</label>
          <SharedDatePicker
            value={fromDate}
            max={toDate || todayStr()}
            onChange={(e) => { setFromDate(e.target.value); setDatePreset('CUSTOM'); }}
            buttonStyle={{ height: 38, width: '100%' }}
          />
        </div>

        <div className="fin-field fin-field--date">
          <label>{t('fin.to_label')}</label>
          <SharedDatePicker
            value={toDate}
            max={todayStr()}
            onChange={(e) => { setToDate(e.target.value); setDatePreset('CUSTOM'); }}
            buttonStyle={{ height: 38, width: '100%' }}
          />
        </div>

        <div className="fin-field fin-field--search">
          <label>{t('fin.find_transactions_placeholder')}</label>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 9, top: 12, width: 14, height: 14, color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              className="fin-input"
              style={{ width: '100%', height: 38, paddingLeft: 30, boxSizing: 'border-box' }}
              type="text"
              placeholder={t('fin.find_transactions_placeholder')}
              value={instantSearch}
              onChange={(e) => { setInstantSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        <button type="submit" className="fin-search-btn" style={{ height: 38 }}>{t('fin.search_btn')}</button>

        {/* Quick Date Presets */}
        <div className="fin-quickrow">
          <span className="fin-quickrow__label">{t('fin.quick_label') || 'Quick:'}</span>
          <button
            type="button"
            className={`fin-quick-pill ${datePreset === 'ALL' ? 'fin-quick-pill--active' : ''}`}
            onClick={() => handleDatePresetChange('ALL')}
          >
            All Time
          </button>
          <button
            type="button"
            className={`fin-quick-pill ${datePreset === 'TODAY' ? 'fin-quick-pill--active' : ''}`}
            onClick={() => handleDatePresetChange('TODAY')}
          >
            Today
          </button>
          <button
            type="button"
            className={`fin-quick-pill ${datePreset === 'MONTH' ? 'fin-quick-pill--active' : ''}`}
            onClick={() => handleDatePresetChange('MONTH')}
          >
            This Month
          </button>
        </div>
      </form>

      {/* ── Table Container ───────────────────────────────────────── */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
        <div className="fin-table-scroll">
          <table className="fin-table" style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                <th style={{ textAlign: 'left', width: 130, padding: '10px 12px' }}>{t('col.date_time') || 'Date & Time'}</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>{t('col.transaction_description')}</th>
                <th style={{ textAlign: 'center', width: 110, padding: '10px 12px' }}>{t('fin.voucher_type_col')}</th>
                <th style={{ textAlign: 'left', width: 110, padding: '10px 12px' }}>{t('fin.branch_label')}</th>
                <th style={{ textAlign: 'right', width: 110, padding: '10px 12px' }}>{t('fin.col_debit')}</th>
                <th style={{ textAlign: 'right', width: 110, padding: '10px 12px' }}>{t('fin.col_credit')}</th>
                <th style={{ textAlign: 'right', width: 130, padding: '10px 14px' }}>{t('col.balance')}</th>
              </tr>
            </thead>
            <tbody>
              {pagedFolio.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
                    {t('fin.no_results_hint')}
                  </td>
                </tr>
              ) : pagedFolio.map(row => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    background: row.isOpeningBalance ? '#F8FAFC' : '#FFFFFF',
                    fontStyle: row.isOpeningBalance ? 'italic' : 'normal'
                  }}
                >
                  <td style={{ color: '#0F172A', padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600 }}>{formatDateDDMMYYYY(row.date)}</div>
                    {row.created_at && (
                      <div style={{ fontSize: '0.68rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                        <Clock style={{ width: 10, height: 10, color: '#94A3B8' }} />
                        <span>{fmtTime(row.created_at)}</span>
                      </div>
                    )}
                  </td>
                  <td style={{ color: row.isOpeningBalance ? '#64748B' : '#0F172A', fontWeight: row.isOpeningBalance ? 600 : 400, padding: '10px 12px' }}>
                    {row.narration}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                    <span style={{
                      background: row.isOpeningBalance ? '#E2E8F0' : '#F1F5F9',
                      color: '#334155',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: '0.7rem',
                      fontWeight: 600
                    }}>
                      {row.ref_type || '—'}
                    </span>
                  </td>
                  <td style={{ color: '#64748B', fontSize: '0.78rem', padding: '10px 12px' }}>{row.branch || '—'}</td>
                  <td style={{ textAlign: 'right', color: '#0F172A', fontWeight: 600, padding: '10px 12px' }}>
                    {row.debit ? `₹${fmt(row.debit)}` : '—'}
                  </td>
                  <td style={{ textAlign: 'right', color: '#0F172A', fontWeight: 600, padding: '10px 12px' }}>
                    {row.credit ? `₹${fmt(row.credit)}` : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: row.balance < 0 ? 'var(--color-danger, #DC2626)' : '#0F172A', fontSize: '0.84rem', padding: '10px 14px' }}>
                    {fmtSigned(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
            {periodFolioRows.length > 0 && (
              <tfoot>
                <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0', fontWeight: 700 }}>
                  <td colSpan="4" style={{ textAlign: 'right', padding: '12px 14px', color: '#0F172A', fontSize: '0.82rem' }}>
                    Period Totals / Closing Balance:
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 12px', color: 'var(--brand-primary, #15803D)', fontSize: '0.86rem' }}>
                    ₹{fmt(totalDebit)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 12px', color: 'var(--color-danger, #DC2626)', fontSize: '0.86rem' }}>
                    ₹{fmt(totalCredit)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 14px', color: closingBalance < 0 ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)', fontSize: '0.94rem' }}>
                    {fmtSigned(closingBalance)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* ── Table Pagination ──────────────────────────────────────── */}
        <div className="fin-table-pagination">
          <div className="fin-table-pagination__info" style={{ fontSize: '0.74rem', color: '#64748B' }}>
            Showing <strong>{visibleFolio.length === 0 ? 0 : startIndex + 1}</strong> to <strong>{Math.min(startIndex + pageSize, visibleFolio.length)}</strong> of <strong>{visibleFolio.length}</strong> entries
          </div>
          <div className="fin-table-pagination__controls" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, padding: '5px 12px', fontSize: '0.74rem', cursor: safePage === 1 ? 'not-allowed' : 'pointer', opacity: safePage === 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <ChevronLeft style={{ width: 14, height: 14 }} />
              <span>Prev</span>
            </button>
            <span style={{ fontSize: '0.74rem', color: '#475569', padding: '0 6px', fontWeight: 600 }}>
              Page {safePage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, padding: '5px 12px', fontSize: '0.74rem', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', opacity: safePage === totalPages ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <span>Next</span>
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
