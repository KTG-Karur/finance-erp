import React, { useState, useMemo, useEffect } from 'react';
import { CreditCard, Search, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { filterEntriesInRange, filterEntriesByBranch, isAutoVoucher } from '../../utils/accounting';
import VoucherReceiptModal from '../../components/VoucherReceiptModal';
import SharedDropdown from '../../components/common/SharedDropdown';
import SharedDatePicker from '../../components/common/SharedDatePicker';

const REF_TYPE_MAP = {
  COLLECTION: 'Collection Receipt',
  COLLECTION_REVERSAL: 'Collection Reversal',
  DISBURSAL: 'Loan Disbursal',
  EXPENSE: 'Expense Payment',
  CAPITAL: 'Investor Capital',
  FD_BOOKING: 'FD Booking',
  FD_MATURITY: 'FD Maturity',
  FD_PREMATURE_CLOSE: 'FD Premature Close',
  FD_INTEREST_PAYOUT: 'FD Interest Payout',
  RD_INSTALLMENT: 'RD Installment',
  RD_MATURITY: 'RD Maturity',
  RD_PREMATURE_CLOSE: 'RD Premature Close',
  CONTRA: 'Contra Transfer',
  CONTRA_TRANSFER: 'Contra Transfer',
  LOAN_PRECLOSURE: 'Loan Preclosure',
  LOAN_EMERGENCY_CLOSE: 'Emergency Close'
};

function getVoucherTypeLabel(je, t) {
  if (!je) return 'Journal Voucher';
  if (je.ref_type && REF_TYPE_MAP[je.ref_type]) {
    return REF_TYPE_MAP[je.ref_type];
  }
  if (je.voucher_type === 'CONTRA' || (je.narration && je.narration.toLowerCase().includes('contra'))) {
    return 'Contra Transfer';
  }
  if (je.voucher_type === 'PAYMENT' || (je.narration && je.narration.toLowerCase().includes('disbursal'))) {
    return 'Loan Disbursal';
  }
  if (je.voucher_type === 'RECEIPT' || (je.narration && je.narration.toLowerCase().includes('collection'))) {
    return 'Collection Receipt';
  }
  if (je.voucher_type === 'CASH_PAYMENT' || je.voucher_type === 'BANK_PAYMENT') {
    return 'Payment Voucher';
  }
  if (je.voucher_type === 'CASH_RECEIPT' || je.voucher_type === 'BANK_RECEIPT') {
    return 'Receipt Voucher';
  }
  if (je.ref_type && typeof je.ref_type === 'string') {
    return je.ref_type.replace(/_/g, ' ');
  }
  if (je.voucher_type && typeof je.voucher_type === 'string') {
    return je.voucher_type.replace(/_/g, ' ');
  }
  return 'Journal Voucher';
}

function getVoucherBranch(je, defaultBranch = 'Main Branch') {
  if (je?.branch && String(je.branch).trim() !== '' && je.branch !== '—' && je.branch !== '-') {
    return je.branch;
  }
  return defaultBranch;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AutoVouchersView({ journalEntries = [], branchesList = [], chartOfAccounts = [], tenant, selectedBranch = 'ALL' }) {
  const { t } = useLanguage();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [applied, setApplied] = useState({ from: '', to: '' });
  const [branch, setBranch] = useState(() => (selectedBranch && selectedBranch !== 'ALL' ? selectedBranch : 'ALL'));
  useEffect(() => {
    setBranch(selectedBranch && selectedBranch !== 'ALL' ? selectedBranch : 'ALL');
  }, [selectedBranch]);
  const hasBranchSelected = branch !== '';
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [receiptVoucher, setReceiptVoucher] = useState(null);
  const pageSize = 10;

  const accountName = (code) => {
    const acc = chartOfAccounts.find(a => a.code === code);
    return acc ? (acc.name_key ? t(acc.name_key) : acc.name) : code;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setApplied({ from: fromDate, to: toDate });
    setCurrentPage(1);
  };

  const autoEntries = useMemo(() => journalEntries.filter(isAutoVoucher), [journalEntries]);
  const byBranch = useMemo(() => filterEntriesByBranch(autoEntries, branch), [autoEntries, branch]);
  const byRange = useMemo(() => filterEntriesInRange(byBranch, applied.from || null, applied.to || null), [byBranch, applied.from, applied.to]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return byRange.filter(je => {
      if (!q) return true;
      const vNo = (je.voucher_no || je.id || '').toLowerCase();
      const nar = (je.narration || '').toLowerCase();
      const ref = (je.ref_type || '').toLowerCase();
      const br = (je.branch || '').toLowerCase();
      const vType = getVoucherTypeLabel(je, t).toLowerCase();
      return vNo.includes(q) || nar.includes(q) || ref.includes(q) || br.includes(q) || vType.includes(q);
    }).slice().sort((a, b) => {
      const timeA = new Date(a.created_at || `${a.date}T00:00:00`).getTime() || 0;
      const timeB = new Date(b.created_at || `${b.date}T00:00:00`).getTime() || 0;
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      if (timeA !== timeB) return timeB - timeA;
      return (Number(b.db_id || b.id) || 0) - (Number(a.db_id || a.id) || 0);
    });
  }, [byRange, searchQuery, t]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedEntries = filtered.slice(startIndex, startIndex + pageSize);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const lineTotal = (je, side) => (je.lines || []).reduce((s, l) => s + (l[side] || 0), 0);
  const totalAmount = filtered.reduce((s, je) => s + lineTotal(je, 'debit'), 0);

  return (
    <div className="fin-page">
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)' }}>
              <CreditCard style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('fin.auto_vouchers_title')}</h1>
              <p className="fin-page-header__subtitle">{t('fin.auto_vouchers_subtitle')}</p>
            </div>
          </div>
        </div>

        <div className="fin-header-stats">
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.results_count')}:</span>
            <span className="fin-header-stat__value">{filtered.length}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('col.amount_rs')}:</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">₹{fmt(totalAmount)}</span>
          </div>
        </div>
      </div>

      <form className="fin-filterbar" onSubmit={handleSearch}>
        <div className="fin-field fin-field--branch">
          <label>{t('fin.branch_label')}</label>
          <SharedDropdown
            value={branch}
            onChange={(e) => { setBranch(e.target.value); setCurrentPage(1); }}
            disabled={Boolean(selectedBranch && selectedBranch !== 'ALL')}
            buttonStyle={{ height: 38, width: '100%' }}
            options={[
              { value: '', label: t('fin.select_branch_placeholder') || '— Select Branch —' },
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
            onChange={(e) => setFromDate(e.target.value)}
            buttonStyle={{ height: 38, width: '100%' }}
          />
        </div>

        <div className="fin-field fin-field--date">
          <label>{t('fin.to_label')}</label>
          <SharedDatePicker
            value={toDate}
            max={todayStr()}
            onChange={(e) => setToDate(e.target.value)}
            buttonStyle={{ height: 38, width: '100%' }}
          />
        </div>

        <div className="fin-field fin-field--search">
          <label>{t('fin.find_transactions_placeholder')}</label>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 9, top: 12, width: 14, height: 14, color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              className="fin-input"
              style={{ paddingLeft: 30, width: '100%', height: 38, boxSizing: 'border-box' }}
              type="text"
              placeholder={t('fin.find_transactions_placeholder')}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        <button type="submit" className="fin-search-btn" style={{ height: 38 }}>{t('fin.search_btn')}</button>
      </form>

      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
        <div className="fin-table-scroll">
          <table className="fin-table" style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                <th style={{ textAlign: 'left', width: 140, padding: '10px 12px' }}>{t('col.voucher_no')}</th>
                <th style={{ textAlign: 'left', width: 130, padding: '10px 12px' }}>{t('col.date_time')}</th>
                <th style={{ textAlign: 'center', width: 120, padding: '10px 12px' }}>{t('fin.voucher_type_col')}</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>{t('col.transaction_description')}</th>
                <th style={{ textAlign: 'left', width: 120, padding: '10px 12px' }}>{t('fin.branch_label')}</th>
                <th style={{ textAlign: 'right', width: 120, padding: '10px 12px' }}>{t('col.amount_rs')}</th>
                <th style={{ textAlign: 'right', width: 100, padding: '10px 12px' }}>{t('col.action')}</th>
              </tr>
            </thead>
            <tbody>
              {pagedEntries.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
                    {hasBranchSelected ? t('fin.no_results_hint') : t('fin.select_branch_hint')}
                  </td>
                </tr>
              ) : pagedEntries.map(je => {
                const typeLabel = getVoucherTypeLabel(je, t);
                const branchLabel = getVoucherBranch(je, branchesList[0]?.name || 'Main Branch');
                const isContra = typeLabel.toLowerCase().includes('contra');

                return (
                  <tr key={je.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ fontFamily: 'Consolas, monospace', fontWeight: 600, color: '#0F172A', padding: '10px 12px' }}>
                      {je.voucher_no || je.id}
                    </td>
                    <td style={{ color: '#0F172A', padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600 }}>{je.date}</div>
                      {je.created_at && (
                        <div style={{ color: '#94A3B8', fontSize: '0.68rem', marginTop: 2 }}>{fmtTime(je.created_at)}</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: isContra ? '#EEF2FF' : '#F1F5F9',
                          color: isContra ? '#4338CA' : '#334155'
                        }}
                      >
                        {typeLabel}
                      </span>
                    </td>
                    <td style={{ color: '#0F172A', padding: '10px 12px' }}>{je.narration}</td>
                    <td style={{ color: '#64748B', fontSize: '0.78rem', padding: '10px 12px' }}>{branchLabel}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F172A', padding: '10px 12px', fontSize: '0.84rem' }}>
                      ₹{fmt(lineTotal(je, 'debit'))}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 12px' }}>
                      <button
                        type="button"
                        onClick={() => setReceiptVoucher(je)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          border: '1px solid #E2E8F0',
                          background: '#FFFFFF',
                          color: '#334155',
                          borderRadius: 6,
                          padding: '4px 9px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Printer style={{ width: 11, height: 11 }} />
                        <span>{t('fin.print_voucher_btn')}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="fin-table-pagination">
          <div className="fin-table-pagination__info" style={{ fontSize: '0.74rem', color: '#64748B' }}>
            Showing <strong>{filtered.length === 0 ? 0 : startIndex + 1}</strong> to <strong>{Math.min(startIndex + pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> entries
          </div>
          <div className="fin-table-pagination__controls" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, padding: '5px 12px', fontSize: '0.74rem', cursor: safePage === 1 ? 'not-allowed' : 'pointer', opacity: safePage === 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <ChevronLeft style={{ width: 14, height: 14 }} />
              <span>Previous</span>
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

      {receiptVoucher && (
        <VoucherReceiptModal
          company={tenant}
          voucher={receiptVoucher}
          accountName={accountName}
          typeLabel={getVoucherTypeLabel(receiptVoucher, t)}
          onClose={() => setReceiptVoucher(null)}
        />
      )}
    </div>
  );
}
