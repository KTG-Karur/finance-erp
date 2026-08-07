import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDateDisplay(dStr) {
  if (!dStr) return new Date().toLocaleDateString('en-GB');
  if (dStr.includes('/')) return dStr;
  const parts = dStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dStr;
}

export default function VoucherReceiptModal({ company = {}, voucher, accountName, typeLabel, onClose }) {
  const fmt = n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalDebit = (voucher?.lines || []).reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = (voucher?.lines || []).reduce((s, l) => s + (l.credit || 0), 0);
  const voucherAmount = totalDebit || totalCredit || 0;

  if (!voucher) return null;

  const hasDebitCash = (voucher.lines || []).some(l => (l.account_code === '1001' || l.account_code === '1002') && l.debit > 0);
  const derivedDirection = voucher.direction || (hasDebitCash ? 'Money In' : 'Money Out');
  const derivedMode = voucher.mode || (voucher.payment_mode ? voucher.payment_mode : 'Cash');
  const derivedSource = voucher.source || voucher.ref_type || 'General Entry';

  const content = (
    <div className="printable-form-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }}>
      
      <style>{`
        .voucher-modal-container {
          width: 440px;
          max-width: 95vw;
          box-sizing: border-box;
          background: #FFFFFF;
          margin: 0 auto;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #CBD5E1;
        }
        .medium-thermal-receipt {
          background: #FFFFFF;
          padding: 24px 22px;
          font-family: -apple-system, BlinkMacSystemFont, "SF Mono", "Courier New", Courier, monospace;
          color: #000000;
        }
        .printable-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #047857;
          color: #FFFFFF;
          border: none;
          padding: 7px 16px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 2px 6px rgba(4, 120, 87, 0.25);
        }
        .printable-btn-primary:hover {
          background: #065F46;
          box-shadow: 0 4px 10px rgba(4, 120, 87, 0.35);
        }
        .printable-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #F8FAFC;
          color: #334155;
          border: 1px solid #CBD5E1;
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .printable-btn-secondary:hover {
          background: #F1F5F9;
          color: #0F172A;
        }
        @media print {
          @page {
            size: 100mm auto;
            margin: 2mm;
          }
          body { background: #FFFFFF !important; }
          .printable-form-overlay { position: static !important; padding: 0 !important; background: transparent !important; display: block !important; backdrop-filter: none !important; }
          .printable-form-header-bar { display: none !important; }
          .voucher-modal-container {
            width: 100mm !important;
            max-width: 100mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
            margin: 0 auto !important;
          }
          .medium-thermal-receipt {
            padding: 2mm 4mm !important;
            font-size: 12px !important;
          }
        }
      `}</style>

      {/* Main Modal Window Frame */}
      <div className="voucher-modal-container">
        
        {/* Onscreen Header Action Bar */}
        <div className="printable-form-header-bar" style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF' }}>
          <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 600, color: '#0F172A', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            Thermal Receipt Preview
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="printable-btn-primary"
              onClick={() => window.print()}
            >
              <Printer style={{ width: 14, height: 14 }} />
              <span>Print Receipt</span>
            </button>

            <button
              type="button"
              className="printable-btn-secondary"
              onClick={onClose}
            >
              <X style={{ width: 15, height: 15 }} />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Container Window */}
        <div style={{ maxHeight: '80vh', overflowY: 'auto', background: '#F8FAFC', padding: '12px 14px' }}>
          
          {/* Medium Thermal Cash Receipt Slip */}
          <div className="medium-thermal-receipt" style={{ border: '1px solid #E2E8F0', borderRadius: 8 }}>
        
        {/* Company Header */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', color: '#000000' }}>
            {company.name || 'Alpha Financial Services Ltd'}
          </h2>
          <div style={{ fontSize: '0.74rem', marginTop: 3, color: '#333333' }}>
            {company.address || 'Head Office: Main Financial District, TN'}
          </div>
          <div style={{ fontSize: '0.72rem', marginTop: 2, color: '#333333' }}>
            {[company.phone ? `Ph: ${company.phone}` : 'Ph: +91 98765 43210', company.email || 'info@alphafinance.com'].join(' · ')}
          </div>
          
          <div style={{ margin: '12px 0 8px 0', borderTop: '1px dashed #000000', borderBottom: '1px dashed #000000', padding: '5px 0', fontSize: '0.86rem', fontWeight: 700, textTransform: 'uppercase' }}>
            *** {typeLabel || (derivedDirection === 'Money In' ? 'CASH RECEIPT' : 'PAYMENT VOUCHER')} ***
          </div>
        </div>

        {/* Voucher Metadata Table */}
        <div style={{ fontSize: '0.76rem', lineHeight: 1.6, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Voucher No:</span>
            <strong>{voucher.id}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Date & Time:</span>
            <span>{formatDateDisplay(voucher.date)} {fmtTime(voucher.created_at)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Payment Mode:</span>
            <strong>{derivedMode}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Direction:</span>
            <span>{derivedDirection}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Branch Office:</span>
            <span>{voucher.branch || 'Main Branch'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Ref / Source:</span>
            <span>{derivedSource}</span>
          </div>
        </div>

        <div style={{ borderTop: '1px dashed #000000', marginBottom: 12 }} />

        {/* Accounting Lines Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', marginBottom: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px dashed #000000', textAlign: 'left' }}>
              <th style={{ paddingBottom: 4, fontWeight: 700 }}>PARTICULARS</th>
              <th style={{ paddingBottom: 4, textAlign: 'right', fontWeight: 700 }}>DEBIT (₹)</th>
              <th style={{ paddingBottom: 4, textAlign: 'right', fontWeight: 700 }}>CREDIT (₹)</th>
            </tr>
          </thead>
          <tbody>
            {(voucher.lines || []).length > 0 ? (
              voucher.lines.map((l, i) => (
                <tr key={i}>
                  <td style={{ paddingTop: 6, paddingBottom: 4, verticalAlign: 'top' }}>
                    {l.credit > 0 ? `To ${accountName(l.account_code)}` : accountName(l.account_code)}
                  </td>
                  <td style={{ paddingTop: 6, paddingBottom: 4, textAlign: 'right', verticalAlign: 'top', fontWeight: 500 }}>
                    {l.debit ? fmt(l.debit) : '—'}
                  </td>
                  <td style={{ paddingTop: 6, paddingBottom: 4, textAlign: 'right', verticalAlign: 'top', fontWeight: 500 }}>
                    {l.credit ? fmt(l.credit) : '—'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ paddingTop: 6, paddingBottom: 4 }}>
                  {voucher.narration || 'Cash transaction entry recorded.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ borderTop: '1px dashed #000000', marginBottom: 12 }} />

        {/* Total Amount Box */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', fontWeight: 700, padding: '4px 0', marginBottom: 12 }}>
          <span>TOTAL AMOUNT:</span>
          <span style={{ fontSize: '1.15rem' }}>₹{fmt(voucherAmount)}</span>
        </div>

        <div style={{ borderTop: '1px dashed #000000', marginBottom: 12 }} />

        {/* Narration Description */}
        <div style={{ fontSize: '0.74rem', marginBottom: 20, lineHeight: 1.4 }}>
          <strong>Narration:</strong> {voucher.narration || 'Being general accounting transaction entry.'}
        </div>

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, fontSize: '0.72rem' }}>
          <div style={{ textAlign: 'center', width: '45%' }}>
            <div style={{ borderTop: '1px solid #000000', paddingTop: 4 }}>Prepared By ({voucher.created_by || 'Admin'})</div>
          </div>
          <div style={{ textAlign: 'center', width: '45%' }}>
            <div style={{ borderTop: '1px solid #000000', paddingTop: 4 }}>Authorized Signatory</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, borderTop: '1px dashed #000000', paddingTop: 10, textAlign: 'center', fontSize: '0.7rem', color: '#333333' }}>
          *** THANK YOU ***
          <div style={{ fontSize: '0.64rem', color: '#666666', marginTop: 2 }}>Official System Generated Cash Voucher Receipt · {voucher.id}</div>
        </div>
      </div>
    </div>
  </div>
</div>
  );

  return createPortal(content, document.body);
}
