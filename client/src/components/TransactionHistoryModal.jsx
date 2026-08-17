import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, History } from 'lucide-react';

// Plain-language label for a ledger ref_type — the raw double-entry account
// names (e.g. "Recurring Deposit Liability" debited, "Cash In Hand" credited)
// mean nothing to branch/collection staff reading this; what they actually
// want to know is "what kind of transaction was this."
const REF_TYPE_LABELS = {
  FD_BOOKING: 'Deposit Booked',
  FD_INTEREST_PAYOUT: 'Interest Paid Out',
  FD_MATURITY: 'Matured — Paid Out',
  FD_PREMATURE_CLOSE: 'Closed Early — Paid Out',
  RD_INSTALLMENT: 'Installment Collected',
  RD_MATURITY: 'Matured — Paid Out',
  RD_PREMATURE_CLOSE: 'Closed Early — Paid Out'
};

// Shared transaction history viewer/print sheet for any account-like record
// (Fixed Deposit, Recurring Deposit, ...) whose money movements are tracked
// as ledger vouchers via ref_type/ref_id rather than a dedicated table of
// their own. The caller filters `journalEntries` down to the entries for one
// account and passes them in — this component just displays and prints them.
export default function TransactionHistoryModal({
  title = 'Transaction History',
  accountLabel = '',
  entries = [],
  tenant,
  onClose
}) {
  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  // One row per transaction, not per debit/credit line — the amount is just
  // the total that moved (debits always equal credits in a balanced voucher,
  // so either side gives the real transaction amount), and the type is a
  // plain-language label instead of the underlying account names.
  const sorted = [...entries]
    .map(entry => ({
      ...entry,
      amount: (entry.lines || []).reduce((sum, l) => sum + (l.debit || 0), 0),
      typeLabel: REF_TYPE_LABELS[entry.ref_type] || entry.narration || 'Transaction'
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const handlePrint = () => window.print();

  const content = (
    <div className="printable-form-overlay">
      <div className="printable-form-floating-btns">
        <button type="button" onClick={onClose} className="btn-close">
          <X style={{ width: 15, height: 15 }} />
          <span>Close</span>
        </button>
        <button type="button" onClick={handlePrint} className="btn-print">
          <Printer style={{ width: 15, height: 15 }} />
          <span>Print History</span>
        </button>
      </div>

      <div
        className="paper-sheet report-preview-paper"
        style={{
          width: '210mm',
          minHeight: '297mm',
          background: '#FFFFFF',
          margin: '20px auto',
          padding: '16mm',
          boxSizing: 'border-box',
          boxShadow: '0 14px 40px rgba(0,0,0,0.25)',
          color: '#000000',
          fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", Arial, sans-serif'
        }}
      >
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000000', paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{tenant?.name || 'Financial ERP'}</div>
          {tenant?.address && <div style={{ fontSize: '0.76rem', color: '#333333', marginTop: 3 }}>{tenant.address}</div>}
        </div>

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 3px 0', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <History style={{ width: 18, height: 18 }} />
            {title}
          </h2>
          {accountLabel && <p style={{ margin: 0, fontSize: '0.8rem', color: '#333333' }}>{accountLabel}</p>}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Transaction</th>
              <th style={thStyle}>Receipt / Voucher No</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', padding: '18px 6px', color: '#666666' }}>No transactions recorded yet.</td></tr>
            ) : sorted.map(entry => (
              <tr key={entry.id}>
                <td style={tdStyle}>{entry.date}</td>
                <td style={tdStyle}>{entry.typeLabel}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{entry.voucher_no}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{fmt(entry.amount)}</td>
              </tr>
            ))}
          </tbody>
          {sorted.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, background: '#F8FAFC' }}>Total</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, background: '#F8FAFC' }}>
                  {fmt(sorted.reduce((sum, e) => sum + e.amount, 0))}
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        <div style={{ marginTop: 14, fontSize: '0.68rem', color: '#666666', textAlign: 'center' }}>
          Generated {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          .report-preview-paper { width: 100% !important; min-height: auto !important; margin: 0 !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
}

const thStyle = { border: '1px solid #333333', background: '#F1F5F9', padding: '6px 8px', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' };
const tdStyle = { border: '1px solid #333333', padding: '6px 8px', verticalAlign: 'top' };
