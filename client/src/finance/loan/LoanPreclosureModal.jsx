import React, { useState, useEffect } from 'react';
import {
  X, CheckCircle2, Calculator, AlertCircle, Banknote,
  CreditCard, ArrowRight, ShieldCheck, FileCheck, RefreshCw,
  Clock, Calendar
} from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import DropdownSelect from '../../components/DropdownSelect';
import SharedDatePicker from '../../components/common/SharedDatePicker';

const fmt = n => Number(n || 0).toLocaleString('en-IN');

export default function LoanPreclosureModal({
  loan,
  onClose,
  onSuccess,
  onViewNoc
}) {
  const { t } = useLanguage();
  const today = new Date().toISOString().slice(0, 10);

  const [settlementDate, setSettlementDate] = useState(today);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [transactionRef, setTransactionRef] = useState('');
  const [foreclosureFee, setForeclosureFee] = useState(0);
  const [notes, setNotes] = useState('');

  const [quote, setQuote] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [settledResult, setSettledResult] = useState(null);

  // Fetch live preclosure quote from backend API
  const fetchQuote = async (date) => {
    if (!loan?.id) return;
    setLoadingQuote(true);
    setError('');
    try {
      const res = await axios.get(`/api/v1/finance/loans/${loan.id}/preclosure-quote`, {
        params: { as_of_date: date }
      });
      if (res.data?.success) {
        setQuote(res.data.data);
      }
    } catch (err) {
      // Fallback calculation in client if offline / network hiccup
      const isEmi = loan.repayment_method === 'EMI';
      if (isEmi) {
        setQuote({
          repaymentMethod: 'EMI',
          asOfDate: date,
          principalAmount: Number(loan.principal_amount),
          pendingAmount: Number(loan.pending_amount),
          preclosurePayoffAmount: Number(loan.pending_amount),
          pendingEmisCount: loan.schedules ? loan.schedules.filter(s => s.status !== 'PAID').length : 0,
          ruleDescription: 'EMI Preclosure: Full payment of all pending installments.'
        });
      } else {
        const principal = Number(loan.principal_amount) || 0;
        const rate = Number(loan.monthly_interest_rate) || 0;
        const sDate = loan.last_payment_date || loan.loan_date;
        const diffMs = Math.max(0, new Date(date) - new Date(sDate));
        const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        const accrued = Math.round(principal * ((rate / 100) / 30) * days);
        setQuote({
          repaymentMethod: 'INTEREST_ONLY',
          asOfDate: date,
          principalAmount: principal,
          lastPaymentDate: sDate,
          daysElapsed: days,
          monthlyInterestRate: rate,
          accruedInterest: accrued,
          preclosurePayoffAmount: principal + accrued,
          ruleDescription: 'Normal Interest Preclosure: Principal amount + accrued interest till settlement date.'
        });
      }
    } finally {
      setLoadingQuote(false);
    }
  };

  useEffect(() => {
    fetchQuote(settlementDate);
  }, [loan?.id, settlementDate]);

  const totalPayableWithFee = (Number(quote?.preclosurePayoffAmount || 0) + Number(foreclosureFee || 0));

  const handleExecutePreclosure = async (e) => {
    e?.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await axios.post(`/api/v1/finance/loans/${loan.id}/preclose`, {
        settlement_date: settlementDate,
        payment_mode: paymentMode,
        transaction_ref: transactionRef,
        foreclosure_fee: Number(foreclosureFee || 0),
        notes
      });

      if (res.data?.success) {
        setSettledResult(res.data.data);
        onSuccess?.(res.data.data);
      } else {
        setError(res.data?.message || 'Preclosure failed.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to execute preclosure.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: 14,
        maxWidth: 580,
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0F172A'
      }}>
        
        {/* Modal Header */}
        <div style={{
          padding: '16px 22px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F8FAFC'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--brand-primary-light, #F0FEF5)',
              border: '1px solid var(--brand-primary-border, #A3F5C1)',
              color: 'var(--brand-primary, #15803D)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldCheck style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#0F172A' }}>
                Loan Preclosure & Early Settlement
              </h3>
              <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                Account: <strong>{loan?.loan_account_no}</strong> | {loan?.borrower_name}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#64748B',
              width: 30,
              height: 30,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* Modal Body */}
        {settledResult ? (
          /* Success Screen with NOC Print Option */
          <div style={{ padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#F0FDF4',
              border: '2px solid #BBF7D0',
              color: '#15803D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 style={{ width: 32, height: 32 }} />
            </div>

            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                Loan Preclosed & Fully Settled!
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                Total settlement of <strong>₹{fmt(settledResult.totalPaid)}</strong> received. Receipt: <code>{settledResult.receiptNo}</code>
              </p>
            </div>

            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '12px 18px',
              width: '100%',
              maxWidth: 420,
              textAlign: 'left',
              fontSize: '0.78rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Settlement Date:</span>
                <span style={{ fontWeight: 600 }}>{settledResult.settlementDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Voucher No:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{settledResult.voucherNo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Account Status:</span>
                <span style={{ color: '#15803D', fontWeight: 700 }}>CLOSED</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewNoc?.(loan);
                }}
                style={{
                  background: 'var(--brand-primary, #15803D)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 18px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <FileCheck style={{ width: 15, height: 15 }} />
                <span>View & Print NOC Certificate</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#FFFFFF',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  padding: '9px 18px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close Dialog
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleExecutePreclosure} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Calculation Rule Banner */}
            <div style={{
              background: quote?.repaymentMethod === 'EMI' ? '#EFF6FF' : '#F0FEF5',
              border: `1px solid ${quote?.repaymentMethod === 'EMI' ? '#BFDBFE' : '#A3F5C1'}`,
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10
            }}>
              <Calculator style={{ width: 18, height: 18, color: quote?.repaymentMethod === 'EMI' ? '#2563EB' : '#15803D', marginTop: 1, flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: quote?.repaymentMethod === 'EMI' ? '#1E40AF' : '#166534', display: 'block' }}>
                  {quote?.repaymentMethod === 'EMI' ? 'EMI Preclosure Settlement' : 'Normal Interest Preclosure Settlement'}
                </span>
                <span style={{ fontSize: '0.73rem', color: '#475569', lineHeight: 1.4 }}>
                  {quote?.repaymentMethod === 'EMI'
                    ? 'EMI preclosure requires paying all remaining pending installments in full.'
                    : 'Normal interest preclosure requires paying the Principal Amount + Accrued Interest till the settlement date.'}
                </span>
              </div>
            </div>

            {/* As of Settlement Date Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Settlement Date *
                </label>
                <SharedDatePicker
                  value={settlementDate}
                  onChange={(e) => setSettlementDate(e.target.value)}
                  max={today}
                  buttonStyle={{ height: 36 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Payment Mode *
                </label>
                <DropdownSelect
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  buttonStyle={{ height: 35 }}
                  options={[
                    { value: 'CASH', label: 'Cash in Hand' },
                    { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT / IMPS' },
                    { value: 'UPI', label: 'UPI / QR Code' },
                    { value: 'CHEQUE', label: 'Cheque Clearance' }
                  ]}
                />
              </div>
            </div>

            {/* Dynamic Payoff Breakdown Card */}
            {loadingQuote ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#64748B', fontSize: '0.8rem' }}>
                <RefreshCw style={{ width: 16, height: 16, animation: 'spin 1s linear infinite', display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />
                Calculating payoff breakdown...
              </div>
            ) : quote?.repaymentMethod === 'EMI' ? (
              /* EMI Breakdown */
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: '#64748B' }}>Total Pending Installments:</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{quote.pendingEmisCount || 0} installments</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: '#64748B' }}>Sanctioned Principal:</span>
                  <span style={{ fontWeight: 600 }}>₹{fmt(quote.principalAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: '#64748B' }}>Already Collected:</span>
                  <span style={{ fontWeight: 600, color: '#15803D' }}>₹{fmt(quote.collectedAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', borderTop: '1px solid #E2E8F0', paddingTop: 8 }}>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>All Pending EMIs Payoff:</span>
                  <span style={{ fontWeight: 800, color: '#2563EB' }}>₹{fmt(quote.preclosurePayoffAmount)}</span>
                </div>
              </div>
            ) : (
              /* Normal Interest (INTEREST_ONLY) Breakdown */
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: '#64748B' }}>Principal Outstanding:</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>₹{fmt(quote.principalAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: '#64748B' }}>Accrual Start Date:</span>
                  <span style={{ fontWeight: 600 }}>{quote.lastPaymentDate || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: '#64748B' }}>Days Elapsed ({quote.daysElapsed} days @ {quote.monthlyInterestRate}%/mo):</span>
                  <span style={{ fontWeight: 600, color: '#7C3AED' }}>+ ₹{fmt(quote.accruedInterest)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', borderTop: '1px solid #E2E8F0', paddingTop: 8 }}>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>Principal + Accrued Interest:</span>
                  <span style={{ fontWeight: 800, color: '#15803D' }}>₹{fmt(quote.preclosurePayoffAmount)}</span>
                </div>
              </div>
            )}

            {/* Foreclosure Fee & Reference Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Foreclosure / Processing Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={foreclosureFee}
                  onChange={(e) => setForeclosureFee(Math.max(0, Number(e.target.value)))}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 7,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Ref / Transaction / UTR No
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. UTR-987654321"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 7,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Settlement Notes / Remarks
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Customer requested early full settlement"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 7,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Total Payoff Hero Bar */}
            <div style={{
              background: '#0F172A',
              color: '#FFFFFF',
              borderRadius: 10,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Settlement Amount Due
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4ADE80' }}>
                  ₹{fmt(totalPayableWithFee)}
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#CBD5E1' }}>
                Mode: <strong>{paymentMode}</strong>
              </div>
            </div>

            {error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                padding: '8px 12px',
                borderRadius: 7,
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <AlertCircle style={{ width: 14, height: 14 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Modal Actions Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{
                  background: '#FFFFFF',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || loadingQuote}
                style={{
                  background: 'var(--brand-primary, #15803D)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 20px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)'
                }}
              >
                <CheckCircle2 style={{ width: 15, height: 15 }} />
                <span>{submitting ? 'Executing Settlement...' : `Preclose & Collect ₹${fmt(totalPayableWithFee)}`}</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
