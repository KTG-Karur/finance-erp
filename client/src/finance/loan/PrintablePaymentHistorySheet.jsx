import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, ArrowLeft, History, X, Check, FileCheck } from 'lucide-react';

export default function PrintablePaymentHistorySheet({
  loan = {},
  borrower = {},
  receipts = [],
  onClose,
  tenant
}) {
  const companyInfo = {
    name: tenant?.name || 'Your Company',
    tagline: 'Non-Banking Financial Company',
    address: tenant?.address || '',
    reg: [tenant?.gstin && `GSTIN: ${tenant.gstin}`, tenant?.pan && `PAN: ${tenant.pan}`].filter(Boolean).join(' | ')
  };

  // 2-Step Flow: 'UI_MODAL' (modern macOS style modal) -> 'PAPER_PREVIEW' (exact ISO A4 printable statement)
  const [viewStep, setViewStep] = useState('UI_MODAL');

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const printDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Filter receipts for this loan account
  const rawReceipts = receipts.filter(r => r.loan_id === loan.id || r.loan_account_no === loan.loan_account_no);

  // Detailed payment ledger items — built strictly from real collection records
  // (receipt_no/principal_paid/interest_paid/new_principal_balance are the actual
  // DB columns in `collections`; no fabricated fallback rows are shown when empty).
  const historyItems = rawReceipts.map((r, idx) => {
    const principalAmt = Number(r.principal_paid || 0);
    const interestAmt = Number(r.interest_paid || 0);
    const penaltyAmt = Number(r.penalty || 0);
    const totalAmt = Number(r.amount || (principalAmt + interestAmt));
    const createdAt = r.created_at ? new Date(r.created_at) : null;
    return {
      sno: idx + 1,
      voucher_no: r.voucher_no || r.receipt_no || '—',
      date: r.collection_date || '—',
      time: createdAt ? createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
      mode: r.payment_mode || '—',
      txn_ref: r.reference_no || '—',
      collector: r.collector_name || loan.collector || '—',
      branch: r.branch || loan.branch || '—',
      principal: principalAmt,
      interest: interestAmt,
      penalty: penaltyAmt,
      paid: totalAmt + penaltyAmt,
      balance: r.new_principal_balance !== undefined && r.new_principal_balance !== null ? Number(r.new_principal_balance) : null,
      status: r.voided ? 'VOIDED' : (r.reverted ? 'REVERTED' : (r.clearance_status || 'CLEARED')),
      remarks: r.notes || (r.reverted ? r.revert_reason : '') || 'Collection Received'
    };
  });

  const handleTriggerPrint = () => {
    window.print();
  };

  // ── STEP 1: MODIFIED macOS STYLE UI MODAL
  if (viewStep === 'UI_MODAL') {
    const uiModalContent = (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
      }}>
        {/* Modern macOS System Container (Width 1140px, Max-height 88vh) */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 30px 80px -20px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          width: 1140,
          maxWidth: '95vw',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
          color: '#0F172A',
          boxSizing: 'border-box'
        }}>

          {/* Header Bar */}
          <div style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'var(--color-info-light, #EFF6FF)',
                border: '1px solid var(--color-info-border, #BFDBFE)',
                color: 'var(--color-info, #2563EB)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <History style={{ width: 20, height: 20 }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 500, color: '#0F172A', letterSpacing: '-0.01em' }}>
                  Complete Payment Ledger & Voucher History
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 400 }}>
                  Borrower: {loan.borrower_name || borrower.full_name} · Account: <span style={{ color: 'var(--brand-primary, #15803D)', fontFamily: 'monospace', fontWeight: 500 }}>{loan.loan_account_no}</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#64748B',
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Close Modal"
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Modal Inner Content Body */}
          <div style={{
            padding: 24,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            flex: 1
          }}>
            
            {/* KPI Summary Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 16px' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Sanctioned Principal</span>
                <span style={{ fontSize: '1.1rem', color: 'var(--color-info, #2563EB)', marginTop: 4, display: 'block', fontWeight: 500 }}>₹{fmt(loan.principal_amount)}</span>
              </div>

              <div style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', borderRadius: 12, padding: '12px 16px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--brand-primary-hover, #0E5327)', display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total Collected</span>
                <span style={{ fontSize: '1.1rem', color: 'var(--brand-primary, #15803D)', marginTop: 4, display: 'block', fontWeight: 500 }}>₹{fmt(loan.collected_amount)}</span>
              </div>

              <div style={{ background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FCA5A5)', borderRadius: 12, padding: '12px 16px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-danger-text, #991B1B)', display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Pending Outstanding</span>
                <span style={{ fontSize: '1.1rem', color: 'var(--color-danger, #DC2626)', marginTop: 4, display: 'block', fontWeight: 500 }}>₹{fmt(loan.pending_amount)}</span>
              </div>

              <div style={{ background: 'var(--color-info-light, #EFF6FF)', border: '1px solid var(--color-info-border, #BFDBFE)', borderRadius: 12, padding: '12px 16px' }}>
                <span style={{ fontSize: '0.68rem', color: '#1E40AF', display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total Transactions</span>
                <span style={{ fontSize: '1.1rem', color: '#1E40AF', marginTop: 4, display: 'block', fontWeight: 500 }}>{historyItems.length} Records</span>
              </div>
            </div>

            {/* Detailed Expanded Payments Table */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Itemized Collection Voucher Records ({historyItems.length})
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 400 }}>
                  Showing full transaction dates & timestamps
                </span>
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 360 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '10px 12px', width: 34, textAlign: 'center', fontWeight: 500 }}>#</th>
                        <th style={{ padding: '10px 12px', fontWeight: 500 }}>Voucher No</th>
                        <th style={{ padding: '10px 12px', fontWeight: 500 }}>Date & Time</th>
                        <th style={{ padding: '10px 12px', fontWeight: 500 }}>Mode</th>
                        <th style={{ padding: '10px 12px', fontWeight: 500 }}>Txn / Ref No</th>
                        <th style={{ padding: '10px 12px', fontWeight: 500 }}>Collector Agent</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 500 }}>Principal (₹)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 500 }}>Interest (₹)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 500 }}>Penalty (₹)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 500 }}>Paid (₹)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 500 }}>Balance (₹)</th>
                        <th style={{ padding: '10px 12px', fontWeight: 500 }}>Status & Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyItems.length === 0 && (
                        <tr>
                          <td colSpan={12} style={{ padding: '24px 12px', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>No collections recorded yet for this loan account.</td>
                        </tr>
                      )}
                      {historyItems.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: '#94A3B8' }}>{item.sno}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 500, color: 'var(--color-info, #2563EB)' }}>{item.voucher_no}</td>
                          <td style={{ padding: '10px 12px', color: '#0F172A' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 500 }}>{item.date}</span>
                              <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 400 }}>{item.time}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              background: item.mode === 'CASH' ? 'var(--brand-primary-light, #F0FEF5)' : 'var(--color-info-light, #EFF6FF)',
                              border: `1px solid ${item.mode === 'CASH' ? 'var(--brand-primary-border, #A3F5C1)' : 'var(--color-info-border, #BFDBFE)'}`,
                              color: item.mode === 'CASH' ? 'var(--brand-primary, #15803D)' : 'var(--color-info, #2563EB)',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: '0.68rem',
                              fontWeight: 500
                            }}>
                              {item.mode}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.72rem', color: '#64748B' }}>{item.txn_ref}</td>
                          <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 400 }}>{item.collector}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#334155', fontWeight: 400 }}>₹{fmt(item.principal)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#334155', fontWeight: 400 }}>₹{fmt(item.interest)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: item.penalty > 0 ? 'var(--color-danger, #DC2626)' : '#94A3B8', fontWeight: 400 }}>{item.penalty > 0 ? `₹${fmt(item.penalty)}` : '₹0.00'}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 500, color: 'var(--brand-primary, #15803D)' }}>₹{fmt(item.paid)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 500, color: '#0F172A' }}>{item.balance !== null ? `₹${fmt(item.balance)}` : "—"}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', color: 'var(--brand-primary, #15803D)', fontWeight: 500 }}>
                                <Check style={{ width: 11, height: 11 }} />
                                {item.status}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 400 }}>{item.remarks}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Control Bar */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFFFFF',
            flexShrink: 0
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                padding: '8px 18px',
                borderRadius: 10,
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => setViewStep('PAPER_PREVIEW')}
              style={{
                border: 'none',
                background: '#0F172A',
                color: '#FFFFFF',
                padding: '10px 22px',
                borderRadius: 10,
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)'
              }}
            >
              <Printer style={{ width: 15, height: 15 }} />
              <span>Print Bank Ledger Statement</span>
            </button>
          </div>

        </div>
      </div>
    );

    return createPortal(uiModalContent, document.body);
  }

  // ── STEP 2: EXACT ISO A4 PAPER SHEET SIZE FOR PRINTING
  const paperPreviewContent = (
    <div className="printable-form-overlay">

      {/* Floating Action Controls */}
      <div className="printable-form-floating-btns">
        <button
          type="button"
          onClick={() => setViewStep('UI_MODAL')}
          className="btn-close"
          title="Return to Payment History Modal"
        >
          <ArrowLeft style={{ width: 15, height: 15 }} />
          <span>Back to History</span>
        </button>

        <button
          type="button"
          onClick={handleTriggerPrint}
          className="btn-print"
          style={{ background: 'var(--brand-primary, #15803D)', boxShadow: '0 4px 12px rgba(var(--brand-primary-rgb), 0.3)' }}
        >
          <Printer style={{ width: 15, height: 15 }} />
          <span>Confirm & Print Statement</span>
        </button>
      </div>

      {/* Exact ISO A4 Paper Sheet (794px width x 1123px min-height) */}
      <div className="paper-sheet bank-form-paper" style={{
        width: 794,
        minHeight: 1123,
        boxSizing: 'border-box',
        padding: '48px 48px',
        background: '#FFFFFF',
        boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3)',
        color: '#000000',
        fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>

        <div>
          {/* 1. Bank Letterhead Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 500, color: '#000', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                {companyInfo.name}
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: '#333' }}>
                {companyInfo.tagline}
              </p>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.74rem', color: '#444' }}>
                {companyInfo.address}
              </p>
            </div>

            <div style={{ textAlign: 'right', fontSize: '0.76rem' }}>
              <div style={{ fontWeight: 500, fontSize: '0.84rem' }}>{(loan.branch || borrower.branch || 'MAIN BRANCH').toUpperCase()}</div>
            </div>
          </div>

          <div style={{ borderBottom: '2px solid #000', marginBottom: 20 }}></div>

          {/* Statement Title Banner */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 500, textTransform: 'uppercase', margin: 0, letterSpacing: '0.04em' }}>
              ACCOUNT STATEMENT FOR LOAN PORTFOLIO
            </h2>
            <span style={{ fontSize: '0.76rem', color: '#333', display: 'block', marginTop: 5 }}>
              Statement Period: <span>{loan.loan_date || '—'} to {printDate}</span>
            </span>
          </div>

          {/* 2. Official Bank 2-Column Particulars Box */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 24,
            border: '1px solid #000',
            padding: '16px 20px',
            marginBottom: 28,
            fontSize: '0.84rem'
          }}>
            {/* Account Particulars */}
            <div style={{ borderRight: '1px solid #CBD5E1', paddingRight: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontWeight: 500, textTransform: 'uppercase', fontSize: '0.78rem', borderBottom: '1px solid #000', paddingBottom: 5, marginBottom: 2 }}>
                Account Holder Particulars
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: '#475569', minWidth: 120 }}>Account Name:</span>
                <span style={{ color: '#0F172A', textAlign: 'right', fontWeight: 500 }}>{loan.borrower_name || borrower.full_name || 'N/A'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: '#475569', minWidth: 120 }}>Loan Account No:</span>
                <span style={{ fontFamily: 'monospace', color: '#0F172A', textAlign: 'right', fontWeight: 500 }}>{loan.loan_account_no}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: '#475569', minWidth: 120 }}>Registered Mobile:</span>
                <span style={{ color: '#0F172A', textAlign: 'right', fontWeight: 400 }}>{loan.phone || borrower.phone || 'N/A'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: '#475569', minWidth: 120 }}>Branch Access:</span>
                <span style={{ color: '#0F172A', textAlign: 'right', fontWeight: 400 }}>{loan.branch || borrower.branch || 'Karur Main Branch'}</span>
              </div>
            </div>

            {/* Statement Particulars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontWeight: 500, textTransform: 'uppercase', fontSize: '0.78rem', borderBottom: '1px solid #000', paddingBottom: 5, marginBottom: 2 }}>
                Loan Summary Particulars
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: '#475569', minWidth: 130 }}>Sanctioned Principal:</span>
                <span style={{ color: '#0F172A', textAlign: 'right', fontWeight: 500 }}>₹{fmt(loan.principal_amount)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: '#475569', minWidth: 130 }}>Total Amount Payable:</span>
                <span style={{ color: '#0F172A', textAlign: 'right', fontWeight: 500 }}>₹{fmt(loan.total_payable || loan.principal_amount * 1.1)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: '#475569', minWidth: 130 }}>Total Amount Credit:</span>
                <span style={{ color: 'var(--brand-primary-hover, #0E5327)', textAlign: 'right', fontWeight: 500 }}>₹{fmt(loan.collected_amount)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: '#475569', minWidth: 130 }}>Current Outstanding:</span>
                <span style={{ color: 'var(--color-danger, #DC2626)', textAlign: 'right', fontWeight: 500 }}>₹{fmt(loan.pending_amount)}</span>
              </div>
            </div>
          </div>

          {/* 3. Official Bank Transaction Ledger Table */}
          <div style={{ marginBottom: 32 }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.78rem',
              textAlign: 'left'
            }}>
              <thead>
                <tr style={{ background: '#F1F5F9', border: '1.5px solid #000' }}>
                  <th style={{ padding: '8px 10px', border: '1px solid #000', fontWeight: 500 }}>Txn Date & Time</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #000', fontWeight: 500 }}>Voucher No</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #000', fontWeight: 500 }}>Mode & Ref</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #000', fontWeight: 500 }}>Collector Agent</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #000', textAlign: 'right', fontWeight: 500 }}>Credit (₹)</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #000', textAlign: 'right', fontWeight: 500 }}>Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {historyItems.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '16px 10px', border: '1px solid #000', textAlign: 'center', color: '#555' }}>No collections recorded yet for this loan account.</td>
                  </tr>
                )}
                {historyItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ padding: '8px 10px', border: '1px solid #000' }}>{item.date} {item.time}</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #000', fontFamily: 'monospace' }}>{item.voucher_no}</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #000' }}>{item.mode} ({item.txn_ref})</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #000' }}>{item.collector}</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #000', textAlign: 'right', color: 'var(--brand-primary-hover, #0E5327)', fontWeight: 500 }}>₹{fmt(item.paid)}</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #000', textAlign: 'right', fontWeight: 500 }}>{item.balance !== null ? `₹${fmt(item.balance)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#F8FAFC', border: '2px solid #000', fontWeight: 500 }}>
                  <td colSpan="4" style={{ padding: '10px 12px', border: '1px solid #000', textAlign: 'right', textTransform: 'uppercase' }}>
                    Total Account Credit Balance:
                  </td>
                  <td style={{ padding: '10px 12px', border: '1px solid #000', textAlign: 'right', fontSize: '0.84rem', color: 'var(--brand-primary-hover, #0E5327)', fontWeight: 500 }}>
                    ₹{fmt(loan.collected_amount)}
                  </td>
                  <td style={{ padding: '10px 12px', border: '1px solid #000', textAlign: 'right', fontSize: '0.84rem', color: 'var(--color-danger, #DC2626)', fontWeight: 500 }}>
                    ₹{fmt(loan.pending_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 4. Bank Stamp & Authorised Officer Sign Off */}
        <div style={{
          paddingTop: 20,
          borderTop: '1px dashed #000',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          fontSize: '0.78rem'
        }}>
          <div>
            <p style={{ margin: '0 0 4px 0' }}>This is a computer-generated account statement and does not require a signature.</p>
            <p style={{ margin: 0, color: '#555' }}>Generated on {printDate}</p>
          </div>

          <div style={{ textAlign: 'center', minWidth: 230 }}>
            <p style={{ margin: '0 0 32px 0', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.74rem' }}>
              For {companyInfo.name}
            </p>
            <div style={{ borderBottom: '1px solid #000', width: 200, margin: '0 auto 5px auto' }}></div>
            <span style={{ fontWeight: 500, textTransform: 'uppercase', fontSize: '0.74rem' }}>
              Authorised Branch Manager / Officer
            </span>
          </div>
        </div>

      </div>

    </div>
  );

  return createPortal(paperPreviewContent, document.body);
}

