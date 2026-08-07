import React, { useState } from 'react';
import { Percent, Plus, Trash2, Pencil, X, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

const inputStyle = { width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 500 };
const labelStyle = { fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 };

function useRepaymentMethods() {
  const { t } = useLanguage();
  return [
    { value: 'EMI', label: t('scheme.modal.method_emi') },
    { value: 'INTEREST_ONLY', label: t('scheme.modal.method_interest_only') }
  ];
}

function useInterestCalcStrategies() {
  const { t } = useLanguage();
  return [
    { value: 'CONSTANT_FLAT', label: t('scheme.modal.calc_constant_flat') },
    { value: 'FLEXIBLE_REDUCING', label: t('scheme.modal.calc_flexible_reducing') }
  ];
}

function useInterestBasisOptions() {
  const { t } = useLanguage();
  return [
    { value: 'DAILY', label: t('scheme.modal.basis_daily') },
    { value: 'WEEKLY', label: t('scheme.modal.basis_weekly') },
    { value: 'MONTHLY', label: t('scheme.modal.basis_monthly') },
    { value: 'ANNUAL', label: t('scheme.modal.basis_annual') }
  ];
}

function useRepaymentFrequencies() {
  const { t } = useLanguage();
  return [
    { value: 'DAILY', label: t('scheme.modal.freq_daily') },
    { value: 'WEEKLY', label: t('scheme.modal.freq_weekly') },
    { value: 'MONTHLY', label: t('scheme.modal.freq_monthly') }
  ];
}

const EMPTY_FORM = {
  name: '',
  unit_base: 100,
  rate_per_unit: '',
  repayment_method: 'EMI',
  interest_calculation: 'CONSTANT_FLAT',
  interest_basis: 'MONTHLY',
  repayment_frequency: 'DAILY',
  min_amount: '',
  max_amount: '',
  min_tenure_months: '',
  max_tenure_months: '',
  is_active: true
};

function SchemeModal({ isOpen, initialData, schemes, onClose, onSubmit }) {
  const { t } = useLanguage();
  const REPAYMENT_METHODS = useRepaymentMethods();
  const INTEREST_CALCULATION_STRATEGIES = useInterestCalcStrategies();
  const INTEREST_BASIS_OPTIONS = useInterestBasisOptions();
  const REPAYMENT_FREQUENCIES = useRepaymentFrequencies();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          name: initialData.name,
          unit_base: initialData.unit_base || 100,
          rate_per_unit: initialData.rate_per_unit,
          repayment_method: initialData.repayment_method || (initialData.repayment_mode === 'INTEREST_ONLY' ? 'INTEREST_ONLY' : 'EMI'),
          interest_calculation: initialData.interest_calculation || (initialData.repayment_mode === 'FLEXIBLE' ? 'FLEXIBLE_REDUCING' : 'CONSTANT_FLAT'),
          interest_basis: initialData.interest_basis || 'MONTHLY',
          repayment_frequency: initialData.repayment_frequency || 'DAILY',
          min_amount: initialData.min_amount ?? '',
          max_amount: initialData.max_amount ?? '',
          min_tenure_months: initialData.min_tenure_months ?? '',
          max_tenure_months: initialData.max_tenure_months ?? '',
          is_active: initialData.is_active !== false
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.rate_per_unit) return;

    const isDuplicateName = schemes.some(s =>
      s.id !== initialData?.id && s.name.trim().toLowerCase() === form.name.trim().toLowerCase()
    );
    if (isDuplicateName) {
      setError(t('scheme.modal.duplicate_name_error'));
      return;
    }

    if (form.min_amount && form.max_amount && Number(form.min_amount) > Number(form.max_amount)) {
      setError(t('scheme.modal.min_max_amount_error'));
      return;
    }
    if (form.min_tenure_months && form.max_tenure_months && Number(form.min_tenure_months) > Number(form.max_tenure_months)) {
      setError(t('scheme.modal.min_max_tenure_error'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSubmit({
        ...form,
        unit_base: Number(form.unit_base),
        rate_per_unit: parseFloat(form.rate_per_unit),
        repayment_mode: form.repayment_method, // Backwards compatibility field
        min_amount: form.min_amount ? Number(form.min_amount) : null,
        max_amount: form.max_amount ? Number(form.max_amount) : null,
        min_tenure_months: form.min_tenure_months ? Number(form.min_tenure_months) : null,
        max_tenure_months: form.max_tenure_months ? Number(form.max_tenure_months) : null
      }, initialData?.id);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || t('scheme.modal.save_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card saas-modal-card--lg" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}>
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: '#F8FAFC', color: '#0F172A', border: '1px solid #E2E8F0' }}>
              <Percent style={{ width: 16, height: 16 }} />
            </div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 500, fontSize: '0.98rem', color: '#0F172A' }}>{initialData ? t('scheme.modal.edit_title') : t('scheme.add')}</h3>
              <p style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 400 }}>{t('scheme.modal.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
          {error && <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{error}</span></div>}

          <div>
            <label style={labelStyle}>{t('scheme.modal.name_label')}</label>
            <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Constant EMI Scheme (Flat Rate)" style={inputStyle} />
          </div>

          {/* Repayment Method & Interest Calculation Architecture */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('scheme.modal.repayment_method')}</label>
              <select value={form.repayment_method} onChange={e => setForm({ ...form, repayment_method: e.target.value })} style={inputStyle}>
                {REPAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('scheme.modal.interest_calculation')}</label>
              <select value={form.interest_calculation} onChange={e => setForm({ ...form, interest_calculation: e.target.value })} style={inputStyle}>
                {INTEREST_CALCULATION_STRATEGIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('scheme.modal.interest_rate')}</label>
              <input type="number" step="0.01" required value={form.rate_per_unit} onChange={e => setForm({ ...form, rate_per_unit: e.target.value })} placeholder="2.0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('scheme.modal.interest_basis')}</label>
              <select value={form.interest_basis} onChange={e => setForm({ ...form, interest_basis: e.target.value })} style={inputStyle}>
                {INTEREST_BASIS_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('scheme.modal.collection_frequency')}</label>
              <select value={form.repayment_frequency} onChange={e => setForm({ ...form, repayment_frequency: e.target.value })} style={inputStyle}>
                {REPAYMENT_FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          {(form.repayment_mode === 'OTHERS' || form.repayment_frequency === 'OTHERS') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {form.repayment_mode === 'OTHERS' ? (
                <div>
                  <label style={labelStyle}>{t('scheme.modal.specify_repayment_mode')}</label>
                  <input type="text" required value={form.repayment_mode_other} onChange={e => setForm({ ...form, repayment_mode_other: e.target.value })} placeholder="e.g. Balloon Payment" style={inputStyle} />
                </div>
              ) : <div />}
              {form.repayment_frequency === 'OTHERS' ? (
                <div>
                  <label style={labelStyle}>{t('scheme.modal.specify_collection_freq')}</label>
                  <input type="text" required value={form.repayment_frequency_other} onChange={e => setForm({ ...form, repayment_frequency_other: e.target.value })} placeholder="e.g. Fortnightly" style={inputStyle} />
                </div>
              ) : <div />}
            </div>
          )}

          <div>
            <label style={labelStyle}>{t('scheme.modal.loan_amount_range')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input type="number" min="0" value={form.min_amount} onChange={e => setForm({ ...form, min_amount: e.target.value })} placeholder={t('scheme.modal.min_amount')} style={inputStyle} />
              <input type="number" min="0" value={form.max_amount} onChange={e => setForm({ ...form, max_amount: e.target.value })} placeholder={t('scheme.modal.max_amount')} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t('scheme.modal.tenure_range_months')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input type="number" min="1" value={form.min_tenure_months} onChange={e => setForm({ ...form, min_tenure_months: e.target.value })} placeholder={t('scheme.modal.min_months')} style={inputStyle} />
              <input type="number" min="1" value={form.max_tenure_months} onChange={e => setForm({ ...form, max_tenure_months: e.target.value })} placeholder={t('scheme.modal.max_months')} style={inputStyle} />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#334155', fontWeight: 400 }}>
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
            {t('form.active')}
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>{t('btn.cancel')}</button>
            <button type="submit" disabled={loading} style={{ background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
              {loading ? t('form.saving') : (initialData ? t('form.save_changes') : t('scheme.add'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoanSchemeMasterView({ schemes = [], onCreateScheme, onUpdateScheme, onDeleteScheme }) {
  const { t, tStatus } = useLanguage();
  const REPAYMENT_METHODS = useRepaymentMethods();
  const INTEREST_CALCULATION_STRATEGIES = useInterestCalcStrategies();
  const REPAYMENT_FREQUENCIES = useRepaymentFrequencies();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const repaymentLabel = (scheme) => {
    const mode = scheme.repayment_method || scheme.repayment_mode;
    return REPAYMENT_METHODS.find(m => m.value === mode)?.label || mode || 'EMI';
  };
  const calcLabel = (scheme) => {
    const calc = scheme.interest_calculation || (scheme.repayment_mode === 'FLEXIBLE' ? 'FLEXIBLE_REDUCING' : 'CONSTANT_FLAT');
    return INTEREST_CALCULATION_STRATEGIES.find(c => c.value === calc)?.label.split(' (')[0] || calc;
  };
  const frequencyLabel = (scheme) => {
    return REPAYMENT_FREQUENCIES.find(f => f.value === scheme.repayment_frequency)?.label || scheme.repayment_frequency || t('scheme.modal.freq_daily');
  };
  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}>
      <div className="active-loans-header">
        <div className="header-left">
          <div className="header-text">
            <h1 style={{ fontWeight: 500, fontSize: '1.25rem', color: '#0F172A', margin: 0 }}>{t('scheme.title')}</h1>
            <p style={{ fontWeight: 400, fontSize: '0.78rem', color: '#64748B', margin: '2px 0 0 0' }}>{t('scheme.subtitle')}</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-disburse" onClick={() => { setEditing(null); setModalOpen(true); }} style={{ background: '#0F172A', fontWeight: 500, borderRadius: 8, padding: '8px 16px' }}>
            <Plus style={{ width: 15, height: 15 }} />
            <span>{t('scheme.add')}</span>
          </button>
        </div>
      </div>

      <div className="loans-table-card">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: 50, textAlign: 'center', fontWeight: 500 }}>{t('col.sno')}</th>
                <th style={{ fontWeight: 500 }}>{t('col.scheme_name')}</th>
                <th style={{ textAlign: 'right', fontWeight: 500 }}>{t('col.rate_per_month')}</th>
                <th style={{ fontWeight: 500 }}>{t('col.repayment_mode')}</th>
                <th style={{ fontWeight: 500 }}>Interest Calculation</th>
                <th style={{ fontWeight: 500 }}>{t('col.frequency')}</th>
                <th style={{ fontWeight: 500 }}>{t('col.amount_range_rs')}</th>
                <th style={{ fontWeight: 500 }}>{t('col.tenure_range')}</th>
                <th style={{ textAlign: 'center', fontWeight: 500 }}>{t('col.status')}</th>
                <th style={{ textAlign: 'right', fontWeight: 500 }}>{t('col.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {schemes.length === 0 ? (
                <tr><td colSpan="10" style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>No loan schemes configured yet.</td></tr>
              ) : schemes.map((s, idx) => (
                <tr key={s.id}>
                  <td style={{ textAlign: 'center', color: '#64748B' }}>{idx + 1}</td>
                  <td><span style={{ fontWeight: 500, color: '#0F172A' }}>{s.name}</span></td>
                  <td style={{ textAlign: 'right', color: '#2563EB', fontWeight: 500, fontFamily: 'SF Mono, Consolas, monospace' }}>{s.rate_per_unit}%</td>
                  <td><span style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 400 }}>{repaymentLabel(s)}</span></td>
                  <td><span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 500 }}>{calcLabel(s)}</span></td>
                  <td><span style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 400 }}>{frequencyLabel(s)}</span></td>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 400, fontFamily: 'SF Mono, Consolas, monospace' }}>
                      {s.min_amount || s.max_amount ? `₹${fmt(s.min_amount || 0)} – ₹${fmt(s.max_amount || 0)}` : '—'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 400 }}>
                      {s.min_tenure_months || s.max_tenure_months ? `${s.min_tenure_months || 0} – ${s.max_tenure_months || 0} mo` : '—'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 500, background: s.is_active ? '#ECFDF5' : '#F1F5F9', color: s.is_active ? '#059669' : '#94A3B8' }}>
                      {s.is_active ? tStatus('ACTIVE') : tStatus('INACTIVE')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button onClick={() => { setEditing(s); setModalOpen(true); }} style={{ border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                        <Pencil style={{ width: 12, height: 12 }} />
                      </button>
                      <button onClick={() => { setDeleteTarget(s); setDeleteError(''); }} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                        <Trash2 style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SchemeModal
        isOpen={modalOpen}
        initialData={editing}
        schemes={schemes}
        onClose={() => setModalOpen(false)}
        onSubmit={(form, id) => id ? onUpdateScheme(id, form) : onCreateScheme(form)}
      />

      {deleteTarget && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card">
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' }}>
                  <Trash2 style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>Delete Loan Scheme</h3>
                  <p>This action cannot be undone</p>
                </div>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="saas-modal-body">
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong>?</p>
              {deleteError && <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{deleteError}</span></div>}
            </div>
            <div className="saas-modal-footer">
              <button type="button" onClick={() => setDeleteTarget(null)} className="btn-cancel">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await onDeleteScheme(deleteTarget.id);
                    setDeleteTarget(null);
                  } catch (err) {
                    setDeleteError(err?.response?.data?.message || 'Unable to delete this scheme.');
                  }
                }}
                className="btn-submit"
                style={{ background: '#DC2626', boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)' }}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
