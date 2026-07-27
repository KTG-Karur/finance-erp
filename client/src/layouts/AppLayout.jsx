import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  Wallet,
  Users,
  ChevronDown,
  BookOpen,
  PieChart,
  Settings,
  LogOut,
  Key,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function AppLayout({ activeTab, setActiveTab, tenant, user, onSignOut, children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loansExpanded,    setLoansExpanded]    = useState(true);
  const [financeExpanded,  setFinanceExpanded]  = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isChangePwOpen,   setIsChangePwOpen]   = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSuccess, setPwSuccess] = useState(false);

  const dropdownRef = useRef(null);

  const currentDateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handlePwSubmit = (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    setPwSuccess(true);
    setTimeout(() => {
      setPwSuccess(false);
      setIsChangePwOpen(false);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }, 1500);
  };

  // Helper: build item class
  const itemCls  = (active) => `sidebar__item${active ? ' sidebar__item--active' : ''}`;
  const subCls   = (active) => `sidebar__sub-item${active ? ' sidebar__sub-item--active' : ''}`;
  const isLoan   = (key) => activeTab === `loan-management/${key}` || activeTab === key;
  const isFin    = (key) => activeTab === `finance-accounting/${key}` || activeTab === key;
  const isSet    = (key) => activeTab === `master-settings/${key}` || activeTab === key;

  // Collapse: when mini, close all accordions
  const toggleCollapse = () => {
    if (!sidebarCollapsed) {
      setLoansExpanded(false);
      setFinanceExpanded(false);
      setSettingsExpanded(false);
    }
    setSidebarCollapsed(prev => !prev);
  };

  const mini = sidebarCollapsed;

  return (
    <div className="app-shell">

      {/* ── Top Header ──────────────────────────────────────── */}
      <header className="app-header">
        <div className="app-header__left">
          <div className="app-header__brand">
            <div className="app-header__logo">
              <Building2 />
            </div>
            {!mini && (
              <span className="app-header__tenant-name">{tenant.name}</span>
            )}
          </div>

          <div className="app-header__divider" />

          <div className="app-header__meta">
            <span className="app-header__chip">Branch: <strong>Main Branch</strong></span>
            <span className="app-header__chip">FY: <strong>2026-27</strong></span>
            <span className="app-header__chip"><strong>{currentDateStr}</strong></span>
          </div>
        </div>

        {/* User profile dropdown */}
        <div className="app-header__right" ref={dropdownRef}>
          <button
            id="user-menu-btn"
            className="app-header__user-btn"
            onClick={() => setUserDropdownOpen(v => !v)}
          >
            <div className="app-header__user-avatar">{getInitials(user.name)}</div>
            <span className="app-header__user-name">{user.name}</span>
            <span className="app-header__user-role">{user.role || 'ADMIN'}</span>
            <ChevronDown className="app-header__user-chevron" />
          </button>

          {userDropdownOpen && (
            <div className="app-header__dropdown" role="menu">
              <button
                id="change-pw-btn"
                className="app-header__dropdown-item"
                onClick={() => { setUserDropdownOpen(false); setIsChangePwOpen(true); }}
              >
                <Key />
                <span>Change Password</span>
              </button>
              <button
                id="sign-out-btn"
                className="app-header__dropdown-item app-header__dropdown-item--danger"
                onClick={() => { setUserDropdownOpen(false); onSignOut(); }}
              >
                <LogOut />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── App Body ─────────────────────────────────────────── */}
      <div className="app-body">

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <aside className={`sidebar${mini ? ' sidebar--mini' : ' sidebar--full'}`}>

          {/* Collapse Toggle Button */}
          <button
            id="sidebar-collapse-btn"
            className="sidebar__collapse-btn"
            onClick={toggleCollapse}
            title={mini ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {mini
              ? <PanelLeftOpen  style={{ width: 18, height: 18 }} />
              : <PanelLeftClose style={{ width: 18, height: 18 }} />
            }
            {!mini && <span>Collapse</span>}
          </button>

          {/* Scrollable Nav Area */}
          <div className="sidebar__scroll thin-scroll">

            {/* ── Main Navigation ── */}
            {!mini && <div className="sidebar__section-label">Main</div>}
            <nav className="sidebar__nav">

              {/* Dashboard */}
              <button
                id="nav-dashboard"
                className={itemCls(activeTab === 'dashboard')}
                onClick={() => setActiveTab('dashboard')}
                title="Dashboard"
              >
                <PieChart className="sidebar__item-icon" />
                {!mini && <span className="sidebar__label">Dashboard</span>}
              </button>

              {/* Borrowers */}
              <button
                id="nav-borrowers"
                className={itemCls(activeTab === 'borrowers')}
                onClick={() => setActiveTab('borrowers')}
                title="Borrower Directory"
              >
                <Users className="sidebar__item-icon" />
                {!mini && <span className="sidebar__label">Borrower Directory</span>}
              </button>

              {/* Loan Management Accordion */}
              {!mini && (
                <>
                  <button
                    id="nav-loans-toggle"
                    className="sidebar__item sidebar__item--accordion"
                    onClick={() => setLoansExpanded(v => !v)}
                  >
                    <div className="sidebar__item-left">
                      <Wallet className="sidebar__item-icon" />
                      <span className="sidebar__label">Loan Management</span>
                    </div>
                    <ChevronDown
                      className={`sidebar__chevron${loansExpanded ? ' sidebar__chevron--open' : ''}`}
                    />
                  </button>

                  {loansExpanded && (
                    <div className="sidebar__children">
                      <button id="nav-active-loans"
                        className={subCls(isLoan('active-loans'))}
                        onClick={() => setActiveTab('loan-management/active-loans')}
                      >Active Loans Register</button>
                      <button id="nav-loan-apps"
                        className={subCls(isLoan('loan-applications'))}
                        onClick={() => setActiveTab('loan-management/loan-applications')}
                      >Pending Applications</button>
                      <button id="nav-closed-loans"
                        className={subCls(isLoan('closed-loans'))}
                        onClick={() => setActiveTab('loan-management/closed-loans')}
                      >Closed Loans Archive</button>
                      <button id="nav-collections"
                        className={subCls(isLoan('collections'))}
                        onClick={() => setActiveTab('loan-management/collections')}
                      >Daily Collection</button>
                      <button id="nav-receipts"
                        className={subCls(isLoan('receipts'))}
                        onClick={() => setActiveTab('loan-management/receipts')}
                      >Receipt Audit Logs</button>
                    </div>
                  )}
                </>
              )}

              {/* Loan icon in mini mode */}
              {mini && (
                <button
                  className={itemCls(activeTab.includes('loan') || activeTab.includes('collections') || activeTab.includes('receipts'))}
                  onClick={() => setActiveTab('loan-management/active-loans')}
                  title="Loan Management"
                >
                  <Wallet className="sidebar__item-icon" />
                </button>
              )}

              {/* Finance Accordion */}
              {!mini && (
                <>
                  <button
                    id="nav-finance-toggle"
                    className="sidebar__item sidebar__item--accordion"
                    onClick={() => setFinanceExpanded(v => !v)}
                  >
                    <div className="sidebar__item-left">
                      <BookOpen className="sidebar__item-icon" />
                      <span className="sidebar__label">Finance & Accounting</span>
                    </div>
                    <ChevronDown
                      className={`sidebar__chevron${financeExpanded ? ' sidebar__chevron--open' : ''}`}
                    />
                  </button>

                  {financeExpanded && (
                    <div className="sidebar__children">
                      <button id="nav-cash-book"
                        className={subCls(isFin('cash-book'))}
                        onClick={() => setActiveTab('finance-accounting/cash-book')}
                      >Cash Book</button>
                      <button id="nav-gen-ledger"
                        className={subCls(isFin('general-ledger'))}
                        onClick={() => setActiveTab('finance-accounting/general-ledger')}
                      >General Ledger</button>
                      <button id="nav-expenses"
                        className={subCls(isFin('expenses'))}
                        onClick={() => setActiveTab('finance-accounting/expenses')}
                      >Expense Vouchers</button>
                      <button id="nav-income"
                        className={subCls(isFin('income-statement') || isFin('pnl'))}
                        onClick={() => setActiveTab('finance-accounting/income-statement')}
                      >Income Statement</button>
                    </div>
                  )}
                </>
              )}

              {mini && (
                <button
                  className={itemCls(activeTab.includes('finance'))}
                  onClick={() => setActiveTab('finance-accounting/cash-book')}
                  title="Finance & Accounting"
                >
                  <BookOpen className="sidebar__item-icon" />
                </button>
              )}

              {/* Settings Accordion */}
              {!mini && (
                <>
                  <button
                    id="nav-settings-toggle"
                    className="sidebar__item sidebar__item--accordion"
                    onClick={() => setSettingsExpanded(v => !v)}
                  >
                    <div className="sidebar__item-left">
                      <Settings className="sidebar__item-icon" />
                      <span className="sidebar__label">Master Settings</span>
                    </div>
                    <ChevronDown
                      className={`sidebar__chevron${settingsExpanded ? ' sidebar__chevron--open' : ''}`}
                    />
                  </button>

                  {settingsExpanded && (
                    <div className="sidebar__children">
                      <button id="nav-interest"
                        className={subCls(isSet('interest-master'))}
                        onClick={() => setActiveTab('master-settings/interest-master')}
                      >Interest Rate Master</button>
                      <button id="nav-calc"
                        className={subCls(isSet('calculator'))}
                        onClick={() => setActiveTab('master-settings/calculator')}
                      >Loan EMI Calculator</button>
                      <button id="nav-staff"
                        className={subCls(isSet('staff-directory') || activeTab === 'employees')}
                        onClick={() => setActiveTab('master-settings/staff-directory')}
                      >Staff Directory</button>
                      <button id="nav-rbac"
                        className={subCls(isSet('rbac-matrix'))}
                        onClick={() => setActiveTab('master-settings/rbac-matrix')}
                      >RBAC Matrix</button>
                      <button id="nav-company"
                        className={subCls(isSet('company-info'))}
                        onClick={() => setActiveTab('master-settings/company-info')}
                      >Company & Branch</button>
                    </div>
                  )}
                </>
              )}

              {mini && (
                <button
                  className={itemCls(activeTab.includes('settings') || activeTab === 'employees')}
                  onClick={() => setActiveTab('master-settings/staff-directory')}
                  title="Master Settings"
                >
                  <Settings className="sidebar__item-icon" />
                </button>
              )}
            </nav>
          </div>

          {/* Sidebar Footer: User Badge */}
          <div className="sidebar__footer">
            <div className="sidebar__user-badge">
              <div className="sidebar__avatar">{getInitials(user.name)}</div>
              {!mini && (
                <div className="sidebar__user-info">
                  <div className="sidebar__user-name">{user.name}</div>
                  <div className="sidebar__user-role">{user.role || 'ADMIN'}</div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Workspace ─────────────────────────────────────────── */}
        <main className="app-workspace thin-scroll">
          {children}
        </main>
      </div>

      {/* ── Change Password Modal ─────────────────────────────── */}
      {isChangePwOpen && (
        <div
          className="change-pw-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setIsChangePwOpen(false); }}
        >
          <div className="change-pw-card">
            <div className="change-pw-header">
              <h3>Change Account Password</h3>
              <button className="modal-close-btn" onClick={() => setIsChangePwOpen(false)}>
                <X />
              </button>
            </div>

            {pwSuccess ? (
              <div className="modal-success" style={{ margin: '1.5rem' }}>
                ✓ Password updated successfully
              </div>
            ) : (
              <form onSubmit={handlePwSubmit}>
                <div className="change-pw-body">
                  {[
                    { id: 'cp-curr', label: 'Current Password', key: 'currentPassword' },
                    { id: 'cp-new',  label: 'New Password',     key: 'newPassword' },
                    { id: 'cp-conf', label: 'Confirm Password', key: 'confirmPassword' },
                  ].map(({ id, label, key }) => (
                    <div className="change-pw-field" key={key}>
                      <label htmlFor={id}>{label}</label>
                      <input
                        id={id}
                        type="password"
                        required
                        placeholder="••••••••"
                        value={pwForm[key]}
                        onChange={(e) => setPwForm(prev => ({ ...prev, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <div className="change-pw-actions">
                  <button type="button" className="btn btn--secondary btn--sm"
                    onClick={() => setIsChangePwOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn--primary btn--sm">
                    Save Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
