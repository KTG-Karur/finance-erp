import React, { useState, useMemo, useEffect } from 'react';
import { Calculator, Settings2, Pencil, ShieldCheck, Lock, Unlock, X, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { ACCOUNT_TYPES, computeAccountBalances, filterEntriesByBranch, filterEntriesUpTo } from '../../utils/accounting';
import SharedDropdown from '../../components/common/SharedDropdown';
import SharedDatePicker from '../../components/common/SharedDatePicker';

const DEFAULT_DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

function todayStr() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return '—';
  const cleanStr = String(dateStr).slice(0, 10);
  const parts = cleanStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function diffBadge(diff, t) {
  if (Math.round(diff * 100) === 0) return { label: t('fin.matched_badge'), cls: 'fin-badge--ok' };
  if (diff < 0) return { label: t('fin.short_badge'), cls: 'fin-badge--warn' };
  return { label: t('fin.excess_badge'), cls: 'fin-badge--warn' };
}

// One modal, three uses: CLOSE a fresh day, EDIT (recount) an existing one, or
// REVIEW a variance without touching the count — just acknowledge it with a note.
// Keeping them in one component means the denomination table and the live
// expected/counted/difference math only exist in one place.
function EODModal({ mode, isOpen, record, expectedCash, activeDenominations, onClose, onSubmit, t }) {
  const [counts, setCounts] = useState({});
  const [remarks, setRemarks] = useState('');
  const [reason, setReason] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    if (record) {
      const c = {};
      record.denominations.forEach(d => { c[d.value] = d.count; });
      setCounts(c);
      setRemarks(record.remarks || '');
    } else {
      setCounts({});
      setRemarks('');
    }
    setReason('');
    setResolutionNote('');
    setError('');
  }, [isOpen, record]);

  if (!isOpen) return null;

  const readOnly = mode === 'REVIEW';
  const countedCash = readOnly ? record.counted_cash : activeDenominations.reduce((s, v) => s + v * (Number(counts[v]) || 0), 0);
  const difference = readOnly ? record.difference : countedCash - expectedCash;
  const hasVariance = Math.round(difference * 100) !== 0;
  const badge = diffBadge(difference, t);
  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const titleKey = mode === 'CLOSE' ? 'fin.close_day_btn' : mode === 'EDIT' ? 'fin.edit_closure_btn' : 'fin.review_variance_btn';

  const updateCount = (val, delta) => {
    if (readOnly) return;
    setCounts(prev => {
      const cur = Number(prev[val]) || 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [val]: next === 0 ? '' : next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'REVIEW') {
      if (!resolutionNote.trim()) { setError(t('fin.resolution_note_label') + ' *'); return; }
      setSaving(true);
      try {
        await onSubmit({ mode, resolution_note: resolutionNote });
        onClose();
      } catch (err) {
        setError(err?.message || 'Could not save.');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (activeDenominations.every(v => !counts[v])) {
      setError(t('fin.denomination_required_error'));
      return;
    }
    if (hasVariance && !remarks.trim()) {
      setError(t('fin.remarks_required_variance_hint'));
      return;
    }
    if (mode === 'EDIT' && !reason.trim()) {
      setError(t('fin.reopen_reason_label') + ' *');
      return;
    }

    const denominations = activeDenominations
      .map(v => ({ value: v, count: Number(counts[v]) || 0 }))
      .filter(d => d.count > 0);

    setSaving(true);
    try {
      await onSubmit({
        mode,
        denominations,
        counted_cash: countedCash,
        expected_cash: expectedCash,
        difference,
        remarks,
        reopen_reason: reason
      });
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not save this closure.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card" style={{ maxWidth: 680, width: '92vw', borderRadius: 14, overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        {/* Sleek Non-Bold Executive Header Banner */}
        <div style={{ background: '#072C15', padding: '16px 20px', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Calculator style={{ width: 16, height: 16, color: 'var(--brand-primary-border, #A3F5C1)' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 500, fontSize: '0.95rem', color: '#FFFFFF' }}>{t(titleKey)}</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--brand-primary-border, #A3F5C1)', opacity: 0.85, fontWeight: 400 }}>Physical Vault Cash Counter & Reconciliation</p>
            </div>
          </div>
          <button onClick={onClose} type="button" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFFFFF', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px', maxHeight: '80vh', overflowY: 'auto', background: '#FFFFFF' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, fontSize: '0.76rem', fontWeight: 500, background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', color: 'var(--color-danger-hover, #B91C1C)' }}>
              {error}
            </div>
          )}

          {/* Non-Bold Live Reconciliation Summary Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, background: '#F8FAFC', padding: '12px 16px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748B' }}>Expected Cash</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 500, color: '#0F172A' }}>₹{fmt(expectedCash)}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--brand-primary-hover, #0E5327)' }}>Counted Vault Cash</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--brand-primary-hover, #0E5327)' }}>₹{fmt(countedCash)}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748B' }}>Variance Status</span>
              <div>
                <span className={`fin-badge ${badge.cls}`} style={{ fontSize: '0.75rem', padding: '3px 9px', fontWeight: 500 }}>
                  {badge.label}{hasVariance ? ` (₹${fmt(Math.abs(difference))})` : ''}
                </span>
              </div>
            </div>
          </div>

          {mode === 'EDIT' && (
            <div className="fin-field">
              <label style={{ fontSize: '0.78rem', fontWeight: 500, color: '#334155' }}>{t('fin.reopen_reason_label')} *</label>
              <input type="text" className="fin-input" style={{ width: '100%', background: '#FFFFFF', fontWeight: 400 }} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}

          {/* Executive 2-Column Denomination Breakdown Panel */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 500, color: '#475569', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Physical Denomination Count</span>
              <span style={{ color: 'var(--brand-primary-hover, #0E5327)', fontWeight: 500 }}>Total Counted: ₹{fmt(countedCash)}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {activeDenominations.map(v => {
                const countVal = Number(counts[v]) || 0;
                const subtotal = v * countVal;

                return (
                  <div
                    key={v}
                    style={{
                      background: countVal > 0 ? 'var(--brand-primary-light, #F0FDF4)' : '#F8FAFC',
                      border: countVal > 0 ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                      borderRadius: 10,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Denomination Tag */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 65 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#1E293B' }}>₹{v}</span>
                      <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 400 }}>note</span>
                    </div>

                    {/* Stepper Count Input */}
                    {!readOnly ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => updateCount(v, -1)}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            color: '#475569',
                            fontSize: '0.8rem',
                            fontWeight: 400,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          className="fin-input"
                          style={{
                            width: 58,
                            textAlign: 'center',
                            padding: '4px 4px',
                            fontSize: '0.82rem',
                            fontWeight: 500,
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF'
                          }}
                          value={counts[v] ?? ''}
                          onChange={(e) => setCounts(prev => ({ ...prev, [v]: e.target.value }))}
                          placeholder="0"
                        />
                        <button
                          type="button"
                          onClick={() => updateCount(v, 1)}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            color: '#475569',
                            fontSize: '0.8rem',
                            fontWeight: 400,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#475569', fontWeight: 400, fontSize: '0.82rem' }}>Qty: {counts[v] || 0}</span>
                    )}

                    {/* Row Subtotal */}
                    <div style={{ textAlign: 'right', minWidth: 70 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, color: countVal > 0 ? 'var(--brand-primary-hover, #0E5327)' : '#94A3B8' }}>
                        ₹{fmt(subtotal)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {mode !== 'REVIEW' && (
            <div className="fin-field">
              <label style={{ fontSize: '0.78rem', fontWeight: 500, color: '#334155' }}>
                {t('fin.remarks_label')}{hasVariance ? ' (Required for Variance) *' : ' (Optional)'}
              </label>
              <input
                type="text"
                className="fin-input"
                style={{ width: '100%', background: '#FFFFFF', fontWeight: 400 }}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={hasVariance ? t('fin.remarks_required_variance_hint') : 'Add closing remarks...'}
              />
            </div>
          )}

          {mode === 'REVIEW' && (
            <div className="fin-field">
              <label style={{ fontSize: '0.78rem', fontWeight: 500, color: '#334155' }}>{t('fin.resolution_note_label')} *</label>
              <input type="text" className="fin-input" style={{ width: '100%', background: '#FFFFFF', fontWeight: 400 }} value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} />
            </div>
          )}

          {/* Modal Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#FFFFFF',
                color: '#475569',
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {t('fin.cancel_edit_btn')}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="fin-btn-primary"
              style={{
                background: 'var(--brand-primary-hover, #0E5327)',
                padding: '8px 20px',
                fontSize: '0.8rem',
                fontWeight: 500,
                borderRadius: 8
              }}
            >
              {saving
                ? t('fin.saving_closure')
                : mode === 'CLOSE'
                  ? (hasVariance ? t('fin.close_day_flag_btn') : t('fin.close_day_btn'))
                  : mode === 'EDIT'
                    ? t('fin.save_changes_btn')
                    : t('fin.mark_resolved_btn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// A closed day can't be edited directly by anyone but an admin — everyone else asks
// for a window with a reason, and waits for that admin to act on it.
function ReopenRequestModal({ isOpen, onClose, onSubmit, t }) {
  const [reason, setReason] = useState('');
  const [hours, setHours] = useState(1);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (isOpen) { setReason(''); setHours(1); setError(''); }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) { setError(t('fin.reopen_request_reason_required')); return; }
    setSaving(true);
    try {
      await onSubmit({ reason, hours: Number(hours) });
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not submit request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card">
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: 'var(--color-warning-light, #FFFBEB)', color: 'var(--color-warning-hover, #B45309)', border: '1px solid var(--color-warning-border, #FDE68A)' }}>
              <Unlock style={{ width: 16, height: 16 }} />
            </div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 500, fontSize: '0.98rem', color: '#0F172A' }}>{t('fin.request_reopen_btn')}</h3>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} className="saas-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 24px' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 9, fontSize: '0.75rem', fontWeight: 600, background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', color: 'var(--color-danger-hover, #B91C1C)' }}>
              {error}
            </div>
          )}
          <div className="fin-field">
            <label>{t('fin.reopen_duration_label')}</label>
            <SharedDropdown
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              options={[1, 2, 4, 8, 24].map(h => ({ value: h, label: `${h}${t('fin.hours_suffix')}` }))}
            />
          </div>
          <div className="fin-field">
            <label>{t('fin.reopen_request_reason_label')}</label>
            <input type="text" className="fin-input" style={{ width: '100%' }} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
              {t('fin.cancel_edit_btn')}
            </button>
            <button type="submit" disabled={saving} className="fin-btn-primary" style={{ background: 'var(--color-warning-hover, #B45309)' }}>
              {saving ? t('fin.saving_closure') : t('fin.submit_request_btn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Day-end cash closing: count the physical cash in the vault by denomination and
// compare it to what the ledger says should be there for that branch and day.
// A match closes the day outright. A mismatch still closes it — staff isn't
// blocked — but it's required to explain why, and the record is flagged Pending
// Review until an admin either corrects the count or acknowledges the variance
// with a resolution note. Nothing gets silently absorbed either way.
export default function EODProcessView({
  branchesList = [],
  journalEntries = [],
  chartOfAccounts = [],
  eodRecords = [],
  eodDenominationSettings = [],
  user,
  onCreateOpeningBalance,
  onCloseEodDay,
  onUpdateEodRecord,
  onResolveEodVariance,
  onGrantEodReopen,
  onRequestEodReopen,
  onApproveEodReopen,
  onRejectEodReopen,
  onUpdateEodDenominationSettings,
  selectedBranch = 'ALL'
}) {
  const { t } = useLanguage();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [activeMainTab, setActiveMainTab] = useState('DAY_CLOSING'); // 'DAY_CLOSING' | 'PAST_CLOSURES'
  const [branch, setBranch] = useState(() => (selectedBranch && selectedBranch !== 'ALL' ? selectedBranch : (user?.branch || user?.branch_name || user?.branchName || branchesList[0]?.name || '')));
  useEffect(() => {
    if (selectedBranch && selectedBranch !== 'ALL') {
      setBranch(selectedBranch);
    } else if (!branch && branchesList.length > 0) {
      setBranch(user?.branch || user?.branch_name || user?.branchName || branchesList[0]?.name || '');
    }
  }, [selectedBranch, branchesList, user, branch]);
  const hasBranchSelected = branch !== '';
  const [date, setDate] = useState(todayStr());
  const [showDenomSettings, setShowDenomSettings] = useState(false);
  const [modalState, setModalState] = useState(null); // { mode: 'CLOSE'|'EDIT'|'REVIEW', record }
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [reopenHours, setReopenHours] = useState(1);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [approveHours, setApproveHours] = useState(1);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Reopen windows expire on their own — nothing re-locks them programmatically,
  // it's just that `now` moves past `expires_at`. This tick exists purely so the
  // countdown/lock badge updates itself on screen without needing a page refresh.
  const [, setNowTick] = useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setNowTick(n => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const denomSettings = eodDenominationSettings.length
    ? eodDenominationSettings
    : DEFAULT_DENOMINATIONS.map(v => ({ value: v, enabled: true }));
  const activeDenominations = denomSettings.filter(d => d.enabled).map(d => d.value).sort((a, b) => b - a);

  const branchEntries = useMemo(() => {
    return filterEntriesByBranch(journalEntries, branch);
  }, [journalEntries, branch]);

  // Local-date safe previous date string
  const prevDateStr = useMemo(() => {
    if (!date) return '';
    const parts = date.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const prev = new Date(y, m, d - 1);
      const py = prev.getFullYear();
      const pm = String(prev.getMonth() + 1).padStart(2, '0');
      const pd = String(prev.getDate()).padStart(2, '0');
      return `${py}-${pm}-${pd}`;
    }
    return date;
  }, [date]);

  // Look up prior closed EOD record for this branch (e.g. yesterday's closure)
  const priorEodRecord = useMemo(() => {
    if (!hasBranchSelected) return null;
    const priorRecords = (eodRecords || [])
      .filter(r => r.branch === branch && r.date <= prevDateStr && r.status === 'CLOSED')
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return priorRecords[0] || null;
  }, [eodRecords, branch, prevDateStr, hasBranchSelected]);

  // 1. Opening Cash in Hand (prior to today):
  // When yesterday (or a prior day) was closed in EOD, today's starting opening cash
  // is automatically yesterday's EOD closing cash!
  const openingCashInHand = useMemo(() => {
    if (!hasBranchSelected) return 0;
    if (priorEodRecord) {
      const baseEodCash = Number(priorEodRecord.counted_cash ?? priorEodRecord.expected_cash) || 0;
      let interimDelta = 0;
      branchEntries.forEach(je => {
        const vDate = je.date || je.created_at?.slice(0, 10) || '';
        if (vDate > priorEodRecord.date && vDate <= prevDateStr) {
          (je.lines || []).forEach(l => {
            if (l.account_code === '1001') {
              interimDelta += (Number(l.debit) || 0) - (Number(l.credit) || 0);
            }
          });
        }
      });
      return baseEodCash + interimDelta;
    }
    const scoped = filterEntriesUpTo(branchEntries, prevDateStr);
    const balances = computeAccountBalances(chartOfAccounts, scoped);
    return balances.find(a => a.code === '1001')?.balance || 0;
  }, [branchEntries, chartOfAccounts, prevDateStr, priorEodRecord, hasBranchSelected]);

  // 2. Today's Cash Inflows & Outflows specifically on `date`
  const { todayCashInflow, todayCashOutflow } = useMemo(() => {
    if (!hasBranchSelected) return { todayCashInflow: 0, todayCashOutflow: 0 };
    let inflow = 0;
    let outflow = 0;
    branchEntries.forEach(je => {
      const vDate = je.date || je.created_at?.slice(0, 10) || '';
      if (vDate === date) {
        (je.lines || []).forEach(l => {
          if (l.account_code === '1001') {
            inflow += Number(l.debit) || 0;
            outflow += Number(l.credit) || 0;
          }
        });
      }
    });
    return { todayCashInflow: inflow, todayCashOutflow: outflow };
  }, [branchEntries, date, hasBranchSelected]);

  // 3. Expected Closing Cash in Hand
  const expectedClosingCashInHand = useMemo(() => {
    return openingCashInHand + todayCashInflow - todayCashOutflow;
  }, [openingCashInHand, todayCashInflow, todayCashOutflow]);

  const expectedCash = expectedClosingCashInHand;
  const openingBalance = openingCashInHand;
  const closingBalance = expectedClosingCashInHand;

  const existingRecord = eodRecords.find(r => r.branch === branch && r.date === date) || null;
  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const fmtTime = (iso) => new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const activeReopen = existingRecord
    ? (existingRecord.reopen_history || []).find(rh => new Date(rh.expires_at).getTime() > Date.now())
    : null;
  const isDayLocked = Boolean(existingRecord) && !activeReopen;
  const pendingRequest = existingRecord ? (existingRecord.reopen_requests || []).find(r => r.status === 'PENDING') : null;

  // How many calendar days between this branch's first-ever closure and today have
  // no closure record at all — a quick signal for "this branch is falling behind
  // on day-end closings" without needing to click through every date by hand.
  const pendingDaysCount = useMemo(() => {
    if (!hasBranchSelected) return null;
    const branchDates = new Set(eodRecords.filter(r => r.branch === branch).map(r => r.date));
    if (branchDates.size === 0) return null;
    const firstDate = [...branchDates].sort()[0];
    // 'Z' forces this to parse and print as a pure UTC calendar date — without it,
    // the local-midnight parse and the toISOString() re-serialization can land on
    // different calendar days depending on the browser's timezone offset, which
    // silently double-counts (or skips) a day at each boundary.
    let count = 0;
    const cursor = new Date(`${firstDate}T00:00:00Z`);
    const today = new Date(`${todayStr()}T00:00:00Z`);
    while (cursor < today) {
      const ds = cursor.toISOString().slice(0, 10);
      if (!branchDates.has(ds)) count++;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return count;
  }, [eodRecords, branch, hasBranchSelected]);

  const handleGrantReopen = () => {
    onGrantEodReopen(existingRecord.id, Number(reopenHours));
  };

  const handleModalSubmit = async (payload) => {
    if (payload.mode === 'REVIEW') {
      await onResolveEodVariance(modalState.record.id, payload.resolution_note);
      return;
    }
    const { mode, ...rest } = payload;
    if (mode === 'EDIT') {
      await onUpdateEodRecord(modalState.record.id, { date, branch, ...rest });
    } else {
      await onCloseEodDay({ date, branch, ...rest });
    }
  };

  const branchRecords = (hasBranchSelected ? eodRecords.filter(r => r.branch === branch) : [])
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const totalPages = Math.ceil(branchRecords.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedRecords = branchRecords.slice(startIndex, startIndex + pageSize);

  const liveBadge = hasBranchSelected ? diffBadge(existingRecord ? existingRecord.difference : 0, t) : null;

  return (
    <div className="fin-page">
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: 'var(--color-warning-light, #FFFBEB)', border: '1px solid var(--color-warning-border, #FDE68A)', color: 'var(--color-warning-hover, #B45309)' }}>
              <Calculator style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('fin.eod_title')}</h1>
              <p className="fin-page-header__subtitle">{t('fin.eod_subtitle')}</p>
            </div>
          </div>
        </div>

        {/* ── Professional Segmented Navigation Tabs ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F1F5F9', padding: '4px', borderRadius: 10, marginTop: 14, width: 'fit-content' }}>
          <button
            type="button"
            onClick={() => setActiveMainTab('DAY_CLOSING')}
            style={{
              padding: '7px 16px',
              borderRadius: 7,
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              border: 'none',
              background: activeMainTab === 'DAY_CLOSING' ? '#FFFFFF' : 'transparent',
              color: activeMainTab === 'DAY_CLOSING' ? '#0F172A' : '#64748B',
              boxShadow: activeMainTab === 'DAY_CLOSING' ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Daily Cash Closing & Vault Counter
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('PAST_CLOSURES')}
            style={{
              padding: '7px 16px',
              borderRadius: 7,
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              border: 'none',
              background: activeMainTab === 'PAST_CLOSURES' ? '#FFFFFF' : 'transparent',
              color: activeMainTab === 'PAST_CLOSURES' ? '#0F172A' : '#64748B',
              boxShadow: activeMainTab === 'PAST_CLOSURES' ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Past Closures & Audit History
          </button>
        </div>
      </div>

      {/* ── TAB 1: DAILY CASH CLOSING & VAULT COUNTER ── */}
      {activeMainTab === 'DAY_CLOSING' && (
        <>
          {/* 1. Branch Dropdown & Date Filter Row */}
          <div className="fin-filterbar">
            <div className="fin-field">
              <label>{t('fin.branch_label')}</label>
              <SharedDropdown
                value={branch}
                onChange={(e) => { setBranch(e.target.value); setCurrentPage(1); }}
                disabled={Boolean(selectedBranch && selectedBranch !== 'ALL')}
                buttonStyle={{ height: 36, minWidth: 160 }}
                options={[
                  { value: '', label: t('fin.select_branch_placeholder') || '— Select Branch —' },
                  ...branchesList.map(b => ({ value: b.name, label: b.name }))
                ]}
              />
            </div>
            <div className="fin-field">
              <label>{t('col.date')}</label>
              <SharedDatePicker
                value={date}
                max={todayStr()}
                onChange={(e) => setDate(e.target.value)}
                buttonStyle={{ height: 36, minWidth: 140 }}
              />
            </div>
          </div>

          {/* 2. Executive Cash in Hand Reconciliation Metric Cards */}
          {hasBranchSelected && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, margin: '14px 0' }}>
              {/* 1. Opening Cash in Hand Card */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Opening Cash in Hand</span>
                <strong style={{ fontSize: '1.25rem', fontWeight: 700, color: openingCashInHand < 0 ? 'var(--color-danger, #DC2626)' : '#0F172A', fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
                  {openingCashInHand < 0 ? `₹${fmt(Math.abs(openingCashInHand))} (Overdrawn)` : `₹${fmt(openingCashInHand)}`}
                </strong>
                <span style={{ fontSize: '0.68rem', color: openingCashInHand < 0 ? 'var(--color-danger, #DC2626)' : '#64748B' }}>
                  {priorEodRecord ? `Auto-carried from ${priorEodRecord.date} EOD closing cash` : 'Vault cash at start of day'}
                </span>
              </div>

              {/* 2. Today's Cash Inflow Card */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--brand-primary, #15803D)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Today's Cash Inflow</span>
                <strong style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-primary, #15803D)', fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
                  +₹{fmt(todayCashInflow)}
                </strong>
                <span style={{ fontSize: '0.68rem', color: '#64748B' }}>Cash collections & receipts today</span>
              </div>

              {/* 3. Today's Cash Outflow Card */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-danger, #DC2626)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Today's Cash Outflow</span>
                <strong style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-danger, #DC2626)', fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
                  -₹{fmt(todayCashOutflow)}
                </strong>
                <span style={{ fontSize: '0.68rem', color: '#64748B' }}>Cash disbursals & expenses today</span>
              </div>

              {/* 4. Expected Closing Cash in Hand Card */}
              <div style={{ background: expectedClosingCashInHand < 0 ? '#FEF2F2' : 'var(--brand-primary-light, #F0FEF5)', border: `1px solid ${expectedClosingCashInHand < 0 ? '#FECACA' : 'var(--brand-primary-border, #A3F5C1)'}`, borderRadius: 12, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb),0.06)' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: expectedClosingCashInHand < 0 ? '#991B1B' : 'var(--brand-primary-hover, #0E5327)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Expected Closing Cash</span>
                <strong style={{ fontSize: '1.25rem', fontWeight: 700, color: expectedClosingCashInHand < 0 ? '#DC2626' : 'var(--brand-primary-hover, #0E5327)', fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
                  {expectedClosingCashInHand < 0 ? `₹${fmt(Math.abs(expectedClosingCashInHand))} (Overdrawn)` : `₹${fmt(expectedClosingCashInHand)}`}
                </strong>
                <span style={{ fontSize: '0.68rem', color: expectedClosingCashInHand < 0 ? '#B91C1C' : 'var(--brand-primary, #15803D)' }}>
                  {expectedClosingCashInHand < 0 ? 'Cash drawer in deficit' : 'Target vault cash count'}
                </span>
              </div>

              {/* Day Closure Status Card & Close Day Action */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Closure Status</span>
                  {!existingRecord ? (
                    <span className="fin-badge fin-badge--warn" style={{ width: 'fit-content' }}>{t('fin.not_closed_badge')}</span>
                  ) : existingRecord.status === 'PENDING_REVIEW' ? (
                    <span className="fin-badge fin-badge--warn" style={{ width: 'fit-content' }}>{t('fin.pending_review_badge')}</span>
                  ) : (
                    <span className="fin-badge fin-badge--ok" style={{ width: 'fit-content' }}>{t('fin.closed_badge')}</span>
                  )}
                  {existingRecord && (
                    <span className={`fin-badge ${liveBadge.cls}`} style={{ width: 'fit-content', marginTop: 2 }}>{liveBadge.label}</span>
                  )}
                </div>

                {!existingRecord && (
                  <button
                    type="button"
                    className="fin-btn-primary"
                    onClick={() => setModalState({ mode: 'CLOSE', record: null })}
                    style={{ padding: '9px 18px', fontSize: '0.8rem', fontWeight: 500, borderRadius: 8, background: 'var(--brand-primary-hover, #0E5327)', whiteSpace: 'nowrap' }}
                  >
                    <Calculator style={{ width: 14, height: 14 }} />
                    <span>{t('fin.close_day_btn')}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {!hasBranchSelected && (
            <div className="fin-empty-state">{t('fin.select_branch_hint_eod')}</div>
          )}

          {hasBranchSelected && existingRecord && (
            <div className="fin-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <span className="fin-meta-row">
                  {t('fin.closed_by_label')}: {existingRecord.closed_by}
                  {existingRecord.edited && <span className="fin-badge fin-badge--warn" style={{ marginLeft: 6 }}>{t('fin.edited_badge')}</span>}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {isAdmin && existingRecord.status === 'PENDING_REVIEW' && (
                    <button type="button" className="fin-btn-primary" style={{ background: 'var(--color-warning-hover, #B45309)' }} onClick={() => setModalState({ mode: 'REVIEW', record: existingRecord })}>
                      <ShieldCheck style={{ width: 13, height: 13 }} />
                      <span>{t('fin.review_variance_btn')}</span>
                    </button>
                  )}
                  {isAdmin && (
                    <button type="button" className="fin-btn-primary" onClick={() => setModalState({ mode: 'EDIT', record: existingRecord })}>
                      <Pencil style={{ width: 13, height: 13 }} />
                      <span>{t('fin.edit_closure_btn')}</span>
                    </button>
                  )}
                </div>
              </div>

              <div style={{ padding: '10px 18px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                {activeReopen ? (
                  <span className="fin-badge fin-badge--warn">
                    <Unlock style={{ width: 12, height: 12 }} />
                    {t('fin.reopened_until_label')}: {fmtTime(activeReopen.expires_at)}
                  </span>
                ) : (
                  <span className="fin-meta-row">
                    <Lock style={{ width: 13, height: 13, verticalAlign: 'text-bottom', marginRight: 4 }} />
                    {t('fin.day_locked_hint')}
                  </span>
                )}

                {!activeReopen && !pendingRequest && (
                  isAdmin ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <SharedDropdown
                        value={reopenHours}
                        onChange={(e) => setReopenHours(e.target.value)}
                        size="sm"
                        buttonStyle={{ height: 32, minWidth: 80 }}
                        options={[1, 2, 4, 8, 24].map(h => ({ value: h, label: `${h}${t('fin.hours_suffix')}` }))}
                      />
                      <button type="button" className="fin-btn-primary" style={{ background: 'var(--color-warning-hover, #B45309)' }} onClick={handleGrantReopen}>
                        <Unlock style={{ width: 13, height: 13 }} />
                        <span>{t('fin.grant_reopen_btn')}</span>
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="fin-btn-primary" style={{ background: 'var(--color-warning-hover, #B45309)' }} onClick={() => setRequestModalOpen(true)}>
                      <Unlock style={{ width: 13, height: 13 }} />
                      <span>{t('fin.request_reopen_btn')}</span>
                    </button>
                  )
                )}

                {!activeReopen && pendingRequest && !isAdmin && (
                  <span className="fin-badge fin-badge--warn">
                    {t('fin.reopen_pending_note')
                      .replace('{name}', pendingRequest.requested_by)
                      .replace('{hours}', pendingRequest.requested_hours)
                      .replace('{reason}', pendingRequest.reason || '')}
                  </span>
                )}

                {!activeReopen && pendingRequest && isAdmin && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="fin-meta-row">
                      {t('fin.reopen_pending_note')
                        .replace('{name}', pendingRequest.requested_by)
                        .replace('{hours}', pendingRequest.requested_hours)
                        .replace('{reason}', pendingRequest.reason || '')}
                    </span>
                    {!showRejectBox ? (
                      <>
                        <SharedDropdown
                          value={approveHours}
                          onChange={(e) => setApproveHours(e.target.value)}
                          size="sm"
                          buttonStyle={{ height: 32, minWidth: 80 }}
                          options={[1, 2, 4, 8, 24].map(h => ({ value: h, label: `${h}${t('fin.hours_suffix')}` }))}
                        />
                        <button
                          type="button"
                          className="fin-btn-primary"
                          style={{ background: 'var(--brand-primary, #15803D)' }}
                          onClick={() => onApproveEodReopen(existingRecord.id, pendingRequest.id, Number(approveHours))}
                        >
                          <Unlock style={{ width: 13, height: 13 }} />
                          <span>{t('fin.approve_btn')}</span>
                        </button>
                        <button type="button" className="fin-quick-pill" onClick={() => setShowRejectBox(true)}>
                          {t('fin.reject_btn')}
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          className="fin-input"
                          placeholder={t('fin.reject_reason_label')}
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <button
                          type="button"
                          className="fin-btn-primary"
                          style={{ background: 'var(--color-danger, #DC2626)' }}
                          onClick={() => {
                            if (!rejectReason.trim()) return;
                            onRejectEodReopen(existingRecord.id, pendingRequest.id, rejectReason.trim());
                            setRejectReason('');
                            setShowRejectBox(false);
                          }}
                        >
                          {t('fin.reject_btn')}
                        </button>
                        <button type="button" className="fin-quick-pill" onClick={() => setShowRejectBox(false)}>
                          {t('fin.cancel_edit_btn')}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {((existingRecord.reopen_history || []).length > 0 || (existingRecord.reopen_requests || []).length > 0) && (
                <div style={{ padding: '10px 18px', borderTop: '1px solid #F1F5F9' }}>
                  <div className="fin-filterbar__label" style={{ marginBottom: 6 }}>{t('fin.reopen_history_heading')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {existingRecord.reopen_history.map((rh, idx) => (
                      <span key={idx} className="fin-meta-row">
                        {t('fin.reopened_by_note')
                          .replace('{name}', rh.opened_by)
                          .replace('{hours}', rh.duration_hours)
                          .replace('{time}', fmtTime(rh.expires_at))}
                        {' · '}{fmtTime(rh.opened_at)}
                      </span>
                    ))}
                    {(existingRecord.reopen_requests || []).filter(r => r.status === 'REJECTED').map((r, idx) => (
                      <span key={`rej-${idx}`} className="fin-meta-row">
                        {t('fin.reopen_rejected_note')
                          .replace('{name}', r.requested_by)
                          .replace('{reason}', r.decision_reason || '')}
                        {' · '}{fmtTime(r.decided_at)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="fin-tablewrap" style={{ border: 'none', borderTop: '1px solid #E2E8F0' }}>
                <table className="fin-grid-table">
                  <thead>
                    <tr>
                      <th>{t('fin.denomination_label')}</th>
                      <th className="num">{t('fin.count_label')}</th>
                      <th className="num">{t('fin.subtotal_label')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingRecord.denominations.map(d => (
                      <tr key={d.value}>
                        <td>₹{d.value}</td>
                        <td className="num">{d.count}</td>
                        <td className="num">₹{fmt(d.value * d.count)}</td>
                      </tr>
                    ))}
                    <tr className="fin-row-total">
                      <td colSpan="2">{t('fin.counted_cash_label')}</td>
                      <td className="num">₹{fmt(existingRecord.counted_cash)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {existingRecord.remarks && (
                <div style={{ padding: '10px 18px', fontSize: '0.82rem', color: '#64748B' }}>{t('fin.remarks_label')}: {existingRecord.remarks}</div>
              )}
              {existingRecord.resolution_note && (
                <div style={{ padding: '0 18px 12px', fontSize: '0.82rem', color: 'var(--brand-primary-hover, #0E5327)' }}>
                  {t('fin.resolution_note_label')}: {existingRecord.resolution_note} ({existingRecord.reviewed_by})
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── TAB 2: SEPARATE DEDICATED PAST CLOSURES & AUDIT HISTORY TAB ── */}
      {activeMainTab === 'PAST_CLOSURES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Branch & Date Range Filter Bar */}
          <div className="fin-filterbar">
            <div className="fin-field">
              <label>{t('fin.branch_label')}</label>
              <SharedDropdown
                value={branch}
                onChange={(e) => { setBranch(e.target.value); setCurrentPage(1); }}
                disabled={Boolean(selectedBranch && selectedBranch !== 'ALL')}
                buttonStyle={{ height: 36, minWidth: 160 }}
                options={[
                  { value: '', label: t('fin.all_branches_eod') || 'All Branches' },
                  ...branchesList.map(b => ({ value: b.name, label: b.name }))
                ]}
              />
            </div>
          </div>

          <div className="fin-tablewrap">
            <table className="fin-grid-table">
              <thead>
                <tr>
                  <th>{t('col.date')}</th>
                  <th>{t('fin.branch_label')}</th>
                  <th className="num">{t('fin.expected_cash_label')}</th>
                  <th className="num">{t('fin.counted_cash_label')}</th>
                  <th className="num">{t('fin.difference_label')}</th>
                  <th>{t('fin.closed_by_label')}</th>
                  <th>{t('col.status')}</th>
                </tr>
              </thead>
              <tbody>
                {pagedRecords.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>{t('fin.no_results_hint')}</td></tr>
                ) : pagedRecords.map(r => {
                  const b = diffBadge(r.difference, t);
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>{r.date}</td>
                      <td>{r.branch}</td>
                      <td className="num">₹{fmt(r.expected_cash)}</td>
                      <td className="num" style={{ fontWeight: 600, color: 'var(--brand-primary-hover, #0E5327)' }}>₹{fmt(r.counted_cash)}</td>
                      <td className="num"><span className={`fin-badge ${b.cls}`}>{b.label}</span></td>
                      <td>{r.closed_by}</td>
                      <td>
                        {r.status === 'PENDING_REVIEW' ? (
                          <span className="fin-badge fin-badge--warn">{t('fin.pending_review_badge')}</span>
                        ) : (
                          <span className="fin-badge fin-badge--ok">{t('fin.closed_badge')}</span>
                        )}
                        {r.edited && <span className="fin-badge fin-badge--warn" style={{ marginLeft: 4 }}>{t('fin.edited_badge')}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="table-pagination">
              <div className="table-pagination__info">
                Showing <strong>{branchRecords.length === 0 ? 0 : startIndex + 1}</strong> to <strong>{Math.min(startIndex + pageSize, branchRecords.length)}</strong> of <strong>{branchRecords.length}</strong> entries
              </div>
              <div className="table-pagination__controls">
                <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                  <ChevronLeft style={{ width: 14, height: 14 }} />
                  <span>Previous</span>
                </button>
                <span className="page-indicator">Page {safePage} of {totalPages}</span>
                <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                  <span>Next</span>
                  <ChevronRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <EODModal
        isOpen={Boolean(modalState)}
        mode={modalState?.mode}
        record={modalState?.record}
        expectedCash={expectedCash}
        activeDenominations={activeDenominations}
        onClose={() => setModalState(null)}
        onSubmit={handleModalSubmit}
        t={t}
      />

      <ReopenRequestModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSubmit={(payload) => {
          onRequestEodReopen(existingRecord.id, payload);
          setRequestModalOpen(false);
        }}
        t={t}
      />
    </div>
  );
}
