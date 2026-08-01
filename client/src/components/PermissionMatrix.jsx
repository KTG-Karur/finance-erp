import React, { useState } from 'react';
import { Shield, Check, Save } from 'lucide-react';

const ROLES = [
  { id: 'SUPER_ADMIN', name: 'System Administrator', badge: 'Full Access', color: '#7C3AED', bg: '#F5F3FF' },
  { id: 'MANAGER', name: 'Branch Manager', badge: 'Managerial', color: '#2563EB', bg: '#EFF6FF' },
  { id: 'COLLECTOR', name: 'Field Collector Agent', badge: 'Operational', color: '#059669', bg: '#ECFDF5' },
  { id: 'ACCOUNTANT', name: 'Accountant & Auditor', badge: 'Financial', color: '#D97706', bg: '#FEF3C7' }
];

const MODULES = [
  {
    id: 'LOANS',
    label: 'Customer Loans',
    actions: [
      { id: 'VIEW', label: 'View Loan Registers' },
      { id: 'CREATE', label: 'Create New Loan' },
      { id: 'EDIT', label: 'Edit Loan Terms' },
      { id: 'APPROVE', label: 'Approve Applications' },
      { id: 'CLOSE', label: 'Close Account' }
    ]
  },
  {
    id: 'COLLECTIONS',
    label: 'Collections & Receipting',
    actions: [
      { id: 'VIEW', label: 'View Receipt Logs' },
      { id: 'COLLECT', label: 'Post Daily Payment' },
      { id: 'REVERTS', label: 'Revert Transaction' },
      { id: 'EXPORT', label: 'Export Audit Statements' }
    ]
  },
  {
    id: 'FINANCE',
    label: 'Finance & Accounting',
    actions: [
      { id: 'VIEW_CASHBOOK', label: 'View Cash Book' },
      { id: 'GENERAL_LEDGER', label: 'View General Ledger' },
      { id: 'EXPENSES', label: 'Record Expense Voucher' },
      { id: 'INCOME_STATEMENT', label: 'View P&L Statement' }
    ]
  },
  {
    id: 'MASTERS',
    label: 'Master Settings & Administration',
    actions: [
      { id: 'INTEREST_RATES', label: 'Manage Interest Master' },
      { id: 'PAYMENT_MODES', label: 'Manage Payment Modes' },
      { id: 'CUSTOMERS', label: 'Manage Customer Master' },
      { id: 'INVESTORS', label: 'Manage Investor Master' },
      { id: 'STAFF', label: 'Manage Staff Directory' },
      { id: 'RBAC', label: 'Manage Roles & Permissions' }
    ]
  }
];

const DEFAULT_ROLE_PERMISSIONS = {
  SUPER_ADMIN: {
    LOANS_VIEW: true, LOANS_CREATE: true, LOANS_EDIT: true, LOANS_APPROVE: true, LOANS_CLOSE: true,
    COLLECTIONS_VIEW: true, COLLECTIONS_COLLECT: true, COLLECTIONS_REVERTS: true, COLLECTIONS_EXPORT: true,
    FINANCE_VIEW_CASHBOOK: true, FINANCE_GENERAL_LEDGER: true, FINANCE_EXPENSES: true, FINANCE_INCOME_STATEMENT: true,
    MASTERS_INTEREST_RATES: true, MASTERS_PAYMENT_MODES: true, MASTERS_CUSTOMERS: true, MASTERS_INVESTORS: true, MASTERS_STAFF: true, MASTERS_RBAC: true
  },
  MANAGER: {
    LOANS_VIEW: true, LOANS_CREATE: true, LOANS_EDIT: true, LOANS_APPROVE: true, LOANS_CLOSE: true,
    COLLECTIONS_VIEW: true, COLLECTIONS_COLLECT: true, COLLECTIONS_REVERTS: true, COLLECTIONS_EXPORT: true,
    FINANCE_VIEW_CASHBOOK: true, FINANCE_GENERAL_LEDGER: true, FINANCE_EXPENSES: true, FINANCE_INCOME_STATEMENT: true,
    MASTERS_INTEREST_RATES: false, MASTERS_PAYMENT_MODES: true, MASTERS_CUSTOMERS: true, MASTERS_INVESTORS: true, MASTERS_STAFF: true, MASTERS_RBAC: false
  },
  COLLECTOR: {
    LOANS_VIEW: true, LOANS_CREATE: false, LOANS_EDIT: false, LOANS_APPROVE: false, LOANS_CLOSE: false,
    COLLECTIONS_VIEW: true, COLLECTIONS_COLLECT: true, COLLECTIONS_REVERTS: false, COLLECTIONS_EXPORT: false,
    FINANCE_VIEW_CASHBOOK: false, FINANCE_GENERAL_LEDGER: false, FINANCE_EXPENSES: false, FINANCE_INCOME_STATEMENT: false,
    MASTERS_INTEREST_RATES: false, MASTERS_PAYMENT_MODES: false, MASTERS_CUSTOMERS: true, MASTERS_INVESTORS: false, MASTERS_STAFF: false, MASTERS_RBAC: false
  },
  ACCOUNTANT: {
    LOANS_VIEW: true, LOANS_CREATE: false, LOANS_EDIT: false, LOANS_APPROVE: false, LOANS_CLOSE: false,
    COLLECTIONS_VIEW: true, COLLECTIONS_COLLECT: true, COLLECTIONS_REVERTS: true, COLLECTIONS_EXPORT: true,
    FINANCE_VIEW_CASHBOOK: true, FINANCE_GENERAL_LEDGER: true, FINANCE_EXPENSES: true, FINANCE_INCOME_STATEMENT: true,
    MASTERS_INTEREST_RATES: false, MASTERS_PAYMENT_MODES: true, MASTERS_CUSTOMERS: true, MASTERS_INVESTORS: true, MASTERS_STAFF: false, MASTERS_RBAC: false
  }
};

export default function PermissionMatrix({ onSave }) {
  const [selectedRole, setSelectedRole] = useState('MANAGER');
  const [rolePermissions, setRolePermissions] = useState(DEFAULT_ROLE_PERMISSIONS);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const activeRoleObj = ROLES.find(r => r.id === selectedRole) || ROLES[0];
  const currentPerms = rolePermissions[selectedRole] || {};

  const togglePerm = (module, actionId) => {
    const key = `${module}_${actionId}`;
    setRolePermissions(prev => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [key]: !prev[selectedRole]?.[key]
      }
    }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(selectedRole, rolePermissions[selectedRole]);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {ROLES.map(r => {
          const isSelected = selectedRole === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setSelectedRole(r.id)}
              style={{
                background: isSelected ? '#FFFFFF' : '#F8FAFC',
                border: isSelected ? `2px solid ${r.color}` : '1px solid #E2E8F0',
                borderRadius: 12,
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? '0 4px 12px rgba(15, 23, 42, 0.06)' : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <strong style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>{r.name}</strong>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, background: r.bg, color: r.color, padding: '2px 8px', borderRadius: 12 }}>
                  {r.badge}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                Role Code: <strong style={{ color: '#334155' }}>{r.id}</strong>
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, background: '#FFF' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: activeRoleObj.bg, color: activeRoleObj.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                Permissions Matrix — {activeRoleObj.name}
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
                Configure system module access rules for <strong style={{ color: activeRoleObj.color }}>{activeRoleObj.id}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {savedSuccess && (
              <span style={{ color: '#059669', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check style={{ width: 14, height: 14 }} /> Saved!
              </span>
            )}
            <button
              onClick={handleSave}
              style={{
                background: '#059669',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Save style={{ width: 14, height: 14 }} />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                <th style={{ padding: '8px 0', fontSize: '0.75rem', color: '#64748B' }}>Domain Module</th>
                <th style={{ padding: '8px 0', fontSize: '0.75rem', color: '#64748B' }}>Action Permissions</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map(mod => (
                <tr key={mod.id}>
                  <td style={{ verticalAlign: 'top', paddingTop: 14 }}>
                    <strong style={{ fontWeight: 600, color: '#0F172A', display: 'block', fontSize: '0.84rem' }}>{mod.label}</strong>
                    <span style={{ fontSize: '0.68rem', color: '#64748B', fontFamily: 'monospace', textTransform: 'uppercase' }}>{mod.id}</span>
                  </td>
                  <td style={{ padding: '14px 0' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {mod.actions.map(act => {
                        const key = `${mod.id}_${act.id}`;
                        const isChecked = Boolean(currentPerms[key]);
                        return (
                          <button
                            key={act.id}
                            type="button"
                            onClick={() => togglePerm(mod.id, act.id)}
                            style={{
                              border: isChecked ? `1px solid ${activeRoleObj.color}` : '1px solid #CBD5E1',
                              background: isChecked ? activeRoleObj.bg : '#FFFFFF',
                              color: isChecked ? activeRoleObj.color : '#475569',
                              borderRadius: 8,
                              padding: '6px 12px',
                              fontSize: '0.75rem',
                              fontWeight: isChecked ? 600 : 500,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <div style={{
                              width: 14,
                              height: 14,
                              borderRadius: 4,
                              border: isChecked ? `1px solid ${activeRoleObj.color}` : '1px solid #CBD5E1',
                              background: isChecked ? activeRoleObj.color : '#FFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {isChecked && <Check style={{ width: 10, height: 10, color: '#FFF' }} />}
                            </div>
                            <span>{act.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
