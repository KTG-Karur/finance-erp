import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield, Check, Save, ChevronDown, ChevronRight, Search,
  PieChart, FileText, Banknote, Repeat, Users, BookOpen,
  Calculator, Wallet, CreditCard, FileBarChart2, Building2,
  UserCog, Percent, Landmark, CheckSquare, Square, RefreshCw,
  SlidersHorizontal, ArrowRight, Eye, Plus, Pencil, Trash2,
  CheckCircle2, AlertCircle, ChevronsDown, ChevronsUp, Folder,
  FolderOpen
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import SharedDropdown from './common/SharedDropdown';

// ── Complete Menu, Submenu & Page Permission Hierarchy ────────────────────────
export const RBAC_MENU_SECTIONS = [
  {
    id: 'WORKSPACE',
    title: 'Workspace',
    badge: 'Overview',
    icon: PieChart,
    menus: [
      {
        id: 'DASHBOARD',
        module: 'DASHBOARD',
        title: 'Executive Dashboard',
        icon: PieChart,
        route: '/dashboard',
        description: 'Portfolio overview, live disbursement summaries, collection trends, and executive KPIs',
        submenus: [
          {
            id: 'dashboard_overview',
            title: 'Executive Overview & KPI Cards',
            route: '/dashboard',
            description: 'Financial dashboard cards, active portfolio totals, overdue metrics, and visual analytics',
            actions: [
              { action: 'VIEW', label: 'View Dashboard & KPIs', desc: 'Access executive portfolio statistics & summaries', icon: Eye },
              { action: 'ANALYTICS', label: 'View Advanced Analytics', desc: 'Inspect charts, trends & scheme distribution graphs', icon: Eye }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'FINANCE_OPERATIONS',
    title: 'Finance Operations',
    badge: 'Core Operations',
    icon: Banknote,
    menus: [
      {
        id: 'LOANS',
        module: 'LOANS',
        title: 'Loans Management',
        icon: FileText,
        route: '/loan-management/loans-register',
        description: 'Complete loan lifecycle: applications underwriting, active/closed registers, direct disbursals',
        submenus: [
          {
            id: 'loans_register',
            title: 'Loans Register (Active & Closed)',
            route: '/loan-management/loans-register',
            description: 'Browse active loans, detailed repayment schedules, borrower account folios, and loan closure',
            actions: [
              { action: 'VIEW', label: 'View Loans Register', desc: 'Browse all active, closed, and overdue loans', icon: Eye },
              { action: 'CREATE', label: 'Direct Disburse Loan', desc: 'Directly disburse new loans to borrowers', icon: Plus },
              { action: 'APPROVE', label: 'Approve / Change Status', desc: 'Sanction loans, update account state, or foreclose', icon: CheckCircle2 },
              { action: 'EDIT', label: 'Edit Loan Terms', desc: 'Modify loan parameters, interest rates, or tenure', icon: Pencil },
              { action: 'DELETE', label: 'Delete / Void Loan', desc: 'Remove void or erroneous loan records', icon: Trash2 }
            ]
          },
          {
            id: 'loan_applications',
            title: 'Loan Applications',
            route: '/loan-management/loan-applications',
            description: 'Intake and underwriting workflow for new borrower loan applications',
            actions: [
              { action: 'VIEW', label: 'View Applications', desc: 'Review pending loan applications', icon: Eye },
              { action: 'CREATE', label: 'Submit Application', desc: 'Submit new loan application for verification', icon: Plus },
              { action: 'APPROVE', label: 'Sanction / Reject', desc: 'Underwrite and sanction or reject applications', icon: CheckCircle2 }
            ]
          },
          {
            id: 'loan_estimation',
            title: 'Estimation & Calculator',
            route: '/loan-management/estimation',
            description: 'Interest calculation simulator and printable customer loan quotations',
            actions: [
              { action: 'VIEW', label: 'Use Calculator & Quotations', desc: 'Calculate loan estimates & print quotation slips', icon: Eye }
            ]
          }
        ]
      },
      {
        id: 'COLLECTIONS',
        module: 'COLLECTIONS',
        title: 'Daily Collections & Receipts',
        icon: Banknote,
        route: '/loan-management/collections',
        description: 'Field and counter installment collections, instant receipts, and cheque clearances',
        submenus: [
          {
            id: 'daily_collections',
            title: 'Daily Collections Register & Entry',
            route: '/loan-management/collections',
            description: 'Record loan repayments, print instant receipts, and manage collection entries',
            actions: [
              { action: 'VIEW', label: 'View Collections Register', desc: 'Browse collections log & due installments list', icon: Eye },
              { action: 'COLLECT', label: 'Record Collections', desc: 'Collect cash, UPI, and cheque installment payments', icon: Plus },
              { action: 'REVERT', label: 'Revert / Correct Collection', desc: 'Revert or edit erroneous payment entries', icon: RefreshCw }
            ]
          }
        ]
      },
      {
        id: 'FIXED_DEPOSITS',
        module: 'FIXED_DEPOSITS',
        title: 'Fixed Deposits (FD)',
        icon: Banknote,
        route: '/fixed-deposits',
        description: 'Fixed term deposit accounts, periodic interest payouts, and maturity settlements',
        submenus: [
          {
            id: 'fd_portfolio',
            title: 'Fixed Deposits Portfolio',
            route: '/fixed-deposits',
            description: 'Manage active customer fixed deposits, payout status, and maturity settlements',
            actions: [
              { action: 'VIEW', label: 'View FD Portfolio', desc: 'Browse active & matured fixed deposits', icon: Eye },
              { action: 'CREATE', label: 'Open New FD', desc: 'Open new fixed deposit account for customer', icon: Plus },
              { action: 'PAY_INTEREST', label: 'Pay Monthly Interest', desc: 'Execute periodic interest payouts', icon: CheckCircle2 },
              { action: 'MATURE', label: 'Process Maturity', desc: 'Settle and payout matured fixed deposit principal', icon: CheckCircle2 },
              { action: 'CLOSE', label: 'Premature Close', desc: 'Process early FD closure with penalty calculation', icon: Trash2 }
            ]
          }
        ]
      },
      {
        id: 'RECURRING_DEPOSITS',
        module: 'RECURRING_DEPOSITS',
        title: 'Recurring Deposits (RD)',
        icon: Repeat,
        route: '/recurring-deposits',
        description: 'Monthly recurring deposit accounts, installment logs, and maturity payouts',
        submenus: [
          {
            id: 'rd_portfolio',
            title: 'Recurring Deposits Portfolio',
            route: '/recurring-deposits',
            description: 'Track recurring monthly deposits, installment dues, and maturity settlements',
            actions: [
              { action: 'VIEW', label: 'View RD Portfolio', desc: 'Browse active & matured recurring deposits', icon: Eye },
              { action: 'CREATE', label: 'Open New RD', desc: 'Open new recurring deposit account', icon: Plus },
              { action: 'COLLECT', label: 'Collect Installment', desc: 'Collect monthly RD installment payments', icon: Banknote },
              { action: 'MATURE', label: 'Process Maturity', desc: 'Settle and payout matured RD accounts', icon: CheckCircle2 },
              { action: 'CLOSE', label: 'Premature Close', desc: 'Execute early RD account settlement', icon: Trash2 }
            ]
          }
        ]
      },
      {
        id: 'BORROWERS',
        module: 'BORROWERS',
        title: 'Customer Directory',
        icon: Users,
        route: '/customer-details',
        description: 'Borrower KYC onboarding, identity proof uploads, address profiles, and account status',
        submenus: [
          {
            id: 'borrower_directory',
            title: 'Customer KYC & Profiles',
            route: '/customer-details',
            description: 'Comprehensive borrower profiles, identity verification, and loan history',
            actions: [
              { action: 'VIEW', label: 'View Customer Profiles', desc: 'Browse customer list and KYC dossiers', icon: Eye },
              { action: 'CREATE', label: 'Register Customer', desc: 'Onboard new customer with KYC documents', icon: Plus },
              { action: 'EDIT', label: 'Edit Customer Info', desc: 'Update contact details, address & KYC files', icon: Pencil },
              { action: 'DELETE', label: 'Delete Customer', desc: 'Deactivate or delete borrower profile', icon: Trash2 }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'FINANCIALS',
    title: 'Financials & Accounting',
    badge: 'Accounting',
    icon: BookOpen,
    menus: [
      {
        id: 'LEDGER',
        module: 'LEDGER',
        title: 'General Ledger & Ledgers',
        icon: BookOpen,
        route: '/finance-accounting/general-ledger',
        description: 'Double-entry general ledger folios, loan-level ledgers, customer ledgers, and trial balance',
        submenus: [
          {
            id: 'general_ledger',
            title: 'General Ledger (GL)',
            route: '/finance-accounting/general-ledger',
            description: 'Real-time account folios, debit/credit transactions, and running balances',
            actions: [
              { action: 'VIEW', label: 'View General Ledger', desc: 'Inspect GL folios and balance sheets', icon: Eye },
              { action: 'POST', label: 'Post Opening / Adjustments', desc: 'Post manual opening journal entries', icon: Plus }
            ]
          },
          {
            id: 'loan_ledger',
            title: 'Loan Ledger',
            route: '/finance-accounting/loan-ledger',
            description: 'Loan-specific amortization, principal/interest splits, and statement exports',
            actions: [
              { action: 'VIEW', label: 'View Loan Ledgers', desc: 'Inspect loan-specific statement folios', icon: Eye }
            ]
          },
          {
            id: 'customer_ledger',
            title: 'Customer Ledger',
            route: '/finance-accounting/customer-ledger',
            description: 'Borrower consolidated ledger balance and transaction payment history',
            actions: [
              { action: 'VIEW', label: 'View Customer Ledgers', desc: 'Inspect customer summary statement folios', icon: Eye }
            ]
          },
          {
            id: 'trial_balance',
            title: 'Trial Balance',
            route: '/finance-accounting/trial-balance',
            description: 'Multi-level trial balance verification with zero variance assurance',
            actions: [
              { action: 'VIEW', label: 'View Trial Balance', desc: 'Generate real-time trial balance statements', icon: Eye }
            ]
          }
        ]
      },
      {
        id: 'ACCOUNTING',
        module: 'ACCOUNTING',
        title: 'Day-End Closing (EOD)',
        icon: Calculator,
        route: '/finance-accounting/eod-process',
        description: 'Daily cash reconciliation, denomination counts, vault balance lock, and day reopenings',
        submenus: [
          {
            id: 'eod_process',
            title: 'Day-End Closing Operations',
            route: '/finance-accounting/eod-process',
            description: 'Reconcile daily cash collections, record denomination sheets, and close the day',
            actions: [
              { action: 'VIEW', label: 'View EOD Records', desc: 'Access daily closing summaries and denomination logs', icon: Eye },
              { action: 'EDIT', label: 'Close Business Day', desc: 'Submit denomination counts and lock the business day', icon: CheckCircle2 },
              { action: 'REOPEN', label: 'Approve Day Reopen', desc: 'Request or approve reopening a closed business day', icon: RefreshCw }
            ]
          }
        ]
      },
      {
        id: 'EXPENSES',
        module: 'EXPENSES',
        title: 'Branch Expenses',
        icon: Wallet,
        route: '/branch-expenses',
        description: 'Branch expense tracking, category budgets, petty cash allocations, and expense vouchers',
        submenus: [
          {
            id: 'expense_vouchers',
            title: 'Branch Expense Tracking & Allocations',
            route: '/branch-expenses',
            description: 'Issue expense payments, record expense vouchers, and manage allocation requests',
            actions: [
              { action: 'VIEW', label: 'View Expense Folios', desc: 'Inspect branch expense expenditure registers', icon: Eye },
              { action: 'VOUCHER', label: 'Create Expense Voucher', desc: 'Record and approve branch expense payments', icon: Plus },
              { action: 'FUND', label: 'Request / Add Funds', desc: 'Allocate funds to branch petty cash', icon: Banknote },
              { action: 'CREATE', label: 'Create Expense Category', desc: 'Add new expense accounting heads', icon: Plus },
              { action: 'EDIT', label: 'Edit Category Budgets', desc: 'Modify category names and budgets', icon: Pencil },
              { action: 'DELETE', label: 'Delete Categories', desc: 'Remove unused expense categories', icon: Trash2 }
            ]
          }
        ]
      },
      {
        id: 'VOUCHERS',
        module: 'LEDGER',
        title: 'Journal Vouchers',
        icon: CreditCard,
        route: '/finance-accounting/auto-vouchers',
        description: 'Automated double-entry transaction vouchers and manual adjustments',
        submenus: [
          {
            id: 'auto_vouchers',
            title: 'Automated System Vouchers',
            route: '/finance-accounting/auto-vouchers',
            description: 'Audit log of automated vouchers generated by disbursals, collections, and fees',
            actions: [
              { action: 'VIEW', label: 'View Auto Vouchers', desc: 'Inspect automated audit entries', icon: Eye }
            ]
          },
          {
            id: 'manual_vouchers',
            title: 'Manual Journal Vouchers',
            route: '/finance-accounting/manual-vouchers',
            description: 'Create debit/credit manual adjustments, transfer entries, and bank vouchers',
            actions: [
              { action: 'VIEW', label: 'View Manual Vouchers', desc: 'Browse manual journal entries', icon: Eye },
              { action: 'POST', label: 'Create & Post Voucher', desc: 'Record new manual journal vouchers', icon: Plus }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'REPORTS',
    title: 'Reports & Statements',
    badge: 'Reporting',
    icon: FileBarChart2,
    menus: [
      {
        id: 'REPORTS',
        module: 'REPORTS',
        title: 'Financial & Operational Reports',
        icon: FileBarChart2,
        route: '/reports/loan-portfolio',
        description: 'Comprehensive business reports, regulatory exports, performance metrics, and audit statements',
        submenus: [
          {
            id: 'report_portfolio',
            title: 'Loan Portfolio Report',
            route: '/reports/loan-portfolio',
            description: 'Active loan portfolio, overdue aging, risk classification, and scheme splits',
            actions: [
              { action: 'VIEW', label: 'View Portfolio Report', desc: 'Access loan portfolio analytics & filters', icon: Eye },
              { action: 'EXPORT', label: 'Export Portfolio Report', desc: 'Download PDF / Excel statements', icon: ArrowRight }
            ]
          },
          {
            id: 'report_collections',
            title: 'Collections Report',
            route: '/reports/collections',
            description: 'Daily and monthly collection summaries, collector performance, and payment modes',
            actions: [
              { action: 'VIEW', label: 'View Collections Report', desc: 'Access collection breakdown reports', icon: Eye },
              { action: 'EXPORT', label: 'Export Collections Report', desc: 'Download collections registers', icon: ArrowRight }
            ]
          },
          {
            id: 'report_investor',
            title: 'Investor Capital Report',
            route: '/reports/investor-capital',
            description: 'Investor capital holdings, investment schedules, and profit payouts',
            actions: [
              { action: 'VIEW', label: 'View Investor Report', desc: 'Inspect investor capital summaries', icon: Eye },
              { action: 'EXPORT', label: 'Export Investor Report', desc: 'Download investor statements', icon: ArrowRight }
            ]
          },
          {
            id: 'report_deposits',
            title: 'Fixed & Recurring Deposits Reports',
            route: '/reports/fixed-deposits',
            description: 'Deposit scheme balances, maturity forecasts, and monthly interest liabilities',
            actions: [
              { action: 'VIEW', label: 'View Deposits Reports', desc: 'Inspect FD & RD registers', icon: Eye },
              { action: 'EXPORT', label: 'Export Deposits Reports', desc: 'Download deposits registers', icon: ArrowRight }
            ]
          },
          {
            id: 'report_financial_statements',
            title: 'Financial Statements (P&L / Balance Sheet)',
            route: '/reports/financial-statements',
            description: 'Audit-ready Balance Sheet, Profit & Loss Statement, and Trial Balance summaries',
            actions: [
              { action: 'VIEW', label: 'View Financial Statements', desc: 'Inspect official financial statements', icon: Eye },
              { action: 'EXPORT', label: 'Export Financial Statements', desc: 'Download audit-ready PDF/Excel', icon: ArrowRight }
            ]
          },
          {
            id: 'report_staff',
            title: 'Staff Performance Report',
            route: '/reports/staff-performance',
            description: 'Field collector recovery efficiency, daily collection targets, and performance scorecards',
            actions: [
              { action: 'VIEW', label: 'View Staff Performance', desc: 'Inspect employee performance cards', icon: Eye },
              { action: 'EXPORT', label: 'Export Staff Reports', desc: 'Download staff productivity reports', icon: ArrowRight }
            ]
          },
          {
            id: 'report_expenses',
            title: 'Expense Audit Report',
            route: '/reports/expenses',
            description: 'Branch expense category audit, variance analysis, and budget utilization',
            actions: [
              { action: 'VIEW', label: 'View Expense Report', desc: 'Inspect branch expense summaries', icon: Eye },
              { action: 'EXPORT', label: 'Export Expense Report', desc: 'Download expense audit statements', icon: ArrowRight }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'SYSTEM_MASTERS',
    title: 'System & Master Settings',
    badge: 'Masters',
    icon: Building2,
    menus: [
      {
        id: 'ORG',
        module: 'ORG',
        title: 'Organization & Company Profile',
        icon: Building2,
        route: '/master-settings/org-hierarchy',
        description: 'Company identification, corporate address, GSTIN/PAN details, logo, and branch hierarchy',
        submenus: [
          {
            id: 'org_company',
            title: 'Company Profile & Operational Branches',
            route: '/master-settings/org-hierarchy',
            description: 'Manage company information, corporate logo, and create/manage operational branches',
            actions: [
              { action: 'VIEW', label: 'View Org Profile', desc: 'Inspect company and branch details', icon: Eye },
              { action: 'CREATE', label: 'Create New Branch', desc: 'Set up new operating branch locations', icon: Plus },
              { action: 'EDIT', label: 'Edit Profile & Branches', desc: 'Update company info, logo & branch data', icon: Pencil },
              { action: 'DELETE', label: 'Delete Branch', desc: 'Deactivate branch location', icon: Trash2 },
              { action: 'SWITCH_BRANCH', label: 'Switch Working Branch', desc: 'Permission to switch active branch in sidebar & filters', icon: Building2 },
              { action: 'VIEW_ALL_BRANCHES', label: 'View All Branches (Consolidated)', desc: 'Permission to view company-wide "All Branches" data & aggregates', icon: Landmark }
            ]
          }
        ]
      },
      {
        id: 'EMPLOYEES',
        module: 'EMPLOYEES',
        title: 'Staff Directory & Access Control',
        icon: UserCog,
        route: '/master-settings/staff-directory',
        description: 'Staff member onboarding, credential management, branch assignments, and individual RBAC',
        submenus: [
          {
            id: 'staff_directory',
            title: 'Staff Directory Management',
            route: '/master-settings/staff-directory',
            description: 'Manage employee profiles, login accounts, phone/email, and branch access scopes',
            actions: [
              { action: 'VIEW', label: 'View Staff Directory', desc: 'Browse all employee accounts', icon: Eye },
              { action: 'CREATE', label: 'Add Staff Member', desc: 'Onboard staff and generate user IDs', icon: Plus },
              { action: 'EDIT', label: 'Edit Staff Profile', desc: 'Update staff info, role & branches', icon: Pencil },
              { action: 'DELETE', label: 'Delete Staff User', desc: 'Deactivate employee user access', icon: Trash2 },
              { action: 'PERMISSIONS', label: 'Configure Custom RBAC', desc: 'Set employee-specific permission overrides', icon: Shield }
            ]
          }
        ]
      },
      {
        id: 'SCHEMES',
        module: 'SCHEMES',
        title: 'Loan Scheme Master',
        icon: Percent,
        route: '/master-settings/interest-details',
        description: 'Loan products, calculation methods (Flat, Reducing, Daily, Custom Formula), and penalties',
        submenus: [
          {
            id: 'loan_schemes_master',
            title: 'Loan Products & Interest Schemes',
            route: '/master-settings/interest-details',
            description: 'Configure loan schemes, interest rates, tenure rules, documentation fees, and formulas',
            actions: [
              { action: 'VIEW', label: 'View Loan Schemes', desc: 'Browse loan products & formula rules', icon: Eye },
              { action: 'CREATE', label: 'Create Loan Scheme', desc: 'Add new loan product configuration', icon: Plus },
              { action: 'EDIT', label: 'Edit Scheme Parameters', desc: 'Modify rates, fees, or formulas', icon: Pencil },
              { action: 'DELETE', label: 'Delete Loan Scheme', desc: 'Deactivate or delete loan products', icon: Trash2 }
            ]
          }
        ]
      },
      {
        id: 'INVESTORS',
        module: 'INVESTORS',
        title: 'Investor Master',
        icon: Wallet,
        route: '/master-settings/investor-master',
        description: 'Investor registration, capital contribution records, nominee details, and bank accounts',
        submenus: [
          {
            id: 'investor_master_directory',
            title: 'Investor Profiles & Capital Directory',
            route: '/master-settings/investor-master',
            description: 'Manage investor master profiles, initial capital investments, and contact information',
            actions: [
              { action: 'VIEW', label: 'View Investor Master', desc: 'Browse investor master records', icon: Eye },
              { action: 'CREATE', label: 'Register Investor', desc: 'Onboard new investor partner', icon: Plus },
              { action: 'EDIT', label: 'Edit Investor Details', desc: 'Update profile, address & nominee', icon: Pencil },
              { action: 'DELETE', label: 'Delete Investor', desc: 'Remove investor partner record', icon: Trash2 }
            ]
          }
        ]
      },
      {
        id: 'COA_MASTER',
        module: 'LEDGER',
        title: 'Chart of Accounts Master',
        icon: BookOpen,
        route: '/master-settings/chart-of-accounts',
        description: 'Account hierarchy, Asset/Liability/Income/Expense heads, and GL account coding',
        submenus: [
          {
            id: 'chart_of_accounts_master',
            title: 'Chart of Accounts Head Management',
            route: '/master-settings/chart-of-accounts',
            description: 'Define GL account numbers, account descriptions, and primary classification groups',
            actions: [
              { action: 'VIEW', label: 'View COA Master', desc: 'Browse accounting heads tree', icon: Eye },
              { action: 'CREATE', label: 'Create GL Account', desc: 'Add new ledger account code', icon: Plus },
              { action: 'EDIT', label: 'Edit GL Account', desc: 'Modify account title & properties', icon: Pencil },
              { action: 'DELETE', label: 'Delete GL Account', desc: 'Remove unused ledger account', icon: Trash2 }
            ]
          }
        ]
      },
      {
        id: 'BANKING_MASTER',
        module: 'ORG',
        title: 'Bank Accounts Master',
        icon: Landmark,
        route: '/master-settings/bank-accounts',
        description: 'Company bank accounts, IFSC codes, branch links, and opening balances',
        submenus: [
          {
            id: 'bank_accounts_master',
            title: 'Company Bank Accounts Master',
            route: '/master-settings/bank-accounts',
            description: 'Manage organizational bank accounts, branch mappings, and active bank status',
            actions: [
              { action: 'VIEW', label: 'View Bank Accounts', desc: 'Browse company bank accounts', icon: Eye },
              { action: 'CREATE', label: 'Add Bank Account', desc: 'Set up new operating bank account', icon: Plus },
              { action: 'EDIT', label: 'Edit Bank Account', desc: 'Update account number or IFSC', icon: Pencil },
              { action: 'DELETE', label: 'Delete Bank Account', desc: 'Remove bank account record', icon: Trash2 }
            ]
          }
        ]
      }
    ]
  }
];

// Flat list of all unique (module, action) keys present in the hierarchy
function getAllActionKeys() {
  const keys = new Set();
  RBAC_MENU_SECTIONS.forEach(sec => {
    sec.menus.forEach(menu => {
      menu.submenus.forEach(sub => {
        sub.actions.forEach(act => {
          keys.add(`${menu.module}_${act.action}`);
        });
      });
    });
  });
  return Array.from(keys);
}

// Server default when no DB row exists is ALLOW (true)
function allAllowed() {
  const flags = {};
  getAllActionKeys().forEach(k => { flags[k] = true; });
  return flags;
}

function rowsToFlags(rows) {
  const flags = allAllowed();
  (rows || []).forEach(r => {
    flags[`${r.module}_${r.action}`] = Boolean(r.allowed);
  });
  return flags;
}

function flagsToRows(flags) {
  return Object.entries(flags).map(([key, allowed]) => {
    const idx = key.lastIndexOf('_');
    return { module: key.slice(0, idx), action: key.slice(idx + 1), allowed };
  });
}

function useRoles() {
  const { t } = useLanguage();
  return [
    { id: 'ADMIN', name: t('rbac.role.super_admin') || 'System Administrator', desc: 'Full unrestricted system access' },
    { id: 'MANAGER', name: t('rbac.role.manager') || 'Branch Manager', desc: 'Branch operations, approvals & financial management' },
    { id: 'COLLECTOR', name: t('rbac.role.collector') || 'Field Collector Agent', desc: 'Daily field collections & borrower receipts' },
    { id: 'STAFF', name: t('rbac.role.staff') || 'General Staff', desc: 'Data entry, customer inquiries & standard reporting' }
  ];
}

export default function PermissionMatrix({
  initialRole = 'MANAGER',
  selectedStaffMember = null,
  employees = [],
  onSaveStaffPermissions
}) {
  const { t } = useLanguage();
  const ROLES = useRoles();

  const currentRole = selectedStaffMember?.role || initialRole;
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [flags, setFlags] = useState(() => rowsToFlags(selectedStaffMember?.permissions));
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Accordion State:
  // 1. Sections: Expanded by default
  const [expandedSections, setExpandedSections] = useState(() => {
    const initial = {};
    RBAC_MENU_SECTIONS.forEach(sec => { initial[sec.id] = true; });
    return initial;
  });

  // 2. Menus: Expanded by default
  const [expandedMenus, setExpandedMenus] = useState(() => {
    const initial = {};
    RBAC_MENU_SECTIONS.forEach(sec => {
      sec.menus.forEach(menu => { initial[menu.id] = true; });
    });
    return initial;
  });

  // 3. Submenus / Pages: Expanded by default
  const [expandedSubmenus, setExpandedSubmenus] = useState(() => {
    const initial = {};
    RBAC_MENU_SECTIONS.forEach(sec => {
      sec.menus.forEach(menu => {
        menu.submenus.forEach(sub => { initial[sub.id] = true; });
      });
    });
    return initial;
  });

  useEffect(() => {
    setSelectedRole(selectedStaffMember?.role || initialRole);
    setFlags(rowsToFlags(selectedStaffMember?.permissions));
    setSaveError('');
  }, [selectedStaffMember, initialRole]);

  // Toggle single section accordion
  const toggleSectionAccordion = (secId) => {
    setExpandedSections(prev => ({ ...prev, [secId]: !prev[secId] }));
  };

  // Toggle single menu accordion
  const toggleMenuAccordion = (menuId) => {
    setExpandedMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));
  };

  // Toggle single submenu / page accordion
  const toggleSubmenuAccordion = (subId) => {
    setExpandedSubmenus(prev => ({ ...prev, [subId]: !prev[subId] }));
  };

  // Expand / Collapse all tiers (Sections, Menus, and Submenus)
  const handleExpandAll = () => {
    const nextSec = {};
    const nextMenu = {};
    const nextSub = {};
    RBAC_MENU_SECTIONS.forEach(sec => {
      nextSec[sec.id] = true;
      sec.menus.forEach(menu => {
        nextMenu[menu.id] = true;
        menu.submenus.forEach(sub => {
          nextSub[sub.id] = true;
        });
      });
    });
    setExpandedSections(nextSec);
    setExpandedMenus(nextMenu);
    setExpandedSubmenus(nextSub);
  };

  const handleCollapseAll = () => {
    setExpandedSections({});
    setExpandedMenus({});
    setExpandedSubmenus({});
  };

  // Toggle single action flag
  const toggleAction = (moduleName, action) => {
    const key = `${moduleName}_${action}`;
    setFlags(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Toggle all actions in a Submenu / Page
  const toggleSubmenuAll = (moduleName, submenu, grant) => {
    setFlags(prev => {
      const next = { ...prev };
      submenu.actions.forEach(a => {
        next[`${moduleName}_${a.action}`] = grant;
      });
      return next;
    });
  };

  // Toggle all actions in a Menu
  const toggleMenuAll = (menu, grant) => {
    setFlags(prev => {
      const next = { ...prev };
      menu.submenus.forEach(sub => {
        sub.actions.forEach(a => {
          next[`${menu.module}_${a.action}`] = grant;
        });
      });
      return next;
    });
  };

  // Toggle all actions in a Section
  const toggleSectionAll = (section, grant) => {
    setFlags(prev => {
      const next = { ...prev };
      section.menus.forEach(menu => {
        menu.submenus.forEach(sub => {
          sub.actions.forEach(a => {
            next[`${menu.module}_${a.action}`] = grant;
          });
        });
      });
      return next;
    });
  };

  // Global Grant All / Revoke All
  const handleGlobalToggle = (grant) => {
    setFlags(prev => {
      const next = { ...prev };
      getAllActionKeys().forEach(k => { next[k] = grant; });
      return next;
    });
  };

  // Handle Save
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await onSaveStaffPermissions?.(
        selectedStaffMember?.id || null,
        selectedRole,
        flagsToRows(flags)
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setSaveError(err?.response?.data?.message || 'Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  };

  // Filtered menu hierarchy based on search query
  const sq = searchQuery.toLowerCase().trim();
  const filteredSections = useMemo(() => {
    if (!sq) return RBAC_MENU_SECTIONS;
    return RBAC_MENU_SECTIONS.map(sec => {
      const matchingMenus = sec.menus.map(menu => {
        const menuMatch = menu.title.toLowerCase().includes(sq) ||
                          menu.route.toLowerCase().includes(sq) ||
                          menu.description.toLowerCase().includes(sq);

        const matchingSubmenus = menu.submenus.filter(sub => {
          const subMatch = sub.title.toLowerCase().includes(sq) ||
                           sub.route.toLowerCase().includes(sq) ||
                           sub.description.toLowerCase().includes(sq);
          const actMatch = sub.actions.some(a =>
            a.label.toLowerCase().includes(sq) ||
            a.desc.toLowerCase().includes(sq) ||
            a.action.toLowerCase().includes(sq)
          );
          return menuMatch || subMatch || actMatch;
        });

        if (menuMatch || matchingSubmenus.length > 0) {
          return {
            ...menu,
            submenus: matchingSubmenus.length > 0 ? matchingSubmenus : menu.submenus
          };
        }
        return null;
      }).filter(Boolean);

      if (sec.title.toLowerCase().includes(sq) || matchingMenus.length > 0) {
        return {
          ...sec,
          menus: matchingMenus.length > 0 ? matchingMenus : sec.menus
        };
      }
      return null;
    }).filter(Boolean);
  }, [sq]);

  // Summary Metrics
  const allKeys = getAllActionKeys();
  const totalPermissions = allKeys.length;
  const grantedCount = allKeys.filter(k => flags[k]).length;
  const percentGranted = Math.round((grantedCount / (totalPermissions || 1)) * 100);

  const employeeRoleForCount = selectedRole === 'SUPER_ADMIN' ? 'ADMIN' : selectedRole;
  const affectedCount = employees.filter(e => e.role === employeeRoleForCount).length;

  return (
    <div className="rbac-matrix-page" style={{
      maxWidth: 1100,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#0F172A'
    }}>

      {/* ── 1. Top Executive Control Header ────────────────────────── */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }}>
        
        {/* Top Row: Role Switcher + Save Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          {/* Left: Role Switcher & Context */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '6px 12px'
            }}>
              <Shield style={{ width: 18, height: 18, color: 'var(--brand-primary, #15803D)' }} />
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {selectedStaffMember ? 'Staff Target:' : 'Target Role:'}
              </label>

              {selectedStaffMember ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0F172A' }}>
                    {selectedStaffMember.name}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    ({selectedStaffMember.role})
                  </span>
                </div>
              ) : (
                <SharedDropdown
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  size="sm"
                  buttonStyle={{ height: 32, minWidth: 140, fontWeight: 700, border: 'none', background: 'transparent' }}
                  options={ROLES.map(r => ({ value: r.id, label: r.name }))}
                />
              )}
            </div>

            {!selectedStaffMember && (
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 20,
                background: 'var(--brand-primary-light, #F0FEF5)',
                color: 'var(--brand-primary, #15803D)',
                border: '1px solid var(--brand-primary-border, #A3F5C1)'
              }}>
                Applies to {affectedCount} staff user{affectedCount === 1 ? '' : 's'} with {selectedRole} role
              </span>
            )}
          </div>

          {/* Right: Save Actions + Status Notifications */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {saveError && (
              <span style={{ color: 'var(--color-danger, #DC2626)', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle style={{ width: 14, height: 14 }} /> {saveError}
              </span>
            )}
            {savedSuccess && (
              <span style={{ color: 'var(--brand-primary, #15803D)', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check style={{ width: 15, height: 15 }} /> Permissions Saved!
              </span>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                background: saving ? '#94A3B8' : 'var(--brand-primary, #15803D)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                padding: '8px 18px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb), 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <Save style={{ width: 15, height: 15 }} />
              <span>{saving ? 'Saving Changes...' : 'Save Permissions'}</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Search Filter + Bulk Actions Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          paddingTop: 10,
          borderTop: '1px solid #F1F5F9'
        }}>
          
          {/* Quick Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 7,
            padding: '6px 12px',
            width: 280
          }}>
            <Search style={{ width: 15, height: 15, color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search menus, submenus, or actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '0.78rem',
                color: '#0F172A',
                width: '100%'
              }}
            />
          </div>

          {/* Quick Bulk Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Granted Counter Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: '4px 10px',
              borderRadius: 7
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                Granted: <strong style={{ color: 'var(--brand-primary, #15803D)' }}>{grantedCount}</strong> / {totalPermissions} ({percentGranted}%)
              </span>
              <div style={{
                width: 60,
                height: 6,
                borderRadius: 3,
                background: '#E2E8F0',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${percentGranted}%`,
                  height: '100%',
                  background: 'var(--brand-primary, #15803D)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* Expand / Collapse All */}
            <button
              type="button"
              onClick={handleExpandAll}
              style={{
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '5px 9px',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <ChevronsDown style={{ width: 13, height: 13 }} />
              <span>Expand All</span>
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              style={{
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '5px 9px',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <ChevronsUp style={{ width: 13, height: 13 }} />
              <span>Collapse All</span>
            </button>

            {/* Grant / Revoke All */}
            <button
              type="button"
              onClick={() => handleGlobalToggle(true)}
              style={{
                border: '1px solid var(--brand-primary-border, #A3F5C1)',
                background: 'var(--brand-primary-light, #F0FEF5)',
                color: 'var(--brand-primary, #15803D)',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '5px 10px',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              Grant All
            </button>
            <button
              type="button"
              onClick={() => handleGlobalToggle(false)}
              style={{
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#64748B',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '5px 10px',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              Revoke All
            </button>
          </div>

        </div>

      </div>

      {/* ── 2. Hierarchical Sections, Menus & Submenus ──────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredSections.map(section => {
          const SectionIcon = section.icon;
          const isSectionExpanded = Boolean(expandedSections[section.id]);

          // Compute section-level statistics
          const secActionKeys = [];
          section.menus.forEach(m => {
            m.submenus.forEach(s => {
              s.actions.forEach(a => secActionKeys.push(`${m.module}_${a.action}`));
            });
          });
          const secGranted = secActionKeys.filter(k => flags[k]).length;
          const secAllGranted = secActionKeys.length > 0 && secGranted === secActionKeys.length;

          return (
            <div
              key={section.id}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
              }}
            >
              {/* Section Header Strip (Click to Expand / Collapse Section) */}
              <div
                onClick={() => toggleSectionAccordion(section.id)}
                style={{
                  background: '#F8FAFC',
                  borderBottom: isSectionExpanded ? '1px solid #E2E8F0' : 'none',
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                  flexWrap: 'wrap',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {isSectionExpanded ? <ChevronDown style={{ width: 14, height: 14 }} /> : <ChevronRight style={{ width: 14, height: 14 }} />}
                  </div>

                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#0F172A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <SectionIcon style={{ width: 16, height: 16 }} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h2 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
                        {section.title}
                      </h2>
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 600,
                        color: '#64748B',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        padding: '1px 6px',
                        borderRadius: 10
                      }}>
                        {section.menus.length} Menu{section.menus.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                      {secGranted} / {secActionKeys.length} permissions active
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => toggleSectionAll(section, !secAllGranted)}
                    style={{
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: secAllGranted ? '#64748B' : 'var(--brand-primary, #15803D)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    {secAllGranted ? <Square style={{ width: 12, height: 12 }} /> : <CheckSquare style={{ width: 12, height: 12 }} />}
                    <span>{secAllGranted ? 'Deselect Section' : 'Select All in Section'}</span>
                  </button>
                </div>
              </div>

              {/* Section Modules / Menus List */}
              {isSectionExpanded && (
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {section.menus.map(menu => {
                    const MenuIcon = menu.icon;
                    const isMenuExpanded = Boolean(expandedMenus[menu.id]);

                    // Compute Menu-level statistics
                    const menuActionKeys = [];
                    menu.submenus.forEach(s => {
                      s.actions.forEach(a => menuActionKeys.push(`${menu.module}_${a.action}`));
                    });
                    const menuGranted = menuActionKeys.filter(k => flags[k]).length;
                    const menuAllGranted = menuActionKeys.length > 0 && menuGranted === menuActionKeys.length;

                    return (
                      <div
                        key={menu.id}
                        style={{
                          border: '1px solid #E2E8F0',
                          borderRadius: 10,
                          overflow: 'hidden',
                          background: '#FFFFFF',
                          transition: 'border-color 0.15s ease'
                        }}
                      >
                        {/* ── MENU HEADER (Click to Expand / Collapse Menu) ── */}
                        <div
                          onClick={() => toggleMenuAccordion(menu.id)}
                          style={{
                            padding: '12px 16px',
                            background: isMenuExpanded ? '#FAFAFA' : '#FFFFFF',
                            borderBottom: isMenuExpanded ? '1px solid #E2E8F0' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            userSelect: 'none',
                            flexWrap: 'wrap',
                            gap: 10
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 22,
                              height: 22,
                              borderRadius: 4,
                              background: '#F1F5F9',
                              color: '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {isMenuExpanded ? <ChevronDown style={{ width: 14, height: 14 }} /> : <ChevronRight style={{ width: 14, height: 14 }} />}
                            </div>

                            <div style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: '#F8FAFC',
                              border: '1px solid #CBD5E1',
                              color: '#1E293B',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <MenuIcon style={{ width: 17, height: 17 }} />
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
                                  {menu.title}
                                </h3>
                                <span style={{
                                  fontSize: '0.68rem',
                                  color: '#64748B',
                                  background: '#F1F5F9',
                                  border: '1px solid #E2E8F0',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  fontFamily: 'monospace'
                                }}>
                                  {menu.submenus.length} Submenu{menu.submenus.length === 1 ? '' : 's'}
                                </span>
                              </div>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748B' }}>
                                {menu.description}
                              </p>
                            </div>
                          </div>

                          {/* Menu Right: Granted Badge + Quick Toggle */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              color: menuGranted > 0 ? 'var(--brand-primary, #15803D)' : '#64748B',
                              background: menuGranted > 0 ? 'var(--brand-primary-light, #F0FEF5)' : '#F8FAFC',
                              border: `1px solid ${menuGranted > 0 ? 'var(--brand-primary-border, #A3F5C1)' : '#E2E8F0'}`,
                              padding: '2px 8px',
                              borderRadius: 12
                            }}>
                              {menuGranted} / {menuActionKeys.length} Granted
                            </span>

                            <button
                              type="button"
                              onClick={() => toggleMenuAll(menu, !menuAllGranted)}
                              style={{
                                border: '1px solid #CBD5E1',
                                background: '#FFFFFF',
                                color: '#334155',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: 5,
                                cursor: 'pointer'
                              }}
                            >
                              {menuAllGranted ? 'Revoke Menu' : 'Grant Menu'}
                            </button>
                          </div>
                        </div>

                        {/* ── MENU BODY: LIST OF COLLAPSIBLE SUBMENUS ── */}
                        {isMenuExpanded && (
                          <div style={{
                            padding: '14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                            background: '#FFFFFF'
                          }}>
                            {menu.submenus.map((submenu, subIdx) => {
                              const subActionKeys = submenu.actions.map(a => `${menu.module}_${a.action}`);
                              const subGranted = subActionKeys.filter(k => flags[k]).length;
                              const subAllGranted = subActionKeys.length > 0 && subGranted === subActionKeys.length;
                              const isSubmenuExpanded = Boolean(expandedSubmenus[submenu.id]);

                              return (
                                <div
                                  key={submenu.id || subIdx}
                                  style={{
                                    border: '1px solid #E2E8F0',
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                    background: '#FAFAFA',
                                    transition: 'border-color 0.15s ease'
                                  }}
                                >
                                  {/* ── SUBMENU / PAGE HEADER (Click to Expand / Collapse Submenu) ── */}
                                  <div
                                    onClick={() => toggleSubmenuAccordion(submenu.id)}
                                    style={{
                                      padding: '10px 14px',
                                      background: isSubmenuExpanded ? '#F1F5F9' : '#FAFAFA',
                                      borderBottom: isSubmenuExpanded ? '1px solid #E2E8F0' : 'none',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      cursor: 'pointer',
                                      userSelect: 'none',
                                      flexWrap: 'wrap',
                                      gap: 8
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 4,
                                        background: '#FFFFFF',
                                        border: '1px solid #CBD5E1',
                                        color: '#475569',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}>
                                        {isSubmenuExpanded ? <ChevronDown style={{ width: 13, height: 13 }} /> : <ChevronRight style={{ width: 13, height: 13 }} />}
                                      </div>

                                      <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                                            {submenu.title}
                                          </h4>
                                          <span style={{
                                            fontSize: '0.66rem',
                                            color: '#475569',
                                            background: '#FFFFFF',
                                            border: '1px solid #CBD5E1',
                                            padding: '1px 6px',
                                            borderRadius: 4,
                                            fontFamily: 'monospace'
                                          }}>
                                            {submenu.route}
                                          </span>
                                        </div>
                                        <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                                          {submenu.description}
                                        </span>
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                                      <span style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 600,
                                        color: subGranted > 0 ? 'var(--brand-primary, #15803D)' : '#64748B',
                                        background: subGranted > 0 ? 'var(--brand-primary-light, #F0FEF5)' : '#FFFFFF',
                                        border: `1px solid ${subGranted > 0 ? 'var(--brand-primary-border, #A3F5C1)' : '#E2E8F0'}`,
                                        padding: '1px 6px',
                                        borderRadius: 8
                                      }}>
                                        {subGranted} / {submenu.actions.length} Active
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() => toggleSubmenuAll(menu.module, submenu, !subAllGranted)}
                                        style={{
                                          border: '1px solid #CBD5E1',
                                          background: '#FFFFFF',
                                          color: '#334155',
                                          fontSize: '0.68rem',
                                          fontWeight: 600,
                                          padding: '2px 7px',
                                          borderRadius: 4,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        {subAllGranted ? 'Revoke Page' : 'Grant Page'}
                                      </button>
                                    </div>
                                  </div>

                                  {/* ── SUBMENU BODY: GRANULAR PAGE PERMISSION CHECKBOXES ── */}
                                  {isSubmenuExpanded && (
                                    <div style={{
                                      padding: '12px 14px',
                                      background: '#FFFFFF',
                                      display: 'grid',
                                      gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                                      gap: 8
                                    }}>
                                      {submenu.actions.map(act => {
                                        const key = `${menu.module}_${act.action}`;
                                        const isChecked = Boolean(flags[key]);
                                        const ActionIcon = act.icon || Eye;

                                        return (
                                          <label
                                            key={act.action}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              toggleAction(menu.module, act.action);
                                            }}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'flex-start',
                                              gap: 9,
                                              padding: '8px 10px',
                                              borderRadius: 6,
                                              border: `1px solid ${isChecked ? 'var(--brand-primary-border, #A3F5C1)' : '#E2E8F0'}`,
                                              background: isChecked ? 'var(--brand-primary-light, #F0FEF5)' : '#FAFAFA',
                                              cursor: 'pointer',
                                              userSelect: 'none',
                                              transition: 'all 0.15s ease'
                                            }}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => {}}
                                              style={{
                                                marginTop: 2,
                                                width: 15,
                                                height: 15,
                                                accentColor: 'var(--brand-primary, #15803D)',
                                                cursor: 'pointer'
                                              }}
                                            />

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <ActionIcon style={{ width: 12, height: 12, color: isChecked ? 'var(--brand-primary, #15803D)' : '#64748B' }} />
                                                <span style={{
                                                  fontSize: '0.78rem',
                                                  fontWeight: isChecked ? 700 : 600,
                                                  color: isChecked ? '#0F172A' : '#334155'
                                                }}>
                                                  {act.label}
                                                </span>
                                              </div>
                                              <span style={{ fontSize: '0.68rem', color: '#64748B', lineHeight: 1.25 }}>
                                                {act.desc}
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
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
}
