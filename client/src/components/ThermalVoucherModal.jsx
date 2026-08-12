import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, ImageOff, MapPin, FileText } from 'lucide-react';

const fmt = n => Number(n || 0).toLocaleString('en-IN');
const mapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

// The on-screen preview is a normal, spacious modal card — easy to read at
// a glance. What actually comes out of the printer is a completely separate
// block below (`.voucher-print-only`), styled to match a real 80mm POS
// thermal slip exactly as before. The two are switched via the stylesheet
// only (screen shows the modal, print shows the thermal block) so changing
// one can never accidentally change the other.
//
// There is one identifying number for a collection — its voucher_no, the
// same id as the auto-voucher journal entry posted for it. No separate
// "receipt number" concept exists anywhere in this template.
export default function ThermalVoucherModal({ company = {}, receipt, voidInfo = null, proofImage, location, onViewProof, extraActions = null, onClose }) {
  const isVoid = Boolean(voidInfo);

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
        background: '#FFFFFF', borderRadius: 16, width: '100%', maxWidth: 460, maxHeight: '90vh',
        overflowY: 'auto', boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3)', border: '1px solid #E2E8F0',
        fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0F172A'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600 }}>{receipt.title || 'Payment Voucher'}</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#64748B' }}>{receipt.voucher_no}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isVoid && (
            <div style={{ background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', borderRadius: 10, padding: '10px 14px', fontSize: '0.78rem', color: 'var(--color-danger-text, #991B1B)' }}>
              <strong>{voidInfo.label}</strong> — {voidInfo.reason || '—'}
              <div style={{ fontSize: '0.7rem', color: 'var(--color-danger-hover, #B91C1C)', marginTop: 3 }}>By {voidInfo.by || '—'} · {voidInfo.at ? new Date(voidInfo.at).toLocaleString('en-IN') : ''}</div>
            </div>
          )}

          {/* Amount hero */}
          <div style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.66rem', color: 'var(--brand-primary-hover, #0E5327)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.03em' }}>Amount Collected</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--brand-primary-hover, #0E5327)', marginTop: 2 }}>₹{fmt(receipt.amount)}</div>
            </div>
            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, background: '#FFFFFF', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary-hover, #0E5327)' }}>{receipt.payment_mode}</span>
          </div>

          {/* Details grid */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: '4px 18px' }}>
            {[
              ['Date', receipt.date],
              ['Branch', receipt.branch || '—'],
              ['Collected By', receipt.collector_name || '—'],
              ['Borrower', receipt.borrower_name],
              ['Phone', receipt.phone || '—'],
              ['Loan Account', receipt.loan_account_no || '—'],
              ['Reference No', receipt.reference_no || '—']
            ].map(([label, value], i, arr) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
                <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F172A' }}>{value}</span>
              </div>
            ))}
          </div>

          {(receipt.principal_paid !== undefined || receipt.interest_paid !== undefined || receipt.pending_balance !== undefined) && (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: '4px 18px' }}>
              {[
                receipt.principal_paid !== undefined ? ['Principal Portion', `₹${fmt(receipt.principal_paid)}`] : null,
                receipt.interest_paid !== undefined ? ['Interest Portion', `₹${fmt(receipt.interest_paid)}`] : null,
                receipt.pending_balance !== undefined ? ['Pending Balance', `₹${fmt(receipt.pending_balance)}`, receipt.pending_balance > 0 ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)'] : null
              ].filter(Boolean).map(([label, value, color], i, arr) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
                  <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: color || '#0F172A' }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {(proofImage !== undefined || location) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>Proof of Payment:</span>
                {proofImage ? (
                  <img src={proofImage} alt="Proof" onClick={() => onViewProof?.(proofImage)} style={{ width: 34, height: 34, borderRadius: 7, objectFit: 'cover', border: '1px solid var(--brand-primary-border, #A3F5C1)', cursor: 'pointer' }} />
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.74rem', color: '#94A3B8' }}><ImageOff style={{ width: 12, height: 12 }} />Not attached</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>Location:</span>
                {location ? (
                  <a href={mapsUrl(location.lat, location.lng)} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', color: 'var(--brand-primary, #15803D)', fontWeight: 600, textDecoration: 'none' }}>
                    <MapPin style={{ width: 12, height: 12 }} />View on Map
                  </a>
                ) : (
                  <span style={{ fontSize: '0.76rem', color: '#94A3B8' }}>Not captured</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10 }}>
          {extraActions}
          <button
            type="button"
            onClick={onClose}
            style={{ fontWeight: 500, border: '1px solid #CBD5E1', background: '#FFF', color: '#334155', padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            style={{ background: 'var(--brand-primary, #15803D)', fontWeight: 500, color: '#FFF', border: 'none', padding: '8px 18px', borderRadius: 10, cursor: 'pointer', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Printer style={{ width: 14, height: 14 }} />
            <span>Print Voucher</span>
          </button>
        </div>
      </div>

      {/* ══════════ PRINT-ONLY 80mm THERMAL VOUCHER (never shown on screen) ══════════
          Unchanged from the original thermal template — do not restyle. */}
      <div className="voucher-print-only">
        <div className="paper-receipt-document" style={{
          background: '#FFFFFF', color: '#000000', borderRadius: 2,
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)', width: 320, maxWidth: '100%',
          border: '1px solid #000000', fontFamily: '"Courier New", Courier, monospace, monospace',
          padding: '20px 16px', boxSizing: 'border-box', position: 'relative', fontSize: '0.78rem', lineHeight: 1.45
        }}>
          {/* POS Thermal Header */}
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #000000', paddingBottom: 10, marginBottom: 10 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {company.name || 'Finance ERP'}
            </div>
            {company.address && <div style={{ fontSize: '0.68rem', marginTop: 2 }}>{company.address}</div>}
            {(company.gstin || company.pan) && (
              <div style={{ fontSize: '0.65rem' }}>
                {[company.gstin ? `GSTIN: ${company.gstin}` : null, company.pan ? `PAN: ${company.pan}` : null].filter(Boolean).join(' | ')}
              </div>
            )}
            <div style={{ marginTop: 6, fontWeight: 700, border: '1px solid #000000', display: 'inline-block', padding: '2px 8px', fontSize: '0.7rem' }}>
              {receipt.title || 'PAYMENT COLLECTION VOUCHER'}
            </div>
          </div>

          {/* Voucher Key Fields */}
          <div style={{ borderBottom: '1px dashed #000000', paddingBottom: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Voucher No:</span>
              <strong>{receipt.voucher_no}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Date:</span>
              <span>{receipt.date}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Account No:</span>
              <strong>{receipt.loan_account_no || '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Branch:</span>
              <span>{receipt.branch || '—'}</span>
            </div>
          </div>

          {/* Customer Information */}
          <div style={{ borderBottom: '1px dashed #000000', paddingBottom: 8, marginBottom: 8 }}>
            <div>Borrower: <strong>{receipt.borrower_name}</strong></div>
            <div>Mobile  : <span>{receipt.phone || '—'}</span></div>
            <div>Mode    : <span>{receipt.payment_mode} {receipt.reference_no ? `(${receipt.reference_no})` : ''}</span></div>
          </div>

          {/* Financial Collection Itemization */}
          <div style={{ borderBottom: '1px dashed #000000', paddingBottom: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700, padding: '4px 0', borderBottom: '1px solid #000000' }}>
              <span>TODAY RECEIVED:</span>
              <span>Rs. {fmt(receipt.amount)}</span>
            </div>

            {receipt.principal_paid !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span>Principal Portion:</span>
                <span>Rs. {fmt(receipt.principal_paid)}</span>
              </div>
            )}
            {receipt.interest_paid !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span>Interest Portion:</span>
                <span>Rs. {fmt(receipt.interest_paid)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontWeight: 700 }}>
              <span>Pending Balance:</span>
              <span>Rs. {fmt(receipt.pending_balance)}</span>
            </div>
          </div>

          {/* Staff & Computer Generated Note */}
          <div style={{ textAlign: 'center', fontSize: '0.68rem' }}>
            <div>Collector Agent: <strong>{receipt.collector_name || '—'}</strong></div>
            <div style={{ margin: '8px 0 4px 0', borderTop: '1px dashed #000000', paddingTop: 6 }}>
              *** THANK YOU - PAID SUCCESSFULLY ***
            </div>
            <div style={{ fontSize: '0.6rem', color: '#444444' }}>Computer Generated Voucher</div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
