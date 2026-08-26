import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, History, Receipt } from 'lucide-react';
import VoucherReceiptModal from './VoucherReceiptModal';

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
  accountMeta = null,
  entries = [],
  tenant,
  onClose
}) {
  const [selectedVoucherForModal, setSelectedVoucherForModal] = useState(null);
  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const sorted = [...entries]
    .map(entry => ({
      ...entry,
      amount: (entry.lines || []).reduce((sum, l) => sum + (l.debit || 0), 0) || Number(entry.total_amount || 0),
      typeLabel: REF_TYPE_LABELS[entry.ref_type] || entry.narration || entry.description || 'Transaction',
      descText: entry.description || entry.narration || ''
    }))
    .sort((a, b) => new Date(a.date || a.entry_date) - new Date(b.date || b.entry_date));

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

        {accountMeta && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 16, background: '#F8FAFC', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: '0.74rem' }}>
            {accountMeta.principal !== undefined && (
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.66rem', textTransform: 'uppercase' }}>Principal</span>
                <strong style={{ color: '#0F172A', fontSize: '0.88rem' }}>₹{fmt(accountMeta.principal)}</strong>
              </div>
            )}
            {accountMeta.rate !== undefined && (
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.66rem', textTransform: 'uppercase' }}>Interest Rate</span>
                <strong style={{ color: '#0F172A', fontSize: '0.88rem' }}>{accountMeta.rate}% p.a.</strong>
              </div>
            )}
            {accountMeta.monthlyAmount !== undefined && (
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.66rem', textTransform: 'uppercase' }}>Monthly Payout</span>
                <strong style={{ color: '#2563EB', fontSize: '0.88rem' }}>₹{fmt(accountMeta.monthlyAmount)}</strong>
              </div>
            )}
            {accountMeta.monthsPaid !== undefined && (
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.66rem', textTransform: 'uppercase' }}>Paid Payouts</span>
                <strong style={{ color: '#15803D', fontSize: '0.88rem' }}>{accountMeta.monthsPaid} / {accountMeta.tenureMonths || '—'} mo</strong>
              </div>
            )}
            {accountMeta.totalPaidInterest !== undefined && (
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.66rem', textTransform: 'uppercase' }}>Interest Paid</span>
                <strong style={{ color: '#15803D', fontSize: '0.88rem' }}>₹{fmt(accountMeta.totalPaidInterest)}</strong>
              </div>
            )}
            {accountMeta.unpaidInterest !== undefined && (
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.66rem', textTransform: 'uppercase' }}>Pending Interest</span>
                <strong style={{ color: accountMeta.unpaidInterest > 0 ? '#DC2626' : '#64748B', fontSize: '0.88rem' }}>₹{fmt(accountMeta.unpaidInterest)}</strong>
              </div>
            )}
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Transaction Details</th>
              <th style={thStyle}>Receipt / Voucher No</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', padding: '18px 6px', color: '#666666' }}>No transactions recorded yet.</td></tr>
            ) : sorted.map(entry => (
              <tr key={entry.id}>
                <td style={tdStyle}>{entry.date || entry.entry_date}</td>
                <td style={tdStyle}>
                  <strong>{entry.typeLabel}</strong>
                  {entry.descText && entry.descText !== entry.typeLabel && (
                    <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>{entry.descText}</div>
                  )}
                </td>
                <td style={{ ...tdStyle }}>
                  {entry.voucher_no ? (
                    <button
                      type="button"
                      onClick={() => setSelectedVoucherForModal(entry)}
                      style={{
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: 6,
                        padding: '3px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        color: 'var(--brand-primary, #15803D)',
                        fontFamily: 'monospace',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      title="Click to view and print official voucher"
                    >
                      <Receipt style={{ width: 12, height: 12 }} />
                      <span>{entry.voucher_no}</span>
                    </button>
                  ) : '—'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{fmt(entry.amount)}</td>
              </tr>
            ))}
          </tbody>
          {sorted.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, background: '#F8FAFC' }}>Total Disbursed / Transacted</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, background: '#F8FAFC' }}>
                  ₹{fmt(sorted.reduce((sum, e) => sum + e.amount, 0))}
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

  return (
    <>
      {createPortal(content, document.body)}
      {selectedVoucherForModal && (
        <VoucherReceiptModal
          company={tenant}
          voucher={selectedVoucherForModal}
          typeLabel={selectedVoucherForModal.typeLabel || 'TRANSACTION VOUCHER'}
          onClose={() => setSelectedVoucherForModal(null)}
        />
      )}
    </>
  );
}

const thStyle = { border: '1px solid #333333', background: '#F1F5F9', padding: '6px 8px', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' };
const tdStyle = { border: '1px solid #333333', padding: '6px 8px', verticalAlign: 'top' };
