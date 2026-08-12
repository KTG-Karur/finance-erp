import React, { useState, useEffect } from 'react';
import {
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
  Sliders,
  Terminal,
  ChevronRight,
  ChevronLeft,
  KeyRound,
  AlertTriangle
} from 'lucide-react';
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
      { key: 'investors', label: 'Investor Capital' },
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
  const [form, setForm] = useState({ name: '', company_code: '', company_email: '', company_phone: '', admin_email: '', admin_password: '', plan_code: 'STANDARD' });
  const [planForm, setPlanForm] = useState({ name: '', code: '', max_branches: '5', monthly_price: '2999', six_month_price: '14999', yearly_price: '29990', allowed_modules: null });

  const openCreatePlanModal = () => {
    setEditingPlan(null);
    setPlanForm({ name: '', code: '', max_branches: '5', monthly_price: '2999', six_month_price: '14999', yearly_price: '29990', allowed_modules: null });
    setErrorMsg('');
    setActiveNav('plan-editor');
  };

  const openEditPlanModal = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      code: plan.code,
      max_branches: plan.max_branches ?? '',
      monthly_price: plan.monthly_price ?? '0',
      six_month_price: plan.six_month_price ?? '0',
      yearly_price: plan.yearly_price ?? '0',
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

  const fetchTenants = async () => {
    setTenantsLoading(true);
    setTenantsError('');
    try {
      const res = await api.get('/auth/superadmin/companies');
      setTenants(res.data?.data || []);
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

  const renderCategorizedMenuTree = (allowedModules, toggleKey) => {
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

                return (
                  <div key={menu.key} style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: parentChecked ? 'var(--brand-primary-light, #F0FDF4)' : '#F8FAFC', border: `1px solid ${parentChecked ? 'var(--brand-primary-border, #A3F5C1)' : '#E2E8F0'}` }}>
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
                      <span style={{ fontSize: '0.64rem', padding: '2px 8px', borderRadius: 10, background: parentChecked ? '#DCFCE7' : 'var(--color-danger-light, #FEF2F2)', color: parentChecked ? 'var(--brand-primary-hover, #15803D)' : 'var(--color-danger-text, #991B1B)', border: `1px solid ${parentChecked ? '#86EFAC' : 'var(--color-danger-border, #FECACA)'}`, fontWeight: 700 }}>
                        {parentChecked ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>

                    {hasSubmenus && (
                      <div style={{ paddingLeft: 23, display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 6, borderTop: '1px dashed #E2E8F0' }}>
                        {menu.submenus.map(sub => {
                          const subChecked = allowedModules == null || allowedModules.includes(sub.key) || allowedModules.includes(menu.key);
                          return (
                            <label key={sub.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.75rem', color: subChecked ? 'var(--brand-primary-hover, #0E5327)' : '#64748B', fontWeight: 500 }}>
                              <input
                                type="checkbox"
                                checked={subChecked}
                                onChange={() => toggleKey(sub.key)}
                                style={{ accentColor: 'var(--brand-primary, #15803D)', width: 14, height: 14 }}
                              />
                              <span>↳ {sub.label}</span>
                              <span style={{ fontSize: '0.62rem', color: subChecked ? 'var(--brand-primary, #15803D)' : '#94A3B8', marginLeft: 'auto', fontWeight: 600 }}>
                                {subChecked ? 'Accessible' : 'Restricted'}
                              </span>
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
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    if (activeNav === 'plans') fetchPlans();
    if (activeNav === 'audit' || activeNav === 'dashboard') fetchAuditLogs();
  }, [activeNav]);

  const filteredTenants = tenants.filter(t =>
    !searchQuery ||
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.company_code && t.company_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
    t.db_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    setAccessForm({
      max_branches: tenant.max_branches ?? '',
      allowed_modules: tenant.allowed_modules ?? null
    });
    setAccessError('');
    setActiveNav('access-editor');
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
    try {
      const isFullyChecked = accessForm.allowed_modules && MODULE_KEYS.every(m => accessForm.allowed_modules.includes(m.key));
      const payload = {
        max_branches: accessForm.max_branches === '' ? null : Number(accessForm.max_branches),
        allowed_modules: isFullyChecked ? null : accessForm.allowed_modules
      };
      const res = await api.patch(`/auth/superadmin/companies/${accessTarget.id}/access`, payload);
      setTenants(prev => prev.map(t => (t.id === accessTarget.id ? { ...t, max_branches: payload.max_branches, allowed_modules: payload.allowed_modules } : t)));
      setAccessTarget(null);
      setActiveNav('registry');
    } catch (err) {
      setAccessError(err?.response?.data?.message || 'Unable to update access settings.');
    } finally {
      setAccessSaving(false);
    }
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
        plan_code: form.plan_code || 'STANDARD'
      });

      await fetchTenants();
      setSuccessMsg(res.data?.message || `Tenant '${form.name}' provisioned successfully.`);
      setTimeout(() => {
        setIsProvisionModalOpen(false);
        setForm({ name: '', company_code: '', company_email: '', company_phone: '', admin_email: '', admin_password: '', plan_code: 'STANDARD' });
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
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: 'none', backgroundColor: activeNav === 'plans' || activeNav === 'plan-editor' ? 'rgba(var(--brand-primary-rgb), 0.25)' : 'transparent', color: activeNav === 'plans' || activeNav === 'plan-editor' ? '#FFFFFF' : '#94A3B8', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 500, fontSize: '0.82rem' }}
                onClick={() => setActiveNav('plans')}
              >
                <Crown style={{ width: 16, height: 16 }} />
                {!mini && <span className="sidebar__label">Plans & Subscriptions</span>}
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
                      <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Revenue</span>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>₹3,31,000</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--brand-primary, #15803D)', marginTop: 2, fontWeight: 600 }}>Active Subscriptions</div>
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
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>2.12 GB</div>
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
                          <th style={{ padding: '10px 14px' }}>STATUS</th>
                          <th style={{ padding: '10px 14px' }}>CREATED ON</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenantsLoading ? (
                          <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24, color: '#64748B' }}>Loading companies...</td></tr>
                        ) : tenants.length === 0 ? (
                          <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24, color: '#94A3B8' }}>No tenant companies registered yet.</td></tr>
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
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10, background: t.is_active ? '#DCFCE7' : 'var(--color-danger-light, #FEF2F2)', color: t.is_active ? 'var(--brand-primary-text, #075F27)' : 'var(--color-danger-text, #991B1B)', fontWeight: 600 }}>
                                {t.is_active ? 'Active' : 'Trial'}
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
                        <th style={{ padding: '12px 16px' }}>STATUS</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenantsLoading ? (
                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24, color: '#64748B' }}>Loading registry...</td></tr>
                      ) : filteredTenants.length === 0 ? (
                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24, color: '#94A3B8' }}>No companies found.</td></tr>
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
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: 12, backgroundColor: t.is_active ? '#DCFCE7' : 'var(--color-danger-light, #FEF2F2)', color: t.is_active ? 'var(--brand-primary-text, #075F27)' : 'var(--color-danger-text, #991B1B)', fontWeight: 600 }}>
                              {t.is_active ? 'Active' : 'Suspended'}
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
                      <input type="number" required value={planForm.monthly_price} onChange={(e) => setPlanForm({ ...planForm, monthly_price: e.target.value })} style={{ width: '100%', height: 40, padding: '0 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }} />
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
                    {renderCategorizedMenuTree(planForm.allowed_modules, togglePlanModuleKey, false)}
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
                    <div style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: 'var(--brand-primary, #10B981)', color: '#FFFFFF', fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {accessTarget.name.slice(0, 2).toUpperCase()}
                    </div>
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
                    <span style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: 12, backgroundColor: '#FEF3C7', color: 'var(--color-warning, #D97706)', fontWeight: 700 }}>Trial</span>
                    <span style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: 12, backgroundColor: '#F3E8FF', color: '#7E22CE', fontWeight: 700 }}>Enterprise</span>
                    <span style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: 12, backgroundColor: '#DCFCE7', color: 'var(--brand-primary-hover, #15803D)', fontWeight: 700 }}>Mobile</span>
                  </div>
                </div>

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

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Company name</label>
                          <input type="text" value={accessTarget.name} onChange={(e) => setAccessTarget({ ...accessTarget, name: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Company code</label>
                          <input type="text" readOnly value={accessTarget.company_code} style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', backgroundColor: '#F8FAFC', fontFamily: 'SF Mono, monospace' }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Contact email</label>
                          <input type="email" defaultValue="md@laskhmikadatcfham.in" style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Contact phone</label>
                          <input type="text" defaultValue="9080274281" style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }} />
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>Expiry Date (optional)</label>
                        <input type="text" defaultValue="26-08-2026" style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }} />
                      </div>
                    </div>

                    {/* Custom Features (Overrides) Card (Ref Image 4) */}
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ShieldCheck style={{ width: 18, height: 18, color: 'var(--brand-primary, #15803D)' }} />
                          <span>Custom Features (Overrides)</span>
                        </h2>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button type="button" onClick={selectAllAccessModules} style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', padding: '6px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Select All</button>
                          <button type="button" onClick={deselectAllAccessModules} style={{ background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', color: 'var(--color-danger, #DC2626)', padding: '6px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Deselect All</button>
                        </div>
                      </div>

                      {renderCategorizedMenuTree(accessForm.allowed_modules, toggleModuleKey, true)}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
                        <button type="button" onClick={() => { setAccessTarget(null); setActiveNav('registry'); }} style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: 8, padding: '10px 20px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                        <button type="button" onClick={handleSaveAccess} disabled={accessSaving} style={{ background: 'var(--brand-primary, #15803D)', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb), 0.25)' }}>
                          {accessSaving ? 'Saving...' : 'Save changes'}
                        </button>
                      </div>
                    </div>
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
                          <strong style={{ color: '#0F172A' }}>Enterprise</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                          <span style={{ color: '#64748B' }}>Type</span>
                          <strong style={{ color: '#0F172A' }}>Trial</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                          <span style={{ color: '#64748B' }}>Amount</span>
                          <strong style={{ color: '#0F172A' }}>₹0</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                          <span style={{ color: '#64748B' }}>Status</span>
                          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 10, backgroundColor: '#DCFCE7', color: 'var(--brand-primary-hover, #15803D)', fontWeight: 700 }}>Active</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                          <span style={{ color: '#64748B' }}>End Date</span>
                          <strong style={{ color: '#0F172A' }}>26 Aug 2026</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Expires</span>
                          <strong style={{ color: '#0F172A' }}>26 Aug 2026</strong>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>MySQL Connection Pool Factory</h2>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '4px 0 0 0' }}>Dynamic tenant database connection cache (`mysql2/promise` pool factory)</p>
                  </div>
                  <button style={{ padding: '6px 14px', backgroundColor: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary-text, #075F27)', borderRadius: 8, fontSize: '0.78rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <RefreshCw style={{ width: 14, height: 14 }} />
                    <span>Flush Cache</span>
                  </button>
                </div>

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
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. LAKSHMI KADATCHAM FINANCE" style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Company Code (Short ID) *</label>
                <input type="text" required value={form.company_code} onChange={(e) => setForm({ ...form, company_code: e.target.value.toUpperCase() })} placeholder="e.g. LKFI" style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', fontFamily: 'SF Mono, monospace' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Plan Tier *</label>
                  <select value={form.plan_code} onChange={(e) => setForm({ ...form, plan_code: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }}>
                    <option value="ENTERPRISE">Enterprise Plan</option>
                    <option value="STANDARD">Standard Plan</option>
                    <option value="STARTER">Starter Plan</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Status *</label>
                  <select defaultValue="Trial" style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }}>
                    <option value="Trial">Trial</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Trial Duration *</label>
                <select defaultValue="15 Days" style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }}>
                  <option value="15 Days">15 Days</option>
                  <option value="30 Days">30 Days</option>
                  <option value="60 Days">60 Days</option>
                </select>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#475569', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Estimated Subscription Price:</span>
                <strong style={{ color: '#0F172A' }}>₹0 (Free Trial)</strong>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Company Logo (optional)</label>
                <button type="button" style={{ padding: '8px 14px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus style={{ width: 14, height: 14 }} />
                  <span>Choose Logo</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Company Contact Email *</label>
                  <input type="email" required value={form.company_email} onChange={(e) => setForm({ ...form, company_email: e.target.value })} placeholder="contact@company.com" style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Company Phone</label>
                  <input type="text" value={form.company_phone} onChange={(e) => setForm({ ...form, company_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="9080274281" style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }} />
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Company Admin Credentials</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Admin Username / Login Email *</label>
                    <input type="email" required value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} placeholder="admin@company.com" style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Admin Password *</label>
                    <input type="password" required value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} placeholder="••••••••" style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem' }} />
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




    </div>
  );
}
