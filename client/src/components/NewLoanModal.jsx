import React, { useState } from 'react';
import { X, Banknote, Clock, ArrowRight, User, Phone, DollarSign, Percent, Calendar, FileText } from 'lucide-react';

export default function NewLoanModal({ isOpen, onClose, onSubmit, mode = 'DISBURSE', loanSchemes = [] }) {
  if (!isOpen) return null;

  const isAppMode = mode === 'APPLICATION';
  // Only active schemes can be picked for a new loan — inactive ones stay in Loan Scheme
  // Master for reference but shouldn't be offered here.
  const activeSchemes = loanSchemes.filter(s => s.is_active);
  const initialScheme = activeSchemes[0] || null;

  const [form, setForm] = useState({
    borrower_name: '',
    phone: '',
    principal_amount: 50000,
    monthly_interest_rate: initialScheme?.rate_per_unit ?? 2.0,
    tenure_months: 4,
    installment_amount: 500,
    purpose: 'Working Capital',
    scheme_id: initialScheme?.id || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const calculateInstallment = (principal, monthlyRate, tenureMonths) => {
    const p = parseFloat(principal) || 0;
    const mRate = parseFloat(monthlyRate) || 0;
    const months = parseFloat(tenureMonths) || 1;
    const totalDays = Math.round(months * 30);
    const dailyRatePct = mRate / 30;

    const totalInterest = Math.round(p * (dailyRatePct / 100) * totalDays);
    const totalPayable = p + totalInterest;

    return {
      totalPayable,
      dailyEmi: Math.ceil(totalPayable / Math.max(totalDays, 1)),
      dailyInterestAmt: Math.round(p * (dailyRatePct / 100))
    };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedForm = { ...form, [name]: value };

    // Selecting a scheme re-derives the interest rate from it, so the scheme actually
    // drives the loan terms instead of being a disconnected label.
    if (name === 'scheme_id') {
      const scheme = activeSchemes.find(s => String(s.id) === String(value));
      if (scheme) updatedForm.monthly_interest_rate = scheme.rate_per_unit;
    }

    if (name === 'principal_amount' || name === 'monthly_interest_rate' || name === 'tenure_months' || name === 'scheme_id') {
      const calc = calculateInstallment(
        name === 'principal_amount' ? value : form.principal_amount,
        name === 'scheme_id' ? updatedForm.monthly_interest_rate : (name === 'monthly_interest_rate' ? value : form.monthly_interest_rate),
        name === 'tenure_months' ? value : form.tenure_months
      );
      updatedForm.installment_amount = calc.dailyEmi;
    }

    setForm(updatedForm);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      onSubmit({
        ...form,
        principal_amount: parseFloat(form.principal_amount),
        interest_rate: parseFloat(form.monthly_interest_rate),
        tenure_days: Math.round(parseFloat(form.tenure_months) * 30),
        mode
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not save this loan.');
    } finally {
      setLoading(false);
    }
  };

  const calcDetails = calculateInstallment(form.principal_amount, form.monthly_interest_rate, form.tenure_months);
  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card saas-modal-card--lg" style={{ fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
        
        {/* Header */}
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{
              background: isAppMode ? '#FFFBEB' : '#ECFDF5',
              borderColor: isAppMode ? '#FDE68A' : '#A7F3D0',
              color: isAppMode ? '#D97706' : '#059669'
            }}>
              {isAppMode ? <Clock style={{ width: 18, height: 18 }} /> : <Banknote style={{ width: 18, height: 18 }} />}
            </div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600 }}>{isAppMode ? 'Submit New Loan Application' : 'Disburse New Loan Account'}</h3>
              <p style={{ fontWeight: 400 }}>{isAppMode ? 'Enter applicant details, requested credit amount & terms' : 'Enter customer details & disburse loan terms'}</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button">
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="saas-modal-body" style={{ padding: '20px 24px', gap: 16 }}>

            {error && (
              <div className="form-alert form-alert--error">
                <span>{error}</span>
              </div>
            )}

            {/* Customer Info Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label style={{ fontSize: '0.7rem', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {isAppMode ? 'Applicant Customer Name' : 'Customer Name'}
                </label>
                <input
                  type="text"
                  name="borrower_name"
                  value={form.borrower_name}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Kumar"
                  required
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: 9,
                    fontSize: '0.8125rem',
                    color: '#0F172A',
                    fontFamily: 'inherit',
                    fontWeight: 400
                  }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.7rem', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Mobile Contact Number
                </label>
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  required
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: 9,
                    fontSize: '0.8125rem',
                    color: '#0F172A',
                    fontFamily: 'inherit',
                    fontWeight: 400
                  }}
                />
              </div>
            </div>

            {/* Principal & Rate Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label style={{ fontSize: '0.7rem', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {isAppMode ? 'Requested Principal (₹)' : 'Principal Amount (₹)'}
                </label>
                <input
                  type="number"
                  name="principal_amount"
                  value={form.principal_amount}
                  onChange={handleChange}
                  step="1000"
                  min="1000"
                  required
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: 9,
                    fontSize: '0.8125rem',
                    color: '#0F172A',
                    fontFamily: 'inherit',
                    fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums'
                  }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.7rem', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Monthly Interest Rate (%)
                </label>
                <input
                  type="number"
                  name="monthly_interest_rate"
                  value={form.monthly_interest_rate}
                  onChange={handleChange}
                  step="0.1"
                  min="0.5"
                  max="10"
                  required
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: 9,
                    fontSize: '0.8125rem',
                    color: '#0F172A',
                    fontFamily: 'inherit',
                    fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums'
                  }}
                />
              </div>
            </div>

            {/* Loan Scheme */}
            <div className="form-group">
              <label style={{ fontSize: '0.7rem', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Loan Scheme
              </label>
              <select
                name="scheme_id"
                value={form.scheme_id}
                onChange={handleChange}
                style={{
                  width: '100%',
                  height: 38,
                  padding: '0 12px',
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: 9,
                  fontSize: '0.8125rem',
                  color: '#0F172A',
                  fontFamily: 'inherit',
                  fontWeight: 500
                }}
              >
                {activeSchemes.length === 0 && (
                  <option value="">No active loan schemes available</option>
                )}
                {activeSchemes.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.rate_per_unit}% p.m.)</option>
                ))}
              </select>
            </div>

            {/* Tenure & Purpose */}
            <div style={{ display: 'grid', gridTemplateColumns: isAppMode ? '1fr 1fr' : '1fr', gap: 14 }}>
              <div className="form-group">
                <label style={{ fontSize: '0.7rem', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Loan Tenure (Months)
                </label>
                <input
                  type="number"
                  name="tenure_months"
                  value={form.tenure_months}
                  onChange={handleChange}
                  min="1"
                  max="36"
                  required
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: 9,
                    fontSize: '0.8125rem',
                    color: '#0F172A',
                    fontFamily: 'inherit',
                    fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums'
                  }}
                />
              </div>

              {isAppMode && (
                <div className="form-group">
                  <label style={{ fontSize: '0.7rem', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Loan Purpose / Category
                  </label>
                  <input
                    type="text"
                    name="purpose"
                    value={form.purpose}
                    onChange={handleChange}
                    placeholder="e.g. Business Expansion"
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 12px',
                      background: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: 9,
                      fontSize: '0.8125rem',
                      color: '#0F172A',
                      fontFamily: 'inherit',
                      fontWeight: 400
                    }}
                  />
                </div>
              )}
            </div>

            {/* Calculation Preview Strip */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '14px 16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginTop: 4
            }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', fontWeight: 500, textTransform: 'uppercase' }}>Total Payable Amount</span>
                <strong style={{ fontSize: '0.95rem', color: '#0F172A', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>₹{fmt(calcDetails.totalPayable)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', fontWeight: 500, textTransform: 'uppercase' }}>Daily Installment (EMI)</span>
                <strong style={{ fontSize: '0.95rem', color: '#059669', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>₹{fmt(calcDetails.dailyEmi)} / day</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', fontWeight: 500, textTransform: 'uppercase' }}>Tenure Duration</span>
                <strong style={{ fontSize: '0.95rem', color: '#2563EB', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{Math.round(form.tenure_months * 30)} Days</strong>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="saas-modal-footer" style={{ padding: '16px 24px' }}>
            <button type="button" onClick={onClose} className="btn-cancel" style={{ fontWeight: 500 }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-submit"
              style={{
                background: isAppMode ? '#D97706' : '#059669',
                fontWeight: 500
              }}
            >
              {loading ? 'Processing...' : (isAppMode ? 'Submit Loan Application' : 'Disburse Loan Account')}
              <ArrowRight style={{ width: 14, height: 14, marginLeft: 6 }} />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
