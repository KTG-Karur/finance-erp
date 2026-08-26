import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, FileText } from 'lucide-react';

const fmt = n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function DedicatedThermalPrintModal({ company = {}, receipt, onClose }) {
  return createPortal(
    <div className="paper-receipt-printable-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 9999999, background: 'rgba(15, 23, 42, 0.55)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto'
    }}>
      <style>{`
        .voucher-print-only { display: none; }
        @media print {
          .voucher-print-only { display: block !important; }
        }
      `}</style>

      {/* ══════════ ON-SCREEN MODAL PREVIEW (never printed) ══════════ */}
      <div className="no-print" style={{
        background: '#FFFFFF', borderRadius: 16, width: '100%', maxWidth: 420, maxHeight: '90vh',
        overflowY: 'auto', boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3)', border: '1px solid #E2E8F0',
        fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0F172A'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Printer style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Thermal POS Receipt</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748B' }}>{receipt.voucher_no}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Screen Preview Body */}
        <div style={{ padding: 20, background: '#F1F5F9', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            background: '#FFFFFF', color: '#000000', width: '100%', maxWidth: 300, boxSizing: 'border-box',
            fontFamily: '"Courier New", Courier, monospace', padding: '16px 14px',
            fontSize: '0.78rem', lineHeight: 1.4, border: '1px solid #CBD5E1', boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000000', paddingBottom: 8, marginBottom: 8 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase' }}>{company.name || 'FINANCE ERP'}</div>
              {company.address && <div style={{ fontSize: '0.66rem', marginTop: 2 }}>{company.address}</div>}
              <div style={{ marginTop: 4, fontWeight: 700, border: '1px solid #000000', display: 'inline-block', padding: '1px 6px', fontSize: '0.68rem' }}>
                COLLECTION RECEIPT
              </div>
            </div>

            <div style={{ borderBottom: '1px dashed #000000', paddingBottom: 6, marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Voucher No:</span><strong>{receipt.voucher_no}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Date:</span><span>{receipt.date}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Account No:</span><strong>{receipt.loan_account_no || '—'}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Branch:</span><span>{receipt.branch || 'Main Branch'}</span></div>
            </div>

            <div style={{ borderBottom: '1px dashed #000000', paddingBottom: 6, marginBottom: 6 }}>
              <div>Borrower: <strong>{receipt.borrower_name}</strong></div>
              <div>Mobile  : <span>{receipt.phone || '—'}</span></div>
              <div>Mode    : <span>{receipt.payment_mode || 'CASH'} {receipt.reference_no ? `(${receipt.reference_no})` : ''}</span></div>
            </div>

            <div style={{ borderBottom: '1px dashed #000000', paddingBottom: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700, padding: '4px 0', borderBottom: '1px solid #000000' }}>
                <span>RECEIVED:</span>
                <span>Rs. {fmt(receipt.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}><span>Principal:</span><span>Rs. {fmt(receipt.principal_paid)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span>Interest:</span><span>Rs. {fmt(receipt.interest_paid)}</span></div>
              {receipt.penalty > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span>Penalty/Fees:</span><span>Rs. {fmt(receipt.penalty)}</span></div>
              )}
              {receipt.interest_shortfall > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span>Interest C/F:</span><span>Rs. {fmt(receipt.interest_shortfall)}</span></div>
              )}
              {receipt.interest_waiver > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span>Interest Waived:</span><span>Rs. {fmt(receipt.interest_waiver)}</span></div>
              )}
              {(receipt.interest_paid_upto || receipt.interest_to_date) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <span>Interest Period:</span>
                  <span>
                    {receipt.interest_from_date
                      ? `${receipt.interest_from_date} to ${receipt.interest_paid_upto || receipt.interest_to_date}${receipt.interest_days !== undefined && receipt.interest_days !== null ? ` (${receipt.interest_days}d)` : ''}`
                      : `Up to ${receipt.interest_paid_upto || receipt.interest_to_date}`}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontWeight: 700 }}><span>Pending Bal:</span><span>Rs. {fmt(receipt.pending_balance)}</span></div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.68rem' }}>
              <div>Collector Agent: <strong>{receipt.collector_name || 'Main Branch'}</strong></div>
              <div style={{ margin: '6px 0 2px 0', borderTop: '1px dashed #000000', paddingTop: 4 }}>*** THANK YOU - PAID SUCCESSFULLY ***</div>
              <div style={{ fontSize: '0.6rem', color: '#444444' }}>Computer Generated Collection Receipt</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="button" onClick={() => window.print()} style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: 'var(--brand-primary, #15803D)', color: '#FFFFFF', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb), 0.3)' }}>
            <Printer style={{ width: 15, height: 15 }} />
            <span>Print Now</span>
          </button>
        </div>
      </div>

      {/* ══════════ PRINT-ONLY 80mm THERMAL RECEIPT SLIP ══════════ */}
      <div className="voucher-print-only">
        <div className="paper-receipt-document" style={{
          background: '#FFFFFF', color: '#000000', borderRadius: 2,
          width: 300, maxWidth: '100%',
          border: '1px solid #000000', fontFamily: '"Courier New", Courier, monospace',
          padding: '16px 14px', boxSizing: 'border-box', fontSize: '0.78rem', lineHeight: 1.4
        }}>
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #000000', paddingBottom: 8, marginBottom: 8 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase' }}>{company.name || 'FINANCE ERP'}</div>
            {company.address && <div style={{ fontSize: '0.66rem', marginTop: 2 }}>{company.address}</div>}
            <div style={{ marginTop: 4, fontWeight: 700, border: '1px solid #000000', display: 'inline-block', padding: '1px 6px', fontSize: '0.68rem' }}>
              COLLECTION RECEIPT
            </div>
          </div>

          <div style={{ borderBottom: '1px dashed #000000', paddingBottom: 6, marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Voucher No:</span><strong>{receipt.voucher_no}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Date:</span><span>{receipt.date}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Account No:</span><strong>{receipt.loan_account_no || '—'}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Branch:</span><span>{receipt.branch || 'Main Branch'}</span></div>
          </div>

          <div style={{ borderBottom: '1px dashed #000000', paddingBottom: 6, marginBottom: 6 }}>
            <div>Borrower: <strong>{receipt.borrower_name}</strong></div>
            <div>Mobile  : <span>{receipt.phone || '—'}</span></div>
            <div>Mode    : <span>{receipt.payment_mode || 'CASH'} {receipt.reference_no ? `(${receipt.reference_no})` : ''}</span></div>
          </div>

          <div style={{ borderBottom: '1px dashed #000000', paddingBottom: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700, padding: '4px 0', borderBottom: '1px solid #000000' }}>
              <span>RECEIVED:</span>
              <span>Rs. {fmt(receipt.amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}><span>Principal:</span><span>Rs. {fmt(receipt.principal_paid)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span>Interest:</span><span>Rs. {fmt(receipt.interest_paid)}</span></div>
            {receipt.penalty > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span>Penalty/Fees:</span><span>Rs. {fmt(receipt.penalty)}</span></div>
            )}
            {receipt.interest_shortfall > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span>Interest C/F:</span><span>Rs. {fmt(receipt.interest_shortfall)}</span></div>
            )}
            {receipt.interest_waiver > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span>Interest Waived:</span><span>Rs. {fmt(receipt.interest_waiver)}</span></div>
            )}
            {(receipt.interest_paid_upto || receipt.interest_to_date) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span>Interest Period:</span>
                <span>
                  {receipt.interest_from_date
                    ? `${receipt.interest_from_date} to ${receipt.interest_paid_upto || receipt.interest_to_date}${receipt.interest_days !== undefined && receipt.interest_days !== null ? ` (${receipt.interest_days}d)` : ''}`
                    : `Up to ${receipt.interest_paid_upto || receipt.interest_to_date}`}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontWeight: 700 }}><span>Pending Bal:</span><span>Rs. {fmt(receipt.pending_balance)}</span></div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.68rem' }}>
            <div>Collector Agent: <strong>{receipt.collector_name || 'Main Branch'}</strong></div>
            <div style={{ margin: '6px 0 2px 0', borderTop: '1px dashed #000000', paddingTop: 4 }}>*** THANK YOU - PAID SUCCESSFULLY ***</div>
            <div style={{ fontSize: '0.6rem', color: '#444444' }}>Computer Generated Collection Receipt</div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
