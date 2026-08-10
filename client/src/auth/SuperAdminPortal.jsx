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
  KeyRound,
  AlertTriangle
} from 'lucide-react';
import api from '../api/client';

// Canonical module-key vocabulary — mirrors AppLayout.jsx's top-level sidebar
// sections and server/src/plugins/moduleGuard.js's requireTenantModule checks.
// A tenant with allowed_modules = null (the default) is fully unrestricted.
const MODULE_KEYS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'loans', label: 'Loan Management' },
  { key: 'borrowers', label: 'Customer / Borrower Details' },
  { key: 'investors', label: 'Investor Capital' },
  { key: 'fixed_deposits', label: 'Fixed Deposits' },
  { key: 'recurring_deposits', label: 'Recurring Deposits' },
  { key: 'accounting', label: 'Finance & Accounting' },
  { key: 'reports', label: 'Reports' },
  { key: 'org', label: 'Branch Management' },
  { key: 'employees', label: 'Staff Directory' }
];

export default function SuperAdminPortal({ user, onJumpToTenant, onSignOut }) {
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [tenantsError, setTenantsError] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeNav, setActiveNav] = useState('registry'); // 'registry' | 'pools' | 'audit' | 'settings'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [form, setForm] = useState({ name: '', company_code: '', admin_email: '', admin_password: '' });

  const [accessTarget, setAccessTarget] = useState(null);
  const [accessForm, setAccessForm] = useState({ max_branches: '', allowed_modules: null });
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessError, setAccessError] = useState('');

  const fetchTenants = async () => {
    setTenantsLoading(true);
    setTenantsError('');
    try {
      const res = await api.get('/v1/auth/superadmin/companies');
      setTenants(res.data?.data || []);
    } catch (err) {
      setTenantsError(err?.response?.data?.message || 'Unable to load tenant registry.');
    } finally {
      setTenantsLoading(false);
    }
  };

  useEffect(() => { fetchTenants(); }, []);

  useEffect(() => {
    if (activeNav !== 'audit') return;
    api.get('/v1/auth/superadmin/audit-logs')
      .then(res => setAuditLogs(res.data?.data || []))
      .catch(() => setAuditLogs([]));
  }, [activeNav]);

  const filteredTenants = tenants.filter(t =>
    !searchQuery ||
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.company_code && t.company_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
    t.db_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleStatus = async (tenant) => {
    const nextActive = tenant.is_active === 1 ? 0 : 1;
    try {
      await api.patch(`/v1/auth/superadmin/companies/${tenant.id}/status`, { is_active: nextActive });
      setTenants(prev => prev.map(t => (t.id === tenant.id ? { ...t, is_active: nextActive } : t)));
    } catch (err) {
      setTenantsError(err?.response?.data?.message || 'Unable to update tenant status.');
    }
  };

  const openAccessModal = (tenant) => {
    setAccessTarget(tenant);
    setAccessForm({
      max_branches: tenant.max_branches ?? '',
      allowed_modules: tenant.allowed_modules ?? null
    });
    setAccessError('');
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
      const res = await api.patch(`/v1/auth/superadmin/companies/${accessTarget.id}/access`, payload);
      setTenants(prev => prev.map(t => (t.id === accessTarget.id ? { ...t, max_branches: payload.max_branches, allowed_modules: payload.allowed_modules } : t)));
      setAccessTarget(null);
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
      const res = await api.post('/v1/auth/superadmin/companies', {
        company_code: code,
        name: form.name,
        admin_email: form.admin_email,
        admin_password: form.admin_password || 'admin123'
      });

      await fetchTenants();
      setSuccessMsg(res.data?.message || `Tenant '${form.name}' provisioned successfully.`);
      setTimeout(() => {
        setIsProvisionModalOpen(false);
        setForm({ name: '', company_code: '', admin_email: '', admin_password: '' });
        setSuccessMsg('');
      }, 1500);
    } catch (err) {
      // Provisioning genuinely failed on the backend (bad company code, DB
      // creation error, etc.) — show the real reason, don't pretend it worked.
      setErrorMsg(err?.response?.data?.message || 'Failed to provision tenant. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const mini = sidebarCollapsed;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#F8FAFC', color: '#0F172A' }}>
      
      {/* ── Fullscreen Topbar Header (Emerald Fintech Theme) ────────────────────────────── */}
      <header className="app-header" style={{ height: 56, minHeight: 56, background: 'linear-gradient(135deg, #064E3B 0%, #047857 50%, #059669 100%)', borderBottom: '1px solid rgba(255,255,255,0.12)', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 40, flexShrink: 0, boxShadow: '0 2px 8px rgba(6, 78, 59, 0.25)' }}>
        
        {/* Topbar Left: Icon & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.25)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck style={{ width: 16, height: 16 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#FFFFFF', letterSpacing: '-0.01em' }}>
              Super Admin Portal
            </span>
            <span style={{ fontSize: '0.72rem', color: '#A7F3D0', fontWeight: 500, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 12 }}>
              Central Master Auth (`master_erp_db`)
            </span>
          </div>
        </div>

        {/* Topbar Right: Search, Notifications, User & Sign Out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Quick Search */}
          <div style={{ position: 'relative', width: 220 }}>
            <Search style={{ width: 13, height: 13, color: '#A7F3D0', position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tenant..."
              style={{ width: '100%', height: 32, backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: 6, paddingLeft: 28, paddingRight: 10, fontSize: '0.75rem', color: '#FFFFFF', fontWeight: 400 }}
            />
          </div>

          {/* Notification Bell */}
          <button style={{ background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', cursor: 'pointer' }} title="Notifications">
            <Bell style={{ width: 14, height: 14 }} />
          </button>

          <div style={{ height: 20, width: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

          {/* User Display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#FFFFFF' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#ECFDF5', color: '#065F46', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #A7F3D0' }}>
              SA
            </div>
            <span style={{ fontWeight: 500, color: '#FFFFFF' }}>{user?.name || 'Super Admin'}</span>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={onSignOut}
            style={{ padding: '6px 14px', backgroundColor: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.3)', color: '#FFFFFF', borderRadius: 6, fontSize: '0.75rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', transition: 'all 0.15s ease' }}
          >
            <LogOut style={{ width: 13, height: 13 }} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ── App Body: Sidebar + Main Workspace Column ───────────── */}
      <div className="app-body" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Executive Dark Emerald Sidebar ───────────────────── */}
        <aside className={`sidebar${mini ? ' sidebar--mini' : ' sidebar--full'}`} style={{ backgroundColor: '#062C27', borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {/* Sidebar Top Header */}
          <div className="sidebar__brand" style={{ justifyContent: mini ? 'center' : 'space-between', padding: mini ? '0 8px' : '0 14px', backgroundColor: '#031E1B', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
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
              style={{ margin: mini ? '0 auto' : '0' }}
            >
              {mini ? <PanelLeftOpen style={{ width: 15, height: 15 }} /> : <PanelLeftClose style={{ width: 15, height: 15 }} />}
            </button>
          </div>

          {/* Navigation Section */}
          <div className="sidebar__scroll thin-scroll" style={{ padding: '12px 8px' }}>
            {!mini && (
              <div className="sidebar__section-label" style={{ color: '#34D399', fontWeight: 600, fontSize: '0.68rem', letterSpacing: '0.08em', padding: '12px 10px 6px' }}>
                MASTER REGISTRY
              </div>
            )}
            <nav className="sidebar__nav" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button
                type="button"
                className={`sidebar__item${activeNav === 'registry' ? ' sidebar__item--active' : ''}`}
                onClick={() => setActiveNav('registry')}
                title="Tenant Registry & Provisioning"
              >
                <Building2 className="sidebar__item-icon" style={{ width: 16, height: 16 }} />
                {!mini && <span className="sidebar__label" style={{ fontWeight: 500 }}>Tenant Registry</span>}
              </button>

              <button
                type="button"
                className={`sidebar__item${activeNav === 'pools' ? ' sidebar__item--active' : ''}`}
                onClick={() => setActiveNav('pools')}
                title="Database Pool Factory"
              >
                <Database className="sidebar__item-icon" style={{ width: 16, height: 16 }} />
                {!mini && <span className="sidebar__label" style={{ fontWeight: 500 }}>Database Pools</span>}
              </button>
            </nav>

            {!mini && (
              <div className="sidebar__section-label" style={{ color: '#34D399', fontWeight: 600, fontSize: '0.68rem', letterSpacing: '0.08em', padding: '18px 10px 6px' }}>
                SYSTEM TELEMETRY
              </div>
            )}
            <nav className="sidebar__nav" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button
                type="button"
                className={`sidebar__item${activeNav === 'audit' ? ' sidebar__item--active' : ''}`}
                onClick={() => setActiveNav('audit')}
                title="Central Audit Logs"
              >
                <Activity className="sidebar__item-icon" style={{ width: 16, height: 16 }} />
                {!mini && <span className="sidebar__label" style={{ fontWeight: 500 }}>Central Audit Logs</span>}
              </button>

              <button
                type="button"
                className={`sidebar__item${activeNav === 'settings' ? ' sidebar__item--active' : ''}`}
                onClick={() => setActiveNav('settings')}
                title="Master DB Config"
              >
                <Settings className="sidebar__item-icon" style={{ width: 16, height: 16 }} />
                {!mini && <span className="sidebar__label" style={{ fontWeight: 500 }}>Master System Config</span>}
              </button>
            </nav>
          </div>
        </aside>

        {/* ── Main Content Area ──────────────────────────────── */}
        <div className="app-body__main" style={{ flex: 1, overflowY: 'auto' }}>

          {/* Main Body View */}
          <main style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* View 1: Tenant Registry & Provisioning */}
            {activeNav === 'registry' && (
              <>
                {/* Banner & Provision Shortcut */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                  <div>
                    <h1 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#0F172A', margin: 0, letterSpacing: '-0.015em' }}>
                      Central Tenant Registry & Database Provisioning
                    </h1>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '4px 0 0 0', fontWeight: 400 }}>
                      Manage isolated MySQL databases per tenant company. Provision new databases with automated migrations and seeders.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsProvisionModalOpen(true)}
                    style={{ padding: '9px 18px', backgroundColor: '#059669', color: '#FFFFFF', fontWeight: 500, fontSize: '0.8rem', borderRadius: 8, border: 'none', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)' }}
                  >
                    <Plus style={{ width: 15, height: 15 }} />
                    <span>Provision New Tenant Database</span>
                  </button>
                </div>

                {tenantsError && (
                  <div style={{ padding: '10px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: 10, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0 }} />
                    <span>{tenantsError}</span>
                  </div>
                )}

                {/* Global Summary Metrics Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, fontVariantNumeric: 'tabular-nums' }}>
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Registered Companies</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0F172A', marginTop: 4 }}>{tenants.length} Tenants</div>
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, backgroundColor: '#F1F5F9', color: '#059669', border: '1px solid #E2E8F0' }}>
                      <Building2 style={{ width: 20, height: 20 }} />
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Isolated Databases</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#059669', marginTop: 4 }}>{tenants.filter(t => t.is_active === 1).length} Active DBs</div>
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, backgroundColor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
                      <Database style={{ width: 20, height: 20 }} />
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Central Auth Registry</span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 600, color: '#2563EB', marginTop: 4, fontFamily: 'SF Mono, Consolas, monospace' }}>finance_master_db</div>
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
                      <ShieldCheck style={{ width: 20, height: 20 }} />
                    </div>
                  </div>
                </div>

                {/* Search & Filter Bar */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                  <div style={{ position: 'relative', width: 360 }}>
                    <Search style={{ width: 14, height: 14, color: '#94A3B8', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search company name, company code, tenant DB..."
                      style={{ width: '100%', height: 36, backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 8, paddingLeft: 36, paddingRight: 12, fontSize: '0.8rem', color: '#0F172A', fontWeight: 400 }}
                    />
                  </div>

                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 400, fontVariantNumeric: 'tabular-nums' }}>
                    Showing {filteredTenants.length} Tenant Databases
                  </span>
                </div>

                {/* Tenant Registry Table */}
                <div className="loans-table-card" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                  <div className="table-responsive">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Company Name & Code</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Isolated Database Name</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Plan / Access</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Created Date</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 500 }}>Status</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Global Actions</th>
                        </tr>
                      </thead>
                      <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {tenantsLoading ? (
                          <tr><td colSpan="6" style={{ textAlign: 'center', padding: 32, color: '#94A3B8', fontSize: '0.8rem' }}>Loading tenant registry…</td></tr>
                        ) : filteredTenants.length === 0 ? (
                          <tr><td colSpan="6" style={{ textAlign: 'center', padding: 32, color: '#94A3B8', fontSize: '0.8rem' }}>No tenants found.</td></tr>
                        ) : filteredTenants.map((tenant) => (
                          <tr key={tenant.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem' }}>
                                <Building2 style={{ width: 15, height: 15, color: '#059669' }} />
                                <span>{tenant.name}</span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2, fontFamily: 'SF Mono, Consolas, monospace' }}>
                                Code: {tenant.company_code || 'ALPHA'} • ID: {tenant.id}
                              </div>
                            </td>

                            <td style={{ padding: '12px 16px', fontFamily: 'SF Mono, Consolas, monospace', fontWeight: 500, color: '#2563EB', fontSize: '0.78rem' }}>
                              {tenant.db_name || `finance_db_${(tenant.company_code || 'alpha').toLowerCase()}`}
                            </td>

                            <td style={{ padding: '12px 16px', fontSize: '0.76rem' }}>
                              <div style={{ color: '#334155', fontWeight: 500 }}>{tenant.plan_tier || 'STANDARD'}</div>
                              <div style={{ color: '#94A3B8', fontSize: '0.7rem', marginTop: 2 }}>
                                {tenant.max_branches != null ? `Max ${tenant.max_branches} branch(es)` : 'Unlimited branches'}
                                {' • '}
                                {tenant.allowed_modules ? `${tenant.allowed_modules.length} module(s) allowed` : 'All modules'}
                              </div>
                            </td>

                            <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.78rem' }}>
                              {tenant.created_at}
                            </td>

                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: 12,
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                backgroundColor: tenant.is_active === 1 ? '#ECFDF5' : '#FEF2F2',
                                color: tenant.is_active === 1 ? '#065F46' : '#991B1B',
                                border: `1px solid ${tenant.is_active === 1 ? '#A7F3D0' : '#FECACA'}`
                              }}>
                                {tenant.is_active === 1 ? 'ACTIVE' : 'SUSPENDED'}
                              </span>
                            </td>

                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                                <button
                                  onClick={() => openAccessModal(tenant)}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #E2E8F0',
                                    backgroundColor: '#F8FAFC',
                                    color: '#334155',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                  title="Manage branch limit & module allocation"
                                >
                                  <KeyRound style={{ width: 13, height: 13 }} />
                                  <span>Manage Access</span>
                                </button>

                                <button
                                  onClick={() => handleToggleStatus(tenant)}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    border: tenant.is_active === 1 ? '1px solid #FECACA' : '1px solid #A7F3D0',
                                    backgroundColor: tenant.is_active === 1 ? '#FEF2F2' : '#ECFDF5',
                                    color: tenant.is_active === 1 ? '#991B1B' : '#065F46',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                  title={tenant.is_active === 1 ? 'Suspend Tenant DB' : 'Activate Tenant DB'}
                                >
                                  <Power style={{ width: 13, height: 13 }} />
                                  <span>{tenant.is_active === 1 ? 'Suspend' : 'Activate'}</span>
                                </button>

                                <button
                                  onClick={() => onJumpToTenant(tenant)}
                                  style={{
                                    padding: '6px 14px',
                                    backgroundColor: '#059669',
                                    color: '#FFFFFF',
                                    fontWeight: 500,
                                    borderRadius: 6,
                                    border: 'none',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    boxShadow: '0 1px 3px rgba(5, 150, 105, 0.2)'
                                  }}
                                >
                                  <ExternalLink style={{ width: 13, height: 13 }} />
                                  <span>Jump Into Workspace</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* View 2: Database Pools */}
            {activeNav === 'pools' && (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>MySQL Connection Pool Factory</h2>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '4px 0 0 0' }}>Dynamic tenant database connection cache (`mysql2/promise` pool factory)</p>
                  </div>
                  <button style={{ padding: '6px 14px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: 8, fontSize: '0.78rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <RefreshCw style={{ width: 14, height: 14 }} />
                    <span>Flush Cache</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 8 }}>
                  {tenants.map(t => (
                    <div key={t.id} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px', backgroundColor: '#F8FAFC' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>{t.company_code}</span>
                        <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10, background: '#ECFDF5', color: '#065F46', fontWeight: 500 }}>POOL CACHED</span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#64748B', fontFamily: 'SF Mono, Consolas, monospace' }}>
                        <div>DB: {t.db_name}</div>
                        <div style={{ marginTop: 4 }}>Connections: 10 active / 2 idle</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View 3: Central Audit Logs */}
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
                          <td style={{ padding: '10px 14px', fontFamily: 'SF Mono, monospace', color: '#2563EB' }}>
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

            {/* View 4: System Settings */}
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

      {/* Provision New Tenant Modal */}
      {isProvisionModalOpen && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card" style={{ maxWidth: 480, width: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif' }}>
            <div className="saas-modal-header" style={{ borderBottom: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus style={{ width: 16, height: 16 }} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: '0.98rem', color: '#0F172A', margin: 0 }}>Provision Tenant Database</h3>
                  <p style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 400, margin: 0 }}>Automated schema migration & seeding</p>
                </div>
              </div>
              <button onClick={() => setIsProvisionModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: 4 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <form onSubmit={handleProvisionSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {errorMsg && (
                <div style={{ padding: '8px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: 8, fontSize: '0.78rem' }}>
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div style={{ padding: '8px 12px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: 8, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle style={{ width: 14, height: 14, color: '#059669' }} />
                  <span>{successMsg}</span>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>Company Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Delta Finance Pvt Ltd"
                  style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 400 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>Company Code (Short ID) *</label>
                <input
                  type="text"
                  required
                  value={form.company_code}
                  onChange={(e) => setForm({ ...form, company_code: e.target.value.toUpperCase() })}
                  placeholder="e.g. DELTA"
                  style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 500, fontFamily: 'SF Mono, Consolas, monospace' }}
                />
                <p style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 4, margin: '4px 0 0 0' }}>Database generated: <span style={{ fontFamily: 'SF Mono, Consolas, monospace', color: '#2563EB', fontWeight: 500 }}>finance_db_{form.company_code ? form.company_code.toLowerCase() : 'code'}</span></p>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>Company Admin Email *</label>
                <input
                  type="email"
                  required
                  value={form.admin_email}
                  onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                  placeholder="admin@delta.com"
                  style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 400 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>Company Admin Password *</label>
                <input
                  type="password"
                  required
                  value={form.admin_password}
                  onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                  placeholder="••••••••"
                  style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 400 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ background: '#059669', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)' }}
                >
                  {loading ? 'Provisioning & Migrating DB...' : 'Provision & Scaffold DB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Access Modal — branch limit + module allocation ("page allocation") */}
      {accessTarget && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card" style={{ maxWidth: 520, width: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif' }}>
            <div className="saas-modal-header" style={{ borderBottom: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound style={{ width: 16, height: 16 }} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: '0.98rem', color: '#0F172A', margin: 0 }}>Manage Access — {accessTarget.name}</h3>
                  <p style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 400, margin: 0 }}>Branch limit & module allocation</p>
                </div>
              </div>
              <button onClick={() => setAccessTarget(null)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: 4 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {accessError && (
                <div style={{ padding: '8px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: 8, fontSize: '0.78rem' }}>
                  {accessError}
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>Max Branches</label>
                <input
                  type="number"
                  min="0"
                  value={accessForm.max_branches}
                  onChange={(e) => setAccessForm({ ...accessForm, max_branches: e.target.value })}
                  placeholder="Leave blank for unlimited"
                  style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A' }}
                />
                <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: '4px 0 0 0' }}>How many branches this tenant is allowed to create in total. Blank = no limit.</p>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>Allowed Menus / Modules</label>
                <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: '0 0 8px 0' }}>Uncheck a module to hide it from this tenant entirely, regardless of staff role. All checked = unrestricted.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, background: '#F8FAFC' }}>
                  {MODULE_KEYS.map(m => {
                    const checked = accessForm.allowed_modules == null || accessForm.allowed_modules.includes(m.key);
                    return (
                      <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#334155', cursor: 'pointer' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleModuleKey(m.key)} style={{ accentColor: '#059669' }} />
                        <span>{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid #F1F5F9' }}>
              <button
                type="button"
                onClick={() => setAccessTarget(null)}
                style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={accessSaving}
                onClick={handleSaveAccess}
                style={{ background: '#059669', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)' }}
              >
                {accessSaving ? 'Saving…' : 'Save Access Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
