import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Layers,
  CreditCard,
  Percent,
  UserCog,
  Shield,
  Building2,
  Bell,
  Search,
  MapPin,
  Languages,
  Scale,
  PenLine,
  Calculator,
  FileBarChart2,
  TrendingUp,
  TrendingDown,
  Repeat,
  Landmark,
  Lock,
  RotateCw,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import ThemeCustomizerDrawer from '../components/ThemeCustomizerDrawer';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function AppLayout({
  activeTab,
  setActiveTab,
  tenant,
  user,
  onSignOut,
  children,
  branchesList = [],
  selectedBranch = 'ALL',
  onChangeBranch,
  onSaveTheme,
  onRefresh,
  isRefreshing = false
}) {
  const { language, setLanguage, t } = useLanguage();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [ledgerExpanded, setLedgerExpanded] = useState(false);
  const [vouchersExpanded, setVouchersExpanded] = useState(false);
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isChangePwOpen, setIsChangePwOpen] = useState(false);
  const [isConfirmLogoutOpen, setIsConfirmLogoutOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSuccess, setPwSuccess] = useState(false);

  // Global branch lock control — the ONE place the app-wide branch is changed.
  // Every other page's own branch filter just reads `selectedBranch` and disables
  // itself once it's anything other than 'ALL'.
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [pendingBranch, setPendingBranch] = useState(null);
  const branchDropdownRef = useRef(null);

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target)) {
        setBranchDropdownOpen(false);
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
  const isReport = (key) => activeTab === `reports/${key}` || activeTab === key;
  const isSet = (key) => activeTab === `master-settings/${key}` || activeTab === key;

  const toggleCollapse = () => {
    if (!sidebarCollapsed) {
      setLedgerExpanded(false);
      setVouchersExpanded(false);
      setReportsExpanded(false);
      setSettingsExpanded(false);
    }
    setSidebarCollapsed(prev => !prev);
  };

  const mini = sidebarCollapsed;

  // Search filtering logic
  const sq = sidebarSearch.toLowerCase().trim();
  const match = (title) => !sq || title.toLowerCase().includes(sq);

  // SuperAdmin per-tenant "page allocation" — read live tenant.allowed_modules or fallback to user.allowedModules
  const effectiveAllowedModules = tenant?.allowed_modules !== undefined 
    ? tenant.allowed_modules 
    : (user?.allowedModules ?? null);

  const allowed = (moduleKey) => !effectiveAllowedModules || effectiveAllowedModules.includes(moduleKey);

  // Employee-level granular RBAC permission check (reads user.permissions loaded on login)
  const can = (moduleName, action = 'VIEW') => {
    if (!user || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'COMPANY_ADMIN') {
      return true;
    }
    if (!user.permissions || !Array.isArray(user.permissions)) {
      return true;
    }
    const found = user.permissions.find(
      p => String(p.module).toUpperCase() === String(moduleName).toUpperCase() &&
           String(p.action).toUpperCase() === String(action).toUpperCase()
    );
    return found ? Boolean(found.allowed) : true;
  };

  // Branch permissions (RBAC)
  const canSwitchBranch = can('ORG', 'SWITCH_BRANCH');
  const canViewAllBranches = can('ORG', 'VIEW_ALL_BRANCHES');

  // Available branches list based on user's RBAC permissions
  const availableBranches = useMemo(() => {
    const list = [];
    if (canViewAllBranches) {
      list.push('ALL');
    }
    if (!canSwitchBranch) {
      // If user cannot switch branches, lock down to assigned branch
      const assigned = user?.branch || user?.branch_name || user?.branchName || selectedBranch || branchesList[0]?.name || 'Main Branch';
      if (!list.includes(assigned)) {
        list.push(assigned);
      }
      return list;
    }
    // If can switch branches, include all operational branches
    (branchesList || []).forEach(b => {
      if (b?.name && !list.includes(b.name)) list.push(b.name);
    });
    return list;
  }, [canSwitchBranch, canViewAllBranches, branchesList, user, selectedBranch]);

  // If user cannot view all branches and currently on 'ALL', auto switch to assigned branch
  useEffect(() => {
    if (!canViewAllBranches && selectedBranch === 'ALL') {
      const fallback = user?.branch || user?.branch_name || user?.branchName || branchesList[0]?.name || 'Main Branch';
      onChangeBranch?.(fallback);
    }
  }, [canViewAllBranches, selectedBranch, user, branchesList, onChangeBranch]);

  const hasWorkspaceMatches = match('Dashboard') && allowed('dashboard') && can('DASHBOARD', 'VIEW');
  const hasLoanMatches = (match('Loans') || match('Active Loans') || match('Loan Applications') || match('Closed Loans') || match('Collections') || match('Fixed Deposits') || match('Recurring Deposits') || match('Customer Directory'))
    && ((allowed('loans') && can('LOANS', 'VIEW')) || (allowed('collections') && can('COLLECTIONS', 'VIEW')) || (allowed('fixed_deposits') && can('FIXED_DEPOSITS', 'VIEW')) || (allowed('recurring_deposits') && can('RECURRING_DEPOSITS', 'VIEW')) || (allowed('borrowers') && can('BORROWERS', 'VIEW')));
  const hasFinanceMatches = (match('Ledger') || match('General Ledger') || match('Loan Ledger') || match('Customer Ledger') || match('Trial Balance') || match('Vouchers') || match('Auto Vouchers') || match('Manual Vouchers') || match('Day-End Closing')) && (allowed('accounting') || allowed('ledger') || allowed('vouchers') || allowed('trial_balance') || allowed('eod_process')) && can('LEDGER', 'VIEW');
  const hasReportsMatches = (match('Reports') || match('Loan Portfolio') || match('Collections Report') || match('Borrower') || match('KYC') || match('Investor Capital Report') || match('Fixed Deposits Report') || match('Recurring Deposits Report') || match('Financial Statements') || match('Staff Performance')) && allowed('reports') && can('REPORTS', 'VIEW');
  const hasSettingsMatches = (match('Master Settings') || match('Loan Scheme Master') || match('Organization & Company') || match('Expense Allocation') || match('Staff Directory') || match('RBAC Matrix') || match('Investor') || match('Investors') || match('Investor Master') || match('Investor Capital') || match('Chart of Accounts') || match('Bank Accounts')) && (allowed('org') || allowed('employees') || allowed('rbac') || allowed('loan_schemes') || allowed('expense_allocation') || allowed('investors')) && (can('ORG', 'VIEW') || can('EMPLOYEES', 'VIEW') || can('SCHEMES', 'VIEW') || can('INVESTORS', 'VIEW'));

  const hasAnyMatches = hasWorkspaceMatches || hasLoanMatches || hasFinanceMatches || hasReportsMatches || hasSettingsMatches;

  return (
    <div className="app-shell">

      {/* ── App Body: Sidebar + Content Column ────────────────────── */}
      <div className="app-body">

        {/* ── Modern SaaS Sidebar (full height) ───────────────────── */}
        <aside className={`sidebar${mini ? ' sidebar--mini' : ' sidebar--full'}`}>

          {/* ── Sidebar Top Header: Module Name ── */}
          <div className="sidebar__brand" style={{ justifyContent: mini ? 'center' : 'space-between', padding: mini ? '0 8px' : '0 14px' }}>
            {!mini && (
              <div className="sidebar__brand-text">
                <span className="sidebar__brand-name" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  Financial ERP System
                </span>
              </div>
            )}
            <button
              id="sidebar-collapse-btn"
              className="sidebar__collapse-btn"
              onClick={toggleCollapse}
              title={mini ? t('sidebar.expand') : t('sidebar.collapse')}
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
                placeholder={t('sidebar.search_placeholder')}
                value={sidebarSearch}
                onChange={(e) => {
                  setSidebarSearch(e.target.value);
                  if (e.target.value.trim()) {
                    setLedgerExpanded(true);
                    setVouchersExpanded(true);
                    setReportsExpanded(true);
                    setSettingsExpanded(true);
                  }
                }}
              />
              {sidebarSearch && (
                <button
                  type="button"
                  className="sidebar__search-clear"
                  onClick={() => setSidebarSearch('')}
                  title={t('sidebar.search_clear')}
                >
                  <X style={{ width: 12, height: 12 }} />
                </button>
              )}
            </div>
          )}

          {/* ── Global Branch Lock ── */}
          {!mini && (
            <div ref={branchDropdownRef} className="sidebar__branch">
              <button
                type="button"
                className={`sidebar__branch-btn${selectedBranch !== 'ALL' ? ' sidebar__branch-btn--locked' : ''}${(!canSwitchBranch && !canViewAllBranches) ? ' sidebar__branch-btn--disabled' : ''}`}
                onClick={() => {
                  if (canSwitchBranch || canViewAllBranches) {
                    setBranchDropdownOpen(v => !v);
                  }
                }}
                title={(!canSwitchBranch && !canViewAllBranches) ? 'Branch locked by security policy' : 'Switch Active Branch'}
                style={(!canSwitchBranch && !canViewAllBranches) ? { cursor: 'default', opacity: 0.9 } : {}}
              >
                <span className="sidebar__branch-left">
                  {(!canSwitchBranch && !canViewAllBranches) ? (
                    <Lock className="sidebar__branch-icon" style={{ width: 13, height: 13, color: '#94A3B8' }} />
                  ) : (
                    <MapPin className="sidebar__branch-icon" />
                  )}
                  <span className="sidebar__branch-label">
                    {selectedBranch === 'ALL' ? 'All Branches' : selectedBranch}
                  </span>
                </span>
                {(canSwitchBranch || canViewAllBranches) && (
                  <ChevronDown className="sidebar__branch-chevron" />
                )}
              </button>

              {branchDropdownOpen && (canSwitchBranch || canViewAllBranches) && (
                <div className="sidebar__branch-dropdown">
                  {availableBranches.map((name) => {
                    const isAll = name === 'ALL';
                    const isCurrent = selectedBranch === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        className={`sidebar__branch-option${isCurrent ? ' sidebar__branch-option--current' : ''}`}
                        onClick={() => {
                          setBranchDropdownOpen(false);
                          if (isCurrent) return;
                          setPendingBranch(name);
                        }}
                      >
                        {isAll ? 'All Branches' : name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Scrollable Nav Area */}
          <div className="sidebar__scroll thin-scroll">

            {sq && !hasAnyMatches && !mini ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.75rem' }}>
                {t('sidebar.no_matches')} "{sidebarSearch}"
              </div>
            ) : (
              <>
                {/* ── WORKSPACE ── */}
                {hasWorkspaceMatches && (
                  <>
                    {!mini && <div className="sidebar__section-label">{t('section.workspace')}</div>}
                    <nav className="sidebar__nav">

                      {match('Dashboard') && allowed('dashboard') && (
                        <button
                          id="nav-dashboard"
                          className={itemCls(activeTab === 'dashboard')}
                          onClick={() => setActiveTab('dashboard')}
                          title={t('nav.dashboard')}
                        >
                          <PieChart className="sidebar__item-icon" />
                          {!mini && <span className="sidebar__label">{t('nav.dashboard')}</span>}
                        </button>
                      )}

                    </nav>
                  </>
                )}

                {/* ── FINANCE OPERATIONS ── */}
                {hasLoanMatches && (
                  <>
                    {!mini && <div className="sidebar__section-label">{t('section.finance_operations')}</div>}
                    <nav className="sidebar__nav">

                      {(match('Loans') || match('Active Loans') || match('Closed Loans') || match('Loan Applications') || match('Loan Register') || match('Loans Register')) && allowed('loans') && can('LOANS', 'VIEW') && (
                        <button id="nav-active-loans"
                          className={itemCls(isLoan('active-loans') || isLoan('closed-loans') || isLoan('loans-register') || isLoan('loan-applications'))}
                          onClick={() => setActiveTab('loan-management/loans-register')}
                          title={t('nav.loans')}
                        >
                          <FileText className="sidebar__item-icon" />
                          {!mini && <span className="sidebar__label">{t('nav.loans')}</span>}
                        </button>
                      )}

                      {(match('Estimation') || match('Calculator') || match('Quotation') || match('Loan Estimator')) && allowed('loans') && can('LOANS', 'VIEW') && (
                        <button id="nav-estimation"
                          className={itemCls(isLoan('estimation') || activeTab === 'estimation')}
                          onClick={() => setActiveTab('loan-management/estimation')}
                          title={t('nav.estimation')}
                        >
                          <Calculator className="sidebar__item-icon" />
                          {!mini && <span className="sidebar__label">{t('nav.estimation')}</span>}
                        </button>
                      )}


                      {match('Collections') && allowed('loans') && can('COLLECTIONS', 'VIEW') && (
                        <button id="nav-collections"
                          className={itemCls(isLoan('collections'))}
                          onClick={() => setActiveTab('loan-management/collections')}
                          title={t('nav.collections')}
                        >
                          <Banknote className="sidebar__item-icon" />
                          {!mini && <span className="sidebar__label">{t('nav.collections')}</span>}
                        </button>
                      )}

                      {match('Fixed Deposits') && allowed('fixed_deposits') && can('FIXED_DEPOSITS', 'VIEW') && (
                        <button
                          id="nav-fixed-deposits"
                          className={itemCls(activeTab === 'fixed-deposits')}
                          onClick={() => setActiveTab('fixed-deposits')}
                          title={t('nav.fixed_deposits')}
                        >
                          <Banknote className="sidebar__item-icon" />
                          {!mini && <span className="sidebar__label">{t('nav.fixed_deposits')}</span>}
                        </button>
                      )}

                      {match('Recurring Deposits') && allowed('recurring_deposits') && can('RECURRING_DEPOSITS', 'VIEW') && (
                        <button
                          id="nav-recurring-deposits"
                          className={itemCls(activeTab === 'recurring-deposits')}
                          onClick={() => setActiveTab('recurring-deposits')}
                          title={t('nav.recurring_deposits')}
                        >
                          <Repeat className="sidebar__item-icon" />
                          {!mini && <span className="sidebar__label">{t('nav.recurring_deposits')}</span>}
                        </button>
                      )}

                      {match('Customer Directory') && allowed('borrowers') && can('BORROWERS', 'VIEW') && (
                        <button
                          id="nav-customer-details"
                          className={itemCls(activeTab === 'customer-details' || isSet('customer-details') || isFin('customer-details'))}
                          onClick={() => setActiveTab('customer-details')}
                          title={t('nav.customer_directory')}
                        >
                          <Users className="sidebar__item-icon" />
                          {!mini && <span className="sidebar__label">{t('nav.customer_directory')}</span>}
                        </button>
                      )}
                    </nav>
                  </>
                )}

                {/* ── FINANCIALS ── */}
                {hasFinanceMatches && (
                  <>
                    {!mini && <div className="sidebar__section-label">{t('section.financials')}</div>}
                    <nav className="sidebar__nav">

                      {!mini ? (
                        <>
                          {(match('Ledger') || match('General Ledger') || match('Loan Ledger') || match('Customer Ledger')) && (
                            <>
                              <button
                                id="nav-ledger-toggle"
                                className="sidebar__item sidebar__item--accordion"
                                onClick={() => setLedgerExpanded(v => !v)}
                              >
                                <div className="sidebar__item-left">
                                  <BookOpen className="sidebar__item-icon" />
                                  <span className="sidebar__label">{t('nav.ledger')}</span>
                                </div>
                                <ChevronDown className={`sidebar__chevron${ledgerExpanded ? ' sidebar__chevron--open' : ''}`} />
                              </button>

                              {ledgerExpanded && (
                                <div className="sidebar__children">
                                  {match('General Ledger') && (
                                    <button id="nav-gen-ledger"
                                      className={subCls(isFin('general-ledger'))}
                                      onClick={() => setActiveTab('finance-accounting/general-ledger')}
                                    >
                                      <Layers className="sidebar__sub-icon" />
                                      <span>{t('nav.general_ledger')}</span>
                                    </button>
                                  )}
                                  {match('Loan Ledger') && (
                                    <button id="nav-loan-ledger"
                                      className={subCls(isFin('loan-ledger'))}
                                      onClick={() => setActiveTab('finance-accounting/loan-ledger')}
                                    >
                                      <FileText className="sidebar__sub-icon" />
                                      <span>{t('nav.loan_ledger')}</span>
                                    </button>
                                  )}
                                  {match('Customer Ledger') && (
                                    <button id="nav-customer-ledger"
                                      className={subCls(isFin('customer-ledger'))}
                                      onClick={() => setActiveTab('finance-accounting/customer-ledger')}
                                    >
                                      <Users className="sidebar__sub-icon" />
                                      <span>{t('nav.customer_ledger')}</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </>
                          )}

                          {match('Trial Balance') && (
                            <button id="nav-trial-balance"
                              className={itemCls(isFin('trial-balance'))}
                              onClick={() => setActiveTab('finance-accounting/trial-balance')}
                              title={t('nav.trial_balance')}
                            >
                              <Scale className="sidebar__item-icon" />
                              <span className="sidebar__label">{t('nav.trial_balance')}</span>
                            </button>
                          )}

                          {match('Day-End Closing') && (
                            <button id="nav-eod-process"
                              className={itemCls(isFin('eod-process'))}
                              onClick={() => setActiveTab('finance-accounting/eod-process')}
                              title={t('nav.eod_process')}
                            >
                              <Calculator className="sidebar__item-icon" />
                              <span className="sidebar__label">{t('nav.eod_process')}</span>
                            </button>
                          )}

                          <button
                            id="nav-branch-expenses"
                            className={itemCls(activeTab === 'branch-expenses' || activeTab === 'finance/expenses')}
                            onClick={() => setActiveTab('branch-expenses')}
                            title="Branch Expenses"
                          >
                            <Wallet className="sidebar__item-icon" />
                            <span className="sidebar__label">Expenses</span>
                          </button>

                          {(match('Vouchers') || match('Auto Vouchers') || match('Manual Vouchers')) && (
                            <>
                              <button
                                id="nav-vouchers-toggle"
                                className="sidebar__item sidebar__item--accordion"
                                onClick={() => setVouchersExpanded(v => !v)}
                              >
                                <div className="sidebar__item-left">
                                  <CreditCard className="sidebar__item-icon" />
                                  <span className="sidebar__label">{t('nav.vouchers')}</span>
                                </div>
                                <ChevronDown className={`sidebar__chevron${vouchersExpanded ? ' sidebar__chevron--open' : ''}`} />
                              </button>

                              {vouchersExpanded && (
                                <div className="sidebar__children">
                                  {match('Auto Vouchers') && (
                                    <button id="nav-auto-vouchers"
                                      className={subCls(isFin('auto-vouchers'))}
                                      onClick={() => setActiveTab('finance-accounting/auto-vouchers')}
                                    >
                                      <CreditCard className="sidebar__sub-icon" />
                                      <span>{t('nav.auto_vouchers')}</span>
                                    </button>
                                  )}
                                  {match('Manual Vouchers') && (
                                    <button id="nav-manual-vouchers"
                                      className={subCls(isFin('manual-vouchers'))}
                                      onClick={() => setActiveTab('finance-accounting/manual-vouchers')}
                                    >
                                      <PenLine className="sidebar__sub-icon" />
                                      <span>{t('nav.manual_vouchers')}</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        /* Collapsed Icon Bar for Financials */
                        <>
                          <button
                            className={itemCls(isFin('general-ledger'))}
                            onClick={() => setActiveTab('finance-accounting/general-ledger')}
                            title={t('nav.general_ledger')}
                          >
                            <Layers className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isFin('loan-ledger'))}
                            onClick={() => setActiveTab('finance-accounting/loan-ledger')}
                            title={t('nav.loan_ledger')}
                          >
                            <FileText className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isFin('customer-ledger'))}
                            onClick={() => setActiveTab('finance-accounting/customer-ledger')}
                            title={t('nav.customer_ledger')}
                          >
                            <Users className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isFin('customer-details') || isSet('customer-details'))}
                            onClick={() => setActiveTab('finance-accounting/customer-details')}
                            title={t('nav.customer_directory')}
                          >
                            <Users className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isFin('trial-balance'))}
                            onClick={() => setActiveTab('finance-accounting/trial-balance')}
                            title={t('nav.trial_balance')}
                          >
                            <Scale className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isFin('eod-process'))}
                            onClick={() => setActiveTab('finance-accounting/eod-process')}
                            title={t('nav.eod_process')}
                          >
                            <Calculator className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isFin('auto-vouchers'))}
                            onClick={() => setActiveTab('finance-accounting/auto-vouchers')}
                            title={t('nav.auto_vouchers')}
                          >
                            <CreditCard className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isFin('manual-vouchers'))}
                            onClick={() => setActiveTab('finance-accounting/manual-vouchers')}
                            title={t('nav.manual_vouchers')}
                          >
                            <PenLine className="sidebar__item-icon" />
                          </button>
                        </>
                      )}
                    </nav>
                  </>
                )}

                {/* ── REPORTS ── */}
                {hasReportsMatches && (
                  <>
                    {!mini && <div className="sidebar__section-label">{t('section.reports')}</div>}
                    <nav className="sidebar__nav">

                      {!mini ? (
                        <>
                          <button
                            id="nav-reports-toggle"
                            className="sidebar__item sidebar__item--accordion"
                            onClick={() => setReportsExpanded(v => !v)}
                          >
                            <div className="sidebar__item-left">
                              <FileBarChart2 className="sidebar__item-icon" />
                              <span className="sidebar__label">{t('nav.reports')}</span>
                            </div>
                            <ChevronDown className={`sidebar__chevron${reportsExpanded ? ' sidebar__chevron--open' : ''}`} />
                          </button>

                          {reportsExpanded && (
                            <div className="sidebar__children">
                              {match('Loan Portfolio') && (
                                <button id="nav-loan-portfolio-report"
                                  className={subCls(isReport('loan-portfolio'))}
                                  onClick={() => setActiveTab('reports/loan-portfolio')}
                                >
                                  <FileText className="sidebar__sub-icon" />
                                  <span>{t('nav.loan_portfolio_report')}</span>
                                </button>
                              )}
                              {match('Collections Report') && (
                                <button id="nav-collections-report"
                                  className={subCls(isReport('collections'))}
                                  onClick={() => setActiveTab('reports/collections')}
                                >
                                  <Banknote className="sidebar__sub-icon" />
                                  <span>{t('nav.collections_report')}</span>
                                </button>
                              )}
                              {match('Investor Capital Report') && (
                                <button id="nav-investor-capital-report"
                                  className={subCls(isReport('investor-capital'))}
                                  onClick={() => setActiveTab('reports/investor-capital')}
                                >
                                  <Wallet className="sidebar__sub-icon" />
                                  <span>{t('nav.investor_capital_report')}</span>
                                </button>
                              )}
                              {match('Fixed Deposits Report') && (
                                <button id="nav-fixed-deposit-report"
                                  className={subCls(isReport('fixed-deposits'))}
                                  onClick={() => setActiveTab('reports/fixed-deposits')}
                                >
                                  <Banknote className="sidebar__sub-icon" />
                                  <span>{t('nav.fixed_deposit_report')}</span>
                                </button>
                              )}
                              {match('Recurring Deposits Report') && (
                                <button id="nav-recurring-deposit-report"
                                  className={subCls(isReport('recurring-deposits'))}
                                  onClick={() => setActiveTab('reports/recurring-deposits')}
                                >
                                  <Repeat className="sidebar__sub-icon" />
                                  <span>{t('nav.recurring_deposit_report')}</span>
                                </button>
                              )}
                              {match('Financial Statements') && (
                                <button id="nav-financial-statements-report"
                                  className={subCls(isReport('financial-statements'))}
                                  onClick={() => setActiveTab('reports/financial-statements')}
                                >
                                  <TrendingUp className="sidebar__sub-icon" />
                                  <span>{t('nav.financial_statements_report')}</span>
                                </button>
                              )}
                              {match('Staff Performance') && (
                                <button id="nav-staff-performance-report"
                                  className={subCls(isReport('staff-performance'))}
                                  onClick={() => setActiveTab('reports/staff-performance')}
                                >
                                  <UserCog className="sidebar__sub-icon" />
                                  <span>{t('nav.staff_performance_report')}</span>
                                </button>
                              )}
                              {match('Expense Report') && (
                                <button id="nav-expenses-report"
                                  className={subCls(isReport('expenses') || isReport('expense'))}
                                  onClick={() => setActiveTab('reports/expenses')}
                                >
                                  <TrendingDown className="sidebar__sub-icon" />
                                  <span>{t('nav.expense_report') || 'Expense Report'}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        /* Collapsed Icon Bar for Reports */
                        <>
                          <button
                            className={itemCls(isReport('loan-portfolio'))}
                            onClick={() => setActiveTab('reports/loan-portfolio')}
                            title={t('nav.loan_portfolio_report')}
                          >
                            <FileText className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isReport('collections'))}
                            onClick={() => setActiveTab('reports/collections')}
                            title={t('nav.collections_report')}
                          >
                            <Banknote className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isReport('investor-capital'))}
                            onClick={() => setActiveTab('reports/investor-capital')}
                            title={t('nav.investor_capital_report')}
                          >
                            <Wallet className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isReport('fixed-deposits'))}
                            onClick={() => setActiveTab('reports/fixed-deposits')}
                            title={t('nav.fixed_deposit_report')}
                          >
                            <Banknote className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isReport('recurring-deposits'))}
                            onClick={() => setActiveTab('reports/recurring-deposits')}
                            title={t('nav.recurring_deposit_report')}
                          >
                            <Repeat className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isReport('financial-statements'))}
                            onClick={() => setActiveTab('reports/financial-statements')}
                            title={t('nav.financial_statements_report')}
                          >
                            <TrendingUp className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isReport('staff-performance'))}
                            onClick={() => setActiveTab('reports/staff-performance')}
                            title={t('nav.staff_performance_report')}
                          >
                            <UserCog className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isReport('expenses') || isReport('expense'))}
                            onClick={() => setActiveTab('reports/expenses')}
                            title={t('nav.expense_report') || 'Expense Report'}
                          >
                            <TrendingDown className="sidebar__item-icon" />
                          </button>
                        </>
                      )}
                    </nav>
                  </>
                )}

                {/* ── SYSTEM ── */}
                {hasSettingsMatches && (
                  <>
                    {!mini && <div className="sidebar__section-label">{t('section.system')}</div>}
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
                              <span className="sidebar__label">{t('nav.master_settings')}</span>
                            </div>
                            <ChevronDown className={`sidebar__chevron${settingsExpanded ? ' sidebar__chevron--open' : ''}`} />
                          </button>

                          {settingsExpanded && (
                            <div className="sidebar__children">
                              {match('Organization & Company') && allowed('org') && (
                                <button id="nav-org-hierarchy"
                                  className={subCls(isSet('org-hierarchy') || isSet('company-info'))}
                                  onClick={() => setActiveTab('master-settings/org-hierarchy')}
                                >
                                  <Building2 className="sidebar__sub-icon" />
                                  <span>{t('nav.org_company')}</span>
                                </button>
                              )}
                              {match('Staff Directory') && allowed('employees') && (
                                <button id="nav-staff"
                                  className={subCls(isSet('staff-directory') || activeTab === 'employees')}
                                  onClick={() => setActiveTab('master-settings/staff-directory')}
                                >
                                  <UserCog className="sidebar__sub-icon" />
                                  <span>{t('nav.staff_directory')}</span>
                                </button>
                              )}
                              {match('RBAC Matrix') && allowed('rbac') && (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN') && (
                                <button id="nav-rbac"
                                  className={subCls(isSet('rbac-matrix'))}
                                  onClick={() => setActiveTab('master-settings/rbac-matrix')}
                                >
                                  <Shield className="sidebar__sub-icon" />
                                  <span>{t('nav.rbac_matrix')}</span>
                                </button>
                              )}
                              {match('Loan Scheme Master') && allowed('loan_schemes') && (
                                <button id="nav-interest-details"
                                  className={subCls(isSet('interest-details') || isSet('interest-master'))}
                                  onClick={() => setActiveTab('master-settings/interest-details')}
                                >
                                  <Percent className="sidebar__sub-icon" />
                                  <span>{t('nav.loan_scheme_master')}</span>
                                </button>
                              )}
                              {match('Expense Allocation') && allowed('expense_allocation') && (
                                <button id="nav-accounting-masters"
                                  className={subCls(isSet('accounting-masters'))}
                                  onClick={() => setActiveTab('master-settings/accounting-masters')}
                                >
                                  <Wallet className="sidebar__sub-icon" />
                                  <span>{t('nav.expense_allocation')}</span>
                                </button>
                              )}
                              {(match('Investor') || match('Investors') || match('Investor Master') || match('Investor Capital')) && allowed('investors') && (
                                <button id="nav-investor-master"
                                  className={subCls(isSet('investor-master') || isSet('investors') || isSet('investor-capital') || activeTab === 'investor-capital')}
                                  onClick={() => setActiveTab('master-settings/investor-master')}
                                >
                                  <Wallet className="sidebar__sub-icon" />
                                  <span>{t('nav.investor_master')}</span>
                                </button>
                              )}
                              <button id="nav-chart-of-accounts"
                                className={subCls(isSet('chart-of-accounts'))}
                                onClick={() => setActiveTab('master-settings/chart-of-accounts')}
                              >
                                <BookOpen className="sidebar__sub-icon" />
                                <span>Chart of Accounts</span>
                              </button>
                              <button id="nav-bank-accounts"
                                className={subCls(isSet('bank-accounts') || isSet('banking-master'))}
                                onClick={() => setActiveTab('master-settings/bank-accounts')}
                              >
                                <Landmark className="sidebar__sub-icon" />
                                <span>Bank Accounts</span>
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        /* Collapsed Icon Bar for Master Settings */
                        <>
                          {allowed('org') && (
                            <button
                              className={itemCls(isSet('org-hierarchy') || isSet('company-info'))}
                              onClick={() => setActiveTab('master-settings/org-hierarchy')}
                              title={t('nav.org_company')}
                            >
                              <Building2 className="sidebar__item-icon" />
                            </button>
                          )}
                          {allowed('employees') && (
                            <button
                              className={itemCls(isSet('staff-directory') || activeTab === 'employees')}
                              onClick={() => setActiveTab('master-settings/staff-directory')}
                              title={t('nav.staff_directory')}
                            >
                              <UserCog className="sidebar__item-icon" />
                            </button>
                          )}
                          {allowed('rbac') && (
                            <button
                              className={itemCls(isSet('rbac-matrix'))}
                              onClick={() => setActiveTab('master-settings/rbac-matrix')}
                              title={t('nav.rbac_matrix')}
                            >
                              <Shield className="sidebar__item-icon" />
                            </button>
                          )}
                          {allowed('loan_schemes') && (
                            <button
                              className={itemCls(isSet('interest-master'))}
                              onClick={() => setActiveTab('master-settings/interest-master')}
                              title={t('nav.loan_scheme_master')}
                            >
                              <Percent className="sidebar__item-icon" />
                            </button>
                          )}
                          {allowed('expense_allocation') && (
                            <button
                              className={itemCls(isSet('accounting-masters'))}
                              onClick={() => setActiveTab('master-settings/accounting-masters')}
                              title={t('nav.expense_allocation')}
                            >
                              <Wallet className="sidebar__item-icon" />
                            </button>
                          )}
                          {allowed('investors') && (
                            <button
                              className={itemCls(isSet('investor-master') || isSet('investors') || isSet('investor-capital') || activeTab === 'investor-capital')}
                              onClick={() => setActiveTab('master-settings/investor-master')}
                              title={t('nav.investor_master')}
                            >
                              <Wallet className="sidebar__item-icon" />
                            </button>
                          )}
                          <button
                            className={itemCls(isSet('bank-accounts') || isSet('banking-master'))}
                            onClick={() => setActiveTab('master-settings/bank-accounts')}
                            title="Bank Accounts"
                          >
                            <Landmark className="sidebar__item-icon" />
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
              {/* Plain Text Company Name on Far Left Edge of Topbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                {tenant?.logo ? (
                  <img
                    src={tenant.logo}
                    alt=""
                    style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)' }}
                  />
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand-primary, #15803D) 0%, var(--brand-primary-hover, #0E5327) 100%)', color: '#FFFFFF', fontSize: '0.65rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(var(--brand-primary-rgb), 0.2)' }}>
                    {getInitials(tenant?.name || 'Company')}
                  </div>
                )}
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1E293B', letterSpacing: '-0.01em' }}>
                  {tenant?.name || 'Company'}
                </span>
              </div>
            </div>

            {/* Topbar Right: Language Switcher, Bell, User Profile */}
            <div className="app-header__right" ref={dropdownRef} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Language Switcher */}
              <div className="app-header__lang-switch" role="group" aria-label={t('topbar.language')} title={t('topbar.language')}>
                <Languages style={{ width: 13, height: 13, color: '#94A3B8', marginRight: 2 }} />
                <button
                  type="button"
                  className={`app-header__lang-btn${language === 'en' ? ' app-header__lang-btn--active' : ''}`}
                  onClick={() => setLanguage('en')}
                >
                  EN
                </button>
                <button
                  type="button"
                  className={`app-header__lang-btn${language === 'ta' ? ' app-header__lang-btn--active' : ''}`}
                  onClick={() => setLanguage('ta')}
                >
                  தமிழ்
                </button>
              </div>

              {/* Refresh Live Data Button */}
              {onRefresh && (
                <button
                  type="button"
                  className="app-header__notification-btn"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  title="Fetch Latest Data"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isRefreshing ? 'wait' : 'pointer'
                  }}
                >
                  <RotateCw style={{
                    width: 15,
                    height: 15,
                    animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none'
                  }} />
                </button>
              )}

              <button className="app-header__notification-btn" title={t('topbar.notifications')}>
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
                    <span>{t('topbar.change_password')}</span>
                  </button>
                  <button
                    id="sign-out-btn"
                    className="app-header__dropdown-item app-header__dropdown-item--danger"
                    onClick={() => { setUserDropdownOpen(false); setIsConfirmLogoutOpen(true); }}
                  >
                    <LogOut />
                    <span>{t('topbar.sign_out')}</span>
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
              <h3>{t('modal.change_password_title')}</h3>
              <button className="modal-close-btn" onClick={() => setIsChangePwOpen(false)}>
                <X />
              </button>
            </div>

            {pwSuccess ? (
              <div className="modal-success" style={{ margin: '1.5rem' }}>
                ✓ {t('success.password_updated')}
              </div>
            ) : (
              <form onSubmit={handlePwSubmit}>
                <div className="change-pw-body">
                  {[
                    { id: 'cp-curr', label: t('field.current_password'), key: 'currentPassword' },
                    { id: 'cp-new', label: t('field.new_password'), key: 'newPassword' },
                    { id: 'cp-conf', label: t('field.confirm_password'), key: 'confirmPassword' },
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
                    {t('btn.cancel')}
                  </button>
                  <button type="submit" className="btn btn--primary btn--sm">
                    {t('btn.save_password')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Confirm Logout Modal ─────────── */}
      {isConfirmLogoutOpen && (
        <div
          className="saas-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setIsConfirmLogoutOpen(false); }}
        >
          <div className="saas-modal-card" style={{ maxWidth: 400 }}>
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: 'var(--color-danger-light, #FEF2F2)', borderColor: 'var(--color-danger-border, #FECACA)', color: 'var(--color-danger, #DC2626)' }}>
                  <LogOut style={{ width: 16, height: 16 }} />
                </div>
                <div className="head-titles">
                  <h3>{t('modal.logout_title')}</h3>
                  <p>{user?.name || 'Admin'} · {user?.role || 'ADMIN'}</p>
                </div>
              </div>
              <button onClick={() => setIsConfirmLogoutOpen(false)} className="close-btn" type="button">
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div className="saas-modal-body">
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0, lineHeight: 1.5 }}>
                {t('modal.logout_subtitle')}
              </p>
            </div>

            <div className="saas-modal-footer">
              <button type="button" onClick={() => setIsConfirmLogoutOpen(false)} className="btn-cancel">
                {t('btn.cancel')}
              </button>
              <button
                type="button"
                onClick={() => { setIsConfirmLogoutOpen(false); onSignOut(); }}
                className="btn-submit"
                style={{ background: 'var(--color-danger, #DC2626)', boxShadow: '0 2px 6px rgba(var(--color-danger-rgb), 0.3)' }}
              >
                {t('btn.yes_sign_out')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Branch Change Modal ─────────── */}
      {pendingBranch !== null && (
        <div
          className="saas-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setPendingBranch(null); }}
        >
          <div className="saas-modal-card" style={{ maxWidth: 420 }}>
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: 'var(--brand-primary-light, #F0FEF5)', borderColor: 'var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)' }}>
                  <MapPin style={{ width: 16, height: 16 }} />
                </div>
                <div className="head-titles">
                  <h3>Change Branch?</h3>
                  <p>{pendingBranch === 'ALL' ? 'Return to viewing all branches' : pendingBranch}</p>
                </div>
              </div>
              <button onClick={() => setPendingBranch(null)} className="close-btn" type="button">
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div className="saas-modal-footer">
              <button type="button" onClick={() => setPendingBranch(null)} className="btn-cancel">
                {t('btn.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const branchToApply = pendingBranch;
                  localStorage.setItem('financial_erp_selected_branch', branchToApply);
                  onChangeBranch?.(branchToApply);
                  setPendingBranch(null);
                  window.location.reload();
                }}
                className="btn-submit"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dynamic Floating Theme Customizer Drawer ─────────────────── */}
      <ThemeCustomizerDrawer tenant={tenant} user={user} onSaveTheme={onSaveTheme} />
    </div>
  );
}
