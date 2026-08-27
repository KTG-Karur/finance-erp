import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileDown,
  FileSpreadsheet,
  Receipt
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { exportToExcel } from '../utils/excelExport';
import ReportPreviewModal from '../components/ReportPreviewModal';
import DropdownSelect from '../components/DropdownSelect';
import SharedDatePicker from '../components/common/SharedDatePicker';

function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return '—';
  const cleanStr = String(dateStr).slice(0, 10);
  const parts = cleanStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export default function ExpenseReportView({
  expenseCategories = [],
  expenseVouchers = [],
  branchesList = [],
  employees = [],
  tenant,
  user,
  selectedBranch = 'ALL'
}) {
  const { t } = useLanguage();

  const [branchFilter, setBranchFilter] = useState(() => (selectedBranch && selectedBranch !== 'ALL' ? selectedBranch : 'ALL'));
  useEffect(() => {
    setBranchFilter(selectedBranch && selectedBranch !== 'ALL' ? selectedBranch : 'ALL');
  }, [selectedBranch]);

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [datePreset, setDatePreset] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedDates, setAppliedDates] = useState({ from: '', to: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const pageSize = 10;

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const getTodayISO = () => new Date().toISOString().slice(0, 10);
  const getDaysAgoISO = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  };
  const getFirstDayOfMonthISO = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  };

  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    setCurrentPage(1);
    if (preset === 'TODAY') {
      const today = getTodayISO();
      setFromDate(today);
      setToDate(today);
      setAppliedDates({ from: today, to: today });
    } else if (preset === '7D') {
      const from = getDaysAgoISO(6);
      const to = getTodayISO();
      setFromDate(from);
      setToDate(to);
      setAppliedDates({ from, to });
    } else if (preset === 'MONTH') {
      const from = getFirstDayOfMonthISO();
      const to = getTodayISO();
      setFromDate(from);
      setToDate(to);
      setAppliedDates({ from, to });
    } else if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
      setAppliedDates({ from: '', to: '' });
    }
  };

  const handleApplyFilter = (e) => {
    e.preventDefault();
    setAppliedDates({ from: fromDate, to: toDate });
    setCurrentPage(1);
  };

  // Map category IDs to names
  const categoryMap = useMemo(() => {
    const map = {};
    (expenseCategories || []).forEach(c => {
      map[c.id] = c.name;
    });
    return map;
  }, [expenseCategories]);

  // Filtered expenses
  const filteredVouchers = useMemo(() => {
    return (expenseVouchers || []).filter(v => {
      // Branch filter
      if (branchFilter !== 'ALL') {
        const vBranch = v.branch || v.branch_name || v.company_branch;
        if (vBranch) {
          if (vBranch.trim().toLowerCase() !== branchFilter.trim().toLowerCase()) return false;
        } else {
          const cat = (expenseCategories || []).find(c => String(c.id) === String(v.expense_category_id || v.category_id));
          if (cat && cat.branch && cat.branch !== 'ALL' && cat.branch !== 'All Branches') {
            const bList = String(cat.branch).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            if (bList.length > 0 && !bList.includes(branchFilter.trim().toLowerCase())) {
              return false;
            }
          }
        }
      }

      // Category filter
      if (categoryFilter !== 'ALL') {
        const catName = categoryMap[v.expense_category_id || v.category_id] || v.category_name || v.category;
        if (String(v.expense_category_id || v.category_id) !== String(categoryFilter) && catName !== categoryFilter) {
          return false;
        }
      }

      // Date Range Filter
      const vDate = v.date || v.voucher_date || v.created_at?.slice(0, 10) || '';
      if (appliedDates.from && vDate < appliedDates.from) return false;
      if (appliedDates.to && vDate > appliedDates.to) return false;

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const catName = (categoryMap[v.expense_category_id || v.category_id] || v.category_name || '').toLowerCase();
        const voucherNo = (v.voucher_no || '').toLowerCase();
        const staff = (v.created_by || v.staff_name || '').toLowerCase();
        const narration = (v.narration || v.notes || '').toLowerCase();
        const branch = (v.branch || '').toLowerCase();

        const match = voucherNo.includes(q) ||
          catName.includes(q) ||
          staff.includes(q) ||
          narration.includes(q) ||
          branch.includes(q) ||
          String(v.amount).includes(q);

        if (!match) return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = a.date || a.voucher_date || a.created_at || '';
      const dateB = b.date || b.voucher_date || b.created_at || '';
      return dateB.localeCompare(dateA);
    });
  }, [expenseVouchers, branchFilter, categoryFilter, appliedDates, searchQuery, categoryMap]);

  // Aggregate Metrics
  const totalSpent = useMemo(() => {
    return filteredVouchers.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
  }, [filteredVouchers]);

  const totalAllocatedBudget = useMemo(() => {
    const relevantCategories = (expenseCategories || []).filter(c => {
      if (branchFilter !== 'ALL' && c.branch && c.branch !== branchFilter) return false;
      if (categoryFilter !== 'ALL' && String(c.id) !== String(categoryFilter) && c.name !== categoryFilter) return false;
      return true;
    });
    return relevantCategories.reduce((sum, c) => sum + (parseFloat(c.allocated_amount || c.total_funds || c.balance || 0)), 0);
  }, [expenseCategories, branchFilter, categoryFilter]);

  const categoryBreakdown = useMemo(() => {
    const breakdown = {};
    filteredVouchers.forEach(v => {
      const name = categoryMap[v.expense_category_id || v.category_id] || v.category_name || v.category || 'General Operating';
      breakdown[name] = (breakdown[name] || 0) + (parseFloat(v.amount) || 0);
    });
    return Object.entries(breakdown)
      .map(([name, amount]) => ({ name, amount, percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredVouchers, categoryMap, totalSpent]);

  // Pagination
  const totalPages = Math.ceil(filteredVouchers.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedVouchers = filteredVouchers.slice(startIndex, startIndex + pageSize);

  // CSV Export & Print Setup
  const PDF_COLUMNS = [
    { label: 'Voucher No' },
    { label: 'Date' },
    { label: 'Branch' },
    { label: 'Expense Category' },
    { label: 'Spent By / Staff' },
    { label: 'Narration / Description' },
    { label: 'Payment Mode' },
    { label: 'Amount (₹)', align: 'right' }
  ];

  const buildRows = () => filteredVouchers.map(v => [
    v.voucher_no || `EXP-${v.id}`,
    formatDateDDMMYYYY(v.date || v.voucher_date || v.created_at),
    v.branch || 'Main Branch',
    categoryMap[v.expense_category_id || v.category_id] || v.category_name || v.category || 'Operating Expense',
    v.created_by || v.staff_name || 'Staff',
    v.narration || v.notes || '—',
    v.payment_mode || 'CASH',
    fmt(v.amount)
  ]);

  const handleExportExcel = () => {
    exportToExcel({
      filename: `expense-report-${branchFilter || 'all'}-${getTodayISO()}.xls`,
      sheetName: 'Expenses',
      reportTitle: 'Expense & Operating Expenditure Report',
      companyName: tenant?.company_name || 'KTG Finance',
      filters: {
        'Branch': branchFilter === 'ALL' ? 'All Branches' : branchFilter,
        'Category': categoryFilter === 'ALL' ? 'All Categories' : categoryFilter,
        'From Date': appliedDates.from ? formatDateDDMMYYYY(appliedDates.from) : 'All Time',
        'To Date': appliedDates.to ? formatDateDDMMYYYY(appliedDates.to) : 'All Time'
      },
      headers: PDF_COLUMNS,
      rows: buildRows(),
      totalsRow: ['Total Expenses', '', '', '', '', '', '', fmt(totalSpent)]
    });
  };

  const previewProps = {
    company: tenant,
    reportTitle: 'Expense & Operating Expenditure Report',
    reportSubtitle: 'Branch-wise and category-wise audit of operational expenditures',
    filters: {
      'Branch': branchFilter === 'ALL' ? 'All Branches' : branchFilter,
      'Category': categoryFilter === 'ALL' ? 'All Categories' : categoryFilter,
      'From Date': appliedDates.from ? formatDateDDMMYYYY(appliedDates.from) : 'All Time',
      'To Date': appliedDates.to ? formatDateDDMMYYYY(appliedDates.to) : 'All Time'
    },
    totalsRow: ['Total Expenses', '', '', '', '', '', '', fmt(totalSpent)],
    columns: PDF_COLUMNS,
    rows: buildRows(),
    generatedBy: user?.name
  };

  return (
    <div className="fin-page fin-report-page">
      {/* ── Standard ERP Header Card ──────────────────────────────── */}
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: '#FFF7ED', border: '1px solid #FFEDD5', color: '#EA580C' }}>
              <TrendingDown style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('exp_report.title', 'Expense Report')}</h1>
              <p className="fin-page-header__subtitle">
                {t('exp_report.subtitle', 'Track and reconcile organizational expenses, branch allocations, and operational spends')}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="fin-btn-primary"
              style={{ background: '#475569' }}
              onClick={() => setShowPreview(true)}
              disabled={filteredVouchers.length === 0}
            >
              <Printer style={{ width: 14, height: 14 }} />
              <span>{t('fin.print_btn', 'Print')}</span>
            </button>
            <button
              type="button"
              className="fin-btn-primary"
              style={{ background: '#475569' }}
              onClick={() => setShowPreview(true)}
              disabled={filteredVouchers.length === 0}
            >
              <FileDown style={{ width: 14, height: 14 }} />
              <span>{t('fin.export_pdf_btn', 'Export PDF')}</span>
            </button>
            <button
              type="button"
              className="fin-btn-primary"
              onClick={handleExportExcel}
              disabled={filteredVouchers.length === 0}
            >
              <FileSpreadsheet style={{ width: 14, height: 14 }} />
              <span>{t('fin.export_excel', 'Export Excel')}</span>
            </button>
          </div>
        </div>

        {/* ── Standard ERP Stat Badges ─────────────────────────────── */}
        <div className="fin-header-stats">
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('exp_report.total_spent', 'Total Incurred Expenses')}:</span>
            <span className="fin-header-stat__value fin-header-stat__value--bad">₹{fmt(totalSpent)}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('expenses.total_allocated', 'Allocated Category Budget')}:</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">₹{fmt(totalAllocatedBudget)}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('exp_report.top_category', 'Top Category')}:</span>
            <span className="fin-header-stat__value" style={{ fontWeight: 600, color: '#C2410C' }}>
              {categoryBreakdown[0] ? `${categoryBreakdown[0].name} (₹${fmt(categoryBreakdown[0].amount)})` : '—'}
            </span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('exp_report.vouchers_count', 'Recorded Vouchers')}:</span>
            <span className="fin-header-stat__value">{filteredVouchers.length}</span>
          </div>
        </div>
      </div>

      {/* ── Category Breakdown Quick Filter ───────────────────────── */}
      {categoryBreakdown.length > 0 && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: '#64748B', fontWeight: 700 }}>
            {t('expenses.modal_cat_label', 'Category Spend')}:
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {categoryBreakdown.map(item => (
              <button
                key={item.name}
                type="button"
                onClick={() => { setCategoryFilter(categoryFilter === item.name ? 'ALL' : item.name); setCurrentPage(1); }}
                style={{
                  background: categoryFilter === item.name ? 'var(--brand-primary, #15803D)' : '#F8FAFC',
                  color: categoryFilter === item.name ? '#FFFFFF' : '#334155',
                  border: `1px solid ${categoryFilter === item.name ? 'var(--brand-primary, #15803D)' : '#E2E8F0'}`,
                  borderRadius: 6,
                  padding: '3px 9px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>{item.name}</span>
                <span style={{ opacity: 0.9, fontWeight: 700 }}>₹{fmt(item.amount)}</span>
                <span style={{ fontSize: '0.65rem', opacity: 0.75 }}>({item.percentage.toFixed(0)}%)</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Standard ERP Filter Bar ───────────────────────────────── */}
      <form className="fin-filterbar" onSubmit={handleApplyFilter}>
        <div className="fin-field">
          <label>{t('fin.branch_label', 'Branch')}</label>
          <DropdownSelect
            value={branchFilter}
            onChange={e => { setBranchFilter(e.target.value); setCurrentPage(1); }}
            disabled={Boolean(selectedBranch && selectedBranch !== 'ALL')}
            buttonStyle={{ height: 36, minWidth: 160 }}
            options={[
              { value: 'ALL', label: t('expenses.all_branches', 'All Branches') },
              ...(branchesList || []).map(b => ({ value: b.name, label: b.name }))
            ]}
          />
        </div>

        <div className="fin-field">
          <label>{t('expenses.modal_cat_label', 'Expense Category')}</label>
          <DropdownSelect
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            buttonStyle={{ height: 36, minWidth: 170 }}
            options={[
              { value: 'ALL', label: t('expenses.all_categories', 'All Categories') },
              ...(expenseCategories || []).map(c => ({ value: c.name, label: c.name }))
            ]}
          />
        </div>

        <div className="fin-field">
          <label>{t('fin.from_date_label', 'From Date')}</label>
          <SharedDatePicker
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); setDatePreset('CUSTOM'); }}
            buttonStyle={{ height: 36, minWidth: 140 }}
          />
        </div>

        <div className="fin-field">
          <label>{t('fin.to_date_label', 'To Date')}</label>
          <SharedDatePicker
            value={toDate}
            onChange={e => { setToDate(e.target.value); setDatePreset('CUSTOM'); }}
            buttonStyle={{ height: 36, minWidth: 140 }}
          />
        </div>

        <div className="fin-field" style={{ minWidth: 200, flex: '1 1 200px' }}>
          <label>{t('fin.search_label', 'Find Expenses')}</label>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 9, top: 11, width: 14, height: 14, color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              type="text"
              className="fin-input"
              style={{ width: '100%', paddingLeft: 30 }}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder={t('expenses.search_placeholder', 'Search voucher #, staff, narration...')}
            />
          </div>
        </div>

        <button type="submit" className="fin-search-btn">
          {t('fin.search_btn', 'Search')}
        </button>

        {/* Quick Date Presets */}
        <div className="fin-quickrow">
          <span className="fin-quickrow__label">{t('fin.quick_label', 'Quick:')}</span>
          <button
            type="button"
            className={`fin-quick-pill ${datePreset === 'ALL' ? 'fin-quick-pill--active' : ''}`}
            onClick={() => handleDatePresetChange('ALL')}
          >
            {t('fin.quick_all', 'All Time')}
          </button>
          <button
            type="button"
            className={`fin-quick-pill ${datePreset === 'TODAY' ? 'fin-quick-pill--active' : ''}`}
            onClick={() => handleDatePresetChange('TODAY')}
          >
            {t('fin.quick_today', 'Today')}
          </button>
          <button
            type="button"
            className={`fin-quick-pill ${datePreset === '7D' ? 'fin-quick-pill--active' : ''}`}
            onClick={() => handleDatePresetChange('7D')}
          >
            {t('fin.quick_7d', 'Last 7 Days')}
          </button>
          <button
            type="button"
            className={`fin-quick-pill ${datePreset === 'MONTH' ? 'fin-quick-pill--active' : ''}`}
            onClick={() => handleDatePresetChange('MONTH')}
          >
            {t('fin.quick_month', 'This Month')}
          </button>
        </div>
      </form>

      {/* ── Table Container ───────────────────────────────────────── */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
        <table className="fin-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
              <th style={{ width: 45, textAlign: 'center', padding: '10px 8px' }}>#</th>
              <th style={{ textAlign: 'left', width: 140, padding: '10px 12px' }}>{t('col.voucher_no', 'Voucher No')}</th>
              <th style={{ textAlign: 'left', width: 110, padding: '10px 12px' }}>{t('col.date', 'Date')}</th>
              <th style={{ textAlign: 'left', width: 130, padding: '10px 12px' }}>{t('fin.branch_label', 'Branch')}</th>
              <th style={{ textAlign: 'left', width: 160, padding: '10px 12px' }}>{t('col.category', 'Expense Category')}</th>
              <th style={{ textAlign: 'left', width: 140, padding: '10px 12px' }}>{t('fin.employee_name_label', 'Spent By / Staff')}</th>
              <th style={{ textAlign: 'left', padding: '10px 12px' }}>{t('fin.narration_label', 'Narration / Description')}</th>
              <th style={{ textAlign: 'center', width: 100, padding: '10px 12px' }}>{t('fin.mode_label', 'Payment Mode')}</th>
              <th style={{ textAlign: 'right', width: 130, padding: '10px 14px' }}>{t('col.amount', 'Amount (₹)')}</th>
            </tr>
          </thead>
          <tbody>
            {pagedVouchers.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>
                  <Receipt style={{ width: 36, height: 36, color: '#CBD5E1', margin: '0 auto 8px auto', display: 'block' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B', display: 'block' }}>No expense records found</span>
                  <span style={{ fontSize: '0.74rem' }}>Try adjusting your filters or date range</span>
                </td>
              </tr>
            ) : (
              pagedVouchers.map((v, idx) => {
                const catName = categoryMap[v.expense_category_id || v.category_id] || v.category_name || v.category || 'General Operating';
                const voucherDate = v.date || v.voucher_date || v.created_at;

                return (
                  <tr key={v.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ textAlign: 'center', color: '#94A3B8', padding: '10px 8px' }}>{startIndex + idx + 1}</td>
                    <td style={{ fontWeight: 600, color: '#EA580C', fontFamily: 'monospace', padding: '10px 12px' }}>
                      {v.voucher_no || `EXP-${v.id}`}
                    </td>
                    <td style={{ color: '#0F172A', padding: '10px 12px' }}>
                      {formatDateDDMMYYYY(voucherDate)}
                    </td>
                    <td style={{ color: '#334155', padding: '10px 12px' }}>
                      {v.branch || 'Main Branch'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FFEDD5', padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: '0.72rem' }}>
                        {catName}
                      </span>
                    </td>
                    <td style={{ color: '#0F172A', fontWeight: 500, padding: '10px 12px' }}>
                      {v.created_by || v.staff_name || 'Staff'}
                    </td>
                    <td style={{ color: '#475569', maxWidth: 260, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', padding: '10px 12px' }} title={v.narration || v.notes}>
                      {v.narration || v.notes || '—'}
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                      <span style={{ background: '#F1F5F9', color: '#334155', padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600 }}>
                        {v.payment_mode || 'CASH'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F172A', fontSize: '0.84rem', padding: '10px 14px' }}>
                      ₹{fmt(v.amount)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredVouchers.length > 0 && (
            <tfoot>
              <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0', fontWeight: 700 }}>
                <td colSpan="8" style={{ textAlign: 'right', padding: '12px 14px', color: '#0F172A', fontSize: '0.82rem' }}>
                  Total Expenses:
                </td>
                <td style={{ textAlign: 'right', padding: '12px 14px', color: '#EA580C', fontSize: '0.94rem' }}>
                  ₹{fmt(totalSpent)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* ── Table Pagination ──────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
            Showing <strong>{filteredVouchers.length === 0 ? 0 : startIndex + 1}</strong> to <strong>{Math.min(startIndex + pageSize, filteredVouchers.length)}</strong> of <strong>{filteredVouchers.length}</strong> records
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, padding: '4px 10px', fontSize: '0.74rem', cursor: safePage === 1 ? 'not-allowed' : 'pointer', opacity: safePage === 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <ChevronLeft style={{ width: 14, height: 14 }} />
              <span>Prev</span>
            </button>
            <span style={{ fontSize: '0.74rem', color: '#475569', padding: '0 6px' }}>
              Page {safePage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, padding: '4px 10px', fontSize: '0.74rem', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', opacity: safePage === totalPages ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <span>Next</span>
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Report Print / PDF Modal ───────────────────────────────── */}
      {showPreview && (
        <ReportPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          {...previewProps}
        />
      )}
    </div>
  );
}
