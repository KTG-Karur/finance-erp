import React, { useState } from 'react';
import {
  Wallet, Plus, Trash2, Pencil, X, AlertTriangle, CheckCircle2, XCircle,
  ArrowUpCircle, Siren, History, Inbox
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

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
    INITIAL: { label: t('exp.req_type.initial'), bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
    TOPUP: { label: t('exp.req_type.topup'), bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
    EMERGENCY: { label: t('exp.req_type.emergency'), bg: '#FEF2F2', color: '#DC2626', border: '#FCA5A5' }
  };
}

function useStatusMeta() {
  const { tStatus } = useLanguage();
  return {
    PENDING: { label: tStatus('PENDING_APPROVAL'), bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
    APPROVED: { label: tStatus('APPROVED'), bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
    REJECTED: { label: tStatus('REJECTED'), bg: '#FEF2F2', color: '#DC2626', border: '#FCA5A5' }
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

// Create a new expense account — submitting IS the "request approval" step: it creates
// the account (PENDING, zero balance) and its INITIAL allocation request in one go.
function CreateAccountModal({ isOpen, onClose, onSubmit }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: '', amount: '', reason: '' });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) setForm({ name: '', amount: '', reason: '' });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.amount || Number(form.amount) <= 0) return;
    setLoading(true);
    try {
      await onSubmit({ name: form.name.trim(), amount: Number(form.amount), reason: form.reason.trim() });
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
            <div className="head-icon-badge" style={{ background: '#ECFDF5', color: '#059669' }}><Wallet style={{ width: 18, height: 18 }} /></div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600 }}>{t('exp.create.title')}</h3>
              <p>{t('exp.create.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
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
            <button type="submit" disabled={loading} style={{ background: '#059669', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? t('exp.create.submitting') : t('exp.create.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Request more funds for an already-ACTIVE account — either a routine top-up or an
// emergency request, both go through admin approval before the balance is credited.
function RequestFundsModal({ isOpen, account, onClose, onSubmit }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ type: 'TOPUP', amount: '', reason: '' });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) setForm({ type: 'TOPUP', amount: '', reason: '' });
  }, [isOpen, account]);

  if (!isOpen || !account) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return;
    if (form.type === 'EMERGENCY' && !form.reason.trim()) return;
    setLoading(true);
    try {
      await onSubmit({ category_id: account.id, type: form.type, amount: Number(form.amount), reason: form.reason.trim() });
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
            <div className="head-icon-badge" style={{ background: '#FFFBEB', color: '#D97706' }}><ArrowUpCircle style={{ width: 18, height: 18 }} /></div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600 }}>{t('exp.fund.title')} {account.name}</h3>
              <p>{t('exp.fund.current_balance')} ₹{fmt(account.balance)}</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
          <div>
            <label style={labelStyle}>{t('exp.fund.request_type')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'TOPUP' })}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                  border: form.type === 'TOPUP' ? '1px solid #059669' : '1px solid #CBD5E1',
                  background: form.type === 'TOPUP' ? '#059669' : '#FFFFFF',
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
                  border: form.type === 'EMERGENCY' ? '1px solid #DC2626' : '1px solid #CBD5E1',
                  background: form.type === 'EMERGENCY' ? '#DC2626' : '#FFFFFF',
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
            <button type="submit" disabled={loading} style={{ background: '#D97706', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
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

  React.useEffect(() => {
    if (isOpen && account) setName(account.name);
  }, [isOpen, account]);

  if (!isOpen || !account) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSubmit(account.id, { name: name.trim() });
      onClose();
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
          <div>
            <label style={labelStyle}>{t('exp.rename.name_label')}</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>{t('btn.cancel')}</button>
            <button type="submit" disabled={loading} style={{ background: '#059669', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? t('form.saving') : t('exp.rename.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RejectRequestModal({ isOpen, request, onClose, onSubmit }) {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [justRejected, setJustRejected] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setReason('');
      setJustRejected(false);
    }
  }, [isOpen, request]);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await onSubmit(request.id, reason.trim());
      setLoading(false);
      setJustRejected(true);
      setTimeout(onClose, 650);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card" style={{ maxWidth: 420 }}>
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: '#FEF2F2', color: '#DC2626' }}><XCircle style={{ width: 18, height: 18 }} /></div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600 }}>{t('exp.reject.title')}</h3>
              <p>{request.category_name} · ₹{fmt(request.amount)}</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        {justRejected ? (
          <div style={{ padding: '36px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: '#FEF2F2', border: '1px solid #FCA5A5',
              color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'scaleIn 0.3s ease-out'
            }}>
              <XCircle style={{ width: 26, height: 26 }} />
            </div>
            <strong style={{ fontSize: '0.88rem', color: '#0F172A', animation: 'fadeIn 0.3s ease-out' }}>{t('exp.reject.rejected')}</strong>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
            <div>
              <label style={labelStyle}>{t('exp.reject.reason_label')}</label>
              <input type="text" required value={reason} onChange={e => setReason(e.target.value)} placeholder={t('exp.reject.reason_placeholder')} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>{t('btn.cancel')}</button>
              <button type="submit" disabled={loading} style={{ background: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                {loading ? t('exp.reject.rejecting') : t('exp.reject.submit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Full chronological log for one account: every request it ever had (INITIAL/TOPUP/
// EMERGENCY), when it was raised, and — once resolved — when and by whom.
function AccountHistoryModal({ isOpen, account, requests, onClose }) {
  const REQUEST_TYPE_META = useRequestTypeMeta();
  const STATUS_META = useStatusMeta();
  if (!isOpen || !account) return null;

  const history = requests
    .filter(r => r.category_id === account.id)
    .sort((a, b) => new Date(a.requested_at) - new Date(b.requested_at));

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card" style={{ maxWidth: 560 }}>
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: '#F1F5F9', color: '#334155' }}><History style={{ width: 18, height: 18 }} /></div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600 }}>History — {account.name}</h3>
              <p>Balance ₹{fmt(account.balance)} of ₹{fmt(account.allocated_total)} ever allocated</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <div style={{ padding: '16px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#94A3B8', fontSize: '0.82rem' }}>No requests recorded for this account yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.map(r => {
                const typeMeta = REQUEST_TYPE_META[r.type];
                return (
                  <div key={r.id} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <StatusBadge meta={typeMeta} />
                        <StatusBadge meta={STATUS_META[r.status]} />
                      </div>
                      <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>₹{fmt(r.amount)}</strong>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 8, columnGap: 12 }}>
                      <HistoryField label="Requested By" value={r.requested_by} />
                      <HistoryField label="Requested On" value={fmtDateTime(r.requested_at)} />
                      {r.reason && <HistoryField label="Reason" value={r.reason} span2 />}

                      {r.status === 'APPROVED' && (
                        <>
                          <HistoryField label="Approved By" value={r.approved_by} valueColor="#059669" />
                          <HistoryField label="Approved On" value={fmtDateTime(r.approved_at)} valueColor="#059669" />
                        </>
                      )}
                      {r.status === 'REJECTED' && (
                        <>
                          <HistoryField label="Rejected By" value={r.approved_by || 'Admin'} valueColor="#DC2626" />
                          <HistoryField label="Rejected On" value={fmtDateTime(r.approved_at)} valueColor="#DC2626" />
                          <HistoryField label="Rejection Reason" value={r.rejection_reason} valueColor="#DC2626" span2 />
                        </>
                      )}
                      {r.status === 'PENDING' && (
                        <HistoryField label="Status" value="Awaiting admin approval" valueColor="#D97706" span2 />
                      )}
                    </div>
                  </div>
                );
              })}
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

// All allocation requests across every account — the admin approval queue, opened from
// the header's request box instead of living as a permanent on-page panel.
function RequestsModal({ isOpen, requests, onClose, onApprove, onReject }) {
  const REQUEST_TYPE_META = useRequestTypeMeta();
  const STATUS_META = useStatusMeta();
  const [approvingId, setApprovingId] = useState(null);

  React.useEffect(() => {
    if (isOpen) setApprovingId(null);
  }, [isOpen]);

  if (!isOpen) return null;

  // Only PENDING requests show here — once approved/rejected, a request drops out of
  // this queue automatically. Full history (including resolved requests) still lives
  // in each account's History modal.
  const pending = requests
    .filter(r => r.status === 'PENDING')
    .sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at));

  const handleApproveClick = (r) => {
    setApprovingId(r.id);
    setTimeout(() => onApprove(r.id), 600);
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card" style={{ width: 480, maxWidth: 480, height: 560, display: 'flex', flexDirection: 'column' }}>
        <div className="saas-modal-header" style={{ flexShrink: 0 }}>
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: '#FFFBEB', color: '#D97706' }}><Inbox style={{ width: 18, height: 18 }} /></div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600 }}>Allocation Approval Requests</h3>
              <p>Review and act on expense account funding requests</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <div style={{ padding: '8px 24px', flex: 1, overflowY: 'auto' }}>
          {pending.length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>No pending requests — all caught up.</div>
          ) : pending.map(r => {
            const isApproving = approvingId === r.id;
            return (
              <div key={r.id} style={{ padding: '14px 0', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>{r.category_name}</strong>
                  <strong style={{ fontSize: '0.85rem', color: '#334155' }}>₹{fmt(r.amount)}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <StatusBadge meta={REQUEST_TYPE_META[r.type]} />
                  <StatusBadge meta={STATUS_META[r.status]} />
                </div>
                {r.reason && <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: 6 }}>"{r.reason}"</div>}
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 6 }}>{r.requested_by} · {fmtDateTime(r.requested_at)}</div>
                {isApproving ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', background: '#ECFDF5', border: '1px solid #A7F3D0',
                      color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      animation: 'scaleIn 0.3s ease-out'
                    }}>
                      <CheckCircle2 style={{ width: 16, height: 16 }} />
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#059669' }}>Approved</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      onClick={() => handleApproveClick(r)}
                      style={{ flex: 1, border: 'none', background: '#059669', color: '#FFFFFF', borderRadius: 6, padding: '7px 0', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                    >
                      <CheckCircle2 style={{ width: 16, height: 16 }} /> Approve
                    </button>
                    <button
                      onClick={() => onReject(r)}
                      style={{ flex: 1, border: 'none', background: '#DC2626', color: '#FFFFFF', borderRadius: 6, padding: '7px 0', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                    >
                      <XCircle style={{ width: 16, height: 16 }} /> Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="saas-modal-footer" style={{ flexShrink: 0 }}>
          <button type="button" onClick={onClose} className="btn-cancel">Close</button>
        </div>
      </div>
    </div>
  );
}

export default function ExpenseAllocationView({
  user,
  expenseCategories = [],
  onCreateExpenseCategory, onUpdateExpenseCategory, onDeleteExpenseCategory,
  expenseAllocationRequests = [],
  onRequestExpenseAllocation, onApproveExpenseAllocation, onRejectExpenseAllocation
}) {
  const { t } = useLanguage();
  const REQUEST_TYPE_META = useRequestTypeMeta();
  const STATUS_META = useStatusMeta();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [fundAccount, setFundAccount] = useState(null);
  const [renameAccount, setRenameAccount] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [historyAccount, setHistoryAccount] = useState(null);
  const [requestBoxOpen, setRequestBoxOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const pendingRequestForCategory = (categoryId) =>
    expenseAllocationRequests.find(r => r.category_id === categoryId && r.status === 'PENDING');

  const pendingCount = expenseAllocationRequests.filter(r => r.status === 'PENDING').length;

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
          {isAdmin && (
            <button
              onClick={() => setRequestBoxOpen(true)}
              title="Allocation Approval Requests"
              style={{
                position: 'relative', background: '#FFFFFF', color: '#334155', border: '1px solid #CBD5E1',
                borderRadius: 8, width: 38, height: 38, cursor: 'pointer', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center'
              }}
            >
              <Inbox style={{ width: 17, height: 17 }} />
              {pendingCount > 0 && (
                <span style={{
                  position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 20,
                  background: '#DC2626', color: '#FFFFFF', fontSize: '0.62rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                  border: '2px solid #FFFFFF'
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
          )}
          <button onClick={() => setCreateModalOpen(true)} style={{ background: '#059669', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus style={{ width: 15, height: 15 }} /><span>{t('exp.new_account')}</span>
          </button>
        </div>
      </div>

      {/* Expense Accounts — always full width now that approvals live in the header request box */}
      <div>

        <div className="loans-table-card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wallet style={{ width: 16, height: 16, color: '#059669' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A' }}>Expense Accounts</span>
          </div>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 50, textAlign: 'center' }}>{t('col.sno')}</th>
                  <th>{t('col.account_name')}</th>
                  <th style={{ textAlign: 'center' }}>{t('col.status')}</th>
                  <th style={{ textAlign: 'right' }}>{t('col.balance')}</th>
                  <th style={{ textAlign: 'right' }}>{t('col.total_allocated')}</th>
                  <th style={{ textAlign: 'right' }}>{t('col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {expenseCategories.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>No expense accounts yet.</td></tr>
                ) : expenseCategories.map((c, idx) => {
                  const pendingReq = pendingRequestForCategory(c.id);
                  return (
                    <tr key={c.id}>
                      <td style={{ textAlign: 'center', color: '#64748B' }}>{idx + 1}</td>
                      <td><strong style={{ fontWeight: 600, color: '#0F172A' }}>{c.name}</strong></td>
                      <td style={{ textAlign: 'center' }}>
                        <StatusBadge meta={c.status === 'ACTIVE' ? STATUS_META.APPROVED : c.status === 'REJECTED' ? STATUS_META.REJECTED : STATUS_META.PENDING} />
                        {pendingReq && c.status === 'ACTIVE' && (
                          <div style={{ marginTop: 4 }}><StatusBadge meta={REQUEST_TYPE_META[pendingReq.type]} /></div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: c.balance > 0 ? '#059669' : '#DC2626' }}>₹{fmt(c.balance)}</td>
                      <td style={{ textAlign: 'right', color: '#64748B' }}>₹{fmt(c.allocated_total)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          {c.status === 'ACTIVE' && !pendingReq && (
                            <button
                              onClick={() => setFundAccount(c)}
                              title="Request Funds"
                              style={{
                                border: '1px solid #FDE68A', background: '#FFFBEB', color: '#D97706', borderRadius: 7,
                                padding: '6px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                                fontSize: '0.76rem', fontWeight: 600
                              }}
                            >
                              <ArrowUpCircle style={{ width: 16, height: 16 }} />
                              <span>Top-up</span>
                            </button>
                          )}
                          <button onClick={() => setHistoryAccount(c)} title="View History" style={{ border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', borderRadius: 7, padding: '6px', cursor: 'pointer', display: 'inline-flex' }}>
                            <History style={{ width: 16, height: 16 }} />
                          </button>
                          {c.status !== 'REJECTED' && (
                            <button onClick={() => setRenameAccount(c)} title="Rename" style={{ border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', borderRadius: 7, padding: '6px', cursor: 'pointer', display: 'inline-flex' }}>
                              <Pencil style={{ width: 16, height: 16 }} />
                            </button>
                          )}
                          <button onClick={() => { setDeleteTarget(c); setDeleteError(''); }} title="Delete" style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', borderRadius: 7, padding: '6px', cursor: 'pointer', display: 'inline-flex' }}>
                            <Trash2 style={{ width: 16, height: 16 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <CreateAccountModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} onSubmit={onCreateExpenseCategory} />
      <AccountHistoryModal isOpen={Boolean(historyAccount)} account={historyAccount} requests={expenseAllocationRequests} onClose={() => setHistoryAccount(null)} />
      <RequestFundsModal isOpen={Boolean(fundAccount)} account={fundAccount} onClose={() => setFundAccount(null)} onSubmit={onRequestExpenseAllocation} />
      <RenameAccountModal isOpen={Boolean(renameAccount)} account={renameAccount} onClose={() => setRenameAccount(null)} onSubmit={onUpdateExpenseCategory} />
      {/* RequestsModal must render before RejectRequestModal so the reject reason box
          (opened from within it) stacks visually on top, not hidden behind it. */}
      <RequestsModal
        isOpen={requestBoxOpen}
        requests={expenseAllocationRequests}
        onClose={() => setRequestBoxOpen(false)}
        onApprove={onApproveExpenseAllocation}
        onReject={(r) => setRejectTarget(r)}
      />
      <RejectRequestModal isOpen={Boolean(rejectTarget)} request={rejectTarget} onClose={() => setRejectTarget(null)} onSubmit={onRejectExpenseAllocation} />

      {deleteTarget && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card">
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' }}>
                  <Trash2 style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>Delete Expense Account</h3>
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
                onClick={() => {
                  try {
                    onDeleteExpenseCategory(deleteTarget.id);
                    setDeleteTarget(null);
                  } catch (err) {
                    setDeleteError(err.message || 'Unable to delete this account.');
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
