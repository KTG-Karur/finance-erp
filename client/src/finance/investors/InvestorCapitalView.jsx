import React, { useState, useMemo } from 'react';
import {
  Wallet, Users, Plus, Trash2, Pencil, X, AlertTriangle,
  Eye, ArrowLeft, Search, Camera, Phone, Mail, MapPin, UserCheck, ChevronLeft, ChevronRight, TrendingUp
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import SharedDropdown from '../../components/common/SharedDropdown';
import SharedDatePicker from '../../components/common/SharedDatePicker';
import { uploadFile } from '../../api/upload';

const FORM_MAX_WIDTH = 780;

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
      background: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary, #15803D)', border: '1px solid var(--brand-primary-border, #A3F5C1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700
    }}>
      {getInitials(name) || '—'}
    </div>
  );
}

function ErrorBanner({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 9, fontSize: '0.78rem', fontWeight: 600, background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', color: 'var(--color-danger-hover, #B91C1C)' }}>
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
    good: { bg: 'var(--brand-primary-light, #F0FEF5)', border: 'var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)' },
    bad: { bg: 'var(--color-danger-light, #FEF2F2)', border: 'var(--color-danger-border, #FECACA)', color: 'var(--color-danger, #DC2626)' }
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
  const { t } = useLanguage();
  return (
    <div className="table-pagination">
      <div className="table-pagination__info">
        {t('pagination.showing', 'Showing')} <strong>{total === 0 ? 0 : startIndex + 1}</strong> {t('pagination.to', 'to')} <strong>{Math.min(startIndex + pageSize, total)}</strong> {t('pagination.of', 'of')} <strong>{total}</strong> {t('pagination.entries', 'entries')}
      </div>
      <div className="table-pagination__controls">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
          <ChevronLeft style={{ width: 14, height: 14 }} />
          <span>{t('btn.prev', 'Previous')}</span>
        </button>
        <span className="page-indicator">{t('pagination.page', 'Page')} {page} {t('pagination.of', 'of')} {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
          <span>{t('btn.next', 'Next')}</span>
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}

// ── Full-screen "Register / Edit Investor" form — same page scaffold as
// customer registration, but capped to a narrower width and packed into
// 3-4 column rows so individual fields stay a sensible size instead of
function AddInvestorScreen({ initialData, bankAccounts = [], branchesList = [], onCancel, onSubmit }) {
  const { t, tStatus } = useLanguage();
  const [form, setForm] = useState(() => initialData || {
    name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '',
    status: 'ACTIVE', nominee_name: '', nominee_phone: '', nominee_relation: '',
    capital_amount: '', join_date: new Date().toISOString().slice(0, 10), exit_date: '',
    payment_mode: 'BANK_TRANSFER',
    bank_account_id: bankAccounts[0]?.id || '',
    branch: branchesList[0]?.name || 'Main Branch',
    notes: '', photo: null
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG or PNG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo is too large — please upload an image under 5MB.');
      return;
    }
    setError('');
    try {
      const res = await uploadFile(file, { subfolder: 'investors', category: 'profile', prefix: 'inv_profile' });
      if (res?.url) {
        setField('photo', res.url);
      }
    } catch {
      setError('Failed to upload investor photo.');
    }
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
      const selectedBank = bankAccounts.find(b => String(b.id) === String(form.bank_account_id));
      const settlementCode = form.payment_mode === 'CASH' ? '1001' : (selectedBank?.account_code || selectedBank?.ledger_account_code || '1002');

      await onSubmit({
        ...form,
        settlement_account_code: settlementCode,
        capital_amount: form.capital_amount === '' ? 0 : Number(form.capital_amount),
        exit_date: form.status === 'EXITED' ? (form.exit_date || new Date().toISOString().slice(0, 10)) : null
      }, initialData?.id);
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
            <Users style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
            <div>
              <h3>{t('inv.section_profile_title')}</h3>
              <p>{t('inv.section_profile_subtitle')}</p>
            </div>
          </div>

          <div className="cf-vault-photo-card" style={{ marginBottom: 14, maxWidth: 320, padding: '12px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10 }}>
            <div className="cf-card-label" style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
              {t('cf.profile_photo_label')}
            </div>
            <div className="cf-photo-flex" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="cf-photo-avatar" style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', border: '2px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--brand-primary-light, #F0FEF5)' }}>
                <Avatar name={form.name} photo={form.photo} size={48} />
              </div>
              <div className="cf-photo-actions" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label htmlFor="investor-photo-upload" className="btn-upload-photo" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600, background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, color: '#334155' }}>
                  <Camera style={{ width: 13, height: 13, color: 'var(--brand-primary, #15803D)' }} />
                  <span>{form.photo ? t('inv.change_photo') : t('inv.upload_photo')}</span>
                </label>
                <input id="investor-photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                <span className="cf-photo-hint" style={{ fontSize: '0.65rem', color: '#94A3B8' }}>JPG, PNG up to 5MB</span>
              </div>
            </div>
          </div>

          <div className="form-row form-row--3">
            <div className="form-group">
              <label>{t('inv.modal.name_label')}</label>
              <input type="text" required value={form.name} onChange={e => setField('name', e.target.value)} className="input-control" placeholder="e.g. Venkatesh Capital" />
            </div>
            <div className="form-group">
              <label>{t('inv.modal.phone_label')}</label>
              <input type="text" required value={form.phone} onChange={e => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} className="input-control mono" placeholder="10-digit mobile" />
            </div>
            <div className="form-group">
              <label>{t('form.email')}</label>
              <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} className="input-control" placeholder="name@example.com" />
            </div>
          </div>

          <div className="form-row form-row--3">
            <div className="form-group">
              <label>{t('col.status')}</label>
              <SharedDropdown
                value={form.status}
                onChange={e => setField('status', e.target.value)}
                options={[
                  { value: 'ACTIVE', label: tStatus('ACTIVE') },
                  { value: 'EXITED', label: tStatus('EXITED') }
                ]}
              />
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
            <TrendingUp style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
            <div>
              <h3>{t('inv.kpi_total_capital', 'Capital')}</h3>
              <p>{t('inv.subtitle', 'How much this investor has put in')}</p>
            </div>
          </div>
          <div className="form-row form-row--2">
            <div className="form-group">
              <label>{t('inv.initial_capital', 'Capital Amount (₹)')}</label>
              <input type="number" min="0" value={form.capital_amount} onChange={e => setField('capital_amount', e.target.value)} className="input-control mono" placeholder="e.g. 2500000" />
            </div>
            <div className="form-group">
              <label>{t('inv.onboard_date', 'Join Date')}</label>
              <SharedDatePicker
                value={form.join_date || ''}
                onChange={e => setField('join_date', e.target.value)}
                buttonStyle={{ height: 42 }}
              />
            </div>
          </div>

          {!initialData && Number(form.capital_amount) > 0 && (
            <div className="form-row form-row--3" style={{ marginTop: 6, paddingTop: 14, borderTop: '1px dashed #E2E8F0' }}>
              <div className="form-group">
                <label>Payment Mode</label>
                <SharedDropdown
                  value={form.payment_mode || 'BANK_TRANSFER'}
                  onChange={e => setField('payment_mode', e.target.value)}
                  options={[
                    { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT / RTGS' },
                    { value: 'CASH', label: 'Cash in Hand (1001)' },
                    { value: 'CHEQUE', label: 'Cheque' },
                    { value: 'ONLINE', label: 'Online / Net Banking / UPI' }
                  ]}
                />
              </div>

              {form.payment_mode !== 'CASH' && (
                <div className="form-group">
                  <label>Deposit To Bank Account</label>
                  <SharedDropdown
                    value={form.bank_account_id || ''}
                    onChange={e => setField('bank_account_id', e.target.value)}
                    options={bankAccounts.length > 0 ? bankAccounts.map(b => ({
                      value: String(b.id),
                      label: `${b.bank_name} - ${b.account_number || b.account_name} (${b.branch || 'Main'})`
                    })) : [{ value: '', label: 'Default Operating Bank (1002)' }]}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Operating Branch</label>
                <SharedDropdown
                  value={form.branch || (branchesList[0]?.name || 'Main Branch')}
                  onChange={e => setField('branch', e.target.value)}
                  options={branchesList.length > 0 ? branchesList.map(b => ({
                    value: b.name,
                    label: `${b.name} (${b.code || 'BR'})`
                  })) : [{ value: 'Main Branch', label: 'Main Branch' }]}
                />
              </div>
            </div>
          )}

          {form.status === 'EXITED' && (
            <div className="form-row form-row--2">
              <div className="form-group">
                <label>{t('col.exit_date', 'Exit Date')}</label>
                <SharedDatePicker
                  value={form.exit_date || ''}
                  onChange={e => setField('exit_date', e.target.value)}
                  buttonStyle={{ height: 42 }}
                />
              </div>
            </div>
          )}
        </div>


        <div className="cf-step-pane" style={{ padding: '20px 22px', gap: 16 }}>
          <div className="cf-pane-title" style={{ paddingBottom: 12 }}>
            <UserCheck style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
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
              <input type="text" value={form.nominee_phone} onChange={e => setField('nominee_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} className="input-control mono" placeholder="10-digit mobile" />
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

function AddInvestorCapitalModal({ investor, bankAccounts = [], branchesList = [], onClose, onSubmit }) {
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [bankAccountId, setBankAccountId] = useState(() => bankAccounts[0]?.id ? String(bankAccounts[0].id) : '');
  const [branch, setBranch] = useState(() => branchesList[0]?.name || 'Main Branch');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const currentCapital = Number(investor?.capital_amount || 0);
  const addAmountNum = parseFloat(amount) || 0;
  const newBalance = currentCapital + addAmountNum;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!addAmountNum || addAmountNum <= 0) {
      setError('Please enter a valid capital amount greater than 0.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const selectedBank = bankAccounts.find(b => String(b.id) === String(bankAccountId));
      const settlementCode = paymentMode === 'CASH' ? '1001' : (selectedBank?.account_code || '1002');

      await onSubmit(investor.id, {
        amount: addAmountNum,
        date,
        payment_mode: paymentMode,
        settlement_account_code: settlementCode,
        branch,
        notes: notes.trim()
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to add capital. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card" style={{ maxWidth: 480 }}>
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: 'var(--brand-primary-light, #F0FEF5)', borderColor: 'var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)' }}>
              <TrendingUp style={{ width: 18, height: 18 }} />
            </div>
            <div className="head-titles">
              <h3>Add Investor Capital</h3>
              <p>{investor?.investor_code} — {investor?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button" disabled={loading}><X style={{ width: 16, height: 16 }} /></button>
        </div>

        <form onSubmit={handleSubmit} className="saas-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div className="form-alert form-alert--error">
              <AlertTriangle style={{ width: 14, height: 14 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Balance Preview Card */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.66rem', color: '#64748B', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Current Capital Balance</span>
              <strong style={{ fontSize: '1.05rem', color: '#0F172A' }}>₹{fmt(currentCapital)}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.66rem', color: '#64748B', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>New Capital Balance</span>
              <strong style={{ fontSize: '1.15rem', color: 'var(--brand-primary, #15803D)' }}>₹{fmt(newBalance)}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
              Additional Capital Amount (₹) <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 500000"
              style={{
                height: 38, padding: '0 12px', borderRadius: 8,
                border: '1px solid #CBD5E1', fontSize: '0.9rem',
                fontWeight: 600, fontFamily: 'monospace', outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>Contribution Date</label>
              <SharedDatePicker
                value={date}
                onChange={e => setDate(e.target.value)}
                buttonStyle={{ height: 38 }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>Payment Mode</label>
              <SharedDropdown
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value)}
                buttonStyle={{ height: 38 }}
                options={[
                  { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS)' },
                  { value: 'UPI', label: 'UPI / Online' },
                  { value: 'CHEQUE', label: 'Cheque' },
                  { value: 'CASH', label: 'Cash in Hand' }
                ]}
              />
            </div>
          </div>

          {paymentMode !== 'CASH' && bankAccounts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>Deposit Company Bank Account</label>
              <SharedDropdown
                value={bankAccountId}
                onChange={e => setBankAccountId(e.target.value)}
                buttonStyle={{ height: 38 }}
                options={bankAccounts.map(b => ({
                  value: String(b.id),
                  label: `${b.bank_name} - ${b.account_number} (${b.account_name || 'Main'})`
                }))}
              />
            </div>
          )}

          {branchesList.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>Branch</label>
              <SharedDropdown
                value={branch}
                onChange={e => setBranch(e.target.value)}
                buttonStyle={{ height: 38 }}
                options={branchesList.map(b => ({ value: b.name, label: b.name }))}
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>Transaction Reference / Remarks</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Cheque #441029 / RTGS Ref / Board resolution note"
              style={{
                height: 38, padding: '0 12px', borderRadius: 8,
                border: '1px solid #CBD5E1', fontSize: '0.82rem',
                fontFamily: 'inherit', outline: 'none'
              }}
            />
          </div>

          <p style={{ fontSize: '0.74rem', color: '#64748B', margin: 0, lineHeight: 1.4 }}>
            An automatic double-entry voucher will be posted: Debiting <strong>{paymentMode === 'CASH' ? 'Cash in Hand (1001)' : 'Bank Account (1002)'}</strong> and Crediting <strong>Promoter Share Capital (3001)</strong>.
          </p>

          <div className="saas-modal-footer" style={{ marginTop: 6, padding: '12px 0 0 0', borderTop: '1px solid #E2E8F0' }}>
            <button type="button" onClick={onClose} disabled={loading} className="btn-cancel">{t('btn.cancel')}</button>
            <button
              type="submit"
              disabled={loading}
              className="btn-submit"
              style={{ background: loading ? '#94A3B8' : 'var(--brand-primary, #15803D)', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Posting Voucher...' : 'Confirm & Deposit Capital'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InvestorProfileView({ investor, bankAccounts = [], branchesList = [], journalEntries = [], onBack, onEdit, onAddCapital }) {
  const { t, tStatus } = useLanguage();
  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const investorTxns = useMemo(() => {
    const txns = [];
    const code = investor.investor_code || `INV-${String(investor.id).padStart(4, '0')}`;
    const invIdStr = String(investor.id);

    const matchingVouchers = (journalEntries || []).filter(j => {
      const text = (j.narration || j.description || '');
      const isInvRef = j.ref_type === 'INVESTOR_CAPITAL' && String(j.ref_id) === invIdStr;
      const mentionsCode = text.includes(code) || (text.includes('Investor') && text.includes(investor.name));
      return isInvRef || mentionsCode;
    });

    if (matchingVouchers.length > 0) {
      const sorted = [...matchingVouchers].sort((a, b) => new Date(a.date || a.entry_date) - new Date(b.date || b.entry_date));
      let currentBal = 0;
      sorted.forEach(v => {
        const lineAmt = (v.lines || []).reduce((s, l) => Math.max(s, Number(l.debit || l.credit || 0)), 0);
        const amt = Number(v.total_amount || lineAmt || v.amount || 0);
        currentBal += amt;
        const text = (v.narration || v.description || '');
        const isCash = text.toUpperCase().includes('(CASH)') || text.toUpperCase().includes('CASH') || (v.lines || []).some(l => l.account_code === '1001');
        txns.push({
          id: v.id || v.db_id,
          voucher_no: v.voucher_no || v.id,
          date: String(v.date || v.entry_date || v.created_at || '').slice(0, 10),
          description: text || `Capital Contribution (${code})`,
          payment_mode: isCash ? 'CASH' : 'BANK',
          amount: amt,
          running_balance: currentBal,
          created_by: v.created_by || 'Admin'
        });
      });
    } else if (Number(investor.capital_amount) > 0) {
      txns.push({
        id: `INIT-${investor.id}`,
        voucher_no: `VOU-INV-${investor.id}`,
        date: String(investor.join_date || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
        description: `Initial Capital Contribution from ${investor.name} (${code})`,
        payment_mode: 'BANK',
        amount: Number(investor.capital_amount),
        running_balance: Number(investor.capital_amount),
        created_by: 'Admin'
      });
    }
    return txns;
  }, [journalEntries, investor]);

  return (
    <div className="fin-page" style={{ maxWidth: 960, margin: '0 auto' }}>
      
      {/* Header Bar */}
      <div className="fin-header-card" style={{ background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)', border: '1px solid #E2E8F0', borderRadius: 14, padding: '24px 28px', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              type="button"
              onClick={onBack}
              style={{
                width: 36, height: 36, borderRadius: 10, border: '1px solid #CBD5E1',
                background: '#FFFFFF', color: '#334155', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Back to Directory"
            >
              <ArrowLeft style={{ width: 16, height: 16 }} />
            </button>

            <Avatar name={investor.name} photo={investor.photo} size={54} />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                  {investor.name}
                </h1>
                <span className="code" style={{ fontSize: '0.75rem', padding: '3px 9px', background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', borderRadius: 6, fontWeight: 700 }}>
                  {investor.investor_code || `INV-${String(investor.id).padStart(4, '0')}`}
                </span>
                <span className={`fin-badge ${investor.status === 'ACTIVE' ? 'fin-badge--ok' : 'fin-badge--warn'}`}>
                  {tStatus(investor.status || 'ACTIVE')}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                Registered Investor Capital Portfolio & Contact Directory
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => onAddCapital(investor)}
              disabled={investor.status === 'EXITED'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: 'var(--brand-primary, #15803D)', color: '#FFFFFF', fontSize: '0.78rem',
                fontWeight: 700, cursor: investor.status === 'EXITED' ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb),0.25)'
              }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              <span>Add Capital</span>
            </button>

            <button
              type="button"
              onClick={onEdit}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, border: '1px solid #CBD5E1',
                background: '#FFFFFF', color: '#334155', fontSize: '0.78rem',
                fontWeight: 700, cursor: 'pointer'
              }}
            >
              <Pencil style={{ width: 14, height: 14 }} />
              <span>Edit Details</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 24, paddingTop: 20, borderTop: '1px solid #E2E8F0' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '14px 18px', borderRadius: 10 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Capital Invested</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--brand-primary, #15803D)', marginTop: 4 }}>₹{fmt(investor.capital_amount)}</div>
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '14px 18px', borderRadius: 10 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Joining Date</span>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{investor.join_date || '—'}</div>
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '14px 18px', borderRadius: 10 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Contributions</span>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2563EB', marginTop: 4 }}>{investorTxns.length} Transaction(s)</div>
          </div>
          {investor.status === 'EXITED' && (
            <div style={{ background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', padding: '14px 18px', borderRadius: 10 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-danger, #DC2626)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Exit Date</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-danger-text, #991B1B)', marginTop: 4 }}>{investor.exit_date || '—'}</div>
            </div>
          )}
        </div>
      </div>

      {/* Information Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginTop: 18 }}>
        
        {/* Contact & Address Card */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #F1F5F9', paddingBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone style={{ width: 15, height: 15 }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>Contact & Address</h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>Personal contact information</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#334155' }}>
              <Phone style={{ width: 14, height: 14, color: '#94A3B8', flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: '0.66rem', color: '#64748B', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Phone Number</span>
                <strong style={{ fontWeight: 600, color: '#0F172A' }}>{investor.phone || '—'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#334155' }}>
              <Mail style={{ width: 14, height: 14, color: '#94A3B8', flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: '0.66rem', color: '#64748B', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Email Address</span>
                <span style={{ color: '#0F172A', fontWeight: 500 }}>{investor.email || '—'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: '#334155' }}>
              <MapPin style={{ width: 14, height: 14, color: '#94A3B8', flexShrink: 0, marginTop: 3 }} />
              <div>
                <span style={{ fontSize: '0.66rem', color: '#64748B', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Registered Address</span>
                <span style={{ color: '#334155', lineHeight: 1.4 }}>
                  {[investor.address, investor.city, investor.state, investor.pincode].filter(Boolean).join(', ') || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nominee Details Card */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #F1F5F9', paddingBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck style={{ width: 15, height: 15 }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>Nominee Information</h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>Designated beneficiary details</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.8rem' }}>
            <div>
              <span style={{ fontSize: '0.66rem', color: '#64748B', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Nominee Name & Relationship</span>
              <strong style={{ fontWeight: 600, color: '#0F172A' }}>
                {investor.nominee_name || '—'} {investor.nominee_relation ? `(${investor.nominee_relation})` : ''}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.66rem', color: '#64748B', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Nominee Contact Number</span>
              <span style={{ color: '#0F172A', fontWeight: 500 }}>{investor.nominee_phone || '—'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Capital Transaction History & Contribution Ledger */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px', marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp style={{ width: 15, height: 15 }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>Capital Transaction History & Contribution Ledger</h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>Audit trail of initial capital contribution and top-up investments with automated double-entry vouchers</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onAddCapital(investor)}
            disabled={investor.status === 'EXITED'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 7, border: 'none',
              background: 'var(--brand-primary, #15803D)', color: '#FFFFFF', fontSize: '0.76rem',
              fontWeight: 700, cursor: investor.status === 'EXITED' ? 'not-allowed' : 'pointer'
            }}
          >
            <Plus style={{ width: 13, height: 13 }} />
            <span>Add Capital</span>
          </button>
        </div>

        <div className="fin-tablewrap" style={{ border: '1px solid #E2E8F0', borderRadius: 8 }}>
          <table className="fin-grid-table">
            <thead>
              <tr>
                <th style={{ width: 45, textAlign: 'center' }}>#</th>
                <th style={{ width: 95 }}>Date</th>
                <th style={{ width: 140 }}>Voucher No</th>
                <th>Particulars / Description</th>
                <th style={{ width: 85 }}>Mode</th>
                <th className="num" style={{ width: 130 }}>Amount Added (₹)</th>
                <th className="num" style={{ width: 130 }}>Balance After (₹)</th>
                <th style={{ width: 100 }}>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {investorTxns.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px 0', color: '#94A3B8' }}>
                    No capital transactions recorded yet.
                  </td>
                </tr>
              ) : (
                investorTxns.map((tx, idx) => (
                  <tr key={tx.id || idx}>
                    <td style={{ textAlign: 'center', color: '#64748B' }}>{idx + 1}</td>
                    <td style={{ fontSize: '0.78rem', color: '#334155' }}>{tx.date}</td>
                    <td className="code" style={{ color: 'var(--brand-primary, #15803D)', fontWeight: 600 }}>{tx.voucher_no}</td>
                    <td style={{ fontSize: '0.78rem', color: '#1E293B' }}>{tx.description}</td>
                    <td><span className="fin-badge fin-badge--neutral" style={{ fontSize: '0.66rem' }}>{tx.payment_mode}</span></td>
                    <td className="num" style={{ fontWeight: 700, color: 'var(--brand-primary, #15803D)' }}>+ ₹{fmt(tx.amount)}</td>
                    <td className="num" style={{ fontWeight: 700, color: '#0F172A' }}>₹{fmt(tx.running_balance)}</td>
                    <td style={{ fontSize: '0.74rem', color: '#64748B' }}>{tx.created_by || 'Admin'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Internal Notes Card */}
      {investor.notes && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px', marginTop: 16 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Internal Remarks & Portfolio Notes
          </span>
          <p style={{ fontSize: '0.82rem', color: '#334155', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: 8 }}>
            {investor.notes}
          </p>
        </div>
      )}

    </div>
  );
}

const INVESTOR_TABS = [
  { id: 'ACTIVE', labelKey: 'fin.status_active' },
  { id: 'EXITED', labelKey: 'status.EXITED' }
];

export default function InvestorCapitalView({
  investors = [],
  bankAccounts = [],
  branchesList = [],
  journalEntries = [],
  onCreateInvestor, onUpdateInvestor, onDeleteInvestor, onAddInvestorCapital
}) {
  const { t, tStatus } = useLanguage();
  const [screen, setScreen] = useState('DIRECTORY'); // 'DIRECTORY' | 'ADD_INVESTOR'
  const [editingInvestor, setEditingInvestor] = useState(null);
  const [addCapitalTarget, setAddCapitalTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewingInvestorId, setViewingInvestorId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState('ACTIVE');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const totalCapital = investors
    .filter(i => (i.status || 'ACTIVE') === 'ACTIVE')
    .reduce((acc, i) => acc + (Number(i.capital_amount) || 0), 0);

  const viewingInvestor = investors.find(i => i.id === viewingInvestorId) || null;

  if (screen === 'ADD_INVESTOR') {
    return (
      <AddInvestorScreen
        initialData={editingInvestor}
        bankAccounts={bankAccounts}
        branchesList={branchesList}
        onCancel={() => { setScreen(viewingInvestorId ? 'PROFILE' : 'DIRECTORY'); setEditingInvestor(null); }}
        onSubmit={async (form, id) => {
          await (id ? onUpdateInvestor(id, form) : onCreateInvestor(form));
          setScreen(viewingInvestorId ? 'PROFILE' : 'DIRECTORY');
          setEditingInvestor(null);
        }}
      />
    );
  }

  if (viewingInvestor) {
    return (
      <>
        <InvestorProfileView
          investor={viewingInvestor}
          bankAccounts={bankAccounts}
          branchesList={branchesList}
          journalEntries={journalEntries}
          onBack={() => setViewingInvestorId(null)}
          onEdit={() => { setEditingInvestor(viewingInvestor); setScreen('ADD_INVESTOR'); }}
          onAddCapital={(inv) => setAddCapitalTarget(inv)}
        />
        {addCapitalTarget && (
          <AddInvestorCapitalModal
            investor={addCapitalTarget}
            bankAccounts={bankAccounts}
            branchesList={branchesList}
            onClose={() => setAddCapitalTarget(null)}
            onSubmit={async (id, payload) => {
              if (onAddInvestorCapital) {
                await onAddInvestorCapital(id, payload);
              }
            }}
          />
        )}
      </>
    );
  }

  const byTab = investors.filter(i => (i.status || 'ACTIVE') === statusTab);
  const filteredInvestors = byTab.filter(i => {
    const q = searchQuery.toLowerCase().trim();
    return !q || (
      (i.name && i.name.toLowerCase().includes(q)) ||
      (i.investor_code && i.investor_code.toLowerCase().includes(q)) ||
      (i.phone && i.phone.includes(q))
    );
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
            <div className="fin-page-header__icon" style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)' }}>
              <Wallet style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('inv.title')}</h1>
              <p className="fin-page-header__subtitle">{t('inv.subtitle')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="fin-btn-primary" style={{ background: 'var(--brand-primary, #15803D)' }} onClick={() => { setEditingInvestor(null); setScreen('ADD_INVESTOR'); }}>
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
              <th>{t('inv.investor_id', 'Investor ID')}</th>
              <th>{t('col.investor')}</th>
              <th>{t('col.phone')}</th>
              <th>{t('col.email_address')}</th>
              <th>{t('form.city')}</th>
              <th className="num">{t('col.capital_balance')}</th>
              <th style={{ textAlign: 'right', minWidth: 190 }}>{t('col.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {pagedInvestors.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>{investors.length === 0 ? t('inv.no_investors') : t('fin.no_results_hint')}</td></tr>
            ) : pagedInvestors.map((inv, idx) => (
              <tr key={inv.id} onClick={() => setViewingInvestorId(inv.id)} style={{ cursor: 'pointer' }}>
                <td style={{ textAlign: 'center', color: '#64748B' }}>{startIndex + idx + 1}</td>
                <td className="code" style={{ color: 'var(--brand-primary, #15803D)', fontWeight: 600 }}>{inv.investor_code || `INV-${String(inv.id).padStart(4, '0')}`}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={inv.name} photo={inv.photo} size={30} />
                    <strong style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.82rem' }}>{inv.name}</strong>
                  </div>
                </td>
                <td>{inv.phone}</td>
                <td style={{ color: '#64748B', fontSize: '0.78rem' }}>{inv.email || '—'}</td>
                <td style={{ color: '#64748B', fontSize: '0.78rem' }}>{inv.city || '—'}</td>
                <td className="num" style={{ fontWeight: 600, color: 'var(--brand-primary, #15803D)' }}>₹{fmt(inv.capital_amount)}</td>
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

      {addCapitalTarget && (
        <AddInvestorCapitalModal
          investor={addCapitalTarget}
          bankAccounts={bankAccounts}
          branchesList={branchesList}
          onClose={() => setAddCapitalTarget(null)}
          onSubmit={async (id, payload) => {
            if (onAddInvestorCapital) {
              await onAddInvestorCapital(id, payload);
            }
          }}
        />
      )}

      {deleteTarget && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card">
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: 'var(--color-danger-light, #FEF2F2)', borderColor: 'var(--color-danger-border, #FECACA)', color: 'var(--color-danger, #DC2626)' }}>
                  <Trash2 style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>{t('inv.delete_investor_title')}</h3>
                  <p>{t('inv.delete_investor_subtitle')}</p>
                </div>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="close-btn" type="button" disabled={deleteLoading}><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="saas-modal-body">
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>{t('inv.delete_investor_confirm')} <strong>{deleteTarget.name}</strong>?</p>
              {deleteError && <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{deleteError}</span></div>}
            </div>
            <div className="saas-modal-footer">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleteLoading} className="btn-cancel">{t('btn.cancel')}</button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={async () => {
                  if (deleteLoading) return;
                  setDeleteLoading(true);
                  setDeleteError('');
                  try {
                    await onDeleteInvestor(deleteTarget.id);
                    setDeleteTarget(null);
                  } catch (err) {
                    setDeleteError(err?.response?.data?.message || t('inv.delete_investor_error'));
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
                className="btn-submit"
                style={{ background: deleteLoading ? '#94A3B8' : 'var(--color-danger, #DC2626)', boxShadow: deleteLoading ? 'none' : '0 2px 6px rgba(var(--color-danger-rgb), 0.3)', cursor: deleteLoading ? 'not-allowed' : 'pointer' }}
              >
                {deleteLoading ? '...' : t('inv.delete_investor_title')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

