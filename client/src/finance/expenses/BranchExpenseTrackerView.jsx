import React, { useState, useMemo, useEffect } from 'react';
import {
  Wallet,
  Building2,
  TrendingDown,
  History,
  Search,
  Filter,
  ArrowUpCircle,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  Plus,
  X,
  AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import SharedDropdown from '../../components/common/SharedDropdown.jsx';

const fmt = n => Number(n || 0).toLocaleString('en-IN');
const fmtDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

function CreateExpenseVoucherModal({ isOpen, categories = [], branchesList = [], employees = [], defaultBranch = '', onClose, onSubmit }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ category_id: '', amount: '', narration: '', created_by: '', custom_staff: '', branch: '' });
  const [useManualStaff, setUseManualStaff] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm({
        category_id: categories[0]?.id || '',
        amount: '',
        narration: '',
        created_by: employees[0]?.name || 'Staff',
        custom_staff: '',
        branch: defaultBranch || branchesList[0]?.name || ''
      });
      setUseManualStaff(false);
      setShowConfirm(false);
      setError('');
    }
  }, [isOpen, categories, branchesList, employees, defaultBranch]);

  if (!isOpen) return null;

  const selectedCategory = categories.find(c => String(c.id) === String(form.category_id));

  const handlePreSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.category_id) { setError('Please select an expense category.'); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError('Please enter a valid expense amount.'); return; }

    const staffName = useManualStaff ? form.custom_staff.trim() : form.created_by;
    if (!staffName) { setError('Staff name is required.'); return; }

    const available = Number(selectedCategory?.balance || 0);
    if (Number(form.amount) > available) {
      setError('There is no enough money in this expense category please topup');
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setLoading(true);
    setShowConfirm(false);
    const staffName = useManualStaff ? form.custom_staff.trim() : form.created_by;
    try {
      await onSubmit({
        expense_category_id: form.category_id,
        category_id: form.category_id,
        amount: Number(form.amount),
        narration: form.narration.trim() || `Expense for ${selectedCategory?.name || 'Category'}`,
        created_by: staffName || 'Staff',
        branch: form.branch || selectedCategory?.branch || 'Main Branch',
        date: new Date().toISOString().slice(0, 10),
        voucher_type: 'CASH_PAYMENT',
        other_account_code: '5002'
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create expense voucher.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card" style={{ maxWidth: 460 }}>
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary, #15803D)' }}>
              <Receipt style={{ width: 18, height: 18 }} />
            </div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{t('expenses.modal_title', 'Create Expense Voucher')}</h3>
              <p style={{ fontWeight: 400, fontSize: '0.78rem' }}>{t('expenses.modal_subtitle', 'Book an expense directly against a branch allocated category')}</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>

        {showConfirm ? (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: 14, borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <CheckCircle2 style={{ width: 18, height: 18, color: '#15803D', flexShrink: 0, marginTop: 2 }} />
              <div>
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: '#0F172A' }}>{t('expenses.modal_confirm_title', 'Confirm Expense Voucher Details')}</h4>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#475569', fontWeight: 400 }}>
                  {t('expenses.modal_confirm_text', 'Are you sure you want to debit this expense voucher?')}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
              <button type="button" onClick={() => setShowConfirm(false)} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>{t('btn.back', 'Back')}</button>
              <button type="button" onClick={handleConfirmSubmit} disabled={loading} style={{ background: 'var(--brand-primary, #15803D)', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                {loading ? t('expenses.modal_submitting', 'Confirming...') : t('expenses.modal_submit', 'Confirm & Create Voucher')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePreSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 24px' }}>
            {error && (
              <div className="form-alert form-alert--error" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400 }}>
                <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0, color: '#DC2626' }} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 }}>{t('expenses.modal_cat_label', 'Expense Category *')}</label>
              <SharedDropdown
                required
                value={form.category_id}
                onChange={e => setForm({ ...form, category_id: e.target.value })}
                options={categories.map(c => ({
                  value: c.id,
                  label: `${c.name} (${c.branch ? c.branch + ' — ' : ''}Available: ₹${fmt(c.balance)})`
                }))}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 }}>{t('expenses.modal_amount_label', 'Expense Amount (₹) *')}</label>
              <input
                type="number"
                min="1"
                required
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="e.g. 500"
                style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 400 }}
              />
            </div>

            {branchesList.length > 0 && (
              <div>
                <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 }}>{t('fin.branch_label', 'Branch')}</label>
                <SharedDropdown
                  value={form.branch}
                  onChange={e => setForm({ ...form, branch: e.target.value })}
                  options={branchesList.map(b => ({ value: b.name, label: b.name }))}
                />
              </div>
            )}

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500 }}>{t('expenses.modal_staff_label', 'Staff Name / Payee *')}</label>
                <button
                  type="button"
                  onClick={() => setUseManualStaff(!useManualStaff)}
                  style={{ background: 'none', border: 'none', color: '#1D4ED8', fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer', padding: 0 }}
                >
                  {useManualStaff ? t('expenses.modal_dropdown_staff', 'Select from staff directory') : `+ ${t('expenses.modal_manual_staff', 'Type custom staff name')}`}
                </button>
              </div>

              {useManualStaff ? (
                <input
                  type="text"
                  required
                  value={form.custom_staff}
                  onChange={e => setForm({ ...form, custom_staff: e.target.value })}
                  placeholder="e.g. Anand Kumar"
                  style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 400 }}
                />
              ) : (
                <SharedDropdown
                  value={form.created_by}
                  onChange={e => setForm({ ...form, created_by: e.target.value })}
                  options={[
                    ...employees.map(emp => ({ value: emp.name, label: `${emp.name} (${emp.role || 'Staff'})` })),
                    { value: 'Other Staff', label: 'Other Staff / Outside Vendor' }
                  ]}
                />
              )}
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 }}>{t('expenses.modal_narration_label', 'Narration / Purpose')}</label>
              <textarea
                rows={2}
                value={form.narration}
                onChange={e => setForm({ ...form, narration: e.target.value })}
                placeholder="e.g. Branch tea, snacks and water supplies bill"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 400, boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>{t('btn.cancel', 'Cancel')}</button>
              <button type="submit" style={{ background: 'var(--brand-primary, #15803D)', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                {t('expenses.new_voucher', 'Review & Post Voucher')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function BranchExpenseTrackerView({
  expenseCategories = [],
  expenseVouchers = [],
  journalEntries = [],
  branchesList = [],
  employees = [],
  selectedBranch = 'ALL',
  user,
  expenseAllocationRequests = [],
  onCreateExpenseVoucher
}) {
  const { t } = useLanguage();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  // Branch filter state
  const [branchFilter, setBranchFilter] = useState(() => (selectedBranch && selectedBranch !== 'ALL' ? selectedBranch : 'ALL'));
  useEffect(() => {
    setBranchFilter(selectedBranch && selectedBranch !== 'ALL' ? selectedBranch : 'ALL');
  }, [selectedBranch]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Compute spend vouchers per category strictly from the expense_vouchers table
  const categorySpends = useMemo(() => {
    const map = {};

    const filteredExpenseVouchers = (expenseVouchers || []).filter(ev => {
      if (branchFilter === 'ALL') return true;
      const targetBranch = branchFilter.trim().toLowerCase();
      const vBranch = (ev.branch || ev.branch_name || ev.company_branch || '').trim().toLowerCase();
      if (vBranch) {
        return vBranch === targetBranch;
      }
      const defaultBranch = (branchesList[0]?.name || 'Main Branch').trim().toLowerCase();
      return defaultBranch === targetBranch;
    });

    filteredExpenseVouchers.forEach(ev => {
      const catKey = String(ev.category_id);
      if (!map[catKey]) map[catKey] = [];
      map[catKey].push({
        id: ev.id || ev.voucher_no,
        voucher_no: ev.voucher_no || `EV-${ev.id}`,
        date: ev.date || ev.created_at,
        narration: ev.notes || ev.narration || `Expense — ${ev.category || 'General'}`,
        amount: Number(ev.amount || 0),
        created_by: ev.payee || ev.created_by || 'Staff',
        branch: ev.branch || branchFilter || 'Main Branch',
        category_name: ev.category || 'Expense'
      });
    });

    return map;
  }, [expenseVouchers, branchFilter, branchesList]);

  // Filter categories available to the selected branch
  const scopedCategories = useMemo(() => {
    if (branchFilter === 'ALL') return expenseCategories;
    const targetBranch = branchFilter.trim().toLowerCase();

    return (expenseCategories || []).filter(c => {
      const raw = c.branch;
      if (!raw || raw === 'ALL' || raw === 'All Branches' || raw === 'All Branches / Central') {
        return true;
      }
      const bList = String(raw).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      if (bList.length === 0 || bList.includes('all')) return true;
      return bList.includes(targetBranch);
    });
  }, [expenseCategories, branchFilter]);

  // Filter displayed categories
  const displayCategories = useMemo(() => {
    return scopedCategories.filter(c => {
      if (selectedCategory !== 'ALL' && String(c.id) !== String(selectedCategory)) return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.branch && c.branch.toLowerCase().includes(q))
      );
    });
  }, [scopedCategories, selectedCategory, searchQuery]);

  // Aggregate metrics strictly for selected branch
  const totalAllocated = useMemo(() => {
    return scopedCategories.reduce((sum, c) => sum + (parseFloat(c.allocated_total || c.amount || 0)), 0);
  }, [scopedCategories]);

  const totalSpent = useMemo(() => {
    let sum = 0;
    Object.values(categorySpends).forEach(list => {
      list.forEach(item => { sum += Number(item.amount || 0); });
    });
    return sum;
  }, [categorySpends]);

  const totalRemaining = Math.max(0, totalAllocated - totalSpent);

  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  return (
    <div className="fin-page">
      {/* Executive Header */}
      <div className="fin-header-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '20px 24px', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet style={{ width: 22, height: 22 }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {isAdmin ? t('expenses.page_title_admin', 'Branch Expenses & Budget Allocations') : t('expenses.page_title', 'Branch Expense Budget & Spend History')}
              </h1>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '2px 0 0', fontWeight: 400 }}>
                {isAdmin ? t('expenses.page_subtitle_admin', 'Super Admin multi-branch category-wise allocated budget, total spend, and balance tracking') : t('expenses.page_subtitle', 'Allocated budget category balances and expense history for your branch')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>{t('expenses.total_allocated', 'Total Allocated')}</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>₹{fmt(totalAllocated)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>{t('expenses.total_spent', 'Total Spent')}</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#C2410C' }}>₹{fmt(totalSpent)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>{t('expenses.remaining_balance', 'Remaining Balance')}</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: totalRemaining > 0 ? 'var(--brand-primary, #15803D)' : 'var(--color-danger, #DC2626)' }}>₹{fmt(totalRemaining)}</span>
            </div>
            <button
              onClick={() => setIsVoucherModalOpen(true)}
              style={{
                background: 'var(--brand-primary, #15803D)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                padding: '9px 16px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              <span>{t('expenses.new_voucher', 'New Expense Voucher')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="fin-filterbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="fin-field">
            <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500 }}>{t('fin.branch_label', 'Branch')}</label>
            <SharedDropdown
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              disabled={Boolean(selectedBranch && selectedBranch !== 'ALL')}
              size="sm"
              buttonStyle={{ height: 34, minWidth: 140 }}
              options={[
                { value: 'ALL', label: t('expenses.all_branches', 'All Branches') },
                ...branchesList.map(b => ({ value: b.name, label: b.name }))
              ]}
            />
          </div>

          <div className="fin-field">
            <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500 }}>{t('expenses.modal_cat_label', 'Expense Category')}</label>
            <SharedDropdown
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              size="sm"
              buttonStyle={{ height: 34, minWidth: 160 }}
              options={[
                { value: 'ALL', label: t('expenses.all_categories', 'All Categories') },
                ...scopedCategories.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
          </div>
        </div>

        <div style={{ position: 'relative', width: 220 }}>
          <Search style={{ position: 'absolute', left: 9, top: 10, width: 13, height: 13, color: '#94A3B8' }} />
          <input
            type="text"
            className="fin-input"
            style={{ paddingLeft: 28, height: 34, width: '100%', fontSize: '0.78rem', boxSizing: 'border-box' }}
            placeholder={t('expenses.search_placeholder', 'Search category or branch...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category Wise Budget Cards Horizontal Scrollable Track */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Wallet style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} />
          <span>{t('expenses.category_balances_title', 'Category Wise Expense Balances (Scroll Horizontally)')}</span>
        </div>
        <div style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          paddingBottom: 12,
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch'
        }}>
          {displayCategories.length === 0 ? (
            <div style={{ flex: '1', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 30, textAlign: 'center', color: '#64748B', fontSize: '0.82rem' }}>
              {t('expenses.no_categories_found', 'No expense categories found for the selected branch.')}
            </div>
          ) : (
            displayCategories.map(cat => {
              const allocated = parseFloat(cat.allocated_total || cat.amount || 0);
              const historyList = categorySpends[String(cat.id)] || categorySpends[cat.id] || [];
              const spentFromHistory = historyList.reduce((sum, v) => sum + Number(v.amount || 0), 0);
              const spent = (branchFilter !== 'ALL') ? spentFromHistory : (spentFromHistory > 0 ? spentFromHistory : Math.max(0, allocated - parseFloat(cat.balance || 0)));
              const remaining = Math.max(0, allocated - spent);
              const spentPct = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;

              return (
                <div key={cat.id} style={{
                  minWidth: 300,
                  maxWidth: 320,
                  flexShrink: 0,
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  gap: 14
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>{cat.name}</h3>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: 20,
                        background: cat.branch ? '#EFF6FF' : '#F8FAFC',
                        color: cat.branch ? '#1D4ED8' : '#475569',
                        border: `1px solid ${cat.branch ? '#BFDBFE' : '#E2E8F0'}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <Building2 style={{ width: 11, height: 11 }} />
                        {cat.branch && cat.branch !== 'ALL' ? cat.branch : (branchFilter !== 'ALL' ? branchFilter : t('expenses.all_branches', 'All Branches / Central'))}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', fontWeight: 400, marginBottom: 4 }}>
                        <span>{t('fin.spent_label', 'Spent')}: ₹{fmt(spent)} ({spentPct}%)</span>
                        <span>{t('fin.remaining_label', 'Remaining')}: <strong style={{ fontWeight: 600, color: remaining > 0 ? 'var(--brand-primary, #15803D)' : '#DC2626' }}>₹{fmt(remaining)}</strong></span>
                      </div>
                      <div style={{ height: 6, width: '100%', background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${spentPct}%`, background: spentPct > 85 ? '#DC2626' : spentPct > 60 ? '#D97706' : 'var(--brand-primary, #15803D)', borderRadius: 99, transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.64rem', color: '#64748B', textTransform: 'uppercase', display: 'block', fontWeight: 500 }}>{t('col.total_allocated', 'Total Budget Allocated')}</span>
                      <strong style={{ fontSize: '0.88rem', color: '#0F172A', fontWeight: 600 }}>₹{fmt(allocated)}</strong>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 400 }}>
                      <span>{historyList.length} {t('fin.transactions_label', 'transactions')}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Split Side-by-Side Panel Architecture */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, marginTop: 20, marginBottom: 24 }}>
        {/* LEFT PANEL: Branch Category Budget Breakdown Table */}
        <div className="loans-table-card" style={{ margin: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wallet style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0F172A' }}>{t('expenses.budget_breakdown_title', 'Branch Category Budget Breakdown')}</span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="fin-grid-table" style={{ fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center', fontWeight: 600 }}>#</th>
                  <th style={{ fontWeight: 600 }}>{t('col.category', 'Category')}</th>
                  <th style={{ textAlign: 'right', fontWeight: 600 }}>{t('col.allocated', 'Allocated')}</th>
                  <th style={{ textAlign: 'right', fontWeight: 600 }}>{t('col.remaining', 'Remaining')}</th>
                  <th style={{ textAlign: 'right', fontWeight: 600 }}>{t('col.spent', 'Spent')}</th>
                </tr>
              </thead>
              <tbody>
                {displayCategories.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24, color: '#94A3B8', fontWeight: 400 }}>{t('expenses.no_categories_found', 'No categories available.')}</td></tr>
                ) : (
                  displayCategories.map((c, idx) => {
                    const allocated = parseFloat(c.allocated_total || c.amount || 0);
                    const historyList = categorySpends[String(c.id)] || categorySpends[c.id] || [];
                    const spentFromHistory = historyList.reduce((sum, v) => sum + Number(v.amount || 0), 0);
                    const spent = (branchFilter !== 'ALL') ? spentFromHistory : (spentFromHistory > 0 ? spentFromHistory : Math.max(0, allocated - parseFloat(c.balance || 0)));
                    const remaining = Math.max(0, allocated - spent);

                    return (
                      <tr key={c.id}>
                        <td style={{ textAlign: 'center', color: '#64748B', fontWeight: 400 }}>{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#0F172A', fontWeight: 500 }}>{c.name}</span>
                            <span style={{ fontSize: '0.68rem', color: '#64748B' }}>{c.branch && c.branch !== 'ALL' ? c.branch : (branchFilter !== 'ALL' ? branchFilter : t('expenses.all_branches', 'All Branches / Central'))}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500, color: '#0F172A' }}>₹{fmt(allocated)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 500, color: remaining > 0 ? 'var(--brand-primary, #15803D)' : '#DC2626' }}>₹{fmt(remaining)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 500, color: '#C2410C' }}>₹{fmt(spent)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT PANEL: Detailed Expense Voucher Spending History Table */}
        <div className="loans-table-card" style={{ margin: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <History style={{ width: 16, height: 16, color: '#C2410C' }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0F172A' }}>{t('expenses.voucher_history_title', 'Voucher Debited Spending History')}</span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="fin-grid-table" style={{ fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center', fontWeight: 600 }}>#</th>
                  <th style={{ fontWeight: 600 }}>{t('col.voucher_no', 'Voucher No')}</th>
                  <th style={{ fontWeight: 600 }}>{t('col.category', 'Category')}</th>
                  <th style={{ fontWeight: 600 }}>{t('col.date', 'Date')}</th>
                  <th style={{ textAlign: 'right', fontWeight: 600 }}>{t('col.amount', 'Amount (₹)')}</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const allSpends = [];
                  Object.values(categorySpends).forEach(list => {
                    allSpends.push(...list);
                  });
                  allSpends.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

                  if (allSpends.length === 0) {
                    return (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: 24, color: '#94A3B8', fontWeight: 400 }}>
                          {t('expenses.no_vouchers_recorded', `No expense voucher debits recorded for ${branchFilter === 'ALL' ? 'any branch' : branchFilter} yet.`)}
                        </td>
                      </tr>
                    );
                  }

                  return allSpends.map((v, idx) => (
                    <tr key={v.id || idx}>
                      <td style={{ textAlign: 'center', color: '#64748B', fontWeight: 400 }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ color: '#0F172A', fontWeight: 600, fontSize: '0.78rem' }}>{v.voucher_no}</strong>
                          <span style={{ fontSize: '0.68rem', color: '#64748B' }}>{v.narration}</span>
                          {branchFilter === 'ALL' && v.branch && (
                            <span style={{ fontSize: '0.65rem', color: '#0369A1', fontWeight: 500 }}>{t('fin.branch_label', 'Branch')}: {v.branch}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500, color: '#0F172A' }}>{v.category_name}</span>
                      </td>
                      <td style={{ color: '#475569', fontSize: '0.74rem' }}>{v.date}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#C2410C' }}>₹{fmt(v.amount)}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CreateExpenseVoucherModal
        isOpen={isVoucherModalOpen}
        defaultBranch={branchFilter !== 'ALL' ? branchFilter : (branchesList[0]?.name || '')}
        categories={scopedCategories}
        branchesList={branchesList}
        employees={employees}
        onClose={() => setIsVoucherModalOpen(false)}
        onSubmit={onCreateExpenseVoucher || (async (payload) => {
          // Fallback direct endpoint call if prop not supplied
          const res = await window.fetch('/api/v1/finance/expenses/vouchers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.message || 'Failed to create expense voucher');
          window.location.reload();
        })}
      />
    </div>
  );
}
