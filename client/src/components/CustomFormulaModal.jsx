import React, { useState, useEffect } from 'react';
import { X, Sigma, AlertTriangle } from 'lucide-react';
import FormulaBuilder from './FormulaBuilder';
import FormulaDurationPreview from './FormulaDurationPreview';
import { isFormulaComplete, evaluateFormula } from '../utils/formulaEngine';

const inputStyle = { width: '100%', height: 42, padding: '0 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.9rem', color: '#0F172A', fontWeight: 500 };
const labelStyle = { fontSize: '0.8rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 8 };

const SAMPLE_VARS = { principal: 100000, outstanding: 100000, rate: 0.02, days: 30, tenure_days: 120, period: 1, periods: 12 };

const ACCRUAL_OPTIONS = [
  { value: 'LIVE', label: 'Pay Anytime', example: 'Any amount, any day. Interest builds up daily until paid.' },
  { value: 'SCHEDULED', label: 'Fixed Schedule', example: 'Same amount due each period — like a bank EMI.' }
];

const EMPTY = { name: '', accrual_mode: 'LIVE', interest_formula: [], installment_formula: [] };

// A dedicated modal for building and saving ONE named, reusable formula — kept
// separate from the Scheme modal so authoring a formula isn't tangled up with
// configuring a specific scheme's amount/tenure limits. Once saved here, the formula
// shows up as a pickable card back in the Scheme modal. Single scrolling view, laid
// out top-to-bottom in the order someone would naturally fill it in.
export default function CustomFormulaModal({ isOpen, initialData, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm(initialData ? {
        name: initialData.name,
        accrual_mode: initialData.accrual_mode || 'LIVE',
        interest_formula: initialData.interest_formula || [],
        installment_formula: initialData.installment_formula || []
      } : EMPTY);
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const interestValid = isFormulaComplete(form.interest_formula) && !evaluateFormula(form.interest_formula, SAMPLE_VARS).error;
  const installmentValid = form.accrual_mode !== 'SCHEDULED'
    || (isFormulaComplete(form.installment_formula) && !evaluateFormula(form.installment_formula, SAMPLE_VARS).error);
  const canSave = form.name.trim() && interestValid && installmentValid;

  const handleSave = () => {
    if (!form.name.trim()) { setError('Give this formula a name.'); return; }
    if (!interestValid) { setError('Finish the interest formula so it produces a valid result.'); return; }
    if (!installmentValid) { setError('Finish the installment formula so it produces a valid result.'); return; }
    onSave({
      name: form.name.trim(),
      accrual_mode: form.accrual_mode,
      interest_formula: form.interest_formula,
      installment_formula: form.accrual_mode === 'SCHEDULED' ? form.installment_formula : []
    });
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card saas-modal-card--lg" style={{ maxWidth: 620, fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}>
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' }}>
              <Sigma style={{ width: 16, height: 16 }} />
            </div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 500, fontSize: '0.98rem', color: '#0F172A' }}>{initialData ? 'Edit Formula' : 'Create a Custom Formula'}</h3>
              <p style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 400 }}>Build it once, save it with a name, and reuse it on any scheme.</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '75vh', overflowY: 'auto' }}>
          {error && <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{error}</span></div>}

          <div>
            <label style={labelStyle}>What do you call this formula?</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Naal Vaddi Interest"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>When does the customer pay you back?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ACCRUAL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, accrual_mode: opt.value })}
                  style={{
                    textAlign: 'left', borderRadius: 10, padding: 14, cursor: 'pointer',
                    border: form.accrual_mode === opt.value ? '2px solid #0F172A' : '1px solid #E2E8F0',
                    background: form.accrual_mode === opt.value ? '#F8FAFC' : '#FFFFFF'
                  }}
                >
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#0F172A', marginBottom: 3 }}>{opt.label}</div>
                  <div style={{ fontSize: '0.76rem', color: '#64748B' }}>{opt.example}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>How is interest charged?</label>
            <FormulaBuilder
              value={form.interest_formula}
              onChange={tokens => setForm({ ...form, interest_formula: tokens })}
              availableVariables={form.accrual_mode === 'SCHEDULED'
                ? ['principal', 'outstanding', 'rate', 'tenure_days', 'period', 'periods']
                : ['principal', 'outstanding', 'rate', 'days', 'tenure_days']}
            />
          </div>

          {form.accrual_mode === 'SCHEDULED' && (
            <div>
              <label style={labelStyle}>How much is due each period?</label>
              <FormulaBuilder
                value={form.installment_formula}
                onChange={tokens => setForm({ ...form, installment_formula: tokens })}
                availableVariables={['principal', 'outstanding', 'rate', 'tenure_days', 'period', 'periods']}
              />
            </div>
          )}

          {interestValid && installmentValid && (
            <div>
              <label style={labelStyle}>Estimate</label>
              <FormulaDurationPreview
                accrualMode={form.accrual_mode}
                interestFormulaTokens={form.interest_formula}
                installmentFormulaTokens={form.installment_formula}
                rate={2}
                repaymentFrequency="DAILY"
                tenureMonths={6}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid #E2E8F0' }}>
          <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            style={{ background: canSave ? '#0F172A' : '#CBD5E1', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: '0.8rem', fontWeight: 500, cursor: canSave ? 'pointer' : 'not-allowed' }}
          >
            Save Formula
          </button>
        </div>
      </div>
    </div>
  );
}
