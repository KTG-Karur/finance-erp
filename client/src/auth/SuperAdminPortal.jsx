import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Calendar,
  Clock,
  Edit3,
  CalendarCheck,
  Check,
  Building2,
  Crown,
  Plus,
  Search,
  ShieldCheck,
  LogOut,
  ExternalLink,
  Power,
  X,
  CheckCircle,
  Database,
  Users,
  LayoutDashboard,
  Layers,
  Activity,
  Settings,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  Server,
  RefreshCw,
  RotateCw,
  Sparkles,
  Info,
  Sliders,
  Terminal,
  ChevronRight,
  ChevronLeft,
  KeyRound,
  Lock,
  Camera,
  Trash,
  AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import SharedDropdown from '../components/common/SharedDropdown';
import SharedDatePicker from '../components/common/SharedDatePicker';
import api from '../api/client';

// Menu tree structure: single entries for standalone menus, nested checkboxes only for menus with real submenus
const MODULE_MENU_TREE = [
  {
    section: 'WORKSPACE',
    menus: [
      { key: 'dashboard', label: 'Dashboard' }
    ]
  },
  {
    section: 'FINANCE OPERATIONS',
    menus: [
      { key: 'loans', label: 'Loans' },
      { key: 'collections', label: 'Collections' },
      { key: 'fixed_deposits', label: 'Fixed Deposits' },
      { key: 'recurring_deposits', label: 'Recurring Deposits' },
      { key: 'borrowers', label: 'Customer Directory' }
    ]
  },
  {
    section: 'FINANCIALS',
    menus: [
      {
        key: 'ledger',
        label: 'Ledger',
        submenus: [
          { key: 'general_ledger', label: 'General Ledger' },
          { key: 'loan_ledger', label: 'Loan Ledger' },
          { key: 'customer_ledger', label: 'Customer Ledger' }
        ]
      },
      { key: 'trial_balance', label: 'Trial Balance' },
      { key: 'eod_process', label: 'Day-End Closing' },
      {
        key: 'vouchers',
        label: 'Vouchers',
        submenus: [
          { key: 'auto_vouchers', label: 'Auto Vouchers' },
          { key: 'manual_vouchers', label: 'Manual Vouchers' }
        ]
      }
    ]
  },
  {
    section: 'REPORTS',
    menus: [
      {
        key: 'reports',
        label: 'Reports',
        submenus: [
          { key: 'loan_portfolio_report', label: 'Loan Portfolio Report' },
          { key: 'collections_report', label: 'Collections Report' },
          { key: 'investor_capital_report', label: 'Investor Capital Report' },
          { key: 'fixed_deposit_report', label: 'Fixed Deposits Report' },
          { key: 'recurring_deposit_report', label: 'Recurring Deposits Report' },
          { key: 'financial_statements_report', label: 'Financial Statements Report' },
          { key: 'staff_performance_report', label: 'Staff Performance Report' }
        ]
      }
    ]
  },
  {
    section: 'MASTER SETTINGS',
    menus: [
      { key: 'org', label: 'Organization & Company' },
      { key: 'employees', label: 'Staff Directory' },
      { key: 'rbac', label: 'RBAC Matrix' },
      { key: 'loan_schemes', label: 'Loan Scheme Master' },
      { key: 'investors', label: 'Investor Master' },
      { key: 'expense_allocation', label: 'Expense Allocation' }
    ]
  }
];

const MODULE_KEYS = MODULE_MENU_TREE.flatMap(sec =>
  sec.menus.flatMap(m => [{ key: m.key, label: m.label }, ...(m.submenus || [])])
);

export default function SuperAdminPortal({ user, onJumpToTenant, onSignOut }) {
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [tenantsError, setTenantsError] = useState('');
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeNav, setActiveNav] = useState('dashboard'); // 'dashboard' | 'registry' | 'plans' | 'pools' | 'audit' | 'settings'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [form, setForm] = useState({ name: '', company_code: '', company_email: '', company_phone: '', admin_email: '', admin_password: '', logo: '', plan_code: 'STANDARD', status: 'TRIAL', trial_days: '15', billing_cycle: '3_MONTHS', custom_expiry_date: '' });
  const [planForm, setPlanForm] = useState({ name: '', code: '', max_branches: '5', monthly_price: '2999', six_month_price: '14999', yearly_price: '29990', allowed_modules: null });

  const openCreatePlanModal = () => {
    setEditingPlan(null);
    setPlanForm({ name: '', code: '', max_branches: '5', monthly_price: '2999', six_month_price: '14999', yearly_price: '29990', allowed_modules: null });
    setErrorMsg('');
    setActiveNav('plan-editor');
  };

  const openEditPlanModal = (plan) => {
    setEditingPlan(plan);
    const mPrice = Number(plan.monthly_price) || 0;
    const sixPrice = (plan.six_month_price && Number(plan.six_month_price) > 0)
      ? String(plan.six_month_price)
      : (mPrice > 0 ? String(Math.round(mPrice * 5.5)) : '0');
    const yPrice = (plan.yearly_price && Number(plan.yearly_price) > 0)
      ? String(plan.yearly_price)
      : (mPrice > 0 ? String(mPrice * 10) : '0');

    setPlanForm({
      name: plan.name,
      code: plan.code,
      max_branches: plan.max_branches ?? '',
      monthly_price: plan.monthly_price ?? '0',
      six_month_price: sixPrice,
      yearly_price: yPrice,
      allowed_modules: plan.allowed_modules ?? null
    });
    setErrorMsg('');
    setActiveNav('plan-editor');
  };

  const togglePlanModuleKey = (key) => {
    setPlanForm(prev => {
      const current = prev.allowed_modules ?? MODULE_KEYS.map(m => m.key);
      const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
      return { ...prev, allowed_modules: next };
    });
  };

  const selectAllPlanModules = () => {
    setPlanForm(prev => ({ ...prev, allowed_modules: null }));
  };

  const deselectAllPlanModules = () => {
    setPlanForm(prev => ({ ...prev, allowed_modules: [] }));
  };

  const selectAllAccessModules = () => {
    setAccessForm(prev => ({ ...prev, allowed_modules: null }));
  };

  const deselectAllAccessModules = () => {
    setAccessForm(prev => ({ ...prev, allowed_modules: [] }));
  };

  const [accessTarget, setAccessTarget] = useState(null);
  const [accessForm, setAccessForm] = useState({ max_branches: '', allowed_modules: null });
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [accessSuccessMsg, setAccessSuccessMsg] = useState('');
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordMsg, setResetPasswordMsg] = useState('');

  const handleJumpToCompanyTab = (tenant) => {
    if (!tenant || !tenant.company_code) return;
    const url = `${window.location.origin}/auth/login?company_code=${encodeURIComponent(tenant.company_code)}`;
    window.open(url, '_blank');
  };

  const handleResetAdminPassword = async () => {
    if (!accessTarget || !resetPasswordInput.trim()) return;
    setResetPasswordLoading(true);
    setResetPasswordMsg('');
    try {
      const res = await api.patch(`/auth/superadmin/companies/${accessTarget.id}/reset-admin-password`, {
        password: resetPasswordInput.trim()
      });
      setResetPasswordMsg(res.data?.message || 'Admin password updated.');
      setResetPasswordInput('');
    } catch (err) {
      setResetPasswordMsg(err?.response?.data?.message || 'Failed to update admin password.');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const [registrySummary, setRegistrySummary] = useState({ total_storage_formatted: '0 B', total_storage_bytes: 0 });

  const fetchTenants = async () => {
    setTenantsLoading(true);
    setTenantsError('');
    try {
      const res = await api.get('/auth/superadmin/companies');
      setTenants(res.data?.data || []);
      if (res.data?.summary) {
        setRegistrySummary(res.data.summary);
      }
    } catch (err) {
      setTenantsError(err?.response?.data?.message || 'Unable to load tenant registry.');
    } finally {
      setTenantsLoading(false);
    }
  };

  const fetchPlans = async () => {
    setPlansLoading(true);
    try {
      const res = await api.get('/auth/superadmin/plans');
      setPlans(res.data?.data || []);
    } catch (err) {
      console.warn('Failed to fetch plans:', err?.message);
    } finally {
      setPlansLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get('/auth/superadmin/audit-logs');
      setAuditLogs(res.data?.data || []);
    } catch (err) {
      setAuditLogs([]);
    }
  };

  // Subscriptions State
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subStatusFilter, setSubStatusFilter] = useState('ALL');
  const [subPlanFilter, setSubPlanFilter] = useState('ALL');
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isEditSubModalOpen, setIsEditSubModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [extendDays, setExtendDays] = useState('30');
  const [extendSubLoading, setExtendSubLoading] = useState(false);
  const [renewForm, setRenewForm] = useState({
    plan_id: '',
    duration_cycle: '3_MONTHS',
    custom_expiry_date: ''
  });
  const [renewLoading, setRenewLoading] = useState(false);
  const [editSubForm, setEditSubForm] = useState({
    plan_id: '',
    status: 'ACTIVE',
    start_date: '',
    end_date: '',
    auto_renew: false
  });
  const [editSubLoading, setEditSubLoading] = useState(false);

  const activePaidSubs = subscriptions.filter(s => s.status === 'ACTIVE' && !s.is_expired);
  const computedTotalRevenue = subscriptions.reduce((sum, sub) => {
    if (sub.status === 'TRIAL' || sub.status === 'CANCELLED') return sum;
    const mPrice = Number(sub.monthly_price) || (sub.plan_code === 'ENTERPRISE' ? 9999 : sub.plan_code === 'STARTER' ? 1999 : 2999);
    const yPrice = sub.yearly_price ? Number(sub.yearly_price) : mPrice * 10;
    const hPrice = sub.six_month_price ? Number(sub.six_month_price) : mPrice * 5.5;

    let termDays = 90;
    if (sub.start_date && sub.end_date) {
      const diff = (new Date(sub.end_date) - new Date(sub.start_date)) / (1000 * 60 * 60 * 24);
      if (diff > 0) termDays = Math.round(diff);
    }

    if (termDays >= 300) {
      return sum + yPrice;
    } else if (termDays >= 150) {
      return sum + Math.round(hPrice);
    } else if (termDays >= 60) {
      return sum + (mPrice * 3);
    } else {
      return sum + mPrice;
    }
  }, 0) || (Number(registrySummary.total_revenue) || 0);

  const fetchSubscriptions = async () => {
    setSubscriptionsLoading(true);
    try {
      const res = await api.get('/auth/superadmin/subscriptions');
      setSubscriptions(res.data?.data || []);
    } catch (err) {
      console.warn('Failed to fetch subscriptions:', err?.message);
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  const handleExtendSubscription = async (sub, customDays) => {
    const targetSub = sub || selectedSub;
    if (!targetSub) return;
    const days = customDays || extendDays;
    setExtendSubLoading(true);
    try {
      await api.patch(`/auth/superadmin/subscriptions/${targetSub.id}/extend`, {
        days: Number(days),
        status: 'ACTIVE'
      });
      setIsExtendModalOpen(false);
      setSelectedSub(null);
      await Promise.all([fetchSubscriptions(), fetchTenants()]);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to extend subscription.');
    } finally {
      setExtendSubLoading(false);
    }
  };

  const openExtendModal = (sub) => {
    setSelectedSub(sub);
    setExtendDays('30');
    setIsExtendModalOpen(true);
  };

  const [flushLoading, setFlushLoading] = useState(false);
  const [flushMsg, setFlushMsg] = useState('');

  const handleFlushPools = async () => {
    setFlushLoading(true);
    setFlushMsg('');
    try {
      const res = await api.post('/auth/superadmin/pools/flush');
      setFlushMsg(res.data?.message || 'Database pools flushed successfully.');
      await Promise.all([fetchTenants(), fetchAuditLogs()]);
      setTimeout(() => setFlushMsg(''), 4000);
    } catch (err) {
      setFlushMsg('Failed to flush database pools: ' + (err?.response?.data?.message || err.message));
      setTimeout(() => setFlushMsg(''), 4000);
    } finally {
      setFlushLoading(false);
    }
  };

  const [saPasswordForm, setSaPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saPasswordLoading, setSaPasswordLoading] = useState(false);
  const [saPasswordMsg, setSaPasswordMsg] = useState({ type: '', text: '' });

  const handleChangeSuperAdminPassword = async (e) => {
    e.preventDefault();
    if (saPasswordForm.newPassword !== saPasswordForm.confirmPassword) {
      setSaPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (saPasswordForm.newPassword.length < 6) {
      setSaPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    setSaPasswordLoading(true);
    setSaPasswordMsg({ type: '', text: '' });
    try {
      const res = await api.patch('/auth/superadmin/change-password', {
        currentPassword: saPasswordForm.currentPassword,
        newPassword: saPasswordForm.newPassword
      });
      setSaPasswordMsg({ type: 'success', text: res.data?.message || 'Super Admin password updated successfully!' });
      setSaPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSaPasswordMsg({ type: '', text: '' }), 5000);
    } catch (err) {
      setSaPasswordMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to update password.' });
    } finally {
      setSaPasswordLoading(false);
    }
  };

  const openRenewModal = (sub) => {
    setSelectedSub(sub);
    setRenewForm({
      plan_id: String(sub.plan_id || plans[0]?.id || ''),
      duration_cycle: '3_MONTHS',
      custom_expiry_date: ''
    });
    setIsRenewModalOpen(true);
  };

  const handleConfirmRenew = async (e) => {
    if (e) e.preventDefault();
    if (!selectedSub) return;
    setRenewLoading(true);
    try {
      await api.post(`/auth/superadmin/subscriptions/${selectedSub.id}/renew`, {
        plan_id: Number(renewForm.plan_id) || undefined,
        duration_cycle: renewForm.duration_cycle,
        custom_expiry_date: renewForm.custom_expiry_date || null
      });
      setIsRenewModalOpen(false);
      setSelectedSub(null);
      await Promise.all([fetchSubscriptions(), fetchTenants()]);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to renew subscription.');
    } finally {
      setRenewLoading(false);
    }
  };

  const openEditSubModal = (sub) => {
    setSelectedSub(sub);
    setEditSubForm({
      plan_id: String(sub.plan_id || ''),
      status: sub.status || 'ACTIVE',
      start_date: sub.start_date ? String(sub.start_date).slice(0, 10) : '',
      end_date: sub.end_date ? String(sub.end_date).slice(0, 10) : '',
      auto_renew: Boolean(sub.auto_renew)
    });
    setIsEditSubModalOpen(true);
  };

  const handleSaveEditSub = async (e) => {
    if (e) e.preventDefault();
    if (!selectedSub) return;
    setEditSubLoading(true);
    try {
      await api.put(`/auth/superadmin/subscriptions/${selectedSub.id}`, {
        plan_id: Number(editSubForm.plan_id) || undefined,
        status: editSubForm.status,
        start_date: editSubForm.start_date || null,
        end_date: editSubForm.end_date || null,
        auto_renew: editSubForm.auto_renew
      });
      setIsEditSubModalOpen(false);
      setSelectedSub(null);
      await Promise.all([fetchSubscriptions(), fetchTenants()]);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update subscription.');
    } finally {
      setEditSubLoading(false);
    }
  };

  const renderCategorizedMenuTree = (allowedModules, toggleKey, basePlanModules = undefined) => {
    const isPlanAllowed = (k) => {
      if (basePlanModules === undefined || basePlanModules === false) return null;
      if (basePlanModules === null) return true;
      return Array.isArray(basePlanModules) ? basePlanModules.includes(k) : null;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {MODULE_MENU_TREE.map(sec => (
          <div key={sec.section} style={{ border: '1px solid #CBD5E1', borderRadius: 8, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
            <div style={{ padding: '6px 12px', backgroundColor: '#0F172A', color: '#38BDF8', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {sec.section}
            </div>

            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sec.menus.map(menu => {
                const hasSubmenus = menu.submenus && menu.submenus.length > 0;
                const allSubKeys = hasSubmenus ? menu.submenus.map(s => s.key) : [];
                const parentChecked = allowedModules == null || (allowedModules.includes(menu.key) || (hasSubmenus && allSubKeys.every(k => allowedModules.includes(k))));

                const planPerm = isPlanAllowed(menu.key);
                let overrideStatus = null;
                if (planPerm !== null) {
                  if (parentChecked && !planPerm) {
                    overrideStatus = 'GRANTED';
                  } else if (!parentChecked && planPerm) {
                    overrideStatus = 'REVOKED';
                  }
                }

                return (
                  <div key={menu.key} style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    backgroundColor: overrideStatus === 'GRANTED' ? '#FFFBEB' : (overrideStatus === 'REVOKED' ? '#FEF2F2' : (parentChecked ? 'var(--brand-primary-light, #F0FDF4)' : '#F8FAFC')),
                    border: `1px solid ${overrideStatus === 'GRANTED' ? '#FDE68A' : (overrideStatus === 'REVOKED' ? '#FECACA' : (parentChecked ? 'var(--brand-primary-border, #A3F5C1)' : '#E2E8F0'))}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasSubmenus ? 6 : 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', color: parentChecked ? 'var(--brand-primary-text, #075F27)' : '#334155' }}>
                        <input
                          type="checkbox"
                          checked={parentChecked}
                          onChange={() => toggleKey(menu.key)}
                          style={{ accentColor: 'var(--brand-primary, #15803D)', width: 15, height: 15 }}
                        />
                        <span>{menu.label}</span>
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {overrideStatus === 'GRANTED' && (
                          <span style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: 8, background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', fontWeight: 700 }}>
                            ⚡ OVERRIDE (GRANTED)
                          </span>
                        )}
                        {overrideStatus === 'REVOKED' && (
                          <span style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: 8, background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', fontWeight: 700 }}>
                            ⚡ OVERRIDE (BLOCKED)
                          </span>
                        )}
                        <span style={{ fontSize: '0.64rem', padding: '2px 8px', borderRadius: 10, background: parentChecked ? '#DCFCE7' : 'var(--color-danger-light, #FEF2F2)', color: parentChecked ? 'var(--brand-primary-hover, #15803D)' : 'var(--color-danger-text, #991B1B)', border: `1px solid ${parentChecked ? '#86EFAC' : 'var(--color-danger-border, #FECACA)'}`, fontWeight: 700 }}>
                          {parentChecked ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </div>
                    </div>

                    {hasSubmenus && (
                      <div style={{ paddingLeft: 23, display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 6, borderTop: '1px dashed #E2E8F0' }}>
                        {menu.submenus.map(sub => {
                          const subChecked = allowedModules == null || allowedModules.includes(sub.key) || allowedModules.includes(menu.key);
                          const subPlanPerm = isPlanAllowed(sub.key);
                          let subOverride = null;
                          if (subPlanPerm !== null) {
                            if (subChecked && !subPlanPerm) subOverride = 'GRANTED';
                            else if (!subChecked && subPlanPerm) subOverride = 'REVOKED';
                          }

                          return (
                            <label key={sub.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.75rem', color: subChecked ? 'var(--brand-primary-hover, #0E5327)' : '#64748B', fontWeight: 500 }}>
                              <input
                                type="checkbox"
                                checked={subChecked}
                                onChange={() => toggleKey(sub.key)}
                                style={{ accentColor: 'var(--brand-primary, #15803D)', width: 14, height: 14 }}
                              />
                              <span>↳ {sub.label}</span>
                              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {subOverride === 'GRANTED' && (
                                  <span style={{ fontSize: '0.58rem', padding: '1px 6px', borderRadius: 6, background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', fontWeight: 700 }}>
                                    ⚡ OVERRIDE
                                  </span>
                                )}
                                {subOverride === 'REVOKED' && (
                                  <span style={{ fontSize: '0.58rem', padding: '1px 6px', borderRadius: 6, background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', fontWeight: 700 }}>
                                    ⚡ BLOCKED
                                  </span>
                                )}
                                <span style={{ fontSize: '0.62rem', color: subChecked ? 'var(--brand-primary, #15803D)' : '#94A3B8', fontWeight: 600 }}>
                                  {subChecked ? 'Accessible' : 'Restricted'}
                                </span>
                              </div>
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
        ))}
      </div>
    );
  };

  useEffect(() => {
    fetchTenants();
    fetchPlans();
    fetchSubscriptions();
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    if (activeNav === 'subscriptions' || activeNav === 'dashboard') fetchSubscriptions();
    if (activeNav === 'plans') fetchPlans();
    if (activeNav === 'audit' || activeNav === 'dashboard') fetchAuditLogs();
  }, [activeNav]);

  const filteredTenants = tenants.filter(t =>
    !searchQuery ||
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.company_code && t.company_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
    t.db_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSubscriptions = subscriptions.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      (s.company_name && s.company_name.toLowerCase().includes(q)) ||
      (s.company_code && s.company_code.toLowerCase().includes(q)) ||
      (s.plan_name && s.plan_name.toLowerCase().includes(q)) ||
      (s.plan_code && s.plan_code.toLowerCase().includes(q));

    const matchesStatus = subStatusFilter === 'ALL' ||
      (subStatusFilter === 'EXPIRING' ? s.is_expiring_soon : s.status === subStatusFilter);

    const matchesPlan = subPlanFilter === 'ALL' || (s.plan_code === subPlanFilter || String(s.plan_id) === subPlanFilter);

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const handleToggleStatus = async (tenant) => {
    if (statusUpdatingId) return;
    const nextActive = tenant.is_active === 1 ? 0 : 1;
    setStatusUpdatingId(tenant.id);
    try {
      await api.patch(`/auth/superadmin/companies/${tenant.id}/status`, { is_active: nextActive });
      setTenants(prev => prev.map(t => (t.id === tenant.id ? { ...t, is_active: nextActive } : t)));
    } catch (err) {
      setTenantsError(err?.response?.data?.message || 'Unable to update tenant status.');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const openAccessModal = (tenant) => {
    setAccessTarget(tenant);

    // Resolve plan code
    let planCode = 'STANDARD';
    const rawPlan = tenant.subscription_plan_name || tenant.plan_tier || 'STANDARD';
    const match = plans.find(p => p.code.toUpperCase() === String(rawPlan).toUpperCase() || p.name.toUpperCase() === String(rawPlan).toUpperCase());
    if (match) {
      planCode = match.code;
    } else if (String(rawPlan).toUpperCase().includes('ENTERPRISE')) {
      planCode = 'ENTERPRISE';
    } else if (String(rawPlan).toUpperCase().includes('STARTER')) {
      planCode = 'STARTER';
    } else {
      planCode = 'STANDARD';
    }

    const expiry = tenant.subscription_end_date 
      ? String(tenant.subscription_end_date).slice(0, 10) 
      : (tenant.end_date ? String(tenant.end_date).slice(0, 10) : '');

    let initialModules = tenant.allowed_modules ?? null;
    if (!initialModules && match && Array.isArray(match.allowed_modules) && match.allowed_modules.length > 0) {
      initialModules = match.allowed_modules;
    }

    setAccessForm({
      name: tenant.name || '',
      phone: tenant.phone || '',
      address: tenant.address || '',
      logo: tenant.logo || null,
      max_branches: tenant.max_branches ?? (match?.max_branches ?? ''),
      allowed_modules: initialModules,
      expiry_date: expiry,
      subscription_status: (tenant.subscription_status || (tenant.is_active ? 'ACTIVE' : 'TRIAL')).toUpperCase(),
      plan_tier: planCode
    });
    setAccessError('');
    setAccessSuccessMsg('');
    setActiveNav('access-editor');
  };

  const handlePlanTierChange = (val) => {
    const rawCode = val?.target ? val.target.value : val;
    const codeUpper = String(rawCode || '').toUpperCase();
    const matchedPlan = plans.find(p => p.code.toUpperCase() === codeUpper || p.name.toUpperCase() === codeUpper);

    if (matchedPlan) {
      const planModules = Array.isArray(matchedPlan.allowed_modules) && matchedPlan.allowed_modules.length > 0
        ? matchedPlan.allowed_modules
        : MODULE_KEYS.map(m => m.key);

      setAccessForm(prev => ({
        ...prev,
        plan_tier: matchedPlan.code,
        max_branches: matchedPlan.max_branches ?? '',
        allowed_modules: planModules
      }));
      setAccessSuccessMsg(`Switched to ${matchedPlan.name}: applied default plan modules and branch allocation.`);
      setTimeout(() => setAccessSuccessMsg(''), 4000);
    } else {
      setAccessForm(prev => ({
        ...prev,
        plan_tier: codeUpper
      }));
    }
  };

  const handleAccessLogoChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAccessError('Please select a valid PNG, JPG, or SVG image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAccessError('Logo image must be smaller than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setAccessForm(prev => ({ ...prev, logo: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const toggleModuleKey = (key) => {
    setAccessForm(prev => {
      // null means "unrestricted" — the first individual toggle switches into an
      // explicit allowlist starting from "everything currently allowed".
      const current = prev.allowed_modules ?? MODULE_KEYS.map(m => m.key);
      const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
      return { ...prev, allowed_modules: next };
    });
  };

  const handleSaveAccess = async () => {
    setAccessSaving(true);
    setAccessError('');
    setAccessSuccessMsg('');
    try {
      const isFullyChecked = accessForm.allowed_modules && MODULE_KEYS.every(m => accessForm.allowed_modules.includes(m.key));
      const payload = {
        name: accessForm.name,
        phone: accessForm.phone,
        address: accessForm.address,
        logo: accessForm.logo,
        max_branches: accessForm.max_branches === '' ? null : Number(accessForm.max_branches),
        allowed_modules: isFullyChecked ? null : accessForm.allowed_modules,
        expiry_date: accessForm.expiry_date || null,
        subscription_status: accessForm.subscription_status,
        plan_tier: accessForm.plan_tier
      };
      await api.patch(`/auth/superadmin/companies/${accessTarget.id}/access`, payload);
      setAccessSuccessMsg('Company details and settings saved successfully.');
      await Promise.all([fetchTenants(), fetchSubscriptions()]);
      setTimeout(() => {
        setAccessTarget(null);
        setActiveNav('registry');
        setAccessSuccessMsg('');
      }, 1200);
    } catch (err) {
      setAccessError(err?.response?.data?.message || 'Unable to update company details and access settings.');
    } finally {
      setAccessSaving(false);
    }
  };

  const generateCompanyCodeFromName = (companyName) => {
    const raw = (companyName || '').trim();
    if (!raw) {
      const prefixes = ['APEX', 'NOVA', 'PRIME', 'ZENITH', 'EQUITY', 'CAPITAL', 'VANTAGE', 'CREST'];
      const p = prefixes[Math.floor(Math.random() * prefixes.length)];
      const num = Math.floor(10 + Math.random() * 90);
      return `${p}${num}`;
    }

    const stopWords = /^(PVT|LTD|LLC|LIMITED|PRIVATE|AND|THE|CO|COMPANY|INC|CORP|ENTERPRISES|HOLDINGS|GROUP|FINANCIAL|FINANCE|SERVICES|CREDIT)$/i;
    const cleanTokens = raw
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => Boolean(w));

    const significantWords = cleanTokens.filter(w => !stopWords.test(w));
    const wordsToUse = significantWords.length > 0 ? significantWords : cleanTokens;

    let base = '';
    if (wordsToUse.length === 1) {
      base = wordsToUse[0].slice(0, 5).toUpperCase();
    } else if (wordsToUse.length === 2) {
      base = (wordsToUse[0].slice(0, 4) + wordsToUse[1].slice(0, 3)).toUpperCase();
    } else {
      const initials = wordsToUse.map(w => w[0]).join('').toUpperCase();
      base = (initials.length >= 3 ? initials.slice(0, 4) : (wordsToUse[0].slice(0, 3) + wordsToUse[1].slice(0, 2))).toUpperCase();
    }

    if (base.length < 3) {
      base = (raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4) || 'FIN').toUpperCase();
    }

    const suffix = Math.floor(10 + Math.random() * 90);
    return `${base}${suffix}`;
  };

  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const code = form.company_code.toUpperCase().trim();

    try {
      const res = await api.post('/auth/superadmin/companies', {
        company_code: code,
        name: form.name,
        admin_email: form.admin_email,
        admin_password: form.admin_password || 'admin123',
        company_email: form.company_email,
        company_phone: form.company_phone,
        logo: form.logo || null,
        plan_code: form.plan_code || 'STANDARD',
        status: form.status || 'TRIAL',
        trial_days: Number(form.trial_days) || 15,
        billing_cycle: form.billing_cycle || '3_MONTHS',
        custom_expiry_date: form.custom_expiry_date || null
      });

      await Promise.all([fetchTenants(), fetchSubscriptions()]);
      setSuccessMsg(res.data?.message || `Tenant '${form.name}' provisioned successfully.`);
      setTimeout(() => {
        setIsProvisionModalOpen(false);
        setForm({ name: '', company_code: '', company_email: '', company_phone: '', admin_email: '', admin_password: '', logo: '', plan_code: 'STANDARD', status: 'TRIAL', trial_days: '15', billing_cycle: '3_MONTHS', custom_expiry_date: '' });
        setSuccessMsg('');
      }, 1500);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to provision tenant. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlanSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const isFullyChecked = planForm.allowed_modules && MODULE_KEYS.every(m => planForm.allowed_modules.includes(m.key));
      const payload = {
        name: planForm.name,
        code: planForm.code.toUpperCase(),
        max_branches: planForm.max_branches === '' ? null : Number(planForm.max_branches),
        allowed_modules: isFullyChecked ? null : planForm.allowed_modules,
        monthly_price: Number(planForm.monthly_price) || 0,
        six_month_price: Number(planForm.six_month_price) || 0,
        yearly_price: Number(planForm.yearly_price) || 0
      };

      if (editingPlan) {
        await api.put(`/auth/superadmin/plans/${editingPlan.id}`, payload);
      } else {
        await api.post('/auth/superadmin/plans', payload);
      }

      await fetchPlans();
      setEditingPlan(null);
      setPlanForm({ name: '', code: '', max_branches: '5', monthly_price: '2999', six_month_price: '14999', yearly_price: '29990', allowed_modules: null });
      setActiveNav('plans');
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to save subscription plan.');
    } finally {
      setLoading(false);
    }
  };

  const mini = sidebarCollapsed;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#F8FAFC', color: '#0F172A', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif' }}>

      {/* ── Top Header Bar (Financial ERP Emerald Branding) ────────────────── */}
      <header className="app-header" style={{ height: 56, minHeight: 56, backgroundColor: '#041A0C', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 40, flexShrink: 0 }}>
        {/* Brand Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--brand-primary, #15803D) 0%, var(--brand-primary-hover, #0E5327) 100%)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb), 0.3)' }}>
            <Crown style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '0.96rem', letterSpacing: '-0.01em' }}>Super Admin Portal</div>
            <div style={{ color: 'var(--brand-primary, #34D399)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.04em' }}>Central Master System (`master_erp_db`)</div>
          </div>
        </div>

        {/* Global Search & User Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Quick Search */}
          <div style={{ position: 'relative', width: 260 }}>
            <Search style={{ width: 14, height: 14, color: '#94A3B8', position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search companies, codes, DBs..."
              style={{ width: '100%', height: 34, backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: 6, paddingLeft: 30, paddingRight: 10, fontSize: '0.78rem', color: '#FFFFFF', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', backgroundColor: 'rgba(var(--brand-primary-rgb), 0.15)', border: '1px solid rgba(var(--brand-primary-rgb), 0.3)', borderRadius: 20, fontSize: '0.72rem', color: 'var(--brand-primary, #34D399)', fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--brand-primary, #10B981)', display: 'inline-block' }} />
            <span>Master DB Online</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#FFFFFF' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary-text, #075F27)', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--brand-primary-border, #A3F5C1)' }}>
              SA
            </div>
            <span style={{ fontWeight: 600 }}>Super Admin</span>
          </div>

          <button
            onClick={onSignOut}
            style={{ padding: '6px 14px', backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.25)', color: '#FFFFFF', borderRadius: 6, fontSize: '0.75rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}
          >
            <LogOut style={{ width: 13, height: 13 }} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ── App Body: Sidebar + Main Workspace Column ───────────── */}
      <div className="app-body" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Executive Dark Emerald Sidebar ───────────────────── */}
        <aside className={`sidebar${mini ? ' sidebar--mini' : ' sidebar--full'}`} style={{ backgroundColor: '#072C15', borderRight: '1px solid rgba(255, 255, 255, 0.08)', width: mini ? 70 : 230, transition: 'width 0.2s ease', display: 'flex', flexDirection: 'column' }}>
          <div className="sidebar__brand" style={{ display: 'flex', alignItems: 'center', justifyContent: mini ? 'center' : 'space-between', padding: mini ? '0 8px' : '0 14px', height: 60, backgroundColor: '#041A0C', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            {!mini && (
              <div className="sidebar__brand-text">
                <span className="sidebar__brand-name" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  Super Admin Console
                </span>
              </div>
            )}
            <button
              className="sidebar__collapse-btn"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={mini ? 'Expand Sidebar' : 'Collapse Sidebar'}
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', margin: mini ? '0 auto' : '0' }}
            >
              {mini ? <PanelLeftOpen style={{ width: 15, height: 15 }} /> : <PanelLeftClose style={{ width: 15, height: 15 }} />}
            </button>
          </div>

          <div className="sidebar__scroll thin-scroll" style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
            {!mini && (
              <div className="sidebar__section-label" style={{ color: 'var(--brand-primary, #34D399)', fontWeight: 600, fontSize: '0.68rem', letterSpacing: '0.08em', padding: '12px 10px 6px' }}>
                MASTER REGISTRY
              </div>
            )}
            <nav className="sidebar__nav" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button
                type="button"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: 'none', backgroundColor: activeNav === 'dashboard' ? 'rgba(var(--brand-primary-rgb), 0.25)' : 'transparent', color: activeNav === 'dashboard' ? '#FFFFFF' : '#94A3B8', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 500, fontSize: '0.82rem' }}
                onClick={() => setActiveNav('dashboard')}
              >
                <LayoutDashboard style={{ width: 16, height: 16 }} />
                {!mini && <span className="sidebar__label">Dashboard</span>}
              </button>

              <button
                type="button"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: 'none', backgroundColor: activeNav === 'registry' || activeNav === 'access-editor' ? 'rgba(var(--brand-primary-rgb), 0.25)' : 'transparent', color: activeNav === 'registry' || activeNav === 'access-editor' ? '#FFFFFF' : '#94A3B8', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 500, fontSize: '0.82rem' }}
                onClick={() => setActiveNav('registry')}
              >
                <Building2 style={{ width: 16, height: 16 }} />
                {!mini && <span className="sidebar__label">Companies Registry</span>}
              </button>

              <button
                type="button"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: 'none', backgroundColor: activeNav === 'subscriptions' ? 'rgba(var(--brand-primary-rgb), 0.25)' : 'transparent', color: activeNav === 'subscriptions' ? '#FFFFFF' : '#94A3B8', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 500, fontSize: '0.82rem' }}
                onClick={() => setActiveNav('subscriptions')}
              >
                <CreditCard style={{ width: 16, height: 16 }} />
                {!mini && <span className="sidebar__label">Company Subscriptions</span>}
              </button>

              <button
                type="button"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: 'none', backgroundColor: activeNav === 'plans' || activeNav === 'plan-editor' ? 'rgba(var(--brand-primary-rgb), 0.25)' : 'transparent', color: activeNav === 'plans' || activeNav === 'plan-editor' ? '#FFFFFF' : '#94A3B8', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 500, fontSize: '0.82rem' }}
                onClick={() => setActiveNav('plans')}
              >
                <Crown style={{ width: 16, height: 16 }} />
                {!mini && <span className="sidebar__label">Subscription Plans</span>}
              </button>

              <button
                type="button"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: 'none', backgroundColor: activeNav === 'pools' ? 'rgba(var(--brand-primary-rgb), 0.25)' : 'transparent', color: activeNav === 'pools' ? '#FFFFFF' : '#94A3B8', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 500, fontSize: '0.82rem' }}
                onClick={() => setActiveNav('pools')}
              >
                <Database style={{ width: 16, height: 16 }} />
                {!mini && <span className="sidebar__label">Database Pools</span>}
              </button>
            </nav>

            {!mini && (
              <div className="sidebar__section-label" style={{ color: 'var(--brand-primary, #34D399)', fontWeight: 600, fontSize: '0.68rem', letterSpacing: '0.08em', padding: '18px 10px 6px' }}>
                SYSTEM TELEMETRY
              </div>
            )}
            <nav className="sidebar__nav" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button
                type="button"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: 'none', backgroundColor: activeNav === 'audit' ? 'rgba(var(--brand-primary-rgb), 0.25)' : 'transparent', color: activeNav === 'audit' ? '#FFFFFF' : '#94A3B8', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 500, fontSize: '0.82rem' }}
                onClick={() => setActiveNav('audit')}
              >
                <Activity style={{ width: 16, height: 16 }} />
                {!mini && <span className="sidebar__label">Central Audit Logs</span>}
              </button>

              <button
                type="button"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: 'none', backgroundColor: activeNav === 'settings' ? 'rgba(var(--brand-primary-rgb), 0.25)' : 'transparent', color: activeNav === 'settings' ? '#FFFFFF' : '#94A3B8', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 500, fontSize: '0.82rem' }}
                onClick={() => setActiveNav('settings')}
              >
                <Settings style={{ width: 16, height: 16 }} />
                {!mini && <span className="sidebar__label">Master System Config</span>}
              </button>
            </nav>
          </div>
        </aside>

        {/* ── Main Content Workspace ─────────────────────────────── */}
        <div className="app-body__main" style={{ flex: 1, overflowY: 'auto' }}>
          <main style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Executive Overview Dashboard View ──────────────────── */}
            {activeNav === 'dashboard' && (
              <>
                {/* Header Banner */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                  <div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <LayoutDashboard style={{ width: 22, height: 22, color: 'var(--brand-primary, #15803D)' }} />
                      <span>Dashboard Overview</span>
                    </h1>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '4px 0 0 0' }}>
                      Overview of platform performance, company subscriptions, active database pools, and system telemetry.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsProvisionModalOpen(true)}
                    style={{ padding: '9px 18px', backgroundColor: 'var(--brand-primary, #15803D)', color: '#FFFFFF', fontWeight: 600, fontSize: '0.82rem', borderRadius: 8, border: 'none', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb), 0.25)' }}
                  >
                    <Plus style={{ width: 16, height: 16 }} />
                    <span>Provision Tenant Company</span>
                  </button>
                </div>

                {/* 7 KPI Stat Cards Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, fontVariantNumeric: 'tabular-nums' }}>
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Companies</span>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{tenants.length || 3}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--brand-primary, #15803D)', marginTop: 2, fontWeight: 600 }}>↑ 1 this month</div>
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, backgroundColor: '#F1F5F9', color: 'var(--brand-primary, #15803D)', border: '1px solid #E2E8F0' }}>
                      <Building2 style={{ width: 22, height: 22 }} />
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Companies</span>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{tenants.filter(t => t.is_active).length || 2}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>- 0 this month</div>
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary, #10B981)', border: '1px solid var(--brand-primary-border, #A3F5C1)' }}>
                      <CheckCircle style={{ width: 22, height: 22 }} />
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Users</span>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
                        {tenants.reduce((sum, t) => sum + (t.users_count || 1), 0)}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--brand-primary, #15803D)', marginTop: 2, fontWeight: 600 }}>Across all provisioned companies</div>
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--color-info-light, #EFF6FF)', color: 'var(--color-info, #2563EB)', border: '1px solid var(--color-info-border, #BFDBFE)' }}>
                      <Users style={{ width: 22, height: 22 }} />
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Subscription Revenue</span>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
                        ₹{computedTotalRevenue.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--brand-primary, #15803D)', marginTop: 2, fontWeight: 600 }}>
                        {activePaidSubs.length} Active Paid {activePaidSubs.length === 1 ? 'Subscription' : 'Subscriptions'}
                      </div>
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, backgroundColor: '#FEF3C7', color: 'var(--color-warning, #D97706)', border: '1px solid var(--color-warning-border, #FDE68A)' }}>
                      <Crown style={{ width: 22, height: 22 }} />
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Sessions</span>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>1</div>
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, backgroundColor: '#CCFBF1', color: '#0D9488', border: '1px solid #99F6E4' }}>
                      <Activity style={{ width: 22, height: 22 }} />
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Storage Usage</span>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
                        {registrySummary.total_storage_formatted || '0 B'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--brand-primary, #15803D)', marginTop: 2, fontWeight: 600 }}>Total uploads disk size</div>
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, backgroundColor: '#E0F2FE', color: 'var(--color-info-hover, #0284C7)', border: '1px solid var(--color-info-border, #BAE6FD)' }}>
                      <Database style={{ width: 22, height: 22 }} />
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Subscription Expiry</span>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>0 expiring soon</div>
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--color-danger-light, #FEE2E2)', color: 'var(--color-danger, #DC2626)', border: '1px solid var(--color-danger-border, #FECACA)' }}>
                      <AlertTriangle style={{ width: 22, height: 22 }} />
                    </div>
                  </div>
                </div>

                {/* Dashboard Companies Table */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>Companies</h2>
                    <button onClick={() => setActiveNav('registry')} style={{ background: 'transparent', border: 'none', color: 'var(--brand-primary, #15803D)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>View All ({tenants.length}) &rarr;</button>
                  </div>

                  <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          <th style={{ padding: '10px 14px' }}>#</th>
                          <th style={{ padding: '10px 14px' }}>COMPANY NAME</th>
                          <th style={{ padding: '10px 14px' }}>DOMAIN / CODE</th>
                          <th style={{ padding: '10px 14px' }}>PLAN</th>
                          <th style={{ padding: '10px 14px' }}>USERS</th>
                          <th style={{ padding: '10px 14px' }}>STORAGE</th>
                          <th style={{ padding: '10px 14px' }}>STATUS</th>
                          <th style={{ padding: '10px 14px' }}>CREATED ON</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenantsLoading ? (
                          <tr><td colSpan="9" style={{ textAlign: 'center', padding: 24, color: '#64748B' }}>Loading companies...</td></tr>
                        ) : tenants.length === 0 ? (
                          <tr><td colSpan="9" style={{ textAlign: 'center', padding: 24, color: '#94A3B8' }}>No tenant companies registered yet.</td></tr>
                        ) : tenants.slice(0, 5).map((t, idx) => (
                          <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '12px 14px', color: '#64748B' }}>{idx + 1}</td>
                            <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>{t.name}</td>
                            <td style={{ padding: '12px 14px', fontFamily: 'SF Mono, Consolas, monospace', color: 'var(--brand-primary, #15803D)', fontWeight: 600 }}>{t.company_code}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10, background: '#F3E8FF', color: '#7E22CE', fontWeight: 600 }}>
                                {t.plan_tier || 'Enterprise'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', color: '#475569' }}>{t.users_count || 1}</td>
                            <td style={{ padding: '12px 14px', fontFamily: 'SF Mono, Consolas, monospace', color: '#475569', fontSize: '0.76rem' }}>{t.storage_formatted || '0 B'}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{
                                fontSize: '0.68rem',
                                padding: '2px 8px',
                                borderRadius: 10,
                                background: t.subscription_status === 'ACTIVE' ? '#DCFCE7' : t.subscription_status === 'TRIAL' ? '#FEF3C7' : 'var(--color-danger-light, #FEF2F2)',
                                color: t.subscription_status === 'ACTIVE' ? 'var(--brand-primary-text, #075F27)' : t.subscription_status === 'TRIAL' ? '#B45309' : 'var(--color-danger-text, #991B1B)',
                                fontWeight: 700
                              }}>
                                {t.subscription_status || (t.is_active ? 'ACTIVE' : 'TRIAL')}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', color: '#64748B' }}>{new Date(t.created_at || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                              <button
                                onClick={() => openAccessModal(t)}
                                style={{ padding: '5px 10px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', marginRight: 6 }}
                              >
                                Edit Access
                              </button>
                              <button
                                onClick={() => handleJumpToCompanyTab(t)}
                                style={{ padding: '5px 12px', backgroundColor: 'var(--brand-primary, #15803D)', color: '#FFFFFF', border: 'none', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              >
                                <ExternalLink style={{ width: 12, height: 12 }} />
                                <span>Jump</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ── Companies Registry View ────────────────────────────── */}
            {activeNav === 'registry' && (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>Tenant Companies Registry</h1>
                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>Manage all registered tenant companies & database provisioning.</p>
                  </div>
                  <button
                    onClick={() => setIsProvisionModalOpen(true)}
                    style={{ padding: '9px 18px', backgroundColor: 'var(--brand-primary, #15803D)', color: '#FFFFFF', fontWeight: 600, fontSize: '0.82rem', borderRadius: 8, border: 'none', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb), 0.25)' }}
                  >
                    <Plus style={{ width: 16, height: 16 }} />
                    <span>Provision company</span>
                  </button>
                </div>

                <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '12px 16px' }}>COMPANY NAME</th>
                        <th style={{ padding: '12px 16px' }}>CODE</th>
                        <th style={{ padding: '12px 16px' }}>DATABASE</th>
                        <th style={{ padding: '12px 16px' }}>PLAN</th>
                        <th style={{ padding: '12px 16px' }}>USERS</th>
                        <th style={{ padding: '12px 16px' }}>STORAGE</th>
                        <th style={{ padding: '12px 16px' }}>SUB STATUS</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenantsLoading ? (
                        <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24, color: '#64748B' }}>Loading registry...</td></tr>
                      ) : filteredTenants.length === 0 ? (
                        <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24, color: '#94A3B8' }}>No companies found.</td></tr>
                      ) : filteredTenants.map(t => (
                        <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0F172A' }}>{t.name}</td>
                          <td style={{ padding: '14px 16px', fontFamily: 'SF Mono, Consolas, monospace', color: 'var(--brand-primary, #15803D)', fontWeight: 600 }}>{t.company_code}</td>
                          <td style={{ padding: '14px 16px', fontFamily: 'SF Mono, Consolas, monospace', color: 'var(--color-info, #2563EB)' }}>{t.db_name}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: 12, backgroundColor: '#F3E8FF', color: '#7E22CE', fontWeight: 600 }}>
                              {t.plan_tier || 'Enterprise'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', color: '#475569' }}>{t.users_count || 1}</td>
                          <td style={{ padding: '14px 16px', fontFamily: 'SF Mono, Consolas, monospace', color: '#475569', fontSize: '0.78rem' }}>{t.storage_formatted || '0 B'}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              fontSize: '0.7rem',
                              padding: '3px 10px',
                              borderRadius: 12,
                              backgroundColor: t.subscription_status === 'ACTIVE' ? '#DCFCE7' : t.subscription_status === 'TRIAL' ? '#FEF3C7' : 'var(--color-danger-light, #FEF2F2)',
                              color: t.subscription_status === 'ACTIVE' ? 'var(--brand-primary-text, #075F27)' : t.subscription_status === 'TRIAL' ? '#B45309' : 'var(--color-danger-text, #991B1B)',
                              fontWeight: 700
                            }}>
                              {t.subscription_status || (t.is_active ? 'ACTIVE' : 'TRIAL')}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleToggleStatus(t)}
                              disabled={statusUpdatingId === t.id}
                              style={{ padding: '5px 10px', backgroundColor: statusUpdatingId === t.id ? '#F1F5F9' : (t.is_active ? 'var(--color-danger-light, #FEF2F2)' : 'var(--brand-primary-light, #F0FEF5)'), border: `1px solid ${statusUpdatingId === t.id ? '#CBD5E1' : (t.is_active ? 'var(--color-danger-border, #FECACA)' : 'var(--brand-primary-border, #A3F5C1)')}`, color: statusUpdatingId === t.id ? '#94A3B8' : (t.is_active ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)'), borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, cursor: statusUpdatingId === t.id ? 'not-allowed' : 'pointer', marginRight: 6 }}
                            >
                              {statusUpdatingId === t.id ? '...' : (t.is_active ? 'Suspend' : 'Activate')}
                            </button>
                            <button
                              onClick={() => openAccessModal(t)}
                              style={{ padding: '5px 10px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', marginRight: 6 }}
                            >
                              Edit Access
                            </button>
                            <button
                              onClick={() => handleJumpToCompanyTab(t)}
                              style={{ padding: '5px 12px', backgroundColor: 'var(--brand-primary, #15803D)', color: '#FFFFFF', border: 'none', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <ExternalLink style={{ width: 12, height: 12 }} />
                              <span>Jump</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Company Subscriptions Lifecycle View ──────────────── */}
            {activeNav === 'subscriptions' && (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                
                {/* Header Banner */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CreditCard style={{ width: 22, height: 22, color: 'var(--brand-primary, #15803D)' }} />
                      <span>Company Subscriptions</span>
                    </h1>
                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
                      Monitor live tenant company subscriptions, active trials, automated renewal cycles, and expiration dates.
                    </p>
                  </div>
                  <button
                    onClick={fetchSubscriptions}
                    disabled={subscriptionsLoading}
                    style={{ padding: '8px 16px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', color: '#0F172A', fontWeight: 600, fontSize: '0.8rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                  >
                    <RefreshCw style={{ width: 14, height: 14 }} className={subscriptionsLoading ? 'spin' : ''} />
                    <span>{subscriptionsLoading ? 'Refreshing...' : 'Refresh Status'}</span>
                  </button>
                </div>

                {/* 5 KPI Stat Cards Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, fontVariantNumeric: 'tabular-nums' }}>
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Total Subscriptions</span>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{subscriptions.length}</div>
                    </div>
                    <div style={{ padding: 8, borderRadius: 8, backgroundColor: '#F1F5F9', color: '#0F172A' }}>
                      <CreditCard style={{ width: 20, height: 20 }} />
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Active Paid</span>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--brand-primary-text, #075F27)', marginTop: 4 }}>
                        {subscriptions.filter(s => s.status === 'ACTIVE' && !s.is_expired).length}
                      </div>
                    </div>
                    <div style={{ padding: 8, borderRadius: 8, backgroundColor: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary, #10B981)' }}>
                      <CheckCircle style={{ width: 20, height: 20 }} />
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Active Trial</span>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#B45309', marginTop: 4 }}>
                        {subscriptions.filter(s => s.status === 'TRIAL').length}
                      </div>
                    </div>
                    <div style={{ padding: 8, borderRadius: 8, backgroundColor: '#FEF3C7', color: '#D97706' }}>
                      <Clock style={{ width: 20, height: 20 }} />
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Expiring Soon</span>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#C2410C', marginTop: 4 }}>
                        {subscriptions.filter(s => s.is_expiring_soon).length}
                      </div>
                    </div>
                    <div style={{ padding: 8, borderRadius: 8, backgroundColor: '#FFEDD5', color: '#EA580C' }}>
                      <AlertTriangle style={{ width: 20, height: 20 }} />
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Expired / Inactive</span>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-danger-text, #991B1B)', marginTop: 4 }}>
                        {subscriptions.filter(s => s.is_expired || s.status === 'EXPIRED' || s.status === 'CANCELLED').length}
                      </div>
                    </div>
                    <div style={{ padding: 8, borderRadius: 8, backgroundColor: 'var(--color-danger-light, #FEF2F2)', color: 'var(--color-danger, #DC2626)' }}>
                      <Power style={{ width: 20, height: 20 }} />
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Total Sub Revenue</span>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--brand-primary, #15803D)', marginTop: 4 }}>
                        ₹{computedTotalRevenue.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div style={{ padding: 8, borderRadius: 8, backgroundColor: '#FEF3C7', color: '#D97706' }}>
                      <Crown style={{ width: 20, height: 20 }} />
                    </div>
                  </div>
                </div>

                {/* Filter Toolbar using SharedDropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', backgroundColor: '#F8FAFC', padding: '12px 16px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <Search style={{ width: 14, height: 14, color: '#94A3B8', position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search company, code, plan..."
                      style={{ width: '100%', height: 36, backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, paddingLeft: 30, paddingRight: 10, fontSize: '0.8rem', color: '#0F172A', outline: 'none' }}
                    />
                  </div>

                  <div style={{ width: 180 }}>
                    <SharedDropdown
                      value={subStatusFilter}
                      onChange={(val) => setSubStatusFilter(val)}
                      options={[
                        { value: 'ALL', label: 'All Statuses' },
                        { value: 'ACTIVE', label: 'Active Only' },
                        { value: 'TRIAL', label: 'Trial Only' },
                        { value: 'EXPIRING', label: 'Expiring Soon' },
                        { value: 'EXPIRED', label: 'Expired' },
                        { value: 'CANCELLED', label: 'Cancelled' }
                      ]}
                      placeholder="Filter Status"
                    />
                  </div>

                  <div style={{ width: 180 }}>
                    <SharedDropdown
                      value={subPlanFilter}
                      onChange={(val) => setSubPlanFilter(val)}
                      options={[
                        { value: 'ALL', label: 'All Plans' },
                        ...plans.map(p => ({ value: p.code, label: `${p.name} (${p.code})` }))
                      ]}
                      placeholder="Filter Plan"
                    />
                  </div>
                </div>

                {/* Subscriptions Table */}
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '12px 16px' }}>COMPANY</th>
                        <th style={{ padding: '12px 16px' }}>PLAN TIER</th>
                        <th style={{ padding: '12px 16px' }}>STATUS</th>
                        <th style={{ padding: '12px 16px' }}>START DATE</th>
                        <th style={{ padding: '12px 16px' }}>EXPIRY DATE</th>
                        <th style={{ padding: '12px 16px' }}>TIME REMAINING</th>
                        <th style={{ padding: '12px 16px' }}>RENEWAL TYPE</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptionsLoading ? (
                        <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24, color: '#64748B' }}>Loading subscriptions...</td></tr>
                      ) : filteredSubscriptions.length === 0 ? (
                        <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24, color: '#94A3B8' }}>No subscriptions matching criteria.</td></tr>
                      ) : filteredSubscriptions.map(sub => {
                        const statusBadge = (() => {
                          if (sub.is_expired) {
                            return <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: 12, backgroundColor: 'var(--color-danger-light, #FEF2F2)', color: 'var(--color-danger-text, #991B1B)', fontWeight: 700 }}>EXPIRED</span>;
                          }
                          if (sub.status === 'TRIAL') {
                            return <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: 12, backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 700 }}>TRIAL</span>;
                          }
                          if (sub.status === 'ACTIVE') {
                            return <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: 12, backgroundColor: '#DCFCE7', color: 'var(--brand-primary-text, #075F27)', fontWeight: 700 }}>ACTIVE</span>;
                          }
                          if (sub.status === 'CANCELLED') {
                            return <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: 12, backgroundColor: '#F1F5F9', color: '#64748B', fontWeight: 700 }}>CANCELLED</span>;
                          }
                          return <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: 12, backgroundColor: '#F1F5F9', color: '#64748B', fontWeight: 700 }}>{sub.status}</span>;
                        })();

                        const daysBadge = (() => {
                          if (sub.days_remaining === null) {
                            return <span style={{ fontSize: '0.74rem', color: '#64748B' }}>Ongoing</span>;
                          }
                          if (sub.days_remaining <= 0) {
                            return <span style={{ fontSize: '0.72rem', color: 'var(--color-danger, #DC2626)', fontWeight: 700, padding: '2px 8px', backgroundColor: 'var(--color-danger-light, #FEF2F2)', borderRadius: 10 }}>Expired {Math.abs(sub.days_remaining)}d ago</span>;
                          }
                          if (sub.days_remaining <= 15) {
                            return <span style={{ fontSize: '0.72rem', color: '#EA580C', fontWeight: 700, padding: '2px 8px', backgroundColor: '#FFEDD5', borderRadius: 10 }}>⚠️ {sub.days_remaining} days left</span>;
                          }
                          return <span style={{ fontSize: '0.72rem', color: 'var(--brand-primary-text, #075F27)', fontWeight: 600, padding: '2px 8px', backgroundColor: '#DCFCE7', borderRadius: 10 }}>{sub.days_remaining} days left</span>;
                        })();

                        return (
                          <tr key={sub.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ fontWeight: 700, color: '#0F172A' }}>{sub.company_name}</div>
                              <div style={{ fontSize: '0.72rem', fontFamily: 'SF Mono, Consolas, monospace', color: 'var(--brand-primary, #15803D)' }}>{sub.company_code}</div>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: 12, backgroundColor: '#F3E8FF', color: '#7E22CE', fontWeight: 700 }}>
                                {sub.plan_name || sub.plan_code || 'Enterprise'}
                              </span>
                              {sub.monthly_price && (
                                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>₹{Number(sub.monthly_price).toLocaleString('en-IN')}/mo</div>
                              )}
                            </td>
                            <td style={{ padding: '14px 16px' }}>{statusBadge}</td>
                            <td style={{ padding: '14px 16px', color: '#64748B' }}>
                              {sub.start_date ? new Date(sub.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td style={{ padding: '14px 16px', color: '#64748B' }}>
                              {sub.end_date ? new Date(sub.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Ongoing'}
                            </td>
                            <td style={{ padding: '14px 16px' }}>{daysBadge}</td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', backgroundColor: '#F8FAFC', padding: '3px 8px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                                Manual Renewal
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              <button
                                onClick={() => openRenewModal(sub)}
                                style={{ padding: '6px 12px', backgroundColor: 'var(--brand-primary, #15803D)', border: 'none', color: '#FFFFFF', borderRadius: 6, fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', marginRight: 6, display: 'inline-flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 4px rgba(var(--brand-primary-rgb), 0.25)' }}
                              >
                                <RotateCw style={{ width: 12, height: 12 }} />
                                <span>Renew</span>
                              </button>
                              <button
                                onClick={() => openExtendModal(sub)}
                                style={{ padding: '6px 10px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: 6, fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', marginRight: 6 }}
                              >
                                Extend
                              </button>
                              <button
                                onClick={() => openEditSubModal(sub)}
                                style={{ padding: '6px 10px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: 6, fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* ── Plans Dashboard View ───────────────────────────────── */}
            {activeNav === 'plans' && (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>Plans & Subscriptions</h1>
                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>Configure subscription tiers, pricing, and allowed sidebar module access.</p>
                  </div>
                  <button
                    onClick={openCreatePlanModal}
                    style={{ padding: '9px 18px', backgroundColor: 'var(--brand-primary, #15803D)', color: '#FFFFFF', fontWeight: 600, fontSize: '0.82rem', borderRadius: 8, border: 'none', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb), 0.25)' }}
                  >
                    <Plus style={{ width: 16, height: 16 }} />
                    <span>Create New Plan</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                  {plans.map(plan => (
                    <div key={plan.id} style={{ border: '1px solid #CBD5E1', borderRadius: 12, padding: '24px', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{plan.name}</h3>
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, backgroundColor: 'var(--color-info-light, #EFF6FF)', color: 'var(--color-info, #2563EB)', fontWeight: 700, fontFamily: 'SF Mono, monospace' }}>{plan.code}</span>
                        </div>
                        <button
                          onClick={() => openEditPlanModal(plan)}
                          style={{ padding: '5px 10px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.74rem', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}
                        >
                          Edit Plan
                        </button>
                      </div>

                      <div style={{ borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', padding: '12px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Monthly</span>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>₹{plan.monthly_price}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#64748B' }}>6 Months</span>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--brand-primary, #15803D)' }}>₹{plan.six_month_price || Math.round(Number(plan.monthly_price || 0) * 5.5)}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Yearly</span>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>₹{plan.yearly_price}</div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                        <div>Branch Limit: <strong>{plan.max_branches === null ? 'Unlimited' : `${plan.max_branches} Branches`}</strong></div>
                        <div style={{ marginTop: 4 }}>Allowed Modules: <strong>{plan.allowed_modules === null ? 'Unrestricted (All)' : `${plan.allowed_modules.length} Enabled`}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Plan Editor Dedicated View Page ─────────────────────── */}
            {activeNav === 'plan-editor' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)' }}>
                  <button
                    type="button"
                    onClick={() => setActiveNav('plans')}
                    style={{ padding: '8px 14px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', color: '#475569', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <ChevronLeft style={{ width: 16, height: 16 }} />
                    <span>Back to Plans</span>
                  </button>
                  <div>
                    <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      {editingPlan ? `Edit Subscription Plan Tier — ${editingPlan.name}` : 'Create Custom Subscription Plan'}
                    </h1>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '4px 0 0 0' }}>Define pricing, branch limits, and allowed menu/module access for tenant companies.</p>
                  </div>
                </div>

                <form onSubmit={handleCreatePlanSubmit} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)' }}>
                  {errorMsg && <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', color: 'var(--color-danger-text, #991B1B)', borderRadius: 8, fontSize: '0.82rem' }}>{errorMsg}</div>}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Plan Name *</label>
                      <input type="text" required value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} style={{ width: '100%', height: 40, padding: '0 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Plan Code *</label>
                      <input type="text" required value={planForm.code} onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toUpperCase() })} style={{ width: '100%', height: 40, padding: '0 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem', fontFamily: 'SF Mono, monospace' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Monthly Price (₹) *</label>
                      <input
                        type="number"
                        required
                        value={planForm.monthly_price}
                        onChange={(e) => {
                          const val = e.target.value;
                          const mNum = Number(val) || 0;
                          setPlanForm(prev => {
                            const prevM = Number(prev.monthly_price) || 0;
                            const isDefaultSix = !prev.six_month_price || Number(prev.six_month_price) === 0 || prev.six_month_price === String(Math.round(prevM * 5.5));
                            const isDefaultYear = !prev.yearly_price || Number(prev.yearly_price) === 0 || prev.yearly_price === String(prevM * 10);
                            return {
                              ...prev,
                              monthly_price: val,
                              six_month_price: isDefaultSix ? (mNum > 0 ? String(Math.round(mNum * 5.5)) : '') : prev.six_month_price,
                              yearly_price: isDefaultYear ? (mNum > 0 ? String(mNum * 10) : '') : prev.yearly_price
                            };
                          });
                        }}
                        style={{ width: '100%', height: 40, padding: '0 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>6 Months Price (₹) *</label>
                      <input type="number" required value={planForm.six_month_price} onChange={(e) => setPlanForm({ ...planForm, six_month_price: e.target.value })} style={{ width: '100%', height: 40, padding: '0 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Yearly Price (₹) *</label>
                      <input type="number" required value={planForm.yearly_price} onChange={(e) => setPlanForm({ ...planForm, yearly_price: e.target.value })} style={{ width: '100%', height: 40, padding: '0 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Max Branch Allocation</label>
                      <input type="number" value={planForm.max_branches} onChange={(e) => setPlanForm({ ...planForm, max_branches: e.target.value })} placeholder="Blank for unlimited" style={{ width: '100%', height: 40, padding: '0 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }} />
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Allowed Sidebar Menus & Submenus Access</h3>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" onClick={selectAllPlanModules} style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', padding: '6px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Select All</button>
                        <button type="button" onClick={deselectAllPlanModules} style={{ background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', color: 'var(--color-danger, #DC2626)', padding: '6px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Deselect All</button>
                      </div>
                    </div>
                    {renderCategorizedMenuTree(planForm.allowed_modules, togglePlanModuleKey, undefined)}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
                    <button type="button" onClick={() => setActiveNav('plans')} style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: 8, padding: '10px 20px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" disabled={loading} style={{ background: 'var(--brand-primary, #15803D)', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb), 0.25)' }}>
                      {loading ? 'Saving Plan...' : 'Save Subscription Plan'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── Dedicated Company Detail & Custom Features Page ─────── */}
            {activeNav === 'access-editor' && accessTarget && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Top Header Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button
                    type="button"
                    onClick={() => setActiveNav('registry')}
                    style={{ padding: '8px 14px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                  >
                    <ChevronLeft style={{ width: 16, height: 16 }} />
                    <span>Back to Companies</span>
                  </button>
                </div>

                {/* Company Header Banner Card (Ref Image 3) */}
                <div style={{ backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 12, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {(accessForm.logo || accessTarget.logo) ? (
                      <div style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: '#FFFFFF', border: '1px solid #C7D2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 4, flexShrink: 0 }}>
                        <img
                          src={accessForm.logo || accessTarget.logo}
                          alt={accessTarget.name}
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                      </div>
                    ) : (
                      <div style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: 'var(--brand-primary, #10B981)', color: '#FFFFFF', fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {accessTarget.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{accessTarget.name}</h1>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 4, display: 'flex', gap: 12, fontFamily: 'SF Mono, monospace' }}>
                        <span>Domain/Code: {accessTarget.company_code}</span>
                        <span>•</span>
                        <span>Created {new Date(accessTarget.created_at || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span>•</span>
                        <span>Database: {accessTarget.db_name}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '4px 10px',
                      borderRadius: 12,
                      backgroundColor: accessTarget.subscription_status === 'ACTIVE' ? '#DCFCE7' : accessTarget.subscription_status === 'TRIAL' ? '#FEF3C7' : 'var(--color-danger-light, #FEF2F2)',
                      color: accessTarget.subscription_status === 'ACTIVE' ? 'var(--brand-primary-text, #075F27)' : accessTarget.subscription_status === 'TRIAL' ? '#B45309' : 'var(--color-danger-text, #991B1B)',
                      fontWeight: 700
                    }}>
                      {accessTarget.subscription_status || 'TRIAL'}
                    </span>
                    <span style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: 12, backgroundColor: '#F3E8FF', color: '#7E22CE', fontWeight: 700 }}>
                      {accessTarget.subscription_plan_name || accessTarget.plan_tier || 'Enterprise'}
                    </span>
                  </div>
                </div>

                {accessError && (
                  <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', color: 'var(--color-danger-text, #991B1B)', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600 }}>
                    {accessError}
                  </div>
                )}
                {accessSuccessMsg && (
                  <div style={{ padding: '12px 16px', backgroundColor: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary-text, #075F27)', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600 }}>
                    {accessSuccessMsg}
                  </div>
                )}

                {/* 2-Column Grid Workspace (Ref Images 3 & 4) */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>

                  {/* Left Column: Company Details & Custom Features Overrides */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Company Details Form Card */}
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Building2 style={{ width: 18, height: 18, color: 'var(--brand-primary, #15803D)' }} />
                        <span>Company Details</span>
                      </h2>

                      {/* Company Logo Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 6, borderBottom: '1px dashed #E2E8F0' }}>
                        <div style={{ width: 60, height: 60, flexShrink: 0 }}>
                          {(accessForm.logo || accessTarget.logo) ? (
                            <div style={{ width: 60, height: 60, borderRadius: 10, border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                              <img
                                src={accessForm.logo || accessTarget.logo}
                                alt="Company logo"
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                              />
                            </div>
                          ) : (
                            <div style={{
                              width: 60, height: 60, borderRadius: 10, background: '#F1F5F9', border: '1px solid #CBD5E1',
                              color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <Building2 style={{ width: 26, height: 26 }} />
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600,
                            color: '#334155', border: '1px solid #CBD5E1', background: '#FFF', borderRadius: 7,
                            padding: '6px 12px', cursor: 'pointer', width: 'fit-content'
                          }}>
                            <Camera style={{ width: 13, height: 13 }} />
                            {(accessForm.logo || accessTarget.logo) ? 'Change Logo' : 'Upload Logo'}
                            <input type="file" accept="image/*" onChange={handleAccessLogoChange} style={{ display: 'none' }} />
                          </label>
                          {(accessForm.logo || accessTarget.logo) && (
                            <button
                              type="button"
                              onClick={() => setAccessForm(prev => ({ ...prev, logo: null }))}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 500,
                                color: 'var(--color-danger, #DC2626)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: 'fit-content'
                              }}
                            >
                              <Trash style={{ width: 11, height: 11 }} />
                              <span>Remove Logo</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Company name</label>
                          <input
                            type="text"
                            value={accessForm.name}
                            onChange={(e) => setAccessForm(prev => ({ ...prev, name: e.target.value }))}
                            style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Company code</label>
                          <input
                            type="text"
                            readOnly
                            value={accessTarget.company_code}
                            style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', backgroundColor: '#F8FAFC', fontFamily: 'SF Mono, monospace' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Contact email</label>
                          <input
                            type="email"
                            defaultValue={accessTarget.phone ? `admin@${accessTarget.company_code.toLowerCase()}.com` : "admin@erp.com"}
                            style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Contact phone</label>
                          <input
                            type="text"
                            value={accessForm.phone}
                            onChange={(e) => setAccessForm(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="Phone number"
                            style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                          />
                        </div>
                      </div>

                      {/* Branch Allocation / Extension Section */}
                      <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--brand-primary, #15803D)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Branch Allocation & Extension Limit
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16, alignItems: 'center' }}>
                          <div>
                            <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                              Max Branches Allowed
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={accessForm.max_branches}
                              onChange={(e) => setAccessForm(prev => ({ ...prev, max_branches: e.target.value }))}
                              placeholder="Blank for Unlimited"
                              style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                            />
                            <span style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 4, display: 'block' }}>
                              {accessForm.max_branches === '' || accessForm.max_branches === null ? 'Unlimited branches allowed' : `Capped at ${accessForm.max_branches} branch(es)`}
                            </span>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: 6 }}>Quick Extend Branches:</span>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {[
                                { label: '+1 Branch', add: 1 },
                                { label: '+2 Branches', add: 2 },
                                { label: '+5 Branches', add: 5 },
                                { label: '+10 Branches', add: 10 },
                                { label: 'Set Unlimited', setVal: '' }
                              ].map((preset, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    if (preset.setVal !== undefined) {
                                      setAccessForm(prev => ({ ...prev, max_branches: preset.setVal }));
                                    } else {
                                      setAccessForm(prev => {
                                        const current = Number(prev.max_branches) || 1;
                                        return { ...prev, max_branches: String(current + preset.add) };
                                      });
                                    }
                                  }}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #CBD5E1',
                                    backgroundColor: '#F8FAFC',
                                    fontSize: '0.73rem',
                                    fontWeight: 600,
                                    color: 'var(--brand-primary, #15803D)',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Subscription Status & Expiry Date Section */}
                      <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--brand-primary, #15803D)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Subscription & Expiry Settings
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 14 }}>
                          <div>
                            <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Subscription Status</label>
                            <SharedDropdown
                              value={accessForm.subscription_status}
                              onChange={(e) => {
                                const val = e?.target ? e.target.value : e;
                                setAccessForm(prev => ({ ...prev, subscription_status: String(val || '').toUpperCase() }));
                              }}
                              options={[
                                { value: 'ACTIVE', label: 'Active (Paid)' },
                                { value: 'TRIAL', label: 'Trial Account' },
                                { value: 'EXPIRED', label: 'Expired / Suspended' },
                                { value: 'CANCELLED', label: 'Cancelled' }
                              ]}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Plan Tier</label>
                            <SharedDropdown
                              value={accessForm.plan_tier}
                              onChange={handlePlanTierChange}
                              options={plans && plans.length > 0 ? plans.map(p => ({ value: p.code, label: `${p.name} (${p.code})` })) : [
                                { value: 'ENTERPRISE', label: 'Enterprise Plan' },
                                { value: 'STANDARD', label: 'Standard Plan' },
                                { value: 'STARTER', label: 'Starter Plan' }
                              ]}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                              Subscription Expiry Date
                            </label>
                            <SharedDatePicker
                              value={accessForm.expiry_date || ''}
                              onChange={(e) => {
                                const val = e?.target ? e.target.value : e;
                                setAccessForm(prev => ({ ...prev, expiry_date: String(val || '') }));
                              }}
                              placeholder="YYYY-MM-DD"
                            />
                          </div>
                        </div>

                        {/* Quick Presets to adjust Expiry Date from Today */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
                          <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Quick Set Duration:</span>
                          {[
                            { label: '+15 Days (Trial)', days: 15 },
                            { label: '+3 Months (Quarterly)', days: 90 },
                            { label: '+6 Months (Half-Yearly)', days: 180 },
                            { label: '+1 Year (Annual)', days: 365 }
                          ].map(preset => (
                            <button
                              key={preset.days}
                              type="button"
                              onClick={() => {
                                const d = new Date();
                                d.setDate(d.getDate() + preset.days);
                                const iso = d.toISOString().slice(0, 10);
                                setAccessForm(prev => ({ ...prev, expiry_date: iso }));
                              }}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                border: '1px solid #CBD5E1',
                                backgroundColor: '#F8FAFC',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                color: '#334155',
                                cursor: 'pointer'
                              }}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        {/* Direct Save Button inside Card */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                          <button
                            type="button"
                            onClick={handleSaveAccess}
                            disabled={accessSaving}
                            style={{
                              background: 'var(--brand-primary, #15803D)',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 8,
                              padding: '9px 20px',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb), 0.25)'
                            }}
                          >
                            {accessSaving ? 'Saving...' : 'Save Company Details'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Custom Features (Overrides) Card (Ref Image 4) */}
                    {(() => {
                      const matchedPlan = plans.find(p => p.code.toUpperCase() === String(accessForm.plan_tier || '').toUpperCase() || p.name.toUpperCase() === String(accessForm.plan_tier || '').toUpperCase());
                      let overrideCount = 0;
                      if (matchedPlan) {
                        const planAllowed = matchedPlan.allowed_modules;
                        MODULE_KEYS.forEach(m => {
                          const isPlan = planAllowed === null ? true : (Array.isArray(planAllowed) && planAllowed.includes(m.key));
                          const isCur = accessForm.allowed_modules === null ? true : (Array.isArray(accessForm.allowed_modules) && accessForm.allowed_modules.includes(m.key));
                          if (isPlan !== isCur) overrideCount++;
                        });
                      }

                      return (
                        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ShieldCheck style={{ width: 18, height: 18, color: 'var(--brand-primary, #15803D)' }} />
                                <span>Custom Features (Overrides)</span>
                              </h2>
                              <p style={{ fontSize: '0.74rem', color: '#64748B', margin: '2px 0 0 0' }}>
                                Modules marked with <strong>⚡ OVERRIDE</strong> deviate from the base {matchedPlan?.name || 'subscription'} plan
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                              <button type="button" onClick={selectAllAccessModules} style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', padding: '6px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Select All</button>
                              <button type="button" onClick={deselectAllAccessModules} style={{ background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', color: 'var(--color-danger, #DC2626)', padding: '6px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Deselect All</button>
                            </div>
                          </div>

                          {/* Override Status Summary Bar */}
                          {matchedPlan && (
                            <div style={{
                              padding: '10px 14px',
                              borderRadius: 8,
                              fontSize: '0.78rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              backgroundColor: overrideCount > 0 ? '#FFFBEB' : '#F0FDF4',
                              border: `1px solid ${overrideCount > 0 ? '#FDE68A' : '#BBF7D0'}`,
                              color: overrideCount > 0 ? '#92400E' : '#166534'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Sparkles style={{ width: 16, height: 16, color: overrideCount > 0 ? '#D97706' : '#16A34A' }} />
                                <span>
                                  {overrideCount > 0 
                                    ? <strong>⚡ {overrideCount} Custom Feature Override(s) Active against {matchedPlan.name}</strong>
                                    : <strong>✓ Active permissions strictly match {matchedPlan.name} Plan Defaults</strong>}
                                </span>
                              </div>

                              {overrideCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const planModules = Array.isArray(matchedPlan.allowed_modules) && matchedPlan.allowed_modules.length > 0
                                      ? matchedPlan.allowed_modules
                                      : MODULE_KEYS.map(m => m.key);
                                    setAccessForm(prev => ({
                                      ...prev,
                                      allowed_modules: planModules
                                    }));
                                  }}
                                  style={{
                                    padding: '4px 10px',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #D97706',
                                    color: '#B45309',
                                    borderRadius: 6,
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Reset to Plan Defaults
                                </button>
                              )}
                            </div>
                          )}

                          {renderCategorizedMenuTree(accessForm.allowed_modules, toggleModuleKey, matchedPlan ? matchedPlan.allowed_modules : undefined)}

                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
                            <button type="button" onClick={() => { setAccessTarget(null); setActiveNav('registry'); }} style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: 8, padding: '10px 20px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button type="button" onClick={handleSaveAccess} disabled={accessSaving} style={{ background: 'var(--brand-primary, #15803D)', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb), 0.25)' }}>
                              {accessSaving ? 'Saving...' : 'Save changes'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right Column: Current Subscription & Quick Stats */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Current Subscription Card (Ref Image 3) */}
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                      <h2 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Crown style={{ width: 18, height: 18, color: 'var(--color-warning, #D97706)' }} />
                        <span>Current Subscription</span>
                      </h2>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                          <span style={{ color: '#64748B' }}>Plan</span>
                          <strong style={{ color: '#0F172A' }}>{accessTarget.subscription_plan_name || accessTarget.plan_tier || 'Enterprise'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                          <span style={{ color: '#64748B' }}>Subscription Status</span>
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: 10,
                            backgroundColor: accessTarget.subscription_status === 'ACTIVE' ? '#DCFCE7' : accessTarget.subscription_status === 'TRIAL' ? '#FEF3C7' : 'var(--color-danger-light, #FEF2F2)',
                            color: accessTarget.subscription_status === 'ACTIVE' ? 'var(--brand-primary-text, #075F27)' : accessTarget.subscription_status === 'TRIAL' ? '#B45309' : 'var(--color-danger-text, #991B1B)',
                            fontWeight: 700
                          }}>
                            {accessTarget.subscription_status || 'TRIAL'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                          <span style={{ color: '#64748B' }}>Renewal Mode</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', backgroundColor: '#F8FAFC', padding: '2px 8px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                            Manual Renewal (Admin Required)
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                          <span style={{ color: '#64748B' }}>Expiry Date</span>
                          <strong style={{ color: '#0F172A' }}>{accessTarget.subscription_end_date ? new Date(accessTarget.subscription_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Ongoing'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Admin Access Credentials Card (Ref Image 4) */}
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                      <h2 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <KeyRound style={{ width: 18, height: 18, color: 'var(--brand-primary, #15803D)' }} />
                        <span>Company Admin Password</span>
                      </h2>

                      {resetPasswordMsg && (
                        <div style={{ padding: '8px 12px', borderRadius: 6, fontSize: '0.78rem', backgroundColor: resetPasswordMsg.includes('updated') ? 'var(--brand-primary-light, #F0FEF5)' : 'var(--color-danger-light, #FEF2F2)', color: resetPasswordMsg.includes('updated') ? 'var(--brand-primary-text, #075F27)' : 'var(--color-danger-text, #991B1B)', border: `1px solid ${resetPasswordMsg.includes('updated') ? 'var(--brand-primary-border, #A3F5C1)' : 'var(--color-danger-border, #FECACA)'}` }}>
                          {resetPasswordMsg}
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.82rem' }}>
                        <div>
                          <label style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: 4 }}>New Admin Password</label>
                          <input
                            type="password"
                            value={resetPasswordInput}
                            onChange={(e) => setResetPasswordInput(e.target.value)}
                            placeholder="Enter new password..."
                            style={{ width: '100%', height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleResetAdminPassword}
                          disabled={resetPasswordLoading || !resetPasswordInput.trim()}
                          style={{ padding: '8px 14px', backgroundColor: 'var(--brand-primary, #15803D)', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', opacity: (!resetPasswordInput.trim() || resetPasswordLoading) ? 0.6 : 1 }}
                        >
                          {resetPasswordLoading ? 'Updating Password...' : 'Reset Admin Password'}
                        </button>
                      </div>
                    </div>

                    {/* Quick Stats Card (Ref Image 4) */}
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                      <h2 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Activity style={{ width: 18, height: 18, color: 'var(--brand-primary, #15803D)' }} />
                        <span>Quick Stats</span>
                      </h2>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Users</span>
                          <strong style={{ color: '#0F172A' }}>{accessTarget.users_count || 1}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Storage Used</span>
                          <strong style={{ fontFamily: 'SF Mono, monospace', color: 'var(--brand-primary, #15803D)' }}>{accessTarget.storage_formatted || '0 B'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Database</span>
                          <strong style={{ fontFamily: 'SF Mono, monospace', color: 'var(--brand-primary, #15803D)' }}>{accessTarget.db_name}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Expires</span>
                          <strong style={{ color: '#0F172A' }}>26 Aug 2026</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Created</span>
                          <strong style={{ color: '#0F172A' }}>17 Jul 2026</strong>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* ── Connection Pools Telemetry View ───────────────────── */}
            {activeNav === 'pools' && (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>MySQL Connection Pool Factory</h2>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '4px 0 0 0' }}>Dynamic tenant database connection cache (`mysql2/promise` pool factory)</p>
                  </div>
                  <button
                    onClick={handleFlushPools}
                    disabled={flushLoading}
                    style={{ padding: '8px 16px', backgroundColor: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary-text, #075F27)', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                  >
                    <RefreshCw style={{ width: 14, height: 14 }} className={flushLoading ? 'spin' : ''} />
                    <span>{flushLoading ? 'Flushing Pools...' : 'Flush Cache'}</span>
                  </button>
                </div>

                {flushMsg && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary-text, #075F27)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle style={{ width: 16, height: 16 }} />
                    <span>{flushMsg}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 8 }}>
                  {filteredTenants.map(t => (
                    <div key={t.id} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px', backgroundColor: '#F8FAFC' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>{t.company_code} ({t.name})</span>
                        <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10, background: t.is_active ? 'var(--brand-primary-light, #F0FEF5)' : 'var(--color-danger-light, #FEF2F2)', color: t.is_active ? 'var(--brand-primary-text, #075F27)' : 'var(--color-danger-text, #991B1B)', fontWeight: 500 }}>
                          {t.is_active ? 'POOL ACTIVE' : 'SUSPENDED'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#64748B', fontFamily: 'SF Mono, Consolas, monospace' }}>
                        <div>Database: {t.db_name}</div>
                        <div style={{ marginTop: 4 }}>Storage: <strong style={{ color: '#0F172A' }}>{t.storage_formatted || '0 B'}</strong></div>
                        <div style={{ marginTop: 4 }}>Plan: {t.plan_tier || 'STANDARD'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Central Audit Logs View ─────────────────────────────── */}
            {activeNav === 'audit' && (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>Global Super Admin Audit Trail</h2>
                  <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '4px 0 0 0' }}>Security events, tenant provisioning actions, and database status toggles</p>
                </div>

                <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 500 }}>Timestamp</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 500 }}>Event</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 500 }}>Target Tenant</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 500 }}>Actor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 ? (
                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24, color: '#94A3B8' }}>No audit events yet.</td></tr>
                      ) : auditLogs.map(log => (
                        <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '10px 14px', color: '#64748B' }}>{new Date(log.created_at).toLocaleString()}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 500, color: '#0F172A' }}>{log.action}</td>
                          <td style={{ padding: '10px 14px', fontFamily: 'SF Mono, monospace', color: 'var(--color-info, #2563EB)' }}>
                            {log.target_company_code ? `${log.target_company_code} (${log.target_company_name})` : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#334155' }}>{log.actor_email || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── System Settings View ──────────────────────────────── */}
            {activeNav === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Super Admin Security Card */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <KeyRound style={{ width: 18, height: 18, color: 'var(--brand-primary, #15803D)' }} />
                      <span>Super Admin Security & Password</span>
                    </h2>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '4px 0 0 0' }}>Update the master credential used to access this Super Admin Portal</p>
                  </div>

                  {saPasswordMsg.text && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      backgroundColor: saPasswordMsg.type === 'success' ? 'var(--brand-primary-light, #F0FEF5)' : 'var(--color-danger-light, #FEF2F2)',
                      color: saPasswordMsg.type === 'success' ? 'var(--brand-primary-text, #075F27)' : 'var(--color-danger-text, #991B1B)',
                      border: `1px solid ${saPasswordMsg.type === 'success' ? 'var(--brand-primary-border, #A3F5C1)' : 'var(--color-danger-border, #FECACA)'}`
                    }}>
                      {saPasswordMsg.text}
                    </div>
                  )}

                  <form onSubmit={handleChangeSuperAdminPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 500 }}>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Current Password (optional if fresh session)</label>
                      <input
                        type="password"
                        value={saPasswordForm.currentPassword}
                        onChange={(e) => setSaPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="••••••••••••"
                        style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>New Password *</label>
                        <input
                          type="password"
                          required
                          value={saPasswordForm.newPassword}
                          onChange={(e) => setSaPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          placeholder="At least 6 characters"
                          style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Confirm New Password *</label>
                        <input
                          type="password"
                          required
                          value={saPasswordForm.confirmPassword}
                          onChange={(e) => setSaPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="Re-type new password"
                          style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                        />
                      </div>
                    </div>
                    <div>
                      <button
                        type="submit"
                        disabled={saPasswordLoading || !saPasswordForm.newPassword}
                        style={{
                          padding: '9px 18px',
                          backgroundColor: 'var(--brand-primary, #15803D)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Lock style={{ width: 14, height: 14 }} />
                        <span>{saPasswordLoading ? 'Updating Password...' : 'Change Super Admin Password'}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Master Config Card */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>Master System Configuration</h2>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '4px 0 0 0' }}>Global database settings and master pool thresholds</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 640 }}>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>Max Pool Connections per Tenant</label>
                      <input type="number" defaultValue={20} style={{ width: '100%', height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.8rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>JWT Master Token Secret Expiry</label>
                      <input type="text" defaultValue="24h" style={{ width: '100%', height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.8rem' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>

      {/* ── Enhanced Provision Tenant Modal (Ref Image 2) ──────────── */}
      {isProvisionModalOpen && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card" style={{ maxWidth: 520, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
            <div className="saas-modal-header" style={{ borderBottom: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 style={{ width: 16, height: 16 }} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '0.98rem', color: '#0F172A', margin: 0 }}>Provision Tenant Company</h3>
                  <p style={{ fontSize: '0.74rem', color: '#64748B', margin: 0 }}>Scaffold company, database, and admin access</p>
                </div>
              </div>
              <button onClick={() => setIsProvisionModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: 4 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <form onSubmit={handleProvisionSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
              {errorMsg && <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', color: 'var(--color-danger-text, #991B1B)', borderRadius: 8, fontSize: '0.78rem' }}>{errorMsg}</div>}
              {successMsg && <div style={{ padding: '8px 12px', backgroundColor: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary-text, #075F27)', borderRadius: 8, fontSize: '0.78rem' }}>{successMsg}</div>}

              <div>
                <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Company Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm(prev => ({
                      ...prev,
                      name,
                      company_code: (!prev.company_code || prev.company_code.startsWith('APEX') || prev.company_code.startsWith('FIN')) ? generateCompanyCodeFromName(name) : prev.company_code
                    }));
                  }}
                  placeholder="e.g. Apex Global Financial Services Ltd."
                  style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>Company Code (Short ID) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const code = generateCompanyCodeFromName(form.name);
                      setForm(prev => ({ ...prev, company_code: code }));
                    }}
                    style={{
                      background: 'var(--brand-primary-light, #F0FEF5)',
                      border: '1px solid var(--brand-primary-border, #A3F5C1)',
                      color: 'var(--brand-primary, #15803D)',
                      padding: '3px 9px',
                      borderRadius: 6,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Sparkles style={{ width: 12, height: 12 }} />
                    <span>Generate Code</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={form.company_code}
                  onChange={(e) => setForm({ ...form, company_code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
                  placeholder="e.g. APEXFIN01"
                  style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', fontFamily: 'SF Mono, monospace', textTransform: 'uppercase' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Plan Tier *</label>
                  <SharedDropdown
                    value={form.plan_code}
                    onChange={(e) => {
                      const val = e?.target ? e.target.value : e;
                      setForm(prev => ({ ...prev, plan_code: String(val || '').toUpperCase() }));
                    }}
                    options={plans && plans.length > 0 ? plans.map(p => ({ value: p.code, label: `${p.name} (${p.code})` })) : [
                      { value: 'ENTERPRISE', label: 'Enterprise Plan' },
                      { value: 'STANDARD', label: 'Standard Plan' },
                      { value: 'STARTER', label: 'Starter Plan' }
                    ]}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Status *</label>
                  <SharedDropdown
                    value={form.status}
                    onChange={(e) => {
                      const val = e?.target ? e.target.value : e;
                      setForm(prev => ({ ...prev, status: String(val || '').toUpperCase() }));
                    }}
                    options={[
                      { value: 'TRIAL', label: 'Trial' },
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'SUSPENDED', label: 'Suspended' }
                    ]}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {form.status === 'TRIAL' ? (
                  <div>
                    <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Trial Duration *</label>
                    <SharedDropdown
                      value={form.trial_days}
                      onChange={(e) => {
                        const val = e?.target ? e.target.value : e;
                        setForm(prev => ({ ...prev, trial_days: String(val || '15'), custom_expiry_date: '' }));
                      }}
                      options={[
                        { value: '15', label: '15 Days Trial' },
                        { value: '30', label: '30 Days Trial' },
                        { value: '60', label: '60 Days Trial' },
                        { value: '90', label: '90 Days Trial' }
                      ]}
                    />
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Plan Duration / Billing Cycle *</label>
                    <SharedDropdown
                      value={form.billing_cycle}
                      onChange={(e) => {
                        const val = e?.target ? e.target.value : e;
                        setForm(prev => ({ ...prev, billing_cycle: String(val || '3_MONTHS'), custom_expiry_date: '' }));
                      }}
                      options={[
                        { value: '3_MONTHS', label: '3 Months (Quarterly)' },
                        { value: '6_MONTHS', label: '6 Months (Half-Yearly)' },
                        { value: '1_YEAR', label: '1 Year (Annual Billing)' },
                        { value: '1_MONTH', label: '1 Month (Monthly)' }
                      ]}
                    />
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    {form.status === 'TRIAL' ? 'Custom Expiry Date (optional)' : 'Subscription Expiry Date (optional)'}
                  </label>
                  <SharedDatePicker
                    value={form.custom_expiry_date || ''}
                    onChange={(e) => {
                      const val = e?.target ? e.target.value : e;
                      setForm(prev => ({ ...prev, custom_expiry_date: String(val || '') }));
                    }}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#475569', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Estimated Subscription Price:</span>
                <strong style={{ color: '#0F172A' }}>
                  {form.status === 'TRIAL'
                    ? `₹0 (Free Trial - ${form.trial_days} Days)`
                    : (() => {
                        const matchedPlan = plans.find(p => p.code === form.plan_code);
                        const mPrice = Number(matchedPlan?.monthly_price) || (form.plan_code === 'ENTERPRISE' ? 9999 : form.plan_code === 'STARTER' ? 1999 : 2999);
                        if (form.billing_cycle === '1_YEAR') {
                          const yPrice = matchedPlan?.yearly_price ? Number(matchedPlan.yearly_price) : mPrice * 10;
                          return `₹${yPrice.toLocaleString('en-IN')} (Annual Billing)`;
                        }
                        if (form.billing_cycle === '6_MONTHS') {
                          const hPrice = matchedPlan?.six_month_price ? Number(matchedPlan.six_month_price) : mPrice * 5.5;
                          return `₹${Math.round(hPrice).toLocaleString('en-IN')} (6 Months Billing)`;
                        }
                        if (form.billing_cycle === '3_MONTHS') {
                          return `₹${(mPrice * 3).toLocaleString('en-IN')} (3 Months Billing)`;
                        }
                        return `₹${mPrice.toLocaleString('en-IN')} / month`;
                      })()}
                </strong>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Company Logo (optional)</label>
                <input
                  type="file"
                  id="provision_logo_file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      alert('Logo file must be smaller than 5MB.');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      setForm(prev => ({ ...prev, logo: reader.result }));
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                {form.logo ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 8, backgroundColor: '#F8FAFC' }}>
                    <img src={form.logo} alt="Company Logo Preview" style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 6, border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', display: 'block' }}>Logo Attached</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Will be saved to uploads/{form.company_code || 'CODE'}/company-info/</span>
                    </div>
                    <label
                      htmlFor="provision_logo_file"
                      style={{ padding: '5px 10px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
                    >
                      Change
                    </label>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, logo: '' }))}
                      style={{ padding: '5px 10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, color: '#DC2626', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="provision_logo_file"
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#FFFFFF',
                      border: '1px dashed #94A3B8',
                      borderRadius: 8,
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Plus style={{ width: 15, height: 15, color: 'var(--brand-primary, #15803D)' }} />
                    <span>Upload Company Logo (PNG, JPG, SVG, max 5MB)</span>
                  </label>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Company Contact Email *</label>
                  <input type="email" required value={form.company_email} onChange={(e) => setForm({ ...form, company_email: e.target.value })} placeholder="contact@apexfinance.in" style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Company Phone</label>
                  <input type="text" value={form.company_phone} onChange={(e) => setForm({ ...form, company_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="9876543210" style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }} />
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Company Admin Credentials</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Admin Username / Login Email *</label>
                    <input type="email" required value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} placeholder="admin@apexfinance.in" style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Admin Password *</label>
                    <input type="password" required value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} placeholder="••••••••••••" style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
                <button type="button" onClick={() => setIsProvisionModalOpen(false)} style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: 8, padding: '10px 20px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ background: 'var(--brand-primary, #15803D)', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb), 0.25)' }}>
                  {loading ? 'Provisioning...' : 'Provision company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Extend Subscription Modal ─────────────────────────────── */}
      {isExtendModalOpen && selectedSub && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, width: '100%', maxWidth: 440, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarCheck style={{ width: 20, height: 20, color: 'var(--brand-primary, #15803D)' }} />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>Extend Subscription</h2>
              </div>
              <button onClick={() => setIsExtendModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.8rem' }}>
              <div style={{ fontWeight: 700, color: '#0F172A' }}>{selectedSub.company_name} ({selectedSub.company_code})</div>
              <div style={{ color: '#64748B', marginTop: 4 }}>
                Current Plan: <strong>{selectedSub.plan_name || selectedSub.plan_code}</strong> | Status: <strong>{selectedSub.status}</strong>
              </div>
              <div style={{ color: '#64748B', marginTop: 2 }}>
                Current Expiry: <strong>{selectedSub.end_date ? new Date(selectedSub.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Ongoing'}</strong>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 8 }}>Plan Duration Extension Presets</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: '+3 Months (Quarterly)', days: '90' },
                  { label: '+6 Months (Half-Yearly)', days: '180' },
                  { label: '+1 Year (Annual)', days: '365' },
                  { label: '+1 Month (30 Days)', days: '30' }
                ].map(preset => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => setExtendDays(preset.days)}
                    style={{ padding: '8px 12px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, border: extendDays === preset.days ? '2px solid var(--brand-primary, #15803D)' : '1px solid #CBD5E1', backgroundColor: extendDays === preset.days ? 'var(--brand-primary-light, #F0FEF5)' : '#FFFFFF', color: extendDays === preset.days ? 'var(--brand-primary-text, #075F27)' : '#334155', cursor: 'pointer' }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Custom Days</label>
              <input
                type="number"
                min="1"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setIsExtendModalOpen(false)}
                style={{ padding: '9px 16px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleExtendSubscription(selectedSub, extendDays)}
                disabled={extendSubLoading || !extendDays}
                style={{ padding: '9px 20px', backgroundColor: 'var(--brand-primary, #15803D)', border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, color: '#FFFFFF', cursor: 'pointer', boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb), 0.25)' }}
              >
                {extendSubLoading ? 'Extending...' : `Confirm +${extendDays} Days`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Subscription Lifecycle Modal ──────────────────────── */}
      {isEditSubModalOpen && selectedSub && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, width: '100%', maxWidth: 480, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit3 style={{ width: 20, height: 20, color: 'var(--brand-primary, #15803D)' }} />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>Edit Subscription Details</h2>
              </div>
              <button onClick={() => setIsEditSubModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>
              {selectedSub.company_name} ({selectedSub.company_code})
            </div>

            <form onSubmit={handleSaveEditSub} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Plan Tier *</label>
                <SharedDropdown
                  value={editSubForm.plan_id}
                  onChange={(e) => {
                    const val = e?.target ? e.target.value : e;
                    setEditSubForm(prev => ({ ...prev, plan_id: String(val || '') }));
                  }}
                  options={plans.map(p => ({ value: String(p.id), label: `${p.name} (${p.code}) — ₹${p.monthly_price}/mo` }))}
                  placeholder="Select Plan"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Subscription Status *</label>
                <SharedDropdown
                  value={editSubForm.status}
                  onChange={(e) => {
                    const val = e?.target ? e.target.value : e;
                    setEditSubForm(prev => ({ ...prev, status: String(val || '').toUpperCase() }));
                  }}
                  options={[
                    { value: 'ACTIVE', label: 'ACTIVE (Paid / In Service)' },
                    { value: 'TRIAL', label: 'TRIAL (Evaluation Period)' },
                    { value: 'EXPIRED', label: 'EXPIRED (Suspended Due to Non-Payment)' },
                    { value: 'CANCELLED', label: 'CANCELLED (Terminated Account)' }
                  ]}
                  placeholder="Select Status"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Start Date</label>
                  <SharedDatePicker
                    value={editSubForm.start_date || ''}
                    onChange={(e) => {
                      const val = e?.target ? e.target.value : e;
                      setEditSubForm(prev => ({ ...prev, start_date: String(val || '') }));
                    }}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Expiry Date</label>
                  <SharedDatePicker
                    value={editSubForm.end_date || ''}
                    onChange={(e) => {
                      const val = e?.target ? e.target.value : e;
                      setEditSubForm(prev => ({ ...prev, end_date: String(val || '') }));
                    }}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info style={{ width: 16, height: 16, color: '#64748B' }} />
                <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                  Renewal Mode: <strong>Manual Renewal</strong> (Super Admin action required upon expiry).
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsEditSubModalOpen(false)}
                  style={{ padding: '9px 16px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubLoading}
                  style={{ padding: '9px 20px', backgroundColor: 'var(--brand-primary, #15803D)', border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, color: '#FFFFFF', cursor: 'pointer', boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb), 0.25)' }}
                >
                  {editSubLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Manual Renew Subscription Modal ───────────────────────── */}
      {isRenewModalOpen && selectedSub && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, width: '100%', maxWidth: 500, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RotateCw style={{ width: 20, height: 20, color: 'var(--brand-primary, #15803D)' }} />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>Manual Renew Subscription</h2>
              </div>
              <button onClick={() => setIsRenewModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>{selectedSub.company_name}</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--brand-primary, #15803D)', marginLeft: 8, fontFamily: 'SF Mono, monospace' }}>({selectedSub.company_code})</span>
              </div>
              <span style={{
                fontSize: '0.7rem',
                padding: '2px 8px',
                borderRadius: 10,
                backgroundColor: selectedSub.is_expired ? 'var(--color-danger-light, #FEF2F2)' : '#DCFCE7',
                color: selectedSub.is_expired ? 'var(--color-danger-text, #991B1B)' : 'var(--brand-primary-text, #075F27)',
                fontWeight: 700
              }}>
                {selectedSub.is_expired ? 'Expired' : selectedSub.status || 'Active'}
              </span>
            </div>

            <form onSubmit={handleConfirmRenew} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Select Renewal Plan Tier *</label>
                <SharedDropdown
                  value={renewForm.plan_id}
                  onChange={(e) => {
                    const val = e?.target ? e.target.value : e;
                    setRenewForm(prev => ({ ...prev, plan_id: String(val || '') }));
                  }}
                  options={plans.map(p => ({ value: String(p.id), label: `${p.name} (${p.code}) — ₹${p.monthly_price}/mo` }))}
                  placeholder="Select Plan"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Renewal Duration / Billing Cycle *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: '3 Months (Quarterly)', val: '3_MONTHS' },
                    { label: '6 Months (Half-Yearly)', val: '6_MONTHS' },
                    { label: '1 Year (Annual)', val: '1_YEAR' },
                    { label: '1 Month (Monthly)', val: '1_MONTH' }
                  ].map(c => (
                    <button
                      key={c.val}
                      type="button"
                      onClick={() => setRenewForm(prev => ({ ...prev, duration_cycle: c.val, custom_expiry_date: '' }))}
                      style={{
                        padding: '9px 12px',
                        borderRadius: 8,
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        border: renewForm.duration_cycle === c.val && !renewForm.custom_expiry_date ? '2px solid var(--brand-primary, #15803D)' : '1px solid #CBD5E1',
                        backgroundColor: renewForm.duration_cycle === c.val && !renewForm.custom_expiry_date ? 'var(--brand-primary-light, #F0FEF5)' : '#FFFFFF',
                        color: renewForm.duration_cycle === c.val && !renewForm.custom_expiry_date ? 'var(--brand-primary-text, #075F27)' : '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Or Specific Custom Expiry Date (optional)</label>
                <SharedDatePicker
                  value={renewForm.custom_expiry_date || ''}
                  onChange={(e) => {
                    const val = e?.target ? e.target.value : e;
                    setRenewForm(prev => ({ ...prev, custom_expiry_date: String(val || '') }));
                  }}
                  placeholder="YYYY-MM-DD"
                />
              </div>

              {/* Price Calculation Card */}
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Calculated Renewal Fee:</span>
                <strong style={{ fontSize: '0.92rem', color: 'var(--brand-primary, #15803D)', fontWeight: 800 }}>
                  {(() => {
                    const matchedPlan = plans.find(p => String(p.id) === String(renewForm.plan_id)) || plans[0];
                    const mPrice = Number(matchedPlan?.monthly_price) || 2999;
                    if (renewForm.duration_cycle === '1_YEAR') {
                      const yPrice = matchedPlan?.yearly_price ? Number(matchedPlan.yearly_price) : mPrice * 10;
                      return `₹${yPrice.toLocaleString('en-IN')} (1 Year)`;
                    }
                    if (renewForm.duration_cycle === '6_MONTHS') {
                      const hPrice = matchedPlan?.six_month_price ? Number(matchedPlan.six_month_price) : mPrice * 5.5;
                      return `₹${Math.round(hPrice).toLocaleString('en-IN')} (6 Months)`;
                    }
                    if (renewForm.duration_cycle === '3_MONTHS') {
                      return `₹${(mPrice * 3).toLocaleString('en-IN')} (3 Months)`;
                    }
                    return `₹${mPrice.toLocaleString('en-IN')} (1 Month)`;
                  })()}
                </strong>
              </div>

              <div style={{ backgroundColor: '#FEF3C7', padding: '8px 12px', borderRadius: 6, border: '1px solid #FDE68A', fontSize: '0.74rem', color: '#92400E' }}>
                ℹ️ Manual Renewal: No recurring auto-charges will be scheduled. The subscription will remain active until the expiration date.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setIsRenewModalOpen(false)}
                  style={{ padding: '9px 16px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renewLoading}
                  style={{ padding: '9px 22px', backgroundColor: 'var(--brand-primary, #15803D)', border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', cursor: 'pointer', boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb), 0.25)', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <RotateCw style={{ width: 14, height: 14 }} />
                  <span>{renewLoading ? 'Renewing...' : 'Confirm Manual Renewal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
