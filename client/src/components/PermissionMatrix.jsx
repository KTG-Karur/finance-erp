import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield, Check, Save, ChevronDown, ChevronRight, Search,
  PieChart, FileText, Banknote, Repeat, Users, BookOpen,
  Calculator, Wallet, CreditCard, FileBarChart2, Building2,
  UserCog, Percent, Landmark, RefreshCw,
  SlidersHorizontal, ArrowRight, Eye, Plus, Pencil, Trash2,
  CheckCircle2, AlertCircle, ChevronsDown, ChevronsUp, Folder,
  FolderOpen, X, ShieldCheck, Archive, RotateCcw, Calendar, Lock
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
              { action: 'REVERT', label: 'Revert / Correct Collection', desc: 'Revert or edit erroneous payment entries', icon: RefreshCw },
              { action: 'WAIVER_APPROVE', label: 'Authorize / Reject Waivers', desc: 'Approve or reject interest shortfall discount concessions', icon: ShieldCheck }
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
              { action: 'DELETE', label: 'Delete Investor', desc: 'Remove investor partner record', icon: Trash2 },
              { action: 'PROFIT_DISTRIBUTE', label: 'Run Profit Distribution', desc: 'Enter monthly profit and settle investor payouts/reinvestment', icon: PieChart },
              { action: 'CAPITAL_WITHDRAW', label: 'Capital Withdrawal & Approvals', desc: 'View and approve investor capital withdrawal requests. Initiating or cancelling a request is always restricted to Admin regardless of this permission.', icon: Banknote }
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
      },
      {
        id: 'DRAFTS_ARCHIVE',
        module: 'SETTINGS',
        title: 'Drafts & Deleted Records Archive',
        icon: Archive,
        route: '/master-settings/drafts-archive',
        description: 'System recycle bin, soft-deleted customer profiles, loan schemes, staff, and one-click data restoration',
        submenus: [
          {
            id: 'drafts_archive_manager',
            title: 'Drafts & Deleted Records',
            route: '/master-settings/drafts-archive',
            description: 'Inspect soft-deleted records and revert or restore them to active status',
            actions: [
              { action: 'VIEW', label: 'View Archived Records', desc: 'Inspect deleted and draft records across all modules', icon: Eye },
              { action: 'RESTORE', label: 'Restore / Revert Records', desc: 'Reactivate soft-deleted entries back to active state', icon: RotateCcw }
            ]
          }
        ]
      },
      {
        id: 'FINANCIAL_YEAR',
        module: 'FINANCIAL_YEAR',
        title: 'Financial Years & Period Control',
        icon: Calendar,
        route: '/master-settings/financial-years',
        description: 'Accounting periods (1 April - 31 March), period locking, subledger parity audit, and year-end carry forward',
        submenus: [
          {
            id: 'fy_manager',
            title: 'Financial Year Control & Closing Wizard',
            route: '/master-settings/financial-years',
            description: 'Manage financial years, run pre-closing audits, execute year-end closing, and manage period locks',
            actions: [
              { action: 'VIEW', label: 'View Financial Years', desc: 'Inspect financial years register and period status', icon: Eye },
              { action: 'CLOSE', label: 'Execute Year-End Close', desc: 'Perform pre-closing audit and execute atomic closing', icon: Lock },
              { action: 'SOFT_LOCK', label: 'Audit Soft Lock', desc: 'Pause standard transaction entry for year-end audit', icon: ShieldCheck }
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

export const DEFAULT_ROLES = [
  { id: 'ADMIN', name: 'System Administrator', desc: 'Full unrestricted system access', isSystem: true },
  { id: 'MANAGER', name: 'Branch Manager', desc: 'Branch operations, approvals & financial management', isSystem: true },
  { id: 'COLLECTOR', name: 'Field Collector Agent', desc: 'Daily field collections & borrower receipts', isSystem: true },
  { id: 'STAFF', name: 'General Staff', desc: 'Data entry, customer inquiries & standard reporting', isSystem: true }
];

export const STORAGE_CUSTOM_ROLES_KEY = 'financial_erp_custom_roles';

export function getStoredCustomRoles() {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_ROLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveStoredCustomRoles(roles) {
  try {
    localStorage.setItem(STORAGE_CUSTOM_ROLES_KEY, JSON.stringify(roles));
    window.dispatchEvent(new Event('roles-updated'));
  } catch (e) {
    console.error('Failed to save custom roles', e);
  }
}

export function getBaseRolePreset(roleId) {
  const all = allAllowed();
  if (roleId === 'ADMIN') return all;

  if (roleId === 'BLANK') {
    const blank = {};
    getAllActionKeys().forEach(k => { blank[k] = false; });
    return blank;
  }

  if (roleId === 'COLLECTOR') {
    const collectorFlags = {};
    getAllActionKeys().forEach(k => {
      if (k.startsWith('COLLECTIONS_') || k.startsWith('DASHBOARD_') || k === 'LOANS_VIEW' || k === 'BORROWERS_VIEW') {
        collectorFlags[k] = true;
      } else {
        collectorFlags[k] = false;
      }
    });
    return collectorFlags;
  }

  if (roleId === 'STAFF') {
    const staffFlags = {};
    getAllActionKeys().forEach(k => {
      if (k.endsWith('_VIEW') || k.endsWith('_CREATE') || k.startsWith('DASHBOARD_') || k.startsWith('BORROWERS_')) {
        staffFlags[k] = true;
      } else {
        staffFlags[k] = false;
      }
    });
    return staffFlags;
  }

  const managerFlags = {};
  getAllActionKeys().forEach(k => {
    if (k.endsWith('_DELETE') || k === 'MASTER_SETTINGS_DELETE') {
      managerFlags[k] = false;
    } else {
      managerFlags[k] = true;
    }
  });
  return managerFlags;
}

export function getRolePreset(roleId) {
  try {
    const saved = localStorage.getItem('rbac_preset_' + roleId);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') return { ...allAllowed(), ...parsed };
    }
  } catch (e) {}
  return getBaseRolePreset(roleId);
}

// ── Minimal flat-tree row (Section / Menu / Submenu) ──────────────────────
// One indentation level per depth, a small disclosure arrow, a granted
// count, and a text-only "select all" link — no card chrome, no icons.
function TreeRow({ depth, expanded, onToggle, title, granted, total, allGranted, onToggleAll, bold = false, marker }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '9px 14px',
        paddingLeft: 14 + depth * 20,
        cursor: 'pointer',
        userSelect: 'none',
        background: depth === 0 ? '#FAFAFA' : '#FFFFFF'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {expanded ? <ChevronDown style={{ width: 14, height: 14, color: '#94A3B8', flexShrink: 0 }} /> : <ChevronRight style={{ width: 14, height: 14, color: '#94A3B8', flexShrink: 0 }} />}
        {marker && (
          <span style={{
            fontSize: bold ? '0.8rem' : '0.76rem',
            fontWeight: 700,
            color: bold ? 'var(--brand-primary, #15803D)' : '#94A3B8',
            flexShrink: 0,
            minWidth: bold ? 16 : 12,
            textAlign: bold ? 'right' : 'left'
          }}>
            {marker}
          </span>
        )}
        <span style={{
          fontSize: bold ? '0.86rem' : '0.82rem',
          fontWeight: bold ? 700 : 600,
          color: '#0F172A',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {title}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: granted > 0 ? 'var(--brand-primary, #15803D)' : '#94A3B8' }}>
          {granted}/{total}
        </span>
        <button
          type="button"
          onClick={onToggleAll}
          style={{
            border: 'none',
            background: 'none',
            color: allGranted ? '#94A3B8' : 'var(--brand-primary, #15803D)',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
            textUnderlineOffset: 2
          }}
        >
          {allGranted ? 'Clear' : 'Select all'}
        </button>
      </div>
    </div>
  );
}

// ── iOS-style toggle switch ────────────────────────────────────────────────
function ToggleSwitch({ checked, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      style={{
        width: 36,
        height: 20,
        borderRadius: 999,
        border: 'none',
        background: checked ? 'var(--brand-primary, #15803D)' : '#CBD5E1',
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0,
        padding: 0,
        transition: 'background 0.15s ease'
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2,
        left: checked ? 18 : 2,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: '#FFFFFF',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.25)',
        transition: 'left 0.15s ease'
      }} />
    </button>
  );
}

// ── Flat list of individual permission rows, each ending in a toggle switch ──
function ActionToggleList({ depth, actions, moduleName, flags, onToggle }) {
  return (
    <div>
      {actions.map(act => {
        const key = `${moduleName}_${act.action}`;
        const isChecked = Boolean(flags[key]);
        return (
          <div
            key={act.action}
            onClick={() => onToggle(moduleName, act.action)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '8px 14px',
              paddingLeft: 14 + depth * 20,
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: isChecked ? '#0F172A' : '#475569' }}>
              {act.label}
            </span>
            <ToggleSwitch checked={isChecked} onClick={(e) => { e.stopPropagation(); onToggle(moduleName, act.action); }} />
          </div>
        );
      })}
    </div>
  );
}

// ── Plain underlined text-link button — used throughout the header controls
// so every header action reads as a real, clickable control — bordered,
// tinted by intent, with an icon — rather than a bare text link.
function ToolbarButton({ onClick, tone = 'neutral', icon: Icon, children }) {
  const tones = {
    neutral: { border: '#CBD5E1', background: '#FFFFFF', color: '#334155' },
    brand: { border: 'var(--brand-primary-border, #A3F5C1)', background: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary, #15803D)' },
    danger: { border: 'var(--color-danger-border, #FECACA)', background: 'var(--color-danger-light, #FEF2F2)', color: 'var(--color-danger, #DC2626)' }
  };
  const c = tones[tone] || tones.neutral;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        border: `1px solid ${c.border}`,
        background: c.background,
        color: c.color,
        fontSize: '0.76rem',
        fontWeight: 600,
        padding: '6px 12px',
        borderRadius: 7,
        cursor: 'pointer',
        whiteSpace: 'nowrap'
      }}
    >
      {Icon && <Icon style={{ width: 13, height: 13, flexShrink: 0 }} />}
      <span>{children}</span>
    </button>
  );
}

function HeaderDivider() {
  return <span style={{ width: 1, height: 22, background: '#E2E8F0', flexShrink: 0 }} />;
}

export default function PermissionMatrix({
  initialRole = 'MANAGER',
  selectedStaffMember = null,
  employees = [],
  roles = [],
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  onSaveStaffPermissions
}) {
  const { t } = useLanguage();
  const [customRoles, setCustomRoles] = useState(getStoredCustomRoles);

  useEffect(() => {
    const handleRolesUpdated = () => {
      setCustomRoles(getStoredCustomRoles());
    };
    window.addEventListener('roles-updated', handleRolesUpdated);
    return () => window.removeEventListener('roles-updated', handleRolesUpdated);
  }, []);

  const ROLES = useMemo(() => {
    if (roles && roles.length > 0) {
      return roles.map(r => ({
        id: r.role_code || r.id,
        name: r.role_name || r.name,
        desc: r.description || r.desc || `${r.role_name || r.role_code} role`,
        isSystem: Boolean(r.is_system),
        permissions: r.permissions
      }));
    }
    const localizedDefaults = DEFAULT_ROLES.map(r => {
      if (r.id === 'ADMIN') return { ...r, name: t('rbac.role.super_admin') || r.name };
      if (r.id === 'MANAGER') return { ...r, name: t('rbac.role.manager') || r.name };
      if (r.id === 'COLLECTOR') return { ...r, name: t('rbac.role.collector') || r.name };
      if (r.id === 'STAFF') return { ...r, name: t('rbac.role.staff') || r.name };
      return r;
    });
    return [...localizedDefaults, ...customRoles];
  }, [t, customRoles, roles]);

  const currentRole = selectedStaffMember?.role || initialRole;
  const [selectedRole, setSelectedRole] = useState(currentRole);
  
  const getInitialFlags = (roleCode) => {
    if (selectedStaffMember?.permissions) {
      return rowsToFlags(selectedStaffMember.permissions);
    }
    const foundRole = (roles || []).find(r => (r.role_code || r.id) === roleCode);
    if (foundRole?.permissions) {
      return rowsToFlags(foundRole.permissions);
    }
    return getRolePreset(roleCode);
  };

  const [flags, setFlags] = useState(() => getInitialFlags(currentRole));
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Role Modal State
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ name: '', code: '', desc: '', baseRole: 'STAFF' });
  const [newRoleError, setNewRoleError] = useState('');

  // Accordion State — everything starts collapsed so the page opens as a
  // short list of module groups instead of dumping every action on screen
  // at once; the user drills into only what they need to change.
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedMenus, setExpandedMenus] = useState({});
  const [expandedSubmenus, setExpandedSubmenus] = useState({});

  useEffect(() => {
    const target = selectedStaffMember?.role || initialRole;
    setSelectedRole(target);
    setFlags(getInitialFlags(target));
    setSaveError('');
  }, [selectedStaffMember, initialRole, roles]);

  const handleRoleChange = (newRole) => {
    setSelectedRole(newRole);
    if (!selectedStaffMember) {
      setFlags(getInitialFlags(newRole));
    }
  };

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
      const rows = flagsToRows(flags);
      if (selectedStaffMember) {
        await onSaveStaffPermissions?.(
          selectedStaffMember.id,
          selectedRole,
          rows
        );
      } else {
        // 1. Save role permissions in backend database (roles table)
        if (onUpdateRole) {
          try {
            await onUpdateRole(selectedRole, { permissions: rows });
          } catch (e) {
            console.warn('Backend role update fallback', e);
          }
        }
        // 2. Local fallback caching
        localStorage.setItem('rbac_preset_' + selectedRole, JSON.stringify(flags));
        
        // 3. Update all active staff members with this role
        const targetStaff = employees.filter(e => e.role === selectedRole);
        if (targetStaff.length > 0 && onSaveStaffPermissions) {
          for (const emp of targetStaff) {
            try {
              await onSaveStaffPermissions(emp.id, selectedRole, rows);
            } catch (err) {
              console.warn(`Failed to update permissions for staff ${emp.id}`, err);
            }
          }
        }
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setSaveError(err?.response?.data?.message || 'Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewRole = async (e) => {
    e.preventDefault();
    setNewRoleError('');
    const rawName = newRoleForm.name.trim();
    if (!rawName) {
      setNewRoleError('Role name is required.');
      return;
    }
    const derivedCode = (newRoleForm.code.trim() || rawName)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_');

    if (!derivedCode) {
      setNewRoleError('Valid Role Code is required.');
      return;
    }

    if (ROLES.some(r => r.id === derivedCode)) {
      setNewRoleError(`A role with code '${derivedCode}' already exists.`);
      return;
    }

    const initialPreset = getBaseRolePreset(newRoleForm.baseRole);
    const initialPresetRows = flagsToRows(initialPreset);

    try {
      if (onCreateRole) {
        await onCreateRole({
          role_name: rawName,
          role_code: derivedCode,
          description: newRoleForm.desc.trim() || `${rawName} role`,
          permissions: initialPresetRows
        });
      }
    } catch (err) {
      setNewRoleError(err?.response?.data?.message || 'Failed to create role on server.');
      return;
    }

    const newRole = {
      id: derivedCode,
      name: rawName,
      desc: newRoleForm.desc.trim() || `${rawName} role`,
      isSystem: false,
      permissions: initialPresetRows
    };

    const nextCustom = [...customRoles, newRole];
    saveStoredCustomRoles(nextCustom);
    setCustomRoles(nextCustom);

    try {
      localStorage.setItem('rbac_preset_' + derivedCode, JSON.stringify(initialPreset));
    } catch (err) {}

    setSelectedRole(derivedCode);
    setFlags(initialPreset);
    setShowAddRoleModal(false);
    setNewRoleForm({ name: '', code: '', desc: '', baseRole: 'STAFF' });
  };

  const handleDeleteCustomRole = async (roleId) => {
    const roleToDelete = ROLES.find(r => r.id === roleId);
    if (!roleToDelete) return;
    if (window.confirm(`Are you sure you want to delete custom role '${roleToDelete.name}'?`)) {
      try {
        if (onDeleteRole) {
          await onDeleteRole(roleId);
        }
      } catch (err) {
        alert(err?.response?.data?.message || 'Failed to delete role on server.');
        return;
      }

      const nextCustom = customRoles.filter(r => r.id !== roleId);
      saveStoredCustomRoles(nextCustom);
      setCustomRoles(nextCustom);
      try {
        localStorage.removeItem('rbac_preset_' + roleId);
      } catch (err) {}
      setSelectedRole('STAFF');
      setFlags(getRolePreset('STAFF'));
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

  // While searching, auto-expand every section/menu/submenu that matched so
  // results are actually visible — everything is collapsed by default otherwise.
  useEffect(() => {
    if (!sq) return;
    const nextSec = {};
    const nextMenu = {};
    const nextSub = {};
    filteredSections.forEach(sec => {
      nextSec[sec.id] = true;
      sec.menus.forEach(menu => {
        nextMenu[menu.id] = true;
        menu.submenus.forEach(sub => { nextSub[sub.id] = true; });
      });
    });
    setExpandedSections(prev => ({ ...prev, ...nextSec }));
    setExpandedMenus(prev => ({ ...prev, ...nextMenu }));
    setExpandedSubmenus(prev => ({ ...prev, ...nextSub }));
  }, [sq, filteredSections]);

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

      {/* ── 1. Top Control Header — real bordered/tinted buttons with icons ── */}
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

        {/* Row 1: Role target + Save */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Shield style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
              {selectedStaffMember ? 'Staff Target' : 'Target Role'}
            </span>

            {selectedStaffMember ? (
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', flexShrink: 0 }}>
                {selectedStaffMember.name}
                <span style={{ fontSize: '0.76rem', fontWeight: 500, color: '#64748B' }}> ({selectedStaffMember.role})</span>
              </span>
            ) : (
              <SharedDropdown
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                size="sm"
                buttonStyle={{ height: 32, minWidth: 160, fontWeight: 700, border: '1px solid #CBD5E1', background: '#FFFFFF', flexShrink: 0 }}
                options={ROLES.map(r => ({ value: r.id, label: r.name }))}
              />
            )}

            {!selectedStaffMember && (
              <>
                <ToolbarButton
                  tone="brand"
                  icon={Plus}
                  onClick={() => {
                    setNewRoleForm({ name: '', code: '', desc: '', baseRole: 'STAFF' });
                    setNewRoleError('');
                    setShowAddRoleModal(true);
                  }}
                >
                  Add New Role
                </ToolbarButton>

                {!ROLES.find(r => r.id === selectedRole)?.isSystem && (
                  <ToolbarButton tone="danger" icon={Trash2} onClick={() => handleDeleteCustomRole(selectedRole)}>
                    Delete Role
                  </ToolbarButton>
                )}

              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
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
                boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb), 0.25)'
              }}
            >
              <Save style={{ width: 15, height: 15 }} />
              <span>{saving ? 'Saving Changes...' : 'Save Permissions'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search + stats + bulk-action buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          paddingTop: 12,
          borderTop: '1px solid #F1F5F9'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 7,
            padding: '7px 12px',
            width: '100%',
            maxWidth: 280,
            boxSizing: 'border-box'
          }}>
            <Search style={{ width: 15, height: 15, color: '#94A3B8', flexShrink: 0 }} />
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
                Granted <strong style={{ color: 'var(--brand-primary, #15803D)' }}>{grantedCount}/{totalPermissions}</strong> ({percentGranted}%)
              </span>
              <div style={{ width: 56, height: 6, borderRadius: 3, background: '#E2E8F0', overflow: 'hidden' }}>
                <div style={{ width: `${percentGranted}%`, height: '100%', background: 'var(--brand-primary, #15803D)', transition: 'width 0.3s ease' }} />
              </div>
            </div>

            <HeaderDivider />

            <ToolbarButton icon={ChevronsDown} onClick={handleExpandAll}>Expand All</ToolbarButton>
            <ToolbarButton icon={ChevronsUp} onClick={handleCollapseAll}>Collapse All</ToolbarButton>

            <HeaderDivider />

            <ToolbarButton tone="brand" icon={Check} onClick={() => handleGlobalToggle(true)}>Grant All</ToolbarButton>
            <ToolbarButton tone="danger" icon={X} onClick={() => handleGlobalToggle(false)}>Revoke All</ToolbarButton>
          </div>
        </div>

      </div>

      {/* ── 2. Hierarchical Sections, Menus & Submenus — minimal flat tree ── */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
        {filteredSections.map((section, secIdx) => {
          const isSectionExpanded = Boolean(expandedSections[section.id]);

          const secActionKeys = [];
          section.menus.forEach(m => {
            m.submenus.forEach(s => {
              s.actions.forEach(a => secActionKeys.push(`${m.module}_${a.action}`));
            });
          });
          const secGranted = secActionKeys.filter(k => flags[k]).length;
          const secAllGranted = secActionKeys.length > 0 && secGranted === secActionKeys.length;

          return (
            <div key={section.id} style={{ borderTop: secIdx === 0 ? 'none' : '1px solid #F1F5F9' }}>
              <TreeRow
                depth={0}
                expanded={isSectionExpanded}
                onToggle={() => toggleSectionAccordion(section.id)}
                title={section.title}
                granted={secGranted}
                total={secActionKeys.length}
                allGranted={secAllGranted}
                onToggleAll={() => toggleSectionAll(section, !secAllGranted)}
                marker={`${secIdx + 1}.`}
                bold
              />

              {isSectionExpanded && section.menus.map((menu, menuIdx) => {
                const isMenuExpanded = Boolean(expandedMenus[menu.id]);
                // Most modules have exactly one submenu/page — showing a
                // redundant submenu row for those just adds nesting, so
                // their actions render directly under the menu instead.
                const singleSubmenu = menu.submenus.length === 1;

                const menuActionKeys = [];
                menu.submenus.forEach(s => {
                  s.actions.forEach(a => menuActionKeys.push(`${menu.module}_${a.action}`));
                });
                const menuGranted = menuActionKeys.filter(k => flags[k]).length;
                const menuAllGranted = menuActionKeys.length > 0 && menuGranted === menuActionKeys.length;

                return (
                  <div key={menu.id}>
                    <TreeRow
                      depth={1}
                      expanded={isMenuExpanded}
                      onToggle={() => toggleMenuAccordion(menu.id)}
                      title={menu.title}
                      granted={menuGranted}
                      total={menuActionKeys.length}
                      allGranted={menuAllGranted}
                      onToggleAll={() => toggleMenuAll(menu, !menuAllGranted)}
                      marker="•"
                    />

                    {isMenuExpanded && singleSubmenu && (
                      <ActionToggleList
                        depth={2}
                        actions={menu.submenus[0].actions}
                        moduleName={menu.module}
                        flags={flags}
                        onToggle={toggleAction}
                      />
                    )}

                    {isMenuExpanded && !singleSubmenu && menu.submenus.map((submenu, subIdx) => {
                      const subActionKeys = submenu.actions.map(a => `${menu.module}_${a.action}`);
                      const subGranted = subActionKeys.filter(k => flags[k]).length;
                      const subAllGranted = subActionKeys.length > 0 && subGranted === subActionKeys.length;
                      const isSubmenuExpanded = Boolean(expandedSubmenus[submenu.id]);

                      return (
                        <div key={submenu.id || subIdx}>
                          <TreeRow
                            depth={2}
                            expanded={isSubmenuExpanded}
                            onToggle={() => toggleSubmenuAccordion(submenu.id)}
                            title={submenu.title}
                            granted={subGranted}
                            total={submenu.actions.length}
                            allGranted={subAllGranted}
                            onToggleAll={() => toggleSubmenuAll(menu.module, submenu, !subAllGranted)}
                            marker="–"
                          />
                          {isSubmenuExpanded && (
                            <ActionToggleList
                              depth={3}
                              actions={submenu.actions}
                              moduleName={menu.module}
                              flags={flags}
                              onToggle={toggleAction}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── CREATE NEW ROLE MODAL ── */}
      {showAddRoleModal && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card" style={{ maxWidth: 480 }}>
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary, #15803D)' }}>
                  <Shield style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>Create New System Role</h3>
                  <p>Define a new organizational role and configure its permission matrix</p>
                </div>
              </div>
              <button onClick={() => setShowAddRoleModal(false)} className="close-btn" type="button">
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <form onSubmit={handleCreateNewRole}>
              <div className="saas-modal-body">
                {newRoleError && (
                  <div className="form-alert form-alert--error" style={{ background: 'var(--color-danger-light, #FEF2F2)', color: 'var(--color-danger, #DC2626)', border: '1px solid var(--color-danger-border, #FECACA)', padding: '10px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600 }}>
                    <span>{newRoleError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Role Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-control"
                    placeholder="e.g. Internal Auditor, Senior Accountant, Cashier"
                    value={newRoleForm.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      const autoCode = val.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');
                      setNewRoleForm(prev => ({
                        ...prev,
                        name: val,
                        code: prev.code === '' || prev.code === prev.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_') ? autoCode : prev.code
                      }));
                    }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Role Code / System ID *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-control"
                    placeholder="e.g. INTERNAL_AUDITOR"
                    value={newRoleForm.code}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                    style={{ fontFamily: 'monospace', fontWeight: 600 }}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', marginTop: 3 }}>
                    Unique identifier used in backend authorization checks.
                  </span>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Role Description
                  </label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="e.g. Inspect ledger entries, day-end audits, and compliance"
                    value={newRoleForm.desc}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, desc: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Copy Initial Permissions From
                  </label>
                  <SharedDropdown
                    value={newRoleForm.baseRole}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, baseRole: e.target.value })}
                    buttonStyle={{ height: 38 }}
                    options={[
                      { value: 'STAFF', label: 'General Staff (Basic View & Entry)' },
                      { value: 'COLLECTOR', label: 'Field Collector (Collections & Receipts)' },
                      { value: 'MANAGER', label: 'Branch Manager (Operations & Approvals)' },
                      { value: 'ADMIN', label: 'System Administrator (Full Access)' },
                      { value: 'BLANK', label: 'Blank / No Permissions' }
                    ]}
                  />
                </div>
              </div>

              <div className="saas-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  <span>Create Role</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
