import React, { useState } from 'react';
import {
  Landmark, Plus, Eye, X, AlertTriangle, CheckCircle2, LogOut, ArrowLeft,
  UserCheck, ChevronLeft, ChevronRight, Search
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { openPrintableCertificate } from '../../utils/printCertificate';

const FORM_MAX_WIDTH = 780;

function computeMaturity(principal, tenureMonths, rate, scheme) {
  const p = parseFloat(principal) || 0;
  const months = parseFloat(tenureMonths) || 0;
  const r = parseFloat(rate) || 0;
  if (scheme === 'MONTHLY_PAYOUT') {
    // Principal returned at maturity; interest paid out monthly (not compounded into maturity value)
    return Math.round(p);
  }
  // Cumulative: simple interest over the tenure for this mock calculator
  const interest = p * (r / 100) * (months / 12);
  return Math.round(p + interest);
}

function ErrorBanner({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 9, fontSize: '0.78rem', fontWeight: 600, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
      <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  );
}

// ── Full-screen "Book New Fixed Deposit" form — narrower width, 3-4 column
// rows and placeholders throughout so fields stay a sensible size instead of
// stretching edge-to-edge.
function BookFdScreen({ borrowers, onCancel, onSubmit }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    borrower_id: borrowers[0]?.id || '',
    principal_amount: '',
    tenure_months: 12,
    interest_rate: 8.5,
    scheme: 'CUMULATIVE',
    payment_mode: 'CASH',
    nominee_name: '',
    nominee_phone: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const maturityValue = computeMaturity(form.principal_amount, form.tenure_months, form.interest_rate, form.scheme);
  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const selectedCustomer = borrowers.find(b => b.id === Number(form.borrower_id));

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.borrower_id) { setError(t('fd.modal.select_customer_error')); return; }
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
        principal_amount: parseFloat(form.principal_amount),
        tenure_months: Number(form.tenure_months),
        interest_rate: parseFloat(form.interest_rate),
        scheme: form.scheme,
        payment_mode: form.payment_mode,
        nominee_name: form.nominee_name,
        nominee_phone: form.nominee_phone,
        notes: form.notes,
        booking_date: bookingDate.toISOString().slice(0, 10),
        maturity_date: maturityDate.toISOString().slice(0, 10),
        maturity_value: maturityValue
      });
    } catch (err) {
      setError(err?.response?.data?.message || t('fd.modal.save_error'));
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
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>{t('fd.register_title')}</h1>
        </div>
        <div className="cf-header-right">
          <button type="button" onClick={onCancel} className="btn-cancel" disabled={loading}>{t('btn.cancel')}</button>
          <button type="submit" onClick={handleSubmit} disabled={loading} className="btn-submit">
            {loading ? t('fd.saving') : t('fd.modal.submit')}
          </button>
        </div>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <form onSubmit={handleSubmit} className="cf-wizard-body">
        <div className="cf-step-pane" style={{ padding: '20px 22px', gap: 16 }}>
          <div className="cf-pane-title" style={{ paddingBottom: 12 }}>
            <Landmark style={{ width: 16, height: 16, color: '#059669' }} />
            <div>
              <h3>{t('fd.section_details_title')}</h3>
              <p>{t('fd.section_details_subtitle')}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>{t('fd.modal.customer_label')}</label>
              <select required value={form.borrower_id} onChange={e => setField('borrower_id', e.target.value)} className="input-control">
                <option value="">{t('fd.modal.select_customer')}</option>
                {borrowers.map(b => <option key={b.id} value={b.id}>{b.full_name} ({b.borrower_code}) — {b.branch}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row form-row--3">
            <div className="form-group">
              <label>{t('fd.modal.principal_label')}</label>
              <input type="number" min="1000" step="1000" required value={form.principal_amount} onChange={e => setField('principal_amount', e.target.value)} className="input-control mono" placeholder="e.g. 100000" />
            </div>
            <div className="form-group">
              <label>{t('fd.modal.tenure_label')}</label>
              <input type="number" min="3" max="60" required value={form.tenure_months} onChange={e => setField('tenure_months', e.target.value)} className="input-control mono" placeholder="e.g. 12" />
            </div>
            <div className="form-group">
              <label>{t('fd.modal.rate_label')}</label>
              <input type="number" step="0.1" required value={form.interest_rate} onChange={e => setField('interest_rate', e.target.value)} className="input-control mono" placeholder="e.g. 8.5" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('fd.modal.scheme_label')}</label>
              <select value={form.scheme} onChange={e => setField('scheme', e.target.value)} className="input-control">
                <option value="CUMULATIVE">{t('fd.modal.scheme_cumulative')}</option>
                <option value="MONTHLY_PAYOUT">{t('fd.modal.scheme_monthly')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('fd.payment_mode_label')}</label>
              <select value={form.payment_mode} onChange={e => setField('payment_mode', e.target.value)} className="input-control">
                <option value="CASH">{t('fin.mode_cash')}</option>
                <option value="BANK">{t('fin.mode_bank')}</option>
              </select>
            </div>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', textTransform: 'uppercase' }}>{t('col.maturity_date')}</span>
              <strong style={{ fontSize: '0.88rem', color: '#2563EB' }}>{form.tenure_months ? `${form.tenure_months} ${t('fd.modal.months_from_booking')}` : '—'}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', textTransform: 'uppercase' }}>{t('col.maturity_value')}</span>
              <strong style={{ fontSize: '0.95rem', color: '#059669' }}>₹{fmt(maturityValue)}</strong>
            </div>
          </div>
        </div>

        <div className="cf-step-pane" style={{ padding: '20px 22px', gap: 16 }}>
          <div className="cf-pane-title" style={{ paddingBottom: 12 }}>
            <UserCheck style={{ width: 16, height: 16, color: '#059669' }} />
            <div>
              <h3>{t('fd.section_nominee_title')}</h3>
            </div>
          </div>
          <div className="form-row form-row--3">
            <div className="form-group">
              <label>{t('fd.nominee_name_label')}</label>
              <input type="text" value={form.nominee_name} onChange={e => setField('nominee_name', e.target.value)} className="input-control" placeholder="Full name" />
            </div>
            <div className="form-group">
              <label>{t('fd.nominee_phone_label')}</label>
              <input type="text" value={form.nominee_phone} onChange={e => setField('nominee_phone', e.target.value)} className="input-control mono" placeholder="10-digit mobile" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>{t('fd.notes_label')}</label>
              <textarea rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} className="input-control" style={{ height: 'auto', padding: '10px 12px' }} placeholder={t('fd.notes_placeholder')} />
            </div>
          </div>
        </div>

        <div className="cf-wizard-footer">
          <button type="button" onClick={onCancel} className="btn-cancel" disabled={loading}>{t('btn.cancel')}</button>
          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? t('fd.saving') : t('fd.modal.submit')}
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

// Labeled action pills instead of bare icon buttons — the plain icon-only
// buttons this replaced gave no clue what "check mark" vs "arrow out" meant.
function ActionPill({ icon, label, onClick, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: '#FFFFFF', border: '#E2E8F0', color: '#334155' },
    good: { bg: '#ECFDF5', border: '#A7F3D0', color: '#059669' },
    bad: { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626' }
  };
  const c = tones[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
        border: `1px solid ${c.border}`, background: c.bg, color: c.color,
        borderRadius: 6, padding: '4px 9px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer'
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// Underline-style status tabs — plain text with a colored bottom border on
// the active tab, instead of a rounded "pill" badge.
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
              border: 'none', borderBottom: isActive ? '2px solid #059669' : '2px solid transparent',
              background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '0.8rem', fontWeight: isActive ? 700 : 500,
              color: isActive ? '#059669' : '#64748B', marginRight: 18
            }}
          >
            <span>{tab.label}</span>
            <span style={{
              fontSize: '0.68rem', fontWeight: 700, borderRadius: 999, padding: '1px 7px',
              background: isActive ? '#ECFDF5' : '#F1F5F9',
              color: isActive ? '#059669' : '#94A3B8'
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

export default function FixedDepositsView({ fixedDeposits = [], borrowers = [], tenant, onCreateFd, onMatureFd, onPrematureCloseFd }) {
  const { t, tStatus } = useLanguage();
  const [screen, setScreen] = useState('LIST'); // 'LIST' | 'BOOK'
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'MATURE'|'PREMATURE', fd }
  const [statusTab, setStatusTab] = useState('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  if (screen === 'BOOK') {
    return (
      <BookFdScreen
        borrowers={borrowers}
        onCancel={() => setScreen('LIST')}
        onSubmit={async (payload) => { await onCreateFd(payload); setScreen('LIST'); }}
      />
    );
  }

  const printCertificate = (fd) => {
    openPrintableCertificate({
      company: tenant,
      fd,
      labels: {
        title: t('fdc.title'),
        certificateNo: t('fdc.certificate_no'),
        fdAccountNo: t('col.fd_account_no'),
        customer: t('col.customer'),
        principal: t('fdc.principal_amount').replace(/:$/, ''),
        rate: t('fdc.interest_rate').replace(/:$/, ''),
        tenure: t('col.tenure'),
        months: t('fdc.months'),
        scheme: t('fdc.scheme').replace(/:$/, ''),
        cumulative: t('fdc.cumulative'),
        monthlyPayout: t('fdc.monthly_payout'),
        bookingDate: t('fdc.booking_date').replace(/:$/, ''),
        maturityDate: t('col.maturity_date'),
        nominee: t('fd.nominee_name_label'),
        status: t('col.status'),
        statusText: tStatus(fd.status),
        maturityValue: t('fdc.maturity_value').replace(/:$/, ''),
        payoutAfterPenalty: t('fdc.payout_after_penalty').replace(/:$/, ''),
        customerSignature: t('fdc.customer_signature'),
        authorizedSignatory: t('fdc.authorized_signatory'),
        generatedOn: t('fdc.generated_on')
      }
    });
  };

  const totalPrincipal = fixedDeposits.reduce((acc, f) => acc + (f.status === 'ACTIVE' ? f.principal_amount : 0), 0);
  const totalMaturityLiability = fixedDeposits.reduce((acc, f) => acc + (f.status === 'ACTIVE' ? f.maturity_value : 0), 0);
  const activeCount = fixedDeposits.filter(f => f.status === 'ACTIVE').length;

  const byTab = fixedDeposits.filter(f => f.status === statusTab);
  const filteredFds = byTab.filter(f => {
    const q = searchQuery.toLowerCase().trim();
    return !q || f.fd_account_no.toLowerCase().includes(q) || f.customer_name.toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filteredFds.length / pageSize) || 1;
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedFds = filteredFds.slice(startIndex, startIndex + pageSize);

  const tabCount = (id) => fixedDeposits.filter(f => f.status === id).length;

  return (
    <div className="fin-page">
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669' }}>
              <Landmark style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('fd.title')}</h1>
              <p className="fin-page-header__subtitle">{t('fd.subtitle')}</p>
            </div>
          </div>
          <button type="button" className="fin-btn-primary" onClick={() => setScreen('BOOK')} disabled={!borrowers.length}>
            <Plus style={{ width: 14, height: 14 }} />
            <span>{t('fd.book_new')}</span>
          </button>
        </div>

        <div className="fin-header-stats">
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fd.active_principal')}</span>
            <span className="fin-header-stat__value">₹{fmt(totalPrincipal)}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fd.active_accounts')}</span>
            <span className="fin-header-stat__value">{activeCount}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fd.total_maturity_liability')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">₹{fmt(totalMaturityLiability)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <StatusTabs
          tabs={[
            { id: 'ACTIVE', label: t('fin.status_active'), count: tabCount('ACTIVE') },
            { id: 'MATURED', label: t('fin.fd_status_matured'), count: tabCount('MATURED') },
            { id: 'CLOSED_PREMATURE', label: t('fin.fd_status_closed_premature'), count: tabCount('CLOSED_PREMATURE') }
          ]}
          active={statusTab}
          onChange={(id) => { setStatusTab(id); setPage(1); }}
        />

        <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
          <Search style={{ position: 'absolute', left: 10, top: 9, width: 14, height: 14, color: '#94A3B8' }} />
          <input style={{ paddingLeft: 30, width: '100%', height: 34, borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.78rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} type="text" placeholder={t('fd.search_placeholder')} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="fin-tablewrap">
        <table className="fin-grid-table">
          <thead>
            <tr>
              <th style={{ width: 50, textAlign: 'center' }}>{t('col.sno')}</th>
              <th>{t('col.fd_account_no')}</th>
              <th>{t('col.customer')}</th>
              <th>{t('col.scheme')}</th>
              <th className="num">{t('col.principal')}</th>
              <th style={{ textAlign: 'center' }}>{t('col.tenure')}</th>
              <th className="num">{t('col.rate')}</th>
              <th>{t('fdc.booking_date').replace(/:$/, '')}</th>
              <th>{t('col.maturity_date')}</th>
              <th className="num">{t('col.maturity_value')}</th>
              <th style={{ textAlign: 'center' }}>{t('col.status')}</th>
              <th style={{ textAlign: 'right', minWidth: 220 }}>{t('col.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {pagedFds.length === 0 ? (
              <tr><td colSpan="12" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>{t('fd.no_fds_yet')}</td></tr>
            ) : pagedFds.map((fd, idx) => (
              <tr key={fd.id}>
                <td style={{ textAlign: 'center', color: '#64748B' }}>{startIndex + idx + 1}</td>
                <td className="code" style={{ color: '#059669', fontWeight: 600 }}>{fd.fd_account_no}</td>
                <td>{fd.customer_name}</td>
                <td style={{ fontSize: '0.78rem', color: '#64748B' }}>{fd.scheme === 'CUMULATIVE' ? t('fdc.cumulative') : t('fdc.monthly_payout')}</td>
                <td className="num">₹{fmt(fd.principal_amount)}</td>
                <td style={{ textAlign: 'center', color: '#64748B' }}>{fd.tenure_months}mo</td>
                <td className="num">{fd.interest_rate}%</td>
                <td style={{ fontSize: '0.78rem', color: '#64748B' }}>{fd.booking_date}</td>
                <td>{fd.maturity_date}</td>
                <td className="num" style={{ fontWeight: 600, color: '#059669' }}>₹{fmt(fd.status === 'CLOSED_PREMATURE' ? fd.payout_amount : fd.maturity_value)}</td>
                <td style={{ textAlign: 'center' }}><span className={statusBadgeCls(fd.status)}>{tStatus(fd.status)}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <ActionPill icon={<Eye style={{ width: 11, height: 11 }} />} label={t('fd.view_certificate')} onClick={() => printCertificate(fd)} />
                    {fd.status === 'ACTIVE' && (
                      <>
                        <ActionPill icon={<CheckCircle2 style={{ width: 11, height: 11 }} />} label={t('fd.mark_matured')} tone="good" onClick={() => setConfirmAction({ type: 'MATURE', fd })} />
                        <ActionPill icon={<LogOut style={{ width: 11, height: 11 }} />} label={t('fd.premature_exit')} tone="bad" onClick={() => setConfirmAction({ type: 'PREMATURE', fd })} />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={safePage} setPage={setPage} totalPages={totalPages} total={filteredFds.length} startIndex={startIndex} pageSize={pageSize} />
      </div>

      {confirmAction && (() => {
        const isMature = confirmAction.type === 'MATURE';
        const payoutAmount = isMature ? confirmAction.fd.maturity_value : Math.round(confirmAction.fd.maturity_value * 0.98);
        const tone = isMature ? { bg: '#ECFDF5', border: '#A7F3D0', color: '#059669', icon: '#059669' } : { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626', icon: '#DC2626' };
        return (
          <div className="saas-modal-backdrop">
            <div className="saas-modal-card">
              <div className="saas-modal-header">
                <div className="head-left">
                  <div className="head-icon-badge" style={{ background: tone.bg, color: tone.icon }}>
                    {isMature ? <CheckCircle2 style={{ width: 18, height: 18 }} /> : <LogOut style={{ width: 18, height: 18 }} />}
                  </div>
                  <div className="head-titles">
                    <h3>{isMature ? t('fd.confirm_matured_title') : t('fd.confirm_premature_title')}</h3>
                    <p>{confirmAction.fd.fd_account_no} — {confirmAction.fd.customer_name}</p>
                  </div>
                </div>
                <button onClick={() => setConfirmAction(null)} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
              </div>
              <div className="saas-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: tone.bg, border: `1px solid ${tone.border}`, borderRadius: 12, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {isMature ? t('fdc.maturity_value') : t('fd.confirm_premature_title')}
                    </span>
                    <strong style={{ fontSize: '1.3rem', color: tone.color }}>₹{fmt(payoutAmount)}</strong>
                  </div>
                  {!isMature && (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>{t('fdc.maturity_value')}</span>
                      <span style={{ fontSize: '0.9rem', color: '#94A3B8', textDecoration: 'line-through' }}>₹{fmt(confirmAction.fd.maturity_value)}</span>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#334155', margin: 0, lineHeight: 1.5 }}>
                  {isMature
                    ? t('fd.confirm_matured_desc').replace('{amount}', fmt(payoutAmount))
                    : t('fd.confirm_premature_desc').replace('{payout}', fmt(payoutAmount)).replace('{full}', fmt(confirmAction.fd.maturity_value))}
                </p>
              </div>
              <div className="saas-modal-footer">
                <button type="button" onClick={() => setConfirmAction(null)} className="btn-cancel">{t('btn.cancel')}</button>
                <button
                  type="button"
                  onClick={() => {
                    if (isMature) onMatureFd(confirmAction.fd.id);
                    else onPrematureCloseFd(confirmAction.fd.id);
                    setConfirmAction(null);
                  }}
                  className="btn-submit"
                  style={{ background: tone.color, boxShadow: `0 2px 6px ${tone.color}4D` }}
                >
                  {t('fd.confirm_btn')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
