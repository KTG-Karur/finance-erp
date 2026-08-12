import React, { useState, useEffect } from 'react';
import { Shield, Check, Save, ChevronDown, ChevronRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

// This is the REAL, enforceable permission vocabulary — it mirrors exactly what
// every route's moduleGuard(module, action) check on the server actually reads
// (see each *.routes.js file). A permission toggled here that isn't in this list
// would be pure UI theater with no backend effect, so this list must stay in
// sync with the server's guards whenever a route's module/action changes.
const MODULES = [
  { id: 'DASHBOARD', labelKey: 'rbac.mod.dashboard', actions: ['VIEW'] },
  { id: 'LOANS', labelKey: 'rbac.mod.loans', actions: ['VIEW', 'CREATE', 'APPROVE'] },
  { id: 'BORROWERS', labelKey: 'rbac.mod.borrowers', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'] },
  { id: 'COLLECTIONS', labelKey: 'rbac.mod.collections', actions: ['VIEW', 'COLLECT', 'REVERT'] },
  { id: 'SCHEMES', labelKey: 'rbac.mod.schemes', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'] },
  { id: 'NPA', labelKey: 'rbac.mod.npa', actions: ['VIEW'] },
  { id: 'LEDGER', labelKey: 'rbac.mod.ledger', actions: ['VIEW', 'POST'] },
  { id: 'INVESTORS', labelKey: 'rbac.mod.investors', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'] },
  { id: 'FIXED_DEPOSITS', labelKey: 'rbac.mod.fixed_deposits', actions: ['VIEW', 'CREATE', 'MATURE', 'CLOSE', 'PAY_INTEREST'] },
  { id: 'RECURRING_DEPOSITS', labelKey: 'rbac.mod.recurring_deposits', actions: ['VIEW', 'CREATE', 'COLLECT', 'MATURE', 'CLOSE'] },
  { id: 'EXPENSES', labelKey: 'rbac.mod.expenses', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'FUND', 'VOUCHER'] },
  { id: 'ORG', labelKey: 'rbac.mod.org', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'] },
  { id: 'EMPLOYEES', labelKey: 'rbac.mod.employees', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'PERMISSIONS'] }
];

// Human labels for every action across every module above — this list is a
// superset (one flat namespace), which is fine since actions are always
// rendered scoped to their own module in the UI.
const ACTION_LABELS = {
  VIEW: 'View',
  CREATE: 'Create',
  EDIT: 'Edit',
  DELETE: 'Delete',
  APPROVE: 'Approve / Change Status',
  COLLECT: 'Collect Payment',
  REVERT: 'Revert / Correct Collection',
  POST: 'Post Voucher',
  MATURE: 'Mark Matured',
  CLOSE: 'Premature Close',
  PAY_INTEREST: 'Pay Monthly Interest',
  FUND: 'Add Funds',
  VOUCHER: 'Create Voucher',
  PERMISSIONS: 'Manage Permissions'
};

// Must match the real `users.role` ENUM exactly (see the tenant migration) —
// picking a value outside this list fails at the database with a raw
// "Data truncated for column 'role'" error, since MySQL enforces the ENUM.
function useRoles() {
  const { t } = useLanguage();
  return [
    { id: 'ADMIN', name: t('rbac.role.super_admin') },
    { id: 'MANAGER', name: t('rbac.role.manager') },
    { id: 'COLLECTOR', name: t('rbac.role.collector') },
    { id: 'STAFF', name: t('rbac.role.staff') }
  ];
}

// Server-side default when no row exists for a (module, action) pair is ALLOW
// (see moduleGuard.js) — so an unconfigured staff member starts fully checked
// here too, matching what they can actually do today, rather than a fabricated
// role-based guess.
function allAllowed() {
  const flags = {};
  MODULES.forEach(mod => mod.actions.forEach(action => { flags[`${mod.id}_${action}`] = true; }));
  return flags;
}

// The server hands back permissions as rows: [{ module, action, allowed }, ...].
// Only rows that were ever explicitly toggled exist — anything missing defaults
// to allowed (see allAllowed() above), so we start from that and overlay rows.
function rowsToFlags(rows) {
  const flags = allAllowed();
  (rows || []).forEach(r => { flags[`${r.module}_${r.action}`] = Boolean(r.allowed); });
  return flags;
}

function flagsToRows(flags) {
  return Object.entries(flags).map(([key, allowed]) => {
    const idx = key.lastIndexOf('_');
    return { module: key.slice(0, idx), action: key.slice(idx + 1), allowed };
  });
}

export default function PermissionMatrix({ initialRole = 'MANAGER', selectedStaffMember = null, employees = [], onSaveStaffPermissions }) {
  const { t } = useLanguage();
  const ROLES = useRoles();

  const currentRole = selectedStaffMember?.role || initialRole;
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [flags, setFlags] = useState(() => rowsToFlags(selectedStaffMember?.permissions));
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [expandedModules, setExpandedModules] = useState({});

  useEffect(() => {
    setSelectedRole(selectedStaffMember?.role || initialRole);
    setFlags(rowsToFlags(selectedStaffMember?.permissions));
    setSaveError('');
  }, [selectedStaffMember, initialRole]);

  const toggleAccordion = (modId) => {
    setExpandedModules(prev => ({ ...prev, [modId]: !prev[modId] }));
  };

  const toggleAction = (moduleId, action) => {
    const key = `${moduleId}_${action}`;
    setFlags(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleModuleAll = (moduleObj, check, e) => {
    e?.stopPropagation();
    setFlags(prev => {
      const updated = { ...prev };
      moduleObj.actions.forEach(action => { updated[`${moduleObj.id}_${action}`] = check; });
      return updated;
    });
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await onSaveStaffPermissions?.(selectedStaffMember?.id || null, selectedRole, flagsToRows(flags));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setSaveError(err?.response?.data?.message || 'Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  };

  const getRoleName = (id) => ROLES.find(r => r.id === id)?.name || id;
  const employeeRoleForCount = selectedRole === 'SUPER_ADMIN' ? 'ADMIN' : selectedRole;
  const affectedCount = employees.filter(e => e.role === employeeRoleForCount).length;

  return (
    <div style={{
      margin: '0 auto',
      maxWidth: 860,
      width: '100%',
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 14,
      padding: 24,
      fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#0F172A',
      boxSizing: 'border-box'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 18,
        borderBottom: '1px solid #E2E8F0',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 14
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
            {selectedStaffMember ? t('rbac.staff_role_label') : t('rbac.select_role_label')}
          </label>

          {selectedStaffMember ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F1F5F9',
              border: '1px solid #CBD5E1', padding: '6px 14px', borderRadius: 8,
              fontSize: '0.85rem', fontWeight: 600, color: '#0F172A'
            }}>
              <Shield style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', outline: 'none', cursor: 'pointer' }}
              >
                {ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          ) : (
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <Shield style={{ position: 'absolute', left: 12, width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{ height: 40, padding: '0 36px 0 36px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.9rem', fontWeight: 600, color: '#0F172A', background: '#FFFFFF', cursor: 'pointer', outline: 'none' }}
              >
                {ROLES.map(r => <option key={r.id} value={r.id}>{r.name} ({r.id})</option>)}
              </select>
            </div>
          )}

          {!selectedStaffMember && affectedCount > 0 && (
            <span style={{
              fontSize: '0.7rem', fontWeight: 500, padding: '3px 8px', borderRadius: 20,
              background: 'var(--brand-primary-light, #F0FEF5)',
              color: 'var(--brand-primary-text, #075F27)',
              border: '1px solid var(--brand-primary-border, #A3F5C1)'
            }}>
              Applies to {affectedCount} staff member{affectedCount === 1 ? '' : 's'} with this role
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saveError && <span style={{ color: 'var(--color-danger, #DC2626)', fontSize: '0.75rem', fontWeight: 500 }}>{saveError}</span>}
          {savedSuccess && (
            <span style={{ color: 'var(--brand-primary, #15803D)', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check style={{ width: 14, height: 14 }} /> {t('rbac.saved_permissions_for')} {selectedStaffMember?.name || t('rbac.role_word')}!
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saving ? '#94A3B8' : 'var(--brand-primary, #15803D)', color: '#FFFFFF', border: 'none', borderRadius: 7,
              padding: '7px 16px', fontSize: '0.78rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: saving ? 'none' : '0 2px 6px rgba(var(--brand-primary-rgb), 0.2)'
            }}
          >
            <Save style={{ width: 14, height: 14 }} />
            <span>{saving ? 'Saving...' : t('rbac.save_btn')}</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MODULES.map(mod => {
          const keys = mod.actions.map(a => `${mod.id}_${a}`);
          const allChecked = keys.every(k => flags[k]);
          const checkedCount = keys.filter(k => flags[k]).length;
          const isExpanded = Boolean(expandedModules[mod.id]);

          return (
            <div key={mod.id} style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
              <div
                onClick={() => toggleAccordion(mod.id)}
                style={{
                  background: '#F8FAFC', padding: '10px 14px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none',
                  borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ color: '#64748B', display: 'flex', alignItems: 'center' }}>
                    {isExpanded ? <ChevronDown style={{ width: 16, height: 16 }} /> : <ChevronRight style={{ width: 16, height: 16 }} />}
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 600, color: '#0F172A' }}>{t(mod.labelKey)}</h4>
                  <span style={{
                    fontSize: '0.68rem', color: checkedCount > 0 ? 'var(--brand-primary, #15803D)' : '#64748B',
                    background: checkedCount > 0 ? 'var(--brand-primary-light, #F0FEF5)' : '#F1F5F9', border: `1px solid ${checkedCount > 0 ? 'var(--brand-primary-border, #A3F5C1)' : '#E2E8F0'}`,
                    padding: '1px 7px', borderRadius: 10, fontWeight: 500
                  }}>
                    {checkedCount} / {mod.actions.length} {t('rbac.granted_suffix')}
                  </span>
                </div>
                <label onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--brand-primary, #15803D)', cursor: 'pointer', fontWeight: 500 }}>
                  <input type="checkbox" checked={allChecked} onChange={(e) => toggleModuleAll(mod, e.target.checked, e)} style={{ accentColor: 'var(--brand-primary, #15803D)', cursor: 'pointer' }} />
                  <span>{t('rbac.select_all')}</span>
                </label>
              </div>

              {isExpanded && (
                <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, background: '#FFFFFF' }}>
                  {mod.actions.map(action => {
                    const key = `${mod.id}_${action}`;
                    const isChecked = Boolean(flags[key]);
                    return (
                      <label
                        key={action}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem',
                          color: isChecked ? '#0F172A' : '#475569', fontWeight: isChecked ? 500 : 400,
                          cursor: 'pointer', userSelect: 'none', padding: '5px 7px', borderRadius: 5,
                          background: isChecked ? 'var(--brand-primary-light, #F0FDF4)' : 'transparent'
                        }}
                      >
                        <input type="checkbox" checked={isChecked} onChange={() => toggleAction(mod.id, action)} style={{ width: 14, height: 14, accentColor: 'var(--brand-primary, #15803D)', cursor: 'pointer' }} />
                        <span>{ACTION_LABELS[action] || action}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
