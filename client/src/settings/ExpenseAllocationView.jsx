import React, { useState } from 'react';
import {
  Wallet, Plus, Trash2, Pencil, X, AlertTriangle,
  ArrowUpCircle, Siren, History
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

const inputStyle = { width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 500 };
const labelStyle = { fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 };
const fmt = n => Number(n || 0).toLocaleString('en-IN');
const fmtDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

function useRequestTypeMeta() {
  const { t } = useLanguage();
  return {
    INITIAL: { label: t('exp.req_type.initial'), bg: 'var(--color-info-light, #EFF6FF)', color: 'var(--color-info, #2563EB)', border: 'var(--color-info-border, #BFDBFE)' },
    TOPUP: { label: t('exp.req_type.topup'), bg: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary, #15803D)', border: 'var(--brand-primary-border, #A3F5C1)' },
    EMERGENCY: { label: t('exp.req_type.emergency'), bg: 'var(--color-danger-light, #FEF2F2)', color: 'var(--color-danger, #DC2626)', border: 'var(--color-danger-border, #FCA5A5)' }
  };
}

function StatusBadge({ meta }) {
  if (!meta) return null;
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
      {meta.label}
    </span>
  );
}

// Labeled field row for the History modal — structured data, not narrative sentences.
function HistoryField({ label, value, valueColor, span2 }) {
  return (
    <div style={{ gridColumn: span2 ? '1 / -1' : 'auto' }}>
      <div style={{ fontSize: '0.64rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.8rem', color: valueColor || '#1E293B', fontWeight: 500, wordBreak: 'break-word' }}>{value || '—'}</div>
    </div>
  );
}

// Create a new expense account — funded and spendable the moment it's created, no
// separate approval step.
function CreateAccountModal({ isOpen, onClose, onSubmit }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: '', amount: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) { setForm({ name: '', amount: '', reason: '' }); setError(''); }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.amount || Number(form.amount) <= 0) return;
    setLoading(true);
    setError('');
    try {
      await onSubmit({ name: form.name.trim(), amount: Number(form.amount), reason: form.reason.trim() });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create expense account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card" style={{ maxWidth: 460 }}>
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary, #15803D)' }}><Wallet style={{ width: 18, height: 18 }} /></div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600 }}>{t('exp.create.title')}</h3>
              <p>{t('exp.create.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
          {error && <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{error}</span></div>}
          <div>
            <label style={labelStyle}>{t('exp.create.name_label')}</label>
            <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Food Expense" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('exp.create.amount_label')}</label>
            <input type="number" min="1" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="2000" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('exp.create.reason_label')}</label>
            <input type="text" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="What this account will be used for" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>{t('btn.cancel')}</button>
            <button type="submit" disabled={loading} style={{ background: 'var(--brand-primary, #15803D)', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? t('exp.create.submitting') : t('exp.create.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add more funds to an existing account — either a routine top-up or an emergency
// request; both credit the balance immediately, tagged for the history log only.
function RequestFundsModal({ isOpen, account, onClose, onSubmit }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ type: 'TOPUP', amount: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) { setForm({ type: 'TOPUP', amount: '', reason: '' }); setError(''); }
  }, [isOpen, account]);

  if (!isOpen || !account) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return;
    if (form.type === 'EMERGENCY' && !form.reason.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onSubmit({ category_id: account.id, type: form.type, amount: Number(form.amount), reason: form.reason.trim() });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to add funds.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card" style={{ maxWidth: 460 }}>
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: 'var(--color-warning-light, #FFFBEB)', color: 'var(--color-warning, #D97706)' }}><ArrowUpCircle style={{ width: 18, height: 18 }} /></div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600 }}>{t('exp.fund.title')} {account.name}</h3>
              <p>{t('exp.fund.current_balance')} ₹{fmt(account.balance)}</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
          {error && <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{error}</span></div>}
          <div>
            <label style={labelStyle}>{t('exp.fund.request_type')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'TOPUP' })}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                  border: form.type === 'TOPUP' ? '1px solid var(--brand-primary, #15803D)' : '1px solid #CBD5E1',
                  background: form.type === 'TOPUP' ? 'var(--brand-primary, #15803D)' : '#FFFFFF',
                  color: form.type === 'TOPUP' ? '#FFFFFF' : '#334155'
                }}
              >
                {t('exp.req_type.topup')}
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'EMERGENCY' })}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                  border: form.type === 'EMERGENCY' ? '1px solid var(--color-danger, #DC2626)' : '1px solid #CBD5E1',
                  background: form.type === 'EMERGENCY' ? 'var(--color-danger, #DC2626)' : '#FFFFFF',
                  color: form.type === 'EMERGENCY' ? '#FFFFFF' : '#334155',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5
                }}
              >
                <Siren style={{ width: 12, height: 12 }} /> {t('exp.req_type.emergency')}
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t('exp.fund.amount_label')}</label>
            <input type="number" min="1" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="1000" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('exp.fund.reason_label')}{form.type === 'EMERGENCY' ? ' *' : ''}</label>
            <input
              type="text" required={form.type === 'EMERGENCY'} value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              placeholder={form.type === 'EMERGENCY' ? t('exp.fund.reason_required_hint') : t('exp.fund.reason_optional_hint')}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>{t('btn.cancel')}</button>
            <button type="submit" disabled={loading} style={{ background: 'var(--color-warning, #D97706)', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? t('exp.create.submitting') : t('exp.fund.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RenameAccountModal({ isOpen, account, onClose, onSubmit }) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen && account) { setName(account.name); setError(''); }
  }, [isOpen, account]);

  if (!isOpen || !account) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onSubmit(account.id, { name: name.trim() });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to rename account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card" style={{ maxWidth: 420 }}>
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: '#F1F5F9', color: '#334155' }}><Pencil style={{ width: 18, height: 18 }} /></div>
            <div className="head-titles"><h3 style={{ fontWeight: 600 }}>{t('exp.rename.title')}</h3></div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
          {error && <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{error}</span></div>}
          <div>
            <label style={labelStyle}>{t('exp.rename.name_label')}</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>{t('btn.cancel')}</button>
            <button type="submit" disabled={loading} style={{ background: 'var(--brand-primary, #15803D)', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? t('form.saving') : t('exp.rename.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Full chronological funding log for one account: every time money was added
// (INITIAL/TOPUP/EMERGENCY), by whom, when, and why — applied the moment it happened,
// no approval step to show.
function AccountHistoryModal({ isOpen, account, requests, onClose }) {
  const REQUEST_TYPE_META = useRequestTypeMeta();
  if (!isOpen || !account) return null;

  const history = requests
    .filter(r => r.category_id === account.id)
    .sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at));

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card" style={{ maxWidth: 560 }}>
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: '#F1F5F9', color: '#334155' }}><History style={{ width: 18, height: 18 }} /></div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600 }}>History — {account.name}</h3>
              <p>Balance ₹{fmt(account.balance)} of ₹{fmt(account.allocated_total)} ever funded</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <div style={{ padding: '16px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#94A3B8', fontSize: '0.82rem' }}>No funding recorded for this account yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.map(r => (
                <div key={r.id} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                    <StatusBadge meta={REQUEST_TYPE_META[r.type]} />
                    <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>₹{fmt(r.amount)}</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 8, columnGap: 12 }}>
                    <HistoryField label="Added By" value={r.requested_by} />
                    <HistoryField label="Added On" value={fmtDateTime(r.requested_at)} />
                    {r.reason && <HistoryField label="Reason" value={r.reason} span2 />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="saas-modal-footer">
          <button type="button" onClick={onClose} className="btn-cancel">Close</button>
        </div>
      </div>
    </div>
  );
}

export default function ExpenseAllocationView({
  expenseCategories = [],
  onCreateExpenseCategory, onUpdateExpenseCategory, onDeleteExpenseCategory,
  expenseAllocationRequests = [],
  onAddExpenseFunds
}) {
  const { t } = useLanguage();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [fundAccount, setFundAccount] = useState(null);
  const [renameAccount, setRenameAccount] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [historyAccount, setHistoryAccount] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="active-loans-header">
        <div className="header-left">
          <div className="header-badge-icon" style={{ background: '#F1F5F9', borderColor: '#CBD5E1', color: '#334155' }}>
            <Wallet style={{ width: 20, height: 20 }} />
          </div>
          <div className="header-text">
            <h1 style={{ fontWeight: 600 }}>{t('exp.title')}</h1>
            <p style={{ fontWeight: 400 }}>{t('exp.subtitle')}</p>
          </div>
        </div>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setCreateModalOpen(true)} style={{ background: 'var(--brand-primary, #15803D)', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus style={{ width: 15, height: 15 }} /><span>{t('exp.new_account')}</span>
          </button>
        </div>
      </div>

      <div className="loans-table-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wallet style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A' }}>Expense Accounts</span>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: 50, textAlign: 'center' }}>{t('col.sno')}</th>
                <th>{t('col.account_name')}</th>
                <th style={{ textAlign: 'right' }}>{t('col.balance')}</th>
                <th style={{ textAlign: 'right' }}>{t('col.total_allocated')}</th>
                <th style={{ textAlign: 'right' }}>{t('col.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {expenseCategories.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>No expense accounts yet.</td></tr>
              ) : expenseCategories.map((c, idx) => (
                <tr key={c.id}>
                  <td style={{ textAlign: 'center', color: '#64748B' }}>{idx + 1}</td>
                  <td><strong style={{ fontWeight: 600, color: '#0F172A' }}>{c.name}</strong></td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: c.balance > 0 ? 'var(--brand-primary, #15803D)' : 'var(--color-danger, #DC2626)' }}>₹{fmt(c.balance)}</td>
                  <td style={{ textAlign: 'right', color: '#64748B' }}>₹{fmt(c.allocated_total)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => setFundAccount(c)}
                        title="Add Funds"
                        style={{
                          border: '1px solid var(--color-warning-border, #FDE68A)', background: 'var(--color-warning-light, #FFFBEB)', color: 'var(--color-warning, #D97706)', borderRadius: 7,
                          padding: '6px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                          fontSize: '0.76rem', fontWeight: 600
                        }}
                      >
                        <ArrowUpCircle style={{ width: 16, height: 16 }} />
                        <span>Add Funds</span>
                      </button>
                      <button onClick={() => setHistoryAccount(c)} title="View History" style={{ border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', borderRadius: 7, padding: '6px', cursor: 'pointer', display: 'inline-flex' }}>
                        <History style={{ width: 16, height: 16 }} />
                      </button>
                      <button onClick={() => setRenameAccount(c)} title="Rename" style={{ border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', borderRadius: 7, padding: '6px', cursor: 'pointer', display: 'inline-flex' }}>
                        <Pencil style={{ width: 16, height: 16 }} />
                      </button>
                      <button onClick={() => { setDeleteTarget(c); setDeleteError(''); }} title="Delete" style={{ border: 'none', background: 'var(--color-danger-light, #FEE2E2)', color: 'var(--color-danger, #DC2626)', borderRadius: 7, padding: '6px', cursor: 'pointer', display: 'inline-flex' }}>
                        <Trash2 style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateAccountModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} onSubmit={onCreateExpenseCategory} />
      <AccountHistoryModal isOpen={Boolean(historyAccount)} account={historyAccount} requests={expenseAllocationRequests} onClose={() => setHistoryAccount(null)} />
      <RequestFundsModal isOpen={Boolean(fundAccount)} account={fundAccount} onClose={() => setFundAccount(null)} onSubmit={onAddExpenseFunds} />
      <RenameAccountModal isOpen={Boolean(renameAccount)} account={renameAccount} onClose={() => setRenameAccount(null)} onSubmit={onUpdateExpenseCategory} />

      {deleteTarget && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card">
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: 'var(--color-danger-light, #FEF2F2)', borderColor: 'var(--color-danger-border, #FECACA)', color: 'var(--color-danger, #DC2626)' }}>
                  <Trash2 style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>Delete Expense Account</h3>
                  <p>This action cannot be undone</p>
                </div>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="close-btn" type="button" disabled={deleteLoading}><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="saas-modal-body">
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong>?</p>
              {deleteError && <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{deleteError}</span></div>}
            </div>
            <div className="saas-modal-footer">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleteLoading} className="btn-cancel">Cancel</button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={async () => {
                  if (deleteLoading) return;
                  setDeleteLoading(true);
                  setDeleteError('');
                  try {
                    await onDeleteExpenseCategory(deleteTarget.id);
                    setDeleteTarget(null);
                  } catch (err) {
                    setDeleteError(err?.response?.data?.message || err.message || 'Unable to delete this account.');
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
                className="btn-submit"
                style={{ background: deleteLoading ? '#94A3B8' : 'var(--color-danger, #DC2626)', boxShadow: deleteLoading ? 'none' : '0 2px 6px rgba(var(--color-danger-rgb), 0.3)', cursor: deleteLoading ? 'not-allowed' : 'pointer' }}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
