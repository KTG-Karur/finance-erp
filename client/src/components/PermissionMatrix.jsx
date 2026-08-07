import React, { useState, useEffect } from 'react';
import { Shield, Check, Save, ChevronDown, ChevronRight, User, Lock } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

function useRoles() {
  const { t } = useLanguage();
  return [
    { id: 'SUPER_ADMIN', name: t('rbac.role.super_admin') },
    { id: 'MANAGER', name: t('rbac.role.manager') },
    { id: 'COLLECTOR', name: t('rbac.role.collector') },
    { id: 'ACCOUNTANT', name: t('rbac.role.accountant') }
  ];
}

function useModules() {
  const { t } = useLanguage();
  return [
    {
      id: 'WORKSPACE',
      label: t('rbac.mod.workspace'),
      actions: [
        { id: 'VIEW_DASHBOARD', label: t('rbac.act.view_dashboard') },
        { id: 'VIEW_OPERATIONS', label: t('rbac.act.view_operations') }
      ]
    },
    {
      id: 'LOANS',
      label: t('rbac.mod.loans'),
      actions: [
        { id: 'LOANS_APPLICATIONS', label: t('rbac.act.loans_applications') },
        { id: 'LOANS_APPROVE_REJECT', label: t('rbac.act.loans_approve_reject') },
        { id: 'LOANS_SUBMIT_NEW', label: t('rbac.act.loans_submit_new') },
        { id: 'LOANS_ACTIVE', label: t('rbac.act.loans_active') },
        { id: 'LOANS_CLOSED', label: t('rbac.act.loans_closed') },
        { id: 'LOANS_DISBURSE', label: t('rbac.act.loans_disburse') },
        { id: 'LOANS_EDIT', label: t('rbac.act.loans_edit') }
      ]
    },
    {
      id: 'COLLECTIONS',
      label: t('rbac.mod.collections'),
      actions: [
        { id: 'COLLECT_PAYMENT', label: t('rbac.act.collect_payment') },
        { id: 'VIEW_COLLECTIONS_LOG', label: t('rbac.act.view_collections_log') },
        { id: 'PRINT_RECEIPTS', label: t('rbac.act.print_receipts') },
        { id: 'REVERT_COLLECTION', label: t('rbac.act.revert_collection') },
        { id: 'EXPORT_COLLECTIONS', label: t('rbac.act.export_collections') }
      ]
    },
    {
      id: 'INVESTMENTS',
      label: t('rbac.mod.investments'),
      actions: [
        { id: 'INVESTORS_VIEW', label: t('rbac.act.investors_view') },
        { id: 'INVESTORS_TRANSACT', label: t('rbac.act.investors_transact') },
        { id: 'FD_VIEW', label: t('rbac.act.fd_view') },
        { id: 'FD_CREATE', label: t('rbac.act.fd_create') }
      ]
    },
    {
      id: 'FINANCE',
      label: t('rbac.mod.finance'),
      actions: [
        { id: 'CASH_BOOK', label: t('rbac.act.cash_book') },
        { id: 'GENERAL_LEDGER', label: t('rbac.act.general_ledger') },
        { id: 'EXPENSE_VOUCHERS', label: t('rbac.act.expense_vouchers') },
        { id: 'INCOME_STATEMENT', label: t('rbac.act.income_statement') }
      ]
    },
    {
      id: 'MASTERS',
      label: t('rbac.mod.masters'),
      actions: [
        { id: 'ORG_HIERARCHY', label: t('rbac.act.org_hierarchy') },
        { id: 'STAFF_DIRECTORY', label: t('rbac.act.staff_directory') },
        { id: 'CUSTOMER_KYC', label: t('rbac.act.customer_kyc') },
        { id: 'LOAN_SCHEMES', label: t('rbac.act.loan_schemes') },
        { id: 'ACCOUNTING_MASTERS', label: t('rbac.act.accounting_masters') },
        { id: 'RBAC_MANAGEMENT', label: t('rbac.act.rbac_management') }
      ]
    }
  ];
}

const DEFAULT_ROLE_PERMISSIONS = {
  SUPER_ADMIN: {
    WORKSPACE_VIEW_DASHBOARD: true, WORKSPACE_VIEW_OPERATIONS: true,
    LOANS_LOANS_APPLICATIONS: true, LOANS_LOANS_APPROVE_REJECT: true, LOANS_LOANS_SUBMIT_NEW: true, LOANS_LOANS_ACTIVE: true, LOANS_LOANS_CLOSED: true, LOANS_LOANS_DISBURSE: true, LOANS_LOANS_EDIT: true,
    COLLECTIONS_COLLECT_PAYMENT: true, COLLECTIONS_VIEW_COLLECTIONS_LOG: true, COLLECTIONS_PRINT_RECEIPTS: true, COLLECTIONS_REVERT_COLLECTION: true, COLLECTIONS_EXPORT_COLLECTIONS: true,
    INVESTMENTS_INVESTORS_VIEW: true, INVESTMENTS_INVESTORS_TRANSACT: true, INVESTMENTS_FD_VIEW: true, INVESTMENTS_FD_CREATE: true,
    FINANCE_CASH_BOOK: true, FINANCE_GENERAL_LEDGER: true, FINANCE_EXPENSE_VOUCHERS: true, FINANCE_INCOME_STATEMENT: true,
    MASTERS_ORG_HIERARCHY: true, MASTERS_STAFF_DIRECTORY: true, MASTERS_CUSTOMER_KYC: true, MASTERS_LOAN_SCHEMES: true, MASTERS_ACCOUNTING_MASTERS: true, MASTERS_RBAC_MANAGEMENT: true
  },
  MANAGER: {
    WORKSPACE_VIEW_DASHBOARD: true, WORKSPACE_VIEW_OPERATIONS: true,
    LOANS_LOANS_APPLICATIONS: true, LOANS_LOANS_APPROVE_REJECT: true, LOANS_LOANS_SUBMIT_NEW: true, LOANS_LOANS_ACTIVE: true, LOANS_LOANS_CLOSED: true, LOANS_LOANS_DISBURSE: true, LOANS_LOANS_EDIT: true,
    COLLECTIONS_COLLECT_PAYMENT: true, COLLECTIONS_VIEW_COLLECTIONS_LOG: true, COLLECTIONS_PRINT_RECEIPTS: true, COLLECTIONS_REVERT_COLLECTION: true, COLLECTIONS_EXPORT_COLLECTIONS: true,
    INVESTMENTS_INVESTORS_VIEW: true, INVESTMENTS_INVESTORS_TRANSACT: true, INVESTMENTS_FD_VIEW: true, INVESTMENTS_FD_CREATE: true,
    FINANCE_CASH_BOOK: true, FINANCE_GENERAL_LEDGER: true, FINANCE_EXPENSE_VOUCHERS: true, FINANCE_INCOME_STATEMENT: true,
    MASTERS_ORG_HIERARCHY: false, MASTERS_STAFF_DIRECTORY: true, MASTERS_CUSTOMER_KYC: true, MASTERS_LOAN_SCHEMES: false, MASTERS_ACCOUNTING_MASTERS: true, MASTERS_RBAC_MANAGEMENT: false
  },
  COLLECTOR: {
    WORKSPACE_VIEW_DASHBOARD: true, WORKSPACE_VIEW_OPERATIONS: true,
    LOANS_LOANS_APPLICATIONS: false, LOANS_LOANS_APPROVE_REJECT: false, LOANS_LOANS_SUBMIT_NEW: true, LOANS_LOANS_ACTIVE: true, LOANS_LOANS_CLOSED: false, LOANS_LOANS_DISBURSE: false, LOANS_LOANS_EDIT: false,
    COLLECTIONS_COLLECT_PAYMENT: true, COLLECTIONS_VIEW_COLLECTIONS_LOG: true, COLLECTIONS_PRINT_RECEIPTS: true, COLLECTIONS_REVERT_COLLECTION: false, COLLECTIONS_EXPORT_COLLECTIONS: false,
    INVESTMENTS_INVESTORS_VIEW: false, INVESTMENTS_INVESTORS_TRANSACT: false, INVESTMENTS_FD_VIEW: false, INVESTMENTS_FD_CREATE: false,
    FINANCE_CASH_BOOK: false, FINANCE_GENERAL_LEDGER: false, FINANCE_EXPENSE_VOUCHERS: false, FINANCE_INCOME_STATEMENT: false,
    MASTERS_ORG_HIERARCHY: false, MASTERS_STAFF_DIRECTORY: false, MASTERS_CUSTOMER_KYC: true, MASTERS_LOAN_SCHEMES: false, MASTERS_ACCOUNTING_MASTERS: false, MASTERS_RBAC_MANAGEMENT: false
  },
  ACCOUNTANT: {
    WORKSPACE_VIEW_DASHBOARD: true, WORKSPACE_VIEW_OPERATIONS: false,
    LOANS_LOANS_APPLICATIONS: true, LOANS_LOANS_APPROVE_REJECT: false, LOANS_LOANS_SUBMIT_NEW: false, LOANS_LOANS_ACTIVE: true, LOANS_LOANS_CLOSED: true, LOANS_LOANS_DISBURSE: false, LOANS_LOANS_EDIT: false,
    COLLECTIONS_COLLECT_PAYMENT: true, COLLECTIONS_VIEW_COLLECTIONS_LOG: true, COLLECTIONS_PRINT_RECEIPTS: true, COLLECTIONS_REVERT_COLLECTION: true, COLLECTIONS_EXPORT_COLLECTIONS: true,
    INVESTMENTS_INVESTORS_VIEW: true, INVESTMENTS_INVESTORS_TRANSACT: true, INVESTMENTS_FD_VIEW: true, INVESTMENTS_FD_CREATE: false,
    FINANCE_CASH_BOOK: true, FINANCE_GENERAL_LEDGER: true, FINANCE_EXPENSE_VOUCHERS: true, FINANCE_INCOME_STATEMENT: true,
    MASTERS_ORG_HIERARCHY: false, MASTERS_STAFF_DIRECTORY: false, MASTERS_CUSTOMER_KYC: true, MASTERS_LOAN_SCHEMES: false, MASTERS_ACCOUNTING_MASTERS: true, MASTERS_RBAC_MANAGEMENT: false
  }
};

export default function PermissionMatrix({ initialRole = 'MANAGER', selectedStaffMember = null, onSaveStaffPermissions }) {
  const { t } = useLanguage();
  const ROLES = useRoles();
  const MODULES = useModules();
  const normalizeRole = (r) => {
    if (!r) return 'MANAGER';
    if (r === 'ADMIN') return 'SUPER_ADMIN';
    return r;
  };

  const currentRole = normalizeRole(selectedStaffMember?.role || initialRole);
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [selectedScope, setSelectedScope] = useState(selectedStaffMember?.scope || (currentRole === 'SUPER_ADMIN' ? 'ALL_BRANCHES' : 'OWN_BRANCH'));
  const [currentStaffPermissions, setCurrentStaffPermissions] = useState(() => {
    if (selectedStaffMember?.permissions && Object.keys(selectedStaffMember.permissions).length > 0) {
      return { ...selectedStaffMember.permissions };
    }
    return { ...(DEFAULT_ROLE_PERMISSIONS[currentRole] || {}) };
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});

  useEffect(() => {
    const roleKey = normalizeRole(selectedStaffMember?.role || initialRole);
    setSelectedRole(roleKey);
    setSelectedScope(selectedStaffMember?.scope || (roleKey === 'SUPER_ADMIN' ? 'ALL_BRANCHES' : 'OWN_BRANCH'));
    if (selectedStaffMember?.permissions && Object.keys(selectedStaffMember.permissions).length > 0) {
      setCurrentStaffPermissions({ ...selectedStaffMember.permissions });
    } else {
      setCurrentStaffPermissions({ ...(DEFAULT_ROLE_PERMISSIONS[roleKey] || {}) });
    }
  }, [selectedStaffMember, initialRole]);

  const toggleAccordion = (modId) => {
    setExpandedModules(prev => ({
      ...prev,
      [modId]: !prev[modId]
    }));
  };

  const togglePerm = (moduleId, actionId) => {
    const key = `${moduleId}_${actionId}`;
    setCurrentStaffPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleModuleAll = (moduleObj, check, e) => {
    e?.stopPropagation();
    const updated = { ...currentStaffPermissions };
    moduleObj.actions.forEach(act => {
      updated[`${moduleObj.id}_${act.id}`] = check;
    });
    setCurrentStaffPermissions(updated);
  };

  const handleSave = () => {
    if (onSaveStaffPermissions) {
      onSaveStaffPermissions(selectedStaffMember?.id || null, selectedRole, currentStaffPermissions, selectedScope);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const getRoleName = (id) => ROLES.find(r => r.id === id)?.name || id;

  return (
    <div style={{
      margin: '0 auto',
      maxWidth: 860,
      width: '100%',
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 14,
      padding: 24,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#0F172A',
      boxSizing: 'border-box'
    }}>
      {/* 1. Header Toolbar */}
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

          {/* Locked Role Display for Specific Staff, or Select Dropdown for Global RBAC */}
          {selectedStaffMember ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#0F172A'
            }}>
              <Shield style={{ width: 16, height: 16, color: '#059669' }} />
              <span>{getRoleName(selectedRole)}</span>
            </div>
          ) : (
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <Shield style={{ position: 'absolute', left: 12, width: 16, height: 16, color: '#059669' }} />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{
                  height: 40,
                  padding: '0 36px 0 36px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#0F172A',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {ROLES.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
            <label style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>{t('rbac.scope_label')}</label>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              title={t('rbac.scope_hint')}
              style={{
                height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1',
                fontSize: '0.78rem', fontWeight: 600, color: '#0F172A', background: '#FFFFFF', cursor: 'pointer'
              }}
            >
              <option value="OWN_BRANCH">{t('rbac.scope_own_branch')}</option>
              <option value="OWN_REGION">{t('rbac.scope_own_region')}</option>
              <option value="ALL_BRANCHES">{t('rbac.scope_all_branches')}</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {savedSuccess && (
            <span style={{ color: '#059669', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check style={{ width: 16, height: 16 }} /> {t('rbac.saved_permissions_for')} {selectedStaffMember?.name || t('rbac.role_word')}!
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            style={{
              background: '#059669',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              padding: '9px 20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(5, 150, 105, 0.2)'
            }}
          >
            <Save style={{ width: 15, height: 15 }} />
            <span>{t('rbac.save_btn')}</span>
          </button>
        </div>
      </div>

      {/* 2. Collapsible Accordion Permissions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {MODULES.map(mod => {
          const keys = mod.actions.map(a => `${mod.id}_${a.id}`);
          const allChecked = keys.every(k => currentStaffPermissions[k]);
          const checkedCount = keys.filter(k => currentStaffPermissions[k]).length;
          const isExpanded = Boolean(expandedModules[mod.id]);

          return (
            <div key={mod.id} style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
              
              {/* Accordion Header Bar */}
              <div
                onClick={() => toggleAccordion(mod.id)}
                style={{
                  background: '#F8FAFC',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ color: '#64748B', display: 'flex', alignItems: 'center' }}>
                    {isExpanded ? (
                      <ChevronDown style={{ width: 18, height: 18 }} />
                    ) : (
                      <ChevronRight style={{ width: 18, height: 18 }} />
                    )}
                  </div>

                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: '#0F172A' }}>
                    {mod.label}
                  </h4>

                  <span style={{
                    fontSize: '0.72rem',
                    color: checkedCount > 0 ? '#059669' : '#64748B',
                    background: checkedCount > 0 ? '#ECFDF5' : '#F1F5F9',
                    border: `1px solid ${checkedCount > 0 ? '#A7F3D0' : '#E2E8F0'}`,
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontWeight: 500
                  }}>
                    {checkedCount} / {mod.actions.length} {t('rbac.granted_suffix')}
                  </span>
                </div>

                <label
                  onClick={(e) => e.stopPropagation()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#059669', cursor: 'pointer', fontWeight: 500 }}
                >
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(e) => toggleModuleAll(mod, e.target.checked, e)}
                    style={{ accentColor: '#059669', cursor: 'pointer' }}
                  />
                  <span>{t('rbac.select_all')}</span>
                </label>
              </div>

              {/* Collapsible Accordion Body (Checkbox Items) */}
              {isExpanded && (
                <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, background: '#FFFFFF' }}>
                  {mod.actions.map(act => {
                    const key = `${mod.id}_${act.id}`;
                    const isChecked = Boolean(currentStaffPermissions[key]);

                    return (
                      <label
                        key={act.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          fontSize: '0.84rem',
                          color: isChecked ? '#0F172A' : '#475569',
                          fontWeight: isChecked ? 500 : 400,
                          cursor: 'pointer',
                          userSelect: 'none',
                          padding: '6px 8px',
                          borderRadius: 6,
                          background: isChecked ? '#F0FDF4' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePerm(mod.id, act.id)}
                          style={{ width: 16, height: 16, accentColor: '#059669', cursor: 'pointer' }}
                        />
                        <span>{act.label}</span>
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
