import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Search,
  X,
  AlertTriangle,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import SharedDropdown from '../components/common/SharedDropdown';

const ACCOUNT_TYPES = [
  { key: 'ASSET', label: 'Asset (Money We Have)', bg: '#F0FEF5', color: '#0E5327', border: '#A3F5C1' },
  { key: 'LIABILITY', label: 'Liability (Money We Must Return)', bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  { key: 'EQUITY', label: 'Equity (Capital / Profit)', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  { key: 'REVENUE', label: 'Revenue (Money We Earned)', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  { key: 'EXPENSE', label: 'Expense (Money We Spent)', bg: '#FFF7ED', color: '#C2410C', border: '#FFEDD5' }
];

function CreateAccountModal({ isOpen, onClose, onSubmit }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ account_code: '', account_name: '', type: 'EXPENSE' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setForm({ account_code: '', account_name: '', type: 'EXPENSE' });
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.account_code.trim()) { setError('Account code is required.'); return; }
    if (!form.account_name.trim()) { setError('Account name is required.'); return; }

    setLoading(true);
    try {
      await onSubmit({
        account_code: form.account_code.trim(),
        account_name: form.account_name.trim(),
        type: form.type
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card" style={{ maxWidth: 450 }}>
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: '#F0FDF4', color: '#15803D' }}>
              <BookOpen style={{ width: 18, height: 18 }} />
            </div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Add New Account Option</h3>
              <p style={{ fontWeight: 400, fontSize: '0.78rem' }}>Create a new financial head for vouchers & general ledger</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 24px' }}>
          {error && (
            <div className="form-alert form-alert--error" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400 }}>
              <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0, color: '#DC2626' }} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 }}>Account Code * (e.g. 5010)</label>
            <input
              type="text"
              required
              value={form.account_code}
              onChange={e => setForm({ ...form, account_code: e.target.value })}
              placeholder="e.g. 5010"
              style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 400 }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 }}>Display Name / Option Label *</label>
            <input
              type="text"
              required
              value={form.account_name}
              onChange={e => setForm({ ...form, account_name: e.target.value })}
              placeholder="e.g. Consulting & Legal Fees"
              style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 400 }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 }}>Account Category *</label>
            <SharedDropdown
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              options={ACCOUNT_TYPES.map(t => ({ value: t.key, label: t.label }))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ background: 'var(--brand-primary, #15803D)', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditAccountModal({ isOpen, account, onClose, onSubmit }) {
  const [form, setForm] = useState({ account_name: '', type: 'EXPENSE', is_active: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen && account) {
      setForm({
        account_name: account.account_name || account.name || '',
        type: account.type || 'EXPENSE',
        is_active: account.is_active !== undefined ? Boolean(account.is_active) : true
      });
      setError('');
    }
  }, [isOpen, account]);

  if (!isOpen || !account) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.account_name.trim()) { setError('Account name is required.'); return; }

    setLoading(true);
    try {
      await onSubmit(account.account_code || account.code, {
        account_name: form.account_name.trim(),
        type: form.type,
        is_active: form.is_active
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card" style={{ maxWidth: 450 }}>
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: '#F1F5F9', color: '#334155' }}>
              <Pencil style={{ width: 18, height: 18 }} />
            </div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Edit Account Option ({account.account_code || account.code})</h3>
              <p style={{ fontWeight: 400, fontSize: '0.78rem' }}>Rename account or toggle dropdown visibility</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 24px' }}>
          {error && (
            <div className="form-alert form-alert--error" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400 }}>
              <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0, color: '#DC2626' }} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 }}>Display Name / Option Label *</label>
            <input
              type="text"
              required
              value={form.account_name}
              onChange={e => setForm({ ...form, account_name: e.target.value })}
              style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 400 }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 }}>Account Category *</label>
            <SharedDropdown
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              options={ACCOUNT_TYPES.map(t => ({ value: t.key, label: t.label }))}
            />
          </div>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155', cursor: 'pointer', marginTop: 4, fontWeight: 400 }}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
              style={{ borderRadius: 4, cursor: 'pointer' }}
            />
            <span>Active & Visible in Voucher Dropdowns</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ background: 'var(--brand-primary, #15803D)', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ChartOfAccountsMasterView({
  chartOfAccounts = [],
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount
}) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [deleteAccountTarget, setDeleteAccountTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const filteredAccounts = useMemo(() => {
    return chartOfAccounts.filter(a => {
      if (typeFilter !== 'ALL' && a.type !== typeFilter) return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const code = (a.account_code || a.code || '').toLowerCase();
      const name = (a.name_key ? t(a.name_key) : (a.account_name || a.name || '')).toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [chartOfAccounts, typeFilter, searchQuery, t]);

  const handleToggleActive = async (account) => {
    const code = account.account_code || account.code;
    const currentActive = account.is_active !== undefined ? Boolean(account.is_active) : true;
    try {
      await onUpdateAccount(code, { is_active: !currentActive });
    } catch {
      // Ignore error
    }
  };

  const handleDelete = async () => {
    if (!deleteAccountTarget) return;
    const code = deleteAccountTarget.account_code || deleteAccountTarget.code;
    setDeleteError('');
    try {
      await onDeleteAccount(code);
      setDeleteAccountTarget(null);
    } catch (err) {
      setDeleteError(err?.response?.data?.message || err?.message || 'Failed to delete account option.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="active-loans-header">
        <div className="header-left">
          <div className="header-badge-icon" style={{ background: '#F1F5F9', borderColor: '#CBD5E1', color: '#334155' }}>
            <BookOpen style={{ width: 20, height: 20 }} />
          </div>
          <div className="header-text">
            <h1 style={{ fontWeight: 600, fontSize: '1.25rem' }}>Chart of Accounts Master</h1>
            <p style={{ fontWeight: 400, fontSize: '0.78rem' }}>Manage, edit, add, or hide transaction account options in manual vouchers</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            onClick={() => setCreateModalOpen(true)}
            style={{
              background: 'var(--brand-primary, #15803D)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              padding: '9px 16px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Plus style={{ width: 15, height: 15 }} />
            <span>New Account Option</span>
          </button>
        </div>
      </div>

      <div className="fin-filterbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
          <div className="fin-field" style={{ width: '100%', maxWidth: 280 }}>
            <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500 }}>Category Filter</label>
            <SharedDropdown
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              size="sm"
              buttonStyle={{ height: 36, width: '100%' }}
              options={[
                { value: 'ALL', label: 'All Categories' },
                ...ACCOUNT_TYPES.map(t => ({ value: t.key, label: t.label }))
              ]}
            />
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
          <Search style={{ position: 'absolute', left: 10, top: 11, width: 14, height: 14, color: '#94A3B8', pointerEvents: 'none' }} />
          <input
            type="text"
            className="fin-input"
            style={{ paddingLeft: 30, height: 36, width: '100%', fontSize: '0.78rem', fontWeight: 400, boxSizing: 'border-box' }}
            placeholder="Search account code or name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="loans-table-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A' }}>Transaction Account Options List</span>
        </div>

        <div className="fin-table-scroll">
          <table className="fin-grid-table" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ width: 90, fontWeight: 600 }}>Code</th>
                <th style={{ minWidth: 200, fontWeight: 600 }}>Account Option Name</th>
                <th style={{ width: 120, fontWeight: 600 }}>Category</th>
                <th style={{ width: 120, textAlign: 'center', fontWeight: 600 }}>Voucher Status</th>
                <th style={{ width: 120, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: 32, color: '#94A3B8', fontWeight: 400 }}>
                    No matching account options found.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map(acc => {
                  const code = acc.account_code || acc.code;
                  const name = acc.name_key ? t(acc.name_key) : (acc.account_name || acc.name);
                  const typeMeta = ACCOUNT_TYPES.find(t => t.key === acc.type);
                  const isActive = acc.is_active !== undefined ? Boolean(acc.is_active) : true;

                  return (
                    <tr key={code}>
                      <td><code style={{ fontWeight: 500, color: '#0F172A', background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, fontSize: '0.78rem' }}>{code}</code></td>
                      <td><span style={{ fontWeight: 500, color: '#0F172A', fontSize: '0.82rem' }}>{name}</span></td>
                      <td>
                        {typeMeta ? (
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: typeMeta.bg, color: typeMeta.color, border: `1px solid ${typeMeta.border}` }}>
                            {typeMeta.key}
                          </span>
                        ) : acc.type}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 20,
                          background: isActive ? '#F0FDF4' : '#FEF2F2',
                          color: isActive ? '#15803D' : '#DC2626',
                          border: `1px solid ${isActive ? '#BBF7D0' : '#FECACA'}`
                        }}>
                          {isActive ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap', width: 120 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => setEditAccount(acc)}
                            title="Edit / Rename Account Option"
                            style={{ width: 30, height: 30, flexShrink: 0, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                          >
                            <Pencil style={{ width: 14, height: 14, flexShrink: 0 }} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(acc)}
                            title={isActive ? 'Hide from Dropdowns' : 'Show in Dropdowns'}
                            style={{
                              width: 30,
                              height: 30,
                              flexShrink: 0,
                              border: `1px solid ${isActive ? '#FECACA' : '#BBF7D0'}`,
                              background: isActive ? '#FEF2F2' : '#F0FDF4',
                              color: isActive ? '#DC2626' : '#15803D',
                              borderRadius: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            {isActive ? <EyeOff style={{ width: 14, height: 14, flexShrink: 0 }} /> : <Eye style={{ width: 14, height: 14, flexShrink: 0 }} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDeleteAccountTarget(acc); setDeleteError(''); }}
                            title="Delete Account Option"
                            style={{ width: 30, height: 30, flexShrink: 0, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                          >
                            <Trash2 style={{ width: 14, height: 14, flexShrink: 0 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateAccountModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={onCreateAccount}
      />
      <EditAccountModal
        isOpen={Boolean(editAccount)}
        account={editAccount}
        onClose={() => setEditAccount(null)}
        onSubmit={onUpdateAccount}
      />

      {deleteAccountTarget && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card" style={{ maxWidth: 420 }}>
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                  <Trash2 style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3 style={{ fontWeight: 600 }}>Delete Account Option</h3>
                  <p>Permanently remove account head</p>
                </div>
              </div>
              <button onClick={() => setDeleteAccountTarget(null)} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {deleteError && (
                <div className="form-alert form-alert--error" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0, color: '#DC2626' }} />
                  <span>{deleteError}</span>
                </div>
              )}
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>
                Are you sure you want to delete <strong>{deleteAccountTarget.account_name || deleteAccountTarget.name} ({deleteAccountTarget.account_code || deleteAccountTarget.code})</strong>?
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setDeleteAccountTarget(null)} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                <button type="button" onClick={handleDelete} style={{ background: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Delete Account</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
