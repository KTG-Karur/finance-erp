import React, { useState, useEffect } from 'react';
import AppLayout from './layouts/AppLayout';
import CompanyCodePage from './auth/CompanyCodePage';
import LoginPage from './auth/LoginPage';
import SuperAdminLoginPage from './auth/SuperAdminLoginPage';
import SuperAdminPortal from './auth/SuperAdminPortal';
import DashboardOverviewView from './finance/dashboard/DashboardOverviewView';
import CustomerKycReviewPage from './finance/borrowers/CustomerKycReviewPage';
import BorrowersView from './finance/borrowers/BorrowersView';
import LoansView from './finance/loan/LoansView';
import LoanApplicationsView from './finance/loan/LoanApplicationsView';
import InvestorCapitalView from './finance/investors/InvestorCapitalView';
import FixedDepositsView from './finance/fixedDeposits/FixedDepositsView';
import RecurringDepositsView from './finance/recurringDeposits/RecurringDepositsView';
import DailyCollectionsView from './finance/accounting/DailyCollectionsView';
import GeneralLedgerView from './finance/accounting/GeneralLedgerView';
import LoanLedgerView from './finance/accounting/LoanLedgerView';
import CustomerLedgerView from './finance/accounting/CustomerLedgerView';
import TrialBalanceView from './finance/accounting/TrialBalanceView';
import AutoVouchersView from './finance/accounting/AutoVouchersView';
import ManualVouchersView from './finance/accounting/ManualVouchersView';
import EODProcessView from './finance/accounting/EODProcessView';
import LoanPortfolioReportView from './reports/LoanPortfolioReportView';
import CollectionsReportView from './reports/CollectionsReportView';
import BorrowerKycReportView from './reports/BorrowerKycReportView';
import InvestorCapitalReportView from './reports/InvestorCapitalReportView';
import FixedDepositReportView from './reports/FixedDepositReportView';
import RecurringDepositReportView from './reports/RecurringDepositReportView';
import FinancialStatementsReportView from './reports/FinancialStatementsReportView';
import StaffPerformanceReportView from './reports/StaffPerformanceReportView';
import MasterSettingsView from './settings/MasterSettingsView';
import CollectionDrawer from './components/CollectionDrawer';
import NewLoanModal from './components/NewLoanModal';
import QuickActionModal from './components/QuickActionModal';
import api from './api/client';
import {
  INITIAL_INVESTORS,
  INITIAL_FIXED_DEPOSITS,
  INITIAL_RECURRING_DEPOSITS,
  buildRdInstallments,
  INITIAL_EXPENSE_CATEGORIES,
  INITIAL_EXPENSE_ALLOCATION_REQUESTS,
  INITIAL_EXPENSE_VOUCHERS,
  INITIAL_CHART_OF_ACCOUNTS
} from './data/mockFinanceData';
import { generateEmiSchedule, generateCustomSchedule, resolveSchemeRepaymentMethod, resolveSchemeInterestCalculation, estimateCustomTotalPayable } from './utils/loanCalculations';
import { journalLine, buildJournalEntry, buildVoucherLines } from './utils/accounting';

// Every ACTIVE/CLOSED/OVERDUE loan below is seeded with numbers actually produced by
// utils/loanCalculations.js (not hand-typed guesses), so collected_amount /
// pending_amount / the sample collection receipts are internally consistent with the
// engine that runs every real payment. One loan per Repayment Method x Interest
// Calculation combination, plus a closed one and an overdue one. Mirrors
// server/src/config/db.js's mock data so behavior is identical whether the backend
// is reachable or not.
// loans, collections, and borrowers all have real backends now (see fetchData) —
// no mock seed data for them anymore.

const INITIAL_EMPLOYEES = [
  { id: 1, company_id: 1, name: 'John Admin', email: 'admin@alpha.com', role: 'ADMIN', permissions: [] },
  { id: 2, company_id: 1, name: 'Sarah Collector', email: 'sarah@alpha.com', role: 'COLLECTOR', permissions: [{ module: 'LOANS', action: 'VIEW', allowed: 1 }, { module: 'COLLECTIONS', action: 'COLLECT', allowed: 1 }] },
  { id: 3, company_id: 1, name: 'Mike Manager', email: 'mike@alpha.com', role: 'MANAGER', permissions: [{ module: 'LOANS', action: 'CREATE', allowed: 1 }, { module: 'EMPLOYEES', action: 'MANAGE', allowed: 1 }] }
];

// collections and borrowers both have real backends now — no mock seed data for
// them anymore (see fetchData).

const INITIAL_BRANCHES = [
  { id: 1, company_id: 1, name: 'Karur Branch', code: 'KRM', address: '', phone: '', city: '', state: '', pincode: '', is_active: 1 },
  { id: 2, company_id: 1, name: 'Namakkal Branch', code: 'NKL', address: '', phone: '', city: '', state: '', pincode: '', is_active: 1 },
  { id: 3, company_id: 1, name: 'Salem Branch', code: 'SLM', address: '', phone: '', city: '', state: '', pincode: '', is_active: 1 },
  { id: 4, company_id: 1, name: 'Chennai Branch', code: 'CHN', address: '', phone: '', city: '', state: '', pincode: '', is_active: 1 },
  { id: 5, company_id: 1, name: 'Madurai Branch', code: 'MDU', address: '', phone: '', city: '', state: '', pincode: '', is_active: 1 }
];

// The app has 4 top-level modules (finance, auth, settings, reports), mirroring
// the backend's src/finance + src/modules/{auth,org,employee} split. Every
// browser URL is prefixed with its module — /finance/dashboard,
// /settings/rbac-matrix, /reports/collections — while `activeTab` itself
// (what every render check in this file matches against) stays exactly the
// unprefixed tab name it always was, so none of the existing
// `activeTab.includes(...)` logic needed to change.
const MODULE_NAMES = ['finance', 'settings', 'reports', 'auth'];

const moduleForTab = (tab) => {
  if (tab.startsWith('master-settings') || tab.startsWith('settings') || tab === 'employees') return 'settings';
  if (tab.startsWith('reports/')) return 'reports';
  return 'finance';
};

const stripModulePrefix = (pathname) => {
  const clean = (pathname || '').replace(/^\//, '');
  const firstSeg = clean.split('/')[0];
  return MODULE_NAMES.includes(firstSeg) ? clean.slice(firstSeg.length + 1) : clean;
};

export default function App() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [path, setPath] = useState(() => window.location.pathname || '/auth/login');

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(localStorage.getItem('financial_erp_token'));
  });

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('financial_erp_user');
    if (savedUser) return JSON.parse(savedUser);
    return null;
  });

  const [tenant, setTenant] = useState(() => {
    const savedUser = localStorage.getItem('financial_erp_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      return { id: parsed.companyId || 1, name: parsed.companyName || 'Alpha Financial Services Ltd' };
    }
    return { id: 1, name: 'Alpha Financial Services Ltd' };
  });

  const [activeTab, setActiveTabState] = useState(() => {
    const current = stripModulePrefix(window.location.pathname);
    return (current && current !== 'login') ? current : 'dashboard';
  });

  // Pre-auth flow: Company Code -> Module Selection -> Credentials
  // Persisted to sessionStorage so a page refresh mid-flow doesn't bounce back to step 1.
  const [authFlow, setAuthFlow] = useState(() => sessionStorage.getItem('financial_erp_auth_flow') || 'COMPANY_CODE');
  const [verifiedCompany, setVerifiedCompany] = useState(() => {
    const saved = sessionStorage.getItem('financial_erp_verified_company');
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedModule, setSelectedModule] = useState(() => {
    const saved = sessionStorage.getItem('financial_erp_selected_module');
    return saved ? JSON.parse(saved) : null;
  });
  const [isJumpingTenant, setIsJumpingTenant] = useState(false);

  useEffect(() => {
    sessionStorage.setItem('financial_erp_auth_flow', authFlow);
  }, [authFlow]);

  useEffect(() => {
    if (verifiedCompany) sessionStorage.setItem('financial_erp_verified_company', JSON.stringify(verifiedCompany));
    else sessionStorage.removeItem('financial_erp_verified_company');
  }, [verifiedCompany]);

  useEffect(() => {
    if (selectedModule) sessionStorage.setItem('financial_erp_selected_module', JSON.stringify(selectedModule));
    else sessionStorage.removeItem('financial_erp_selected_module');
  }, [selectedModule]);

  // loans has a real backend (server/src/finance/loan) — starts empty, populated by
  // fetchData()'s /v1/finance/loans call. employees has no backend route registered
  // yet (see fetchData's comment), so it keeps its mock seed as the only data
  // available until that's wired up.
  const [loans, setLoans] = useState([]);
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
  const [auditLogs, setAuditLogs] = useState([]);

  // ── Double-entry accounting ledger ──
  // Chart of Accounts is fixed for now (moderate-scope ERP, not a tenant-customizable
  // one yet). Every collection, disbursal, and expense voucher posts a balanced
  // journal entry here — Cash Book / General Ledger / Trial Balance / P&L / Balance
  // Sheet pages are all *derived* from this array, never
  // hand-maintained separately, so they can never drift out of reconciliation with
  // each other.
  const [chartOfAccounts] = useState(INITIAL_CHART_OF_ACCOUNTS);
  const [journalEntries, setJournalEntries] = useState(() => [
    // Opening capital: promoters fund the branch vault. Without this seed the Cash
    // Book would start at ₹0 and every subsequent disbursal would show as a negative
    // cash balance, which is correct accounting but useless for a fresh demo.
    buildJournalEntry({
      id: 'JE-OPEN-1',
      date: '2026-07-01',
      narration: 'Opening cash balance — capital infusion by promoters',
      ref_type: 'CAPITAL',
      lines: [
        journalLine('1001', 150000, 0),
        journalLine('2001', 0, 150000)
      ]
    })
  ]);

  // A single voucher number is the one identifier for any posted entry —
  // callers that need to show/print that same number elsewhere (e.g. a
  // collection's printed slip) should generate it with this and pass it in
  // as `id` rather than let postJournal mint its own.
  const generateVoucherNo = () => `JE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const postJournal = (narration, lines, refType, refId, date, branch, voucherType, createdBy, id) => {
    setJournalEntries(prev => [...prev, buildJournalEntry({
      id: id || generateVoucherNo(),
      date: date || new Date().toISOString().slice(0, 10),
      narration,
      lines,
      ref_type: refType,
      ref_id: refId,
      branch,
      voucher_type: voucherType,
      created_by: createdBy
    })]);
  };

  // Manual voucher entry — the other half of the ledger alongside the automatic
  // postJournal calls below: a staff member deliberately keys in a Cash/Bank
  // Receipt or Payment, a Contra transfer between cash and bank, or a free-form
  // Journal. Reuses the same balanced-entry engine, just tagged ref_type 'MANUAL'
  // so the Auto vs Manual Vouchers pages can tell them apart with one field.
  const handleCreateManualVoucher = (payload) => {
    assertEodNotLocked(payload.branch, payload.date);
    const lines = buildVoucherLines(payload.voucher_type, {
      amount: payload.amount,
      otherAccountCode: payload.other_account_code,
      contraDirection: payload.contra_direction,
      lines: payload.lines
    });
    postJournal(
      payload.narration || 'Manual voucher',
      lines,
      'MANUAL',
      null,
      payload.date,
      payload.branch,
      payload.voucher_type,
      payload.created_by
    );
  };

  // Day-end cash closing — one record per branch per day. A matching count closes
  // the day outright; a mismatch still closes it (staff isn't blocked) but goes to
  // PENDING_REVIEW until an admin either recounts (handleUpdateEodRecord) or
  // acknowledges the variance with a resolution note (handleResolveEodVariance) —
  // never silently absorbed either way.
  const hasVarianceAmount = (diff) => Math.round((diff || 0) * 100) !== 0;

  const handleCloseEodDay = (payload) => {
    const alreadyClosed = eodRecords.some(r => r.branch === payload.branch && r.date === payload.date);
    if (alreadyClosed) {
      throw new Error('This day is already closed for this branch.');
    }
    const variance = hasVarianceAmount(payload.difference);
    const record = {
      id: `EOD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...payload,
      status: variance ? 'PENDING_REVIEW' : 'CLOSED',
      has_variance: variance,
      edited: false,
      closed_by: user?.name || 'Staff',
      closed_at: new Date().toISOString()
    };
    setEodRecords(prev => [...prev, record]);
    logAudit('EOD_CLOSURE', record.id, 'CREATE', `${record.branch} ${record.date} — ${record.status}`);
  };

  // Admin recount: replaces the denomination counts and re-derives status from the
  // corrected difference — if the recount now matches, the day clears straight
  // back to CLOSED; if it still doesn't, it stays PENDING_REVIEW for a follow-up.
  const handleUpdateEodRecord = (id, payload) => {
    const before = eodRecords.find(r => r.id === id);
    const variance = hasVarianceAmount(payload.difference);
    setEodRecords(prev => prev.map(r => (r.id === id ? {
      ...r,
      ...payload,
      status: variance ? 'PENDING_REVIEW' : 'CLOSED',
      has_variance: variance,
      edited: true,
      reopened_by: user?.name || 'Admin',
      reopened_at: new Date().toISOString()
    } : r)));
    logAudit('EOD_CLOSURE', id, 'RECOUNT', `${before?.branch} ${before?.date} recounted — ${variance ? 'PENDING_REVIEW' : 'CLOSED'}`);
  };

  // Admin acknowledges a variance without recounting — e.g. the shortage was
  // recovered from the collector the next day, or written off. The variance stays
  // on record (has_variance survives) but the record clears to CLOSED so it stops
  // showing up as something that still needs attention.
  const handleResolveEodVariance = (id, resolutionNote) => {
    const before = eodRecords.find(r => r.id === id);
    setEodRecords(prev => prev.map(r => (r.id === id ? {
      ...r,
      status: 'CLOSED',
      resolution_note: resolutionNote,
      reviewed_by: user?.name || 'Admin',
      reviewed_at: new Date().toISOString()
    } : r)));
    logAudit('EOD_CLOSURE', id, 'VARIANCE_RESOLVED', `${before?.branch} ${before?.date} — ${resolutionNote}`);
  };

  // Time-boxed exception, common to both paths below: appends one entry to
  // reopen_history — never overwritten — so the record keeps a permanent trail of
  // exactly who unlocked it, when, and for how long, even across repeated grants.
  const grantEodReopenWindow = (id, hours, openedBy) => {
    const openedAt = new Date();
    const expiresAt = new Date(openedAt.getTime() + hours * 60 * 60 * 1000);
    const grant = { opened_by: openedBy, opened_at: openedAt.toISOString(), duration_hours: hours, expires_at: expiresAt.toISOString() };
    setEodRecords(prev => prev.map(r => (r.id === id ? { ...r, reopen_history: [...(r.reopen_history || []), grant] } : r)));
    return grant;
  };

  // Admin self-service: admin doesn't need to ask permission from themselves.
  const handleGrantEodReopen = (id, hours) => {
    const before = eodRecords.find(r => r.id === id);
    const grant = grantEodReopenWindow(id, hours, user?.name || 'Admin');
    logAudit('EOD_CLOSURE', id, 'REOPENED', `${before?.branch} ${before?.date} reopened for ${hours}h`);
  };

  // Everyone else: a closed day can't be edited directly — they submit a reopen
  // request (with a reason and a suggested duration) and wait for an admin to act
  // on it. Nothing unlocks until that approval happens.
  const handleRequestEodReopen = (id, { reason, hours }) => {
    const before = eodRecords.find(r => r.id === id);
    if ((before?.reopen_requests || []).some(r => r.status === 'PENDING')) {
      throw new Error('A reopen request is already pending for this day.');
    }
    const request = {
      id: `RR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      requested_by: user?.name || 'Staff',
      requested_at: new Date().toISOString(),
      reason,
      requested_hours: hours,
      status: 'PENDING'
    };
    setEodRecords(prev => prev.map(r => (r.id === id ? { ...r, reopen_requests: [...(r.reopen_requests || []), request] } : r)));
    logAudit('EOD_REOPEN_REQUEST', request.id, 'CREATE', `${before?.branch} ${before?.date} — ${reason}`);
  };

  // Admin approves a pending request: grants the actual unlock window and marks
  // the request resolved, keeping both records — the request's outcome and the
  // window it produced — instead of collapsing them into one fact.
  const handleApproveEodReopen = (id, requestId, hours) => {
    const before = eodRecords.find(r => r.id === id);
    const grant = grantEodReopenWindow(id, hours, before?.reopen_requests?.find(r => r.id === requestId)?.requested_by || 'Staff');
    setEodRecords(prev => prev.map(r => (r.id === id ? {
      ...r,
      reopen_requests: (r.reopen_requests || []).map(req => (req.id === requestId ? {
        ...req, status: 'APPROVED', decided_by: user?.name || 'Admin', decided_at: new Date().toISOString(), granted_hours: hours
      } : req))
    } : r)));
    logAudit('EOD_REOPEN_REQUEST', requestId, 'APPROVED', `${before?.branch} ${before?.date} — granted ${hours}h`);
  };

  const handleRejectEodReopen = (id, requestId, decisionReason) => {
    const before = eodRecords.find(r => r.id === id);
    setEodRecords(prev => prev.map(r => (r.id === id ? {
      ...r,
      reopen_requests: (r.reopen_requests || []).map(req => (req.id === requestId ? {
        ...req, status: 'REJECTED', decided_by: user?.name || 'Admin', decided_at: new Date().toISOString(), decision_reason: decisionReason
      } : req))
    } : r)));
    logAudit('EOD_REOPEN_REQUEST', requestId, 'REJECTED', `${before?.branch} ${before?.date} — ${decisionReason}`);
  };

  const handleUpdateEodDenominationSettings = (settings) => {
    setEodDenominationSettings(settings);
  };

  // Central audit trail hook — every mutation to a record of consequence (staff
  // permissions, loan schemes, loan closure, collections, branches) writes one
  // entry here with a before/after snapshot, so "who changed what and when" is
  // always answerable without re-deriving it from scattered state history.
  // A short one-line summary of what happened — not a before/after field diff. Nobody
  // reconstructs a record's full prior state from this log; it just answers "who did
  // what, when."
  const logAudit = (entityType, entityId, action, summary) => {
    setAuditLogs(prev => [{
      id: `AL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      entity_type: entityType,
      entity_id: entityId,
      action,
      summary: summary || '',
      actor_name: user?.name || 'System',
      actor_role: user?.role || '',
      created_at: new Date().toISOString()
    }, ...prev]);
  };
  // collections and borrowers both have real backends too — same treatment as
  // loans/schemes above. branchesList's backend (server/src/modules/org) isn't
  // registered yet either, so it keeps its mock seed like employees does.
  const [collections, setCollections] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [kycReviewBorrowerId, setKycReviewBorrowerId] = useState(null);
  const [branchesList, setBranchesList] = useState(INITIAL_BRANCHES);

  // Global branch lock — 'ALL' means every page behaves exactly as it always has
  // (its own independent filter, freely switchable). Any specific branch name means
  // every page's own branch filter is forced to it and disabled — the only way to
  // change it is back through the sidebar control. Persisted so a refresh doesn't
  // silently drop the lock.
  const [selectedBranch, setSelectedBranch] = useState(() => localStorage.getItem('financial_erp_selected_branch') || 'ALL');
  useEffect(() => {
    localStorage.setItem('financial_erp_selected_branch', selectedBranch);
  }, [selectedBranch]);
  const handleChangeBranch = (branchNameOrAll) => setSelectedBranch(branchNameOrAll);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState('');

  // loanSchemes has a real backend now (server/src/finance/scheme) — starts empty
  // and is populated by fetchData()'s /v1/finance/schemes call. No mock fallback:
  // if that call fails, the GlobalErrorBanner is what should tell the user, not a
  // screen quietly showing fake schemes as if they were real. The modules below
  // this one are still pure mock data, local state only, no backend calls.
  const [loanSchemes, setLoanSchemes] = useState([]);
  const [customFormulas, setCustomFormulas] = useState([]);
  const [investors, setInvestors] = useState(INITIAL_INVESTORS);
  const [fixedDeposits, setFixedDeposits] = useState(INITIAL_FIXED_DEPOSITS);
  const [recurringDeposits, setRecurringDeposits] = useState(INITIAL_RECURRING_DEPOSITS);
  const [expenseCategories, setExpenseCategories] = useState(INITIAL_EXPENSE_CATEGORIES);
  const [expenseAllocationRequests, setExpenseAllocationRequests] = useState(INITIAL_EXPENSE_ALLOCATION_REQUESTS);
  const [expenseVouchers, setExpenseVouchers] = useState(INITIAL_EXPENSE_VOUCHERS);
  const [eodRecords, setEodRecords] = useState([]);
  const [eodDenominationSettings, setEodDenominationSettings] = useState(
    [500, 200, 100, 50, 20, 10, 5, 2, 1].map(value => ({ value, enabled: true }))
  );

  // Once a branch's day is closed, nothing dated on that day for that branch can be
  // recorded — the books for that day are frozen. The one way through is an admin
  // granting a time-boxed reopen window (handleGrantEodReopen); once that window's
  // expires_at passes, this goes back to locked automatically without any extra
  // bookkeeping — it's just a timestamp comparison, evaluated fresh every time.
  const isEodLocked = (branch, dateStr) => {
    const record = eodRecords.find(r => r.branch === branch && r.date === dateStr);
    if (!record) return false;
    const activeReopen = (record.reopen_history || []).some(rh => new Date(rh.expires_at).getTime() > Date.now());
    return !activeReopen;
  };

  const assertEodNotLocked = (branch, dateStr) => {
    if (isEodLocked(branch, dateStr)) {
      const err = new Error(`${branch || 'This branch'}'s books for ${dateStr} are closed. Ask an admin to reopen that day before recording this.`);
      err.response = { data: { message: err.message } };
      throw err;
    }
  };

  const [selectedLoanForCollection, setSelectedLoanForCollection] = useState(null);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [quickActionModalType, setQuickActionModalType] = useState(null);

  const navigateTo = (targetPath) => {
    window.history.pushState({}, '', targetPath);
    setPath(targetPath);
  };

  const handleTabChange = (newTab) => {
    setActiveTabState(newTab);
    setKycReviewBorrowerId(null);
    const targetUrl = `/${moduleForTab(newTab)}/${newTab}`;
    navigateTo(targetUrl);
  };

  useEffect(() => {
    const handlePopState = () => {
      const currentPath = window.location.pathname || '/auth/login';
      setPath(currentPath);
      const tabName = stripModulePrefix(currentPath);
      if (tabName) {
        setActiveTabState(tabName);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'SUPER_ADMIN') {
      localStorage.setItem('financial_erp_tenant_id', tenant.id);
      fetchData();
    }
  }, [tenant, isAuthenticated, user]);

  // Promise.allSettled, not Promise.all — /employees has no backend route yet
  // (server/src/modules/employee/employee.routes.js is never registered in app.js),
  // so that call always rejects. With Promise.all, one rejection fails the whole
  // batch and silently skips every setter — loans/collections/borrowers/schemes
  // would never update from real data even though their own calls succeed fine.
  // Each result is now applied independently based on its own outcome.
  const fetchData = async () => {
    const [loansRes, empsRes, colRes, schemesRes, borrowersRes] = await Promise.allSettled([
      api.get('/finance/loans'),
      api.get('/employees'),
      api.get('/finance/collections'),
      api.get('/finance/schemes'),
      api.get('/finance/borrowers')
    ]);
    if (loansRes.status === 'fulfilled' && loansRes.value.data?.data) setLoans(loansRes.value.data.data);
    if (empsRes.status === 'fulfilled' && empsRes.value.data?.data) setEmployees(empsRes.value.data.data);
    if (colRes.status === 'fulfilled' && colRes.value.data?.data) setCollections(colRes.value.data.data);
    if (schemesRes.status === 'fulfilled' && schemesRes.value.data?.data) setLoanSchemes(schemesRes.value.data.data);
    if (borrowersRes.status === 'fulfilled' && borrowersRes.value.data?.data) setBorrowers(borrowersRes.value.data.data);
    fetchOrgHierarchy();
  };

  const fetchOrgHierarchy = async () => {
    setOrgLoading(true);
    setOrgError('');
    try {
      const branchRes = await api.get('/branches');
      setBranchesList(branchRes.data?.data || []);
    } catch (err) {
      console.warn('Using demo organization hierarchy (no backend connected).');
    } finally {
      setOrgLoading(false);
    }
  };

  const handleCreateEmployee = (payload) => {
    const branchIds = payload.branch_ids || [];
    const branches = branchIds.map(id => branchesList.find(b => b.id === id)).filter(Boolean).map(b => ({ id: b.id, name: b.name, code: b.code }));
    const newEmp = {
      id: Date.now(),
      company_id: tenant?.id || 1,
      name: payload.name,
      email: payload.email,
      phone: payload.phone || '',
      role: payload.role,
      enable_auth: payload.enable_auth !== false,
      password: payload.enable_auth ? (payload.password || '') : '',
      photo: payload.photo || null,
      branchScope: branchIds.length ? 'CUSTOM' : 'GLOBAL',
      branch_ids: branchIds,
      branches,
      permissions: []
    };
    setEmployees(prev => [...prev, newEmp]);
    return newEmp;
  };

  const handleUpdateEmployee = (id, payload) => {
    const before = employees.find(e => e.id === id);
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...payload } : e));
    logAudit('EMPLOYEE', id, 'UPDATE', before?.name);
  };

  const handleDeleteEmployee = (id) => {
    const before = employees.find(e => e.id === id);
    setEmployees(prev => prev.filter(e => e.id !== id));
    logAudit('EMPLOYEE', id, 'DELETE', before?.name);
  };

  // No backend table exists yet for the extended company profile fields
  // (gstin/pan/phone/address), so this persists to the in-session tenant
  // state — real for as long as the session lasts, same as the rest of
  // this app's local-mock handlers.
  const handleSaveCompanyProfile = (payload) => {
    setTenant(prev => ({ ...prev, ...payload }));
  };

  const handleCreateBranch = async (payload) => {
    const res = await api.post('/branches', payload);
    const created = res.data?.data;
    if (created) setBranchesList(prev => [...prev, created]);
    return created;
  };

  const handleUpdateBranch = async (id, payload) => {
    const res = await api.put(`/branches/${id}`, payload);
    const updated = res.data?.data;
    if (updated) setBranchesList(prev => prev.map(b => (b.id === id ? updated : b)));
    return updated;
  };

  const handleDeleteBranch = async (id) => {
    await api.delete(`/branches/${id}`);
    setBranchesList(prev => prev.filter(b => b.id !== id));
  };

  // ── Loan Scheme Master (server/src/finance/scheme) ──
  const handleCreateLoanScheme = async (payload) => {
    const res = await api.post('/finance/schemes', payload);
    const created = res.data?.data;
    if (created) {
      setLoanSchemes(prev => [...prev, created]);
      logAudit('LOAN_SCHEME', created.id, 'CREATE', created.name);
    }
    return created;
  };
  const handleUpdateLoanScheme = async (id, payload) => {
    const before = loanSchemes.find(s => s.id === id);
    const res = await api.put(`/finance/schemes/${id}`, payload);
    const updated = res.data?.data;
    if (updated) {
      setLoanSchemes(prev => prev.map(s => (s.id === id ? updated : s)));
      logAudit('LOAN_SCHEME', id, 'UPDATE', updated.name || before?.name);
    }
    return updated;
  };
  const handleDeleteLoanScheme = async (id) => {
    const before = loanSchemes.find(s => s.id === id);
    await api.delete(`/finance/schemes/${id}`);
    setLoanSchemes(prev => prev.filter(s => s.id !== id));
    logAudit('LOAN_SCHEME', id, 'DELETE', before?.name);
  };

  // ── Custom Formula Library (mock-only, no backend) ──
  // A scheme that picks a saved formula COPIES its tokens in at that moment — schemes
  // never hold a live reference to a library entry, so editing/deleting a formula here
  // never retroactively affects any scheme that already picked it (and, further down
  // the chain, a loan's own snapshot already protects it from scheme edits too).
  const handleCreateCustomFormula = (payload) => {
    const newFormula = { id: Date.now(), ...payload };
    setCustomFormulas(prev => [...prev, newFormula]);
    logAudit('CUSTOM_FORMULA', newFormula.id, 'CREATE', newFormula.name);
    return newFormula;
  };
  const handleUpdateCustomFormula = (id, payload) => {
    const before = customFormulas.find(f => f.id === id);
    setCustomFormulas(prev => prev.map(f => (f.id === id ? { ...f, ...payload } : f)));
    logAudit('CUSTOM_FORMULA', id, 'UPDATE', payload.name || before?.name);
  };
  const handleDeleteCustomFormula = (id) => {
    const before = customFormulas.find(f => f.id === id);
    setCustomFormulas(prev => prev.filter(f => f.id !== id));
    logAudit('CUSTOM_FORMULA', id, 'DELETE', before?.name);
  };

  // ── Investor Capital (mock-only, no backend) ──
  // A Master-style record — capital_amount/yield_rate/yield_notes live directly on
  // the investor, not derived from a transaction ledger. A "withdrawal" is just
  // editing capital_amount down and/or setting status to EXITED; a yield payout is
  // just a manual note. Not wired into double-entry accounting at all.
  const handleCreateInvestor = (payload) => {
    const nextSeq = investors.length ? Math.max(...investors.map(i => parseInt((i.investor_code || 'INV-1000').split('-')[1], 10) || 1000)) + 1 : 1001;
    const newInvestor = { id: Date.now(), investor_code: `INV-${nextSeq}`, status: 'ACTIVE', ...payload };
    setInvestors(prev => [...prev, newInvestor]);
  };
  const handleUpdateInvestor = (id, payload) => {
    setInvestors(prev => prev.map(i => (i.id === id ? { ...i, ...payload } : i)));
  };
  const handleDeleteInvestor = (id) => {
    setInvestors(prev => prev.filter(i => i.id !== id));
  };

  // ── Fixed Deposits (mock-only, no backend) ──
  // FD principal in is a liability (owed back to the customer), booked at
  // inception; maturity/premature close pays that liability off plus whatever
  // interest actually accrued, recognised as an expense at payout time rather
  // than accrued daily — same "not fully accrual accounting" simplification the
  // rest of this mock app uses.
  const handleCreateFixedDeposit = (payload) => {
    const nextSeq = fixedDeposits.length ? Math.max(...fixedDeposits.map(f => parseInt((f.fd_account_no || 'FD-2026-000').split('-')[2], 10) || 0)) + 1 : 1;
    const newFd = { id: Date.now(), fd_account_no: `FD-2026-${String(nextSeq).padStart(3, '0')}`, status: 'ACTIVE', ...payload };
    setFixedDeposits(prev => [...prev, newFd]);
    const cashAccount = payload.payment_mode === 'BANK' ? '1002' : '1001';
    postJournal(
      `Fixed deposit booked — ${newFd.fd_account_no} (${newFd.customer_name})`,
      [journalLine(cashAccount, newFd.principal_amount, 0), journalLine('2200', 0, newFd.principal_amount)],
      'FD_BOOKING', newFd.id, newFd.booking_date, payload.branch || null
    );
  };
  const handleMatureFixedDeposit = (id) => {
    const fd = fixedDeposits.find(f => f.id === id);
    if (fd) {
      const interestPortion = Math.max(0, fd.maturity_value - fd.principal_amount);
      const lines = [journalLine('2200', fd.principal_amount, 0)];
      if (interestPortion > 0) lines.push(journalLine('5003', interestPortion, 0));
      lines.push(journalLine('1001', 0, fd.maturity_value));
      postJournal(
        `Fixed deposit matured — ${fd.fd_account_no} (${fd.customer_name})`,
        lines, 'FD_MATURITY', fd.id, new Date().toISOString().slice(0, 10), fd.branch || null
      );
    }
    setFixedDeposits(prev => prev.map(f => (f.id === id ? { ...f, status: 'MATURED' } : f)));
  };
  const handlePrematureCloseFixedDeposit = (id, customPayoutAmount) => {
    const fd = fixedDeposits.find(f => f.id === id);
    if (fd) {
      const defaultPayout = Math.round(fd.maturity_value * 0.98);
      const payout = customPayoutAmount !== undefined && customPayoutAmount !== '' ? Math.round(parseFloat(customPayoutAmount) || 0) : defaultPayout;
      const interestPortion = payout - fd.principal_amount;
      const lines = [journalLine('2200', fd.principal_amount, 0)];
      if (interestPortion > 0) lines.push(journalLine('5003', interestPortion, 0));
      else if (interestPortion < 0) lines.push(journalLine('5003', 0, -interestPortion));
      lines.push(journalLine('1001', 0, payout));
      postJournal(
        `Fixed deposit premature closure — ${fd.fd_account_no} (${fd.customer_name})`,
        lines, 'FD_PREMATURE_CLOSE', fd.id, new Date().toISOString().slice(0, 10), fd.branch || null
      );
      setFixedDeposits(prev => prev.map(f => (f.id === id ? { ...f, status: 'CLOSED_PREMATURE', payout_amount: payout } : f)));
    }
  };

  // ── Recurring Deposits (mock-only, no backend) ──
  // Unlike Fixed Deposits, no cash arrives at account opening — the customer
  // pays a fixed amount every month. Booking just creates the account and its
  // persisted installment schedule (`buildRdInstallments`); nothing is posted
  // to the books until each installment is actually collected below.
  const handleCreateRecurringDeposit = (payload) => {
    const nextSeq = recurringDeposits.length ? Math.max(...recurringDeposits.map(r => parseInt((r.rd_account_no || 'RD-2026-000').split('-')[2], 10) || 0)) + 1 : 1;
    const newRd = {
      id: Date.now(),
      rd_account_no: `RD-2026-${String(nextSeq).padStart(3, '0')}`,
      status: 'ACTIVE',
      collected_amount: 0,
      installments: buildRdInstallments(payload.monthly_installment, payload.tenure_months, payload.booking_date),
      ...payload
    };
    setRecurringDeposits(prev => [...prev, newRd]);
  };
  const handleCollectRdInstallment = (id, monthNo, paymentMode = 'CASH') => {
    const rd = recurringDeposits.find(r => r.id === id);
    if (!rd) return;
    const installment = (rd.installments || []).find(i => i.month_no === monthNo);
    if (!installment || installment.status === 'PAID') return;
    const collectionDate = new Date().toISOString().slice(0, 10);
    const cashAccount = paymentMode === 'BANK' ? '1002' : '1001';
    postJournal(
      `Recurring deposit installment collected — ${rd.rd_account_no} (${rd.customer_name}) — month ${monthNo}`,
      [journalLine(cashAccount, installment.amount, 0), journalLine('2201', 0, installment.amount)],
      'RD_INSTALLMENT', rd.id, collectionDate, rd.branch || null
    );
    setRecurringDeposits(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updatedInstallments = r.installments.map(i => (
        i.month_no === monthNo ? { ...i, status: 'PAID', paid_date: collectionDate } : i
      ));
      return { ...r, installments: updatedInstallments, collected_amount: (r.collected_amount || 0) + installment.amount };
    }));
  };
  const handleMatureRecurringDeposit = (id) => {
    const rd = recurringDeposits.find(r => r.id === id);
    if (rd) {
      const collected = rd.collected_amount || 0;
      const interestPortion = Math.max(0, rd.maturity_value - collected);
      const lines = [journalLine('2201', collected, 0)];
      if (interestPortion > 0) lines.push(journalLine('5004', interestPortion, 0));
      lines.push(journalLine('1001', 0, rd.maturity_value));
      postJournal(
        `Recurring deposit matured — ${rd.rd_account_no} (${rd.customer_name})`,
        lines, 'RD_MATURITY', rd.id, new Date().toISOString().slice(0, 10), rd.branch || null
      );
    }
    setRecurringDeposits(prev => prev.map(r => (r.id === id ? { ...r, status: 'MATURED' } : r)));
  };
  const handlePrematureCloseRecurringDeposit = (id, customPayoutAmount) => {
    const rd = recurringDeposits.find(r => r.id === id);
    if (rd) {
      const collected = rd.collected_amount || 0;
      // Early exit returns what was actually paid in (minus a small penalty),
      // not a share of the full projected maturity value — no bonus interest
      // for an incomplete term.
      const defaultPayout = Math.round(collected * 0.98);
      const payout = customPayoutAmount !== undefined && customPayoutAmount !== '' ? Math.round(parseFloat(customPayoutAmount) || 0) : defaultPayout;
      const diff = payout - collected;
      const lines = [journalLine('2201', collected, 0)];
      if (diff > 0) lines.push(journalLine('5004', diff, 0));
      else if (diff < 0) lines.push(journalLine('5004', 0, -diff));
      lines.push(journalLine('1001', 0, payout));
      postJournal(
        `Recurring deposit premature closure — ${rd.rd_account_no} (${rd.customer_name})`,
        lines, 'RD_PREMATURE_CLOSE', rd.id, new Date().toISOString().slice(0, 10), rd.branch || null
      );
      setRecurringDeposits(prev => prev.map(r => (r.id === id ? { ...r, status: 'CLOSED_PREMATURE', payout_amount: payout } : r)));
    }
  };

  // ── Expense Allocation (mock-only, no backend) ──
  // Categories are funded directly by whoever creates/tops them up — no approval
  // queue. `expenseAllocationRequests` is kept purely as a funding-history log
  // (AccountHistoryModal reads it), every entry already "applied" the moment it's
  // created since there's no pending state left to approve or reject.
  const handleCreateExpenseCategory = (payload) => {
    const catId = Date.now();
    const amount = Number(payload.amount) || 0;
    const newCategory = { id: catId, name: payload.name, status: 'ACTIVE', balance: amount, allocated_total: amount };
    setExpenseCategories(prev => [...prev, newCategory]);
    setExpenseAllocationRequests(prev => [
      {
        id: catId + 1,
        category_id: catId,
        category_name: payload.name,
        type: 'INITIAL',
        amount,
        reason: payload.reason || '',
        requested_by: user?.name || 'Staff',
        requested_at: new Date().toISOString()
      },
      ...prev
    ]);
    logAudit('EXPENSE_CATEGORY', catId, 'CREATE', `${payload.name} funded with ₹${amount.toLocaleString('en-IN')}`);
  };

  const handleUpdateExpenseCategory = (id, payload) => {
    setExpenseCategories(prev => prev.map(c => (c.id === id ? { ...c, name: payload.name } : c)));
  };

  const handleDeleteExpenseCategory = (id) => {
    const category = expenseCategories.find(c => c.id === id);
    if (!category) return;
    if (category.balance > 0) {
      throw new Error(`Cannot delete "${category.name}" — it still has ₹${category.balance.toLocaleString('en-IN')} balance. Spend it down first.`);
    }
    setExpenseCategories(prev => prev.filter(c => c.id !== id));
    logAudit('EXPENSE_CATEGORY', id, 'DELETE', category.name);
  };

  // A funded account running low requests a TOPUP; an ad-hoc urgent need not
  // covered by the normal balance requests EMERGENCY funds — both credit the
  // account's balance immediately, tagged separately just for the history log.
  const handleAddExpenseFunds = (payload) => {
    const category = expenseCategories.find(c => c.id === Number(payload.category_id));
    if (!category) return;
    const amount = Number(payload.amount) || 0;
    setExpenseCategories(prev => prev.map(c => (
      c.id === category.id
        ? { ...c, status: 'ACTIVE', balance: c.balance + amount, allocated_total: c.allocated_total + amount }
        : c
    )));
    setExpenseAllocationRequests(prev => [
      {
        id: Date.now(),
        category_id: category.id,
        category_name: category.name,
        type: payload.type || 'TOPUP',
        amount,
        reason: payload.reason || '',
        requested_by: user?.name || 'Staff',
        requested_at: new Date().toISOString()
      },
      ...prev
    ]);
    logAudit('EXPENSE_CATEGORY', category.id, 'FUNDS_ADDED', `₹${amount.toLocaleString('en-IN')} added to ${category.name}`);
  };

  // ── Expense Vouchers (mock-only, no backend) ──
  // Spending against an already-funded account needs no further approval — the money
  // was pre-authorized when the account was topped up. No negative balances: the actual
  // block happens in the UI (QuickActionModal) before this is ever called, this is a
  // defense-in-depth guard.
  const handleCreateExpenseVoucher = (payload) => {
    const category = expenseCategories.find(c => c.id === Number(payload.category_id));
    const amount = Number(payload.amount) || 0;
    if (!category || category.status !== 'ACTIVE' || amount <= 0 || amount > category.balance) {
      throw new Error('Insufficient balance in this expense account.');
    }
    assertEodNotLocked(payload.branch || user?.branchName || branchesList[0]?.name, new Date().toISOString().slice(0, 10));

    setExpenseCategories(prev => prev.map(c => (
      c.id === category.id ? { ...c, balance: c.balance - amount } : c
    )));

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(expenseVouchers.filter(v => v.voucher_no.includes(today)).length + 1).padStart(2, '0');
    const newVoucher = {
      id: Date.now(),
      voucher_no: `EXP-${today}-${seq}`,
      payee: payload.payee || payload.notes || 'Unnamed Payee',
      category_id: category.id,
      category: category.name,
      amount,
      date: new Date().toISOString().slice(0, 10),
      status: 'APPROVED',
      notes: payload.notes || ''
    };
    setExpenseVouchers(prev => [newVoucher, ...prev]);

    postJournal(
      `Expense voucher ${newVoucher.voucher_no} — ${newVoucher.payee} (${category.name})`,
      [journalLine('5001', amount, 0), journalLine('1001', 0, amount)],
      'EXPENSE', newVoucher.id, newVoucher.date,
      payload.branch || user?.branchName || branchesList[0]?.name
    );
  };

  // ── Customer Directory (mock-only, no backend) ──
  const handleCreateBorrower = (payload) => {
    if (borrowers.some(b => b.phone === payload.phone)) {
      throw { response: { data: { message: 'A customer with this phone number already exists.' } } };
    }
    const nextSeq = borrowers.length
      ? Math.max(...borrowers.map(b => parseInt((b.borrower_code || '').replace(/\D/g, ''), 10) || 0)) + 1
      : 1;
    const created = {
      ...payload,
      id: Date.now(),
      company_id: tenant?.id || 1,
      borrower_code: `BR-${String(nextSeq).padStart(4, '0')}`,
      kyc_status: 'PENDING',
      kyc_verified_at: null,
      status: 'ACTIVE'
    };
    setBorrowers(prev => [created, ...prev]);
    return created;
  };

  const handleUpdateBorrower = (id, payload) => {
    if (borrowers.some(b => b.id !== id && b.phone === payload.phone)) {
      throw { response: { data: { message: 'Another customer already uses this phone number.' } } };
    }
    let updated = null;
    setBorrowers(prev => prev.map(b => {
      if (b.id !== id) return b;
      updated = { ...b, ...payload };
      return updated;
    }));
    return updated;
  };

  const handleDeleteBorrower = (id) => {
    const hasLoans = loans.some(l => {
      const b = borrowers.find(bb => bb.id === id);
      return b && l.phone === b.phone;
    });
    if (hasLoans) {
      throw { response: { data: { message: 'Cannot delete a customer with linked loan accounts.' } } };
    }
    setBorrowers(prev => prev.filter(b => b.id !== id));
  };

  const handleVerifyBorrowerKyc = (id) => {
    let updated = null;
    setBorrowers(prev => prev.map(b => {
      if (b.id !== id) return b;
      updated = { ...b, kyc_status: 'VERIFIED', kyc_verified_at: new Date().toISOString().slice(0, 10) };
      return updated;
    }));
    logAudit('BORROWER', id, 'KYC_VERIFIED', updated?.full_name);
    return updated;
  };

  // Only two states exist — verifying and un-verifying are the same toggle in
  // reverse, with no reason captured (local staff review documents in person;
  // a typed rejection reason was never actually read anywhere in this app).
  const handleRejectBorrowerKyc = (id) => {
    let updated = null;
    setBorrowers(prev => prev.map(b => {
      if (b.id !== id) return b;
      updated = { ...b, kyc_status: 'PENDING', kyc_verified_at: null };
      return updated;
    }));
    logAudit('BORROWER', id, 'KYC_UNVERIFIED', updated?.full_name);
    return updated;
  };

  const handleLoginSuccess = (userData, token) => {
    setUser(userData);
    setTenant({ id: userData.companyId || 1, name: userData.companyName || 'Alpha Financial Services Ltd' });
    setIsAuthenticated(true);
    setIsJumpingTenant(false);

    if (userData.role === 'SUPER_ADMIN') {
      window.history.pushState(null, '', '/auth/superadmin');
      setPath('/auth/superadmin');
    } else {
      navigateTo('/finance/dashboard');
      setActiveTabState('dashboard');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('financial_erp_token');
    localStorage.removeItem('financial_erp_user');
    localStorage.removeItem('financial_erp_tenant_id');
    localStorage.removeItem('financial_erp_db_name');
    setIsAuthenticated(false);
    setUser(null);
    setIsJumpingTenant(false);
    setActiveTabState('dashboard');
    setAuthFlow('COMPANY_CODE');
    setVerifiedCompany(null);
    setSelectedModule(null);
    navigateTo('/auth/login');
  };



  const [disburseModalMode, setDisburseModalMode] = useState('DISBURSE');

  const handleQuickAction = (actionType, payload) => {
    const act = (actionType || '').toUpperCase();
    if (act === 'SUBMIT_APPLICATION' && payload) {
      const schemeId = payload.scheme_id ? Number(payload.scheme_id) : 1;
      const matchedScheme = loanSchemes.find(s => s.id === schemeId);
      const isCustom = matchedScheme?.formula_type === 'CUSTOM';
      const repaymentMethod = resolveSchemeRepaymentMethod(matchedScheme);
      const interestCalculation = resolveSchemeInterestCalculation(matchedScheme);
      const loanDate = new Date().toISOString().slice(0, 10);
      const repaymentFrequency = payload.repayment_frequency || matchedScheme?.repayment_frequency || 'DAILY';

      const newApp = {
        id: Date.now(),
        loan_account_no: `APP-2026-${Math.floor(100 + Math.random() * 900)}`,
        borrower_id: payload.borrower_id ? Number(payload.borrower_id) : null,
        scheme_id: schemeId,
        borrower_name: payload.borrower_name,
        phone: payload.phone,
        branch: 'Main Branch',
        collector: user?.name || 'Admin',
        loan_date: loanDate,
        principal_amount: payload.principal_amount,
        collected_amount: 0,
        pending_amount: payload.principal_amount,
        installment_amount: payload.installment_amount,
        tenure_days: Math.round(payload.tenure_months * 30),
        monthly_interest_rate: payload.monthly_interest_rate,
        repayment_frequency: repaymentFrequency,
        // Custom schemes snapshot their formulas onto the loan at creation — a later
        // edit to the scheme's formula can never retroactively change this loan's math.
        formula_type: isCustom ? 'CUSTOM' : 'STANDARD',
        accrual_mode: isCustom ? matchedScheme.accrual_mode : undefined,
        interest_formula: isCustom ? matchedScheme.interest_formula : undefined,
        installment_formula: isCustom ? matchedScheme.installment_formula : undefined,
        repayment_method: repaymentMethod,
        interest_calculation: isCustom ? 'CUSTOM_FORMULA' : interestCalculation,
        repayment_schedule: isCustom
          ? (matchedScheme.accrual_mode === 'SCHEDULED' ? generateCustomSchedule({
              principal: payload.principal_amount,
              monthlyInterestRate: payload.monthly_interest_rate,
              tenureMonths: payload.tenure_months,
              repaymentFrequency,
              interestFormula: matchedScheme.interest_formula,
              installmentFormula: matchedScheme.installment_formula,
              startDate: loanDate
            }) : null)
          : (repaymentMethod === 'EMI' ? generateEmiSchedule({
              principal: payload.principal_amount,
              monthlyInterestRate: payload.monthly_interest_rate,
              tenureMonths: payload.tenure_months,
              repaymentFrequency,
              interestCalculation,
              startDate: loanDate
            }) : null),
        purpose: payload.purpose,
        nominee: payload.nominee,
        security: payload.security,
        status: 'PENDING'
      };
      newApp.total_payable = estimateCustomTotalPayable(newApp)
        ?? (payload.principal_amount * (1 + (payload.monthly_interest_rate / 100) * payload.tenure_months));
      setLoans(prev => [newApp, ...prev]);
      return;
    }

    if (act === 'APPLICATION') {
      setDisburseModalMode('APPLICATION');
      setIsDisburseModalOpen(true);
    } else if (act === 'LOAN' || act === 'DISBURSE' || act === 'NEW_LOAN') {
      setDisburseModalMode('DISBURSE');
      setIsDisburseModalOpen(true);
    } else if (act === 'COLLECT' || act === 'COLLECTION') {
      const activeLoan = loans.find(l => l.status === 'ACTIVE' || l.status === 'OVERDUE') || loans[0];
      if (activeLoan) setSelectedLoanForCollection(activeLoan);
    } else {
      setQuickActionModalType(actionType);
    }
  };

  const handleQuickActionSubmit = (type, formData) => {
    // BORROWER creation now goes through handleCreateBorrower via CustomerFormPage in BorrowersView.
    if (type === 'EXPENSE') {
      handleCreateExpenseVoucher(formData);
    }
  };

  const handleRecordCollection = async (payload) => {
    const totalAmt = payload.amount;
    const collectionDate = payload.payment_date || payload.collection_date || new Date().toISOString().slice(0, 10);
    assertEodNotLocked(payload.branch || loans.find(l => l.id === payload.loan_id)?.branch, collectionDate);

    // The backend now runs the exact same interest-first allocation engine, so it's
    // authoritative when reachable. If the API call fails (offline demo, no server
    // running), fall back to the split the caller already computed client-side so
    // the flow still completes — recording locally instead of silently losing the
    // payment.
    let principalPaid = payload.principal_portion || 0;
    let interestPaid = payload.interest_portion || 0;
    let newPendingFromServer;
    let synced = false;

    // A custom-formula loan's interest/principal split is computed here on the client
    // by an engine the server has no concept of — the server would run its own,
    // different (and here, wrong) calculation and silently overwrite the correct
    // numbers below if this were allowed to sync. So these loans skip the server call
    // entirely and always use the client-computed split, same as loan schemes are
    // already mock-only/client-authoritative elsewhere in this app.
    const isCustomFormulaLoan = loans.find(l => l.id === payload.loan_id)?.formula_type === 'CUSTOM';

    if (!isCustomFormulaLoan) {
      try {
        const res = await api.post('/finance/collections', {
          loan_id: payload.loan_id,
          amount: totalAmt,
          payment_mode: payload.payment_mode || 'CASH',
          notes: payload.notes || '',
          payment_date: collectionDate
        });
        const data = res.data?.data;
        if (data) {
          principalPaid = data.principal_portion;
          interestPaid = data.interest_portion;
          newPendingFromServer = data.new_pending_balance;
          synced = true;
        }
      } catch (err) {
        console.warn('Collection not synced to server — recording locally only:', err.message);
      }
    }

    // One voucher number for the whole transaction — it's minted here so the
    // same id ends up on both the collection record and the auto-voucher
    // journal entry posted below, instead of each side generating its own
    // separate number (the old REC-xxxx "receipt no" concept).
    const voucherNo = generateVoucherNo();
    const penaltyAmt = payload.penalty || 0;

    const newReceipt = {
      id: Date.now(),
      loan_id: payload.loan_id,
      borrower_name: payload.borrower_name || selectedLoanForCollection?.borrower_name || 'Borrower',
      loan_account_no: payload.loan_account_no || '',
      collector_name: payload.collector_name || user?.name || 'Collector',
      amount: totalAmt,
      principalPaid,
      interestPaid,
      penalty: penaltyAmt,
      newPrincipalBalance: newPendingFromServer !== undefined ? newPendingFromServer : payload.new_principal_balance,
      payment_mode: payload.payment_mode || 'CASH',
      reference_no: payload.reference_no || '',
      bank_name: payload.bank_name || '',
      branch: payload.branch || '',
      received_at: payload.received_at || 'BRANCH_COUNTER',
      notes: payload.notes || '',
      voucher_no: voucherNo,
      collection_date: collectionDate,
      synced,
      // Proof-of-payment + field GPS stamp — both optional; nothing blocks
      // posting if the browser denies location or staff skips the photo.
      proof_image: payload.proof_image || null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      // Cheques don't clear the moment they're handed over — they sit
      // PENDING_CLEARANCE until an admin marks them Cleared or Bounced.
      // Every other mode settles instantly.
      clearance_status: (payload.payment_mode || 'CASH') === 'CHEQUE' ? 'PENDING_CLEARANCE' : 'CLEARED',
      voided: false
    };

    setLoans(prev => prev.map(l => {
      if (l.id !== payload.loan_id) return l;

      const newPending = newPendingFromServer !== undefined
        ? newPendingFromServer
        : (payload.new_principal_balance !== undefined
          ? payload.new_principal_balance
          : Math.max(0, l.pending_amount - principalPaid));

      const isFullyPaid = newPending <= 0;
      const updated = {
        ...l,
        collected_amount: l.collected_amount + totalAmt + penaltyAmt,
        pending_amount: newPending,
        // Next collection's interest-first allocation accrues from this date
        // (used by the Interest-Only strategies; harmless no-op for EMI loans).
        last_payment_date: collectionDate,
        // EMI loans track progress against their fixed schedule instead.
        ...(payload.updated_schedule ? { repayment_schedule: payload.updated_schedule } : {})
      };

      if (!isFullyPaid) {
        return { ...updated, status: 'ACTIVE' };
      }

      // Fully paid — don't auto-close. Send it to Admin as a closure request with
      // the complete payment history and amounts attached, so closing an account
      // always has a review step instead of happening silently on the last rupee.
      const fullHistory = [newReceipt, ...collections.filter(c => c.loan_id === l.id)];
      return {
        ...updated,
        status: 'PENDING_CLOSURE',
        closure_requested_at: collectionDate,
        closure_requested_by: payload.collector_name || user?.name || 'Collector',
        closure_rejection_reason: null,
        closure_snapshot: {
          principal_amount: l.principal_amount,
          total_collected: updated.collected_amount,
          total_payments: fullHistory.length,
          payment_history: fullHistory
        }
      };
    }));

    setCollections(prev => [newReceipt, ...prev]);
    logAudit('COLLECTION', newReceipt.id, 'PAYMENT_RECORDED', `₹${totalAmt.toLocaleString('en-IN')} for loan #${payload.loan_id} (${newReceipt.payment_mode})`);

    // Cash in from the borrower splits straight back out to what it settles: the
    // loan principal outstanding, interest earned, and any penalty — interest and
    // penalty are earned revenue the moment they're collected, principal just
    // reduces the asset already on the books from disbursal.
    const glLines = [journalLine('1001', totalAmt + penaltyAmt, 0)];
    if (principalPaid > 0) glLines.push(journalLine('1200', 0, principalPaid));
    if (interestPaid > 0) glLines.push(journalLine('4001', 0, interestPaid));
    if (penaltyAmt > 0) glLines.push(journalLine('4002', 0, penaltyAmt));
    postJournal(
      `Collection received — ${newReceipt.loan_account_no || 'Loan #' + payload.loan_id} (${newReceipt.borrower_name})`,
      glLines, 'COLLECTION', newReceipt.id, collectionDate,
      payload.branch || loans.find(l => l.id === payload.loan_id)?.branch,
      undefined, undefined, voucherNo
    );

    return { data: newReceipt };
  };

  // Shared undo path for a collection that turns out to be wrong — a straight
  // void, or a cheque that bounced after it had already reduced the loan
  // balance. Puts the principal back on the loan, pulls collected_amount back
  // down, reopens the loan if this payment was the one that sent it to
  // PENDING_CLOSURE, and posts an exact mirror-image reversing journal entry
  // instead of editing the original one (so the ledger keeps both sides).
  const reverseCollectionEffects = (collection, narrationPrefix) => {
    const loan = loans.find(l => l.id === collection.loan_id);
    const principalPaid = Math.round((collection.principalPaid || 0) * 100) / 100;
    const interestPaid = Math.round((collection.interestPaid || 0) * 100) / 100;
    const penaltyAmt = Math.round((collection.penalty || 0) * 100) / 100;
    // The cash side is derived from the SAME numbers as the debit lines below
    // (never from collection.amount independently) — that guarantees this
    // entry balances even if a historical record's `amount` field ever drifts
    // from its principal+interest split, since buildJournalEntry throws on
    // any mismatch and there's no error boundary catching a render crash.
    const totalAmt = principalPaid + interestPaid;

    setLoans(prev => prev.map(l => (l.id === collection.loan_id ? {
      ...l,
      pending_amount: l.pending_amount + principalPaid,
      collected_amount: Math.max(0, l.collected_amount - totalAmt - penaltyAmt),
      status: l.status === 'PENDING_CLOSURE' ? 'ACTIVE' : l.status
    } : l)));

    const glLines = [];
    if (principalPaid > 0) glLines.push(journalLine('1200', principalPaid, 0));
    if (interestPaid > 0) glLines.push(journalLine('4001', interestPaid, 0));
    if (penaltyAmt > 0) glLines.push(journalLine('4002', penaltyAmt, 0));
    if (totalAmt + penaltyAmt > 0) glLines.push(journalLine('1001', 0, totalAmt + penaltyAmt));
    if (glLines.length > 0) {
      postJournal(
        `${narrationPrefix} — ${collection.loan_account_no || 'Loan #' + collection.loan_id} (${collection.borrower_name})`,
        glLines, 'COLLECTION_REVERSAL', collection.id, new Date().toISOString().slice(0, 10),
        collection.branch || loan?.branch
      );
    }
  };

  // Admin/manager correction path: the collection stays on record (struck
  // through, tagged REVERTED) instead of being deleted, so the audit trail
  // always shows both the original entry and the fact that it was undone,
  // by whom, and why.
  const handleRevertCollection = (collectionId, reason) => {
    const collection = collections.find(c => c.id === collectionId);
    if (!collection || collection.reverted) return;
    reverseCollectionEffects(collection, 'Collection reverted');
    setCollections(prev => prev.map(c => (c.id === collectionId ? {
      ...c, reverted: true, revert_reason: reason, reverted_by: user?.name || 'Admin', reverted_at: new Date().toISOString()
    } : c)));
    logAudit('COLLECTION', collectionId, 'REVERTED', `${collection.loan_account_no || 'Loan #' + collection.loan_id} — ${reason}`);
  };

  // Metadata-only correction — payment mode, reference no, collector, date,
  // notes. Deliberately does NOT touch the amount/principal/interest split:
  // that would require re-running the allocation engine and re-posting the
  // journal, so a wrong amount goes through Revert + a fresh entry instead.
  const handleUpdateCollection = (collectionId, updates) => {
    const before = collections.find(c => c.id === collectionId);
    if (!before) return;
    const wasCheque = before.payment_mode === 'CHEQUE';
    const isCheque = updates.payment_mode === 'CHEQUE';
    let clearanceUpdate = {};
    if (!wasCheque && isCheque) clearanceUpdate = { clearance_status: 'PENDING_CLEARANCE' };
    else if (wasCheque && !isCheque) clearanceUpdate = { clearance_status: 'CLEARED' };

    setCollections(prev => prev.map(c => (c.id === collectionId ? {
      ...c,
      payment_mode: updates.payment_mode,
      reference_no: updates.reference_no,
      collector_name: updates.collector_name,
      collection_date: updates.collection_date,
      branch: updates.branch,
      notes: updates.notes,
      ...clearanceUpdate,
      edited_by: user?.name || 'Admin',
      edited_at: new Date().toISOString()
    } : c)));
    logAudit('COLLECTION', collectionId, 'UPDATE', before.loan_account_no || `Loan #${before.loan_id}`);
  };

  const handleMarkChequeCleared = (collectionId) => {
    const before = collections.find(c => c.id === collectionId);
    setCollections(prev => prev.map(c => (c.id === collectionId ? {
      ...c, clearance_status: 'CLEARED', cleared_by: user?.name || 'Admin', cleared_at: new Date().toISOString()
    } : c)));
    logAudit('COLLECTION', collectionId, 'CHEQUE_CLEARED', before?.loan_account_no || `Loan #${before?.loan_id}`);
  };

  // A bounced cheque never actually settled — reverse it exactly like a void,
  // but keep the distinct BOUNCED status/reason so it's clear this wasn't a
  // data-entry correction but a real failed payment.
  const handleMarkChequeBounced = (collectionId, reason) => {
    const collection = collections.find(c => c.id === collectionId);
    if (!collection || collection.clearance_status === 'BOUNCED') return;
    reverseCollectionEffects(collection, 'Cheque bounced — collection reversed');
    setCollections(prev => prev.map(c => (c.id === collectionId ? {
      ...c, clearance_status: 'BOUNCED', bounce_reason: reason, bounced_by: user?.name || 'Admin', bounced_at: new Date().toISOString()
    } : c)));
    logAudit('COLLECTION', collectionId, 'CHEQUE_BOUNCED', `${collection.loan_account_no || 'Loan #' + collection.loan_id} — ${reason}`);
  };

  const handleDisburseLoan = (form) => {
    const mRate = parseFloat(form.monthly_interest_rate || form.interest_rate) || 2.0;
    const months = (form.tenure_days / 30) || 4;
    const isApplication = form.mode === 'APPLICATION';

    // Link to an existing Customer Directory record by phone, if one exists.
    const matchedBorrower = borrowers.find(b => b.phone === form.phone);
    const matchedScheme = loanSchemes.find(s => s.id === (form.scheme_id ? Number(form.scheme_id) : loanSchemes[0]?.id));
    const isCustom = matchedScheme?.formula_type === 'CUSTOM';
    const repaymentMethod = resolveSchemeRepaymentMethod(matchedScheme);
    const interestCalculation = resolveSchemeInterestCalculation(matchedScheme);
    const loanDate = new Date().toISOString().slice(0, 10);
    const repaymentFrequency = matchedScheme?.repayment_frequency || 'DAILY';

    if (!isApplication) {
      assertEodNotLocked(matchedBorrower?.branch || 'Main Branch', loanDate);
    }

    const newLoan = {
      id: Date.now(),
      loan_account_no: isApplication
        ? `APP-2026-${Math.floor(100 + Math.random() * 900)}`
        : `LN-2026-${Math.floor(100 + Math.random() * 900)}`,
      borrower_id: matchedBorrower?.id || null,
      scheme_id: form.scheme_id ? Number(form.scheme_id) : loanSchemes[0]?.id || null,
      borrower_name: form.borrower_name,
      phone: form.phone,
      branch: matchedBorrower?.branch || 'Main Branch',
      collector: user?.name || 'Admin',
      loan_date: loanDate,
      next_due: new Date().toISOString().slice(0, 10),
      principal_amount: parseFloat(form.principal_amount),
      collected_amount: 0,
      pending_amount: parseFloat(form.principal_amount),
      installment_amount: parseFloat(form.installment_amount),
      tenure_days: parseInt(form.tenure_days),
      monthly_interest_rate: mRate,
      repayment_frequency: repaymentFrequency,
      // Custom schemes snapshot their formulas onto the loan at creation — a later
      // edit to the scheme's formula can never retroactively change this loan's math.
      formula_type: isCustom ? 'CUSTOM' : 'STANDARD',
      accrual_mode: isCustom ? matchedScheme.accrual_mode : undefined,
      interest_formula: isCustom ? matchedScheme.interest_formula : undefined,
      installment_formula: isCustom ? matchedScheme.installment_formula : undefined,
      repayment_method: repaymentMethod,
      interest_calculation: isCustom ? 'CUSTOM_FORMULA' : interestCalculation,
      repayment_schedule: isCustom
        ? (matchedScheme.accrual_mode === 'SCHEDULED' ? generateCustomSchedule({
            principal: parseFloat(form.principal_amount),
            monthlyInterestRate: mRate,
            tenureMonths: months,
            repaymentFrequency,
            interestFormula: matchedScheme.interest_formula,
            installmentFormula: matchedScheme.installment_formula,
            startDate: loanDate
          }) : null)
        : (repaymentMethod === 'EMI' ? generateEmiSchedule({
            principal: parseFloat(form.principal_amount),
            monthlyInterestRate: mRate,
            tenureMonths: months,
            repaymentFrequency,
            interestCalculation,
            startDate: loanDate
          }) : null),
      aadhaar: matchedBorrower?.aadhaar_number || '',
      pan: matchedBorrower?.pan_number || '',
      guarantor: matchedBorrower?.guarantor_name || 'Self',
      purpose: form.purpose || '',
      status: isApplication ? 'PENDING' : 'ACTIVE'
    };
    newLoan.total_payable = estimateCustomTotalPayable(newLoan)
      ?? (parseFloat(form.principal_amount) * (1 + (mRate / 100) * months));

    setLoans(prev => [newLoan, ...prev]);

    // Cash actually leaves the vault only on a real disbursal, not when an
    // application is merely submitted for approval — an APPLICATION here has no
    // cash movement yet, so no journal entry until it's approved and disbursed.
    if (!isApplication) {
      postJournal(
        `Loan disbursed — ${newLoan.loan_account_no} (${newLoan.borrower_name})`,
        [journalLine('1200', newLoan.principal_amount, 0), journalLine('1001', 0, newLoan.principal_amount)],
        'DISBURSAL', newLoan.id, loanDate, newLoan.branch
      );
    }
  };

  const handleApproveApplication = (loanId) => {
    setLoans(prev => prev.map(l => (
      l.id === loanId
        // A custom-formula loan already has a correctly-computed total_payable from
        // submission (estimateCustomTotalPayable) — approval must not clobber it with
        // this flat estimate, which only applies to standard schemes.
        ? { ...l, status: 'APPROVED', loan_account_no: l.loan_account_no.replace('APP-', 'LN-'), total_payable: l.formula_type === 'CUSTOM' ? l.total_payable : l.principal_amount * 1.1, next_due: new Date().toISOString().slice(0, 10) }
        : l
    )));
  };

  const handleRejectApplication = (loanId, reason) => {
    setLoans(prev => prev.map(l => (
      l.id === loanId ? { ...l, status: 'REJECTED', rejection_reason: reason || 'Not specified' } : l
    )));
  };

  const handleRevertApplication = (loanId) => {
    setLoans(prev => prev.map(l => (
      l.id === loanId ? { ...l, status: 'PENDING', rejection_reason: null } : l
    )));
  };

  // A loan that's been fully paid off doesn't close itself — it goes to Admin as a
  // closure request (with the full payment history attached) and only becomes
  // CLOSED once approved. Prevents a mis-entered collection from silently closing
  // an account with no review step.
  const handleApproveLoanClosure = (loanId) => {
    const before = loans.find(l => l.id === loanId);
    setLoans(prev => prev.map(l => (
      l.id === loanId
        ? { ...l, status: 'CLOSED', closed_at: new Date().toISOString().slice(0, 10), closed_by: user?.name || 'Admin' }
        : l
    )));
    logAudit('LOAN', loanId, 'CLOSURE_APPROVED', before?.loan_account_no);
  };

  const handleRejectLoanClosure = (loanId, reason) => {
    const before = loans.find(l => l.id === loanId);
    setLoans(prev => prev.map(l => (
      l.id === loanId
        ? { ...l, status: 'ACTIVE', closure_rejection_reason: reason || 'Not specified', closure_requested_at: null, closure_requested_by: null }
        : l
    )));
    logAudit('LOAN', loanId, 'CLOSURE_REJECTED', `${before?.loan_account_no} — ${reason || 'Not specified'}`);
  };

  // Role-based save (from the global Roles & Permissions matrix, not tied to one
  // employee): bulk-applies to every employee currently holding that role, so it
  // overwrites any per-employee custom permissions previously set for them. Editing
  // one employee's custom permissions goes through handleUpdateEmployee instead,
  // which only ever touches that single employee.
  const handleSavePermissions = (roleKey, permissionsMap) => {
    const employeeRole = roleKey === 'SUPER_ADMIN' ? 'ADMIN' : roleKey;
    setEmployees(prev => prev.map(emp =>
      emp.role === employeeRole ? { ...emp, permissions: permissionsMap } : emp
    ));
  };

  const getSettingsSubTab = (tabStr) => {
    if (tabStr.includes('interest-details')) return 'interest-details';
    if (tabStr.includes('customer-details')) return 'customer-details';
    if (tabStr.includes('org-hierarchy')) return 'org-hierarchy';
    if (tabStr.includes('accounting-masters')) return 'accounting-masters';
    if (tabStr.includes('interest')) return 'interest-details';
    if (tabStr.includes('staff')) return 'staff-directory';
    if (tabStr.includes('rbac')) return 'rbac-matrix';
    if (tabStr.includes('company')) return 'company-info';
    return 'interest-details';
  };

  // Route 0: Page Reload / Refresh Splash Loader
  // Before a module is known, the loader carries the platform brand only.
  // Once a user is authenticated (module + company known), it carries that context instead.
  if (isInitialLoading) {
    const loaderTitle = isAuthenticated && user?.moduleName ? user.moduleName : 'Knock The Globe Technologies Pvt. Ltd.';
    const loaderSub = isAuthenticated && user?.moduleName ? (user.companyName || tenant.name) : 'Company Code';
    return (
      <div className="app-page-loader">
        <div className="app-page-loader__card">
          <span className="loader" style={{ '--size': '1.1px' }}></span>
          <div className="app-page-loader__title">{loaderTitle}</div>
          <div className="app-page-loader__sub">{loaderSub}</div>
        </div>
      </div>
    );
  }

  // Route 1: Dedicated Super Admin Login Page (/auth/superadmin or /auth/superadmin/login).
  if (!isAuthenticated && (path === '/auth/superadmin' || path === '/auth/superadmin/login')) {
    return <SuperAdminLoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Guard: If trying to access /auth/superadmin while authenticated as non-Super-Admin
  if (isAuthenticated && (path === '/auth/superadmin' || path === '/auth/superadmin/login') && user?.role !== 'SUPER_ADMIN') {
    return <SuperAdminLoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Route 2: Company Code -> Credentials Login for unauthenticated users
  if (!isAuthenticated) {
    const effectiveAuthFlow = authFlow === 'LOGIN' && !verifiedCompany
      ? 'COMPANY_CODE'
      : authFlow;

    if (effectiveAuthFlow === 'COMPANY_CODE' || !verifiedCompany) {
      return (
        <CompanyCodePage
          onVerified={(company) => {
            setVerifiedCompany(company);
            setSelectedModule({ id: 'financial-erp', title: 'Financial ERP' });
            setAuthFlow('LOGIN');
          }}
        />
      );
    }

    return (
      <LoginPage
        company={verifiedCompany}
        module={selectedModule || { id: 'financial-erp', title: 'Financial ERP' }}
        onLoginSuccess={handleLoginSuccess}
        onBackToModules={() => {
          setVerifiedCompany(null);
          setSelectedModule(null);
          setAuthFlow('COMPANY_CODE');
        }}
      />
    );
  }

  // Route 3: Render Super Admin Portal ONLY when authenticated as SUPER_ADMIN
  if (isAuthenticated && user?.role === 'SUPER_ADMIN') {
    return (
      <SuperAdminPortal
        user={user}
        onSignOut={handleSignOut}
      />
    );
  }

  // Route 4: Render Primary Operational Workspace
  return (
    <AppLayout
      activeTab={activeTab}
      setActiveTab={handleTabChange}
      tenant={tenant}
      user={user}
      onSignOut={handleSignOut}
      branchesList={branchesList}
      selectedBranch={selectedBranch}
      onChangeBranch={handleChangeBranch}
    >


      {/* Dashboard Overview Tab */}
      {activeTab === 'dashboard' && (
        <DashboardOverviewView
          loans={loans}
          collections={collections}
          borrowers={borrowers}
          branchesList={branchesList}
          user={user}
          selectedBranch={selectedBranch}
          onQuickAction={handleQuickAction}
          onOpenCollectDrawer={(loan) => setSelectedLoanForCollection(loan)}
        />
      )}

      {/* Unified Loans Register (Active / Applications / Closed / Closure Requests) */}
      {(activeTab.includes('active-loans') || activeTab.includes('closed-loans') || activeTab.includes('loans-register') || activeTab.includes('loan-applications')) && (
        <LoansView
          loans={loans}
          borrowers={borrowers}
          loanSchemes={loanSchemes}
          receipts={collections}
          activeTab={activeTab}
          branches={branchesList}
          selectedBranch={selectedBranch}
          onCreateBorrower={handleCreateBorrower}
          onQuickAction={handleQuickAction}
          onApproveApplication={handleApproveApplication}
          onRejectApplication={handleRejectApplication}
          onRevertApplication={handleRevertApplication}
          onApproveLoanClosure={handleApproveLoanClosure}
          onRejectLoanClosure={handleRejectLoanClosure}
        />
      )}

      {/* Investor Capital */}
      {activeTab === 'investor-capital' && (
        <InvestorCapitalView
          investors={investors}
          branchesList={branchesList}
          selectedBranch={selectedBranch}
          onCreateInvestor={handleCreateInvestor}
          onUpdateInvestor={handleUpdateInvestor}
          onDeleteInvestor={handleDeleteInvestor}
        />
      )}

      {/* Fixed Deposits */}
      {activeTab === 'fixed-deposits' && (
        <FixedDepositsView
          fixedDeposits={fixedDeposits}
          borrowers={borrowers}
          tenant={tenant}
          branchesList={branchesList}
          selectedBranch={selectedBranch}
          onCreateFd={handleCreateFixedDeposit}
          onMatureFd={handleMatureFixedDeposit}
          onPrematureCloseFd={handlePrematureCloseFixedDeposit}
        />
      )}

      {/* Recurring Deposits */}
      {activeTab === 'recurring-deposits' && (
        <RecurringDepositsView
          recurringDeposits={recurringDeposits}
          borrowers={borrowers}
          branchesList={branchesList}
          selectedBranch={selectedBranch}
          onCreateRd={handleCreateRecurringDeposit}
          onCollectInstallment={handleCollectRdInstallment}
          onMatureRd={handleMatureRecurringDeposit}
          onPrematureCloseRd={handlePrematureCloseRecurringDeposit}
        />
      )}

      {/* Daily Collections Drawer & Vouchers */}
      {(activeTab === 'loan-management/collections' || activeTab === 'collections') && (
        <DailyCollectionsView
          collections={collections}
          loans={loans}
          borrowers={borrowers}
          loanSchemes={loanSchemes}
          user={user}
          tenant={tenant}
          branchesList={branchesList}
          selectedBranch={selectedBranch}
          onOpenCollectDrawer={(loan) => setSelectedLoanForCollection(loan)}
          onRecordCollection={handleRecordCollection}
          onQuickAction={handleQuickAction}
          onRevertCollection={handleRevertCollection}
          onUpdateCollection={handleUpdateCollection}
          onMarkChequeCleared={handleMarkChequeCleared}
          onMarkChequeBounced={handleMarkChequeBounced}
        />
      )}

      {/* Finance & Accounting — each menu item is its own standalone page */}
      {(activeTab.includes('general-ledger') || activeTab === 'finance' || activeTab === 'finance-accounting') && (
        <GeneralLedgerView chartOfAccounts={chartOfAccounts} journalEntries={journalEntries} branchesList={branchesList} selectedBranch={selectedBranch} />
      )}
      {(activeTab.includes('loan-ledger')) && (
        <LoanLedgerView loans={loans} collections={collections} branchesList={branchesList} selectedBranch={selectedBranch} />
      )}
      {(activeTab.includes('customer-ledger')) && (
        <CustomerLedgerView borrowers={borrowers} loans={loans} collections={collections} branchesList={branchesList} selectedBranch={selectedBranch} />
      )}
      {(activeTab.includes('trial-balance')) && (
        <TrialBalanceView chartOfAccounts={chartOfAccounts} journalEntries={journalEntries} branchesList={branchesList} selectedBranch={selectedBranch} />
      )}
      {(activeTab.includes('auto-vouchers')) && (
        <AutoVouchersView journalEntries={journalEntries} branchesList={branchesList} chartOfAccounts={chartOfAccounts} tenant={tenant} selectedBranch={selectedBranch} />
      )}
      {(activeTab.includes('manual-vouchers')) && (
        <ManualVouchersView
          journalEntries={journalEntries}
          chartOfAccounts={chartOfAccounts}
          branchesList={branchesList}
          employees={employees}
          expenseCategories={expenseCategories}
          tenant={tenant}
          selectedBranch={selectedBranch}
          onCreateManualVoucher={handleCreateManualVoucher}
        />
      )}
      {(activeTab.includes('eod-process')) && (
        <EODProcessView
          branchesList={branchesList}
          selectedBranch={selectedBranch}
          journalEntries={journalEntries}
          chartOfAccounts={chartOfAccounts}
          eodRecords={eodRecords}
          eodDenominationSettings={eodDenominationSettings}
          user={user}
          onCloseEodDay={handleCloseEodDay}
          onUpdateEodRecord={handleUpdateEodRecord}
          onResolveEodVariance={handleResolveEodVariance}
          onGrantEodReopen={handleGrantEodReopen}
          onRequestEodReopen={handleRequestEodReopen}
          onApproveEodReopen={handleApproveEodReopen}
          onRejectEodReopen={handleRejectEodReopen}
          onUpdateEodDenominationSettings={handleUpdateEodDenominationSettings}
        />
      )}
      {(activeTab.includes('customer-details')) && (
        kycReviewBorrowerId ? (
          <CustomerKycReviewPage
            borrower={borrowers.find(b => b.id === kycReviewBorrowerId)}
            onBack={() => setKycReviewBorrowerId(null)}
            onVerify={handleVerifyBorrowerKyc}
            onReject={handleRejectBorrowerKyc}
          />
        ) : (
          <BorrowersView
            borrowers={borrowers}
            loans={loans}
            branches={branchesList}
            selectedBranch={selectedBranch}
            onCreateBorrower={handleCreateBorrower}
            onUpdateBorrower={handleUpdateBorrower}
            onDeleteBorrower={handleDeleteBorrower}
            onOpenKycReview={(b) => setKycReviewBorrowerId(b.id)}
          />
        )
      )}

      {/* Reports Module — each report is a standalone read-only page */}
      {(activeTab.includes('reports/loan-portfolio')) && (
        <LoanPortfolioReportView loans={loans} branchesList={branchesList} journalEntries={journalEntries} tenant={tenant} user={user} selectedBranch={selectedBranch} />
      )}
      {(activeTab.includes('reports/collections')) && (
        <CollectionsReportView collections={collections} loans={loans} branchesList={branchesList} journalEntries={journalEntries} tenant={tenant} user={user} selectedBranch={selectedBranch} />
      )}
      {(activeTab.includes('reports/borrower-kyc')) && (
        <BorrowerKycReportView borrowers={borrowers} loans={loans} branchesList={branchesList} tenant={tenant} user={user} selectedBranch={selectedBranch} />
      )}
      {(activeTab.includes('reports/investor-capital')) && (
        <InvestorCapitalReportView investors={investors} tenant={tenant} user={user} />
      )}
      {(activeTab.includes('reports/fixed-deposits')) && (
        <FixedDepositReportView fixedDeposits={fixedDeposits} borrowers={borrowers} tenant={tenant} user={user} />
      )}
      {(activeTab.includes('reports/recurring-deposits')) && (
        <RecurringDepositReportView recurringDeposits={recurringDeposits} borrowers={borrowers} tenant={tenant} user={user} />
      )}
      {(activeTab.includes('reports/financial-statements')) && (
        <FinancialStatementsReportView chartOfAccounts={chartOfAccounts} journalEntries={journalEntries} branchesList={branchesList} tenant={tenant} user={user} selectedBranch={selectedBranch} />
      )}
      {(activeTab.includes('reports/staff-performance')) && (
        <StaffPerformanceReportView employees={employees} loans={loans} collections={collections} branchesList={branchesList} journalEntries={journalEntries} tenant={tenant} user={user} selectedBranch={selectedBranch} />
      )}

      {/* Master Settings Module */}
      {(activeTab.startsWith('master-settings') || activeTab.startsWith('settings') || activeTab === 'employees') && !activeTab.includes('customer-details') && (
        kycReviewBorrowerId ? (
          <CustomerKycReviewPage
            borrower={borrowers.find(b => b.id === kycReviewBorrowerId)}
            onBack={() => setKycReviewBorrowerId(null)}
            onVerify={handleVerifyBorrowerKyc}
            onReject={handleRejectBorrowerKyc}
          />
        ) : (
          <MasterSettingsView
            initialTab={getSettingsSubTab(activeTab)}
            tenant={tenant}
            user={user}
            employees={employees}
            onSavePermissions={handleSavePermissions}
            onCreateEmployee={handleCreateEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onQuickAction={handleQuickAction}
            borrowers={borrowers}
            loans={loans}
            onCreateBorrower={handleCreateBorrower}
            onUpdateBorrower={handleUpdateBorrower}
            onDeleteBorrower={handleDeleteBorrower}
            onOpenKycReview={(b) => setKycReviewBorrowerId(b.id)}
            branchesList={branchesList}
            orgLoading={orgLoading}
            orgError={orgError}
            onCreateBranch={handleCreateBranch}
            onUpdateBranch={handleUpdateBranch}
            onDeleteBranch={handleDeleteBranch}
            onSaveCompanyProfile={handleSaveCompanyProfile}
            loanSchemes={loanSchemes}
            onCreateLoanScheme={handleCreateLoanScheme}
            onUpdateLoanScheme={handleUpdateLoanScheme}
            onDeleteLoanScheme={handleDeleteLoanScheme}
            customFormulas={customFormulas}
            onCreateCustomFormula={handleCreateCustomFormula}
            onUpdateCustomFormula={handleUpdateCustomFormula}
            onDeleteCustomFormula={handleDeleteCustomFormula}
            expenseCategories={expenseCategories}
            onCreateExpenseCategory={handleCreateExpenseCategory}
            onUpdateExpenseCategory={handleUpdateExpenseCategory}
            onDeleteExpenseCategory={handleDeleteExpenseCategory}
            expenseAllocationRequests={expenseAllocationRequests}
            onAddExpenseFunds={handleAddExpenseFunds}
          />
        )
      )}

      {/* Collection Drawer */}
      <CollectionDrawer
        isOpen={Boolean(selectedLoanForCollection)}
        onClose={() => setSelectedLoanForCollection(null)}
        loan={selectedLoanForCollection}
        borrowers={borrowers}
        allLoans={loans}
        branchesList={branchesList}
        currentUserName={user?.name}
        tenant={tenant}
        onSubmit={handleRecordCollection}
      />

      {/* New Loan Disbursal Modal / Application Modal */}
      <NewLoanModal
        isOpen={isDisburseModalOpen}
        mode={disburseModalMode}
        loanSchemes={loanSchemes}
        onClose={() => setIsDisburseModalOpen(false)}
        onSubmit={handleDisburseLoan}
      />

      {/* Quick Action Modal */}
      <QuickActionModal
        type={quickActionModalType}
        isOpen={Boolean(quickActionModalType)}
        onClose={() => setQuickActionModalType(null)}
        onSubmit={handleQuickActionSubmit}
        expenseCategories={expenseCategories}
      />
    </AppLayout>
  );
}
