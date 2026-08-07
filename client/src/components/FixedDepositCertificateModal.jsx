import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';

// Formal, compact A4 Fixed Deposit certificate — on-screen preview + print,
// using the same .printable-form-overlay isolation as every other printable
// sheet in the app. Keeps the traditional "bank certificate" look (double
// border frame, bordered key-value table, boxed maturity value, signature
// lines) but with tight, consistent spacing instead of the loose/uneven
// gaps of the old raw-HTML version.
export default function FixedDepositCertificateModal({ company = {}, fd, labels, onClose }) {
  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const isPremature = fd.status === 'CLOSED_PREMATURE';
  const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const rows = [
    [labels.fdAccountNo, fd.fd_account_no],
    [labels.customer, fd.customer_name],
    [labels.principal, `₹${fmt(fd.principal_amount)}`],
    [labels.rate, `${fd.interest_rate}% p.a.`],
    [labels.tenure, `${fd.tenure_months} ${labels.months}`],
    [labels.scheme, fd.scheme === 'CUMULATIVE' ? labels.cumulative : labels.monthlyPayout],
    [labels.bookingDate, fd.booking_date],
    [labels.maturityDate, fd.maturity_date],
    [labels.status, labels.statusText]
  ].filter(Boolean);

  const content = (
    <div className="printable-form-overlay">
      <div className="printable-form-floating-btns">
        <button type="button" className="btn-close" onClick={onClose}>
          <X style={{ width: 14, height: 14 }} />
          <span>Close</span>
        </button>
        <button type="button" className="btn-print" onClick={() => window.print()}>
          <Printer style={{ width: 14, height: 14 }} />
          <span>Print</span>
        </button>
      </div>

      <style>{`
        .fd-cert-paper {
          width: 210mm;
          max-width: 100%;
          box-sizing: border-box;
          background: #FFFFFF;
          margin: 0 auto 60px auto;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
          border-radius: 4px;
        }
        .fd-cert-table td, .fd-cert-table th {
          white-space: normal; word-break: normal; overflow-wrap: break-word;
        }
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          .fd-cert-paper {
            width: 100% !important; max-width: none !important; box-shadow: none !important;
            border-radius: 0 !important; margin: 0 !important; padding: 0 !important;
          }
        }
      `}</style>

      <div className="fd-cert-paper" style={{ padding: '14mm', fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", Arial, sans-serif', color: '#000000' }}>
        <div style={{ border: '2px solid #000000', padding: '10mm 12mm', display: 'flex', flexDirection: 'column', minHeight: '265mm' }}>

          {/* Letterhead */}
          <div style={{ textAlign: 'center', borderBottom: '1.5px solid #000000', paddingBottom: 12, marginBottom: 16 }}>
            {company.logo && <img src={company.logo} alt="" style={{ width: 42, height: 42, objectFit: 'contain', margin: '0 auto 6px auto', display: 'block' }} />}
            <div style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '0.01em' }}>{company.name || 'Finance ERP'}</div>
            {company.address && <div style={{ fontSize: '0.74rem', color: '#333333', marginTop: 3 }}>{company.address}</div>}
            {(company.phone || company.email || company.gstin) && (
              <div style={{ fontSize: '0.7rem', color: '#333333', marginTop: 2 }}>
                {[company.phone ? `Ph: ${company.phone}` : null, company.email, company.gstin ? `GSTIN: ${company.gstin}` : null].filter(Boolean).join('  |  ')}
              </div>
            )}
          </div>

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: '1.02rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{labels.title}</div>
            <div style={{ fontSize: '0.76rem', color: '#444444', marginTop: 4 }}>{labels.certificateNo}: <strong style={{ color: '#000000' }}>{fd.fd_account_no}</strong></div>
          </div>

          {/* Key-value table */}
          <table className="fd-cert-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: 18 }}>
            <colgroup>
              <col style={{ width: '38%' }} />
              <col style={{ width: '62%' }} />
            </colgroup>
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label}>
                  <td style={{ border: '1px solid #000000', padding: '8px 12px', fontWeight: 600, background: '#F4F4F4' }}>{label}</td>
                  <td style={{ border: '1px solid #000000', padding: '8px 12px' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Maturity value box */}
          <div style={{ border: '1.5px solid #000000', textAlign: 'center', padding: '14px 16px', marginBottom: 24 }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#333333' }}>
              {isPremature ? labels.payoutAfterPenalty : labels.maturityValue}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 4 }}>
              ₹{fmt(isPremature ? fd.payout_amount : fd.maturity_value)}
            </div>
          </div>

          {/* Signatures — pushed to the bottom of the frame */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 40 }}>
            <div style={{ textAlign: 'center', width: '42%' }}>
              <div style={{ borderTop: '1px solid #000000', paddingTop: 6, fontSize: '0.72rem', color: '#333333' }}>{labels.customerSignature}</div>
            </div>
            <div style={{ textAlign: 'center', width: '42%' }}>
              <div style={{ borderTop: '1px solid #000000', paddingTop: 6, fontSize: '0.72rem', color: '#333333' }}>{labels.authorizedSignatory}</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.66rem', color: '#666666', marginTop: 16 }}>
            {labels.generatedOn}: {now}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
