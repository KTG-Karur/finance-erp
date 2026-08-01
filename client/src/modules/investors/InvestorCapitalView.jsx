import React, { useState } from 'react';
import { Wallet, Users, Plus, Trash2, Pencil, X, AlertTriangle, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

const inputStyle = { width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 500 };
const labelStyle = { fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 };

const TXN_TYPES = [
  { value: 'CAPITAL_INJECTION', label: 'Capital Injection' },
  { value: 'TOP_UP', label: 'Top-Up' },
  { value: 'WITHDRAWAL', label: 'Withdrawal' },
  { value: 'YIELD_PAYOUT', label: 'Yield Payout' }
];

function InvestorModal({ isOpen, initialData, onClose, onSubmit }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setForm(initialData || { name: '', phone: '', email: '', address: '', kyc_status: 'PENDING', bank_name: '', account_holder_name: '', account_no: '', ifsc_no: '', nominee_name: '', nominee_phone: '', status: 'ACTIVE' });
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.phone?.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onSubmit(form, initialData?.id);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save investor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card saas-modal-card--lg">
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
              <Users style={{ width: 18, height: 18 }} />
            </div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600 }}>{initialData ? 'Edit Investor' : 'Add Investor'}</h3>
              <p>Capital partner profile & payout bank account</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
          {error && <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{error}</span></div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Investor Name *</label>
              <input type="text" required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Phone *</label>
              <input type="text" required value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>KYC Status</label>
              <select value={form.kyc_status || 'PENDING'} onChange={e => setForm({ ...form, kyc_status: e.target.value })} style={inputStyle}>
                <option value="PENDING">Pending</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Address</label>
            <input type="text" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} style={inputStyle} />
          </div>
          <div className="form-section-label">Payout Bank Account</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Bank Name</label>
              <input type="text" value={form.bank_name || ''} onChange={e => setForm({ ...form, bank_name: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Account Holder Name</label>
              <input type="text" value={form.account_holder_name || ''} onChange={e => setForm({ ...form, account_holder_name: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Account Number</label>
              <input type="text" value={form.account_no || ''} onChange={e => setForm({ ...form, account_no: e.target.value })} style={{ ...inputStyle, fontFamily: 'monospace' }} />
            </div>
            <div>
              <label style={labelStyle}>IFSC Code</label>
              <input type="text" value={form.ifsc_no || ''} onChange={e => setForm({ ...form, ifsc_no: e.target.value.toUpperCase() })} style={{ ...inputStyle, fontFamily: 'monospace' }} />
            </div>
          </div>
          <div className="form-section-label">Nominee</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Nominee Name</label>
              <input type="text" value={form.nominee_name || ''} onChange={e => setForm({ ...form, nominee_name: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Nominee Phone</label>
              <input type="text" value={form.nominee_phone || ''} onChange={e => setForm({ ...form, nominee_phone: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ background: '#7C3AED', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Investor')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TransactionModal({ isOpen, investors, onClose, onSubmit }) {
  const [form, setForm] = useState({ investor_id: '', type: 'CAPITAL_INJECTION', amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setForm({ investor_id: investors[0]?.id || '', type: 'CAPITAL_INJECTION', amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });
      setError('');
    }
  }, [isOpen, investors]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.investor_id || !form.amount) return;
    setLoading(true);
    setError('');
    try {
      await onSubmit({ ...form, investor_id: Number(form.investor_id), amount: parseFloat(form.amount) });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to record transaction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card">
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
              <TrendingUp style={{ width: 18, height: 18 }} />
            </div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600 }}>Add Capital Transaction</h3>
              <p>Injection, top-up, withdrawal, or yield payout</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
          {error && <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{error}</span></div>}
          <div>
            <label style={labelStyle}>Investor *</label>
            <select required value={form.investor_id} onChange={e => setForm({ ...form, investor_id: e.target.value })} style={inputStyle}>
              {investors.map(i => <option key={i.id} value={i.id}>{i.name} ({i.investor_code})</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Transaction Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                {TXN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Amount (₹) *</label>
              <input type="number" min="1" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-control" style={{ width: '100%', height: 'auto', padding: '8px 12px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ background: '#7C3AED', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Saving...' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InvestorCapitalView({
  investors = [], transactions = [],
  onCreateInvestor, onUpdateInvestor, onDeleteInvestor, onCreateTransaction
}) {
  const [investorModalOpen, setInvestorModalOpen] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState(null);
  const [txnModalOpen, setTxnModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const balanceFor = (investorId) => transactions
    .filter(t => t.investor_id === investorId)
    .reduce((acc, t) => acc + (t.type === 'WITHDRAWAL' ? -t.amount : (t.type === 'CAPITAL_INJECTION' || t.type === 'TOP_UP' ? t.amount : 0)), 0);

  const totalCapital = investors.reduce((acc, i) => acc + balanceFor(i.id), 0);
  const totalYieldPaid = transactions.filter(t => t.type === 'YIELD_PAYOUT').reduce((acc, t) => acc + t.amount, 0);

  const txnIcon = (type) => {
    if (type === 'WITHDRAWAL') return <ArrowDownRight style={{ width: 13, height: 13, color: '#DC2626' }} />;
    if (type === 'YIELD_PAYOUT') return <TrendingUp style={{ width: 13, height: 13, color: '#D97706' }} />;
    return <ArrowUpRight style={{ width: 13, height: 13, color: '#059669' }} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="active-loans-header">
        <div className="header-left">
          <div className="header-badge-icon" style={{ background: '#F5F3FF', borderColor: '#E9D5FF', color: '#7C3AED' }}>
            <Wallet style={{ width: 20, height: 20 }} />
          </div>
          <div className="header-text">
            <h1 style={{ fontWeight: 600 }}>Investor Capital</h1>
            <p style={{ fontWeight: 400 }}>Capital partner directory, injections, top-ups, withdrawals & yield payouts</p>
          </div>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: 8 }}>
          <button className="btn-disburse" onClick={() => setTxnModalOpen(true)} disabled={!investors.length} style={{ background: '#0F172A', fontWeight: 600 }}>
            <Plus style={{ width: 15, height: 15 }} />
            <span>Add Transaction</span>
          </button>
          <button className="btn-disburse" onClick={() => { setEditingInvestor(null); setInvestorModalOpen(true); }} style={{ background: '#7C3AED', fontWeight: 600 }}>
            <Plus style={{ width: 15, height: 15 }} />
            <span>Add Investor</span>
          </button>
        </div>
      </div>

      <div className="loans-kpi-grid">
        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--purple"><Wallet style={{ width: 20, height: 20 }} /></div>
          <div className="loan-kpi-card__info"><span>Total Active Capital</span><strong>₹{fmt(totalCapital)}</strong></div>
        </div>
        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--green"><Users style={{ width: 20, height: 20 }} /></div>
          <div className="loan-kpi-card__info"><span>Active Investors</span><strong>{investors.length}</strong></div>
        </div>
        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--orange"><TrendingUp style={{ width: 20, height: 20 }} /></div>
          <div className="loan-kpi-card__info"><span>Total Yield Paid Out</span><strong>₹{fmt(totalYieldPaid)}</strong></div>
        </div>
      </div>

      {/* Investor Directory */}
      <div className="loans-table-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', fontSize: '0.9rem', fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users style={{ width: 16, height: 16, color: '#7C3AED' }} />
          <span>Investor Directory</span>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: 50, textAlign: 'center' }}>S.No</th>
                <th>Investor</th>
                <th>Phone</th>
                <th>Bank Account</th>
                <th style={{ textAlign: 'center' }}>KYC</th>
                <th style={{ textAlign: 'right' }}>Capital Balance</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {investors.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>No investors registered yet.</td></tr>
              ) : investors.map((inv, idx) => (
                <tr key={inv.id}>
                  <td style={{ textAlign: 'center', color: '#64748B' }}>{idx + 1}</td>
                  <td>
                    <strong style={{ fontWeight: 600, color: '#0F172A' }}>{inv.name}</strong>
                    <div style={{ fontSize: '0.68rem', color: '#94A3B8', fontFamily: 'monospace' }}>{inv.investor_code}</div>
                  </td>
                  <td><span style={{ fontSize: '0.8rem', color: '#334155' }}>{inv.phone}</span></td>
                  <td><span style={{ fontSize: '0.75rem', color: '#64748B' }}>{inv.bank_name} • {inv.account_no}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600,
                      background: inv.kyc_status === 'VERIFIED' ? '#ECFDF5' : '#FFFBEB',
                      color: inv.kyc_status === 'VERIFIED' ? '#059669' : '#92400E'
                    }}>
                      {inv.kyc_status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#7C3AED' }}>₹{fmt(balanceFor(inv.id))}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button onClick={() => { setEditingInvestor(inv); setInvestorModalOpen(true); }} style={{ border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                        <Pencil style={{ width: 12, height: 12 }} />
                      </button>
                      <button onClick={() => { setDeleteTarget(inv); setDeleteError(''); }} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                        <Trash2 style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Capital & Payouts Ledger */}
      <div className="loans-table-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', fontSize: '0.9rem', fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp style={{ width: 16, height: 16, color: '#7C3AED' }} />
          <span>Capital & Payouts Ledger</span>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: 50, textAlign: 'center' }}>S.No</th>
                <th>Investor</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Date</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>No capital transactions recorded yet.</td></tr>
              ) : transactions.map((t, idx) => (
                <tr key={t.id}>
                  <td style={{ textAlign: 'center', color: '#64748B' }}>{idx + 1}</td>
                  <td style={{ fontSize: '0.8rem', color: '#0F172A', fontWeight: 500 }}>{investors.find(i => i.id === t.investor_id)?.name || '—'}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#334155' }}>
                      {txnIcon(t.type)}
                      {TXN_TYPES.find(x => x.value === t.type)?.label || t.type}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: t.type === 'WITHDRAWAL' ? '#DC2626' : '#059669' }}>
                    {t.type === 'WITHDRAWAL' ? '-' : '+'}₹{fmt(t.amount)}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: '#64748B' }}>{t.date}</td>
                  <td style={{ fontSize: '0.75rem', color: '#64748B' }}>{t.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InvestorModal
        isOpen={investorModalOpen}
        initialData={editingInvestor}
        onClose={() => setInvestorModalOpen(false)}
        onSubmit={(form, id) => id ? onUpdateInvestor(id, form) : onCreateInvestor(form)}
      />
      <TransactionModal
        isOpen={txnModalOpen}
        investors={investors}
        onClose={() => setTxnModalOpen(false)}
        onSubmit={onCreateTransaction}
      />

      {deleteTarget && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card">
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' }}>
                  <Trash2 style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>Delete Investor</h3>
                  <p>This action cannot be undone</p>
                </div>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="saas-modal-body">
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong>?</p>
              {deleteError && <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{deleteError}</span></div>}
            </div>
            <div className="saas-modal-footer">
              <button type="button" onClick={() => setDeleteTarget(null)} className="btn-cancel">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await onDeleteInvestor(deleteTarget.id);
                    setDeleteTarget(null);
                  } catch (err) {
                    setDeleteError(err?.response?.data?.message || 'Unable to delete this investor.');
                  }
                }}
                className="btn-submit"
                style={{ background: '#DC2626', boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)' }}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
