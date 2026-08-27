import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';

export default function PrintableFixedDepositRegister({ company = {}, fixedDeposits = [], branchFilter = 'ALL', statusTab = 'ACTIVE', onClose }) {
  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const totalPrincipal = fixedDeposits.reduce((sum, f) => sum + (parseFloat(f.principal_amount) || 0), 0);
  const totalMaturity = fixedDeposits.reduce((sum, f) => sum + (parseFloat(f.status === 'CLOSED_PREMATURE' ? f.payout_amount : f.maturity_value) || 0), 0);

  const content = (
    <div className="printable-form-overlay fd-reg-overlay">
      <div className="printable-form-floating-btns">
        <button type="button" className="btn-close" onClick={onClose}>
          <X style={{ width: 14, height: 14 }} />
          <span>Close</span>
        </button>
        <button type="button" className="btn-print" onClick={() => window.print()}>
          <Printer style={{ width: 14, height: 14 }} />
          <span>Print Register</span>
        </button>
      </div>

      <style>{`
        /* Wide landscape report — the full A4 sheet renders at real size and
           SCROLLS INSIDE .fd-reg-scroll (which is never wider than the modal),
           so nothing spills past the screen and the sheet is never shrunk. */
        .fd-reg-overlay {
          align-items: safe center;
          overflow: auto;
        }
        .fd-reg-overlay .printable-form-floating-btns {
          position: sticky;
          top: 12px;
          left: 8px;
          align-self: flex-start;
          width: max-content;
          max-width: none;
          justify-content: flex-start;
        }
        .fd-reg-scroll {
          max-width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
        }
        .fd-reg-paper {
          width: 210mm;
          box-sizing: border-box;
          background: #FFFFFF;
          margin: 0 auto 60px auto;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
          border-radius: 4px;
        }
        .fd-reg-tablewrap {
          width: 100%;
        }
        .fd-reg-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.75rem;
        }
        .fd-reg-table th {
          background: #F1F5F9;
          color: '#0F172A';
          padding: 7px 8px;
          border: 1px solid #CBD5E1;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.68rem;
        }
        .fd-reg-table td {
          padding: 6px 8px;
          border: 1px solid #E2E8F0;
          color: #1E293B;
        }

        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          .fd-reg-scroll { overflow: visible !important; max-width: none !important; }
          .fd-reg-paper {
            width: 100% !important; max-width: none !important; box-shadow: none !important;
            border-radius: 0 !important; margin: 0 !important; padding: 0 !important;
          }
          .fd-reg-table { min-width: 0 !important; }
          .fd-reg-tablewrap { overflow: visible !important; }
        }
      `}</style>

      <div className="fd-reg-scroll">
      <div className="fd-reg-paper" style={{ padding: '12mm', fontFamily: 'Inter, -apple-system, sans-serif', color: '#0F172A' }}>
        {/* MNC Header */}
        <div className="fd-reg-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0F172A', paddingBottom: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>{company.name || 'Finance ERP System'}</div>
            <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 2 }}>{company.address || 'Corporate Financial Operations'}</div>
            {(company.phone || company.email) && (
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                {[company.phone ? `Ph: ${company.phone}` : null, company.email].filter(Boolean).join(' | ')}
              </div>
            )}
          </div>
          <div className="fd-reg-title-col" style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-primary, #15803D)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fixed Deposit Register
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginTop: 2 }}>
              Status: {statusTab} • Branch: {branchFilter}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 2 }}>
              Generated: {now}
            </div>
          </div>
        </div>

        {/* Financial KPI Summary Bar */}
        <div className="fd-reg-kpi" style={{ display: 'flex', gap: 12, marginBottom: 16, background: '#F8FAFC', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.66rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Total Accounts</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>{fixedDeposits.length}</div>
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.66rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Total Principal</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-primary, #15803D)' }}>₹{fmt(totalPrincipal)}</div>
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.66rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Total Maturity Liability</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-info, #2563EB)' }}>₹{fmt(totalMaturity)}</div>
          </div>
        </div>

        {/* Master Register Data Table */}
        <div className="fd-reg-tablewrap">
        <table className="fd-reg-table">
          <thead>
            <tr>
              <th style={{ width: 35, textAlign: 'center' }}>S.No</th>
              <th style={{ textAlign: 'left' }}>FD Account No</th>
              <th style={{ textAlign: 'left' }}>Customer Name</th>
              <th style={{ textAlign: 'left' }}>Scheme</th>
              <th style={{ textAlign: 'right' }}>Principal (₹)</th>
              <th style={{ textAlign: 'center' }}>Tenure</th>
              <th style={{ textAlign: 'right' }}>Rate (%)</th>
              <th style={{ textAlign: 'center' }}>Booking Date</th>
              <th style={{ textAlign: 'center' }}>Maturity Date</th>
              <th style={{ textAlign: 'right' }}>{statusTab === 'CLOSED_PREMATURE' ? 'Prematured Amount' : 'Matured Value'}</th>
              <th style={{ textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {fixedDeposits.length === 0 ? (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', padding: 24, color: '#94A3B8' }}>
                  No Fixed Deposit records found for the selected criteria.
                </td>
              </tr>
            ) : (
              fixedDeposits.map((fd, idx) => (
                <tr key={fd.id}>
                  <td style={{ textAlign: 'center', color: '#64748B' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 700, color: 'var(--brand-primary, #15803D)', fontFamily: 'monospace' }}>{fd.fd_account_no}</td>
                  <td style={{ fontWeight: 600, color: '#0F172A' }}>{fd.customer_name}</td>
                  <td style={{ color: '#475569' }}>{fd.scheme === 'CUMULATIVE' ? 'Cumulative' : 'Monthly Payout'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{fmt(fd.principal_amount)}</td>
                  <td style={{ textAlign: 'center', color: '#475569' }}>{fd.tenure_months} mo</td>
                  <td style={{ textAlign: 'right' }}>{fd.interest_rate}%</td>
                  <td style={{ textAlign: 'center', color: '#475569' }}>{fd.booking_date}</td>
                  <td style={{ textAlign: 'center', color: '#475569' }}>{fd.maturity_date}</td>
                  <td style={{ textAlign: 'right', color: fd.status === 'CLOSED_PREMATURE' ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)' }}>
                    ₹{fmt(fd.status === 'CLOSED_PREMATURE' ? fd.payout_amount : fd.maturity_value)}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.68rem', color: fd.status === 'ACTIVE' ? 'var(--brand-primary, #15803D)' : fd.status === 'MATURED' ? 'var(--color-info, #2563EB)' : 'var(--color-danger, #DC2626)' }}>
                    {fd.status}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* Footer Authorization Block */}
        <div className="fd-reg-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, paddingTop: 16, borderTop: '1px solid #CBD5E1', fontSize: '0.72rem', color: '#64748B' }}>
          <div>Prepared By: <strong>Authorized Finance System</strong></div>
          <div>Internal Audit & Compliance Verification</div>
          <div>Authorized Officer Signature</div>
        </div>
      </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
