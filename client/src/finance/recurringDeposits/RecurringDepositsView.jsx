import React, { useState, useEffect } from 'react';
import {
  Landmark, Plus, X, AlertTriangle, CheckCircle2, LogOut, ArrowLeft,
  UserCheck, ChevronLeft, ChevronRight, Search, CalendarClock
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

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

  const setField = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const maturityValue = computeRdMaturity(form.monthly_installment, form.tenure_months, form.interest_rate);
  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const selectedCustomer = borrowers.find(b => b.id === Number(form.borrower_id));

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.borrower_id) { setError(t('rd.modal.select_customer_error')); return; }
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
              <select required value={form.borrower_id} onChange={e => setField('borrower_id', e.target.value)} className="input-control">
                <option value="">{t('rd.modal.select_customer')}</option>
                {borrowers.map(b => <option key={b.id} value={b.id}>{b.full_name} ({b.borrower_code}) — {b.branch}</option>)}
              </select>
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
              <select value={form.payment_mode} onChange={e => setField('payment_mode', e.target.value)} className="input-control">
                <option value="CASH">{t('fin.mode_cash')}</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
              </select>
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

export default function RecurringDepositsView({ recurringDeposits = [], borrowers = [], branchesList = [], selectedBranch = 'ALL', onCreateRd, onCollectInstallment, onMatureRd, onPrematureCloseRd }) {
  const { t, tStatus } = useLanguage();
  const [screen, setScreen] = useState('LIST'); // 'LIST' | 'BOOK'
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'MATURE'|'PREMATURE', rd }
  const [scheduleRd, setScheduleRd] = useState(null);
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
          <select
            className="fin-select"
            style={{ height: 34 }}
            value={branchFilter}
            onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
            disabled={Boolean(selectedBranch && selectedBranch !== 'ALL')}
          >
            <option value="ALL">{t('fin.all_branches')}</option>
            {branchesList.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
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
                    <ActionPill icon={<CalendarClock style={{ width: 11, height: 11 }} />} label={t('rd.schedule_btn')} tone="neutral" onClick={() => setScheduleRd(rd)} />
                    {rd.status === 'ACTIVE' && (
                      <>
                        <ActionPill icon={<CheckCircle2 style={{ width: 11, height: 11 }} />} label={t('rd.mark_matured')} tone="good" onClick={() => setConfirmAction({ type: 'MATURE', rd })} />
                        <ActionPill icon={<LogOut style={{ width: 11, height: 11 }} />} label={t('rd.premature_exit')} tone="bad" onClick={() => setConfirmAction({ type: 'PREMATURE', rd })} />
                      </>
                    )}
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

      {scheduleRd && (
        <RdScheduleModal
          rd={scheduleRd}
          onCollect={(monthNo, mode) => onCollectInstallment?.(scheduleRd.id, monthNo, mode)}
          onClose={() => setScheduleRd(null)}
        />
      )}
    </div>
  );
}

// ── Installment Schedule Modal — lists every month, lets staff collect any
// still-pending one (not restricted to "next due only", since customers
// realistically catch up on missed months out of order).
function RdScheduleModal({ rd, onCollect, onClose }) {
  const { t } = useLanguage();
  const [modeByMonth, setModeByMonth] = useState({});
  const [collectingMonth, setCollectingMonth] = useState(null);
  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const todayStr = new Date().toISOString().slice(0, 10);

  const handleCollect = async (monthNo, mode) => {
    if (collectingMonth) return;
    setCollectingMonth(monthNo);
    try {
      await onCollect(monthNo, mode);
    } finally {
      setCollectingMonth(null);
    }
  };

  return (
    <div className="saas-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="saas-modal-card" style={{ maxWidth: 560 }}>
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary, #15803D)' }}>
              <CalendarClock style={{ width: 18, height: 18 }} />
            </div>
            <div className="head-titles">
              <h3>{t('rd.schedule_title')}</h3>
              <p>{rd.rd_account_no} — {rd.customer_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <div className="saas-modal-body" style={{ padding: 0 }}>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table className="fin-grid-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>{t('rd.installment_col_month')}</th>
                  <th>{t('rd.installment_col_due')}</th>
                  <th className="num">{t('rd.installment_col_amount')}</th>
                  <th style={{ textAlign: 'center' }}>{t('rd.installment_col_status')}</th>
                  <th style={{ textAlign: 'right' }}>{t('rd.installment_col_action')}</th>
                </tr>
              </thead>
              <tbody>
                {(rd.installments || []).map(inst => {
                  const isPaid = inst.status === 'PAID';
                  const isOverdue = !isPaid && inst.due_date < todayStr;
                  const mode = modeByMonth[inst.month_no] || 'CASH';
                  return (
                    <tr key={inst.month_no}>
                      <td style={{ textAlign: 'center' }}>{inst.month_no}</td>
                      <td style={{ fontSize: '0.78rem', color: '#64748B' }}>{inst.due_date}</td>
                      <td className="num">₹{fmt(inst.amount)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {isPaid ? (
                          <span className="fin-badge fin-badge--ok">{t('rd.status_paid')}</span>
                        ) : isOverdue ? (
                          <span className="fin-badge fin-badge--warn">{t('rd.status_overdue')}</span>
                        ) : (
                          <span className="fin-badge">{t('rd.status_pending')}</span>
                        )}
                        {isPaid && inst.paid_date && (
                          <div style={{ fontSize: '0.66rem', color: '#94A3B8', marginTop: 2 }}>{t('rd.paid_on_prefix')} {inst.paid_date}</div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!isPaid && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <select
                              value={mode}
                              disabled={collectingMonth === inst.month_no}
                              onChange={(e) => setModeByMonth(prev => ({ ...prev, [inst.month_no]: e.target.value }))}
                              style={{ height: 26, borderRadius: 5, border: '1px solid #CBD5E1', fontSize: '0.7rem', padding: '0 4px' }}
                            >
                              <option value="CASH">{t('fin.mode_cash')}</option>
                              <option value="BANK_TRANSFER">Bank Transfer</option>
                              <option value="UPI">UPI</option>
                              <option value="CHEQUE">Cheque</option>
                            </select>
                            <ActionPill
                              icon={<CheckCircle2 style={{ width: 11, height: 11 }} />}
                              label={collectingMonth === inst.month_no ? '...' : t('rd.collect_btn')}
                              tone="good"
                              disabled={collectingMonth !== null}
                              onClick={() => handleCollect(inst.month_no, mode)}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="saas-modal-footer">
          <button type="button" onClick={onClose} className="btn-cancel">{t('rd.close_btn')}</button>
        </div>
      </div>
    </div>
  );
}
