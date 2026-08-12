import React, { useState } from 'react';
import { Percent, Plus, Trash2, Pencil, X, AlertTriangle, Calculator, Sigma, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { theme } from '../styles/theme.js';
import { generateEmiSchedule, calculatePaymentAllocation, resolveSchemeRepaymentMethod, resolveSchemeInterestCalculation } from '../utils/loanCalculations';
import FormulaDurationPreview from '../components/FormulaDurationPreview';
import CustomFormulaModal from '../components/CustomFormulaModal';

const inputStyle = { width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 500 };
const labelStyle = { fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 };

function useRepaymentMethods() {
  const { t } = useLanguage();
  return [
    { value: 'EMI', label: 'Fixed EMI' },
    { value: 'INTEREST_ONLY', label: 'Interest Only' }
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
  formula_type: 'STANDARD',            // 'STANDARD' | 'CUSTOM'
  repayment_method: 'EMI',
  interest_calculation: 'CONSTANT_FLAT',
  accrual_mode: 'LIVE',                // custom-only: 'LIVE' | 'SCHEDULED'
  interest_formula: [],                // custom-only: token array built via FormulaBuilder
  installment_formula: [],             // custom-only, SCHEDULED accrual only
  interest_basis: 'MONTHLY',
  repayment_frequency: 'DAILY',
  min_amount: '',
  max_amount: '',
  min_tenure_months: '',
  max_tenure_months: '',
  is_active: true
};

// Estimates real numbers for a sample loan against the scheme being configured, using
// the exact same engine (generateEmiSchedule / calculatePaymentAllocation) that
// App.jsx's handleQuickAction/handleDisburseLoan use for real loans — never a separate
// simplified formula — so what staff see here is what a real customer would actually
// be charged.
function SchemeEstimatePreview({ form }) {
  const [sampleAmount, setSampleAmount] = useState(100000);
  const rate = Number(form.rate_per_unit);
  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  if (form.formula_type === 'CUSTOM') {
    return (
      <FormulaDurationPreview
        accrualMode={form.accrual_mode}
        interestFormulaTokens={form.interest_formula}
        installmentFormulaTokens={form.installment_formula}
        rate={form.rate_per_unit}
        repaymentFrequency={form.repayment_frequency}
        tenureMonths={Number(form.min_tenure_months || form.max_tenure_months) || 6}
      />
    );
  }

  let content = null;
  if (!rate || rate <= 0) {
    content = (
      <p style={{ margin: 0, fontSize: '0.78rem', color: '#94A3B8' }}>
        Enter an interest rate to see an estimate for a sample loan.
      </p>
    );
  } else if (form.repayment_method === 'EMI') {
    const tenureMonths = Number(form.min_tenure_months || form.max_tenure_months) || 6;
    const schedule = generateEmiSchedule({
      principal: sampleAmount,
      monthlyInterestRate: rate,
      tenureMonths,
      repaymentFrequency: form.repayment_frequency,
      interestCalculation: form.interest_calculation,
      startDate: todayStr
    }).slice(0, 3);

    content = (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: '0.74rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: '#64748B' }}>
              <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500 }}>Period</th>
              <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500 }}>Due Date</th>
              <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 500 }}>Principal</th>
              <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 500 }}>Interest</th>
              <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 500 }}>EMI</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map(row => (
              <tr key={row.period} style={{ borderTop: '1px solid #E2E8F0' }}>
                <td style={{ padding: '4px 6px', color: '#334155' }}>{row.period}</td>
                <td style={{ padding: '4px 6px', color: '#334155' }}>{row.due_date}</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', color: '#334155' }}>₹{fmt(row.principal)}</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', color: '#334155' }}>₹{fmt(row.interest)}</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', color: '#0F172A', fontWeight: 500 }}>₹{fmt(row.emi)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    const paymentDate = new Date(today);
    paymentDate.setDate(paymentDate.getDate() + 30);
    const result = calculatePaymentAllocation({
      loan: {
        principal_amount: sampleAmount,
        pending_amount: sampleAmount,
        monthly_interest_rate: rate,
        repayment_method: 'INTEREST_ONLY',
        interest_calculation: form.interest_calculation,
        loan_date: todayStr,
        last_payment_date: null
      },
      paymentAmount: 0,
      paymentDate: paymentDate.toISOString().slice(0, 10)
    });

    content = (
      <p style={{ margin: 0, fontSize: '0.8rem', color: '#334155' }}>
        Interest for 30 days on ₹{fmt(sampleAmount)}: <strong style={{ color: '#0F172A' }}>₹{fmt(result.interestDue)}</strong>
        {' '}(≈ ₹{fmt(Math.round(result.interestDue / 30))}/day)
      </p>
    );
  }

  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calculator style={{ width: 14, height: 14, color: '#475569' }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 500, color: '#334155' }}>Estimate Preview</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Sample amount</span>
          <input
            type="number"
            min="0"
            value={sampleAmount}
            onChange={e => setSampleAmount(Number(e.target.value) || 0)}
            style={{ width: 110, height: 30, padding: '0 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.78rem', color: '#0F172A' }}
          />
        </div>
      </div>
      {content}
    </div>
  );
}

function SchemeModal({ isOpen, initialData, schemes, customFormulas, onCreateCustomFormula, onClose, onSubmit }) {
  const { t } = useLanguage();
  const REPAYMENT_METHODS = useRepaymentMethods();
  const INTEREST_CALCULATION_STRATEGIES = useInterestCalcStrategies();
  const INTEREST_BASIS_OPTIONS = useInterestBasisOptions();
  const REPAYMENT_FREQUENCIES = useRepaymentFrequencies();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formulaModalOpen, setFormulaModalOpen] = useState(false);
  // `loading` state only disables the button after React re-renders — a fast double
  // click/Enter can fire handleSubmit twice before that paint happens. This ref is
  // set synchronously on the very first call, so the second call bails out
  // immediately regardless of render timing.
  const submittingRef = React.useRef(false);

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          name: initialData.name,
          unit_base: initialData.unit_base || 100,
          rate_per_unit: initialData.rate_per_unit != null ? Number(initialData.rate_per_unit) : '',
          formula_type: initialData.formula_type || 'STANDARD',
          repayment_method: resolveSchemeRepaymentMethod(initialData),
          interest_calculation: resolveSchemeInterestCalculation(initialData),
          accrual_mode: initialData.accrual_mode || 'LIVE',
          interest_formula: initialData.interest_formula || [],
          installment_formula: initialData.installment_formula || [],
          custom_formula_name: initialData.custom_formula_name || '',
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
    if (submittingRef.current) return;
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

    if (form.formula_type === 'CUSTOM' && !form.interest_formula?.length) {
      setError('Pick a saved formula, or create a new one, before saving this scheme.');
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setError('');
    try {
      await onSubmit({
        ...form,
        unit_base: Number(form.unit_base),
        rate_per_unit: parseFloat(form.rate_per_unit),
        repayment_mode: form.repayment_method, // Backwards compatibility field
        installment_formula: form.accrual_mode === 'SCHEDULED' ? form.installment_formula : [],
        min_amount: form.min_amount ? Number(form.min_amount) : null,
        max_amount: form.max_amount ? Number(form.max_amount) : null,
        min_tenure_months: form.min_tenure_months ? Number(form.min_tenure_months) : null,
        max_tenure_months: form.max_tenure_months ? Number(form.max_tenure_months) : null
      }, initialData?.id);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || t('scheme.modal.save_error'));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card" style={{ maxWidth: 540, width: '100%', fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}>
        <div className="saas-modal-header" style={{ borderBottom: '1px solid #E2E8F0', padding: '16px 20px' }}>
          <div className="head-left" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="head-icon-badge" style={{ background: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary, #15803D)', border: '1px solid var(--brand-primary-border, #A3F5C1)', width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Percent style={{ width: 16, height: 16 }} />
            </div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600, fontSize: '0.98rem', color: '#0F172A', margin: 0 }}>{initialData ? t('scheme.modal.edit_title') : t('scheme.add')}</h3>
              <p style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 400, margin: 0 }}>{t('scheme.modal.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button" style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: 4 }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {error && <div className="form-alert form-alert--error" style={{ marginBottom: 16, background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', color: 'var(--color-danger-text, #991B1B)', padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle style={{ width: 14, height: 14 }} /><span>{error}</span></div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '68vh', overflowY: 'auto', paddingRight: 4 }}>
            <div>
              <label style={{ ...labelStyle, marginBottom: 6 }}>{t('scheme.modal.name_label')}</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Naal Vaddi, or your own scheme name" style={inputStyle} />
            </div>

            {/* Formula Engine Selection — Compact Inline Toggle */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calculator style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} />
                <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#334155' }}>Calculation Engine</span>
              </div>
              <div style={{ display: 'inline-flex', background: '#E2E8F0', padding: 2, borderRadius: 6 }}>
                {[{ v: 'STANDARD', l: 'Standard Engine' }, { v: 'CUSTOM', l: 'Custom Formula' }].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setForm({ ...form, formula_type: opt.v })}
                    style={{
                      border: 'none', padding: '5px 12px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', borderRadius: 5,
                      background: form.formula_type === opt.v ? 'var(--brand-primary, #15803D)' : 'transparent',
                      color: form.formula_type === opt.v ? '#FFFFFF' : '#475569',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Formula engine details */}
            {form.formula_type === 'STANDARD' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 6 }}>{t('scheme.modal.repayment_method')}</label>
                  <select value={form.repayment_method} onChange={e => setForm({ ...form, repayment_method: e.target.value })} style={inputStyle}>
                    {REPAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 6 }}>{t('scheme.modal.interest_calculation')}</label>
                  <select value={form.interest_calculation} onChange={e => setForm({ ...form, interest_calculation: e.target.value })} style={inputStyle}>
                    {INTEREST_CALCULATION_STRATEGIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', borderRadius: 8, padding: 12 }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--brand-primary-text, #075F27)' }}>Select Formula</span>
                {(customFormulas || []).length === 0 && (
                  <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--brand-primary-hover, #0E5327)' }}>No saved formulas yet — create your first one below.</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(customFormulas || []).map(f => {
                    const selected = form.custom_formula_name === f.name;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setForm({
                          ...form,
                          accrual_mode: f.accrual_mode,
                          interest_formula: f.interest_formula,
                          installment_formula: f.installment_formula || [],
                          custom_formula_name: f.name
                        })}
                        style={{
                          textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          borderRadius: 6, padding: '8px 12px', cursor: 'pointer',
                          border: selected ? '2px solid var(--brand-primary, #15803D)' : '1px solid #CBD5E1',
                          background: selected ? '#FFFFFF' : '#FAFAFA'
                        }}
                      >
                        <span>
                          <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#0F172A' }}>{f.name}</span>
                          <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748B' }}>
                            {f.accrual_mode === 'SCHEDULED' ? 'Fixed Schedule' : 'Pay Anytime'}
                          </span>
                        </span>
                        {selected && <Check style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)', flexShrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setFormulaModalOpen(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    border: '1px dashed var(--brand-primary, #15803D)', borderRadius: 6, padding: '8px 12px', fontSize: '0.75rem',
                    fontWeight: 600, color: 'var(--brand-primary, #15803D)', background: '#FFFFFF', cursor: 'pointer', marginTop: 2
                  }}
                >
                  <Sigma style={{ width: 13, height: 13 }} /> Create New Formula
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ ...labelStyle, marginBottom: 6 }}>{t('scheme.modal.interest_rate')}</label>
                <input type="number" step="0.01" required value={form.rate_per_unit} onChange={e => setForm({ ...form, rate_per_unit: e.target.value })} placeholder="2.0" style={inputStyle} />
              </div>
              <div>
                <label style={{ ...labelStyle, marginBottom: 6 }}>{t('scheme.modal.interest_basis')}</label>
                <select value={form.interest_basis} onChange={e => setForm({ ...form, interest_basis: e.target.value })} style={inputStyle}>
                  {INTEREST_BASIS_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...labelStyle, marginBottom: 6 }}>{t('scheme.modal.collection_frequency')}</label>
                <select value={form.repayment_frequency} onChange={e => setForm({ ...form, repayment_frequency: e.target.value })} style={inputStyle}>
                  {REPAYMENT_FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>

            {(form.repayment_mode === 'OTHERS' || form.repayment_frequency === 'OTHERS') && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {form.repayment_mode === 'OTHERS' ? (
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 6 }}>{t('scheme.modal.specify_repayment_mode')}</label>
                    <input type="text" required value={form.repayment_mode_other} onChange={e => setForm({ ...form, repayment_mode_other: e.target.value })} placeholder="e.g. Balloon Payment" style={inputStyle} />
                  </div>
                ) : <div />}
                {form.repayment_frequency === 'OTHERS' ? (
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 6 }}>{t('scheme.modal.specify_collection_freq')}</label>
                    <input type="text" required value={form.repayment_frequency_other} onChange={e => setForm({ ...form, repayment_frequency_other: e.target.value })} placeholder="e.g. Fortnightly" style={inputStyle} />
                  </div>
                ) : <div />}
              </div>
            )}

            <div>
              <label style={{ ...labelStyle, marginBottom: 6 }}>{t('scheme.modal.loan_amount_range')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <input type="number" min="0" value={form.min_amount} onChange={e => setForm({ ...form, min_amount: e.target.value })} placeholder={t('scheme.modal.min_amount')} style={inputStyle} />
                <input type="number" min="0" value={form.max_amount} onChange={e => setForm({ ...form, max_amount: e.target.value })} placeholder={t('scheme.modal.max_amount')} style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={{ ...labelStyle, marginBottom: 6 }}>{t('scheme.modal.tenure_range_months')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <input type="number" min="1" value={form.min_tenure_months} onChange={e => setForm({ ...form, min_tenure_months: e.target.value })} placeholder={t('scheme.modal.min_months')} style={inputStyle} />
                <input type="number" min="1" value={form.max_tenure_months} onChange={e => setForm({ ...form, max_tenure_months: e.target.value })} placeholder={t('scheme.modal.max_months')} style={inputStyle} />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#334155', fontWeight: 500, marginTop: 2 }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} style={{ accentColor: 'var(--brand-primary, #15803D)' }} />
              {t('form.active')}
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>{t('btn.cancel')}</button>
            <button type="submit" disabled={loading} style={{ background: 'var(--brand-primary, #15803D)', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb), 0.25)' }}>
              {loading ? t('form.saving') : (initialData ? t('form.save_changes') : t('scheme.add'))}
            </button>
          </div>
        </form>
      </div>

      <CustomFormulaModal
        isOpen={formulaModalOpen}
        onClose={() => setFormulaModalOpen(false)}
        onSave={async (payload) => {
          const created = await onCreateCustomFormula(payload);
          setForm(f => ({
            ...f,
            accrual_mode: payload.accrual_mode,
            interest_formula: payload.interest_formula,
            installment_formula: payload.installment_formula || [],
            custom_formula_name: payload.name
          }));
          setFormulaModalOpen(false);
          return created;
        }}
      />
    </div>
  );
}

export default function LoanSchemeMasterView({ schemes = [], onCreateScheme, onUpdateScheme, onDeleteScheme, customFormulas = [], onCreateCustomFormula }) {
  const { t, tStatus } = useLanguage();
  const REPAYMENT_METHODS = useRepaymentMethods();
  const INTEREST_CALCULATION_STRATEGIES = useInterestCalcStrategies();
  const REPAYMENT_FREQUENCIES = useRepaymentFrequencies();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const deletingRef = React.useRef(false);

  const repaymentLabel = (scheme) => {
    const mode = resolveSchemeRepaymentMethod(scheme);
    return REPAYMENT_METHODS.find(m => m.value === mode)?.label || mode;
  };
  const calcLabel = (scheme) => {
    const calc = resolveSchemeInterestCalculation(scheme);
    return INTEREST_CALCULATION_STRATEGIES.find(c => c.value === calc)?.label.split(' (')[0] || calc;
  };
  const frequencyLabel = (scheme) => {
    return REPAYMENT_FREQUENCIES.find(f => f.value === scheme.repayment_frequency)?.label || scheme.repayment_frequency || t('scheme.modal.freq_daily');
  };
  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}>
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
                  <td style={{ textAlign: 'right', color: 'var(--color-info, #2563EB)', fontWeight: 500, fontFamily: 'SF Mono, Consolas, monospace' }}>{Number(s.rate_per_unit || 0)}%</td>
                  <td><span style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 400 }}>{s.formula_type === 'CUSTOM' ? (s.accrual_mode === 'SCHEDULED' ? 'Fixed Installments' : 'Pay Anytime') : repaymentLabel(s)}</span></td>
                  <td><span style={{ fontSize: '0.75rem', color: s.formula_type === 'CUSTOM' ? '#7C3AED' : 'var(--brand-primary, #15803D)', fontWeight: 500 }}>{s.formula_type === 'CUSTOM' ? 'Custom Formula' : calcLabel(s)}</span></td>
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
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 500, background: s.is_active ? theme.primaryLight : '#F1F5F9', color: s.is_active ? theme.primary : '#94A3B8' }}>
                      {s.is_active ? tStatus('ACTIVE') : tStatus('INACTIVE')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <button
                        onClick={() => { setEditing(s); setModalOpen(true); }}
                        title={t('btn.edit')}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s ease' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#94A3B8'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                      >
                        <Pencil style={{ width: 16, height: 16 }} />
                      </button>
                      <button
                        onClick={() => { setDeleteTarget(s); setDeleteError(''); }}
                        title={t('btn.delete')}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: '1px solid transparent', background: 'var(--color-danger-light, #FEE2E2)', color: 'var(--color-danger, #DC2626)', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s ease' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-danger-border, #FECACA)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-danger-light, #FEE2E2)'; }}
                      >
                        <Trash2 style={{ width: 16, height: 16 }} />
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
        customFormulas={customFormulas}
        onCreateCustomFormula={onCreateCustomFormula}
        onClose={() => setModalOpen(false)}
        onSubmit={(form, id) => id ? onUpdateScheme(id, form) : onCreateScheme(form)}
      />

      {deleteTarget && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card">
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: 'var(--color-danger-light, #FEF2F2)', borderColor: 'var(--color-danger-border, #FECACA)', color: 'var(--color-danger, #DC2626)' }}>
                  <Trash2 style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>Delete Loan Scheme</h3>
                  <p>This action cannot be undone</p>
                </div>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="close-btn" type="button" disabled={deleting}><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="saas-modal-body">
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong>?</p>
              {deleteError && <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{deleteError}</span></div>}
            </div>
            <div className="saas-modal-footer">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="btn-cancel">Cancel</button>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  if (deletingRef.current) return;
                  deletingRef.current = true;
                  setDeleting(true);
                  try {
                    await onDeleteScheme(deleteTarget.id);
                    setDeleteTarget(null);
                  } catch (err) {
                    setDeleteError(err?.response?.data?.message || 'Unable to delete this scheme.');
                  } finally {
                    deletingRef.current = false;
                    setDeleting(false);
                  }
                }}
                className="btn-submit"
                style={{ background: 'var(--color-danger, #DC2626)', boxShadow: '0 2px 6px rgba(var(--color-danger-rgb), 0.3)', opacity: deleting ? 0.7 : 1, cursor: deleting ? 'not-allowed' : 'pointer' }}
              >
                {deleting ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
