import React, { useState, useMemo } from 'react';
import {
  Wallet, Users, Plus, Trash2, Pencil, X, AlertTriangle, ArrowUpRight, ArrowDownRight, TrendingUp,
  Eye, ArrowLeft, Search, Camera, Phone, Mail, MapPin, Landmark, UserCheck, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

const FORM_MAX_WIDTH = 780;

function useTxnTypes() {
  const { t } = useLanguage();
  return [
    { value: 'CAPITAL_INJECTION', label: t('inv.txn.type_capital_injection') },
    { value: 'TOP_UP', label: t('inv.txn.type_topup') },
    { value: 'WITHDRAWAL', label: t('inv.txn.type_withdrawal') },
    { value: 'YIELD_PAYOUT', label: t('inv.txn.type_yield_payout') }
  ];
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function Avatar({ name, photo, size = 32 }) {
  if (photo) {
    return <img src={photo} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '1px solid #E2E8F0', flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700
    }}>
      {getInitials(name) || '—'}
    </div>
  );
}

function ErrorBanner({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 9, fontSize: '0.78rem', fontWeight: 600, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
      <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  );
}

// Labeled action pills instead of bare icon buttons — bare icons at 12px
// inside a bordered box read as an empty box, not a clickable action.
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

function kycBadgeCls(status) {
  return status === 'VERIFIED' ? 'fin-badge fin-badge--ok' : 'fin-badge fin-badge--warn';
}

function txnIcon(type) {
  if (type === 'WITHDRAWAL') return <ArrowDownRight style={{ width: 12, height: 12 }} />;
  if (type === 'YIELD_PAYOUT') return <TrendingUp style={{ width: 12, height: 12 }} />;
  return <ArrowUpRight style={{ width: 12, height: 12 }} />;
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

// ── Full-screen "Register / Edit Investor" form — same page scaffold as
// customer registration, but capped to a narrower width and packed into
// 3-4 column rows so individual fields stay a sensible size instead of
// stretching edge-to-edge.
function AddInvestorScreen({ initialData, onCancel, onSubmit }) {
  const { t, tStatus } = useLanguage();
  const [form, setForm] = useState(() => initialData || {
    name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '',
    kyc_status: 'PENDING', status: 'ACTIVE', bank_name: '', account_holder_name: '',
    account_no: '', ifsc_no: '', nominee_name: '', nominee_phone: '', nominee_relation: '',
    notes: '', photo: null
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setField('photo', reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.name?.trim() || !form.phone?.trim()) {
      setError(t('cf.err.full_name'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSubmit(form, initialData?.id);
    } catch (err) {
      setError(err?.response?.data?.message || t('inv.modal.save_error'));
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
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
            {initialData ? t('inv.modal.title_edit') : t('inv.register_title')}
          </h1>
        </div>
        <div className="cf-header-right">
          <button type="button" onClick={onCancel} className="btn-cancel" disabled={loading}>{t('btn.cancel')}</button>
          <button type="submit" onClick={handleSubmit} disabled={loading} className="btn-submit">
            {loading ? t('inv.saving_investor') : (initialData ? t('form.save_changes') : t('inv.register_investor_btn'))}
          </button>
        </div>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <form onSubmit={handleSubmit} className="cf-wizard-body">
        <div className="cf-step-pane" style={{ padding: '20px 22px', gap: 16 }}>
          <div className="cf-pane-title" style={{ paddingBottom: 12 }}>
            <Users style={{ width: 16, height: 16, color: '#059669' }} />
            <div>
              <h3>{t('inv.section_profile_title')}</h3>
              <p>{t('inv.section_profile_subtitle')}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={form.name} photo={form.photo} size={48} />
            <div>
              <label htmlFor="investor-photo-upload" className="btn-upload-photo" style={{ display: 'inline-flex', cursor: 'pointer', padding: '5px 10px', fontSize: '0.72rem' }}>
                <Camera style={{ width: 12, height: 12 }} />
                <span>{form.photo ? t('inv.change_photo') : t('inv.upload_photo')}</span>
              </label>
              <input id="investor-photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
            </div>
          </div>

          <div className="form-row form-row--3">
            <div className="form-group">
              <label>{t('inv.modal.name_label')}</label>
              <input type="text" required value={form.name} onChange={e => setField('name', e.target.value)} className="input-control" placeholder="e.g. Venkatesh Capital" />
            </div>
            <div className="form-group">
              <label>{t('inv.modal.phone_label')}</label>
              <input type="text" required value={form.phone} onChange={e => setField('phone', e.target.value)} className="input-control mono" placeholder="10-digit mobile" />
            </div>
            <div className="form-group">
              <label>{t('form.email')}</label>
              <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} className="input-control" placeholder="name@example.com" />
            </div>
          </div>

          <div className="form-row form-row--3">
            <div className="form-group">
              <label>{t('inv.modal.kyc_status_label')}</label>
              <select value={form.kyc_status} onChange={e => setField('kyc_status', e.target.value)} className="input-control">
                <option value="PENDING">{tStatus('PENDING')}</option>
                <option value="VERIFIED">{tStatus('VERIFIED')}</option>
                <option value="REJECTED">{tStatus('REJECTED')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('col.status')}</label>
              <select value={form.status} onChange={e => setField('status', e.target.value)} className="input-control">
                <option value="ACTIVE">{tStatus('ACTIVE')}</option>
                <option value="CLOSED">{tStatus('CLOSED')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('form.pincode')}</label>
              <input type="text" value={form.pincode} onChange={e => setField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} className="input-control mono" placeholder="6-digit PIN" />
            </div>
          </div>

          <div className="form-row form-row--3">
            <div className="form-group">
              <label>{t('col.address')}</label>
              <input type="text" value={form.address} onChange={e => setField('address', e.target.value)} className="input-control" placeholder="Street, Area" />
            </div>
            <div className="form-group">
              <label>{t('form.city')}</label>
              <input type="text" value={form.city} onChange={e => setField('city', e.target.value)} className="input-control" placeholder="e.g. Chennai" />
            </div>
            <div className="form-group">
              <label>{t('form.state')}</label>
              <input type="text" value={form.state} onChange={e => setField('state', e.target.value)} className="input-control" placeholder="e.g. Tamil Nadu" />
            </div>
          </div>
        </div>

        <div className="cf-step-pane" style={{ padding: '20px 22px', gap: 16 }}>
          <div className="cf-pane-title" style={{ paddingBottom: 12 }}>
            <Landmark style={{ width: 16, height: 16, color: '#059669' }} />
            <div>
              <h3>{t('inv.section_bank_title')}</h3>
              <p>{t('inv.section_bank_subtitle')}</p>
            </div>
          </div>
          <div className="form-row form-row--4">
            <div className="form-group">
              <label>{t('cp.bank_name')}</label>
              <input type="text" value={form.bank_name} onChange={e => setField('bank_name', e.target.value)} className="input-control" placeholder="e.g. HDFC Bank" />
            </div>
            <div className="form-group">
              <label>{t('inv.modal.account_holder_name')}</label>
              <input type="text" value={form.account_holder_name} onChange={e => setField('account_holder_name', e.target.value)} className="input-control" placeholder="As per bank records" />
            </div>
            <div className="form-group">
              <label>{t('cp.account_number')}</label>
              <input type="text" value={form.account_no} onChange={e => setField('account_no', e.target.value)} className="input-control mono" placeholder="Account number" />
            </div>
            <div className="form-group">
              <label>{t('cp.ifsc_code')}</label>
              <input type="text" value={form.ifsc_no} onChange={e => setField('ifsc_no', e.target.value.toUpperCase())} className="input-control mono" placeholder="e.g. HDFC0001234" />
            </div>
          </div>
        </div>

        <div className="cf-step-pane" style={{ padding: '20px 22px', gap: 16 }}>
          <div className="cf-pane-title" style={{ paddingBottom: 12 }}>
            <UserCheck style={{ width: 16, height: 16, color: '#059669' }} />
            <div>
              <h3>{t('inv.section_nominee_title')}</h3>
              <p>{t('inv.section_nominee_subtitle')}</p>
            </div>
          </div>
          <div className="form-row form-row--3">
            <div className="form-group">
              <label>{t('cp.nominee_name')}</label>
              <input type="text" value={form.nominee_name} onChange={e => setField('nominee_name', e.target.value)} className="input-control" placeholder="Full name" />
            </div>
            <div className="form-group">
              <label>{t('inv.modal.nominee_phone_label')}</label>
              <input type="text" value={form.nominee_phone} onChange={e => setField('nominee_phone', e.target.value)} className="input-control mono" placeholder="10-digit mobile" />
            </div>
            <div className="form-group">
              <label>{t('inv.nominee_relation_label')}</label>
              <input type="text" value={form.nominee_relation || ''} onChange={e => setField('nominee_relation', e.target.value)} className="input-control" placeholder="e.g. Son, Spouse" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>{t('inv.section_notes_title')}</label>
              <textarea rows={2} value={form.notes || ''} onChange={e => setField('notes', e.target.value)} className="input-control" style={{ height: 'auto', padding: '10px 12px' }} placeholder={t('inv.notes_placeholder')} />
            </div>
          </div>
        </div>

        <div className="cf-wizard-footer">
          <button type="button" onClick={onCancel} className="btn-cancel" disabled={loading}>{t('btn.cancel')}</button>
          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? t('inv.saving_investor') : (initialData ? t('form.save_changes') : t('inv.register_investor_btn'))}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Full-screen "Record Capital Transaction" form — investor is pre-locked
// when launched from a specific investor's profile, open-ended from the
// directory. Shows a live before/after balance preview.
function AddTransactionScreen({ investors, lockInvestorId, balanceFor, onCancel, onSubmit }) {
  const { t } = useLanguage();
  const TXN_TYPES = useTxnTypes();
  const [form, setForm] = useState({
    investor_id: lockInvestorId || investors[0]?.id || '',
    type: 'CAPITAL_INJECTION',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    payment_mode: 'CASH',
    reference_no: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const currentBalance = balanceFor(Number(form.investor_id) || null);
  const amt = parseFloat(form.amount) || 0;
  const newBalance = form.type === 'WITHDRAWAL' ? currentBalance - amt
    : (form.type === 'CAPITAL_INJECTION' || form.type === 'TOP_UP') ? currentBalance + amt
    : currentBalance;
  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.investor_id || !form.amount) {
      setError(t('inv.txn.save_error'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSubmit({ ...form, investor_id: Number(form.investor_id), amount: parseFloat(form.amount) });
    } catch (err) {
      setError(err?.response?.data?.message || t('inv.txn.save_error'));
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
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>{t('txn.register_title')}</h1>
        </div>
        <div className="cf-header-right">
          <button type="button" onClick={onCancel} className="btn-cancel" disabled={loading}>{t('btn.cancel')}</button>
          <button type="submit" onClick={handleSubmit} disabled={loading} className="btn-submit">
            {loading ? t('txn.saving') : t('inv.txn.submit')}
          </button>
        </div>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <form onSubmit={handleSubmit} className="cf-wizard-body">
        <div className="cf-step-pane" style={{ padding: '20px 22px', gap: 16 }}>
          <div className="cf-pane-title" style={{ paddingBottom: 12 }}>
            <TrendingUp style={{ width: 16, height: 16, color: '#059669' }} />
            <div>
              <h3>{t('txn.section_details_title')}</h3>
              <p>{t('txn.section_details_subtitle')}</p>
            </div>
          </div>

          <div className="form-row form-row--3">
            <div className="form-group">
              <label>{t('inv.txn.investor_label')}</label>
              <select required disabled={Boolean(lockInvestorId)} value={form.investor_id} onChange={e => setField('investor_id', e.target.value)} className="input-control">
                {investors.map(i => <option key={i.id} value={i.id}>{i.name} ({i.investor_code})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{t('inv.txn.type_label')}</label>
              <select value={form.type} onChange={e => setField('type', e.target.value)} className="input-control">
                {TXN_TYPES.map(tt => <option key={tt.value} value={tt.value}>{tt.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{t('inv.txn.amount_label')}</label>
              <input type="number" min="1" required value={form.amount} onChange={e => setField('amount', e.target.value)} className="input-control mono" placeholder="0.00" />
            </div>
          </div>

          <div className="form-row form-row--3">
            <div className="form-group">
              <label>{t('col.date')}</label>
              <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} className="input-control" />
            </div>
            <div className="form-group">
              <label>{t('txn.payment_mode_label')}</label>
              <select value={form.payment_mode} onChange={e => setField('payment_mode', e.target.value)} className="input-control">
                <option value="CASH">{t('fin.mode_cash')}</option>
                <option value="BANK">{t('fin.mode_bank')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('txn.reference_no_label')}</label>
              <input type="text" value={form.reference_no} onChange={e => setField('reference_no', e.target.value)} className="input-control mono" placeholder="Cheque / UTR (optional)" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>{t('inv.txn.notes_label')}</label>
              <textarea rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} className="input-control" style={{ height: 'auto', padding: '10px 12px' }} placeholder={t('inv.notes_placeholder')} />
            </div>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div>
              <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', fontWeight: 500, textTransform: 'uppercase' }}>{t('txn.current_balance_label')}</span>
              <strong style={{ fontSize: '0.92rem', color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>₹{fmt(currentBalance)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', fontWeight: 500, textTransform: 'uppercase' }}>{t('txn.new_balance_label')}</span>
              <strong style={{ fontSize: '0.92rem', color: form.type === 'WITHDRAWAL' ? '#DC2626' : '#059669', fontVariantNumeric: 'tabular-nums' }}>₹{fmt(newBalance)}</strong>
            </div>
          </div>
        </div>

        <div className="cf-wizard-footer">
          <button type="button" onClick={onCancel} className="btn-cancel" disabled={loading}>{t('btn.cancel')}</button>
          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? t('txn.saving') : t('inv.txn.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}

// One investor at a time: photo, contact/bank/nominee details, personal KPIs and
// their own capital ledger — kept off the directory page so the two don't compete
// for space the way they did when they were stacked on a single screen.
function InvestorProfileView({ investor, transactions, onBack, onEdit, onAddTransaction }) {
  const { t, tStatus } = useLanguage();
  const TXN_TYPES = useTxnTypes();
  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const myTxnsAsc = useMemo(() => transactions
    .filter(tx => tx.investor_id === investor.id)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)), [transactions, investor.id]);

  let running = 0;
  const withRunning = myTxnsAsc.map(tx => {
    running += tx.type === 'WITHDRAWAL' ? -tx.amount : (tx.type === 'CAPITAL_INJECTION' || tx.type === 'TOP_UP' ? tx.amount : 0);
    return { ...tx, runningBalance: running };
  });
  const myTxns = withRunning.slice().reverse();

  const totalInjected = myTxns.filter(tx => tx.type === 'CAPITAL_INJECTION' || tx.type === 'TOP_UP').reduce((s, tx) => s + tx.amount, 0);
  const totalWithdrawn = myTxns.filter(tx => tx.type === 'WITHDRAWAL').reduce((s, tx) => s + tx.amount, 0);
  const totalYield = myTxns.filter(tx => tx.type === 'YIELD_PAYOUT').reduce((s, tx) => s + tx.amount, 0);
  const balance = totalInjected - totalWithdrawn;

  const totalPages = Math.ceil(myTxns.length / pageSize) || 1;
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedTxns = myTxns.slice(startIndex, startIndex + pageSize);

  return (
    <div className="fin-page">
      <div className="fin-header-card" style={{ background: 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 55%)' }}>
        <div className="fin-page-header">
          <div className="fin-page-header__left" style={{ gap: 14 }}>
            <button type="button" onClick={onBack} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <ArrowLeft style={{ width: 15, height: 15 }} />
            </button>
            <Avatar name={investor.name} photo={investor.photo} size={50} />
            <div>
              <h1 className="fin-page-header__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {investor.name}
                <span className={kycBadgeCls(investor.kyc_status)}>{tStatus(investor.kyc_status)}</span>
                {investor.status === 'CLOSED' && <span className="fin-badge">{tStatus('CLOSED')}</span>}
              </h1>
              <p className="fin-page-header__subtitle">{investor.investor_code} — {t('inv.profile_subtitle')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="fin-btn-primary" style={{ background: '#475569' }} onClick={onEdit}>
              <Pencil style={{ width: 14, height: 14 }} />
              <span>{t('inv.edit_investor')}</span>
            </button>
            <button type="button" className="fin-btn-primary" style={{ background: '#059669' }} onClick={onAddTransaction}>
              <Plus style={{ width: 14, height: 14 }} />
              <span>{t('inv.add_transaction')}</span>
            </button>
          </div>
        </div>

        <div className="fin-header-stats">
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('col.capital_balance')}</span>
            <span className="fin-header-stat__value">₹{fmt(balance)}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('inv.total_injected_label')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">₹{fmt(totalInjected)}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('inv.total_yield_paid')}</span>
            <span className="fin-header-stat__value">₹{fmt(totalYield)}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('inv.transaction_count_label')}</span>
            <span className="fin-header-stat__value">{myTxns.length}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div className="fin-tablewrap" style={{ padding: 16 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Phone style={{ width: 13, height: 13, color: '#059669' }} />
            {t('inv.contact_details_heading')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', gap: 8, color: '#334155' }}><Phone style={{ width: 13, height: 13, color: '#94A3B8', marginTop: 2 }} />{investor.phone || '—'}</div>
            <div style={{ display: 'flex', gap: 8, color: '#334155' }}><Mail style={{ width: 13, height: 13, color: '#94A3B8', marginTop: 2 }} />{investor.email || '—'}</div>
            <div style={{ display: 'flex', gap: 8, color: '#334155' }}><MapPin style={{ width: 13, height: 13, color: '#94A3B8', marginTop: 2 }} />
              {[investor.address, investor.city, investor.state, investor.pincode].filter(Boolean).join(', ') || '—'}
            </div>
          </div>
        </div>

        <div className="fin-tablewrap" style={{ padding: 16 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Landmark style={{ width: 13, height: 13, color: '#059669' }} />
            {t('cp.bank_details')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem', color: '#334155' }}>
            <div>{investor.bank_name || '—'}</div>
            <div style={{ fontFamily: 'monospace', color: '#64748B' }}>{investor.account_no || '—'}</div>
            <div style={{ fontFamily: 'monospace', color: '#64748B' }}>{investor.ifsc_no || '—'}</div>
          </div>
        </div>

        <div className="fin-tablewrap" style={{ padding: 16 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserCheck style={{ width: 13, height: 13, color: '#059669' }} />
            {t('inv.nominee_heading')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem', color: '#334155' }}>
            <div>{investor.nominee_name || '—'} {investor.nominee_relation ? `(${investor.nominee_relation})` : ''}</div>
            <div style={{ color: '#64748B' }}>{investor.nominee_phone || '—'}</div>
          </div>
        </div>

        {investor.notes && (
          <div className="fin-tablewrap" style={{ padding: 16 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 12 }}>
              {t('inv.section_notes_title')}
            </div>
            <p style={{ fontSize: '0.8rem', color: '#334155', margin: 0, lineHeight: 1.5 }}>{investor.notes}</p>
          </div>
        )}
      </div>

      <div className="fin-filterbar__label" style={{ marginTop: 4 }}>{t('inv.personal_ledger_heading')}</div>
      <div className="fin-tablewrap">
        <table className="fin-grid-table">
          <thead>
            <tr>
              <th>{t('col.date')}</th>
              <th>{t('col.type')}</th>
              <th className="num">{t('col.amount')}</th>
              <th className="num">{t('col.balance')}</th>
              <th>{t('txn.payment_mode_label')}</th>
              <th>{t('txn.reference_no_label')}</th>
              <th>{t('col.notes')}</th>
            </tr>
          </thead>
          <tbody>
            {pagedTxns.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>{t('inv.no_transactions')}</td></tr>
            ) : pagedTxns.map(tx => (
              <tr key={tx.id}>
                <td>{tx.date}</td>
                <td>
                  <span className="fin-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {txnIcon(tx.type)}
                    {TXN_TYPES.find(x => x.value === tx.type)?.label || tx.type}
                  </span>
                </td>
                <td className="num" style={{ fontWeight: 600, color: tx.type === 'WITHDRAWAL' ? '#DC2626' : '#059669' }}>
                  {tx.type === 'WITHDRAWAL' ? '-' : '+'}₹{fmt(tx.amount)}
                </td>
                <td className="num" style={{ color: '#334155' }}>₹{fmt(tx.runningBalance)}</td>
                <td>{tx.payment_mode === 'BANK' ? t('fin.mode_bank') : tx.payment_mode === 'CASH' ? t('fin.mode_cash') : '—'}</td>
                <td className="code">{tx.reference_no || '—'}</td>
                <td>{tx.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={safePage} setPage={setPage} totalPages={totalPages} total={myTxns.length} startIndex={startIndex} pageSize={pageSize} />
      </div>
    </div>
  );
}

const INVESTOR_TABS = [
  { id: 'ACTIVE', labelKey: 'fin.status_active' },
  { id: 'CLOSED', labelKey: 'status.CLOSED' }
];

export default function InvestorCapitalView({
  investors = [], transactions = [],
  onCreateInvestor, onUpdateInvestor, onDeleteInvestor, onCreateTransaction
}) {
  const { t, tStatus } = useLanguage();
  const [screen, setScreen] = useState('DIRECTORY'); // 'DIRECTORY' | 'ADD_INVESTOR' | 'ADD_TXN'
  const [editingInvestor, setEditingInvestor] = useState(null);
  const [txnLockInvestorId, setTxnLockInvestorId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [viewingInvestorId, setViewingInvestorId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState('ACTIVE');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const balanceFor = (investorId) => transactions
    .filter(tx => tx.investor_id === investorId)
    .reduce((acc, tx) => acc + (tx.type === 'WITHDRAWAL' ? -tx.amount : (tx.type === 'CAPITAL_INJECTION' || tx.type === 'TOP_UP' ? tx.amount : 0)), 0);

  const totalCapital = investors.reduce((acc, i) => acc + balanceFor(i.id), 0);
  const totalYieldPaid = transactions.filter(tx => tx.type === 'YIELD_PAYOUT').reduce((acc, tx) => acc + tx.amount, 0);

  const viewingInvestor = investors.find(i => i.id === viewingInvestorId) || null;

  if (screen === 'ADD_INVESTOR') {
    return (
      <AddInvestorScreen
        initialData={editingInvestor}
        onCancel={() => { setScreen(viewingInvestorId ? 'PROFILE' : 'DIRECTORY'); setEditingInvestor(null); }}
        onSubmit={async (form, id) => {
          await (id ? onUpdateInvestor(id, form) : onCreateInvestor(form));
          setScreen(viewingInvestorId ? 'PROFILE' : 'DIRECTORY');
          setEditingInvestor(null);
        }}
      />
    );
  }

  if (screen === 'ADD_TXN') {
    return (
      <AddTransactionScreen
        investors={investors}
        lockInvestorId={txnLockInvestorId}
        balanceFor={balanceFor}
        onCancel={() => { setScreen(viewingInvestorId ? 'PROFILE' : 'DIRECTORY'); setTxnLockInvestorId(null); }}
        onSubmit={async (payload) => {
          await onCreateTransaction(payload);
          setScreen(viewingInvestorId ? 'PROFILE' : 'DIRECTORY');
          setTxnLockInvestorId(null);
        }}
      />
    );
  }

  if (viewingInvestor) {
    return (
      <InvestorProfileView
        investor={viewingInvestor}
        transactions={transactions}
        onBack={() => setViewingInvestorId(null)}
        onEdit={() => { setEditingInvestor(viewingInvestor); setScreen('ADD_INVESTOR'); }}
        onAddTransaction={() => { setTxnLockInvestorId(viewingInvestor.id); setScreen('ADD_TXN'); }}
      />
    );
  }

  const byTab = investors.filter(i => (i.status || 'ACTIVE') === statusTab);
  const filteredInvestors = byTab.filter(i => {
    const q = searchQuery.toLowerCase().trim();
    return !q || i.name.toLowerCase().includes(q) || i.investor_code.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filteredInvestors.length / pageSize) || 1;
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedInvestors = filteredInvestors.slice(startIndex, startIndex + pageSize);

  return (
    <div className="fin-page">
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669' }}>
              <Wallet style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('inv.title')}</h1>
              <p className="fin-page-header__subtitle">{t('inv.subtitle')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="fin-btn-primary" style={{ background: '#475569' }} onClick={() => { setTxnLockInvestorId(null); setScreen('ADD_TXN'); }} disabled={!investors.length}>
              <Plus style={{ width: 14, height: 14 }} />
              <span>{t('inv.add_transaction')}</span>
            </button>
            <button type="button" className="fin-btn-primary" style={{ background: '#059669' }} onClick={() => { setEditingInvestor(null); setScreen('ADD_INVESTOR'); }}>
              <Plus style={{ width: 14, height: 14 }} />
              <span>{t('inv.add_investor')}</span>
            </button>
          </div>
        </div>

        <div className="fin-header-stats">
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('inv.total_active_capital')}</span>
            <span className="fin-header-stat__value">₹{fmt(totalCapital)}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('inv.active_investors')}</span>
            <span className="fin-header-stat__value">{investors.filter(i => (i.status || 'ACTIVE') === 'ACTIVE').length}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('inv.total_yield_paid')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">₹{fmt(totalYieldPaid)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <StatusTabs
          tabs={INVESTOR_TABS.map(tab => ({ id: tab.id, label: t(tab.labelKey), count: investors.filter(i => (i.status || 'ACTIVE') === tab.id).length }))}
          active={statusTab}
          onChange={(id) => { setStatusTab(id); setPage(1); }}
        />

        <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
          <Search style={{ position: 'absolute', left: 10, top: 9, width: 14, height: 14, color: '#94A3B8' }} />
          <input style={{ paddingLeft: 30, width: '100%', height: 34, borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.78rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} type="text" placeholder={t('inv.search_placeholder')} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="fin-tablewrap">
        <table className="fin-grid-table">
          <thead>
            <tr>
              <th style={{ width: 50, textAlign: 'center' }}>{t('col.sno')}</th>
              <th>{t('col.investor')}</th>
              <th>{t('col.phone')}</th>
              <th>{t('col.email_address')}</th>
              <th>{t('form.city')}</th>
              <th>{t('col.bank_account')}</th>
              <th style={{ textAlign: 'center' }}>{t('col.kyc')}</th>
              <th className="num">{t('col.capital_balance')}</th>
              <th style={{ textAlign: 'right', minWidth: 190 }}>{t('col.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {pagedInvestors.length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>{investors.length === 0 ? t('inv.no_investors') : t('fin.no_results_hint')}</td></tr>
            ) : pagedInvestors.map((inv, idx) => (
              <tr key={inv.id} onClick={() => setViewingInvestorId(inv.id)} style={{ cursor: 'pointer' }}>
                <td style={{ textAlign: 'center', color: '#64748B' }}>{startIndex + idx + 1}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={inv.name} photo={inv.photo} size={30} />
                    <div>
                      <strong style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.82rem' }}>{inv.name}</strong>
                      <div style={{ fontSize: '0.68rem', color: '#94A3B8', fontFamily: 'monospace' }}>{inv.investor_code}</div>
                    </div>
                  </div>
                </td>
                <td>{inv.phone}</td>
                <td style={{ color: '#64748B', fontSize: '0.78rem' }}>{inv.email || '—'}</td>
                <td style={{ color: '#64748B', fontSize: '0.78rem' }}>{inv.city || '—'}</td>
                <td style={{ color: '#64748B', fontSize: '0.78rem' }}>{inv.bank_name} • {inv.account_no}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={kycBadgeCls(inv.kyc_status)}>{tStatus(inv.kyc_status)}</span>
                </td>
                <td className="num" style={{ fontWeight: 600, color: '#059669' }}>₹{fmt(balanceFor(inv.id))}</td>
                <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <ActionPill icon={<Eye style={{ width: 11, height: 11 }} />} label={t('inv.view_profile')} onClick={() => setViewingInvestorId(inv.id)} />
                    <ActionPill icon={<Pencil style={{ width: 11, height: 11 }} />} label={t('inv.edit_pill')} onClick={() => { setEditingInvestor(inv); setScreen('ADD_INVESTOR'); }} />
                    <ActionPill icon={<Trash2 style={{ width: 11, height: 11 }} />} label={t('inv.delete_pill')} tone="bad" onClick={() => { setDeleteTarget(inv); setDeleteError(''); }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={safePage} setPage={setPage} totalPages={totalPages} total={filteredInvestors.length} startIndex={startIndex} pageSize={pageSize} />
      </div>

      {deleteTarget && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card">
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' }}>
                  <Trash2 style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>{t('inv.delete_investor_title')}</h3>
                  <p>{t('inv.delete_investor_subtitle')}</p>
                </div>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="saas-modal-body">
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>{t('inv.delete_investor_confirm')} <strong>{deleteTarget.name}</strong>?</p>
              {deleteError && <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{deleteError}</span></div>}
            </div>
            <div className="saas-modal-footer">
              <button type="button" onClick={() => setDeleteTarget(null)} className="btn-cancel">{t('btn.cancel')}</button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await onDeleteInvestor(deleteTarget.id);
                    setDeleteTarget(null);
                  } catch (err) {
                    setDeleteError(err?.response?.data?.message || t('inv.delete_investor_error'));
                  }
                }}
                className="btn-submit"
                style={{ background: '#DC2626', boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)' }}
              >
                {t('inv.delete_investor_title')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
