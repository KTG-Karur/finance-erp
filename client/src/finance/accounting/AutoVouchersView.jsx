import React, { useState, useMemo, useEffect } from 'react';
import { CreditCard, Search, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { filterEntriesInRange, filterEntriesByBranch, isAutoVoucher } from '../../utils/accounting';
import VoucherReceiptModal from '../../components/VoucherReceiptModal';
import DropdownSelect from '../../components/DropdownSelect';
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
  };

  const autoEntries = useMemo(() => journalEntries.filter(isAutoVoucher), [journalEntries]);
  const byBranch = useMemo(() => filterEntriesByBranch(autoEntries, branch), [autoEntries, branch]);
  const byRange = useMemo(() => filterEntriesInRange(byBranch, applied.from || null, applied.to || null), [byBranch, applied.from, applied.to]);

  const filtered = byRange.filter(je => {
    const q = searchQuery.toLowerCase().trim();
    return !q || je.narration.toLowerCase().includes(q);
  }).slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedEntries = filtered.slice(startIndex, startIndex + pageSize);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const lineTotal = (je, side) => je.lines.reduce((s, l) => s + (l[side] || 0), 0);
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
            <span className="fin-header-stat__label">{t('fin.results_count')}</span>
            <span className="fin-header-stat__value">{filtered.length}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('col.amount_rs')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">₹{fmt(totalAmount)}</span>
          </div>
        </div>
      </div>

      <form className="fin-filterbar" onSubmit={handleSearch}>
        <div className="fin-field">
          <label>{t('fin.branch_label')}</label>
          <DropdownSelect
            value={branch}
            onChange={(e) => { setBranch(e.target.value); setCurrentPage(1); }}
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
              <th>{t('col.voucher_no')}</th>
              <th>{t('col.date_time')}</th>
              <th>{t('fin.voucher_type_col')}</th>
              <th>{t('col.transaction_description')}</th>
              <th>{t('fin.branch_label')}</th>
              <th className="num">{t('col.amount_rs')}</th>
              <th style={{ textAlign: 'right' }}>{t('col.action')}</th>
            </tr>
          </thead>
          <tbody>
            {pagedEntries.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>{hasBranchSelected ? t('fin.no_results_hint') : t('fin.select_branch_hint')}</td></tr>
            ) : pagedEntries.map(je => {
              const typeLabel = getVoucherTypeLabel(je, t);
              const branchLabel = getVoucherBranch(je, branchesList[0]?.name || 'Main Branch');
              const isContra = typeLabel.toLowerCase().includes('contra');

              return (
                <tr key={je.id}>
                  <td className="code">{je.id}</td>
                  <td>{je.date}<br /><span style={{ color: '#94A3B8', fontSize: '0.68rem' }}>{fmtTime(je.created_at)}</span></td>
                  <td>
                    <span
                      className="fin-tag"
                      style={isContra ? { background: '#EEF2FF', color: '#4338CA', borderColor: '#C7D2FE', fontWeight: 700 } : undefined}
                    >
                      {typeLabel}
                    </span>
                  </td>
                  <td>{je.narration}</td>
                  <td>{branchLabel}</td>
                  <td className="num" style={{ fontWeight: 600, color: '#0F172A' }}>₹{fmt(lineTotal(je, 'debit'))}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => setReceiptVoucher(je)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', borderRadius: 6, padding: '4px 9px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
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
