import React, { useState } from 'react';
import { Landmark, Plus, Eye, X, AlertTriangle, CheckCircle2, LogOut, Printer, ArrowLeft } from 'lucide-react';

const inputStyle = { width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 500 };
const labelStyle = { fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 };

function computeMaturity(principal, tenureMonths, rate, scheme) {
  const p = parseFloat(principal) || 0;
  const months = parseFloat(tenureMonths) || 0;
  const r = parseFloat(rate) || 0;
  if (scheme === 'MONTHLY_PAYOUT') {
    // Principal returned at maturity; interest paid out monthly (not compounded into maturity value)
    return Math.round(p);
  }
  // Cumulative: simple interest over the tenure for this mock calculator
  const interest = p * (r / 100) * (months / 12);
  return Math.round(p + interest);
}

function BookFdModal({ isOpen, borrowers, onClose, onSubmit }) {
  const [form, setForm] = useState({ borrower_id: '', principal_amount: 100000, tenure_months: 12, interest_rate: 8.5, scheme: 'CUMULATIVE' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setForm({ borrower_id: borrowers[0]?.id || '', principal_amount: 100000, tenure_months: 12, interest_rate: 8.5, scheme: 'CUMULATIVE' });
      setError('');
    }
  }, [isOpen, borrowers]);

  if (!isOpen) return null;

  const maturityValue = computeMaturity(form.principal_amount, form.tenure_months, form.interest_rate, form.scheme);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.borrower_id) { setError('Select a customer to book this FD against.'); return; }
    setLoading(true);
    setError('');
    try {
      const customer = borrowers.find(b => b.id === Number(form.borrower_id));
      const bookingDate = new Date();
      const maturityDate = new Date(bookingDate);
      maturityDate.setMonth(maturityDate.getMonth() + Number(form.tenure_months));
      await onSubmit({
        borrower_id: Number(form.borrower_id),
        customer_name: customer?.full_name || 'Unknown',
        principal_amount: parseFloat(form.principal_amount),
        tenure_months: Number(form.tenure_months),
        interest_rate: parseFloat(form.interest_rate),
        scheme: form.scheme,
        booking_date: bookingDate.toISOString().slice(0, 10),
        maturity_date: maturityDate.toISOString().slice(0, 10),
        maturity_value: maturityValue
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to book fixed deposit.');
    } finally {
      setLoading(false);
    }
  };

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card saas-modal-card--lg">
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: '#ECFDF5', color: '#059669' }}>
              <Landmark style={{ width: 18, height: 18 }} />
            </div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600 }}>Book New Fixed Deposit</h3>
              <p>Term deposit booking with auto-computed maturity value</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
          {error && <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{error}</span></div>}
          <div>
            <label style={labelStyle}>Customer *</label>
            <select required value={form.borrower_id} onChange={e => setForm({ ...form, borrower_id: e.target.value })} style={inputStyle}>
              <option value="">Select customer...</option>
              {borrowers.map(b => <option key={b.id} value={b.id}>{b.full_name} ({b.borrower_code})</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Principal Amount (₹) *</label>
              <input type="number" min="1000" step="1000" required value={form.principal_amount} onChange={e => setForm({ ...form, principal_amount: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Tenure (Months) *</label>
              <input type="number" min="3" max="60" required value={form.tenure_months} onChange={e => setForm({ ...form, tenure_months: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Interest Rate (% p.a.) *</label>
              <input type="number" step="0.1" required value={form.interest_rate} onChange={e => setForm({ ...form, interest_rate: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Scheme</label>
              <select value={form.scheme} onChange={e => setForm({ ...form, scheme: e.target.value })} style={inputStyle}>
                <option value="CUMULATIVE">Cumulative (paid at maturity)</option>
                <option value="MONTHLY_PAYOUT">Monthly Payout</option>
              </select>
            </div>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', textTransform: 'uppercase' }}>Maturity Date</span>
              <strong style={{ fontSize: '0.9rem', color: '#2563EB' }}>{form.tenure_months ? `${form.tenure_months} months from booking` : '—'}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', textTransform: 'uppercase' }}>Maturity Value</span>
              <strong style={{ fontSize: '1rem', color: '#059669' }}>₹{fmt(maturityValue)}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ background: '#059669', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Booking...' : 'Book Fixed Deposit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CertificateView({ fd, onBack }) {
  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="active-loans-header">
        <div className="header-left">
          <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginRight: 10 }}>
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>
          <div className="header-badge-icon" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#059669' }}>
            <Landmark style={{ width: 20, height: 20 }} />
          </div>
          <div className="header-text">
            <h1 style={{ fontWeight: 600 }}>FD Certificate — {fd.fd_account_no}</h1>
            <p style={{ fontWeight: 400 }}>Printable fixed deposit certificate</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-disburse" onClick={() => window.print()} style={{ background: '#059669', fontWeight: 600 }}>
            <Printer style={{ width: 15, height: 15 }} />
            <span>Print Certificate</span>
          </button>
        </div>
      </div>

      <div className="loans-table-card" style={{ padding: 32, maxWidth: 640, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #059669', paddingBottom: 16, marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: '#059669', fontWeight: 700 }}>Fixed Deposit Certificate</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '0.8rem' }}>Knock The Globe Technologies Pvt. Ltd.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: '0.85rem' }}>
          <div><strong>FD Account No:</strong> {fd.fd_account_no}</div>
          <div><strong>Customer:</strong> {fd.customer_name}</div>
          <div><strong>Principal Amount:</strong> ₹{fmt(fd.principal_amount)}</div>
          <div><strong>Interest Rate:</strong> {fd.interest_rate}% p.a.</div>
          <div><strong>Tenure:</strong> {fd.tenure_months} months</div>
          <div><strong>Scheme:</strong> {fd.scheme === 'CUMULATIVE' ? 'Cumulative' : 'Monthly Payout'}</div>
          <div><strong>Booking Date:</strong> {fd.booking_date}</div>
          <div><strong>Maturity Date:</strong> {fd.maturity_date}</div>
          <div style={{ gridColumn: '1 / -1', paddingTop: 12, borderTop: '1px dashed #E2E8F0' }}>
            <strong style={{ fontSize: '1.1rem', color: '#059669' }}>Maturity Value: ₹{fmt(fd.maturity_value)}</strong>
          </div>
          <div><strong>Status:</strong> {fd.status}</div>
          {fd.status === 'CLOSED_PREMATURE' && <div><strong>Payout (after penalty):</strong> ₹{fmt(fd.payout_amount)}</div>}
        </div>
      </div>
    </div>
  );
}

export default function FixedDepositsView({ fixedDeposits = [], borrowers = [], onCreateFd, onMatureFd, onPrematureCloseFd }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [viewingCertificate, setViewingCertificate] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'MATURE'|'PREMATURE', fd }

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  if (viewingCertificate) {
    return <CertificateView fd={viewingCertificate} onBack={() => setViewingCertificate(null)} />;
  }

  const totalPrincipal = fixedDeposits.reduce((acc, f) => acc + (f.status === 'ACTIVE' ? f.principal_amount : 0), 0);
  const totalMaturityLiability = fixedDeposits.reduce((acc, f) => acc + (f.status === 'ACTIVE' ? f.maturity_value : 0), 0);
  const activeCount = fixedDeposits.filter(f => f.status === 'ACTIVE').length;

  const statusBadge = (status) => {
    const cfg = {
      ACTIVE: { bg: '#ECFDF5', color: '#059669' },
      MATURED: { bg: '#EFF6FF', color: '#2563EB' },
      CLOSED_PREMATURE: { bg: '#FEF2F2', color: '#DC2626' }
    }[status] || { bg: '#F1F5F9', color: '#64748B' };
    return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600, background: cfg.bg, color: cfg.color }}>{status.replace('_', ' ')}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="active-loans-header">
        <div className="header-left">
          <div className="header-badge-icon" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#059669' }}>
            <Landmark style={{ width: 20, height: 20 }} />
          </div>
          <div className="header-text">
            <h1 style={{ fontWeight: 600 }}>Fixed Deposits</h1>
            <p style={{ fontWeight: 400 }}>FD bookings, maturity handling & premature exits</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-disburse" onClick={() => setModalOpen(true)} disabled={!borrowers.length} style={{ background: '#059669', fontWeight: 600 }}>
            <Plus style={{ width: 15, height: 15 }} />
            <span>Book New FD</span>
          </button>
        </div>
      </div>

      <div className="loans-kpi-grid">
        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--green"><Landmark style={{ width: 20, height: 20 }} /></div>
          <div className="loan-kpi-card__info"><span>Active FD Principal</span><strong>₹{fmt(totalPrincipal)}</strong></div>
        </div>
        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--blue"><CheckCircle2 style={{ width: 20, height: 20 }} /></div>
          <div className="loan-kpi-card__info"><span>Active FD Accounts</span><strong>{activeCount}</strong></div>
        </div>
        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--orange"><LogOut style={{ width: 20, height: 20 }} /></div>
          <div className="loan-kpi-card__info"><span>Total Maturity Liability</span><strong>₹{fmt(totalMaturityLiability)}</strong></div>
        </div>
      </div>

      <div className="loans-table-card">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: 50, textAlign: 'center' }}>S.No</th>
                <th>FD Account No</th>
                <th>Customer</th>
                <th style={{ textAlign: 'right' }}>Principal</th>
                <th style={{ textAlign: 'center' }}>Tenure</th>
                <th style={{ textAlign: 'right' }}>Rate</th>
                <th style={{ textAlign: 'right' }}>Maturity Value</th>
                <th>Maturity Date</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fixedDeposits.length === 0 ? (
                <tr><td colSpan="10" style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>No fixed deposits booked yet.</td></tr>
              ) : fixedDeposits.map((fd, idx) => (
                <tr key={fd.id}>
                  <td style={{ textAlign: 'center', color: '#64748B' }}>{idx + 1}</td>
                  <td><span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#059669' }}>{fd.fd_account_no}</span></td>
                  <td style={{ fontSize: '0.82rem', color: '#0F172A' }}>{fd.customer_name}</td>
                  <td style={{ textAlign: 'right', color: '#334155' }}>₹{fmt(fd.principal_amount)}</td>
                  <td style={{ textAlign: 'center', color: '#64748B' }}>{fd.tenure_months}mo</td>
                  <td style={{ textAlign: 'right', color: '#334155' }}>{fd.interest_rate}%</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>₹{fmt(fd.status === 'CLOSED_PREMATURE' ? fd.payout_amount : fd.maturity_value)}</td>
                  <td style={{ fontSize: '0.75rem', color: '#64748B' }}>{fd.maturity_date}</td>
                  <td style={{ textAlign: 'center' }}>{statusBadge(fd.status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button onClick={() => setViewingCertificate(fd)} title="View Certificate" style={{ border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                        <Eye style={{ width: 12, height: 12 }} />
                      </button>
                      {fd.status === 'ACTIVE' && (
                        <>
                          <button onClick={() => setConfirmAction({ type: 'MATURE', fd })} title="Mark Matured" style={{ border: 'none', background: '#ECFDF5', color: '#059669', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                            <CheckCircle2 style={{ width: 12, height: 12 }} />
                          </button>
                          <button onClick={() => setConfirmAction({ type: 'PREMATURE', fd })} title="Premature Exit" style={{ border: 'none', background: '#FEF2F2', color: '#DC2626', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                            <LogOut style={{ width: 12, height: 12 }} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BookFdModal isOpen={modalOpen} borrowers={borrowers} onClose={() => setModalOpen(false)} onSubmit={onCreateFd} />

      {confirmAction && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card">
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: confirmAction.type === 'MATURE' ? '#ECFDF5' : '#FEF2F2', color: confirmAction.type === 'MATURE' ? '#059669' : '#DC2626' }}>
                  {confirmAction.type === 'MATURE' ? <CheckCircle2 style={{ width: 18, height: 18 }} /> : <LogOut style={{ width: 18, height: 18 }} />}
                </div>
                <div className="head-titles">
                  <h3>{confirmAction.type === 'MATURE' ? 'Mark FD as Matured' : 'Premature Exit'}</h3>
                  <p>{confirmAction.fd.fd_account_no} — {confirmAction.fd.customer_name}</p>
                </div>
              </div>
              <button onClick={() => setConfirmAction(null)} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="saas-modal-body">
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>
                {confirmAction.type === 'MATURE'
                  ? `Confirm maturity payout of ₹${fmt(confirmAction.fd.maturity_value)} to the customer.`
                  : `A 2% penalty applies on early exit. Payout will be ₹${fmt(Math.round(confirmAction.fd.maturity_value * 0.98))} instead of the full ₹${fmt(confirmAction.fd.maturity_value)} maturity value.`}
              </p>
            </div>
            <div className="saas-modal-footer">
              <button type="button" onClick={() => setConfirmAction(null)} className="btn-cancel">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  if (confirmAction.type === 'MATURE') onMatureFd(confirmAction.fd.id);
                  else onPrematureCloseFd(confirmAction.fd.id);
                  setConfirmAction(null);
                }}
                className="btn-submit"
                style={confirmAction.type === 'PREMATURE' ? { background: '#DC2626', boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)' } : {}}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
