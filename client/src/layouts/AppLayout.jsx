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
  History,
  Scale,
  PenLine,
  Calculator,
  FileBarChart2,
  TrendingUp,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function AppLayout({ activeTab, setActiveTab, tenant, user, onSignOut, children }) {
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

  const hasWorkspaceMatches = match('Dashboard');
  const hasLoanMatches = match('Loans') || match('Active Loans') || match('Loan Applications') || match('Closed Loans') || match('Collections') || match('Investor Capital') || match('Fixed Deposits') || match('Customer Directory');
  const hasFinanceMatches = match('Ledger') || match('General Ledger') || match('Loan Ledger') || match('Customer Ledger') || match('Trial Balance') || match('Vouchers') || match('Auto Vouchers') || match('Manual Vouchers') || match('Day-End Closing');
  const hasReportsMatches = match('Reports') || match('Loan Portfolio') || match('Collections Report') || match('Borrower') || match('KYC') || match('Investor Capital Report') || match('Fixed Deposits Report') || match('Financial Statements') || match('Staff Performance');
  const hasSettingsMatches = match('Master Settings') || match('Loan Scheme Master') || match('Organization & Company') || match('Expense Allocation') || match('Staff Directory') || match('RBAC Matrix') || match('Audit Log');

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

                      {match('Dashboard') && (
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

                      {(match('Loans') || match('Active Loans') || match('Closed Loans') || match('Loan Register') || match('Loans Register')) && (
                        <button id="nav-active-loans"
                          className={itemCls(isLoan('active-loans') || isLoan('closed-loans') || isLoan('loans-register'))}
                          onClick={() => setActiveTab('loan-management/active-loans')}
                          title={t('nav.loans')}
                        >
                          <FileText className="sidebar__item-icon" />
                          {!mini && <span className="sidebar__label">{t('nav.loans')}</span>}
                        </button>
                      )}

                      {match('Loan Applications') && (
                        <button id="nav-loan-applications"
                          className={itemCls(isLoan('loan-applications'))}
                          onClick={() => setActiveTab('loan-management/loan-applications')}
                          title={t('nav.loan_applications')}
                        >
                          <Clock className="sidebar__item-icon" />
                          {!mini && <span className="sidebar__label">{t('nav.loan_applications')}</span>}
                        </button>
                      )}

                      {match('Collections') && (
                        <button id="nav-collections"
                          className={itemCls(isLoan('collections'))}
                          onClick={() => setActiveTab('loan-management/collections')}
                          title={t('nav.collections')}
                        >
                          <Banknote className="sidebar__item-icon" />
                          {!mini && <span className="sidebar__label">{t('nav.collections')}</span>}
                        </button>
                      )}

                      {match('Investor Capital') && (
                        <button
                          id="nav-investor-capital"
                          className={itemCls(activeTab === 'investor-capital')}
                          onClick={() => setActiveTab('investor-capital')}
                          title={t('nav.investor_capital')}
                        >
                          <Wallet className="sidebar__item-icon" />
                          {!mini && <span className="sidebar__label">{t('nav.investor_capital')}</span>}
                        </button>
                      )}

                      {match('Fixed Deposits') && (
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

                      {match('Customer Directory') && (
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
                              {(match('Borrower') || match('KYC')) && (
                                <button id="nav-borrower-kyc-report"
                                  className={subCls(isReport('borrower-kyc'))}
                                  onClick={() => setActiveTab('reports/borrower-kyc')}
                                >
                                  <Users className="sidebar__sub-icon" />
                                  <span>{t('nav.borrower_kyc_report')}</span>
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
                            className={itemCls(isReport('borrower-kyc'))}
                            onClick={() => setActiveTab('reports/borrower-kyc')}
                            title={t('nav.borrower_kyc_report')}
                          >
                            <Users className="sidebar__item-icon" />
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
                              {match('Organization & Company') && (
                                <button id="nav-org-hierarchy"
                                  className={subCls(isSet('org-hierarchy') || isSet('company-info'))}
                                  onClick={() => setActiveTab('master-settings/org-hierarchy')}
                                >
                                  <Building2 className="sidebar__sub-icon" />
                                  <span>{t('nav.org_company')}</span>
                                </button>
                              )}
                              {match('Staff Directory') && (
                                <button id="nav-staff"
                                  className={subCls(isSet('staff-directory') || activeTab === 'employees')}
                                  onClick={() => setActiveTab('master-settings/staff-directory')}
                                >
                                  <UserCog className="sidebar__sub-icon" />
                                  <span>{t('nav.staff_directory')}</span>
                                </button>
                              )}
                              {match('RBAC Matrix') && (
                                <button id="nav-rbac"
                                  className={subCls(isSet('rbac-matrix'))}
                                  onClick={() => setActiveTab('master-settings/rbac-matrix')}
                                >
                                  <Shield className="sidebar__sub-icon" />
                                  <span>{t('nav.rbac_matrix')}</span>
                                </button>
                              )}
                              {match('Audit Log') && (
                                <button id="nav-audit-log"
                                  className={subCls(isSet('audit-log'))}
                                  onClick={() => setActiveTab('master-settings/audit-log')}
                                >
                                  <History className="sidebar__sub-icon" />
                                  <span>{t('nav.audit_log')}</span>
                                </button>
                              )}
                              {match('Loan Scheme Master') && (
                                <button id="nav-interest-details"
                                  className={subCls(isSet('interest-details') || isSet('interest-master'))}
                                  onClick={() => setActiveTab('master-settings/interest-details')}
                                >
                                  <Percent className="sidebar__sub-icon" />
                                  <span>{t('nav.loan_scheme_master')}</span>
                                </button>
                              )}
                              {match('Expense Allocation') && (
                                <button id="nav-accounting-masters"
                                  className={subCls(isSet('accounting-masters'))}
                                  onClick={() => setActiveTab('master-settings/accounting-masters')}
                                >
                                  <Wallet className="sidebar__sub-icon" />
                                  <span>{t('nav.expense_allocation')}</span>
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
                            title={t('nav.org_company')}
                          >
                            <Building2 className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isSet('staff-directory') || activeTab === 'employees')}
                            onClick={() => setActiveTab('master-settings/staff-directory')}
                            title={t('nav.staff_directory')}
                          >
                            <UserCog className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isSet('rbac-matrix'))}
                            onClick={() => setActiveTab('master-settings/rbac-matrix')}
                            title={t('nav.rbac_matrix')}
                          >
                            <Shield className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isSet('audit-log'))}
                            onClick={() => setActiveTab('master-settings/audit-log')}
                            title={t('nav.audit_log')}
                          >
                            <History className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isSet('interest-master'))}
                            onClick={() => setActiveTab('master-settings/interest-master')}
                            title={t('nav.loan_scheme_master')}
                          >
                            <Percent className="sidebar__item-icon" />
                          </button>
                          <button
                            className={itemCls(isSet('accounting-masters'))}
                            onClick={() => setActiveTab('master-settings/accounting-masters')}
                            title={t('nav.expense_allocation')}
                          >
                            <Wallet className="sidebar__item-icon" />
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
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#FFFFFF', fontSize: '0.65rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)' }}>
                  {getInitials(tenant?.name || 'Alpha Financial Services Ltd')}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1E293B', letterSpacing: '-0.01em' }}>
                  {tenant?.name || 'Alpha Financial Services Ltd'}
                </span>
                {user?.branchName && (
                  <span style={{ fontSize: '0.72rem', color: '#64748B', background: '#F1F5F9', padding: '2px 8px', borderRadius: 12, fontWeight: 400 }}>
                    {user.branchName}
                  </span>
                )}
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
                {t('modal.logout_title')}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: 0, fontWeight: 400, lineHeight: 1.45 }}>
                {t('modal.logout_subtitle')}
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
                {t('btn.cancel')}
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
                <span>{t('btn.yes_sign_out')}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
