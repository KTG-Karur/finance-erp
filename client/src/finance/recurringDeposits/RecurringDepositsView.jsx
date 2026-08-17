import React, { useState, useEffect } from 'react';
import {
  Landmark, Plus, X, AlertTriangle, CheckCircle2, LogOut, ArrowLeft,
  UserCheck, ChevronLeft, ChevronRight, Search, CalendarClock, Wallet,
  CheckSquare, Square, Receipt, Check, History
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import SharedDropdown from '../../components/common/SharedDropdown';
import TransactionHistoryModal from '../../components/TransactionHistoryModal';

const FORM_MAX_WIDTH = 780;

// Standard "simple interest" Recurring Deposit maturity formula used by
// Indian banks/post offices — easy for staff to explain to a customer:
// Interest = P × n × (n+1) × r / (2 × 12 × 100), where P = monthly
// installment, n = tenure in months, r = annual interest rate (%).
function computeRdMaturity(monthlyInstallment, tenureMonths, annualRate) {
  const p = parseFloat(monthlyInstallment) || 0;
  const n = parseFloat(tenureMonths) || 0;
  const r = parseFloat(annualRate) || 0;
  const totalDeposited = p * n;
  const interest = (p * n * (n + 1) * r) / (2 * 12 * 100);
  return Math.round(totalDeposited + interest);
}

function ErrorBanner({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 9, fontSize: '0.78rem', fontWeight: 600, background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', color: 'var(--color-danger-hover, #B91C1C)' }}>
      <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  );
}

// ── Full-screen "Book New Recurring Deposit" form — customer, monthly
// installment, tenure and interest rate are all free-entry per account
// (no scheme master), so every RD is naturally customised to the client.
function BookRdScreen({ borrowers, onCancel, onSubmit }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    borrower_id: '',
    monthly_installment: '',
    tenure_months: 12,
    interest_rate: 8,
    payment_mode: 'CASH',
    notes: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // `loading` alone isn't enough to block a second click: React state updates
  // aren't synchronous, so two clicks fired close together (exactly what
  // happens when someone impatiently re-clicks Submit during a slow/flaky
  // connection) can both read `loading === false` before the first click's
  // setLoading(true) has actually committed, letting both requests through —
  // this is what created 3 duplicate RD accounts from 3 clicks. A ref is
  // checked-and-set synchronously, closing that gap.
  const submittingRef = React.useRef(false);

  const setField = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const maturityValue = computeRdMaturity(form.monthly_installment, form.tenure_months, form.interest_rate);
  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const selectedCustomer = borrowers.find(b => b.id === Number(form.borrower_id));

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (submittingRef.current) return;
    if (!form.borrower_id) { setError(t('rd.modal.select_customer_error')); return; }
    submittingRef.current = true;
    setLoading(true);
    setError('');
    try {
      const bookingDate = new Date();
      const maturityDate = new Date(bookingDate);
      maturityDate.setMonth(maturityDate.getMonth() + Number(form.tenure_months));
      await onSubmit({
        borrower_id: Number(form.borrower_id),
        customer_name: selectedCustomer?.full_name || 'Unknown',
        branch: selectedCustomer?.branch || null,
        monthly_installment: parseFloat(form.monthly_installment),
        tenure_months: Number(form.tenure_months),
        interest_rate: parseFloat(form.interest_rate),
        payment_mode: form.payment_mode,
        notes: form.notes,
        booking_date: bookingDate.toISOString().slice(0, 10),
        maturity_date: maturityDate.toISOString().slice(0, 10),
        maturity_value: maturityValue
      });
    } catch (err) {
      setError(err?.response?.data?.message || t('rd.modal.save_error'));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="customer-form-page mnc-form-root" style={{ maxWidth: FORM_MAX_WIDTH }}>
      <div className="cf-page-header">
        <div className="cf-header-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="cf-back-btn" onClick={onCancel}>
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>{t('rd.register_title')}</h1>
        </div>
        <div className="cf-header-right">
          <button type="button" onClick={onCancel} className="btn-cancel" disabled={loading}>{t('btn.cancel')}</button>
          <button type="submit" onClick={handleSubmit} disabled={loading} className="btn-submit">
            {loading ? t('rd.saving') : t('rd.modal.submit')}
          </button>
        </div>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <form onSubmit={handleSubmit} className="cf-wizard-body">
        <div className="cf-step-pane" style={{ padding: '20px 22px', gap: 16 }}>
          <div className="cf-pane-title" style={{ paddingBottom: 12 }}>
            <Landmark style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
            <div>
              <h3>{t('rd.section_details_title')}</h3>
              <p>{t('rd.section_details_subtitle')}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>{t('rd.modal.customer_label')}</label>
              <SharedDropdown
                required
                value={form.borrower_id}
                onChange={e => setField('borrower_id', e.target.value)}
                placeholder={t('rd.modal.select_customer') || '— Select Customer —'}
                searchable
                options={borrowers.map(b => ({
                  value: b.id,
                  label: `${b.full_name} (${b.borrower_code}) — ${b.branch}`
                }))}
              />
            </div>
          </div>

          <div className="form-row form-row--3">
            <div className="form-group">
              <label>{t('rd.modal.installment_label')}</label>
              <input type="number" min="100" step="100" required value={form.monthly_installment} onChange={e => setField('monthly_installment', e.target.value)} className="input-control mono" placeholder="e.g. 1000" />
            </div>
            <div className="form-group">
              <label>{t('rd.modal.tenure_label')}</label>
              <input type="number" min="3" max="60" required value={form.tenure_months} onChange={e => setField('tenure_months', e.target.value)} className="input-control mono" placeholder="e.g. 12" />
            </div>
            <div className="form-group">
              <label>{t('rd.modal.rate_label')}</label>
              <input type="number" step="0.1" min="0" max="100" required value={form.interest_rate} onChange={e => setField('interest_rate', e.target.value)} className="input-control mono" placeholder="e.g. 8" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('rd.payment_mode_label')}</label>
              <SharedDropdown
                value={form.payment_mode}
                onChange={e => setField('payment_mode', e.target.value)}
                options={[
                  { value: 'CASH', label: t('fin.mode_cash') },
                  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                  { value: 'UPI', label: 'UPI' },
                  { value: 'CHEQUE', label: 'Cheque' }
                ]}
              />
            </div>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', textTransform: 'uppercase' }}>{t('col.maturity_date')}</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--color-info, #2563EB)' }}>{form.tenure_months ? `${form.tenure_months} ${t('rd.modal.months_from_booking')}` : '—'}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', textTransform: 'uppercase' }}>{t('col.maturity_value')}</span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--brand-primary, #15803D)' }}>₹{fmt(maturityValue)}</strong>
            </div>
          </div>
        </div>

        <div className="cf-step-pane" style={{ padding: '20px 22px', gap: 16 }}>
          <div className="cf-pane-title" style={{ paddingBottom: 12 }}>
            <UserCheck style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
            <div>
              <h3>{t('rd.section_notes_title')}</h3>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>{t('rd.notes_label')}</label>
              <textarea rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} className="input-control" style={{ height: 'auto', padding: '10px 12px' }} placeholder={t('rd.notes_placeholder')} />
            </div>
          </div>
        </div>

        <div className="cf-wizard-footer">
          <button type="button" onClick={onCancel} className="btn-cancel" disabled={loading}>{t('btn.cancel')}</button>
          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? t('rd.saving') : t('rd.modal.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}

function statusBadgeCls(status) {
  if (status === 'ACTIVE') return 'fin-badge fin-badge--ok';
  if (status === 'CLOSED_PREMATURE') return 'fin-badge fin-badge--warn';
  return 'fin-badge';
}

function ActionPill({ icon, label, onClick, tone = 'neutral', disabled = false }) {
  const tones = {
    neutral: { bg: '#FFFFFF', border: '#E2E8F0', color: '#334155' },
    good: { bg: 'var(--brand-primary-light, #F0FEF5)', border: 'var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)' },
    bad: { bg: 'var(--color-danger-light, #FEF2F2)', border: 'var(--color-danger-border, #FECACA)', color: 'var(--color-danger, #DC2626)' }
  };
  const c = disabled ? { bg: '#F1F5F9', border: '#E2E8F0', color: '#94A3B8' } : tones[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
        border: `1px solid ${c.border}`, background: c.bg, color: c.color,
        borderRadius: 6, padding: '4px 9px', fontSize: '0.7rem', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer'
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StatusTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid #E2E8F0' }}>
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 4px', marginBottom: -1,
              border: 'none', borderBottom: isActive ? '2px solid var(--brand-primary, #15803D)' : '2px solid transparent',
              background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '0.8rem', fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--brand-primary, #15803D)' : '#64748B', marginRight: 18
            }}
          >
            <span>{tab.label}</span>
            <span style={{
              fontSize: '0.68rem', fontWeight: 700, borderRadius: 999, padding: '1px 7px',
              background: isActive ? 'var(--brand-primary-light, #F0FEF5)' : '#F1F5F9',
              color: isActive ? 'var(--brand-primary, #15803D)' : '#94A3B8'
            }}>{tab.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function Pagination({ page, setPage, totalPages, total, startIndex, pageSize }) {
  return (
    <div className="table-pagination">
      <div className="table-pagination__info">
        Showing <strong>{total === 0 ? 0 : startIndex + 1}</strong> to <strong>{Math.min(startIndex + pageSize, total)}</strong> of <strong>{total}</strong> entries
      </div>
      <div className="table-pagination__controls">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
          <ChevronLeft style={{ width: 14, height: 14 }} />
          <span>Previous</span>
        </button>
        <span className="page-indicator">Page {page} of {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
          <span>Next</span>
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}

export default function RecurringDepositsView({
  recurringDeposits = [],
  borrowers = [],
  tenant,
  branchesList = [],
  selectedBranch = 'ALL',
  bankAccounts = [],
  journalEntries = [],
  onCreateRd,
  onCollectInstallment,
  onMatureRd,
  onPrematureCloseRd
}) {
  const { t, tStatus } = useLanguage();
  const [screen, setScreen] = useState('LIST'); // 'LIST' | 'BOOK'
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'MATURE'|'PREMATURE', rd }
  const [scheduleRd, setScheduleRd] = useState(null);
  const [historyRd, setHistoryRd] = useState(null);
  // Quick single-tap collection — enter the next due installment straight from
  // the table row, the same "pick account, hit collect" shape as Daily
  // Collections, instead of requiring staff to open the full month-by-month
  // schedule modal just to pay the one installment that's actually due next.
  const [collectRd, setCollectRd] = useState(null);
  const [statusTab, setStatusTab] = useState('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Branch filter (derived via the linked borrower's branch — RDs don't carry
  // their own branch field) — locked/forced by the sidebar's global control.
  const [branchFilter, setBranchFilter] = useState('ALL');
  useEffect(() => {
    if (selectedBranch && selectedBranch !== 'ALL') setBranchFilter(selectedBranch);
  }, [selectedBranch]);
  const borrowerBranch = (rd) => borrowers.find(b => b.id === rd.borrower_id)?.branch;
  const pageSize = 8;

  const [customPayoutAmount, setCustomPayoutAmount] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  if (screen === 'BOOK') {
    return (
      <BookRdScreen
        borrowers={borrowers}
        onCancel={() => setScreen('LIST')}
        onSubmit={async (payload) => { await onCreateRd(payload); setScreen('LIST'); }}
      />
    );
  }

  const branchScopedRds = branchFilter === 'ALL' ? recurringDeposits : recurringDeposits.filter(r => borrowerBranch(r) === branchFilter);

  const totalDeposited = branchScopedRds.reduce((acc, r) => acc + (r.status === 'ACTIVE' ? r.monthly_installment * r.tenure_months : 0), 0);
  const totalMaturityLiability = branchScopedRds.reduce((acc, r) => acc + (r.status === 'ACTIVE' ? r.maturity_value : 0), 0);
  const activeCount = branchScopedRds.filter(r => r.status === 'ACTIVE').length;

  const byTab = branchScopedRds.filter(r => r.status === statusTab);
  const filteredRds = byTab.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    return !q || r.rd_account_no.toLowerCase().includes(q) || r.customer_name.toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filteredRds.length / pageSize) || 1;
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedRds = filteredRds.slice(startIndex, startIndex + pageSize);

  const tabCount = (id) => branchScopedRds.filter(r => r.status === id).length;

  return (
    <div className="fin-page">
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)' }}>
              <Landmark style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('rd.title')}</h1>
              <p className="fin-page-header__subtitle">{t('rd.subtitle')}</p>
            </div>
          </div>
          <button type="button" className="fin-btn-primary" onClick={() => setScreen('BOOK')} disabled={!borrowers.length}>
            <Plus style={{ width: 14, height: 14 }} />
            <span>{t('rd.book_new')}</span>
          </button>
        </div>

        <div className="fin-header-stats">
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('rd.total_deposited')}</span>
            <span className="fin-header-stat__value">₹{fmt(totalDeposited)}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('rd.active_accounts')}</span>
            <span className="fin-header-stat__value">{activeCount}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('rd.total_maturity_liability')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">₹{fmt(totalMaturityLiability)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <StatusTabs
          tabs={[
            { id: 'ACTIVE', label: t('fin.status_active'), count: tabCount('ACTIVE') },
            { id: 'MATURED', label: tStatus('MATURED'), count: tabCount('MATURED') },
            { id: 'CLOSED_PREMATURE', label: tStatus('CLOSED_PREMATURE'), count: tabCount('CLOSED_PREMATURE') }
          ]}
          active={statusTab}
          onChange={(id) => { setStatusTab(id); setPage(1); }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SharedDropdown
            value={branchFilter}
            onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
            disabled={Boolean(selectedBranch && selectedBranch !== 'ALL')}
            size="sm"
            buttonStyle={{ height: 34, minWidth: 140 }}
            options={[
              { value: 'ALL', label: t('fin.all_branches') || 'All Branches' },
              ...branchesList.map(b => ({ value: b.name, label: b.name }))
            ]}
          />
          <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
            <Search style={{ position: 'absolute', left: 10, top: 9, width: 14, height: 14, color: '#94A3B8' }} />
            <input style={{ paddingLeft: 30, width: '100%', height: 34, borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.78rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} type="text" placeholder={t('rd.search_placeholder')} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} />
          </div>
        </div>
      </div>

      <div className="fin-tablewrap">
        <table className="fin-grid-table">
          <thead>
            <tr>
              <th style={{ width: 50, textAlign: 'center' }}>{t('col.sno')}</th>
              <th>{t('col.rd_account_no')}</th>
              <th>{t('col.customer')}</th>
              <th className="num">{t('col.monthly_installment_rs')}</th>
              <th style={{ textAlign: 'center' }}>{t('col.tenure')}</th>
              <th className="num">{t('col.rate')}</th>
              <th style={{ textAlign: 'center' }}>{t('rd.installments_col')}</th>
              <th>{t('fdc.booking_date').replace(/:$/, '')}</th>
              <th>{t('col.maturity_date')}</th>
              <th className="num">{statusTab === 'CLOSED_PREMATURE' ? 'Prematured Amount' : t('col.maturity_value')}</th>
              <th style={{ textAlign: 'center' }}>{t('col.status')}</th>
              <th style={{ textAlign: 'right', minWidth: 220 }}>{t('col.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {pagedRds.length === 0 ? (
              <tr><td colSpan="12" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>{t('rd.no_rds_yet')}</td></tr>
            ) : pagedRds.map((rd, idx) => (
              <tr key={rd.id}>
                <td style={{ textAlign: 'center', color: '#64748B' }}>{startIndex + idx + 1}</td>
                <td className="code" style={{ color: 'var(--brand-primary, #15803D)', fontWeight: 600 }}>{rd.rd_account_no}</td>
                <td>{rd.customer_name}</td>
                <td className="num">₹{fmt(rd.monthly_installment)}</td>
                <td style={{ textAlign: 'center', color: '#64748B' }}>{rd.tenure_months}mo</td>
                <td className="num">{rd.interest_rate}%</td>
                <td style={{ textAlign: 'center', color: '#64748B', fontSize: '0.78rem' }}>
                  {(rd.installments || []).filter(i => i.status === 'PAID').length}/{rd.tenure_months}
                </td>
                <td style={{ fontSize: '0.78rem', color: '#64748B' }}>{rd.booking_date}</td>
                <td>{rd.maturity_date}</td>
                <td className="num" style={{ color: rd.status === 'CLOSED_PREMATURE' ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)' }}>₹{fmt(rd.status === 'CLOSED_PREMATURE' ? rd.payout_amount : rd.maturity_value)}</td>
                <td style={{ textAlign: 'center' }}><span className={statusBadgeCls(rd.status)}>{tStatus(rd.status)}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    {rd.status === 'ACTIVE' ? (
                      <>
                        <ActionPill
                          icon={<Wallet style={{ width: 11, height: 11 }} />}
                          label={(rd.installments || []).some(i => i.status === 'PENDING') ? 'Collect / Schedule' : 'View Schedule'}
                          tone={(rd.installments || []).some(i => i.status === 'PENDING') ? 'good' : 'neutral'}
                          onClick={() => setCollectRd(rd)}
                        />
                        <ActionPill icon={<CheckCircle2 style={{ width: 11, height: 11 }} />} label={t('rd.mark_matured')} tone="good" onClick={() => setConfirmAction({ type: 'MATURE', rd })} />
                        <ActionPill icon={<LogOut style={{ width: 11, height: 11 }} />} label={t('rd.premature_exit')} tone="bad" onClick={() => setConfirmAction({ type: 'PREMATURE', rd })} />
                      </>
                    ) : (
                      <ActionPill icon={<CalendarClock style={{ width: 11, height: 11 }} />} label="View Schedule & Receipts" tone="neutral" onClick={() => setScheduleRd(rd)} />
                    )}
                    <ActionPill icon={<History style={{ width: 11, height: 11 }} />} label="History" tone="neutral" onClick={() => setHistoryRd(rd)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={safePage} setPage={setPage} totalPages={totalPages} total={filteredRds.length} startIndex={startIndex} pageSize={pageSize} />
      </div>

      {confirmAction && (() => {
        const isMature = confirmAction.type === 'MATURE';
        const defaultPenaltyPayout = Math.round((confirmAction.rd.collected_amount || 0) * 0.98);
        const payoutAmount = isMature
          ? confirmAction.rd.maturity_value
          : (customPayoutAmount !== '' ? (parseFloat(customPayoutAmount) || 0) : defaultPenaltyPayout);
        const tone = isMature ? { bg: 'var(--brand-primary-light, #F0FEF5)', border: 'var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', icon: 'var(--brand-primary, #15803D)' } : { bg: 'var(--color-danger-light, #FEF2F2)', border: 'var(--color-danger-border, #FECACA)', color: 'var(--color-danger, #DC2626)', icon: 'var(--color-danger, #DC2626)' };
        return (
          <div className="saas-modal-backdrop">
            <div className="saas-modal-card" style={{ maxWidth: 440 }}>
              <div className="saas-modal-header">
                <div className="head-left">
                  <div className="head-icon-badge" style={{ background: tone.bg, color: tone.icon }}>
                    {isMature ? <CheckCircle2 style={{ width: 18, height: 18 }} /> : <LogOut style={{ width: 18, height: 18 }} />}
                  </div>
                  <div className="head-titles">
                    <h3>{isMature ? t('rd.confirm_matured_title') : t('rd.confirm_premature_title')}</h3>
                    <p>{confirmAction.rd.rd_account_no} — {confirmAction.rd.customer_name}</p>
                  </div>
                </div>
                <button onClick={() => { setConfirmAction(null); setCustomPayoutAmount(''); setConfirmError(''); }} className="close-btn" type="button" disabled={confirmLoading}><X style={{ width: 16, height: 16 }} /></button>
              </div>
              <div className="saas-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {confirmError && (
                  <div className="form-alert form-alert--error"><span>{confirmError}</span></div>
                )}
                <div style={{ background: tone.bg, border: `1px solid ${tone.border}`, borderRadius: 12, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {isMature ? t('col.maturity_value') : 'Final Settlement Amount'}
                    </span>
                    <strong style={{ fontSize: '1.3rem', color: tone.color }}>₹{fmt(payoutAmount)}</strong>
                  </div>
                  {!isMature && (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>{t('col.maturity_value')}</span>
                      <span style={{ fontSize: '0.9rem', color: '#94A3B8', textDecoration: 'line-through' }}>₹{fmt(confirmAction.rd.maturity_value)}</span>
                    </div>
                  )}
                </div>

                {!isMature && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 500, color: '#334155' }}>
                      Premature Settlement Amount (₹)
                    </label>
                    <input
                      type="number"
                      placeholder={`Default ₹${fmt(defaultPenaltyPayout)}`}
                      value={customPayoutAmount}
                      onChange={(e) => setCustomPayoutAmount(e.target.value)}
                      style={{
                        height: 36, padding: '0 12px', borderRadius: 8,
                        border: '1px solid #CBD5E1', fontSize: '0.85rem',
                        fontWeight: 400, fontFamily: 'inherit', outline: 'none'
                      }}
                    />
                  </div>
                )}

                <p style={{ fontSize: '0.8rem', color: '#334155', margin: 0, lineHeight: 1.5 }}>
                  {isMature
                    ? t('rd.confirm_matured_desc').replace('{amount}', fmt(payoutAmount))
                    : `Confirm early settlement of RD #${confirmAction.rd.rd_account_no}. Net payout amount ₹${fmt(payoutAmount)} will be processed.`}
                </p>
              </div>
              <div className="saas-modal-footer">
                <button type="button" onClick={() => { setConfirmAction(null); setCustomPayoutAmount(''); setConfirmError(''); }} disabled={confirmLoading} className="btn-cancel">{t('btn.cancel')}</button>
                <button
                  type="button"
                  disabled={confirmLoading}
                  onClick={async () => {
                    if (confirmLoading) return;
                    setConfirmLoading(true);
                    setConfirmError('');
                    try {
                      if (isMature) {
                        await onMatureRd(confirmAction.rd.id);
                      } else {
                        await onPrematureCloseRd(confirmAction.rd.id, customPayoutAmount);
                      }
                      setConfirmAction(null);
                      setCustomPayoutAmount('');
                    } catch (err) {
                      setConfirmError(err?.response?.data?.message || 'Action failed. Please try again.');
                    } finally {
                      setConfirmLoading(false);
                    }
                  }}
                  className="btn-submit"
                  style={{ background: confirmLoading ? '#94A3B8' : tone.color, boxShadow: confirmLoading ? 'none' : `0 2px 6px ${tone.color}4D`, cursor: confirmLoading ? 'not-allowed' : 'pointer' }}
                >
                  {confirmLoading ? 'Processing...' : t('rd.confirm_btn')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Unified RD Installment Schedule & Multi-Select EMI Collection Modal */}
      {(collectRd || scheduleRd) && (() => {
        const activeRd = collectRd || scheduleRd;
        const currentRd = recurringDeposits.find(r => r.id === activeRd.id) || activeRd;
        return (
          <RdCollectScheduleModal
            rd={currentRd}
            bankAccounts={bankAccounts}
            borrowers={borrowers}
            initialSelectedMonth={collectRd ? (currentRd.installments || []).find(i => i.status === 'PENDING')?.month_no : null}
            onCollect={async (monthNo, mode, extra) => {
              const updated = await onCollectInstallment?.(currentRd.id, monthNo, mode, extra);
              return updated;
            }}
            onClose={() => {
              setCollectRd(null);
              setScheduleRd(null);
            }}
          />
        );
      })()}

      {historyRd && (
        <TransactionHistoryModal
          title="Recurring Deposit Transaction History"
          accountLabel={`${historyRd.rd_account_no} — ${historyRd.customer_name}`}
          tenant={tenant}
          entries={journalEntries.filter(e =>
            ['RD_INSTALLMENT', 'RD_MATURITY', 'RD_PREMATURE_CLOSE'].includes(e.ref_type) &&
            String(e.ref_id) === String(historyRd.id)
          )}
          onClose={() => setHistoryRd(null)}
        />
      )}
    </div>
  );
}

// ── Unified RD Installment Schedule & Multi-Select EMI Collection Modal ──
function RdCollectScheduleModal({ rd, borrowers = [], bankAccounts = [], initialSelectedMonth = null, onCollect, onClose }) {
  const { t } = useLanguage();
  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const todayStr = new Date().toISOString().slice(0, 10);

  const installments = rd.installments || [];
  const pendingInstallments = installments.filter(i => i.status !== 'PAID');
  const paidInstallments = installments.filter(i => i.status === 'PAID');
  const overdueInstallments = pendingInstallments.filter(i => i.due_date < todayStr);

  const rdBranch = rd.branch || (borrowers || []).find(b => b.id === rd.borrower_id)?.branch || 'Main Branch';

  const activeBankAccounts = (bankAccounts || []).filter(b => b.is_active !== false);
  const branchBankAccounts = activeBankAccounts.filter(b => (b.company_branch === rdBranch || b.branch === rdBranch || b.branch_name === rdBranch));
  const otherBankAccounts = activeBankAccounts.filter(b => !(b.company_branch === rdBranch || b.branch === rdBranch || b.branch_name === rdBranch));

  const [selectedMonths, setSelectedMonths] = useState(() => {
    if (initialSelectedMonth && pendingInstallments.some(i => i.month_no === initialSelectedMonth)) {
      return [initialSelectedMonth];
    }
    if (pendingInstallments.length > 0) {
      return [pendingInstallments[0].month_no];
    }
    return [];
  });

  const [paymentMode, setPaymentMode] = useState('CASH');
  const [bankAccountId, setBankAccountId] = useState(() => branchBankAccounts[0]?.id || activeBankAccounts[0]?.id || '');
  const [collecting, setCollecting] = useState(false);
  const [collectingStep, setCollectingStep] = useState('');
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);
  // Same reasoning as BookRdScreen's submittingRef: `collecting` state alone
  // can't block a rapid second click before its own setCollecting(true) has
  // committed, which is exactly the "clicked it 3 times, got 3 postings"
  // scenario during a slow connection.
  const collectingRef = React.useRef(false);

  useEffect(() => {
    if (!bankAccountId && (branchBankAccounts.length > 0 || activeBankAccounts.length > 0)) {
      setBankAccountId(branchBankAccounts[0]?.id || activeBankAccounts[0]?.id || '');
    }
  }, [branchBankAccounts, activeBankAccounts, bankAccountId]);

  const toggleMonth = (monthNo) => {
    if (collecting) return;
    setSelectedMonths(prev =>
      prev.includes(monthNo) ? prev.filter(m => m !== monthNo) : [...prev, monthNo].sort((a, b) => a - b)
    );
  };

  const selectAllPending = () => {
    if (collecting) return;
    setSelectedMonths(pendingInstallments.map(i => i.month_no));
  };

  const selectOverdue = () => {
    if (collecting) return;
    setSelectedMonths(overdueInstallments.map(i => i.month_no));
  };

  const deselectAll = () => {
    if (collecting) return;
    setSelectedMonths([]);
  };

  const selectedTotalAmount = selectedMonths.reduce((sum, mNo) => {
    const inst = installments.find(i => i.month_no === mNo);
    return sum + Number(inst?.amount || rd.monthly_installment || 0);
  }, 0);

  const handleBulkCollect = async () => {
    if (selectedMonths.length === 0 || collecting || collectingRef.current) return;
    collectingRef.current = true;
    setCollecting(true);
    setError('');
    setSuccessInfo(null);

    const results = [];
    const monthsToProcess = [...selectedMonths].sort((a, b) => a - b);

    const selectedBank = activeBankAccounts.find(b => String(b.id) === String(bankAccountId));
    const bankPayload = (paymentMode !== 'CASH' && selectedBank) ? {
      bank_account_id: selectedBank.id,
      bank_name: selectedBank.bank_name,
      bank_account_number: selectedBank.account_number,
      ifsc_code: selectedBank.ifsc_code,
      bank_branch: selectedBank.branch_name || selectedBank.branch || selectedBank.company_branch
    } : {};

    try {
      for (let i = 0; i < monthsToProcess.length; i++) {
        const monthNo = monthsToProcess[i];
        setCollectingStep(`Collecting Month ${monthNo} (${i + 1}/${monthsToProcess.length})...`);
        const updated = await onCollect(monthNo, paymentMode, bankPayload);
        const paidInst = (updated?.installments || []).find(inst => inst.month_no === monthNo);
        results.push({
          month_no: monthNo,
          voucher_no: paidInst?.voucher_no || null
        });
      }
      setSuccessInfo({
        count: monthsToProcess.length,
        totalAmount: selectedTotalAmount,
        results
      });
      setSelectedMonths([]);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Collection failed. Please try again.');
    } finally {
      collectingRef.current = false;
      setCollecting(false);
      setCollectingStep('');
    }
  };

  const isAllPendingSelected = pendingInstallments.length > 0 && pendingInstallments.every(i => selectedMonths.includes(i.month_no));

  return (
    <div className="saas-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !collecting) onClose(); }}>
      <div className="saas-modal-card" style={{ maxWidth: 680, width: '95%' }}>
        {/* Modal Header */}
        <div className="saas-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary, #15803D)' }}>
              <Wallet style={{ width: 20, height: 20 }} />
            </div>
            <div className="head-titles">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                {rd.status === 'ACTIVE' ? 'Collect RD Installments & Schedule' : 'RD Installment Schedule & Receipts'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '2px 0 0 0' }}>
                <strong style={{ color: 'var(--brand-primary, #15803D)', fontFamily: 'monospace' }}>{rd.rd_account_no}</strong> — {rd.customer_name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button" disabled={collecting}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="saas-modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '72vh', overflowY: 'auto' }}>
          
          {/* Top Summary Metrics Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Monthly EMI</span>
              <strong style={{ fontSize: '1rem', color: '#0F172A', display: 'block', marginTop: 2 }}>₹{fmt(rd.monthly_installment)}</strong>
            </div>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Progress</span>
              <strong style={{ fontSize: '1rem', color: 'var(--brand-primary, #15803D)', display: 'block', marginTop: 2 }}>
                {paidInstallments.length} / {rd.tenure_months} <span style={{ fontSize: '0.74rem', fontWeight: 500, color: '#64748B' }}>Months</span>
              </strong>
            </div>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Collected</span>
              <strong style={{ fontSize: '1rem', color: '#0F172A', display: 'block', marginTop: 2 }}>₹{fmt(rd.collected_amount)}</strong>
            </div>
            <div style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', borderRadius: 8, padding: '10px 12px' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--brand-primary-hover, #0E5327)', fontWeight: 600, textTransform: 'uppercase' }}>Maturity Value</span>
              <strong style={{ fontSize: '1rem', color: 'var(--brand-primary, #15803D)', display: 'block', marginTop: 2 }}>₹{fmt(rd.maturity_value)}</strong>
            </div>
          </div>

          {/* Success Banner */}
          {successInfo && (
            <div style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 style={{ width: 18, height: 18, color: 'var(--brand-primary, #15803D)', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary-hover, #0E5327)' }}>
                    Successfully collected ₹{fmt(successInfo.totalAmount)} for {successInfo.count} installment(s)!
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {successInfo.results.map(r => r.voucher_no && (
                      <span key={r.month_no} style={{ fontSize: '0.7rem', background: '#FFFFFF', padding: '2px 8px', borderRadius: 4, border: '1px solid #A3F5C1', fontFamily: 'monospace', fontWeight: 600, color: '#15803D' }}>
                        Month {r.month_no}: {r.voucher_no}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="form-alert form-alert--error" style={{ margin: 0 }}>
              <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Active Collection Controls (Payment Mode & Multi-Select Action Bar) */}
          {rd.status === 'ACTIVE' && pendingInstallments.length > 0 && (
            <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 240px' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>Payment Mode:</label>
                  <div style={{ minWidth: 160, flex: 1 }}>
                    <SharedDropdown
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      size="sm"
                      buttonStyle={{ height: 32, fontSize: '0.78rem' }}
                      options={[
                        { value: 'CASH', label: t('fin.mode_cash') },
                        { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                        { value: 'UPI', label: 'UPI' },
                        { value: 'CHEQUE', label: 'Cheque' }
                      ]}
                    />
                  </div>
                </div>

                {/* Quick Select Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={isAllPendingSelected ? deselectAll : selectAllPending}
                    disabled={collecting}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                      borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC',
                      fontSize: '0.72rem', fontWeight: 600, color: '#334155', cursor: 'pointer'
                    }}
                  >
                    {isAllPendingSelected ? <CheckSquare style={{ width: 13, height: 13, color: 'var(--brand-primary, #15803D)' }} /> : <Square style={{ width: 13, height: 13 }} />}
                    <span>{isAllPendingSelected ? 'Deselect All' : `Select All Pending (${pendingInstallments.length})`}</span>
                  </button>

                  {overdueInstallments.length > 0 && (
                    <button
                      type="button"
                      onClick={selectOverdue}
                      disabled={collecting}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                        borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2',
                        fontSize: '0.72rem', fontWeight: 600, color: '#DC2626', cursor: 'pointer'
                      }}
                    >
                      <span>Select Overdue ({overdueInstallments.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Branch Bank Account Selector for Bank Transfer / UPI / Cheque */}
              {paymentMode !== 'CASH' && (
                <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#0369A1' }}>
                      <Landmark style={{ width: 14, height: 14, color: '#0284C7' }} />
                      <span>Company Bank Account ({rdBranch})</span>
                    </label>
                    <span style={{ fontSize: '0.68rem', color: '#0369A1', background: '#E0F2FE', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                      Branch: {rdBranch}
                    </span>
                  </div>
                  {activeBankAccounts.length > 0 ? (
                    <SharedDropdown
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      placeholder="— Select Bank Account —"
                      size="sm"
                      buttonStyle={{ height: 34, fontSize: '0.78rem', background: '#FFFFFF' }}
                      options={[
                        ...(branchBankAccounts.length > 0 ? branchBankAccounts.map(b => ({
                          value: b.id,
                          label: `${b.bank_name} — A/C ${b.account_number ? '...' + String(b.account_number).slice(-4) : 'N/A'} (${b.company_branch || b.branch_name || rdBranch})`
                        })) : []),
                        ...(otherBankAccounts.length > 0 ? otherBankAccounts.map(b => ({
                          value: b.id,
                          label: `${b.bank_name} — A/C ${b.account_number ? '...' + String(b.account_number).slice(-4) : 'N/A'} (${b.company_branch || b.branch_name || 'General'})`
                        })) : [])
                      ]}
                    />
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      No company bank accounts configured. Set them up in Master Settings &gt; Bank Accounts.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Installment Schedule & Selection Table */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
            <table className="fin-grid-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {rd.status === 'ACTIVE' && pendingInstallments.length > 0 && (
                    <th style={{ width: 44, textAlign: 'center', padding: '8px 10px' }}>
                      <input
                        type="checkbox"
                        checked={isAllPendingSelected}
                        onChange={isAllPendingSelected ? deselectAll : selectAllPending}
                        disabled={collecting || pendingInstallments.length === 0}
                        style={{ cursor: 'pointer', accentColor: 'var(--brand-primary, #15803D)' }}
                      />
                    </th>
                  )}
                  <th style={{ textAlign: 'center', width: 65, padding: '8px 10px' }}>Month</th>
                  <th style={{ padding: '8px 10px' }}>Due Date</th>
                  <th className="num" style={{ padding: '8px 10px' }}>Installment (₹)</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px' }}>Receipt / Mode</th>
                </tr>
              </thead>
              <tbody>
                {installments.map(inst => {
                  const isPaid = inst.status === 'PAID';
                  const isOverdue = !isPaid && inst.due_date < todayStr;
                  const isSelected = selectedMonths.includes(inst.month_no);

                  return (
                    <tr
                      key={inst.month_no}
                      onClick={() => {
                        if (!isPaid && rd.status === 'ACTIVE') {
                          toggleMonth(inst.month_no);
                        }
                      }}
                      style={{
                        background: isSelected ? 'var(--brand-primary-light, #F0FEF5)' : isPaid ? '#FFFFFF' : '#FFFFFF',
                        borderBottom: '1px solid #F1F5F9',
                        cursor: !isPaid && rd.status === 'ACTIVE' ? 'pointer' : 'default',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {rd.status === 'ACTIVE' && pendingInstallments.length > 0 && (
                        <td style={{ textAlign: 'center', padding: '8px 10px' }} onClick={e => e.stopPropagation()}>
                          {isPaid ? (
                            <Check style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)', margin: 'auto', display: 'block' }} />
                          ) : (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={collecting}
                              onChange={() => toggleMonth(inst.month_no)}
                              style={{ cursor: 'pointer', accentColor: 'var(--brand-primary, #15803D)' }}
                            />
                          )}
                        </td>
                      )}
                      <td style={{ textAlign: 'center', fontWeight: 600, padding: '8px 10px' }}>
                        Month {inst.month_no}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#475569', padding: '8px 10px' }}>
                        {inst.due_date}
                      </td>
                      <td className="num" style={{ fontWeight: 600, padding: '8px 10px', fontFeatureSettings: '"tnum"' }}>
                        ₹{fmt(inst.amount)}
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px 10px' }}>
                        {isPaid ? (
                          <span className="fin-badge fin-badge--ok">{t('rd.status_paid')}</span>
                        ) : isOverdue ? (
                          <span className="fin-badge fin-badge--warn">{t('rd.status_overdue')}</span>
                        ) : (
                          <span className="fin-badge">{t('rd.status_pending')}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px 10px' }}>
                        {isPaid ? (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                            {inst.voucher_no && (
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--brand-primary, #15803D)', fontFamily: 'monospace' }}>
                                {inst.voucher_no}
                              </span>
                            )}
                            <span style={{ fontSize: '0.66rem', color: '#64748B' }}>
                              {inst.payment_mode || 'CASH'} · {inst.paid_date || 'Paid'}
                            </span>
                          </div>
                        ) : isSelected ? (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--brand-primary, #15803D)' }}>
                            Selected for Payment
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer with Multi-Month Collection CTA */}
        <div className="saas-modal-footer" style={{ padding: '14px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            {selectedMonths.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}>
                  {selectedMonths.length} Month{selectedMonths.length > 1 ? 's' : ''} Selected:
                </span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--brand-primary, #15803D)', fontFeatureSettings: '"tnum"' }}>
                  ₹{fmt(selectedTotalAmount)}
                </strong>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  (Months: {selectedMonths.join(', ')})
                </span>
              </div>
            ) : (
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                {pendingInstallments.length > 0 ? 'Select months above to collect payments' : 'All scheduled installments have been paid.'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" onClick={onClose} disabled={collecting} className="btn-cancel">
              {t('btn.cancel')}
            </button>

            {rd.status === 'ACTIVE' && pendingInstallments.length > 0 && (
              <button
                type="button"
                disabled={collecting || selectedMonths.length === 0}
                onClick={handleBulkCollect}
                className="btn-submit"
                style={{
                  padding: '9px 18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: selectedMonths.length === 0 ? 0.6 : 1,
                  cursor: selectedMonths.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                {collecting ? (
                  <span>{collectingStep || 'Processing...'}</span>
                ) : (
                  <>
                    <Wallet style={{ width: 14, height: 14 }} />
                    <span>Collect ₹{fmt(selectedTotalAmount)} ({selectedMonths.length} {selectedMonths.length === 1 ? 'Month' : 'Months'})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
