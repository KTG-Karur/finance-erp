import React, { useState } from 'react';
import { Receipt, Layers, Plus, Trash2, Pencil, X, AlertTriangle } from 'lucide-react';

const inputStyle = { width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 500 };
const labelStyle = { fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 };

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

function ExpenseCategoryModal({ isOpen, initialData, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', approval_threshold: 0 });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) setForm(initialData ? { name: initialData.name, approval_threshold: initialData.approval_threshold } : { name: '', approval_threshold: 0 });
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await onSubmit({ name: form.name, approval_threshold: Number(form.approval_threshold) || 0 }, initialData?.id);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card" style={{ maxWidth: 460 }}>
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: '#FFFBEB', color: '#D97706' }}><Receipt style={{ width: 18, height: 18 }} /></div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600 }}>{initialData ? 'Edit Expense Category' : 'Add Expense Category'}</h3>
              <p>Category name & approval threshold amount</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
          <div>
            <label style={labelStyle}>Category Name *</label>
            <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Office Rent" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Approval Threshold (₹)</label>
            <input type="number" min="0" value={form.approval_threshold} onChange={e => setForm({ ...form, approval_threshold: e.target.value })} placeholder="0 = always requires approval" style={inputStyle} />
            <p style={{ fontSize: '0.68rem', color: '#94A3B8', margin: '4px 0 0 0' }}>Vouchers above this amount are flagged as requiring Branch Manager / Admin sign-off. Set 0 to always require approval.</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ background: '#D97706', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Category')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AccountModal({ isOpen, initialData, accounts, onClose, onSubmit }) {
  const [form, setForm] = useState({ account_code: '', account_name: '', account_type: 'ASSET', parent_id: '' });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) setForm(initialData ? { ...initialData, parent_id: initialData.parent_id || '' } : { account_code: '', account_name: '', account_type: 'ASSET', parent_id: '' });
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.account_code.trim() || !form.account_name.trim()) return;
    setLoading(true);
    try {
      await onSubmit({ ...form, parent_id: form.parent_id ? Number(form.parent_id) : null }, initialData?.id);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card" style={{ maxWidth: 460 }}>
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: '#EFF6FF', color: '#2563EB' }}><Layers style={{ width: 18, height: 18 }} /></div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600 }}>{initialData ? 'Edit Account' : 'Add Ledger Account'}</h3>
              <p>Chart of Accounts master entry</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Account Code *</label>
              <input type="text" required value={form.account_code} onChange={e => setForm({ ...form, account_code: e.target.value })} placeholder="e.g. 1010" style={{ ...inputStyle, fontFamily: 'monospace' }} />
            </div>
            <div>
              <label style={labelStyle}>Account Type</label>
              <select value={form.account_type} onChange={e => setForm({ ...form, account_type: e.target.value })} style={inputStyle}>
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Account Name *</label>
            <input type="text" required value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} placeholder="e.g. Branch Vault Cash" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Parent Account</label>
            <select value={form.parent_id} onChange={e => setForm({ ...form, parent_id: e.target.value })} style={inputStyle}>
              <option value="">— No Parent (Root Account) —</option>
              {accounts.filter(a => a.id !== initialData?.id).map(a => <option key={a.id} value={a.id}>{a.account_code} — {a.account_name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Account')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AccountingMastersView({
  expenseCategories = [], onCreateExpenseCategory, onUpdateExpenseCategory, onDeleteExpenseCategory,
  chartOfAccounts = [], onCreateAccount, onUpdateAccount, onDeleteAccount
}) {
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [acctModalOpen, setAcctModalOpen] = useState(false);
  const [editingAcct, setEditingAcct] = useState(null);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const parentName = (id) => chartOfAccounts.find(a => a.id === id)?.account_name || '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="active-loans-header">
        <div className="header-left">
          <div className="header-badge-icon" style={{ background: '#F1F5F9', borderColor: '#CBD5E1', color: '#334155' }}>
            <Layers style={{ width: 20, height: 20 }} />
          </div>
          <div className="header-text">
            <h1 style={{ fontWeight: 600 }}>Accounting Masters</h1>
            <p style={{ fontWeight: 400 }}>Expense categories with approval thresholds & the Chart of Accounts</p>
          </div>
        </div>
      </div>

      {/* Expense Category Master */}
      <div className="loans-table-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt style={{ width: 16, height: 16, color: '#D97706' }} />
            <span>Expense Category Master</span>
          </div>
          <button onClick={() => { setEditingCat(null); setCatModalOpen(true); }} style={{ background: '#D97706', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus style={{ width: 14, height: 14 }} /><span>Add Category</span>
          </button>
        </div>
        <div className="table-responsive">
          <table>
            <thead><tr><th style={{ width: 50, textAlign: 'center' }}>S.No</th><th>Category Name</th><th style={{ textAlign: 'right' }}>Approval Threshold</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {expenseCategories.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>No expense categories yet.</td></tr>
              ) : expenseCategories.map((c, idx) => (
                <tr key={c.id}>
                  <td style={{ textAlign: 'center', color: '#64748B' }}>{idx + 1}</td>
                  <td><strong style={{ fontWeight: 600, color: '#0F172A' }}>{c.name}</strong></td>
                  <td style={{ textAlign: 'right', color: '#334155' }}>{c.approval_threshold > 0 ? `₹${fmt(c.approval_threshold)}+` : 'Always'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button onClick={() => { setEditingCat(c); setCatModalOpen(true); }} style={{ border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}><Pencil style={{ width: 12, height: 12 }} /></button>
                      <button onClick={() => onDeleteExpenseCategory(c.id)} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}><Trash2 style={{ width: 12, height: 12 }} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chart of Accounts */}
      <div className="loans-table-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers style={{ width: 16, height: 16, color: '#2563EB' }} />
            <span>Chart of Accounts</span>
          </div>
          <button onClick={() => { setEditingAcct(null); setAcctModalOpen(true); }} style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus style={{ width: 14, height: 14 }} /><span>Add Account</span>
          </button>
        </div>
        <div className="table-responsive">
          <table>
            <thead><tr><th style={{ width: 50, textAlign: 'center' }}>S.No</th><th>Code</th><th>Account Name</th><th>Type</th><th>Parent</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {chartOfAccounts.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>No accounts configured yet.</td></tr>
              ) : chartOfAccounts.map((a, idx) => (
                <tr key={a.id}>
                  <td style={{ textAlign: 'center', color: '#64748B' }}>{idx + 1}</td>
                  <td><span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{a.account_code}</span></td>
                  <td><strong style={{ fontWeight: 600, color: '#0F172A' }}>{a.account_name}</strong></td>
                  <td><span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20, background: '#F1F5F9', color: '#475569', fontWeight: 600 }}>{a.account_type}</span></td>
                  <td style={{ fontSize: '0.78rem', color: '#64748B' }}>{a.parent_id ? parentName(a.parent_id) : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button onClick={() => { setEditingAcct(a); setAcctModalOpen(true); }} style={{ border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}><Pencil style={{ width: 12, height: 12 }} /></button>
                      <button onClick={() => onDeleteAccount(a.id)} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}><Trash2 style={{ width: 12, height: 12 }} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ExpenseCategoryModal isOpen={catModalOpen} initialData={editingCat} onClose={() => setCatModalOpen(false)} onSubmit={(f, id) => id ? onUpdateExpenseCategory(id, f) : onCreateExpenseCategory(f)} />
      <AccountModal isOpen={acctModalOpen} initialData={editingAcct} accounts={chartOfAccounts} onClose={() => setAcctModalOpen(false)} onSubmit={(f, id) => id ? onUpdateAccount(id, f) : onCreateAccount(f)} />
    </div>
  );
}
