import React from 'react';
import { ShieldCheck, Printer, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

const fmt = n => Number(n || 0).toLocaleString('en-IN');

export default function PrintableNocCertificate({
  loan,
  tenant,
  onClose
}) {
  const { t } = useLanguage();
  const orgName = tenant?.name || 'Financial Services Enterprise';
  const orgAddress = tenant?.address || '';
  const orgPhone = tenant?.phone || '';
  const orgGstin = tenant?.gstin || '';

  const snapshot = typeof loan?.closure_snapshot === 'string'
    ? JSON.parse(loan.closure_snapshot || '{}')
    : (loan?.closure_snapshot || {});

  const settlementDate = snapshot.settlement_date || snapshot.closed_date || loan?.last_payment_date || new Date().toISOString().slice(0, 10);
  const closureType = snapshot.closure_type === 'PRECLOSURE' ? 'Early Foreclosure Settlement' :
                      snapshot.closure_type === 'EMERGENCY_WRITE_OFF' ? 'Compromise / Special Settlement' :
                      'Regular Full Repayment Settlement';

  const totalPaid = snapshot.total_settlement_paid || snapshot.compromise_recovery || loan?.collected_amount || 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: 12,
        maxWidth: 800,
        width: '100%',
        maxHeight: '94vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0F172A'
      }}>
        {/* Top Control Bar (Hidden during print) */}
        <div className="no-print" style={{
          padding: '12px 20px',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} />
            <span>Back to Loans</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--brand-primary, #15803D)',
              color: '#FFFFFF',
              border: 'none',
              padding: '6px 16px',
              borderRadius: 6,
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <Printer style={{ width: 14, height: 14 }} />
            <span>Print NOC Certificate</span>
          </button>
        </div>

        {/* Certificate Printable Body */}
        <div id="printable-noc" style={{
          padding: '40px 48px',
          background: '#FFFFFF',
          minHeight: 650,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Header */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              borderBottom: '2px solid #0F172A',
              paddingBottom: 16
            }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                  {orgName}
                </h1>
                {orgAddress && <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748B' }}>{orgAddress}</p>}
                {orgPhone && <p style={{ margin: '1px 0 0', fontSize: '0.75rem', color: '#64748B' }}>Phone: {orgPhone}</p>}
                {orgGstin && <p style={{ margin: '1px 0 0', fontSize: '0.75rem', color: '#64748B' }}>GSTIN: {orgGstin}</p>}
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 20,
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  color: '#15803D',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  <ShieldCheck style={{ width: 13, height: 13 }} />
                  ACCOUNT FULLY CLOSED
                </span>
                <p style={{ margin: '6px 0 0', fontSize: '0.74rem', color: '#64748B' }}>
                  Date: <strong>{settlementDate}</strong>
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#64748B' }}>
                  Branch: <strong>{loan?.branch || 'Main Branch'}</strong>
                </p>
              </div>
            </div>

            {/* Certificate Title */}
            <div style={{ textAlign: 'center', margin: '24px 0 20px' }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.2rem',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                textDecoration: 'underline'
              }}>
                NO OBJECTION & LOAN CLEARANCE CERTIFICATE
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block', marginTop: 4 }}>
                Ref No: NOC-{loan?.loan_account_no}-{Date.now().toString().slice(-4)}
              </span>
            </div>

            {/* Certificate Narrative */}
            <div style={{ fontSize: '0.84rem', lineHeight: 1.65, color: '#334155', marginBottom: 24 }}>
              <p>To Whom It May Concern,</p>
              <p>
                This is to officially certify that <strong>Mr./Ms. {loan?.borrower_name}</strong> (Borrower Code: <code>{loan?.borrower_code || 'BOR-' + loan?.borrower_id}</code>, Phone: <strong>{loan?.phone || '—'}</strong>) had availed a loan facility from <strong>{orgName}</strong> under Loan Account Number <strong>{loan?.loan_account_no}</strong> on <strong>{loan?.loan_date}</strong>.
              </p>
              <p>
                We hereby confirm that the entire liability against the aforementioned loan account has been <strong>fully settled and liquidated</strong> in accordance with our institutional policies via <strong>{closureType}</strong> on <strong>{settlementDate}</strong>.
              </p>
            </div>

            {/* Financial Summary Table */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '14px 18px',
              marginBottom: 24
            }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Settlement Particulars
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 20px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: 4 }}>
                  <span style={{ color: '#64748B' }}>Sanctioned Principal Amount:</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>₹{fmt(loan?.principal_amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: 4 }}>
                  <span style={{ color: '#64748B' }}>Total Amount Paid:</span>
                  <span style={{ fontWeight: 700, color: '#15803D' }}>₹{fmt(totalPaid)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: 4 }}>
                  <span style={{ color: '#64748B' }}>Repayment Scheme Method:</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{loan?.repayment_method === 'EMI' ? 'EMI Installment Plan' : 'Normal Interest Plan'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: 4 }}>
                  <span style={{ color: '#64748B' }}>Current Outstanding Balance:</span>
                  <span style={{ fontWeight: 800, color: '#15803D' }}>₹0.00 (NIL)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: 4 }}>
                  <span style={{ color: '#64748B' }}>Settlement Voucher Ref:</span>
                  <span style={{ fontFamily: 'monospace', color: '#0F172A' }}>{snapshot.voucher_no || 'VCH-AUTO-SETTLED'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: 4 }}>
                  <span style={{ color: '#64748B' }}>Settlement Receipt No:</span>
                  <span style={{ fontFamily: 'monospace', color: '#0F172A' }}>{snapshot.receipt_no || 'REC-SETTLED'}</span>
                </div>
              </div>
            </div>

            {/* Zero Liability Clause */}
            <div style={{
              borderLeft: '4px solid #15803D',
              background: '#F0FDF4',
              padding: '10px 14px',
              borderRadius: '0 6px 6px 0',
              fontSize: '0.76rem',
              lineHeight: 1.5,
              color: '#166534',
              marginBottom: 30
            }}>
              <strong>Zero Liability Declaration:</strong> As of {settlementDate}, there are no outstanding dues, penal interest, or administrative charges payable by the borrower against Loan Account #{loan?.loan_account_no}. All securities, documents, and hypothecations held against this loan stand discharged.
            </div>
          </div>

          {/* Signatures Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            paddingTop: 30,
            borderTop: '1px solid #CBD5E1'
          }}>
            <div style={{ textAlign: 'center', width: 200 }}>
              <div style={{ height: 40 }} />
              <div style={{ borderTop: '1px solid #475569', paddingTop: 6, fontSize: '0.74rem', fontWeight: 600, color: '#475569' }}>
                Customer Signature / Acknowledgment
              </div>
            </div>

            <div style={{ textAlign: 'center', width: 220 }}>
              <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginBottom: 20 }}>
                [Institutional Seal]
              </div>
              <div style={{ borderTop: '1px solid #475569', paddingTop: 6, fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>
                Authorized Signatory
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 400 }}>{orgName}</div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Print Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-noc, #printable-noc * {
            visibility: visible;
          }
          #printable-noc {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
