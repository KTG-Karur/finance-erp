import React, { useState, useEffect } from 'react';
import PermissionMatrix from '../../components/PermissionMatrix';
import BorrowersView from '../borrowers/BorrowersView';
import OrganizationHierarchyView from './OrganizationHierarchyView';
import LoanSchemeMasterView from './LoanSchemeMasterView';
import AccountingMastersView from './AccountingMastersView';
import {
  Settings,
  Users,
  Shield,
  Building2,
  Save,
  Plus,
  Check,
  Search,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X
} from 'lucide-react';

export default function MasterSettingsView({
  initialTab = 'interest-details',
  tenant,
  user,
  employees,
  onSavePermissions,
  onCreateEmployee,
  onQuickAction,
  borrowers,
  loans,
  onCreateBorrower,
  onUpdateBorrower,
  onDeleteBorrower,
  onOpenKycReview,
  subCompanies,
  branchesList,
  orgLoading,
  orgError,
  onCreateSubCompany,
  onUpdateSubCompany,
  onDeleteSubCompany,
  onCreateBranch,
  onUpdateBranch,
  onDeleteBranch,
  loanSchemes,
  onCreateLoanScheme,
  onUpdateLoanScheme,
  onDeleteLoanScheme,
  expenseCategories,
  onCreateExpenseCategory,
  onUpdateExpenseCategory,
  onDeleteExpenseCategory,
  chartOfAccounts,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeModal, setActiveModal] = useState(null); // 'STAFF' | null
  const [selectedEmployee, setSelectedEmployee] = useState(employees[0] || null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: '', email: '', role: 'COLLECTOR', branch_ids: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (initialTab && initialTab !== 'calculator') {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [companyForm, setCompanyForm] = useState({
    name: tenant?.name || 'Alpha Financial Services Ltd',
    code: 'ALPHA',
    db_name: 'tenant_alpha_db',
    gstin: '33AAAAA0000A1Z5',
    pan: 'ABCDE1234F',
    address: '123 Enterprise Financial Towers, Commerce Road, Chennai - 600001',
    phone: '+91 44 2850 1000'
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await onCreateEmployee(newEmp);
      setShowAddForm(false);
      setNewEmp({ name: '', email: '', role: 'COLLECTOR' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompanySave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const filteredEmployees = employees.filter(emp => 
    !searchQuery || 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination Calculation
  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + pageSize);

  if (activeTab === 'customer-details') {
    return (
      <BorrowersView
        borrowers={borrowers}
        loans={loans}
        branches={branchesList}
        onCreateBorrower={onCreateBorrower}
        onUpdateBorrower={onUpdateBorrower}
        onDeleteBorrower={onDeleteBorrower}
        onOpenKycReview={onOpenKycReview}
      />
    );
  }

  if (activeTab === 'interest-details' || activeTab === 'interest-master') {
    return (
      <LoanSchemeMasterView
        schemes={loanSchemes}
        onCreateScheme={onCreateLoanScheme}
        onUpdateScheme={onUpdateLoanScheme}
        onDeleteScheme={onDeleteLoanScheme}
      />
    );
  }

  if (activeTab === 'accounting-masters') {
    return (
      <AccountingMastersView
        expenseCategories={expenseCategories}
        onCreateExpenseCategory={onCreateExpenseCategory}
        onUpdateExpenseCategory={onUpdateExpenseCategory}
        onDeleteExpenseCategory={onDeleteExpenseCategory}
        chartOfAccounts={chartOfAccounts}
        onCreateAccount={onCreateAccount}
        onUpdateAccount={onUpdateAccount}
        onDeleteAccount={onDeleteAccount}
      />
    );
  }

  if (activeTab === 'org-hierarchy' || activeTab === 'company-info') {
    return (
      <OrganizationHierarchyView
        subCompanies={subCompanies}
        branches={branchesList}
        loading={orgLoading}
        error={orgError}
        onCreateSubCompany={onCreateSubCompany}
        onUpdateSubCompany={onUpdateSubCompany}
        onDeleteSubCompany={onDeleteSubCompany}
        onCreateBranch={onCreateBranch}
        onUpdateBranch={onUpdateBranch}
        onDeleteBranch={onDeleteBranch}
        companyForm={companyForm}
        setCompanyForm={setCompanyForm}
        onSaveCompany={handleCompanySave}
        savedSuccess={savedSuccess}
      />
    );
  }

  return (
    <div className="active-loans-page">
      
      {/* ── 1. Executive Single-Page Top Header ──────────── */}
      <div className="active-loans-header">
        <div className="header-left">
          <div className="header-badge-icon" style={{ background: '#F1F5F9', borderColor: '#CBD5E1', color: '#334155' }}>
            <Settings style={{ width: 20, height: 20 }} />
          </div>
          <div className="header-text">
            <h1 style={{ fontWeight: 600 }}>
              {activeTab === 'staff-directory' && 'Staff Directory'}
              {activeTab === 'rbac-matrix' && 'Roles & Permissions (RBAC)'}
            </h1>
            <p style={{ fontWeight: 400 }}>
              {activeTab === 'staff-directory' && 'Manage enterprise staff members and system user accounts'}
              {activeTab === 'rbac-matrix' && 'Define role-level permissions matrix for Super Admin, Manager, Field Collector, and Accountant'}
            </p>
          </div>
        </div>

        <div className="header-actions">
          {activeTab === 'staff-directory' && (
            <button
              className="btn-disburse"
              onClick={() => setActiveModal('STAFF')}
              style={{ background: '#0F172A', fontWeight: 600 }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              <span>Add Staff Member</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Sub-Tab 5: Staff Directory View ──────────────────────── */}
      {activeTab === 'staff-directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {showAddForm && (
            <form onSubmit={handleAddSubmit} style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 12,
              padding: 16,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 180px auto',
              gap: 12,
              alignItems: 'end'
            }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 }}>Full Staff Name</label>
                <input
                  type="text"
                  value={newEmp.name}
                  onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                  required
                  placeholder="e.g. David Manager"
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.82rem',
                    color: '#0F172A',
                    fontWeight: 500
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 }}>Email Address</label>
                <input
                  type="email"
                  value={newEmp.email}
                  onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                  required
                  placeholder="david@company.com"
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.82rem',
                    color: '#0F172A',
                    fontWeight: 500
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 }}>System Role</label>
                <select
                  value={newEmp.role}
                  onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.82rem',
                    color: '#0F172A',
                    fontWeight: 500
                  }}
                >
                  <option value="COLLECTOR">COLLECTOR</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <button
                type="submit"
                style={{
                  height: 38,
                  background: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0 16px',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Save Staff
              </button>
            </form>
          )}

          <div className="loans-table-card">
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 50, textAlign: 'center' }}>S.No</th>
                    <th>Staff Member Name</th>
                    <th>Email Address</th>
                    <th>System Role</th>
                    <th>Branch Access</th>
                    <th style={{ textAlign: 'center' }}>Account Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.map((emp, idx) => (
                    <tr key={emp.id}>
                      <td style={{ textAlign: 'center', color: '#64748B', fontWeight: 500 }}>
                        {startIndex + idx + 1}
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#2563EB',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            {emp.name.charAt(0)}
                          </div>
                          <span style={{ color: '#0F172A', fontSize: '0.82rem', fontWeight: 600 }}>
                            {emp.name}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span style={{ color: '#64748B', fontSize: '0.78rem', fontWeight: 500 }}>
                          {emp.email}
                        </span>
                      </td>

                      <td>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          background: '#F3E8FF',
                          color: '#7C3AED',
                          border: '1px solid #E9D5FF'
                        }}>
                          {emp.role}
                        </span>
                      </td>

                      <td>
                        {emp.branchScope === 'GLOBAL' ? (
                          <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>All Branches</span>
                        ) : (emp.branches && emp.branches.length > 0) ? (
                          <span style={{ fontSize: '0.72rem', color: '#334155' }}>
                            {emp.branches.map(b => b.code).join(', ')}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Unassigned</span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          background: '#ECFDF5',
                          color: '#047857',
                          border: '1px solid #A7F3D0'
                        }}>
                          ACTIVE
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => { setSelectedEmployee(emp); setActiveTab('rbac-matrix'); }}
                          style={{
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            color: '#334155',
                            fontSize: '0.72rem',
                            fontWeight: 500,
                            padding: '5px 12px',
                            borderRadius: 7,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Shield style={{ width: 12, height: 12 }} />
                          <span>Configure RBAC</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Pagination */}
            <div className="table-pagination">
              <div className="table-pagination__info">
                Showing <strong>{filteredEmployees.length === 0 ? 0 : startIndex + 1}</strong> to <strong>{Math.min(startIndex + pageSize, filteredEmployees.length)}</strong> of <strong>{filteredEmployees.length}</strong> entries
              </div>
              <div className="table-pagination__controls">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft style={{ width: 14, height: 14 }} />
                  <span>Previous</span>
                </button>
                <span className="page-indicator">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <span>Next</span>
                  <ChevronRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── SECTION 6: Roles & Permissions Matrix View ──────────────────────── */}
      {activeTab === 'rbac-matrix' && (
        <div>
          <PermissionMatrix onSave={onSavePermissions} />
        </div>
      )}

      {/* ── MODALS FOR ALL MASTER ENTITIES ── */}

      {/* 5. Staff Member Modal */}
      {activeModal === 'STAFF' && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card" style={{ maxWidth: 520 }}>
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: '#F1F5F9', color: '#0F172A' }}>
                  <Users style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3 style={{ fontWeight: 600 }}>Add New Staff Member</h3>
                  <p>Create staff profile & assign organizational role</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="close-btn" type="button">
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await onCreateEmployee(newEmp);
                  setNewEmp({ name: '', email: '', role: 'COLLECTOR', branch_ids: [] });
                  setActiveModal(null);
                } catch (err) {
                  console.error(err);
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}
            >
              <div className="form-group">
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Full Staff Name *</label>
                <input
                  type="text"
                  required
                  value={newEmp.name}
                  onChange={e => setNewEmp({ ...newEmp, name: e.target.value })}
                  placeholder="e.g. David Manager"
                  style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Email Address *</label>
                <input
                  type="email"
                  required
                  value={newEmp.email}
                  onChange={e => setNewEmp({ ...newEmp, email: e.target.value })}
                  placeholder="david@company.com"
                  style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Role Assignment *</label>
                <select
                  value={newEmp.role}
                  onChange={e => setNewEmp({ ...newEmp, role: e.target.value })}
                  style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', background: '#FFF' }}
                >
                  <option value="COLLECTOR">Field Collector Agent</option>
                  <option value="MANAGER">Branch Manager</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              {newEmp.role !== 'ADMIN' && (
                <div className="form-group">
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
                    Branch Access {newEmp.branch_ids.length === 0 && <span style={{ textTransform: 'none', fontWeight: 400, color: '#94A3B8' }}>(none selected = full company-wide access)</span>}
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 8, padding: 10 }}>
                    {(branchesList || []).length === 0 ? (
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>No branches configured yet — set them up under Organization Hierarchy.</span>
                    ) : branchesList.map(b => (
                      <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#334155', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={newEmp.branch_ids.includes(b.id)}
                          onChange={(e) => {
                            setNewEmp(prev => ({
                              ...prev,
                              branch_ids: e.target.checked
                                ? [...prev.branch_ids, b.id]
                                : prev.branch_ids.filter(id => id !== b.id)
                            }));
                          }}
                        />
                        <span>{b.name} <span style={{ color: '#94A3B8', fontFamily: 'monospace', fontSize: '0.7rem' }}>({b.code})</span></span>
                      </label>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.68rem', color: '#94A3B8', margin: '4px 0 0 0' }}>
                    Selecting 2+ branches means this staff member will choose a working branch at login. 1 branch auto-selects it.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setActiveModal(null)} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
