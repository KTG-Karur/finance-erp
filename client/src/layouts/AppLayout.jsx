import React, { useState, useRef, useEffect } from 'react';
import {
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
  FileText,
  Clock,
  Archive,
  Banknote,
  Receipt,
  Book,
  Layers,
  CreditCard,
  TrendingUp,
  Percent,
  UserCog,
  Shield,
  Building2,
  Bell,
  Search,
  MapPin,
} from 'lucide-react';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function AppLayout({ activeTab, setActiveTab, tenant, user, onSignOut, children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [loansExpanded, setLoansExpanded] = useState(true);
  const [financeExpanded, setFinanceExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isChangePwOpen, setIsChangePwOpen] = useState(false);
  const [isConfirmLogoutOpen, setIsConfirmLogoutOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSuccess, setPwSuccess] = useState(false);

  const dropdownRef = useRef(null);

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

  const itemCls = (active) => `sidebar__item${active ? ' sidebar__item--active' : ''}`;
  const subCls = (active) => `sidebar__sub-item${active ? ' sidebar__sub-item--active' : ''}`;
  const isLoan = (key) => activeTab === `loan-management/${key}` || activeTab === key;
  const isFin = (key) => activeTab === `finance-accounting/${key}` || activeTab === key;
  const isSet = (key) => activeTab === `master-settings/${key}` || activeTab === key;

  const toggleCollapse = () => {
    if (!sidebarCollapsed) {
      setLoansExpanded(false);
      setFinanceExpanded(false);
      setSettingsExpanded(false);
    }
    setSidebarCollapsed(prev => !prev);
  };

  const mini = sidebarCollapsed;

  // Search filtering logic
  const sq = sidebarSearch.toLowerCase().trim();
  const match = (title) => !sq || title.toLowerCase().includes(sq);

  const hasWorkspaceMatches = match('Dashboard');
  const hasLoanMatches = match('Customer Loans') || match('Active Loans') || match('Loan Applications') || match('Closed Loans') || match('Collections') || match('Receipts') || match('Investor Capital') || match('Fixed Deposits');
  const hasFinanceMatches = match('Finance & Accounting') || match('Cash Book') || match('General Ledger') || match('Expense Vouchers') || match('Income Statement');
  const hasSettingsMatches = match('Master Settings') || match('Loan Scheme Master') || match('Customer Directory') || match('Organization & Company') || match('Accounting Masters') || match('Staff Directory') || match('RBAC Matrix');

  const hasAnyMatches = hasWorkspaceMatches || hasLoanMatches || hasFinanceMatches || hasSettingsMatches;

  return (
    <div className="app-shell">

      {/* ── App Body: Sidebar + Content Column ────────────────────── */}
      <div className="app-body">

        {/* ── Modern SaaS Sidebar (full height) ───────────────────── */}
        <aside className={`sidebar${mini ? ' sidebar--mini' : ' sidebar--full'}`}>

          {/* ── Brand / Company Name Header (Logo Removed) ── */}
          <div className="sidebar__brand" style={{ justifyContent: mini ? 'center' : 'space-between', padding: mini ? '0 8px' : '0 14px' }}>
            {!mini && (
              <div className="sidebar__brand-text">
                <span className="sidebar__brand-name">{tenant?.name || 'Alpha Financial Services Ltd'}</span>
                {user?.branchName && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', color: '#94A3B8', fontWeight: 500, marginTop: 2 }}>
                    <MapPin style={{ width: 10, height: 10 }} />
                    {user.branchName}
                  </span>
                )}
              </div>
            )}
            <button
              id="sidebar-collapse-btn"
              className="sidebar__collapse-btn"
              onClick={toggleCollapse}
              title={mini ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{ margin: mini ? '0 auto' : '0' }}
            >
              {mini
                ? <PanelLeftOpen style={{ width: 15, height: 15 }} />
                : <PanelLeftClose style={{ width: 15, height: 15 }} />
              }
            </button>
          </div>

          {/* ── Sidebar Search Box ── */}
          {!mini && (
            <div className="sidebar__search">
              <Search className="sidebar__search-icon" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={sidebarSearch}
                onChange={(e) => {
                  setSidebarSearch(e.target.value);
                  if (e.target.value.trim()) {
                    setLoansExpanded(true);
                    setFinanceExpanded(true);
                    setSettingsExpanded(true);
                  }
                }}
              />
              {sidebarSearch && (
                <button
                  type="button"
                  className="sidebar__search-clear"
                  onClick={() => setSidebarSearch('')}
                  title="Clear Search"
                >
                  <X style={{ width: 12, height: 12 }} />
                </button>
              )}
            </div>
          )}

          {/* Scrollable Nav Area */}
          <div className="sidebar__scroll thin-scroll">

            {sq && !hasAnyMatches && !mini ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.75rem' }}>
                No menu items match "{sidebarSearch}"
              </div>
            ) : (
              <>
                {/* ── WORKSPACE ── */}
                {hasWorkspaceMatches && (
                  <>
                    {!mini && <div className="sidebar__section-label">WORKSPACE</div>}
                    <nav className="sidebar__nav">

                      {match('Dashboard') && (
                        <button
                          id="nav-dashboard"
                          className={itemCls(activeTab === 'dashboard')}
                          onClick={() => setActiveTab('dashboard')}
                          title="Dashboard"
                        >
                          <PieChart className="sidebar__item-icon" />
                          {!mini && <span className="sidebar__label">Dashboard</span>}
                        </button>
                      )}

                    </nav>
                  </>
                )}

                {/* ── FINANCE OPERATIONS ── */}
                {hasLoanMatches && (
                  <>
                    {!mini && <div className="sidebar__section-label">FINANCE OPERATIONS</div>}
                    <nav className="sidebar__nav">

                      {!mini ? (
                        <>
                          <button
                            id="nav-loans-toggle"
                            className="sidebar__item sidebar__item--accordion"
                            onClick={() => setLoansExpanded(v => !v)}
                          >
                            <div className="sidebar__item-left">
                              <Wallet className="sidebar__item-icon" />
                              <span className="sidebar__label">Customer Loans</span>
                            </div>
                            <ChevronDown className={`sidebar__chevron${loansExpanded ? ' sidebar__chevron--open' : ''}`} />
                          </button>

                          {loansExpanded && (
                            <div className="sidebar__children">
                              {match('Loan Applications') && (
                                <button id="nav-loan-apps"
                                  className={subCls(isLoan('loan-applications'))}
                                  onClick={() => setActiveTab('loan-management/loan-applications')}
                                >
                                  <Clock className="sidebar__sub-icon" />
                                  <span>Loan Applications</span>
                                </button>
                              )}
                              {match('Active Loans') && (
                                <button id="nav-active-loans"
                                  className={subCls(isLoan('active-loans'))}
                                  onClick={() => setActiveTab('loan-management/active-loans')}
                                >
                                  <FileText className="sidebar__sub-icon" />
                                  <span>Active Loans</span>
                                </button>
                              )}
                              {match('Collections') && (
                                <button id="nav-collections"
                                  className={subCls(isLoan('collections'))}
                                  onClick={() => setActiveTab('loan-management/collections')}
                                >
                                  <Banknote className="sidebar__sub-icon" />
                                  <span>Collections</span>
                                </button>
                              )}
                              {match('Closed Loans') && (
                                <button id="nav-closed-loans"
                                  className={subCls(isLoan('closed-loans'))}
                                  onClick={() => setActiveTab('loan-management/closed-loans')}
                                >
                                  <Archive className="sidebar__sub-icon" />
                                  <span>Closed Loans</span>
                                </button>
                              )}
                              {match('Receipts') && (
                                <button id="nav-receipts"
                                  className={subCls(isLoan('receipts'))}
                                  onClick={() => setActiveTab('loan-management/receipts')}
                                >
                                  <Receipt className="sidebar__sub-icon" />
                                  <span>Receipts</span>
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        /* Collapsed Icon Bar for Customer Loans */
                        <>
                          <button
                            className={itemCls(isLoan('loan-applications'))}
                            onClick={() => setActiveTab('loan-management/loan-applications')}
                            title="Loan Applications"
                          >
                            <Clock className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isLoan('active-loans'))}
                            onClick={() => setActiveTab('loan-management/active-loans')}
                            title="Active Loans"
                          >
                            <FileText className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isLoan('collections'))}
                            onClick={() => setActiveTab('loan-management/collections')}
                            title="Collections"
                          >
                            <Banknote className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isLoan('closed-loans'))}
                            onClick={() => setActiveTab('loan-management/closed-loans')}
                            title="Closed Loans"
                          >
                            <Archive className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isLoan('receipts'))}
                            onClick={() => setActiveTab('loan-management/receipts')}
                            title="Receipts"
                          >
                            <Receipt className="sidebar__item-icon" />
                          </button>
                        </>
                      )}

                      {match('Investor Capital') && (
                        <button
                          id="nav-investor-capital"
                          className={itemCls(activeTab === 'investor-capital')}
                          onClick={() => setActiveTab('investor-capital')}
                          title="Investor Capital"
                        >
                          <Wallet className="sidebar__item-icon" />
                          {!mini && <span className="sidebar__label">Investor Capital</span>}
                        </button>
                      )}

                      {match('Fixed Deposits') && (
                        <button
                          id="nav-fixed-deposits"
                          className={itemCls(activeTab === 'fixed-deposits')}
                          onClick={() => setActiveTab('fixed-deposits')}
                          title="Fixed Deposits"
                        >
                          <Banknote className="sidebar__item-icon" />
                          {!mini && <span className="sidebar__label">Fixed Deposits</span>}
                        </button>
                      )}
                    </nav>
                  </>
                )}

                {/* ── FINANCIALS ── */}
                {hasFinanceMatches && (
                  <>
                    {!mini && <div className="sidebar__section-label">FINANCIALS</div>}
                    <nav className="sidebar__nav">

                      {!mini ? (
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
                            <ChevronDown className={`sidebar__chevron${financeExpanded ? ' sidebar__chevron--open' : ''}`} />
                          </button>

                          {financeExpanded && (
                            <div className="sidebar__children">
                              {match('Cash Book') && (
                                <button id="nav-cash-book"
                                  className={subCls(isFin('cash-book'))}
                                  onClick={() => setActiveTab('finance-accounting/cash-book')}
                                >
                                  <Book className="sidebar__sub-icon" />
                                  <span>Cash Book</span>
                                </button>
                              )}
                              {match('General Ledger') && (
                                <button id="nav-gen-ledger"
                                  className={subCls(isFin('general-ledger'))}
                                  onClick={() => setActiveTab('finance-accounting/general-ledger')}
                                >
                                  <Layers className="sidebar__sub-icon" />
                                  <span>General Ledger</span>
                                </button>
                              )}
                              {match('Expense Vouchers') && (
                                <button id="nav-expenses"
                                  className={subCls(isFin('expenses'))}
                                  onClick={() => setActiveTab('finance-accounting/expenses')}
                                >
                                  <CreditCard className="sidebar__sub-icon" />
                                  <span>Expense Vouchers</span>
                                </button>
                              )}
                              {match('Income Statement') && (
                                <button id="nav-income"
                                  className={subCls(isFin('income-statement') || isFin('pnl'))}
                                  onClick={() => setActiveTab('finance-accounting/income-statement')}
                                >
                                  <TrendingUp className="sidebar__sub-icon" />
                                  <span>Income Statement</span>
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        /* Collapsed Icon Bar for Financials */
                        <>
                          <button
                            className={itemCls(isFin('cash-book'))}
                            onClick={() => setActiveTab('finance-accounting/cash-book')}
                            title="Cash Book"
                          >
                            <Book className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isFin('general-ledger'))}
                            onClick={() => setActiveTab('finance-accounting/general-ledger')}
                            title="General Ledger"
                          >
                            <Layers className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isFin('expenses'))}
                            onClick={() => setActiveTab('finance-accounting/expenses')}
                            title="Expense Vouchers"
                          >
                            <CreditCard className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isFin('income-statement') || isFin('pnl'))}
                            onClick={() => setActiveTab('finance-accounting/income-statement')}
                            title="Income Statement"
                          >
                            <TrendingUp className="sidebar__item-icon" />
                          </button>
                        </>
                      )}
                    </nav>
                  </>
                )}

                {/* ── SYSTEM ── */}
                {hasSettingsMatches && (
                  <>
                    {!mini && <div className="sidebar__section-label">SYSTEM</div>}
                    <nav className="sidebar__nav">

                      {!mini ? (
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
                            <ChevronDown className={`sidebar__chevron${settingsExpanded ? ' sidebar__chevron--open' : ''}`} />
                          </button>

                          {settingsExpanded && (
                            <div className="sidebar__children">
                              {match('Organization & Company') && (
                                <button id="nav-org-hierarchy"
                                  className={subCls(isSet('org-hierarchy') || isSet('company-info'))}
                                  onClick={() => setActiveTab('master-settings/org-hierarchy')}
                                >
                                  <Building2 className="sidebar__sub-icon" />
                                  <span>Organization & Company</span>
                                </button>
                              )}
                              {match('Staff Directory') && (
                                <button id="nav-staff"
                                  className={subCls(isSet('staff-directory') || activeTab === 'employees')}
                                  onClick={() => setActiveTab('master-settings/staff-directory')}
                                >
                                  <UserCog className="sidebar__sub-icon" />
                                  <span>Staff Directory</span>
                                </button>
                              )}
                              {match('RBAC Matrix') && (
                                <button id="nav-rbac"
                                  className={subCls(isSet('rbac-matrix'))}
                                  onClick={() => setActiveTab('master-settings/rbac-matrix')}
                                >
                                  <Shield className="sidebar__sub-icon" />
                                  <span>RBAC Matrix</span>
                                </button>
                              )}
                              {match('Customer Directory') && (
                                <button id="nav-customer-details"
                                  className={subCls(isSet('customer-details'))}
                                  onClick={() => setActiveTab('master-settings/customer-details')}
                                >
                                  <Users className="sidebar__sub-icon" />
                                  <span>Customer Directory</span>
                                </button>
                              )}
                              {match('Loan Scheme Master') && (
                                <button id="nav-interest-details"
                                  className={subCls(isSet('interest-details') || isSet('interest-master'))}
                                  onClick={() => setActiveTab('master-settings/interest-details')}
                                >
                                  <Percent className="sidebar__sub-icon" />
                                  <span>Loan Scheme Master</span>
                                </button>
                              )}
                              {match('Accounting Masters') && (
                                <button id="nav-accounting-masters"
                                  className={subCls(isSet('accounting-masters'))}
                                  onClick={() => setActiveTab('master-settings/accounting-masters')}
                                >
                                  <Layers className="sidebar__sub-icon" />
                                  <span>Accounting Masters</span>
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        /* Collapsed Icon Bar for Master Settings */
                        <>
                          <button
                            className={itemCls(isSet('org-hierarchy') || isSet('company-info'))}
                            onClick={() => setActiveTab('master-settings/org-hierarchy')}
                            title="Organization & Company"
                          >
                            <Building2 className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isSet('staff-directory') || activeTab === 'employees')}
                            onClick={() => setActiveTab('master-settings/staff-directory')}
                            title="Staff Directory"
                          >
                            <UserCog className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isSet('rbac-matrix'))}
                            onClick={() => setActiveTab('master-settings/rbac-matrix')}
                            title="RBAC Matrix"
                          >
                            <Shield className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isSet('customer-details'))}
                            onClick={() => setActiveTab('master-settings/customer-details')}
                            title="Customer Directory"
                          >
                            <Users className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isSet('interest-master'))}
                            onClick={() => setActiveTab('master-settings/interest-master')}
                            title="Loan Scheme Master"
                          >
                            <Percent className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isSet('accounting-masters'))}
                            onClick={() => setActiveTab('master-settings/accounting-masters')}
                            title="Accounting Masters"
                          >
                            <Layers className="sidebar__item-icon" />
                          </button>
                        </>
                      )}
                    </nav>
                  </>
                )}
              </>
            )}

          </div>

          {/* Sidebar Footer: User Badge */}
          <div className="sidebar__footer">
            <div className="sidebar__user-badge">
              <div className="sidebar__avatar">{getInitials(user?.name || 'Admin')}</div>
              {!mini && (
                <div className="sidebar__user-info">
                  <div className="sidebar__user-name">{user?.name || 'John Admin'}</div>
                  <div className="sidebar__user-role">{user?.role || 'ADMIN'}</div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Right Column: Topbar + Workspace ──────────────────── */}
        <div className="app-content">

          {/* ── Topbar (scoped to right of sidebar) ─────────────── */}
          <header className="app-header">
            <div className="app-header__left">
              {/* Page context can go here if needed */}
            </div>

            {/* User Profile Control */}
            <div className="app-header__right" ref={dropdownRef}>
              <button className="app-header__notification-btn" title="Notifications">
                <Bell style={{ width: 16, height: 16 }} />
              </button>

              <button
                id="user-menu-btn"
                className="app-header__user-btn"
                onClick={() => setUserDropdownOpen(v => !v)}
              >
                <div className="app-header__user-avatar">{getInitials(user?.name || 'Admin')}</div>
                <div className="app-header__user-info">
                  <span className="app-header__user-name">{user?.name || 'John Admin'}</span>
                  <span className="app-header__user-role">{user?.role || 'ADMIN'}</span>
                </div>
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
                    onClick={() => { setUserDropdownOpen(false); setIsConfirmLogoutOpen(true); }}
                  >
                    <LogOut />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* ── Workspace ─────────────────────────────────────────── */}
          <main className="app-workspace thin-scroll">
            {children}
          </main>
        </div>
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
                    { id: 'cp-new', label: 'New Password', key: 'newPassword' },
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

      {/* ── Confirm Logout Modal (Ultra-Modern SaaS Theme) ─────────── */}
      {isConfirmLogoutOpen && (
        <div
          className="saas-modal-backdrop"
          style={{
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsConfirmLogoutOpen(false); }}
        >
          <div
            className="saas-modal-card"
            style={{
              maxWidth: 430,
              width: '90%',
              borderRadius: 20,
              padding: '28px 24px 24px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.22)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative',
              gap: 16
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsConfirmLogoutOpen(false)}
              className="close-btn"
              type="button"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                border: 'none',
                background: '#F1F5F9',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                cursor: 'pointer'
              }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>

            {/* Centered Glowing Hero Badge */}
            <div style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: '#FEF2F2',
              border: '1px solid #FEE2E2',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 8px rgba(254, 226, 226, 0.55)'
            }}>
              <LogOut style={{ width: 26, height: 26, marginLeft: 2 }} />
            </div>

            {/* Title & Subtitle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              <h3 style={{ fontSize: '1.18rem', fontWeight: 600, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>
                Sign Out of Finance ERP?
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: 0, fontWeight: 400, lineHeight: 1.45 }}>
                Are you sure you want to end your active session? Any unsaved entries will be saved to your tenant account.
              </p>
            </div>

            {/* User Session Profile Strip */}
            <div style={{
              width: '100%',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 14,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}>
                  {getInitials(user?.name || 'Admin')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>
                    {user?.name || 'John Admin'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 400 }}>
                    {user?.email || 'admin@alpha.com'}
                  </span>
                </div>
              </div>
              <span style={{
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: '0.68rem',
                fontWeight: 600,
                background: '#F3E8FF',
                color: '#7C3AED',
                border: '1px solid #E9D5FF'
              }}>
                {user?.role || 'ADMIN'}
              </span>
            </div>

            {/* 50/50 Action Buttons */}
            <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setIsConfirmLogoutOpen(false)}
                style={{
                  flex: 1,
                  height: 42,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#334155',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  borderRadius: 12,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmLogoutOpen(false);
                  onSignOut();
                }}
                style={{
                  flex: 1,
                  height: 42,
                  border: 'none',
                  background: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  borderRadius: 12,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.32)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <LogOut style={{ width: 15, height: 15 }} />
                <span>Yes, Sign Out</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
