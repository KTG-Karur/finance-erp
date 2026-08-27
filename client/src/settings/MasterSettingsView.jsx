import React, { useState, useEffect, useRef, useMemo } from 'react';
import PermissionMatrix, { DEFAULT_ROLES, getStoredCustomRoles } from '../components/PermissionMatrix';
import BorrowersView from '../finance/borrowers/BorrowersView';
import OrganizationHierarchyView from './OrganizationHierarchyView';
import LoanSchemeMasterView from './LoanSchemeMasterView';
import ExpenseAllocationView from './ExpenseAllocationView';
import ChartOfAccountsMasterView from './ChartOfAccountsMasterView';
import BankAccountMasterView from './BankAccountMasterView';
import InvestorCapitalView from '../finance/investors/InvestorCapitalView';
import BrandThemeSettingsView from './BrandThemeSettingsView';
import DraftsArchiveView from './DraftsArchiveView';
import FinancialYearClosingView from './FinancialYearClosingView';
import SharedDropdown from '../components/common/SharedDropdown';
import { uploadFile } from '../api/upload.js';
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
  Pencil,
  X,
  Key,
  Phone,
  ArrowLeft,
  User,
  Mail,
  Lock,
  Building,
  Camera,
  Upload,
  UserCheck
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function MasterSettingsView({
  initialTab = 'interest-details',
  tenant,
  user,
  employees = [],
  roles = [],
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  onSavePermissions,
  onCreateEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onUpdateEmployeePermissions,
  onQuickAction,
  borrowers,
  loans,
  onCreateBorrower,
  onUpdateBorrower,
  onDeleteBorrower,
  branchesList = [],
  orgLoading,
  orgError,
  onCreateBranch,
  onUpdateBranch,
  onDeleteBranch,
  onSaveCompanyProfile,
  loanSchemes,
  onCreateLoanScheme,
  onUpdateLoanScheme,
  onDeleteLoanScheme,
  customFormulas,
  onCreateCustomFormula,
  onUpdateCustomFormula,
  onDeleteCustomFormula,
  expenseCategories,
  onCreateExpenseCategory,
  onUpdateExpenseCategory,
  onDeleteExpenseCategory,
  expenseAllocationRequests,
  onAddExpenseFunds,
  chartOfAccounts = [],
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  bankAccounts = [],
  onCreateBankAccount,
  onUpdateBankAccount,
  onDeleteBankAccount,
  investors = [],
  onCreateInvestor,
  onUpdateInvestor,
  onDeleteInvestor,
  onAddInvestorCapital,
  journalEntries = [],
  onSaveTheme,
  onRefreshData
}) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  const [activeModal, setActiveModal] = useState(null); // 'CREATE_STAFF' | 'EDIT_STAFF' | 'DELETE_STAFF' | 'STAFF_PERMISSIONS' | null
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedStaffForRbac, setSelectedStaffForRbac] = useState(null);
  const [staffFormError, setStaffFormError] = useState('');

  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'COLLECTOR',
    photo: '',
    enable_auth: true,
    userId: '',
    password: '',
    branch_ids: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (initialTab && initialTab !== 'calculator') {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [companyForm, setCompanyForm] = useState({
    name: tenant?.name || '',
    gstin: tenant?.gstin || '',
    pan: tenant?.pan || '',
    address: tenant?.address || '',
    phone: tenant?.phone || '',
    logo: tenant?.logo || null
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // `tenant` starts out with only what the login response carries (id/name) —
  // gstin/pan/address/phone/logo arrive later via App.jsx's fetchCompanyProfile
  // API call, which can resolve after this component has already mounted.
  // `hasEditedCompanyFormRef` (set true the moment the staff member types
  // anything, via trackedSetCompanyForm below) guards against that late
  // arrival — or any other later tenant refresh — silently overwriting
  // in-progress unsaved edits. It resets after a successful save, since at
  // that point there's nothing unsaved left to protect and the tenant's
  // refreshed values are exactly what was just submitted.
  const hasEditedCompanyFormRef = useRef(false);
  useEffect(() => {
    if (hasEditedCompanyFormRef.current) return;
    setCompanyForm({
      name: tenant?.name || '',
      gstin: tenant?.gstin || '',
      pan: tenant?.pan || '',
      address: tenant?.address || '',
      phone: tenant?.phone || '',
      logo: tenant?.logo || null
    });
  }, [tenant?.name, tenant?.gstin, tenant?.pan, tenant?.address, tenant?.phone, tenant?.logo]);

  const trackedSetCompanyForm = (updater) => {
    hasEditedCompanyFormRef.current = true;
    setCompanyForm(updater);
  };

  const handleOpenStaffRbacModal = (emp) => {
    setSelectedStaffForRbac(emp);
    setActiveModal('STAFF_PERMISSIONS');
  };

  const handleOpenAddStaff = () => {
    setStaffForm({
      name: '',
      email: '',
      phone: '',
      role: 'COLLECTOR',
      photo: '',
      enable_auth: true,
      userId: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
      password: '',
      branch_ids: []
    });
    setSelectedStaff(null);
    setStaffFormError('');
    setActiveModal('CREATE_STAFF');
  };

  const handleOpenEditStaff = (emp) => {
    setSelectedStaff(emp);
    const branchIds = emp.branch_ids || (emp.branches ? emp.branches.map(b => typeof b === 'object' ? b.id : b) : []);
    setStaffForm({
      name: emp.name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      role: emp.role || 'COLLECTOR',
      photo: emp.photo || emp.profile_image || '',
      enable_auth: emp.enable_auth !== false,
      userId: emp.userId || emp.username || `USR-${emp.id || 1001}`,
      password: '',
      branch_ids: branchIds
    });
    setStaffFormError('');
    setActiveModal('EDIT_STAFF');
  };

  const handleOpenDeleteStaff = (emp) => {
    setSelectedStaff(emp);
    setActiveModal('DELETE_STAFF');
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStaffFormError('Please upload an image file (JPG or PNG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStaffFormError('Photo is too large — please upload an image under 5MB.');
      return;
    }
    setStaffFormError('');
    try {
      const res = await uploadFile(file, { subfolder: 'staff', category: 'photo', prefix: 'staff_photo' });
      if (res?.url) {
        setStaffForm(prev => ({ ...prev, photo: res.url }));
      }
    } catch {
      setStaffFormError('Failed to upload staff photo.');
    }
  };

  const [staffActionLoading, setStaffActionLoading] = useState(false);

  const handleStaffFormSubmit = async (e) => {
    e.preventDefault();
    if (staffActionLoading) return;
    setStaffActionLoading(true);
    setStaffFormError('');
    try {
      if (activeModal === 'CREATE_STAFF') {
        await onCreateEmployee?.(staffForm);
      } else if (activeModal === 'EDIT_STAFF' && selectedStaff) {
        await onUpdateEmployee?.(selectedStaff.id, staffForm);
      }
      setActiveModal(null);
      setSelectedStaff(null);
    } catch (err) {
      console.error(err);
      setStaffFormError(err?.response?.data?.message || err?.message || 'Failed to save this staff member.');
    } finally {
      setStaffActionLoading(false);
    }
  };

  const handleConfirmDeleteStaff = async () => {
    if (!selectedStaff || staffActionLoading) return;
    setStaffActionLoading(true);
    try {
      await onDeleteEmployee?.(selectedStaff.id);
      setActiveModal(null);
      setSelectedStaff(null);
    } catch (err) {
      console.error(err);
    } finally {
      setStaffActionLoading(false);
    }
  };

  // `permissions` here is the real [{module, action, allowed}] row shape the
  // server's moduleGuard actually reads (see PermissionMatrix.jsx) — this must
  // go through onUpdateEmployeePermissions (PUT /employees/:id/permissions),
  // not onUpdateEmployee (a plain profile update that silently drops anything
  // it doesn't recognize, including a `permissions` field).
  const handleSaveStaffPermissions = async (staffId, updatedRole, permissions) => {
    if (staffId && onUpdateEmployeePermissions) {
      await onUpdateEmployeePermissions(staffId, updatedRole, permissions);
      setActiveModal(null);
    } else if (onSavePermissions) {
      await onSavePermissions(updatedRole, permissions);
      setActiveModal(null);
    }
  };

  const [companySaveError, setCompanySaveError] = useState('');
  const [companySaving, setCompanySaving] = useState(false);

  const handleCompanySave = async (e) => {
    e.preventDefault();
    if (companySaving) return;
    setCompanySaving(true);
    setCompanySaveError('');
    try {
      await onSaveCompanyProfile?.(companyForm);
      hasEditedCompanyFormRef.current = false;
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setCompanySaveError(err?.response?.data?.message || 'Failed to save company profile.');
    } finally {
      setCompanySaving(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    !searchQuery || 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (emp.phone && emp.phone.includes(searchQuery))
  );

  // Pagination Calculation
  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + pageSize);

  const [customRoles, setCustomRoles] = useState(getStoredCustomRoles);

  useEffect(() => {
    const handleRolesUpdated = () => {
      setCustomRoles(getStoredCustomRoles());
    };
    window.addEventListener('roles-updated', handleRolesUpdated);
    return () => window.removeEventListener('roles-updated', handleRolesUpdated);
  }, []);

  const allRolesList = useMemo(() => {
    const localizedDefaults = DEFAULT_ROLES.map(r => {
      if (r.id === 'ADMIN') return { ...r, name: t('staff.modal.role_admin') || r.name };
      if (r.id === 'MANAGER') return { ...r, name: t('staff.modal.role_manager') || r.name };
      if (r.id === 'COLLECTOR') return { ...r, name: t('staff.modal.role_collector') || r.name };
      if (r.id === 'STAFF') return { ...r, name: t('staff.modal.role_staff') || r.name };
      return r;
    });
    return [...localizedDefaults, ...customRoles];
  }, [t, customRoles]);

  const getRoleLabel = (roleCode) => {
    if (roleCode === 'ADMIN' || roleCode === 'SUPER_ADMIN') return 'System Administrator';
    if (roleCode === 'COMPANY_ADMIN') return 'Company Admin';
    if (roleCode === 'MANAGER') return 'Branch Manager';
    if (roleCode === 'COLLECTOR') return 'Field Collector Agent';
    if (roleCode === 'STAFF') return 'General Staff';
    const found = allRolesList.find(r => r.id === roleCode);
    return found ? found.name : (roleCode || 'Staff');
  };

  if (activeTab === 'customer-details') {
    return (
      <BorrowersView
        borrowers={borrowers}
        loans={loans}
        branches={branchesList}
        onCreateBorrower={onCreateBorrower}
        onUpdateBorrower={onUpdateBorrower}
        onDeleteBorrower={onDeleteBorrower}
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
        customFormulas={customFormulas}
        onCreateCustomFormula={onCreateCustomFormula}
        onUpdateCustomFormula={onUpdateCustomFormula}
        onDeleteCustomFormula={onDeleteCustomFormula}
      />
    );
  }

  if (activeTab === 'chart-of-accounts') {
    return (
      <ChartOfAccountsMasterView
        chartOfAccounts={chartOfAccounts}
        onCreateAccount={onCreateAccount}
        onUpdateAccount={onUpdateAccount}
        onDeleteAccount={onDeleteAccount}
      />
    );
  }

  if (activeTab === 'bank-accounts' || activeTab === 'banking-master') {
    return (
      <BankAccountMasterView
        bankAccounts={bankAccounts}
        branchesList={branchesList}
        chartOfAccounts={chartOfAccounts}
        onCreateBankAccount={onCreateBankAccount}
        onUpdateBankAccount={onUpdateBankAccount}
        onDeleteBankAccount={onDeleteBankAccount}
      />
    );
  }

  if (activeTab === 'investor-master' || activeTab === 'investors' || activeTab === 'investor-capital') {
    return (
      <InvestorCapitalView
        investors={investors}
        bankAccounts={bankAccounts}
        branchesList={branchesList}
        journalEntries={journalEntries}
        onCreateInvestor={onCreateInvestor}
        onUpdateInvestor={onUpdateInvestor}
        onDeleteInvestor={onDeleteInvestor}
        onAddInvestorCapital={onAddInvestorCapital}
      />
    );
  }

  if (activeTab === 'accounting-masters') {
    return (
      <ExpenseAllocationView
        user={user}
        expenseCategories={expenseCategories}
        branchesList={branchesList}
        onCreateExpenseCategory={onCreateExpenseCategory}
        onUpdateExpenseCategory={onUpdateExpenseCategory}
        onDeleteExpenseCategory={onDeleteExpenseCategory}
        expenseAllocationRequests={expenseAllocationRequests}
        onAddExpenseFunds={onAddExpenseFunds}
      />
    );
  }

  if (activeTab === 'org-hierarchy' || activeTab === 'company-info') {
    return (
      <OrganizationHierarchyView
        tenant={tenant}
        branches={branchesList}
        loading={orgLoading}
        error={orgError}
        onCreateBranch={onCreateBranch}
        onUpdateBranch={onUpdateBranch}
        onDeleteBranch={onDeleteBranch}
        companyForm={companyForm}
        setCompanyForm={trackedSetCompanyForm}
        onSaveCompany={handleCompanySave}
        savedSuccess={savedSuccess}
        companySaveError={companySaveError}
        companySaving={companySaving}
      />
    );
  }

  if (activeTab === 'brand-theme' || activeTab === 'theme') {
    return (
      <BrandThemeSettingsView
        tenant={tenant}
        user={user}
        onSaveTheme={onSaveTheme}
      />
    );
  }

  if (activeTab === 'drafts-archive' || activeTab === 'drafts' || activeTab === 'trash' || activeTab === 'deleted-records') {
    return (
      <DraftsArchiveView
        onRestored={onRefreshData}
      />
    );
  }

  if (activeTab === 'financial-years' || activeTab === 'fy-closing' || activeTab === 'financial-year' || activeTab === 'period-closing') {
    return (
      <FinancialYearClosingView
        user={user}
        onRefreshData={onRefreshData}
      />
    );
  }

  return (
    <div className="active-loans-page">
      
      {/* ── 1. Top Header ────────────────────────────────────────────── */}
      <div className="active-loans-header">
        <div className="header-left">
          <div className="header-badge-icon" style={{ background: '#F1F5F9', borderColor: '#CBD5E1', color: '#334155' }}>
            <Settings style={{ width: 20, height: 20 }} />
          </div>
          <div className="header-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {activeTab === 'rbac-matrix' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('staff-directory')}
                  style={{
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
                    flexShrink: 0
                  }}
                  title={t('rbac.back_to_staff')}
                >
                  <ArrowLeft style={{ width: 16, height: 16 }} />
                </button>
              )}
              <h1 style={{ fontWeight: 600, margin: 0 }}>
                {activeTab === 'staff-directory' && t('staff.title')}
                {activeTab === 'rbac-matrix' && t('rbac.title')}
              </h1>
            </div>
            <p style={{ fontWeight: 400, marginTop: 4 }}>
              {activeTab === 'staff-directory' && t('staff.subtitle')}
              {activeTab === 'rbac-matrix' && t('rbac.subtitle')}
            </p>
          </div>
        </div>

        <div className="header-actions">
          {activeTab === 'staff-directory' && (
            <button
              type="button"
              className="btn-disburse"
              onClick={handleOpenAddStaff}
              style={{ background: '#0F172A', color: '#FFFFFF', fontWeight: 600 }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              <span>{t('staff.add_member')}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Staff Directory View ───────────────────────────────────── */}
      {activeTab === 'staff-directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          <div className="loans-table-card">
            <div className="fin-table-scroll">
              <table style={{ minWidth: 640 }}>
                <thead>
                  <tr>
                    <th style={{ width: 50, textAlign: 'center' }}>{t('col.sno')}</th>
                    <th>{t('col.staff_member_name')}</th>
                    <th>{t('col.email_address')}</th>
                    <th>{t('col.system_role')}</th>
                    <th>{t('col.branch_access')}</th>
                    <th style={{ textAlign: 'right' }}>{t('col.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                        No staff members found.
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployees.map((emp, idx) => (
                      <tr key={emp.id}>
                        <td style={{ textAlign: 'center', color: '#64748B', fontWeight: 500 }}>
                          {startIndex + idx + 1}
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {emp.photo || emp.profile_image ? (
                              <img
                                src={emp.photo || emp.profile_image}
                                alt={emp.name}
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '1px solid #CBD5E1'
                                }}
                              />
                            ) : (
                              <div style={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                background: '#F1F5F9',
                                border: '1px solid #CBD5E1',
                                color: '#334155',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8rem',
                                fontWeight: 600
                              }}>
                                {emp.name.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ color: '#0F172A', fontSize: '0.84rem', fontWeight: 600 }}>
                                {emp.name}
                              </span>
                              {emp.phone && (
                                <span style={{ color: '#64748B', fontSize: '0.72rem' }}>
                                  {emp.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span style={{ color: '#334155', fontSize: '0.78rem', fontWeight: 500 }}>
                            {emp.email}
                          </span>
                        </td>

                        <td>
                          <span style={{ color: '#0F172A', fontSize: '0.8rem', fontWeight: 500 }}>
                            {getRoleLabel(emp.role)}
                          </span>
                        </td>

                        <td>
                          {emp.role === 'COMPANY_ADMIN' || emp.role === 'SUPER_ADMIN' ? (
                            <span style={{ fontSize: '0.78rem', color: '#0F172A', fontWeight: 600 }}>All Branches (Company Admin)</span>
                          ) : (emp.branches && emp.branches.length > 0) ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {emp.branches.map((b, i) => (
                                <span key={i} style={{
                                  fontSize: '0.74rem',
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  backgroundColor: '#EFF6FF',
                                  color: '#1D4ED8',
                                  border: '1px solid #BFDBFE'
                                }}>
                                  {typeof b === 'object' ? b.name : (branchesList.find(br => br.id === b)?.name || `Branch #${b}`)}
                                </span>
                              ))}
                            </div>
                          ) : (emp.branch_ids && emp.branch_ids.length > 0) ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {emp.branch_ids.map((bId, i) => (
                                <span key={i} style={{
                                  fontSize: '0.74rem',
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  backgroundColor: '#EFF6FF',
                                  color: '#1D4ED8',
                                  border: '1px solid #BFDBFE'
                                }}>
                                  {branchesList.find(br => br.id === bId)?.name || `Branch #${bId}`}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 500 }}>
                              All Branches
                            </span>
                          )}
                        </td>

                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap', width: 140 }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, flexShrink: 0 }}>
                            {/* Small Configure RBAC Button (Opens Dedicated Modal In-Place) */}
                            <button
                              type="button"
                              onClick={() => handleOpenStaffRbacModal(emp)}
                              style={{
                                border: '1px solid #CBD5E1',
                                background: '#FFFFFF',
                                color: '#334155',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                height: 30,
                                padding: '0 8px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                flexShrink: 0
                              }}
                              title="Configure Custom Permissions for this Staff Member"
                            >
                              <Shield style={{ width: 12, height: 12, flexShrink: 0 }} />
                              <span>RBAC</span>
                            </button>

                            {/* Edit Staff Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditStaff(emp)}
                              style={{
                                width: 30,
                                height: 30,
                                flexShrink: 0,
                                border: '1px solid #CBD5E1',
                                background: '#FFFFFF',
                                color: 'var(--color-info, #2563EB)',
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0
                              }}
                              title="Edit Staff Member Details"
                            >
                              <Pencil style={{ width: 13, height: 13, flexShrink: 0 }} />
                            </button>

                            {/* Delete Staff Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteStaff(emp)}
                              style={{
                                width: 30,
                                height: 30,
                                flexShrink: 0,
                                border: '1px solid var(--color-danger-border, #FCA5A5)',
                                background: 'var(--color-danger-light, #FEF2F2)',
                                color: 'var(--color-danger, #DC2626)',
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0
                              }}
                              title="Delete / Deactivate Staff Account"
                            >
                              <Trash2 style={{ width: 13, height: 13, flexShrink: 0 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
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

      {/* ── 3. Roles & Permissions Matrix View (Global Role Template Manager) ── */}
      {activeTab === 'rbac-matrix' && (
        <div>
          <PermissionMatrix
            initialRole="MANAGER"
            selectedStaffMember={null}
            employees={employees}
            roles={roles}
            onCreateRole={onCreateRole}
            onUpdateRole={onUpdateRole}
            onDeleteRole={onDeleteRole}
            onSavePermissions={handleSaveStaffPermissions}
            onClose={() => setActiveTab('staff-directory')}
          />
        </div>
      )}

      {/* ── 4. Dedicated Staff Permissions Override Modal ── */}
      {activeModal === 'STAFF_PERMISSIONS' && selectedStaffForRbac && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.25), 0 0 0 1px #E2E8F0',
            width: '100%',
            maxWidth: 900,
            maxHeight: '94vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            {/* Modal Header Bar */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Shield style={{ width: 22, height: 22, color: 'var(--brand-primary, #15803D)' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#0F172A' }}>
                    Custom Permissions: {selectedStaffForRbac.name}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Assigned Role: <strong>{getRoleLabel(selectedStaffForRbac.role)}</strong> | {selectedStaffForRbac.email}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#64748B',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              <PermissionMatrix
                initialRole={selectedStaffForRbac.role}
                selectedStaffMember={selectedStaffForRbac}
                roles={roles}
                onCreateRole={onCreateRole}
                onUpdateRole={onUpdateRole}
                onDeleteRole={onDeleteRole}
                onSaveStaffPermissions={handleSaveStaffPermissions}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 2-PANEL MODAL FOR CREATE / EDIT STAFF WITH PHOTO & AUTH FIELDS */}
      {(activeModal === 'CREATE_STAFF' || activeModal === 'EDIT_STAFF') && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.25), 0 0 0 1px #E2E8F0',
            width: '100%',
            maxWidth: 780,
            maxHeight: '92vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>

            {/* Header Strip */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: activeModal === 'CREATE_STAFF' ? 'var(--brand-primary-light, #F0FEF5)' : 'var(--color-info-light, #EFF6FF)',
                  border: `1px solid ${activeModal === 'CREATE_STAFF' ? 'var(--brand-primary-border, #A3F5C1)' : 'var(--color-info-border, #BFDBFE)'}`,
                  color: activeModal === 'CREATE_STAFF' ? 'var(--brand-primary, #15803D)' : 'var(--color-info, #2563EB)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Users style={{ width: 20, height: 20 }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0F172A' }}>
                    {activeModal === 'CREATE_STAFF' ? t('staff.modal.add_title') : `${t('staff.modal.edit_title')} (${selectedStaff?.name})`}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                    {t('staff.modal.subtitle')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#64748B',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X style={{ width: 15, height: 15 }} />
              </button>
            </div>

            {/* Form Split 2-Panel Grid */}
            <form onSubmit={handleStaffFormSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

              {staffFormError && (
                <div style={{ margin: '0 24px', padding: '10px 14px', borderRadius: 9, fontSize: '0.8rem', fontWeight: 600, background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', color: 'var(--color-danger-hover, #B91C1C)' }}>
                  {staffFormError}
                </div>
              )}

              <div className="org-split-layout" style={{
                gap: 0,
                flex: 1,
                overflowY: 'auto'
              }}>

                {/* ── LEFT PANEL: Photo Upload, Personal Details & Role ── */}
                <div style={{
                  padding: 20,
                  borderRight: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  background: '#FFFFFF'
                }}>
                  
                  {/* Photo Profile Upload Control */}
                  <div style={{ textAlign: 'center', marginBottom: 4 }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      {staffForm.photo ? (
                        <img
                          src={staffForm.photo}
                          alt="Staff Profile"
                          style={{
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid var(--brand-primary, #15803D)',
                            boxShadow: '0 4px 12px rgba(var(--brand-primary-rgb), 0.2)'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 72,
                          height: 72,
                          borderRadius: '50%',
                          background: '#F1F5F9',
                          border: '2px dashed #CBD5E1',
                          color: '#64748B',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2
                        }}>
                          <Camera style={{ width: 22, height: 22, color: '#64748B' }} />
                        </div>
                      )}

                      <label style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        background: 'var(--brand-primary, #15803D)',
                        color: '#FFFFFF',
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                      }} title={t('staff.modal.upload_photo_title')}>
                        <Upload style={{ width: 13, height: 13 }} />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 6, fontWeight: 500 }}>
                      {staffForm.photo ? t('staff.modal.change_photo') : t('staff.modal.upload_photo')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 6, borderBottom: '1px solid #F1F5F9' }}>
                    <User style={{ width: 15, height: 15, color: 'var(--color-info, #2563EB)' }} />
                    <span style={{ fontSize: '0.75rem', color: '#0F172A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {t('staff.modal.details_role')}
                    </span>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      {t('staff.modal.full_name')}
                    </label>
                    <input
                      type="text"
                      required
                      value={staffForm.name}
                      onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                      placeholder="e.g. David Manager"
                      style={{
                        width: '100%',
                        height: 40,
                        padding: '0 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.85rem',
                        color: '#0F172A',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      {t('staff.modal.phone_number')}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone style={{ position: 'absolute', left: 12, top: 11, width: 15, height: 15, color: '#94A3B8' }} />
                      <input
                        type="text"
                        value={staffForm.phone}
                        onChange={e => setStaffForm({ ...staffForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="e.g. 9876543210"
                        style={{
                          width: '100%',
                          height: 40,
                          padding: '0 12px 0 36px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          fontSize: '0.85rem',
                          color: '#0F172A',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      {t('staff.modal.user_id') || 'Staff ID / Employee Code'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <UserCheck style={{ position: 'absolute', left: 12, top: 11, width: 15, height: 15, color: '#94A3B8' }} />
                      <input
                        type="text"
                        value={staffForm.userId}
                        onChange={e => setStaffForm({ ...staffForm, userId: e.target.value })}
                        placeholder="e.g. USR-4912"
                        style={{
                          width: '100%',
                          height: 40,
                          padding: '0 12px 0 36px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          fontSize: '0.85rem',
                          color: '#0F172A',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      {t('staff.modal.system_role')}
                    </label>
                    <SharedDropdown
                      value={staffForm.role}
                      onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}
                      buttonStyle={{ height: 42, fontSize: '0.85rem', fontWeight: 600 }}
                      options={allRolesList.map(r => ({ value: r.id, label: r.name }))}
                    />
                  </div>
                </div>

                {/* ── RIGHT PANEL: Branch Access & Authentication Credentials ─ */}
                <div style={{
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  background: '#F8FAFC'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottom: '1px solid #E2E8F0' }}>
                    <Key style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
                    <span style={{ fontSize: '0.78rem', color: '#0F172A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {t('staff.modal.branch_scope_auth')}
                    </span>
                  </div>

                  {/* Authentication Toggle & 2 Fields (Login Email + Password) */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 10,
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: '#0F172A', fontWeight: 600, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={staffForm.enable_auth}
                        onChange={(e) => setStaffForm({ ...staffForm, enable_auth: e.target.checked })}
                        style={{ width: 18, height: 18, accentColor: 'var(--brand-primary, #15803D)', cursor: 'pointer' }}
                      />
                      <span>{t('staff.modal.enable_auth')}</span>
                    </label>

                    {staffForm.enable_auth && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                        {/* 1. Login Email Address / Username Field */}
                        <div>
                          <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                            {t('staff.modal.email_address') || 'Login Email (Username)'}
                          </label>
                          <div style={{ position: 'relative' }}>
                            <Mail style={{ position: 'absolute', left: 12, top: 10, width: 15, height: 15, color: '#94A3B8' }} />
                            <input
                              type="email"
                              required={staffForm.enable_auth}
                              value={staffForm.email}
                              onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                              placeholder="e.g. david@company.com"
                              style={{
                                width: '100%',
                                height: 38,
                                padding: '0 12px 0 36px',
                                borderRadius: 8,
                                border: '1px solid #CBD5E1',
                                fontSize: '0.85rem',
                                color: '#0F172A',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                        </div>

                        {/* 2. Account Password Field */}
                        <div>
                          <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                            {activeModal === 'CREATE_STAFF' ? t('staff.modal.password_create') : t('staff.modal.password_update')}
                          </label>
                          <div style={{ position: 'relative' }}>
                            <Lock style={{ position: 'absolute', left: 12, top: 10, width: 15, height: 15, color: '#94A3B8' }} />
                            <input
                              type="password"
                              required={staffForm.enable_auth && activeModal === 'CREATE_STAFF'}
                              value={staffForm.password}
                              onChange={e => setStaffForm({ ...staffForm, password: e.target.value })}
                              placeholder="••••••••"
                              style={{
                                width: '100%',
                                height: 38,
                                padding: '0 12px 0 36px',
                                borderRadius: 8,
                                border: '1px solid #CBD5E1',
                                fontSize: '0.85rem',
                                color: '#0F172A',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Branch Access Selection */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, display: 'block' }}>
                      {t('staff.modal.branch_access')}
                    </label>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      maxHeight: 180,
                      overflowY: 'auto',
                      border: '1px solid #E2E8F0',
                      borderRadius: 10,
                      padding: 12,
                      background: '#FFFFFF'
                    }}>
                      {(branchesList || []).length === 0 ? (
                        <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{t('staff.modal.no_branches')}</span>
                      ) : branchesList.map(b => (
                        <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', color: '#334155', cursor: 'pointer', padding: '4px 0' }}>
                          <input
                            type="checkbox"
                            checked={staffForm.branch_ids.includes(b.id)}
                            onChange={(e) => {
                              setStaffForm(prev => ({
                                ...prev,
                                branch_ids: e.target.checked
                                  ? [...prev.branch_ids, b.id]
                                  : prev.branch_ids.filter(id => id !== b.id)
                              }));
                            }}
                            style={{ width: 16, height: 16, accentColor: 'var(--brand-primary, #15803D)' }}
                          />
                          <span>{b.name} <span style={{ color: '#94A3B8', fontFamily: 'monospace', fontSize: '0.72rem' }}>({b.code})</span></span>
                        </label>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

              {/* Action Footer Bar */}
              <div style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'flex-end',
                padding: '16px 24px',
                borderTop: '1px solid #E2E8F0',
                background: '#FFFFFF'
              }}>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  disabled={staffActionLoading}
                  style={{
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#334155',
                    padding: '10px 20px',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: staffActionLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {t('btn.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={staffActionLoading}
                  style={{
                    border: 'none',
                    background: staffActionLoading ? '#94A3B8' : '#0F172A',
                    color: '#FFFFFF',
                    padding: '10px 24px',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: staffActionLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
                  }}
                >
                  {staffActionLoading ? t('form.saving') : (activeModal === 'CREATE_STAFF' ? t('staff.modal.save') : t('staff.modal.update'))}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Delete Staff Member Modal */}
      {activeModal === 'DELETE_STAFF' && selectedStaff && (
        <div className="saas-modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{ maxWidth: 420, width: '100%', background: '#FFF', borderRadius: 14, padding: 24, textAlign: 'center', border: '1px solid #E2E8F0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-light, #FEE2E2)', color: 'var(--color-danger, #DC2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
              <Trash2 style={{ width: 22, height: 22 }} />
            </div>

            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0F172A' }}>
              Delete Staff Member?
            </h3>
            <p style={{ margin: '8px 0 20px 0', fontSize: '0.82rem', color: '#64748B', lineHeight: 1.4 }}>
              Are you sure you want to remove <strong style={{ color: '#0F172A' }}>{selectedStaff.name}</strong> ({selectedStaff.email}) from the staff directory?
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                disabled={staffActionLoading}
                style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: '0.82rem', fontWeight: 500, cursor: staffActionLoading ? 'not-allowed' : 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStaff}
                disabled={staffActionLoading}
                style={{ background: staffActionLoading ? '#94A3B8' : 'var(--color-danger, #DC2626)', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: '0.82rem', fontWeight: 600, cursor: staffActionLoading ? 'not-allowed' : 'pointer' }}
              >
                {staffActionLoading ? 'Deleting...' : 'Delete Staff Member'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
