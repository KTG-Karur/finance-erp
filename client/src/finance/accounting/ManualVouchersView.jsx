import React, { useState, useMemo, useEffect } from 'react';
import { PenLine, Search, ChevronLeft, ChevronRight, Plus, X, Trash2, Printer, Landmark } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { filterEntriesInRange, filterEntriesByBranch, MANUAL_VOUCHER_TYPES } from '../../utils/accounting';
import VoucherReceiptModal from '../../components/VoucherReceiptModal';
import SharedDropdown from '../../components/common/SharedDropdown';
import SharedDatePicker from '../../components/common/SharedDatePicker';

const VOUCHER_TYPE_LABEL_KEY = {
  CASH_RECEIPT: 'fin.voucher_type_cash_receipt',
  CASH_PAYMENT: 'fin.voucher_type_cash_payment',
  BANK_RECEIPT: 'fin.voucher_type_bank_receipt',
  BANK_PAYMENT: 'fin.voucher_type_bank_payment',
  CONTRA: 'fin.voucher_type_contra',
  JOURNAL: 'fin.voucher_type_journal'
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const fmt = n => Number(n || 0).toLocaleString('en-IN');

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

const EMPTY_FORM = {
  voucher_type: 'CASH_RECEIPT',
  date: todayStr(),
  branch: '',
  created_by: '',
  bank_account_id: '',
  amount: '',
  other_account_code: '',
  expense_category_id: '',
  purpose: '',
  other_reason: '',
  contra_direction: 'CASH_TO_BANK',
  narration: '',
  lines: [{ account_code: '', debit: '', credit: '' }, { account_code: '', debit: '', credit: '' }]
};

function NewVoucherModal({ isOpen, onClose, onSubmit, chartOfAccounts, branchesList, employees, expenseCategories, bankAccounts = [], t }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setForm({ ...EMPTY_FORM, date: todayStr(), branch: branchesList[0]?.name || '', created_by: '' });
      setError('');
    }
  }, [isOpen, branchesList]);

  if (!isOpen) return null;

  // 4099/5099 (Miscellaneous Income/Expense) are deliberately excluded here —
  // they're only reachable through the explicit "Others" option below, which
  // forces a reason to be captured instead of silently posting to a vague
  // catch-all account.
  const otherAccounts = chartOfAccounts.filter(a => a.code !== '1001' && a.code !== '1002' && a.code !== '4099' && a.code !== '5099');
  const accountName = (acc) => (acc?.name_key ? t(acc.name_key) : acc?.name);

  const isJournal = form.voucher_type === 'JOURNAL';
  const isContra = form.voucher_type === 'CONTRA';
  const isReceipt = form.voucher_type === 'CASH_RECEIPT' || form.voucher_type === 'BANK_RECEIPT';
  const isPayment = form.voucher_type === 'CASH_PAYMENT' || form.voucher_type === 'BANK_PAYMENT';
  // Previously gated on the target account being exactly account code '5002'
  // (Branch Operating Expenses) — a magic-string match that silently broke
  // the moment staff picked any other expense-flavored account, or if the
  // chart of accounts is ever renumbered. Any payment voucher can usefully be
  // tagged with a category, so just show it for every payment instead of
  // guessing which specific account "counts".
  const isOfficeExpense = isPayment;
  const selectedCategory = expenseCategories.find(c => c.id === Number(form.expense_category_id)) || null;
  const isMiscCategory = Boolean(selectedCategory && selectedCategory.name.toLowerCase().includes('miscellaneous'));
  const isOthers = form.other_account_code === 'OTHERS';

  const journalDebit = form.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const journalCredit = form.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const journalBalanced = Math.round((journalDebit - journalCredit) * 100) === 0 && journalDebit > 0;

  const setLine = (idx, field, value) => {
    setForm(prev => ({ ...prev, lines: prev.lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)) }));
  };
  const addLine = () => setForm(prev => ({ ...prev, lines: [...prev.lines, { account_code: '', debit: '', credit: '' }] }));
  const removeLine = (idx) => setForm(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.narration.trim()) {
      setError(t('fin.narration_label') + ' *');
      return;
    }
    if (!form.created_by) {
      setError(t('fin.created_by_label') + ' *');
      return;
    }
    if (isJournal) {
      if (!journalBalanced) {
        setError(t('fin.voucher_unbalanced_error'));
        return;
      }
    } else if (isContra) {
      if (!(Number(form.amount) > 0)) { setError(t('fin.amount_label') + ' *'); return; }
    } else {
      if (!form.other_account_code && !isOthers) {
        setError(isReceipt ? (t('fin.received_against_label') + ' *') : (t('fin.paid_towards_label') + ' *'));
        return;
      }
      if (!(Number(form.amount) > 0)) {
        setError(t('fin.amount_label') + ' *');
        return;
      }
      if (isOfficeExpense && selectedCategory) {
        const availableBalance = Number(selectedCategory.balance || 0);
        const voucherAmount = Number(form.amount || 0);
        if (voucherAmount > availableBalance) {
          setError('there is no enough money for this expense category please topup');
          return;
        }
      }
      if (isOfficeExpense && form.expense_category_id && isMiscCategory && !form.purpose.trim()) { setError(t('fin.purpose_label') + ' *'); return; }
      if (isOthers && !form.other_reason.trim()) { setError(t('fin.other_reason_label') + ' *'); return; }
    }

    // The category/purpose/other-reason aren't separate journal fields —
    // they're folded straight into the narration, so the reason shows up
    // wherever this voucher is read back (register, ledger) without needing
    // new columns.
    let narration = form.narration.trim();
    if (isOfficeExpense && selectedCategory) {
      narration += ` — ${selectedCategory.name}`;
      if (isMiscCategory && form.purpose.trim()) {
        narration += `: ${form.purpose.trim()}`;
      }
    }
    if (isOthers && form.other_reason.trim()) {
      narration += ` — ${t('fin.others_option')}: ${form.other_reason.trim()}`;
    }

    // If bank account is chosen, enrich narration and payload with bank info
    const selectedBank = bankAccounts.find(b => String(b.id) === String(form.bank_account_id)) || null;
    if (selectedBank) {
      const bankTag = `[Bank: ${selectedBank.bank_name} A/C ...${(selectedBank.account_number || '').slice(-4)} IFSC: ${selectedBank.ifsc_code}]`;
      if (!narration.includes(selectedBank.bank_name)) {
        narration += ` ${bankTag}`;
      }
    }

    // "Others" isn't a real ledger account — it maps to a generic
    // miscellaneous income/expense account (which side depends on whether
    // this is a receipt or a payment) so the entry still posts correctly.
    const resolvedAccountCode = isOthers ? (isReceipt ? '4099' : '5099') : form.other_account_code;

    setSaving(true);
    try {
      await onSubmit({
        voucher_type: form.voucher_type,
        date: form.date,
        branch: form.branch,
        created_by: form.created_by,
        amount: form.amount,
        bank_account_id: form.bank_account_id || null,
        bank_name: selectedBank?.bank_name || null,
        bank_account_number: selectedBank?.account_number || null,
        ifsc_code: selectedBank?.ifsc_code || null,
        bank_branch: selectedBank?.branch_name || selectedBank?.branch || null,
        other_account_code: resolvedAccountCode,
        contra_direction: form.contra_direction,
        expense_category_id: form.expense_category_id || null,
        narration,
        lines: isJournal ? form.lines.filter(l => l.account_code).map(l => ({ account_code: l.account_code, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })) : undefined
      });
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not save this voucher.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card saas-modal-card--lg">
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: '#F8FAFC', color: '#0F172A', border: '1px solid #E2E8F0' }}>
              <PenLine style={{ width: 16, height: 16 }} />
            </div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 500, fontSize: '0.98rem', color: '#0F172A' }}>{t('fin.new_voucher_btn')}</h3>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 9, fontSize: '0.75rem', fontWeight: 600, background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', color: 'var(--color-danger-hover, #B91C1C)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <div className="fin-field">
              <label>{t('fin.voucher_type_label')}</label>
              <SharedDropdown
                value={form.voucher_type}
                onChange={(e) => setForm({ ...form, voucher_type: e.target.value })}
                options={MANUAL_VOUCHER_TYPES.map(vt => ({ value: vt, label: t(VOUCHER_TYPE_LABEL_KEY[vt]) }))}
              />
            </div>
            <div className="fin-field">
              <label>{t('col.date')}</label>
              <SharedDatePicker
                value={form.date}
                max={todayStr()}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                buttonStyle={{ height: 36 }}
              />
            </div>
            <div className="fin-field">
              <label>{t('fin.branch_label')}</label>
              <SharedDropdown
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
                options={branchesList.map(b => ({ value: b.name, label: b.name }))}
              />
            </div>
            <div className="fin-field">
              <label>{t('fin.staff_name_label') || 'Staff Name'}</label>
              <SharedDropdown
                value={form.created_by}
                onChange={(e) => setForm({ ...form, created_by: e.target.value })}
                placeholder={t('fin.select_staff_placeholder') || '— Select Staff / Cashier —'}
                options={employees.map(emp => ({ value: emp.name, label: emp.name }))}
              />
            </div>
          </div>

          {/* Registered Bank Account Selector for Bank Receipt / Bank Payment / Contra */}
          {(form.voucher_type === 'BANK_RECEIPT' || form.voucher_type === 'BANK_PAYMENT' || isContra) && bankAccounts.length > 0 && (
            <div className="fin-field" style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '10px 12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#0369A1', fontSize: '0.75rem', marginBottom: 4 }}>
                <Landmark style={{ width: 14, height: 14 }} />
                <span>Select Company Bank Account</span>
              </label>
              <SharedDropdown
                value={form.bank_account_id || ''}
                placeholder="-- Choose Registered Bank Account (Auto-syncs Branch) --"
                onChange={(e) => {
                  const bId = e.target.value;
                  const selectedBank = bankAccounts.find(b => String(b.id) === String(bId));
                  setForm(prev => ({
                    ...prev,
                    bank_account_id: bId,
                    branch: (selectedBank?.branch || selectedBank?.branch_name) && branchesList.some(b => b.name === (selectedBank.branch || selectedBank.branch_name))
                      ? (selectedBank.branch || selectedBank.branch_name)
                      : prev.branch
                  }));
                }}
                options={bankAccounts.filter(b => b.is_active !== false).map(b => ({
                  value: b.id,
                  label: `${b.bank_name} - ${b.account_name} (A/C: ...${(b.account_number || '').slice(-4)}) [IFSC: ${b.ifsc_code}] ${b.branch ? `— Branch: ${b.branch}` : ''}`
                }))}
              />
            </div>
          )}

          {(isReceipt || isPayment) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="fin-field">
                <label>{t('fin.amount_label') || 'Amount (₹)'}</label>
                <input type="number" min="0" step="0.01" className="fin-input" style={{ width: '100%' }} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="fin-field">
                <label>{isReceipt ? (t('fin.received_against_label') || 'Received From / Against Account *') : (t('fin.paid_towards_label') || 'Paid Towards Account (Debit) *')}</label>
                <SharedDropdown
                  value={form.other_account_code}
                  placeholder={t('fin.select_account_placeholder') || '— Select Account —'}
                  onChange={(e) => setForm({ ...form, other_account_code: e.target.value, expense_category_id: '', purpose: '', other_reason: '' })}
                  options={[
                    ...otherAccounts.map(acc => ({ value: acc.code, label: accountName(acc) })),
                    { value: 'OTHERS', label: t('fin.others_option') || 'Others' }
                  ]}
                />
              </div>

              {isOfficeExpense && (
                <div className="fin-field">
                  <label>{t('fin.expense_category_label') || 'Expense Category'}</label>
                  <SharedDropdown
                    value={form.expense_category_id}
                    placeholder="-- Select Expense Category --"
                    onChange={(e) => setForm({ ...form, expense_category_id: e.target.value, purpose: '' })}
                    options={expenseCategories.filter(c => c.status === 'ACTIVE').map(c => ({
                      value: c.id,
                      label: `${c.name} (${c.branch ? c.branch + ' — ' : ''}Available: ₹${fmt(c.balance)})`
                    }))}
                  />
                </div>
              )}

              {isOfficeExpense && isMiscCategory && (
                <div className="fin-field" style={{ gridColumn: '1 / -1' }}>
                  <label>{t('fin.purpose_label')}</label>
                  <input type="text" className="fin-input" style={{ width: '100%' }} placeholder={t('fin.purpose_placeholder')} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
                </div>
              )}

              {isOthers && (
                <div className="fin-field" style={{ gridColumn: '1 / -1' }}>
                  <label>{t('fin.other_reason_label')}</label>
                  <input type="text" className="fin-input" style={{ width: '100%' }} placeholder={t('fin.other_reason_placeholder')} value={form.other_reason} onChange={(e) => setForm({ ...form, other_reason: e.target.value })} />
                </div>
              )}
            </div>
          )}

          {isContra && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="fin-field">
                <label>{t('fin.amount_label')}</label>
                <input type="number" min="0" step="0.01" className="fin-input" style={{ width: '100%' }} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="fin-field">
                <label>{t('fin.contra_direction_label')}</label>
                <SharedDropdown
                  value={form.contra_direction}
                  onChange={(e) => setForm({ ...form, contra_direction: e.target.value })}
                  options={[
                    { value: 'CASH_TO_BANK', label: t('fin.contra_cash_to_bank') },
                    { value: 'BANK_TO_CASH', label: t('fin.contra_bank_to_cash') }
                  ]}
                />
              </div>
            </div>
          )}

          {isJournal && (
            <div>
              <label style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: '#64748B', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                {t('fin.journal_lines_label')}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {form.lines.map((line, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 32px', gap: 8, alignItems: 'center' }}>
                    <SharedDropdown
                      value={line.account_code}
                      placeholder={t('fin.select_account_placeholder') || '— Select Account —'}
                      onChange={(e) => setLine(idx, 'account_code', e.target.value)}
                      options={chartOfAccounts.map(acc => ({ value: acc.code, label: accountName(acc) }))}
                    />
                    <input type="number" min="0" step="0.01" className="fin-input" placeholder={t('fin.col_debit')} value={line.debit} onChange={(e) => setLine(idx, 'debit', e.target.value)} />
                    <input type="number" min="0" step="0.01" className="fin-input" placeholder={t('fin.col_credit')} value={line.credit} onChange={(e) => setLine(idx, 'credit', e.target.value)} />
                    <button type="button" onClick={() => removeLine(idx)} disabled={form.lines.length <= 2} style={{ border: 'none', background: 'transparent', color: 'var(--color-danger, #DC2626)', cursor: form.lines.length <= 2 ? 'default' : 'pointer', opacity: form.lines.length <= 2 ? 0.3 : 1 }}>
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addLine} className="fin-quick-pill" style={{ marginTop: 8 }}>
                <Plus style={{ width: 12, height: 12 }} />
                <span>{t('fin.add_line_btn')}</span>
              </button>
              <div className="fin-meta-row" style={{ marginTop: 8 }}>
                <span>{t('fin.col_debit')}: ₹{journalDebit.toLocaleString('en-IN')}</span>
                <span>{t('fin.col_credit')}: ₹{journalCredit.toLocaleString('en-IN')}</span>
                <span className={`fin-badge ${journalBalanced ? 'fin-badge--ok' : 'fin-badge--warn'}`}>
                  {journalBalanced ? t('fin.balanced_badge') : t('fin.voucher_unbalanced_error')}
                </span>
              </div>
            </div>
          )}

          <div className="fin-field">
            <label>{t('fin.narration_label')}</label>
            <input type="text" className="fin-input" style={{ width: '100%' }} value={form.narration} onChange={(e) => setForm({ ...form, narration: e.target.value })} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} className="fin-btn-primary">
              {saving ? t('fin.saving_voucher') : t('fin.save_voucher_btn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManualVouchersView({
  journalEntries = [],
  chartOfAccounts = [],
  branchesList = [],
  employees = [],
  expenseCategories = [],
  bankAccounts = [],
  tenant,
  onCreateManualVoucher,
  onRevertVoucher,
  selectedBranch = 'ALL'
}) {
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
  const [modalOpen, setModalOpen] = useState(false);
  const [receiptVoucher, setReceiptVoucher] = useState(null);
  const [revertTarget, setRevertTarget] = useState(null);
  const [revertReason, setRevertReason] = useState('');
  const [revertBusy, setRevertBusy] = useState(false);
  const [revertError, setRevertError] = useState('');
  const pageSize = 10;

  // A voucher already has a reversal posted against it once some other entry
  // references it via ref_type='VOUCHER_REVERSAL' — used to hide the Revert
  // button so the same mistake can't be reverted twice.
  const revertedIds = useMemo(() => {
    const s = new Set();
    journalEntries.forEach(e => {
      if (e.ref_type === 'VOUCHER_REVERSAL' && e.ref_id != null) s.add(String(e.ref_id));
    });
    return s;
  }, [journalEntries]);

  const accountName = (code) => {
    const acc = chartOfAccounts.find(a => a.code === code);
    return acc ? (acc.name_key ? t(acc.name_key) : acc.name) : code;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setApplied({ from: fromDate, to: toDate });
  };

  const manualEntries = useMemo(() => journalEntries.filter(je => !je.ref_type || je.ref_type === 'MANUAL' || je.ref_type === 'EXPENSE'), [journalEntries]);
  const byBranch = useMemo(() => filterEntriesByBranch(manualEntries, branch), [manualEntries, branch]);
  const byRange = useMemo(() => filterEntriesInRange(byBranch, applied.from || null, applied.to || null), [byBranch, applied.from, applied.to]);

  const filtered = byRange.filter(je => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const narration = (je.narration || '').toLowerCase();
    const voucherNo = (je.voucher_no || je.id || '').toLowerCase();
    const createdBy = (je.created_by || '').toLowerCase();
    return narration.includes(q) || voucherNo.includes(q) || createdBy.includes(q);
  }).slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedEntries = filtered.slice(startIndex, startIndex + pageSize);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const lineTotal = (je) => je.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalAmount = filtered.reduce((s, je) => s + lineTotal(je), 0);

  return (
    <div className="fin-page">
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', color: '#7C3AED' }}>
              <PenLine style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('fin.manual_vouchers_title')}</h1>
              <p className="fin-page-header__subtitle">{t('fin.manual_vouchers_subtitle')}</p>
            </div>
          </div>
          <button className="fin-btn-primary" onClick={() => setModalOpen(true)}>
            <Plus style={{ width: 14, height: 14 }} />
            <span>{t('fin.new_voucher_btn')}</span>
          </button>
        </div>

        <div className="fin-header-stats">
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.results_count')}</span>
            <span className="fin-header-stat__value">{filtered.length}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('col.amount_rs')}</span>
            <span className="fin-header-stat__value">₹{fmt(totalAmount)}</span>
          </div>
        </div>
      </div>

      <form className="fin-filterbar" onSubmit={handleSearch}>
        <div className="fin-field">
          <label>{t('fin.branch_label')}</label>
          <SharedDropdown
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
              <th>{t('fin.created_by_label')}</th>
              <th className="num">{t('col.amount_rs')}</th>
              <th style={{ textAlign: 'right' }}>{t('col.action')}</th>
            </tr>
          </thead>
          <tbody>
            {pagedEntries.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>{hasBranchSelected ? t('fin.no_results_hint') : t('fin.select_branch_hint')}</td></tr>
            ) : pagedEntries.map(je => (
              <tr key={je.id}>
                <td className="code">{je.id}</td>
                <td>{je.date}<br /><span style={{ color: '#94A3B8', fontSize: '0.68rem' }}>{fmtTime(je.created_at)}</span></td>
                <td><span className="fin-tag">{VOUCHER_TYPE_LABEL_KEY[je.voucher_type] ? t(VOUCHER_TYPE_LABEL_KEY[je.voucher_type]) : je.voucher_type}</span></td>
                <td>{je.narration}</td>
                <td>{je.branch || '—'}</td>
                <td>{je.created_by || '—'}</td>
                <td className="num" style={{ fontWeight: 600, color: '#0F172A' }}>₹{fmt(lineTotal(je))}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setReceiptVoucher(je)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', borderRadius: 6, padding: '4px 9px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <Printer style={{ width: 11, height: 11 }} />
                      <span>{t('fin.print_voucher_btn')}</span>
                    </button>
                    {!je.is_auto && je.ref_type !== 'VOUCHER_REVERSAL' && !revertedIds.has(String(je.db_id)) && onRevertVoucher && (
                      <button
                        type="button"
                        onClick={() => { setRevertTarget(je); setRevertReason(''); setRevertError(''); }}
                        title="Undo this voucher with a mirror-image reversal"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid var(--color-danger-border, #FECACA)', background: 'var(--color-danger-light, #FEF2F2)', color: 'var(--color-danger, #DC2626)', borderRadius: 6, padding: '4px 9px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <Trash2 style={{ width: 11, height: 11 }} />
                        <span>Revert</span>
                      </button>
                    )}
                    {je.ref_type === 'VOUCHER_REVERSAL' && (
                      <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontStyle: 'italic', alignSelf: 'center' }}>Reversal</span>
                    )}
                    {revertedIds.has(String(je.db_id)) && (
                      <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontStyle: 'italic', alignSelf: 'center' }}>Reverted</span>
                    )}
                  </div>
                </td>
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

      <NewVoucherModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={onCreateManualVoucher}
        chartOfAccounts={chartOfAccounts}
        branchesList={branchesList}
        employees={employees}
        expenseCategories={expenseCategories}
        bankAccounts={bankAccounts}
        t={t}
      />

      {receiptVoucher && (
        <VoucherReceiptModal
          company={tenant}
          voucher={receiptVoucher}
          accountName={accountName}
          typeLabel={VOUCHER_TYPE_LABEL_KEY[receiptVoucher.voucher_type] ? t(VOUCHER_TYPE_LABEL_KEY[receiptVoucher.voucher_type]) : receiptVoucher.voucher_type}
          onClose={() => setReceiptVoucher(null)}
        />
      )}

      {revertTarget && (
        <div className="saas-modal-backdrop" style={{ zIndex: 100000 }}>
          <div className="saas-modal-card" style={{ maxWidth: 440 }}>
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: 'var(--color-danger-light, #FEF2F2)', borderColor: 'var(--color-danger-border, #FECACA)', color: 'var(--color-danger, #DC2626)' }}>
                  <Trash2 style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>Revert Voucher {revertTarget.id}</h3>
                  <p>Posts a mirror-image reversal — the original stays on record, unchanged.</p>
                </div>
              </div>
              <button onClick={() => setRevertTarget(null)} className="close-btn" type="button" disabled={revertBusy}><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="saas-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#64748B' }}>Description:</span>
                  <strong style={{ color: '#0F172A', textAlign: 'right' }}>{revertTarget.narration}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Amount:</span>
                  <strong style={{ color: '#0F172A' }}>₹{fmt(lineTotal(revertTarget))}</strong>
                </div>
              </div>

              {revertError && <div className="form-alert form-alert--error"><span>{revertError}</span></div>}

              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                  Reason for reverting
                </label>
                <input
                  type="text"
                  value={revertReason}
                  onChange={(e) => setRevertReason(e.target.value)}
                  placeholder="e.g. Wrong voucher type selected"
                  style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div className="saas-modal-footer">
              <button type="button" onClick={() => setRevertTarget(null)} disabled={revertBusy} className="btn-cancel">{t('btn.cancel')}</button>
              <button
                type="button"
                disabled={revertBusy}
                onClick={async () => {
                  setRevertBusy(true);
                  setRevertError('');
                  try {
                    await onRevertVoucher(revertTarget.db_id, revertReason);
                    setRevertTarget(null);
                  } catch (err) {
                    setRevertError(err?.response?.data?.message || err?.message || 'Failed to revert this voucher.');
                  } finally {
                    setRevertBusy(false);
                  }
                }}
                className="btn-submit"
                style={{ background: 'var(--color-danger, #DC2626)' }}
              >
                {revertBusy ? 'Reverting...' : 'Confirm Revert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
