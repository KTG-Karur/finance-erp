import React, { useState, useMemo, useEffect } from 'react';
import {
  RotateCcw, Search, Trash2, Archive, AlertTriangle, CheckCircle2,
  Users, Building2, Layers, Wallet, CreditCard, GitBranch, Shield, Landmark, FileText, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import api from '../api/client';

const ENTITY_CONFIG = {
  CUSTOMER: { label: 'Customer', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: Users },
  SCHEME: { label: 'Loan Scheme', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: Layers },
  INVESTOR: { label: 'Investor', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: Wallet },
  EXPENSE_CATEGORY: { label: 'Expense Category', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: CreditCard },
  EMPLOYEE: { label: 'Staff Member', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', icon: Users },
  BANK_ACCOUNT: { label: 'Bank Account', color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC', icon: Landmark },
  BRANCH: { label: 'Branch', color: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE', icon: GitBranch },
  ROLE: { label: 'Role', color: '#475569', bg: '#F8FAFC', border: '#E2E8F0', icon: Shield },
  CHART_OF_ACCOUNT: { label: 'Account Head', color: '#0D9488', bg: '#F0FDFA', border: '#99F6E4', icon: FileText }
};

export default function DraftsArchiveView({ onRestored }) {
  const { t } = useLanguage();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeTab, setActiveTypeTab] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');

  const fetchDeleted = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/system/trash');
      setRecords(res.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load deleted records / drafts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeleted();
  }, []);

  const handleRestore = async (record) => {
    setRestoreLoading(true);
    setRestoreError('');
    try {
      await api.post('/system/trash/restore', {
        entity_type: record.entity_type,
        id: record.id
      });
      setRestoreSuccess(`Successfully restored ${record.name} (${record.code}) back to active records.`);
      setRestoreTarget(null);
      await fetchDeleted();
      if (onRestored) onRestored();
      setTimeout(() => setRestoreSuccess(''), 5000);
    } catch (err) {
      setRestoreError(err?.response?.data?.message || 'Failed to restore record.');
    } finally {
      setRestoreLoading(false);
    }
  };

  const entityTabs = [
    { id: 'ALL', label: 'All Drafts & Deleted', count: records.length },
    { id: 'CUSTOMER', label: 'Customers', count: records.filter(r => r.entity_type === 'CUSTOMER').length },
    { id: 'SCHEME', label: 'Loan Schemes', count: records.filter(r => r.entity_type === 'SCHEME').length },
    { id: 'INVESTOR', label: 'Investors', count: records.filter(r => r.entity_type === 'INVESTOR').length },
    { id: 'EXPENSE_CATEGORY', label: 'Expense Categories', count: records.filter(r => r.entity_type === 'EXPENSE_CATEGORY').length },
    { id: 'EMPLOYEE', label: 'Staff Directory', count: records.filter(r => r.entity_type === 'EMPLOYEE').length },
    { id: 'BANK_ACCOUNT', label: 'Bank Accounts', count: records.filter(r => r.entity_type === 'BANK_ACCOUNT').length },
    { id: 'BRANCH', label: 'Branches', count: records.filter(r => r.entity_type === 'BRANCH').length },
    { id: 'ROLE', label: 'Roles', count: records.filter(r => r.entity_type === 'ROLE').length },
    { id: 'CHART_OF_ACCOUNT', label: 'Ledger Heads', count: records.filter(r => r.entity_type === 'CHART_OF_ACCOUNT').length }
  ].filter(tab => tab.id === 'ALL' || tab.count > 0);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (activeTypeTab !== 'ALL' && r.entity_type !== activeTypeTab) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.code && String(r.code).toLowerCase().includes(q)) ||
        (r.details && r.details.toLowerCase().includes(q)) ||
        (r.entity_name && r.entity_name.toLowerCase().includes(q))
      );
    });
  }, [records, activeTypeTab, searchQuery]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedRecords = filteredRecords.slice(startIndex, startIndex + pageSize);

  return (
    <div className="fin-page">
      {/* ── Page Header ── */}
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#475569' }}>
              <Archive style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">Drafts & Deleted Records Archive</h1>
              <p className="fin-page-header__subtitle">
                System-wide recycle bin: inspect soft-deleted master entries, KYC customers, schemes, staff and restore them at any time.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="fin-btn-secondary"
            onClick={fetchDeleted}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RotateCcw style={{ width: 13, height: 13 }} />
            <span>Refresh Archive</span>
          </button>
        </div>

        <div className="fin-header-stats">
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">Archived / Deleted Total</span>
            <span className="fin-header-stat__value" style={{ color: '#475569' }}>{records.length}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">Deleted Customers</span>
            <span className="fin-header-stat__value" style={{ color: '#2563EB' }}>
              {records.filter(r => r.entity_type === 'CUSTOMER').length}
            </span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">Deleted Financial Masters</span>
            <span className="fin-header-stat__value" style={{ color: '#D97706' }}>
              {records.filter(r => ['SCHEME', 'INVESTOR', 'EXPENSE_CATEGORY', 'BANK_ACCOUNT'].includes(r.entity_type)).length}
            </span>
          </div>
        </div>
      </div>

      {restoreSuccess && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', fontSize: '0.82rem', fontWeight: 600, marginBottom: 12 }}>
          <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0 }} />
          <span>{restoreSuccess}</span>
        </div>
      )}

      {/* ── Filters Bar ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid #E2E8F0', overflowX: 'auto' }}>
          {entityTabs.map(tab => {
            const isActive = activeTypeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTypeTab(tab.id); setPage(1); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 4px', marginBottom: -1,
                  border: 'none', borderBottom: isActive ? '2px solid var(--brand-primary, #15803D)' : '2px solid transparent',
                  background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: '0.8rem', fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--brand-primary, #15803D)' : '#64748B', marginRight: 16, whiteSpace: 'nowrap'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 700, borderRadius: 999, padding: '1px 7px',
                  background: isActive ? 'var(--brand-primary-light, #F0FEF5)' : '#F1F5F9',
                  color: isActive ? 'var(--brand-primary, #15803D)' : '#94A3B8'
                }}>{tab.count}</span>
              </button>
            );
          })}
        </div>

        <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
          <Search style={{ position: 'absolute', left: 10, top: 9, width: 14, height: 14, color: '#94A3B8' }} />
          <input
            style={{ paddingLeft: 30, width: '100%', height: 34, borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.78rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            type="text"
            placeholder="Search code, title, phone, or branch..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* ── Deleted Records Table ── */}
      <div className="fin-tablewrap">
        <table className="fin-grid-table">
          <thead>
            <tr>
              <th style={{ width: 45, textAlign: 'center' }}>#</th>
              <th style={{ width: 150 }}>Entity Type</th>
              <th style={{ width: 130 }}>Code / ID</th>
              <th>Name / Particulars</th>
              <th>Details & Notes</th>
              <th style={{ width: 160 }}>Deleted / Archived Date</th>
              <th style={{ textAlign: 'right', width: 130 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>Loading archived records...</td></tr>
            ) : pagedRecords.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
                  {records.length === 0 ? 'No drafts or deleted records found. Archive is empty.' : 'No records match your search filter.'}
                </td>
              </tr>
            ) : (
              pagedRecords.map((r, idx) => {
                const conf = ENTITY_CONFIG[r.entity_type] || { label: r.entity_type, color: '#475569', bg: '#F1F5F9', border: '#CBD5E1', icon: FileText };
                const IconComp = conf.icon;
                return (
                  <tr key={`${r.entity_type}-${r.id}`}>
                    <td style={{ textAlign: 'center', color: '#64748B' }}>{startIndex + idx + 1}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        background: conf.bg, color: conf.color, border: `1px solid ${conf.border}`
                      }}>
                        <IconComp style={{ width: 11, height: 11 }} />
                        <span>{conf.label}</span>
                      </span>
                    </td>
                    <td className="code" style={{ fontWeight: 600, color: '#0F172A' }}>{r.code || '—'}</td>
                    <td>
                      <strong style={{ fontSize: '0.82rem', color: '#1E293B' }}>{r.name}</strong>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: '#64748B' }}>{r.details || '—'}</td>
                    <td style={{ fontSize: '0.76rem', color: '#475569' }}>
                      {String(r.deleted_at || '').replace('T', ' ').slice(0, 19) || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => { setRestoreTarget(r); setRestoreError(''); }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px', borderRadius: 6, border: '1px solid var(--brand-primary-border, #A3F5C1)',
                          background: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary, #15803D)',
                          fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        <RotateCcw style={{ width: 12, height: 12 }} />
                        <span>Revert / Restore</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="table-pagination">
          <div className="table-pagination__info">
            Showing <strong>{filteredRecords.length === 0 ? 0 : startIndex + 1}</strong> to <strong>{Math.min(startIndex + pageSize, filteredRecords.length)}</strong> of <strong>{filteredRecords.length}</strong> archived entries
          </div>
          <div className="table-pagination__controls">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft style={{ width: 14, height: 14 }} />
              <span>Previous</span>
            </button>
            <span className="page-indicator">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <span>Next</span>
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Restore Confirmation Modal ── */}
      {restoreTarget && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card" style={{ maxWidth: 440 }}>
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: 'var(--brand-primary-light, #F0FEF5)', borderColor: 'var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)' }}>
                  <RotateCcw style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>Restore Archived Record</h3>
                  <p>{restoreTarget.entity_name} ({restoreTarget.code})</p>
                </div>
              </div>
              <button onClick={() => setRestoreTarget(null)} className="close-btn" type="button" disabled={restoreLoading}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div className="saas-modal-body">
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0, lineHeight: 1.5 }}>
                Are you sure you want to revert and restore <strong>{restoreTarget.name}</strong> back to active records? It will immediately reappear in its corresponding active module and dropdowns.
              </p>
              {restoreError && (
                <div className="form-alert form-alert--error" style={{ marginTop: 10 }}>
                  <AlertTriangle style={{ width: 14, height: 14 }} />
                  <span>{restoreError}</span>
                </div>
              )}
            </div>
            <div className="saas-modal-footer">
              <button type="button" onClick={() => setRestoreTarget(null)} disabled={restoreLoading} className="btn-cancel">
                Cancel
              </button>
              <button
                type="button"
                disabled={restoreLoading}
                onClick={() => handleRestore(restoreTarget)}
                className="btn-submit"
                style={{ background: restoreLoading ? '#94A3B8' : 'var(--brand-primary, #15803D)', cursor: restoreLoading ? 'not-allowed' : 'pointer' }}
              >
                {restoreLoading ? 'Restoring...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
