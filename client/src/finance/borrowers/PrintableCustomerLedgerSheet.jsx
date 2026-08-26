import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';

function getFinancialYear(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-indexed
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  return {
    label: `FY ${startYear}–${String(endYear).slice(-2)}`,
    startDate: `${startYear}-04-01`,
    endDate: `${endYear}-03-31`
  };
}

const normalizePhone = (p) => (p || '').toString().replace(/\D/g, '');

export default function PrintableCustomerLedgerSheet({
  borrower,
  tenant = {},
  collections = [],
  fixedDeposits = [],
  recurringDeposits = [],
  journalEntries = [],
  onClose
}) {
  const fmt = n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fy = getFinancialYear();
  const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const bPhone = normalizePhone(borrower.phone);

  // 1. Linked Loan Accounts
  const loansList = (borrower.loansList || []).length > 0
    ? borrower.loansList
    : [];

  // 2. Linked Fixed Deposits
  const linkedFDs = (fixedDeposits || []).filter(fd => (
    (fd.borrower_id && fd.borrower_id === borrower.id) ||
    (!fd.borrower_id && normalizePhone(fd.phone) === bPhone && bPhone) ||
    (fd.customer_name && borrower.full_name && fd.customer_name.trim().toLowerCase() === borrower.full_name.trim().toLowerCase())
  ));

  // 3. Linked Recurring Deposits
  const linkedRDs = (recurringDeposits || []).filter(rd => (
    (rd.borrower_id && rd.borrower_id === borrower.id) ||
    (!rd.borrower_id && normalizePhone(rd.phone) === bPhone && bPhone) ||
    (rd.customer_name && borrower.full_name && rd.customer_name.trim().toLowerCase() === borrower.full_name.trim().toLowerCase())
  ));

  // Compile all chronological transactions for this customer:
  const rawTxns = [];

  // A. Add Loan Disbursements
  loansList.forEach(loan => {
    const loanDate = loan.disbursement_date || loan.created_at || loan.loan_date || fy.startDate;
    const dateStr = String(loanDate).slice(0, 10);
    rawTxns.push({
      date: dateStr,
      voucher_no: loan.voucher_no || `DISB-${loan.id}`,
      account_no: loan.loan_account_no,
      module: 'LOAN',
      type: 'DISBURSEMENT',
      description: `Disbursement (${loan.scheme_name || loan.loan_type || 'Loan'})`,
      mode: loan.payment_mode || 'BANK_TRANSFER',
      debit: Number(loan.principal_amount || 0),
      credit: 0
    });

    // Add repayments from loan's embedded repayment history if present
    if (Array.isArray(loan.repayment_history)) {
      loan.repayment_history.forEach(r => {
        const rDate = String(r.date || r.collection_date || '').slice(0, 10);
        const pAmt = Number(r.principal_paid || r.principal || 0);
        const iAmt = Number(r.interest_paid || r.interest || 0);
        const penAmt = Number(r.penalty_paid || r.penalty || 0);
        const totAmt = Number(r.total_paid || r.amount || (pAmt + iAmt + penAmt));

        rawTxns.push({
          date: rDate,
          voucher_no: r.voucher_no || `REC-${r.id}`,
          account_no: loan.loan_account_no,
          module: 'LOAN',
          type: 'REPAYMENT',
          description: `EMI Repayment (Prin: ₹${fmt(pAmt)}, Int: ₹${fmt(iAmt)}${penAmt > 0 ? `, Pen: ₹${fmt(penAmt)}` : ''})`,
          mode: r.payment_mode || 'CASH',
          debit: 0,
          credit: totAmt,
          principal_paid: pAmt,
          interest_paid: iAmt,
          penalty_paid: penAmt
        });
      });
    }
  });

  // B. Add Collections from props
  if (Array.isArray(collections)) {
    collections
      .filter(c => {
        const matchesBorrower = c.borrower_id === borrower.id || loansList.some(l => l.id === c.loan_id);
        const notAlreadyAdded = !rawTxns.some(t => t.voucher_no === c.voucher_no && c.voucher_no);
        return matchesBorrower && notAlreadyAdded;
      })
      .forEach(c => {
        const cDate = String(c.collection_date || c.created_at || '').slice(0, 10);
        const pAmt = Number(c.principal_amount || c.principal_paid || 0);
        const iAmt = Number(c.interest_amount || c.interest_paid || 0);
        const penAmt = Number(c.penalty_amount || c.penalty_paid || 0);
        const totAmt = Number(c.total_amount || c.amount || (pAmt + iAmt + penAmt));

        rawTxns.push({
          date: cDate,
          voucher_no: c.voucher_no || `VOU-${c.id}`,
          account_no: c.loan_account_no || `LN-${c.loan_id}`,
          module: 'LOAN',
          type: 'REPAYMENT',
          description: `EMI Repayment (Prin: ₹${fmt(pAmt)}, Int: ₹${fmt(iAmt)}${penAmt > 0 ? `, Pen: ₹${fmt(penAmt)}` : ''})`,
          mode: c.payment_mode || 'CASH',
          debit: 0,
          credit: totAmt,
          principal_paid: pAmt,
          interest_paid: iAmt,
          penalty_paid: penAmt
        });
      });
  }

  // C. Add Fixed Deposits (FD Bookings & Payouts)
  linkedFDs.forEach(fd => {
    // Find booking voucher in journal entries if present
    const fdBookingVoucher = (journalEntries || []).find(j => (
      j.ref_type === 'FD_BOOKING' && (j.ref_id === fd.id || (j.description && j.description.includes(fd.fd_account_no)))
    ));

    const bookingDate = String(fdBookingVoucher?.entry_date || fd.deposit_date || fd.created_at || '').slice(0, 10);
    rawTxns.push({
      date: bookingDate,
      voucher_no: fdBookingVoucher?.voucher_no || fd.voucher_no || `FD-DEP-${fd.id}`,
      account_no: fd.fd_account_no,
      module: 'FIXED_DEPOSIT',
      type: 'FD_BOOKING',
      description: `FD Deposit (${fd.tenure_months || 12}M @ ${fd.interest_rate}%)`,
      mode: fd.payment_mode || 'CASH',
      debit: 0,
      credit: Number(fdBookingVoucher?.total_amount || fd.principal_amount || 0)
    });

    // If FD had monthly interest payouts recorded in journal entries
    if (Array.isArray(journalEntries)) {
      journalEntries
        .filter(j => {
          const text = (j.narration || j.description || '');
          const isFdPayout = j.ref_type === 'FD_INTEREST_PAYOUT' || text.toLowerCase().includes('interest payout');
          const matchesFd = (j.ref_id && String(j.ref_id) === String(fd.id)) || text.includes(fd.fd_account_no);
          const notBooking = j.ref_type !== 'FD_BOOKING' && !text.toLowerCase().includes('deposit booked');
          return (isFdPayout || notBooking) && matchesFd && notBooking;
        })
        .forEach(j => {
          const jDate = String(j.date || j.entry_date || j.created_at || '').slice(0, 10);
          const lineAmount = (j.lines && Array.isArray(j.lines) && j.lines.length > 0)
            ? Math.max(...j.lines.map(l => Number(l.debit || l.credit || 0)))
            : 0;
          const payoutAmount = Number(j.total_amount || lineAmount || j.amount || j.debit_amount || j.credit_amount || 0);
          const text = (j.narration || j.description || '');
          const isCash = text.toUpperCase().includes('(CASH)') || (j.lines || []).some(l => l.account_code === '1001' || (l.account_name || '').toLowerCase().includes('cash'));
          rawTxns.push({
            date: jDate,
            voucher_no: j.voucher_no || j.id || `VOU-${j.db_id || '0'}`,
            account_no: fd.fd_account_no,
            module: 'FIXED_DEPOSIT',
            type: 'FD_PAYOUT',
            description: `FD Interest Payout`,
            mode: isCash ? 'CASH' : 'BANK',
            debit: payoutAmount,
            credit: 0
          });
        });
    }
  });

  // D. Add Recurring Deposits (RD Openings & Collections)
  linkedRDs.forEach(rd => {
    if (Array.isArray(rd.installments)) {
      rd.installments.forEach(inst => {
        if (inst.status === 'PAID' || inst.paid_date) {
          const instDate = String(inst.paid_date || inst.payment_date || inst.due_date || '').slice(0, 10);
          rawTxns.push({
            date: instDate,
            voucher_no: inst.voucher_no || `RD-INST-${inst.id || inst.month_number}`,
            account_no: rd.rd_account_no,
            module: 'RECURRING_DEPOSIT',
            type: 'RD_INSTALLMENT',
            description: `RD Monthly Deposit (Month ${inst.month_number || 1})`,
            mode: inst.payment_mode || 'CASH',
            debit: 0,
            credit: Number(inst.installment_amount || rd.monthly_installment || 0)
          });
        }
      });
    }
  });

  // Sort chronologically and compute running balance
  const sortedTxns = rawTxns.sort((a, b) => new Date(a.date) - new Date(b.date));

  let runningBal = 0;
  const ledgerRows = sortedTxns.map(t => {
    runningBal = runningBal + t.debit - t.credit;
    return {
      ...t,
      balance: runningBal
    };
  });

  const totalDisbursed = sortedTxns.filter(t => t.module === 'LOAN').reduce((s, t) => s + t.debit, 0);
  const totalLoanRepaid = sortedTxns.filter(t => t.module === 'LOAN').reduce((s, t) => s + t.credit, 0);
  const totalPrincipalRepaid = sortedTxns.reduce((s, t) => s + (t.principal_paid || 0), 0);
  const totalInterestPaid = sortedTxns.reduce((s, t) => s + (t.interest_paid || 0), 0);
  const totalPenaltyPaid = sortedTxns.reduce((s, t) => s + (t.penalty_paid || 0), 0);
  const totalFdDeposits = linkedFDs.reduce((s, fd) => s + Number(fd.principal_amount || 0), 0);
  const totalRdDeposits = linkedRDs.reduce((s, rd) => s + Number(rd.total_deposited || (rd.monthly_installment * (rd.paid_installments_count || 0)) || 0), 0);
  const netLoanOutstanding = Number(borrower.totalOutstanding || Math.max(0, totalDisbursed - totalPrincipalRepaid));

  const address = [borrower.address_line1, borrower.address_line2, borrower.city, borrower.state, borrower.pincode].filter(Boolean).join(', ');

  const content = (
    <div className="printable-form-overlay" style={{ overflowY: 'auto', padding: '24px 12px' }}>
      <div className="printable-form-floating-btns">
        <button type="button" className="btn-close" onClick={onClose}>
          <X style={{ width: 15, height: 15 }} />
          <span>Close</span>
        </button>
        <button type="button" className="btn-print" onClick={() => window.print()}>
          <Printer style={{ width: 15, height: 15 }} />
          <span>Print Complete Customer Statement</span>
        </button>
      </div>

      <style>{`
        .customer-ledger-paper {
          width: 210mm;
          max-width: 100%;
          min-height: 297mm;
          height: auto;
          flex-shrink: 0;
          box-sizing: border-box;
          background-color: #FFFFFF !important;
          background: #FFFFFF !important;
          margin: 0 auto 60px auto;
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.35);
          border-radius: 4px;
          padding: 12mm 14mm;
          color: #000000;
          display: block;
          overflow: hidden;
          font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", Arial, sans-serif;
        }
        .cl-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
        }
        .cl-table th, .cl-table td {
          padding: 5px 6px;
          font-size: 0.68rem;
          border-bottom: 1px solid #E2E8F0;
          vertical-align: middle;
          box-sizing: border-box;
        }
        .cl-table th {
          background: #F1F5F9;
          font-weight: 700;
          color: #0F172A;
          border-top: 1px solid #CBD5E1;
          border-bottom: 1px solid #CBD5E1;
          text-transform: uppercase;
          font-size: 0.62rem;
          letter-spacing: 0.02em;
        }
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          body, html { background: #FFFFFF !important; }
          .printable-form-overlay { position: static !important; padding: 0 !important; background: transparent !important; display: block !important; backdrop-filter: none !important; }
          .printable-form-floating-btns { display: none !important; }
          .customer-ledger-paper {
            width: 100% !important; max-width: none !important; box-shadow: none !important;
            border-radius: 0 !important; margin: 0 !important; padding: 0 !important;
          }
        }
      `}</style>

      <div className="customer-ledger-paper">
        {/* Letterhead */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000000', paddingBottom: 8, marginBottom: 10 }}>
          {tenant.logo && <img src={tenant.logo} alt="" style={{ width: 36, height: 36, objectFit: 'contain', margin: '0 auto 4px auto', display: 'block' }} />}
          <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.02em', color: '#000000' }}>{tenant.name || 'Financial ERP'}</div>
          {tenant.address && <div style={{ fontSize: '0.72rem', color: '#333333', marginTop: 2 }}>{tenant.address}</div>}
          {(tenant.phone || tenant.email || tenant.gstin) && (
            <div style={{ fontSize: '0.66rem', color: '#333333', marginTop: 2 }}>
              {[tenant.phone ? `Ph: ${tenant.phone}` : null, tenant.email, tenant.gstin ? `GSTIN: ${tenant.gstin}` : null].filter(Boolean).join('  |  ')}
            </div>
          )}
        </div>

        {/* Title & FY Period */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: '0.98rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Customer Complete Portfolio Statement & Ledger
          </div>
          <div style={{ fontSize: '0.72rem', color: '#334155', marginTop: 2, fontWeight: 600 }}>
            Statement Period: <span style={{ color: '#0F172A' }}>{fy.label} ({fy.startDate} to {fy.endDate})</span>
          </div>
        </div>

        {/* Customer Master Info Box */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '6px 12px',
          background: '#F8FAFC',
          border: '1px solid #CBD5E1',
          borderRadius: 6,
          padding: '8px 12px',
          marginBottom: 12
        }}>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase' }}>Customer Name</span>
            <strong style={{ color: '#0F172A', fontSize: '0.78rem' }}>{borrower.full_name}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase' }}>Customer ID / Code</span>
            <strong style={{ color: '#0F172A', fontSize: '0.78rem', fontFamily: 'monospace' }}>{borrower.borrower_code || '—'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase' }}>Primary Mobile</span>
            <strong style={{ color: '#0F172A', fontSize: '0.78rem' }}>{borrower.phone || '—'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase' }}>Branch Office</span>
            <strong style={{ color: '#0F172A', fontSize: '0.76rem' }}>{borrower.branch || 'Main Branch'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase' }}>KYC Identifiers</span>
            <strong style={{ color: '#0F172A', fontSize: '0.74rem' }}>
              {[borrower.aadhaar_number ? `Aadhaar: ${borrower.aadhaar_number}` : null, borrower.pan_number ? `PAN: ${borrower.pan_number}` : null].filter(Boolean).join(' | ') || '—'}
            </strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase' }}>Address</span>
            <span style={{ color: '#0F172A', fontSize: '0.72rem', lineHeight: 1.2, display: 'block' }}>{address || '—'}</span>
          </div>
        </div>

        {/* Portfolio Summary Highlights Across Loans, FD, and RD */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.58rem', color: '#64748B', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>Loans Disbursed</span>
            <strong style={{ fontSize: '0.88rem', color: '#0F172A' }}>₹{fmt(totalDisbursed)}</strong>
            <span style={{ fontSize: '0.56rem', color: '#64748B', display: 'block' }}>{loansList.length} Account(s)</span>
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.58rem', color: '#64748B', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>Loan Outstanding</span>
            <strong style={{ fontSize: '0.88rem', color: netLoanOutstanding > 0 ? '#DC2626' : '#15803D' }}>₹{fmt(netLoanOutstanding)}</strong>
            <span style={{ fontSize: '0.56rem', color: '#64748B', display: 'block' }}>Repaid: ₹{fmt(totalPrincipalRepaid || totalLoanRepaid)}</span>
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.58rem', color: '#64748B', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>Fixed Deposits (FD)</span>
            <strong style={{ fontSize: '0.88rem', color: '#2563EB' }}>₹{fmt(totalFdDeposits)}</strong>
            <span style={{ fontSize: '0.56rem', color: '#64748B', display: 'block' }}>{linkedFDs.length} Deposit(s)</span>
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.58rem', color: '#64748B', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>Recurring Deposits (RD)</span>
            <strong style={{ fontSize: '0.88rem', color: '#7C3AED' }}>₹{fmt(totalRdDeposits)}</strong>
            <span style={{ fontSize: '0.56rem', color: '#64748B', display: 'block' }}>{linkedRDs.length} Account(s)</span>
          </div>
        </div>

        {/* Chronological Customer Ledger Transactions Table */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 700, marginBottom: 5, color: '#0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Comprehensive Transaction & Payment Ledger</span>
            <span style={{ fontSize: '0.64rem', color: '#64748B', fontWeight: 500 }}>{ledgerRows.length} Transaction(s) in Record</span>
          </div>

          <table className="cl-table">
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>#</th>
                <th>Date</th>
                <th>Voucher No</th>
                <th>Account Ref</th>
                <th>Particulars</th>
                <th>Mode</th>
                <th style={{ textAlign: 'right' }}>Debit (₹)</th>
                <th style={{ textAlign: 'right' }}>Credit (₹)</th>
              </tr>
            </thead>
            <tbody>
              {ledgerRows.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '16px', color: '#64748B' }}>
                    No financial transactions recorded for this customer in the selected financial year.
                  </td>
                </tr>
              ) : (
                ledgerRows.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', color: '#64748B' }}>{idx + 1}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{row.date}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.62rem', wordBreak: 'break-all' }}>{row.voucher_no}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.64rem', fontWeight: 700 }}>{row.account_no}</td>
                    <td style={{ fontSize: '0.66rem' }}>{row.description}</td>
                    <td style={{ fontSize: '0.62rem' }}>{row.mode === 'BANK_TRANSFER' ? 'BANK' : row.mode}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: row.debit > 0 ? '#DC2626' : '#64748B' }}>
                      {row.debit > 0 ? `₹${fmt(row.debit)}` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: row.credit > 0 ? '#15803D' : '#64748B' }}>
                      {row.credit > 0 ? `₹${fmt(row.credit)}` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {ledgerRows.length > 0 && (
              <tfoot>
                <tr style={{ background: '#F8FAFC', fontWeight: 800, borderTop: '2px solid #CBD5E1' }}>
                  <td colSpan="6" style={{ textAlign: 'right', padding: '6px' }}>FINANCIAL YEAR TOTALS:</td>
                  <td style={{ textAlign: 'right', padding: '6px', color: '#DC2626' }}>
                    ₹{fmt(ledgerRows.reduce((s, r) => s + r.debit, 0))}
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px', color: '#15803D' }}>
                    ₹{fmt(ledgerRows.reduce((s, r) => s + r.credit, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Linked Loan Accounts Portfolio */}
        {loansList.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, marginBottom: 4, color: '#0F172A' }}>
              Linked Loan Accounts Portfolio ({loansList.length})
            </div>
            <table className="cl-table">
              <colgroup>
                <col style={{ width: '18%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '18%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Account No</th>
                  <th>Scheme</th>
                  <th>Disbursed</th>
                  <th>EMI</th>
                  <th style={{ textAlign: 'right' }}>Principal (₹)</th>
                  <th style={{ textAlign: 'right' }}>Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {loansList.map((l, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{l.loan_account_no}</td>
                    <td>{l.scheme_name || l.loan_type || '—'}</td>
                    <td>{String(l.disbursement_date || l.created_at || '').slice(0, 10)}</td>
                    <td>₹{fmt(l.installment_amount)}/{l.repayment_frequency === 'MONTHLY' ? 'mo' : 'day'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{fmt(l.principal_amount)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: l.pending_amount > 0 ? '#DC2626' : '#15803D' }}>
                      ₹{fmt(l.pending_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Linked Fixed Deposits (FD) Portfolio */}
        {linkedFDs.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, marginBottom: 4, color: '#0F172A' }}>
              Linked Fixed Deposits (FD) Portfolio ({linkedFDs.length})
            </div>
            <table className="cl-table">
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>FD Account No</th>
                  <th>Deposit Date</th>
                  <th>Tenure</th>
                  <th>Rate</th>
                  <th style={{ textAlign: 'right' }}>Principal (₹)</th>
                  <th style={{ textAlign: 'right' }}>Maturity (₹)</th>
                </tr>
              </thead>
              <tbody>
                {linkedFDs.map((fd, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{fd.fd_account_no}</td>
                    <td>{String(fd.deposit_date || fd.created_at || '').slice(0, 10)}</td>
                    <td>{fd.tenure_months} Months</td>
                    <td>{fd.interest_rate}% p.a.</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{fmt(fd.principal_amount)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563EB' }}>₹{fmt(fd.maturity_amount || fd.principal_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Linked Recurring Deposits (RD) Portfolio */}
        {linkedRDs.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, marginBottom: 4, color: '#0F172A' }}>
              Linked Recurring Deposits (RD) Portfolio ({linkedRDs.length})
            </div>
            <table className="cl-table">
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>RD Account No</th>
                  <th>Start Date</th>
                  <th>Monthly Installment</th>
                  <th>Tenure</th>
                  <th style={{ textAlign: 'right' }}>Total Deposited (₹)</th>
                </tr>
              </thead>
              <tbody>
                {linkedRDs.map((rd, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{rd.rd_account_no}</td>
                    <td>{String(rd.start_date || rd.created_at || '').slice(0, 10)}</td>
                    <td>₹{fmt(rd.monthly_installment)}/mo</td>
                    <td>{rd.tenure_months}M ({rd.paid_installments_count || 0} Paid)</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#7C3AED' }}>
                      ₹{fmt(rd.total_deposited || (rd.monthly_installment * (rd.paid_installments_count || 0)))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 12 }}>
          <div style={{ textAlign: 'center', width: '38%' }}>
            <div style={{ borderTop: '1px solid #000000', paddingTop: 4, fontSize: '0.7rem', color: '#333333' }}>
              Customer Acknowledgment
            </div>
          </div>
          <div style={{ textAlign: 'center', width: '38%' }}>
            <div style={{ borderTop: '1px solid #000000', paddingTop: 4, fontSize: '0.7rem', color: '#333333' }}>
              Authorized Signatory
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '0.62rem', color: '#64748B', marginTop: 12, borderTop: '1px dashed #CBD5E1', paddingTop: 4 }}>
          Official System Generated Customer Ledger · Generated on {now}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
