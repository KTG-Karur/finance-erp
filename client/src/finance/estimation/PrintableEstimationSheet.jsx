import React from 'react';
import { createPortal } from 'react-dom';
import { Printer, ArrowLeft, X, FileText, CheckCircle2 } from 'lucide-react';

export default function PrintableEstimationSheet({
  estimateData,
  tenant,
  onClose,
  onApplyLoan
}) {
  if (!estimateData) return null;

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  const companyInfo = {
    name: tenant?.name || 'Financial ERP System',
    tagline: 'Licensed Non-Banking Financial Company',
    address: tenant?.address || 'Main Branch Office',
    contact: tenant?.phone ? `Tel: ${tenant.phone}` : 'Customer Support: 1800-123-4567'
  };

  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <div className="printable-form-overlay">
      {/* Floating Action Header (Hidden during actual browser print) */}
      <div className="printable-form-floating-btns">
        <button type="button" onClick={onClose} className="btn-close" title="Close Preview">
          <ArrowLeft style={{ width: 16, height: 16 }} /> Back to Estimator
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={handlePrint} className="btn-print">
            <Printer style={{ width: 16, height: 16 }} /> Print Quotation Slip
          </button>
          {onApplyLoan && (
            <button 
              type="button" 
              onClick={() => {
                onClose();
                onApplyLoan(estimateData);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: 'var(--brand-primary, #15803D)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.8125rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <CheckCircle2 style={{ width: 16, height: 16 }} /> Apply For Loan
            </button>
          )}
        </div>
      </div>

      {/* Printable Sheet Body */}
      <div className="printable-sheet-paper" style={{ maxWidth: '800px', margin: '0 auto', background: '#ffffff', padding: '32px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        
        {/* Header Section */}
        <div style={{ borderBottom: '2px solid #0F172A', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0, textTransform: 'uppercase' }}>
              {companyInfo.name}
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '4px 0 0 0' }}>{companyInfo.tagline}</p>
            <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '2px 0 0 0' }}>{companyInfo.address} • {companyInfo.contact}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'inline-block', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '6px 12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>OFFICIAL LOAN QUOTATION</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '6px 0 0 0' }}>Date: <strong>{todayStr}</strong></p>
            <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '2px 0 0 0' }}>Quote Ref: <strong>EST-{Math.floor(100000 + Math.random() * 900000)}</strong></p>
          </div>
        </div>

        {/* Scheme & Sanction Summary Table */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px', marginBottom: '12px' }}>
            1. LOAN SANCTION & SCHEME TERMS
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <tbody>
              <tr style={{ background: '#F8FAFC' }}>
                <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', fontWeight: 600, color: '#475569', width: '30%' }}>Selected Scheme:</td>
                <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', fontWeight: 700, color: '#0F172A' }}>{estimateData.schemeName || 'Standard Loan Scheme'}</td>
                <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', fontWeight: 600, color: '#475569', width: '25%' }}>Repayment Method:</td>
                <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', fontWeight: 700, color: '#0F172A' }}>{estimateData.repaymentMethod === 'EMI' ? 'Equal Monthly Installment (EMI)' : 'Interest Only'}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', fontWeight: 600, color: '#475569' }}>Sanction Principal:</td>
                <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', fontWeight: 700, color: '#15803D' }}>{fmt(estimateData.principal)}</td>
                <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', fontWeight: 600, color: '#475569' }}>Interest Calculation:</td>
                <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', fontWeight: 700, color: '#0F172A' }}>{estimateData.interestCalculation === 'FLEXIBLE_REDUCING' ? 'Flexible Reducing Balance' : 'Flat Constant Rate'}</td>
              </tr>
              <tr style={{ background: '#F8FAFC' }}>
                <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', fontWeight: 600, color: '#475569' }}>Monthly Interest Rate:</td>
                <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', fontWeight: 700, color: '#0F172A' }}>{estimateData.monthlyRate}% per month ({estimateData.monthlyRate * 12}% p.a.)</td>
                <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', fontWeight: 600, color: '#475569' }}>Tenure & Frequency:</td>
                <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', fontWeight: 700, color: '#0F172A' }}>{estimateData.tenureMonths} Months ({estimateData.repaymentFrequency})</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Financial Breakdown & Net Disbursement */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px', marginBottom: '12px' }}>
            2. NET DISBURSEMENT & CHARGES BREAKDOWN
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', color: '#475569' }}>Gross Sanction Amount:</td>
                  <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', textAlign: 'right', fontWeight: 700 }}>{fmt(estimateData.principal)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', color: '#DC2626' }}>Less: Processing Fee:</td>
                  <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', textAlign: 'right', fontWeight: 600, color: '#DC2626' }}>- {fmt(estimateData.processingFee)}</td>
                </tr>
                {estimateData.advanceEmiAmount > 0 && (
                  <tr>
                    <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', color: '#DC2626' }}>Less: Advance EMI:</td>
                    <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', textAlign: 'right', fontWeight: 600, color: '#DC2626' }}>- {fmt(estimateData.advanceEmiAmount)}</td>
                  </tr>
                )}
                <tr style={{ background: '#F0FEF5' }}>
                  <td style={{ padding: '10px 12px', border: '2px solid #A3F5C1', fontWeight: 800, color: '#075F27' }}>NET DISBURSED AMOUNT:</td>
                  <td style={{ padding: '10px 12px', border: '2px solid #A3F5C1', textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: '#075F27' }}>{fmt(estimateData.netDisbursed)}</td>
                </tr>
              </tbody>
            </table>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', color: '#475569' }}>Installment Amount:</td>
                  <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', textAlign: 'right', fontWeight: 700, color: '#2563EB' }}>{fmt(estimateData.installmentAmount)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', color: '#475569' }}>Total Interest Chargeable:</td>
                  <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', textAlign: 'right', fontWeight: 700, color: '#D97706' }}>{fmt(estimateData.totalInterest)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', color: '#475569' }}>Total Repayable Amount:</td>
                  <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>{fmt(estimateData.totalPayable)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', color: '#475569' }}>Effective Annual APR:</td>
                  <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', textAlign: 'right', fontWeight: 700 }}>{estimateData.effectiveApr}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* First 6 Repayment Schedule Entries */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px', marginBottom: '12px' }}>
            3. INSTALLMENT SCHEDULE PREVIEW (FIRST PERIODS)
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={{ padding: '6px 10px', border: '1px solid #E2E8F0', textAlign: 'left' }}>#</th>
                <th style={{ padding: '6px 10px', border: '1px solid #E2E8F0', textAlign: 'left' }}>Due Date</th>
                <th style={{ padding: '6px 10px', border: '1px solid #E2E8F0', textAlign: 'right' }}>Principal (₹)</th>
                <th style={{ padding: '6px 10px', border: '1px solid #E2E8F0', textAlign: 'right' }}>Interest (₹)</th>
                <th style={{ padding: '6px 10px', border: '1px solid #E2E8F0', textAlign: 'right' }}>Total Installment (₹)</th>
                <th style={{ padding: '6px 10px', border: '1px solid #E2E8F0', textAlign: 'right' }}>Principal Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              {(estimateData.schedule || []).slice(0, 6).map((row, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '6px 10px', border: '1px solid #E2E8F0' }}>{row.period}</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #E2E8F0' }}>{row.due_date}</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #E2E8F0', textAlign: 'right' }}>{Number(row.principal || 0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #E2E8F0', textAlign: 'right' }}>{Number(row.interest || 0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #E2E8F0', textAlign: 'right', fontWeight: 700 }}>{Number(row.emi || 0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #E2E8F0', textAlign: 'right', fontWeight: 600, color: '#334155' }}>₹{Number(row.balance != null ? row.balance : 0).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(estimateData.schedule || []).length > 6 && (
            <p style={{ fontSize: '0.6875rem', color: '#64748B', fontStyle: 'italic', marginTop: '6px', textAlign: 'right' }}>
              * Showing first 6 installments of total {(estimateData.schedule || []).length} scheduled periods.
            </p>
          )}
        </div>

        {/* Disclaimer & Authorization Footer */}
        <div style={{ marginTop: '36px', paddingTop: '16px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.75rem', color: '#64748B' }}>
          <div style={{ maxWidth: '60%' }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#475569' }}>Terms & Disclaimer:</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.6875rem', lineHeight: '1.4' }}>
              This estimation slip is indicative and valid for 15 days from issue date. Final sanction is subject to KYC verification, credit evaluation, and management approval.
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid #0F172A', width: '160px', marginBottom: '4px' }}></div>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#0F172A' }}>Authorized Officer Signature</span>
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
