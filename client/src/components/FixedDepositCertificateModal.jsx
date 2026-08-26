import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Landmark, CheckCircle2 } from 'lucide-react';

const REF_TYPE_LABELS = {
  FD_BOOKING: 'Deposit Booked / Received',
  FD_INTEREST_PAYOUT: 'Interest Paid Out',
  FD_MATURITY: 'Matured — Principal Refunded',
  FD_PREMATURE_CLOSE: 'Closed Prematurely — Settlement'
};

export default function FixedDepositCertificateModal({ company = {}, fd, journalEntries = [], labels = {}, onClose }) {
  const fmt = n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const isPremature = fd.status === 'CLOSED_PREMATURE';
  const isMonthly = fd.scheme === 'MONTHLY_PAYOUT';
  const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  // Filter and sort all transactions linked to this FD
  const fdEntries = (journalEntries || [])
    .filter(e =>
      ['FD_BOOKING', 'FD_INTEREST_PAYOUT', 'FD_MATURITY', 'FD_PREMATURE_CLOSE'].includes(e.ref_type) &&
      (String(e.ref_id) === String(fd.id) || (e.description && e.description.includes(fd.fd_account_no)))
    )
    .sort((a, b) => new Date(a.date || a.entry_date) - new Date(b.date || b.entry_date));

  const interestPayoutEntries = fdEntries.filter(e => e.ref_type === 'FD_INTEREST_PAYOUT');
  const totalInterestPaid = interestPayoutEntries.reduce((sum, e) => {
    const amt = (e.lines || []).reduce((s, l) => s + (l.debit || 0), 0) || Number(e.total_amount || e.amount || 0);
    return sum + amt;
  }, 0);

  const keyDetails = [
    { label: labels.fdAccountNo || 'FD Account No', value: fd.fd_account_no, highlight: true },
    { label: labels.customer || 'Customer Name', value: fd.customer_name },
    { label: 'Documents / Ref', value: fd.reference || '—' },
    { label: labels.principal || 'Principal Amount', value: `₹${fmt(fd.principal_amount)}` },
    { label: labels.rate || 'Interest Rate', value: `${fd.interest_rate}% p.a.` },
    { label: labels.tenure || 'Tenure', value: `${fd.tenure_months} ${labels.months || 'Months'}` },
    { label: labels.scheme || 'Scheme Type', value: fd.scheme === 'CUMULATIVE' ? (labels.cumulative || 'Cumulative') : (labels.monthlyPayout || 'Monthly Payout') },
    { label: labels.bookingDate || 'Booking Date', value: fd.booking_date },
    { label: labels.maturityDate || 'Maturity Date', value: fd.maturity_date },
    { label: labels.status || 'Current Status', value: labels.statusText || fd.status }
  ];

  const content = (
    <div className="printable-form-overlay">
      <div className="printable-form-floating-btns">
        <button type="button" className="btn-close" onClick={onClose}>
          <X style={{ width: 15, height: 15 }} />
          <span>Close</span>
        </button>
        <button type="button" className="btn-print" onClick={() => window.print()}>
          <Printer style={{ width: 15, height: 15 }} />
          <span>Print Statement</span>
        </button>
      </div>

      <style>{`
        .fd-statement-paper {
          width: 210mm;
          max-width: 100%;
          min-height: 297mm;
          box-sizing: border-box;
          background: #FFFFFF;
          margin: 0 auto 60px auto;
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.25);
          border-radius: 4px;
          padding: 14mm 16mm;
          color: #000000;
          font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", Arial, sans-serif;
        }
        .fd-stmt-table th, .fd-stmt-table td {
          padding: 6px 8px;
          font-size: 0.74rem;
          border-bottom: 1px solid #E2E8F0;
        }
        .fd-stmt-table th {
          background: #F1F5F9;
          font-weight: 700;
          color: #0F172A;
          border-top: 1px solid #CBD5E1;
          border-bottom: 1px solid #CBD5E1;
          text-transform: uppercase;
          font-size: 0.68rem;
          letter-spacing: 0.03em;
        }
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          .printable-form-overlay { position: static !important; padding: 0 !important; background: transparent !important; display: block !important; backdrop-filter: none !important; }
          .printable-form-floating-btns { display: none !important; }
          .fd-statement-paper {
            width: 100% !important; max-width: none !important; box-shadow: none !important;
            border-radius: 0 !important; margin: 0 !important; padding: 0 !important;
          }
        }
      `}</style>

      <div className="fd-statement-paper">
        {/* Letterhead */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000000', paddingBottom: 10, marginBottom: 14 }}>
          {company.logo && <img src={company.logo} alt="" style={{ width: 40, height: 40, objectFit: 'contain', margin: '0 auto 4px auto', display: 'block' }} />}
          <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.02em', color: '#000000' }}>{company.name || 'Financial ERP'}</div>
          {company.address && <div style={{ fontSize: '0.74rem', color: '#333333', marginTop: 2 }}>{company.address}</div>}
          {(company.phone || company.email || company.gstin) && (
            <div style={{ fontSize: '0.68rem', color: '#333333', marginTop: 2 }}>
              {[company.phone ? `Ph: ${company.phone}` : null, company.email, company.gstin ? `GSTIN: ${company.gstin}` : null].filter(Boolean).join('  |  ')}
            </div>
          )}
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Fixed Deposit Certificate & Statement of Account
          </div>
          <div style={{ fontSize: '0.76rem', color: '#444444', marginTop: 2 }}>
            Account: <strong>{fd.fd_account_no}</strong> · Customer: <strong>{fd.customer_name}</strong>
          </div>
        </div>

        {/* Key Account Details Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px 12px',
          background: '#F8FAFC',
          border: '1px solid #CBD5E1',
          borderRadius: 6,
          padding: '10px 14px',
          marginBottom: 16
        }}>
          {keyDetails.map((item, idx) => (
            <div key={idx} style={{ fontSize: '0.74rem' }}>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.66rem', fontWeight: 600, textTransform: 'uppercase' }}>{item.label}</span>
              <strong style={{ color: item.highlight ? '#0F172A' : '#1E293B', fontSize: '0.8rem' }}>{item.value}</strong>
            </div>
          ))}
        </div>

        {/* Financial Highlights */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, padding: '8px 12px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>Principal Deposited</span>
            <strong style={{ fontSize: '1.05rem', color: '#0F172A' }}>₹{fmt(fd.principal_amount)}</strong>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, padding: '8px 12px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>
              {isMonthly ? `Interest Paid to Date (${interestPayoutEntries.length} payouts)` : 'Accrued Interest'}
            </span>
            <strong style={{ fontSize: '1.05rem', color: '#15803D' }}>₹{fmt(totalInterestPaid)}</strong>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, padding: '8px 12px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>
              {isPremature ? 'Settlement Payout' : 'Maturity Value'}
            </span>
            <strong style={{ fontSize: '1.05rem', color: isPremature ? '#DC2626' : '#2563EB' }}>
              ₹{fmt(isPremature ? fd.payout_amount : fd.maturity_value)}
            </strong>
          </div>
        </div>

        {/* Complete Transaction History Table */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 6, color: '#0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Account Transactions & Payout Ledger</span>
            <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 500 }}>{fdEntries.length} Recorded Transaction(s)</span>
          </div>

          <table className="fd-stmt-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ width: '32px', textAlign: 'center' }}>#</th>
                <th style={{ width: '85px' }}>Date</th>
                <th style={{ width: '130px' }}>Voucher No</th>
                <th>Particulars / Description</th>
                <th style={{ width: '90px' }}>Mode</th>
                <th style={{ width: '95px', textAlign: 'right' }}>Debit / Paid (₹)</th>
                <th style={{ width: '95px', textAlign: 'right' }}>Credit (₹)</th>
              </tr>
            </thead>
            <tbody>
              {/* Initial Booking Row if not in journal entries */}
              {!fdEntries.some(e => e.ref_type === 'FD_BOOKING') && (
                <tr>
                  <td style={{ textAlign: 'center', color: '#64748B' }}>1</td>
                  <td>{fd.booking_date}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>—</td>
                  <td>
                    <strong>Deposit Booking</strong>
                    <div style={{ fontSize: '0.66rem', color: '#64748B' }}>Initial Fixed Deposit Account Opening</div>
                  </td>
                  <td>{fd.payment_mode || 'CASH'}</td>
                  <td style={{ textAlign: 'right' }}>—</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>₹{fmt(fd.principal_amount)}</td>
                </tr>
              )}

              {fdEntries.map((entry, idx) => {
                const isPayout = entry.ref_type === 'FD_INTEREST_PAYOUT' || entry.ref_type === 'FD_MATURITY' || entry.ref_type === 'FD_PREMATURE_CLOSE';
                const totalAmt = (entry.lines || []).reduce((s, l) => s + (l.debit || 0), 0) || Number(entry.total_amount || entry.amount || 0);
                const modeStr = (entry.description && entry.description.includes('(') && entry.description.includes(')'))
                  ? entry.description.split('(').pop().split(')')[0]
                  : (entry.voucher_type || '—');

                return (
                  <tr key={entry.id || idx}>
                    <td style={{ textAlign: 'center', color: '#64748B' }}>{idx + 1}</td>
                    <td>{entry.date || entry.entry_date || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{entry.voucher_no || `VOU-${entry.id}`}</td>
                    <td>
                      <strong>{REF_TYPE_LABELS[entry.ref_type] || entry.description}</strong>
                      {entry.description && (
                        <div style={{ fontSize: '0.66rem', color: '#64748B', marginTop: 1 }}>{entry.description}</div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.7rem' }}>{modeStr}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: isPayout ? '#DC2626' : '#0F172A' }}>
                      {isPayout ? `₹${fmt(totalAmt)}` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                      {!isPayout ? `₹${fmt(totalAmt)}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 28 }}>
          <div style={{ textAlign: 'center', width: '38%' }}>
            <div style={{ borderTop: '1px solid #000000', paddingTop: 4, fontSize: '0.72rem', color: '#333333' }}>
              Customer Acknowledgment
            </div>
          </div>
          <div style={{ textAlign: 'center', width: '38%' }}>
            <div style={{ borderTop: '1px solid #000000', paddingTop: 4, fontSize: '0.72rem', color: '#333333' }}>
              Authorized Signatory
            </div>
          </div>
        </div>

        {/* Generated on Footer */}
        <div style={{ textAlign: 'center', fontSize: '0.65rem', color: '#64748B', marginTop: 16, borderTop: '1px dashed #CBD5E1', paddingTop: 6 }}>
          Official Fixed Deposit Statement · Generated on {now}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
