import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Check, Copy, CheckCircle2, ShieldCheck } from 'lucide-react';

function fmtTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
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

function numberToWordsINR(amount) {
  const num = Math.round(Number(amount || 0));
  if (num === 0) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
  }

  return `${inWords(num)} Rupees Only`;
}

const DEFAULT_ACCOUNT_NAMES = {
  '1001': 'Cash in Hand',
  '1002': 'Bank Account',
  '1003': 'Bank Account (Secondary)',
  '1201': 'Loans & Advances Portfolio',
  '2001': 'Borrower Advance Account',
  '2200': 'Fixed Deposit Liability (Principal)',
  '2201': 'Recurring Deposit Liability (Principal)',
  '3001': 'Investor Equity / Capital Account',
  '4001': 'Interest Income on Loans',
  '4002': 'Late Fee & Penalty Charges',
  '4003': 'Processing Fee Income',
  '4004': 'Documentation & Stamp Charges',
  '5001': 'Operating & Office Expenses',
  '5002': 'Staff Salaries & Allowances',
  '5003': 'Fixed Deposit Interest Expense',
  '5004': 'Recurring Deposit Interest Expense',
  '5005': 'Investor Dividend / Return on Capital'
};

export default function VoucherReceiptModal({ company = {}, voucher, accountName, typeLabel, onClose }) {
  const [copied, setCopied] = useState(false);
  const fmt = n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  if (!voucher) return null;

  const resolveAccountName = (code, line) => {
    if (line?.account_name) return line.account_name;
    if (typeof accountName === 'function') {
      const name = accountName(code);
      if (name && name !== code) return name;
    }
    return DEFAULT_ACCOUNT_NAMES[code] || `Account (${code})`;
  };

  const totalDebit = (voucher?.lines || []).reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = (voucher?.lines || []).reduce((s, l) => s + (l.credit || 0), 0);
  const voucherAmount = totalDebit || totalCredit || Number(voucher.amount || voucher.total_paid || 0);

  const isContra = (voucher?.voucher_type === 'CONTRA') || (voucher?.ref_type === 'CONTRA') || (voucher?.narration && voucher.narration.toLowerCase().includes('contra'));
  const hasDebitCash = (voucher.lines || []).some(l => (l.account_code === '1001' || l.account_code === '1002') && l.debit > 0);
  const derivedDirection = voucher.direction || (isContra ? 'Contra Transfer' : (hasDebitCash ? 'Money In' : 'Money Out'));
  const derivedMode = voucher.mode || voucher.payment_mode || (isContra ? 'Internal Transfer (Cash ⇄ Bank)' : 'Cash');
  const derivedSource = voucher.source || voucher.ref_type || (isContra ? 'Contra Transfer' : 'General Entry');
  const voucherCode = voucher.voucher_no || voucher.id || '—';

  // Loan collection breakdown fields
  const principalAmt = voucher.principal_paid !== undefined ? Number(voucher.principal_paid) : (voucher.principal !== undefined ? Number(voucher.principal) : null);
  const interestAmt = voucher.interest_paid !== undefined ? Number(voucher.interest_paid) : (voucher.interest !== undefined ? Number(voucher.interest) : null);
  const penaltyAmt = voucher.penalty !== undefined ? Number(voucher.penalty) : null;
  const interestShortfall = Number(voucher.interest_shortfall || 0);
  const interestWaiver = Number(voucher.interest_waiver || 0);
  const interestFromDate = voucher.interest_from_date || null;
  const interestPaidUpto = voucher.interest_paid_upto || voucher.interest_to_date || null;
  const interestDays = voucher.interest_days !== undefined && voucher.interest_days !== null ? voucher.interest_days : null;
  const pendingBalance = voucher.pending_balance !== undefined && voucher.pending_balance !== null
    ? Number(voucher.pending_balance)
    : (voucher.balance !== undefined && voucher.balance !== null ? Number(voucher.balance) : (voucher.new_principal_balance !== undefined ? Number(voucher.new_principal_balance) : null));

  const isLoanCollection = principalAmt !== null || interestAmt !== null || voucher.loan_account_no || voucher.borrower_name;

  // Build synthetic double-entry lines if none exist for a loan collection
  const linesToRender = (voucher.lines && voucher.lines.length > 0)
    ? voucher.lines
    : (isLoanCollection && (principalAmt !== null || interestAmt !== null)
      ? [
        { account_code: derivedMode === 'CASH' ? '1001' : '1002', debit: voucherAmount, credit: 0 },
        ...(principalAmt > 0 ? [{ account_code: '1201', debit: 0, credit: principalAmt }] : []),
        ...(interestAmt > 0 ? [{ account_code: '4001', debit: 0, credit: interestAmt }] : []),
        ...(penaltyAmt > 0 ? [{ account_code: '4002', debit: 0, credit: penaltyAmt }] : [])
      ]
      : []);

  const handleCopyCode = () => {
    if (voucherCode && voucherCode !== '—') {
      navigator.clipboard?.writeText?.(String(voucherCode));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const content = (
    <div className="printable-form-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 9999999,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', overflowY: 'auto'
    }}>
      
      <style>{`
        .voucher-modal-container {
          width: 460px;
          max-width: 95vw;
          box-sizing: border-box;
          background: #FFFFFF;
          margin: 0 auto;
          box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.4), 0 0 0 1px rgba(15, 23, 42, 0.08);
          border-radius: 18px;
          overflow: hidden;
        }
        .medium-thermal-receipt {
          background: #FFFFFF;
          padding: 24px 22px;
          font-family: -apple-system, BlinkMacSystemFont, "SF Mono", "Segoe UI Mono", "Courier New", Courier, monospace;
          color: #0F172A;
        }
        .printable-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--brand-primary, #15803D);
          color: #FFFFFF;
          border: none;
          padding: 8px 18px;
          border-radius: 9px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 2px 6px rgba(21, 128, 61, 0.25);
        }
        .printable-btn-primary:hover {
          background: var(--brand-primary-hover, #0E5327);
          box-shadow: 0 4px 12px rgba(21, 128, 61, 0.35);
        }
        .printable-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #FFFFFF;
          color: #475569;
          border: 1px solid #CBD5E1;
          padding: 8px 14px;
          border-radius: 9px;
          font-size: 0.82rem;
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
            padding: 2mm 3mm !important;
            font-size: 11.5px !important;
            line-height: 1.35 !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Main Modal Window Frame */}
      <div className="voucher-modal-container">
        
        {/* Onscreen Header Action Bar */}
        <div className="printable-form-header-bar" style={{
          padding: '14px 20px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F8FAFC'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: 'var(--brand-primary-light, #F0FEF5)',
              color: 'var(--brand-primary, #15803D)',
              border: '1px solid var(--brand-primary-border, #A3F5C1)',
              padding: '3px 8px',
              borderRadius: 6
            }}>
              {typeLabel || (isLoanCollection ? 'COLLECTION RECEIPT' : 'VOUCHER')}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="printable-btn-secondary"
              onClick={handleCopyCode}
              title="Copy voucher reference code"
              style={{ padding: '7px 10px' }}
            >
              {copied ? <Check style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} /> : <Copy style={{ width: 14, height: 14 }} />}
              <span style={{ fontSize: '0.75rem' }}>{copied ? 'Copied' : 'Copy #'}</span>
            </button>

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
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>

        {/* Scrollable Container Window */}
        <div style={{ maxHeight: '82vh', overflowY: 'auto', background: '#E2E8F0', padding: '16px' }}>
          
          {/* Medium Thermal Cash Receipt Slip - 100% Black & White Monochrome */}
          <div className="medium-thermal-receipt" style={{
            background: '#FFFFFF',
            color: '#000000',
            border: '1px solid #000000',
            borderRadius: 0,
            fontFamily: '"Courier New", Courier, "SF Mono", monospace',
            padding: '20px 18px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
          }}>
        
        {/* Company Header */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.05rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#000000'
          }}>
            {company.name || 'FINANCE ERP'}
          </h2>
          {company.address && (
            <div style={{ fontSize: '0.72rem', marginTop: 3, color: '#000000', lineHeight: 1.3 }}>
              {company.address}
            </div>
          )}
          <div style={{ fontSize: '0.7rem', marginTop: 2, color: '#000000' }}>
            {[company.phone ? `Tel: ${company.phone}` : null, company.email || null].filter(Boolean).join(' | ')}
          </div>
          
          <div style={{
            margin: '10px 0 8px 0',
            borderTop: '1px dashed #000000',
            borderBottom: '1px dashed #000000',
            padding: '5px 0',
            fontSize: '0.84rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#000000'
          }}>
            *** {typeLabel || (isLoanCollection ? 'PAYMENT COLLECTION RECEIPT' : (derivedDirection === 'Money In' ? 'CASH RECEIPT' : 'PAYMENT VOUCHER'))} ***
          </div>
        </div>

        {/* Voucher Metadata Grid */}
        <div style={{
          fontSize: '0.76rem',
          lineHeight: 1.5,
          marginBottom: 10,
          color: '#000000'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Voucher No:</span>
            <strong style={{ fontSize: '0.82rem' }}>{voucherCode}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Date & Time:</span>
            <span>{formatDateDisplay(voucher.date || voucher.collection_date)} {fmtTime(voucher.created_at)}</span>
          </div>
          {voucher.loan_account_no && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Account No:</span>
              <strong>{voucher.loan_account_no}</strong>
            </div>
          )}
          {voucher.borrower_name && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Borrower:</span>
              <strong>{voucher.borrower_name}</strong>
            </div>
          )}
          {voucher.phone && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Mobile:</span>
              <span>{voucher.phone}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Payment Mode:</span>
            <strong>{derivedMode}</strong>
          </div>
          {(voucher.reference_no || voucher.txn_ref) && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Ref / Txn No:</span>
              <span>{voucher.reference_no || voucher.txn_ref}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Branch Office:</span>
            <span>{voucher.branch || 'Main Branch'}</span>
          </div>
          {voucher.collector_name && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Collector:</span>
              <span>{voucher.collector_name}</span>
            </div>
          )}
        </div>

        {/* Accounting Lines Table with Integrated Particulars & Interest Period Details */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', marginBottom: 10, color: '#000000' }}>
          <thead>
            <tr style={{ borderTop: '1px dashed #000000', borderBottom: '1px dashed #000000', textAlign: 'left' }}>
              <th style={{ padding: '5px 2px', fontWeight: 800 }}>PARTICULARS</th>
              <th style={{ padding: '5px 2px', textAlign: 'right', fontWeight: 800 }}>DEBIT (Rs)</th>
              <th style={{ padding: '5px 2px', textAlign: 'right', fontWeight: 800 }}>CREDIT (Rs)</th>
            </tr>
          </thead>
          <tbody>
            {linesToRender.length > 0 ? (
              linesToRender.map((l, i) => {
                const isDebit = (l.debit || 0) > 0;
                const isLoanPrincipal = l.account_code === '1201';
                const isInterestIncome = l.account_code === '4001';
                const isLateFee = l.account_code === '4002';
                const isCashBank = l.account_code === '1001' || l.account_code === '1002';

                const isPaymentOut = (voucher?.voucher_type === 'PAYMENT') || (voucher?.ref_type && (voucher.ref_type.includes('PAYOUT') || voucher.ref_type.includes('DISBURSEMENT') || voucher.ref_type.includes('EXPENSE'))) || (derivedDirection === 'Money Out');
                const totalLabel = isContra ? 'TOTAL TRANSFERRED:' : (isPaymentOut ? 'TOTAL PAID OUT:' : 'TOTAL RECEIVED:');

                return (
                  <tr key={i} style={{ borderBottom: '1px dotted #000000' }}>
                    <td style={{ paddingTop: 5, paddingBottom: 5, paddingLeft: 2, verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 700 }}>
                        {l.credit > 0 ? `To ${resolveAccountName(l.account_code, l)}` : resolveAccountName(l.account_code, l)}
                      </div>
                      
                      {/* Integrated Principal Details */}
                      {isLoanPrincipal && pendingBalance !== null && (
                        <div style={{ fontSize: '0.68rem', marginTop: 1 }}>
                          Principal Repaid · Bal: Rs. {fmt(pendingBalance)}
                        </div>
                      )}

                      {/* Integrated Interest Period & Shortfall / Waiver */}
                      {isInterestIncome && (
                        <div style={{ fontSize: '0.68rem', marginTop: 1 }}>
                          {(interestFromDate || interestPaidUpto) && (
                            <div>
                              Period: {interestFromDate ? `${interestFromDate} to ${interestPaidUpto}` : `Up to ${interestPaidUpto}`}
                              {interestDays !== null ? ` (${interestDays}d)` : ''}
                            </div>
                          )}
                          {interestShortfall > 0 && (
                            <div>Shortfall C/F: Rs. {fmt(interestShortfall)}</div>
                          )}
                          {interestWaiver > 0 && (
                            <div>Waived / Concession: Rs. {fmt(interestWaiver)}</div>
                          )}
                        </div>
                      )}

                      {/* Integrated Late Fee / Additional Charges */}
                      {isLateFee && (
                        <div style={{ fontSize: '0.68rem', marginTop: 1 }}>
                          Additional Charges / Late Penalty
                        </div>
                      )}

                      {/* Cash / Bank source */}
                      {isCashBank && isDebit && derivedMode && (
                        <div style={{ fontSize: '0.68rem', marginTop: 1 }}>
                          Received via {derivedMode}
                        </div>
                      )}
                    </td>
                    <td style={{ paddingTop: 5, paddingBottom: 5, paddingRight: 2, textAlign: 'right', verticalAlign: 'top', fontWeight: 700 }}>
                      {l.debit ? fmt(l.debit) : '—'}
                    </td>
                    <td style={{ paddingTop: 5, paddingBottom: 5, paddingRight: 2, textAlign: 'right', verticalAlign: 'top', fontWeight: 700 }}>
                      {l.credit ? fmt(l.credit) : '—'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="3" style={{ padding: '6px 2px' }}>
                  {voucher.narration || 'Payment transaction entry recorded.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Total Amount Box with Words */}
        <div style={{
          borderTop: '1px solid #000000',
          borderBottom: '1px solid #000000',
          padding: '6px 2px',
          marginBottom: 8,
          color: '#000000'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.92rem',
            fontWeight: 800
          }}>
            <span>{isContra ? 'TOTAL TRANSFERRED:' : (((voucher?.voucher_type === 'PAYMENT') || (voucher?.ref_type && (voucher.ref_type.includes('PAYOUT') || voucher.ref_type.includes('DISBURSEMENT') || voucher.ref_type.includes('EXPENSE'))) || (derivedDirection === 'Money Out')) ? 'TOTAL PAID OUT:' : 'TOTAL RECEIVED:')}</span>
            <span style={{ fontSize: '1.12rem', fontWeight: 800 }}>
              Rs. {fmt(voucherAmount)}
            </span>
          </div>
          <div style={{
            fontSize: '0.68rem',
            marginTop: 2,
            lineHeight: 1.3
          }}>
            In words: {numberToWordsINR(voucherAmount)}
          </div>
        </div>

        {/* Narration Description */}
        <div style={{ fontSize: '0.72rem', marginBottom: 16, lineHeight: 1.4, color: '#000000' }}>
          <strong>Narration:</strong> {voucher.narration || voucher.notes || 'Being collection payment received towards loan account.'}
        </div>

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, fontSize: '0.7rem', color: '#000000' }}>
          <div style={{ textAlign: 'center', width: '45%' }}>
            <div style={{ borderTop: '1px solid #000000', paddingTop: 4 }}>
              Prepared By ({voucher.collector_name || voucher.created_by || 'Staff'})
            </div>
          </div>
          <div style={{ textAlign: 'center', width: '45%' }}>
            <div style={{ borderTop: '1px solid #000000', paddingTop: 4 }}>
              Authorized Signatory
            </div>
          </div>
        </div>

        {/* Official Footer */}
        <div style={{
          marginTop: 16,
          borderTop: '1px dashed #000000',
          paddingTop: 6,
          textAlign: 'center',
          fontSize: '0.66rem',
          color: '#000000'
        }}>
          <div style={{ fontWeight: 800, letterSpacing: '0.04em' }}>*** THANK YOU - PAID SUCCESSFULLY ***</div>
          <div style={{ fontSize: '0.62rem', marginTop: 2 }}>
            Official System Generated Voucher · {voucherCode}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  );

  return createPortal(content, document.body);
}
