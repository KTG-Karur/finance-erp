import React, { useState, useEffect } from 'react';
import AppLayout from './layouts/AppLayout';
import CompanyCodePage from './auth/CompanyCodePage';
import LoginPage from './auth/LoginPage';
import SuperAdminLoginPage from './auth/SuperAdminLoginPage';
import SuperAdminPortal from './auth/SuperAdminPortal';
import DashboardOverviewView from './finance/dashboard/DashboardOverviewView';
import BorrowersView from './finance/borrowers/BorrowersView';
import LoansView from './finance/loan/LoansView';
import LoanApplicationsView from './finance/loan/LoanApplicationsView';
import EstimationView from './finance/estimation/EstimationView';
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
import BranchExpenseTrackerView from './finance/expenses/BranchExpenseTrackerView';
import EODProcessView from './finance/accounting/EODProcessView';
import LoanPortfolioReportView from './reports/LoanPortfolioReportView';
import CollectionsReportView from './reports/CollectionsReportView';
import InvestorCapitalReportView from './reports/InvestorCapitalReportView';
import FixedDepositReportView from './reports/FixedDepositReportView';
import RecurringDepositReportView from './reports/RecurringDepositReportView';
import FinancialStatementsReportView from './reports/FinancialStatementsReportView';
import StaffPerformanceReportView from './reports/StaffPerformanceReportView';
import ExpenseReportView from './reports/ExpenseReportView';
import MasterSettingsView from './settings/MasterSettingsView';
import CollectionDrawer from './components/CollectionDrawer';
import NewLoanModal from './components/NewLoanModal';
import QuickActionModal from './components/QuickActionModal';
import api from './api/client';
import { applyTheme, generateThemePalette } from './utils/themeUtils';
import { generateEmiSchedule, generateCustomSchedule, resolveSchemeRepaymentMethod, resolveSchemeInterestCalculation, estimateCustomTotalPayable } from './utils/loanCalculations';
import { INITIAL_CHART_OF_ACCOUNTS, journalLine, buildJournalEntry, buildVoucherLines, normalizeLedgerAccount, normalizeLedgerEntry } from './utils/accounting';

// Every ACTIVE/CLOSED/OVERDUE loan below is seeded with numbers actually produced by
// utils/loanCalculations.js (not hand-typed guesses), so collected_amount /
// pending_amount / the sample collection receipts are internally consistent with the
// engine that runs every real payment. One loan per Repayment Method x Interest
// Calculation combination, plus a closed one and an overdue one. Mirrors
// server/src/config/db.js's mock data so behavior is identical whether the backend
// is reachable or not.
// loans, collections, borrowers, employees, and branches all have real backends
// now (see fetchData / fetchOrgHierarchy) — no mock seed data for them anymore.

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
  const [highlightLoanId, setHighlightLoanId] = useState(null);

  const handleNavigateNotification = (route, targetLoanId) => {
    setHighlightLoanId(targetLoanId || null);
    handleTabChange(route);
  };

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

  // loans and employees both have real backends now — start empty, populated by
  // fetchData()'s /finance/loans and /employees calls.
  const [loans, setLoans] = useState([]);
  const [employees, setEmployees] = useState([]);
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

  // Manual voucher entry — a staff member deliberately keys in a Cash/Bank
  // Receipt or Payment, a Contra transfer between cash and bank, or a free-form
  // Journal. Posts straight to the real ledger backend (server/src/finance/
  // ledger) inside its own DB transaction — the server re-validates the double
  // entry and that every account code actually exists, it doesn't just trust
  // these client-built lines. ref_type 'MANUAL' is what lets the Manual vs Auto
  // Vouchers pages (and everything downstream reading the ledger) tell them apart.
  const handleCreateManualVoucher = async (payload) => {
    assertEodNotLocked(payload.branch, payload.date);

    if (payload.expense_category_id) {
      // Save directly into the dedicated expense_vouchers table
      const res = await api.post('/finance/expenses/vouchers', {
        category_id: payload.expense_category_id,
        amount: payload.amount,
        payee: payload.created_by,
        branch: payload.branch,
        date: payload.date,
        narration: payload.narration,
        voucher_type: payload.voucher_type,
        created_by: payload.created_by
      });
      const createdVoucher = res.data?.data;

      if (createdVoucher) {
        setExpenseVouchers(prev => [createdVoucher, ...prev]);
        fetchLedgerEntries();
        fetchData();
      }

      // Refresh categories list so balance decreases in state
      setExpenseCategories(prev => prev.map(cat => {
        if (String(cat.id) === String(payload.expense_category_id)) {
          return {
            ...cat,
            balance: Math.max(0, (Number(cat.balance) || 0) - Number(payload.amount))
          };
        }
        return cat;
      }));

      return createdVoucher;
    }

    const lines = buildVoucherLines(payload.voucher_type, {
      amount: payload.amount,
      otherAccountCode: payload.other_account_code,
      contraDirection: payload.contra_direction,
      bankAccountId: payload.bank_account_id,
      bankAccounts,
      lines: payload.lines
    });
    const res = await api.post('/finance/ledger/vouchers', {
      entry_date: payload.date,
      description: payload.narration || 'Manual voucher',
      voucher_type: payload.voucher_type,
      ref_type: 'MANUAL',
      branch: payload.branch,
      created_by: payload.created_by,
      lines
    });
    const created = res.data?.data;
    if (created) {
      setLedgerEntries(prev => [normalizeLedgerEntry(created), ...prev]);
      await fetchData();
    }
    return created;
  };

  // Undoes a wrongly-posted manual voucher (e.g. Cash Payment entered when a
  // Cash Receipt was meant) by posting a mirror-image reversal — the server
  // rejects this for auto-posted vouchers (loan/FD/RD transactions), which
  // have their own dedicated revert flows that also fix non-ledger state.
  const handleRevertVoucher = async (voucherDbId, reason) => {
    const res = await api.post(`/finance/ledger/vouchers/${voucherDbId}/revert`, { reason });
    const reversal = res.data?.data;
    if (reversal) {
      setLedgerEntries(prev => [normalizeLedgerEntry(reversal), ...prev]);
      await fetchData();
    }
    return reversal;
  };

  // Day-end cash closing — one record per branch per day. A matching count closes
  // the day outright; a mismatch still closes it (staff isn't blocked) but goes to
  // PENDING_REVIEW until an admin either recounts (handleUpdateEodRecord) or
  // acknowledges the variance with a resolution note (handleResolveEodVariance) —
  // never silently absorbed either way.
  const handleCloseEodDay = async (payload) => {
    const res = await api.post('/finance/eod/close', payload);
    const newRecord = res.data?.data;
    if (newRecord) {
      setEodRecords(prev => [newRecord, ...prev.filter(r => !(r.branch === newRecord.branch && r.date === newRecord.date))]);
    }
    return newRecord;
  };

  const handleUpdateEodRecord = async (id, payload) => {
    const res = await api.post('/finance/eod/close', payload);
    const updated = res.data?.data;
    if (updated) {
      setEodRecords(prev => prev.map(r => (r.id === id ? updated : r)));
    }
    return updated;
  };

  const handleResolveEodVariance = async (id, resolutionNote) => {
    const res = await api.post('/finance/eod/resolve-variance', { id, resolution_note: resolutionNote });
    const resolved = res.data?.data;
    if (resolved) {
      setEodRecords(prev => prev.map(r => (r.id === id ? { ...r, status: 'CLOSED', has_variance: false, resolution_note: resolutionNote } : r)));
    }
    return resolved;
  };

  const grantEodReopenWindow = (id, hours, openedBy) => {
    const openedAt = new Date();
    const expiresAt = new Date(openedAt.getTime() + hours * 60 * 60 * 1000);
    const grant = { opened_by: openedBy, opened_at: openedAt.toISOString(), duration_hours: hours, expires_at: expiresAt.toISOString() };
    setEodRecords(prev => prev.map(r => (r.id === id ? { ...r, reopen_history: [...(r.reopen_history || []), grant] } : r)));
    return grant;
  };

  const handleGrantEodReopen = async (id, hours, reason) => {
    try {
      const res = await api.post('/finance/eod/grant-reopen', { id, granted_hours: hours, reason });
      if (res.data?.data) {
        setEodRecords(res.data.data);
      }
    } catch {
      grantEodReopenWindow(id, hours, user?.name || 'Admin');
    }
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
  // collections, borrowers, and branchesList all have real backends too — same
  // treatment as loans/schemes above.
  const [collections, setCollections] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [branchesList, setBranchesList] = useState([]);

  // Global branch selection — defaults automatically to the logged-in user's branch
  const [selectedBranch, setSelectedBranch] = useState(() => {
    const saved = localStorage.getItem('financial_erp_selected_branch');
    if (saved && saved !== 'ALL') return saved;
    const savedUser = localStorage.getItem('financial_erp_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        const b = u.branch || u.branch_name || u.branchName;
        if (b) return b;
      } catch {}
    }
    return saved || 'ALL';
  });

  useEffect(() => {
    localStorage.setItem('financial_erp_selected_branch', selectedBranch);
  }, [selectedBranch]);

  useEffect(() => {
    if (branchesList.length > 0) {
      const userBranch = user?.branch || user?.branch_name || user?.branchName;
      if (userBranch && branchesList.some(b => b.name === userBranch)) {
        if (!selectedBranch || selectedBranch === 'ALL') {
          setSelectedBranch(userBranch);
        }
      }
    }
  }, [branchesList, user]);

  const handleChangeBranch = (branchNameOrAll) => setSelectedBranch(branchNameOrAll);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState('');

  // loanSchemes, investors, fixedDeposits, recurringDeposits, and the expense
  // module all have real backends now — start empty, populated by fetchData()'s
  // API calls. No mock fallback: if a call fails, the GlobalErrorBanner is what
  // should tell the user, not a screen quietly showing fake data as if real.
  // customFormulas remains pure local/mock — no backend table for it exists.
  const [loanSchemes, setLoanSchemes] = useState([]);
  const [customFormulas, setCustomFormulas] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [fixedDeposits, setFixedDeposits] = useState([]);
  const [recurringDeposits, setRecurringDeposits] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [expenseAllocationRequests, setExpenseAllocationRequests] = useState([]);
  const [expenseVouchers, setExpenseVouchers] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  // Real chart of accounts + every real journal entry, both fetched from the
  // actual ledger backend (server/src/finance/ledger). Manual Vouchers,
  // General Ledger, and Trial Balance all read from these now. Kept separate
  // from the legacy `chartOfAccounts`/`journalEntries` mock below, which Auto
  // Vouchers/EOD still use — the mock's account codes have diverged from the
  // real chart_of_accounts table (different names, some codes don't exist on
  // one side or the other), so mixing the two sources on one screen
  // mid-migration would silently show wrong numbers. Note `ledgerEntries`
  // will look incomplete until Loans/Collections/Investors/Expenses are also
  // migrated to real ledger posting (the Auto Vouchers module) — right now it
  // only contains what's actually been wired so far: Fixed Deposits,
  // Recurring Deposits, and Manual Vouchers.
  const [ledgerAccounts, setLedgerAccounts] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
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
  const [estimationTermsForNewLoan, setEstimationTermsForNewLoan] = useState(null);

  const navigateTo = (targetPath) => {
    window.history.pushState({}, '', targetPath);
    setPath(targetPath);
  };

  const handleTabChange = (newTab) => {
    setActiveTabState(newTab);
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
    // tenant?.id, not the whole `tenant` object — fetchData() -> fetchCompanyProfile()
    // calls setTenant() with a fresh merged object every time it resolves, which
    // changes `tenant`'s reference identity even when the actual data is
    // unchanged. Depending on the whole object here re-triggered this effect on
    // every fetch, which called fetchData() again, forever — a runaway request
    // loop. tenant.id is a stable primitive that only actually changes when the
    // user switches tenants, which is the only time this effect needs to re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id, isAuthenticated, user?.id, user?.role]);

  // Promise.allSettled, not Promise.all — one endpoint failing (network blip,
  // a single 5xx) shouldn't fail the whole batch and skip every other setter.
  // Each result is applied independently based on its own outcome.
  const [isFetchingData, setIsFetchingData] = useState(false);

  const fetchData = async () => {
    setIsFetchingData(true);
    try {
      const [
        loansRes, empsRes, colRes, schemesRes, borrowersRes,
        investorsRes, fdRes, rdRes, expCatRes, expReqRes, expVouchRes,
        ledgerAccountsRes, ledgerBalancesRes, bankAccountsRes, eodRes
      ] = await Promise.allSettled([
        api.get('/finance/loans'),
        api.get('/employees'),
        api.get('/finance/collections'),
        api.get('/finance/schemes'),
        api.get('/finance/borrowers'),
        api.get('/finance/investors'),
        api.get('/finance/fixed-deposits'),
        api.get('/finance/recurring-deposits'),
        api.get('/finance/expenses/categories'),
        api.get('/finance/expenses/allocation-requests'),
        api.get('/finance/expenses/vouchers'),
        api.get('/finance/ledger/accounts'),
        api.get('/finance/ledger/accounts/balances'),
        api.get('/finance/bank-accounts'),
        api.get('/finance/eod/records')
      ]);
      if (loansRes.status === 'fulfilled' && loansRes.value.data?.data) setLoans(loansRes.value.data.data);
      if (empsRes.status === 'fulfilled' && empsRes.value.data?.data) setEmployees(empsRes.value.data.data);
      if (colRes.status === 'fulfilled' && colRes.value.data?.data) setCollections(colRes.value.data.data);
      if (schemesRes.status === 'fulfilled' && schemesRes.value.data?.data) setLoanSchemes(schemesRes.value.data.data);
      if (borrowersRes.status === 'fulfilled' && borrowersRes.value.data?.data) setBorrowers(borrowersRes.value.data.data);
      if (investorsRes.status === 'fulfilled' && investorsRes.value.data?.data) setInvestors(investorsRes.value.data.data);
      if (fdRes.status === 'fulfilled' && fdRes.value.data?.data) setFixedDeposits(fdRes.value.data.data);
      if (rdRes.status === 'fulfilled' && rdRes.value.data?.data) setRecurringDeposits(rdRes.value.data.data);
      if (expCatRes.status === 'fulfilled' && expCatRes.value.data?.data) setExpenseCategories(expCatRes.value.data.data);
      if (expReqRes.status === 'fulfilled' && expReqRes.value.data?.data) setExpenseAllocationRequests(expReqRes.value.data.data);
      if (expVouchRes.status === 'fulfilled' && expVouchRes.value.data?.data) setExpenseVouchers(expVouchRes.value.data.data);
      if (eodRes.status === 'fulfilled' && eodRes.value.data?.data) setEodRecords(eodRes.value.data.data);

      const balancesMap = new Map();
      if (ledgerBalancesRes.status === 'fulfilled' && ledgerBalancesRes.value.data?.data) {
        ledgerBalancesRes.value.data.data.forEach(b => balancesMap.set(b.account_code, b));
      }

      if (ledgerAccountsRes.status === 'fulfilled' && ledgerAccountsRes.value.data?.data) {
        const merged = ledgerAccountsRes.value.data.data.map(acc => {
          const liveBal = balancesMap.get(acc.account_code);
          return normalizeLedgerAccount({
            ...acc,
            available_balance: liveBal?.available_balance ?? acc.balance,
            current_balance: liveBal?.available_balance ?? acc.balance,
            total_debit: liveBal?.total_debit ?? 0,
            total_credit: liveBal?.total_credit ?? 0
          });
        });
        setLedgerAccounts(merged);
      }
      if (bankAccountsRes.status === 'fulfilled' && bankAccountsRes.value.data?.data) {
        setBankAccounts(bankAccountsRes.value.data.data);
      }
      await Promise.allSettled([
        fetchLedgerEntries(),
        fetchOrgHierarchy(),
        fetchCompanyProfile(),
        fetchRoles()
      ]);
    } finally {
      setIsFetchingData(false);
    }
  };

  const [roles, setRoles] = useState([]);

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles');
      if (res.data?.data) {
        setRoles(res.data.data);
      }
    } catch (e) {
      console.warn('Failed to fetch roles from API', e);
    }
  };

  const handleCreateRole = async (payload) => {
    const res = await api.post('/roles', payload);
    const created = res.data?.data;
    if (created) {
      setRoles(prev => [...prev, created]);
      logAudit('ROLE', created.id, 'CREATE', `${created.role_name} (${created.role_code})`);
      fetchRoles();
    }
    return created;
  };

  const handleUpdateRole = async (roleCode, payload) => {
    const res = await api.put(`/roles/${roleCode}`, payload);
    const updated = res.data?.data;
    if (updated) {
      setRoles(prev => prev.map(r => r.role_code === roleCode ? { ...r, ...updated } : r));
      logAudit('ROLE', roleCode, 'UPDATE', `${updated.role_name || roleCode}`);
    }
    return updated;
  };

  const handleDeleteRole = async (roleCode) => {
    await api.delete(`/roles/${roleCode}`);
    setRoles(prev => prev.filter(r => r.role_code !== roleCode));
    logAudit('ROLE', roleCode, 'DELETE', roleCode);
  };

  // Manual Vouchers, General Ledger, and Trial Balance all read from this one
  // real fetch — same "fetch everything once, filter/paginate on the client"
  // pattern already used for loans/collections/etc. elsewhere in this file.
  const fetchLedgerEntries = async () => {
    try {
      const res = await api.get('/finance/ledger/vouchers');
      const rows = res.data?.data || [];
      setLedgerEntries(rows.map(normalizeLedgerEntry));
    } catch {
      // Leave whatever was already loaded rather than wiping the screen blank
      // on a transient failure — GlobalErrorBanner surfaces the underlying error.
    }
  };

  const fetchOrgHierarchy = async () => {
    setOrgLoading(true);
    setOrgError('');
    try {
      const branchRes = await api.get('/branches');
      setBranchesList(branchRes.data?.data || []);
    } catch (err) {
      setOrgError(err?.response?.data?.message || 'Failed to load branches.');
    } finally {
      setOrgLoading(false);
    }
  };

  const handleCreateEmployee = async (payload) => {
    const res = await api.post('/employees', payload);
    const created = res.data?.data;
    if (created) {
      setEmployees(prev => [...prev, created]);
      logAudit('EMPLOYEE', created.id, 'CREATE', created.name);
    }
    return created;
  };

  const handleUpdateEmployee = async (id, payload) => {
    const before = employees.find(e => e.id === id);
    const res = await api.put(`/employees/${id}`, payload);
    const updated = res.data?.data;
    if (updated) {
      setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updated } : e));
      logAudit('EMPLOYEE', id, 'UPDATE', updated.name || before?.name);
    }
    return updated;
  };

  const handleDeleteEmployee = async (id) => {
    const before = employees.find(e => e.id === id);
    await api.delete(`/employees/${id}`);
    setEmployees(prev => prev.filter(e => e.id !== id));
    logAudit('EMPLOYEE', id, 'DELETE', before?.name);
  };

  // permissions here is the real [{module, action, allowed}] shape moduleGuard.js
  // actually reads — not the flattened UI-only key format PermissionMatrix used
  // to produce. If `role` differs from what's on file, that's a separate real
  // column update via handleUpdateEmployee; permissions are a separate table.
  const handleUpdateEmployeePermissions = async (staffId, role, permissions) => {
    const before = employees.find(e => e.id === staffId);
    if (role && before && role !== before.role) {
      await handleUpdateEmployee(staffId, { role });
    }
    await api.put(`/employees/${staffId}/permissions`, { permissions });
    setEmployees(prev => prev.map(e => (e.id === staffId ? { ...e, role: role || e.role, permissions } : e)));
    logAudit('EMPLOYEE', staffId, 'PERMISSIONS_UPDATE', before?.name);
  };

  const handleSaveCompanyProfile = async (payload) => {
    const res = await api.patch('/auth/company/profile', payload);
    const updated = res.data?.data;
    if (updated) setTenant(prev => ({ ...prev, ...updated }));
    return updated;
  };

  const handleCreateBankAccount = async (payload) => {
    const res = await api.post('/finance/bank-accounts', payload);
    const created = res.data?.data;
    if (created) {
      setBankAccounts(prev => [...prev, created]);
      logAudit('BANK_ACCOUNT', created.id, 'CREATE', `${created.bank_name} - ${created.account_number}`);
      fetchData();
    }
    return created;
  };

  const handleUpdateBankAccount = async (id, payload) => {
    const before = bankAccounts.find(b => b.id === id);
    const res = await api.put(`/finance/bank-accounts/${id}`, payload);
    const updated = res.data?.data;
    if (updated) {
      setBankAccounts(prev => prev.map(b => b.id === id ? { ...b, ...updated } : b));
      logAudit('BANK_ACCOUNT', id, 'UPDATE', `${updated.bank_name} - ${updated.account_number}`);
    }
    return updated;
  };

  const handleDeleteBankAccount = async (id) => {
    const before = bankAccounts.find(b => b.id === id);
    await api.delete(`/finance/bank-accounts/${id}`);
    setBankAccounts(prev => prev.map(b => b.id === id ? { ...b, is_active: false } : b));
    logAudit('BANK_ACCOUNT', id, 'DEACTIVATE', before ? `${before.bank_name} - ${before.account_number}` : String(id));
  };

  const fetchCompanyProfile = async () => {
    if (!isAuthenticated || user?.role === 'SUPER_ADMIN') return;
    try {
      const res = await api.get('/auth/company/profile');
      const data = res.data?.data;
      if (data) {
        setTenant(prev => ({ ...prev, ...data }));
        if (data.allowed_modules !== undefined) {
          const freshModules = data.allowed_modules;
          setUser(prevUser => {
            if (!prevUser) return prevUser;
            const updated = { ...prevUser, allowedModules: freshModules };
            localStorage.setItem('financial_erp_user', JSON.stringify(updated));
            return updated;
          });
        }
      }
    } catch { /* surfaced globally via the axios response interceptor */ }
  };

  // Sync tenant permissions on window focus or route change so Super Admin feature changes reflect instantly
  useEffect(() => {
    if (!isAuthenticated || user?.role === 'SUPER_ADMIN') return;
    fetchCompanyProfile();
    const handleFocus = () => fetchCompanyProfile();
    window.addEventListener('focus', handleFocus);
    const syncInterval = setInterval(fetchCompanyProfile, 15000);
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(syncInterval);
    };
  }, [isAuthenticated, user?.role]);

  // The brand color is a DB column (companies.theme_color), shared across every
  // user of this tenant — apply it the instant it arrives from
  // fetchCompanyProfile, so the whole app repaints without needing the
  // ThemeCustomizerDrawer to ever be opened.
  useEffect(() => {
    if (tenant?.theme_color) {
      applyTheme(generateThemePalette(tenant.theme_color));
    }
  }, [tenant?.theme_color]);

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

  // ── Investor Capital ──
  const handleCreateInvestor = async (payload) => {
    const res = await api.post('/finance/investors', payload);
    const created = res.data?.data;
    if (created) {
      setInvestors(prev => [created, ...prev]);
      logAudit('INVESTOR', created.id, 'CREATE', created.name);
      fetchLedgerEntries();
    }
    return created;
  };

  const handleUpdateInvestor = async (id, payload) => {
    const res = await api.put(`/finance/investors/${id}`, payload);
    const updated = res.data?.data;
    if (updated) {
      setInvestors(prev => prev.map(i => i.id === id ? updated : i));
      logAudit('INVESTOR', id, 'UPDATE', updated.name);
    }
    return updated;
  };

  const handleDeleteInvestor = async (id) => {
    await api.delete(`/finance/investors/${id}`);
    setInvestors(prev => prev.filter(i => i.id !== id));
    logAudit('INVESTOR', id, 'DELETE', `Investor #${id}`);
  };

  const handleAddInvestorCapital = async (id, payload) => {
    const res = await api.post(`/finance/investors/${id}/add-capital`, payload);
    const data = res.data?.data;
    if (data?.investor) {
      setInvestors(prev => prev.map(i => i.id === id ? data.investor : i));
      logAudit('INVESTOR', id, 'CAPITAL_ADDED', `₹${Number(payload.amount || 0).toLocaleString('en-IN')} added to ${data.investor.name}`);
      fetchLedgerEntries();
    }
    return data;
  };


  // ── Fixed Deposits ──
  // FD principal in is a liability (owed back to the customer), booked at
  // inception; maturity/premature close pays that liability off plus whatever
  // interest actually accrued. Unlike most other modules, the ledger posting
  // for FDs happens server-side, inside the same DB transaction as the FD
  // status change itself (see server/src/finance/fixedDeposits/fixedDeposit.service.js)
  // so a booking/maturity/closure and its journal voucher always commit or
  // roll back together — never one without the other. These handlers just
  // relay the API call and sync local state from the response.
  // Each of these posts an auto-voucher server-side inside the same DB
  // transaction as the state change (see server/src/finance/fixedDeposits/),
  // but — same gap as the RD handlers below had — never refreshed the
  // client's ledgerEntries, so Trial Balance/General Ledger/Financial
  // Statements wouldn't reflect it until a full page reload even though the
  // posting itself had genuinely succeeded.
  const handleCreateFixedDeposit = async (payload) => {
    const res = await api.post('/finance/fixed-deposits', payload);
    const newFd = res.data?.data;
    if (!newFd) return newFd;
    setFixedDeposits(prev => [newFd, ...prev]);
    fetchLedgerEntries();
    return newFd;
  };
  const handleMatureFixedDeposit = async (id) => {
    const res = await api.post(`/finance/fixed-deposits/${id}/mature`);
    const updated = res.data?.data;
    if (updated) setFixedDeposits(prev => prev.map(f => (f.id === id ? updated : f)));
    fetchLedgerEntries();
  };
  const handlePrematureCloseFixedDeposit = async (id, customPayoutAmount) => {
    const res = await api.post(`/finance/fixed-deposits/${id}/premature-close`, { payout_amount: customPayoutAmount });
    const updated = res.data?.data;
    if (updated) setFixedDeposits(prev => prev.map(f => (f.id === id ? updated : f)));
    fetchLedgerEntries();
  };
  const handlePayFdMonthlyInterest = async (id, payoutPayload) => {
    const payload = typeof payoutPayload === 'string' ? { payment_mode: payoutPayload } : payoutPayload;
    const res = await api.post(`/finance/fixed-deposits/${id}/pay-interest`, payload);
    fetchLedgerEntries();
    return res.data?.data;
  };

  // ── Recurring Deposits ──
  // Unlike Fixed Deposits, no cash arrives at account opening — the customer
  // pays a fixed amount every month, so nothing is posted to the books until
  // each installment is actually collected. As with Fixed Deposits, the
  // ledger posting itself happens server-side, inside the same DB transaction
  // as the underlying state change (see server/src/finance/recurringDeposits/
  // recurringDeposit.service.js), so a collection/maturity/closure and its
  // journal voucher always commit or roll back together. These handlers just
  // relay the API call and sync local state from the response.
  const handleCreateRecurringDeposit = async (payload) => {
    const res = await api.post('/finance/recurring-deposits', payload);
    const newRd = res.data?.data;
    if (newRd) setRecurringDeposits(prev => [newRd, ...prev]);
    return newRd;
  };
  const handleCollectRdInstallment = async (id, monthNo, paymentMode = 'CASH', extra = {}) => {
    const res = await api.post(`/finance/recurring-deposits/${id}/installments/${monthNo}/collect`, {
      payment_mode: paymentMode,
      ...extra
    });
    const updated = res.data?.data;
    if (updated) setRecurringDeposits(prev => prev.map(r => (r.id === id ? updated : r)));
    // Every collection posts an auto-voucher server-side (see
    // recurringDeposit.service.js's collectRdInstallment), but unlike loan
    // collections (handleRecordCollection, above) this never refreshed the
    // client's ledgerEntries — so the money was really posted and correctly
    // in the DB, but Trial Balance/General Ledger/Financial Statements (all
    // of which read from the in-memory ledgerEntries fetched once at app
    // load) wouldn't show it until a full page reload.
    fetchLedgerEntries();
    return updated;
  };
  const handleMatureRecurringDeposit = async (id) => {
    const res = await api.post(`/finance/recurring-deposits/${id}/mature`);
    const updated = res.data?.data;
    if (updated) setRecurringDeposits(prev => prev.map(r => (r.id === id ? updated : r)));
    fetchLedgerEntries();
  };
  const handlePrematureCloseRecurringDeposit = async (id, customPayoutAmount) => {
    const res = await api.post(`/finance/recurring-deposits/${id}/premature-close`, { payout_amount: customPayoutAmount });
    const updated = res.data?.data;
    if (updated) setRecurringDeposits(prev => prev.map(r => (r.id === id ? updated : r)));
    fetchLedgerEntries();
  };

  // ── Expense Allocation ──
  // Categories are funded directly by whoever creates/tops them up — no approval
  // queue. `expenseAllocationRequests` is kept purely as a funding-history log
  // (AccountHistoryModal reads it), every entry already "applied" the moment it's
  // created since there's no pending state left to approve or reject.
  const handleCreateExpenseCategory = async (payload) => {
    const res = await api.post('/finance/expenses/categories', payload);
    const newCategory = res.data?.data;
    if (newCategory) {
      setExpenseCategories(prev => [...prev, newCategory]);
      logAudit('EXPENSE_CATEGORY', newCategory.id, 'CREATE', `${newCategory.name} funded with ₹${Number(newCategory.balance).toLocaleString('en-IN')}`);
    }
    fetchExpenseAllocationRequests();
    return newCategory;
  };

  const handleUpdateExpenseCategory = async (id, payload) => {
    const res = await api.put(`/finance/expenses/categories/${id}`, payload);
    const updated = res.data?.data;
    if (updated) setExpenseCategories(prev => prev.map(c => (c.id === id ? updated : c)));
    return updated;
  };

  const handleDeleteExpenseCategory = async (id) => {
    const category = expenseCategories.find(c => c.id === id);
    await api.delete(`/finance/expenses/categories/${id}`);
    setExpenseCategories(prev => prev.filter(c => c.id !== id));
    if (category) logAudit('EXPENSE_CATEGORY', id, 'DELETE', category.name);
  };

  const fetchExpenseAllocationRequests = async () => {
    try {
      const res = await api.get('/finance/expenses/allocation-requests');
      setExpenseAllocationRequests(res.data?.data || []);
    } catch { /* surfaced globally via the axios response interceptor */ }
  };

  // A funded account running low requests a TOPUP; an ad-hoc urgent need not
  // covered by the normal balance requests EMERGENCY funds — both credit the
  // account's balance immediately, tagged separately just for the history log.
  const handleAddExpenseFunds = async (payload) => {
    const res = await api.post('/finance/expenses/categories/fund', payload);
    const updated = res.data?.data;
    if (updated) {
      setExpenseCategories(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      logAudit('EXPENSE_CATEGORY', updated.id, 'FUNDS_ADDED', `₹${Number(payload.amount || 0).toLocaleString('en-IN')} added to ${updated.name}`);
    }
    fetchExpenseAllocationRequests();
    return updated;
  };

  // ── Expense Vouchers ──
  // Spending against an already-funded account needs no further approval — the money
  // was pre-authorized when the account was topped up. Balance is enforced
  // server-side (conditional UPDATE) as the source of truth; the UI's own check in
  // QuickActionModal is just a fast-fail before the round trip. The ledger posting
  // itself now happens server-side too, atomically with the voucher and the balance
  // debit (see server/src/finance/expenses/expense.service.js) — no more local mock.
  const handleCreateExpenseVoucher = async (payload) => {
    assertEodNotLocked(payload.branch || user?.branchName || branchesList[0]?.name, new Date().toISOString().slice(0, 10));

    const res = await api.post('/finance/expenses/vouchers', payload);
    const newVoucher = res.data?.data;
    if (!newVoucher) return newVoucher;

    setExpenseCategories(prev => prev.map(c => (
      c.id === newVoucher.category_id ? { ...c, balance: Number(c.balance) - Number(newVoucher.amount) } : c
    )));
    setExpenseVouchers(prev => [newVoucher, ...prev]);
    fetchLedgerEntries();
    return newVoucher;
  };

  // ── Customer Directory ──
  const handleCreateBorrower = async (payload) => {
    const res = await api.post('/finance/borrowers', payload);
    const created = res.data?.data;
    if (created) setBorrowers(prev => [created, ...prev]);
    logAudit('BORROWER', created?.id, 'CREATED', created?.full_name);
    return created;
  };

  const handleUpdateBorrower = async (id, payload) => {
    const res = await api.put(`/finance/borrowers/${id}`, payload);
    const updated = res.data?.data;
    if (updated) setBorrowers(prev => prev.map(b => (b.id === id ? updated : b)));
    logAudit('BORROWER', id, 'UPDATED', updated?.full_name);
    return updated;
  };

  const handleDeleteBorrower = async (id) => {
    await api.delete(`/finance/borrowers/${id}`);
    setBorrowers(prev => prev.filter(b => b.id !== id));
    logAudit('BORROWER', id, 'DELETED');
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

  const handleQuickAction = async (actionType, payload) => {
    const act = (actionType || '').toUpperCase();
    if (act === 'SUBMIT_APPLICATION' && payload) {
      const schemeId = payload.scheme_id ? Number(payload.scheme_id) : 1;
      const matchedScheme = loanSchemes.find(s => s.id === schemeId);
      const isCustom = matchedScheme?.formula_type === 'CUSTOM';
      // Was hardcoded to the literal string 'Main Branch' unconditionally —
      // every application submitted through this Quick Action shortcut got
      // silently mistagged regardless of the customer's real branch or which
      // branch the sidebar was scoped to, so it would vanish from any
      // branch-filtered table/count the moment staff filtered to their real
      // branch. Resolve it the same way handleDisburseLoan does: the matched
      // borrower's own branch first, then whatever branch is currently active
      // in the sidebar scope, then the tenant's first real branch — never a
      // fabricated name that may not even exist as a branch record.
      const matchedBorrower = borrowers.find(b => b.id === (payload.borrower_id ? Number(payload.borrower_id) : null))
        || borrowers.find(b => b.phone === payload.phone);
      const resolvedBranch = matchedBorrower?.branch
        || (selectedBranch && selectedBranch !== 'ALL' ? selectedBranch : null)
        || branchesList[0]?.name
        || 'Main Branch';
      const repaymentMethod = resolveSchemeRepaymentMethod(matchedScheme);
      const interestCalculation = resolveSchemeInterestCalculation(matchedScheme);
      const loanDate = new Date().toISOString().slice(0, 10);
      const repaymentFrequency = payload.repayment_frequency || matchedScheme?.repayment_frequency || 'DAILY';

      // Custom-formula applications stay client-only (see handleDisburseLoan's
      // comment — the server has no engine for token-based custom formulas).
      if (isCustom) {
        const year = new Date().getFullYear();
        const nextSeq = String(loans.length + 1).padStart(4, '0');
        const newApp = {
          id: Date.now(),
          loan_account_no: `APP-${year}-${nextSeq}`,
          borrower_id: payload.borrower_id ? Number(payload.borrower_id) : null,
          scheme_id: schemeId,
          borrower_name: payload.borrower_name,
          phone: payload.phone,
          branch: resolvedBranch,
          collector: user?.name || 'Admin',
          loan_date: loanDate,
          principal_amount: payload.principal_amount,
          collected_amount: 0,
          pending_amount: payload.principal_amount,
          installment_amount: payload.installment_amount,
          tenure_days: Math.round(payload.tenure_months * 30),
          monthly_interest_rate: payload.monthly_interest_rate,
          repayment_frequency: repaymentFrequency,
          formula_type: 'CUSTOM',
          accrual_mode: matchedScheme.accrual_mode,
          interest_formula: matchedScheme.interest_formula,
          installment_formula: matchedScheme.installment_formula,
          repayment_method: repaymentMethod,
          interest_calculation: 'CUSTOM_FORMULA',
          repayment_schedule: matchedScheme.accrual_mode === 'SCHEDULED' ? generateCustomSchedule({
            principal: payload.principal_amount,
            monthlyInterestRate: payload.monthly_interest_rate,
            tenureMonths: payload.tenure_months,
            repaymentFrequency,
            interestFormula: matchedScheme.interest_formula,
            installmentFormula: matchedScheme.installment_formula,
            startDate: loanDate
          }) : null,
          purpose: payload.purpose,
          nominee: payload.nominee,
          security: payload.security,
          status: 'PENDING'
        };
        newApp.total_payable = estimateCustomTotalPayable(newApp)
          ?? (payload.principal_amount * (1 + (payload.monthly_interest_rate / 100) * payload.tenure_months));
        setLoans(prev => [newApp, ...prev]);
        return newApp;
      }

      const res = await api.post('/finance/loans', {
        mode: 'APPLICATION',
        borrower_id: payload.borrower_id ? Number(payload.borrower_id) : null,
        scheme_id: schemeId,
        borrower_name: payload.borrower_name,
        phone: payload.phone,
        branch: resolvedBranch,
        collector: user?.name || 'Admin',
        loan_date: loanDate,
        principal_amount: payload.principal_amount,
        monthly_interest_rate: payload.monthly_interest_rate,
        tenure_days: Math.round(payload.tenure_months * 30),
        repayment_method: repaymentMethod,
        interest_calculation: interestCalculation,
        repayment_frequency: repaymentFrequency,
        formula_type: 'STANDARD',
        purpose: payload.purpose,
        guarantor: payload.guarantor,
        nominee: payload.nominee,
        security: payload.security
      });
      const created = res.data?.data;
      if (created) {
        const newApp = {
          ...payload,
          ...created,
          borrower_id: payload.borrower_id ? Number(payload.borrower_id) : (created.borrower_id || null),
          borrower_name: payload.borrower_name || created.borrower_name,
          phone: payload.phone || created.phone,
          branch: resolvedBranch || created.branch,
          scheme_id: schemeId || created.scheme_id,
          principal_amount: payload.principal_amount || created.principal_amount,
          installment_amount: payload.installment_amount || created.installment_amount,
          purpose: payload.purpose || created.purpose,
          nominee: payload.nominee || created.nominee,
          security: payload.security || created.security,
          repayment_schedule: created.repayment_schedule || created.schedule || []
        };
        setLoans(prev => [newApp, ...prev.filter(l => l.id !== created.id)]);
        logAudit('LOAN', created.id, 'APPLICATION_SUBMITTED', created.loan_account_no);
        fetchData();
      }
      return created;
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

    // The backend runs the authoritative interest-first allocation engine. A failed
    // API call means the payment was never recorded (no DB row, no voucher, no ledger
    // entry) — so it must not be silently swallowed into a fake local "success"; that
    // would show a collector a successful receipt for cash the system never actually
    // recorded. The one deliberate exception is custom-formula loans below, whose
    // split the server has no engine for at all.
    let principalPaid = payload.principal_portion || 0;
    let interestPaid = payload.interest_portion || 0;
    let newPendingFromServer;
    let synced = false;
    let serverData = null;

    // A custom-formula loan's interest/principal split is computed here on the client
    // by an engine the server has no concept of — the server would run its own,
    // different (and here, wrong) calculation and silently overwrite the correct
    // numbers below if this were allowed to sync. So these loans skip the server call
    // entirely and always use the client-computed split, same as loan schemes are
    // already mock-only/client-authoritative elsewhere in this app. This is a real,
    // known gap (custom-formula loans have no backing DB row at all, disbursal
    // included — see handleDisburseLoan) rather than a deliberate design choice;
    // flagged, not fixed here.
    const isCustomFormulaLoan = loans.find(l => l.id === payload.loan_id)?.formula_type === 'CUSTOM';

    if (!isCustomFormulaLoan) {
      const rawPrincipal = payload.principal_paid !== undefined ? payload.principal_paid : payload.principal_portion;
      const rawInterest = payload.interest_paid !== undefined ? payload.interest_paid : payload.interest_portion;
      const rawPenalty = payload.penalty !== undefined ? payload.penalty : (payload.penalty_portion || 0);

      const res = await api.post('/finance/collections', {
        loan_id: payload.loan_id,
        amount: totalAmt,
        principal_paid: rawPrincipal !== undefined ? rawPrincipal : undefined,
        principal_portion: rawPrincipal !== undefined ? rawPrincipal : undefined,
        interest_paid: rawInterest !== undefined ? rawInterest : undefined,
        interest_portion: rawInterest !== undefined ? rawInterest : undefined,
        penalty: rawPenalty,
        penalty_portion: rawPenalty,
        interest_from_date: payload.interest_from_date || null,
        interest_paid_upto: payload.interest_paid_upto || null,
        interest_days: payload.interest_days !== undefined ? payload.interest_days : undefined,
        interest_shortfall_action: payload.interest_shortfall_action || 'CARRY_FORWARD',
        interest_shortfall: payload.interest_shortfall || 0,
        interest_waiver: payload.interest_waiver || 0,
        new_pending_interest_arrears: payload.new_pending_interest_arrears !== undefined ? payload.new_pending_interest_arrears : undefined,
        payment_mode: payload.payment_mode || 'CASH',
        notes: payload.notes || '',
        payment_date: collectionDate,
        collection_date: collectionDate,
        reference_no: payload.reference_no || '',
        collector_name: payload.collector_name || user?.name || '',
        branch: payload.branch || loans.find(l => l.id === payload.loan_id)?.branch || '',
        phone: payload.phone || '',
        proof_image: payload.proof_image || null,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null
      });
      const data = res.data?.data;
      principalPaid = data?.principal_portion ?? (data?.principal_paid ?? principalPaid);
      interestPaid = data?.interest_portion ?? (data?.interest_paid ?? interestPaid);
      newPendingFromServer = data?.new_pending_balance;
      serverData = data;
      synced = true;
    }

    const penaltyAmt = payload.penalty || 0;

    // For a real (synced) collection, every identifying field — id, receipt_no,
    // voucher_no — comes straight from the server's response, not fabricated
    // locally. This used to construct its own `id: Date.now()` and its own fake
    // voucher number even for real, successfully-recorded collections: the
    // payment was genuinely saved, but the UI showed an id nothing in the
    // database actually had and a voucher number that didn't match the real
    // one the server's ledger voucher was posted under — so a same-session
    // revert/bounce action, or the printed receipt, would have been acting on
    // a number that didn't exist. Custom-formula (unsynced) collections still
    // fall back to a local-only placeholder, consistent with their disclosed gap.
    const newReceipt = synced
      ? {
        ...serverData,
        principal_paid: serverData.principal_portion ?? serverData.principal_paid ?? principalPaid,
        interest_paid: serverData.interest_portion ?? serverData.interest_paid ?? interestPaid,
        penalty: serverData.penalty_portion ?? serverData.penalty ?? penaltyAmt,
        new_principal_balance: serverData.new_pending_balance ?? serverData.new_principal_balance ?? newPendingFromServer,
        interest_from_date: serverData.interest_from_date || payload.interest_from_date || null,
        interest_paid_upto: serverData.interest_paid_upto || payload.interest_paid_upto || null,
        interest_days: serverData.interest_days ?? payload.interest_days ?? null,
        interest_shortfall: serverData.interest_shortfall || payload.interest_shortfall || 0,
        interest_waiver: serverData.interest_waiver || payload.interest_waiver || 0,
        pending_interest_arrears: serverData.pending_interest_arrears !== undefined ? serverData.pending_interest_arrears : payload.new_pending_interest_arrears,
        principalPaid: serverData.principal_portion ?? serverData.principal_paid ?? principalPaid,
        interestPaid: serverData.interest_portion ?? serverData.interest_paid ?? interestPaid,
        newPrincipalBalance: serverData.new_pending_balance ?? serverData.new_principal_balance ?? newPendingFromServer,
        loan_account_no: payload.loan_account_no || '',
        bank_name: payload.bank_name || '',
        received_at: payload.received_at || 'BRANCH_COUNTER',
        voided: false,
        synced: true
      }
      : {
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
        voucher_no: generateVoucherNo(),
        collection_date: collectionDate,
        interest_from_date: payload.interest_from_date || null,
        interest_paid_upto: payload.interest_paid_upto || null,
        interest_days: payload.interest_days ?? null,
        synced: false,
        proof_image: payload.proof_image || null,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
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
        collected_amount: l.collected_amount + totalAmt,
        pending_amount: newPending,
        pending_interest_arrears: serverData?.pending_interest_arrears !== undefined
          ? serverData.pending_interest_arrears
          : (payload.new_pending_interest_arrears !== undefined ? payload.new_pending_interest_arrears : (l.pending_interest_arrears || 0)),
        interest_paid_upto: serverData?.interest_paid_upto || payload.interest_paid_upto || l.interest_paid_upto,
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

    // Fetch refreshed general ledger entries so trial balance & day end closing update immediately
    fetchLedgerEntries();

    return { data: newReceipt };
  };

  // Admin/manager correction path: the collection stays on record (struck
  // through, tagged REVERTED) instead of being deleted, so the audit trail
  // always shows both the original entry and the fact that it was undone,
  // by whom, and why. The server does the actual reversal (loan balances,
  // repayment_schedules, mirror-image ledger voucher) inside one transaction —
  // this just syncs local state to what the server confirms happened.
  const handleRevertCollection = async (collectionId, reason) => {
    const collection = collections.find(c => c.id === collectionId);
    if (!collection || collection.reverted || collection.clearance_status === 'BOUNCED') return;
    const res = await api.patch(`/finance/collections/${collectionId}/revert`, { reason });
    const updatedLoan = res.data?.data?.loan;
    if (updatedLoan) {
      setLoans(prev => prev.map(l => (l.id === updatedLoan.id ? { ...l, ...updatedLoan } : l)));
    }
    setCollections(prev => prev.map(c => (c.id === collectionId ? {
      ...c, reverted: true, revert_reason: reason, reverted_by: user?.name || 'Admin', reverted_at: new Date().toISOString()
    } : c)));
    logAudit('COLLECTION', collectionId, 'REVERTED', `${collection.loan_account_no || 'Loan #' + collection.loan_id} — ${reason}`);
    fetchLedgerEntries();
  };

  // Metadata-only correction — payment mode, reference no, collector, date,
  // notes. Deliberately does NOT touch the amount/principal/interest split:
  // that would require re-running the allocation engine and re-posting the
  // journal, so a wrong amount goes through Revert + a fresh entry instead
  // (the server rejects amount changes here the same way).
  const handleUpdateCollection = async (collectionId, updates) => {
    const before = collections.find(c => c.id === collectionId);
    if (!before) return;
    await api.patch(`/finance/collections/${collectionId}`, updates);
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
      ...clearanceUpdate
    } : c)));
    logAudit('COLLECTION', collectionId, 'UPDATE', before.loan_account_no || `Loan #${before.loan_id}`);
  };

  const handleMarkChequeCleared = async (collectionId) => {
    const before = collections.find(c => c.id === collectionId);
    await api.patch(`/finance/collections/${collectionId}/cheque-cleared`);
    setCollections(prev => prev.map(c => (c.id === collectionId ? {
      ...c, clearance_status: 'CLEARED'
    } : c)));
    logAudit('COLLECTION', collectionId, 'CHEQUE_CLEARED', before?.loan_account_no || `Loan #${before?.loan_id}`);
  };

  // A bounced cheque never actually settled — reverse it exactly like a void,
  // but keep the distinct BOUNCED status/reason so it's clear this wasn't a
  // data-entry correction but a real failed payment.
  const handleMarkChequeBounced = async (collectionId, reason) => {
    const collection = collections.find(c => c.id === collectionId);
    if (!collection || collection.clearance_status === 'BOUNCED') return;
    const res = await api.patch(`/finance/collections/${collectionId}/cheque-bounced`, { reason });
    const updatedLoan = res.data?.data?.loan;
    if (updatedLoan) {
      setLoans(prev => prev.map(l => (l.id === updatedLoan.id ? { ...l, ...updatedLoan } : l)));
    }
    setCollections(prev => prev.map(c => (c.id === collectionId ? {
      ...c, clearance_status: 'BOUNCED', bounce_reason: reason, bounced_by: user?.name || 'Admin', bounced_at: new Date().toISOString()
    } : c)));
    logAudit('COLLECTION', collectionId, 'CHEQUE_BOUNCED', `${collection.loan_account_no || 'Loan #' + collection.loan_id} — ${reason}`);
    fetchLedgerEntries();
  };

  const handleApproveWaiver = async (collectionId) => {
    const res = await api.post(`/finance/collections/${collectionId}/approve-waiver`);
    const updated = res.data?.data;
    if (updated) {
      setCollections(prev => prev.map(c => c.id === collectionId ? { ...c, ...updated } : c));
      logAudit('COLLECTION', collectionId, 'WAIVER_APPROVED', `Waiver approved for ${updated.voucher_no || collectionId}`);
      fetchData();
    }
    return updated;
  };

  const handleRejectWaiver = async (collectionId, reason) => {
    const res = await api.post(`/finance/collections/${collectionId}/reject-waiver`, { reason });
    const updated = res.data?.data;
    if (updated) {
      setCollections(prev => prev.map(c => c.id === collectionId ? { ...c, ...updated } : c));
      logAudit('COLLECTION', collectionId, 'WAIVER_REJECTED', `Waiver rejected: ${reason}`);
      fetchData();
    }
    return updated;
  };

  const handleDisburseLoan = async (form) => {
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
    // Was reading ONLY the scheme's own repayment_frequency, completely
    // ignoring what staff explicitly picked on the application form itself
    // (form.repayment_frequency, a required field — see NewLoanApplicationPage.jsx)
    // — so a staff member who deliberately chose "Monthly" would still get a
    // DAILY-frequency loan (and a "₹X/day" label) the moment the linked
    // scheme didn't happen to carry a matching value, or had none at all.
    const repaymentFrequency = form.repayment_frequency || matchedScheme?.repayment_frequency || 'DAILY';
    // Same fallback chain as handleQuickAction's SUBMIT_APPLICATION path — a
    // borrower with no branch on file used to fall straight to the literal
    // string 'Main Branch' regardless of which branch was actually active,
    // silently mistagging the loan and hiding it from that branch's own
    // filtered views/counts.
    const resolvedBranch = matchedBorrower?.branch
      || (selectedBranch && selectedBranch !== 'ALL' ? selectedBranch : null)
      || branchesList[0]?.name
      || 'Main Branch';

    if (!isApplication) {
      assertEodNotLocked(resolvedBranch, loanDate);
    }

    // Custom-formula loans use a token-based interest engine the server has no
    // concept of (same reason handleRecordCollection skips syncing collections
    // for them — see its comment) — creation stays client-only/local for these,
    // consistent with that existing, deliberate scoping decision. Standard
    // (EMI / Interest-Only) loans — the overwhelming majority — are real,
    // persisted via POST /finance/loans below.
    if (isCustom) {
      const year = new Date().getFullYear();
      const nextSeq = String(loans.length + 1).padStart(4, '0');
      const newLoan = {
        id: Date.now(),
        loan_account_no: isApplication
          ? `APP-${year}-${nextSeq}`
          : `LN-${year}-${nextSeq}`,
        borrower_id: matchedBorrower?.id || null,
        scheme_id: form.scheme_id ? Number(form.scheme_id) : loanSchemes[0]?.id || null,
        borrower_name: form.borrower_name,
        phone: form.phone,
        branch: resolvedBranch,
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
        formula_type: 'CUSTOM',
        accrual_mode: matchedScheme.accrual_mode,
        interest_formula: matchedScheme.interest_formula,
        installment_formula: matchedScheme.installment_formula,
        repayment_method: repaymentMethod,
        interest_calculation: 'CUSTOM_FORMULA',
        repayment_schedule: matchedScheme.accrual_mode === 'SCHEDULED' ? generateCustomSchedule({
          principal: parseFloat(form.principal_amount),
          monthlyInterestRate: mRate,
          tenureMonths: months,
          repaymentFrequency,
          interestFormula: matchedScheme.interest_formula,
          installmentFormula: matchedScheme.installment_formula,
          startDate: loanDate
        }) : null,
        aadhaar: matchedBorrower?.aadhaar_number || '',
        pan: matchedBorrower?.pan_number || '',
        guarantor: matchedBorrower?.guarantor_name || 'Self',
        purpose: form.purpose || '',
        status: isApplication ? 'PENDING' : 'ACTIVE'
      };
      newLoan.total_payable = estimateCustomTotalPayable(newLoan)
        ?? (parseFloat(form.principal_amount) * (1 + (mRate / 100) * months));

      setLoans(prev => [newLoan, ...prev]);
      if (!isApplication) {
        postJournal(
          `Loan disbursed — ${newLoan.loan_account_no} (${newLoan.borrower_name})`,
          [journalLine('1200', newLoan.principal_amount, 0), journalLine('1001', 0, newLoan.principal_amount)],
          'DISBURSAL', newLoan.id, loanDate, newLoan.branch
        );
      }
      return newLoan;
    }

    const res = await api.post('/finance/loans', {
      mode: form.mode,
      borrower_id: matchedBorrower?.id || null,
      scheme_id: form.scheme_id ? Number(form.scheme_id) : (loanSchemes[0]?.id || null),
      borrower_name: form.borrower_name,
      phone: form.phone,
      branch: resolvedBranch,
      collector: user?.name || 'Admin',
      loan_date: loanDate,
      principal_amount: parseFloat(form.principal_amount),
      monthly_interest_rate: mRate,
      tenure_days: parseInt(form.tenure_days),
      repayment_method: repaymentMethod,
      interest_calculation: interestCalculation,
      repayment_frequency: repaymentFrequency,
      formula_type: 'STANDARD',
      aadhaar: matchedBorrower?.aadhaar_number || '',
      pan: matchedBorrower?.pan_number || '',
      guarantor: form.guarantor || (matchedBorrower?.guarantor_name ? { name: matchedBorrower.guarantor_name, mobile: matchedBorrower.guarantor_phone || '', relationship: matchedBorrower.guarantor_relation || 'Guarantor' } : null),
      nominee: form.nominee || null,
      security: form.security || null,
      purpose: form.purpose || ''
    });
    const created = res.data?.data;
    if (created) {
      const newLoan = {
        ...created,
        borrower_id: matchedBorrower?.id || null,
        borrower_name: form.borrower_name,
        phone: form.phone,
        branch: resolvedBranch,
        repayment_schedule: created.schedule || []
      };
      setLoans(prev => [newLoan, ...prev]);
      logAudit('LOAN', created.id, isApplication ? 'APPLICATION_SUBMITTED' : 'DISBURSED', created.loan_account_no);
      // An APPLICATION has no cash movement yet (server posts no voucher for
      // it either — see loan.service.js), so nothing new to reflect in the
      // ledger until it's later approved/disbursed.
      if (!isApplication) fetchLedgerEntries();
    }
    return created;
  };

  // Custom-formula loans never sync to the server at all (see handleDisburseLoan) —
  // their status transitions stay local-only too, since the server has no row
  // for them to update. Everything else goes through the real
  // PATCH /finance/loans/:id/status state machine (server/src/finance/loan/loan.service.js).
  const updateLoanStatusReal = async (loanId, status, reason, extraData = {}) => {
    const res = await api.patch(`/finance/loans/${loanId}/status`, { status, reason, ...extraData });
    const updated = res.data?.data;
    if (updated) {
      setLoans(prev => prev.map(l => (l.id === loanId ? { ...l, ...updated } : l)));
    }
    return updated;
  };

  const handleApproveApplication = async (loanId) => {
    const loan = loans.find(l => l.id === loanId);
    if (loan?.formula_type === 'CUSTOM') {
      setLoans(prev => prev.map(l => (
        l.id === loanId
          ? { ...l, status: 'APPROVED', loan_account_no: l.loan_account_no.replace('APP-', 'LN-'), next_due: new Date().toISOString().slice(0, 10) }
          : l
      )));
      return;
    }
    await updateLoanStatusReal(loanId, 'APPROVED');
    logAudit('LOAN', loanId, 'APPLICATION_APPROVED', loan?.loan_account_no);
  };

  const handleRejectApplication = async (loanId, reason) => {
    const loan = loans.find(l => l.id === loanId);
    if (loan?.formula_type === 'CUSTOM') {
      setLoans(prev => prev.map(l => (
        l.id === loanId ? { ...l, status: 'REJECTED', rejection_reason: reason || 'Not specified' } : l
      )));
      return;
    }
    await updateLoanStatusReal(loanId, 'REJECTED', reason);
    logAudit('LOAN', loanId, 'APPLICATION_REJECTED', `${loan?.loan_account_no} — ${reason || 'Not specified'}`);
  };

  const handleRevertApplication = async (loanId) => {
    const loan = loans.find(l => l.id === loanId);
    if (loan?.formula_type === 'CUSTOM') {
      setLoans(prev => prev.map(l => (
        l.id === loanId ? { ...l, status: 'PENDING', rejection_reason: null } : l
      )));
      return;
    }
    await updateLoanStatusReal(loanId, 'PENDING');
    logAudit('LOAN', loanId, 'APPLICATION_REVERTED', loan?.loan_account_no);
  };

  const handleMarkPendingDisbursal = async (loanId, reason) => {
    const loan = loans.find(l => l.id === loanId);
    if (loan?.formula_type === 'CUSTOM') {
      setLoans(prev => prev.map(l => (
        l.id === loanId ? { ...l, status: 'PENDING_DISBURSAL' } : l
      )));
      return;
    }
    await updateLoanStatusReal(loanId, 'PENDING_DISBURSAL', reason);
    logAudit('LOAN', loanId, 'MOVED_TO_PENDING_DISBURSAL', `${loan?.loan_account_no} — ${reason || 'Awaiting funds'}`);
  };

  // Disburses an already-APPROVED or PENDING_DISBURSAL application — cash leaves the vault/bank
  // now (real voucher posted server-side with selected source account & branch).
  const handleDisburseApprovedLoan = async (loanId, disbursalDetails = {}) => {
    const loan = loans.find(l => l.id === loanId);
    await updateLoanStatusReal(loanId, 'ACTIVE', undefined, disbursalDetails);
    logAudit('LOAN', loanId, 'DISBURSED', `${loan?.loan_account_no} (${disbursalDetails.payment_mode || 'CASH'})`);
    fetchLedgerEntries();
  };

  // A loan that's been fully paid off doesn't close itself — it goes to Admin as a
  // closure request (with the full payment history attached) and only becomes
  // CLOSED once approved. Prevents a mis-entered collection from silently closing
  // an account with no review step.
  const handleApproveLoanClosure = async (loanId) => {
    const before = loans.find(l => l.id === loanId);
    if (before?.formula_type === 'CUSTOM') {
      setLoans(prev => prev.map(l => (
        l.id === loanId
          ? { ...l, status: 'CLOSED', closed_at: new Date().toISOString().slice(0, 10), closed_by: user?.name || 'Admin' }
          : l
      )));
      logAudit('LOAN', loanId, 'CLOSURE_APPROVED', before?.loan_account_no);
      return;
    }
    await updateLoanStatusReal(loanId, 'CLOSED');
    logAudit('LOAN', loanId, 'CLOSURE_APPROVED', before?.loan_account_no);
  };

  const handleRejectLoanClosure = async (loanId, reason) => {
    const before = loans.find(l => l.id === loanId);
    if (before?.formula_type === 'CUSTOM') {
      setLoans(prev => prev.map(l => (
        l.id === loanId
          ? { ...l, status: 'ACTIVE', closure_rejection_reason: reason || 'Not specified', closure_requested_at: null, closure_requested_by: null }
          : l
      )));
      logAudit('LOAN', loanId, 'CLOSURE_REJECTED', `${before?.loan_account_no} — ${reason || 'Not specified'}`);
      return;
    }
    await updateLoanStatusReal(loanId, 'ACTIVE', reason);
    logAudit('LOAN', loanId, 'CLOSURE_REJECTED', `${before?.loan_account_no} — ${reason || 'Not specified'}`);
  };

  // Role-based save (from the global Roles & Permissions matrix, not tied to one
  // employee): bulk-applies to every employee currently holding that role, so it
  // overwrites any per-employee custom permissions previously set for them. Editing
  // one employee's custom permissions goes through handleUpdateEmployee instead,
  // which only ever touches that single employee.
  const handleSavePermissions = async (roleKey, permissionRows) => {
    const employeeRole = roleKey === 'SUPER_ADMIN' ? 'ADMIN' : roleKey;
    const targets = employees.filter(emp => emp.role === employeeRole);
    for (const emp of targets) {
      // eslint-disable-next-line no-await-in-loop -- sequential on purpose:
      // these are real writes to employee_permissions, one employee at a time,
      // not a batch endpoint the server exposes.
      await handleUpdateEmployeePermissions(emp.id, emp.role, permissionRows);
    }
  };

  const getSettingsSubTab = (tabStr) => {
    if (tabStr.includes('financial-year') || tabStr.includes('fy-closing') || tabStr.includes('fy')) return 'financial-years';
    if (tabStr.includes('drafts') || tabStr.includes('trash') || tabStr.includes('archive') || tabStr.includes('deleted')) return 'drafts-archive';
    if (tabStr.includes('brand-theme') || tabStr.includes('theme')) return 'brand-theme';
    if (tabStr.includes('bank-accounts') || tabStr.includes('banking')) return 'bank-accounts';
    if (tabStr.includes('chart-of-accounts')) return 'chart-of-accounts';
    if (tabStr.includes('investor')) return 'investor-master';
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
      onSaveTheme={handleSaveCompanyProfile}
      loans={loans}
      bankAccounts={bankAccounts}
      chartOfAccounts={ledgerAccounts}
      onNavigateNotification={handleNavigateNotification}
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
          tenant={tenant}
          chartOfAccounts={ledgerAccounts}
          bankAccounts={bankAccounts}
          highlightLoanId={highlightLoanId}
          onClearHighlight={() => setHighlightLoanId(null)}
          initialApplicationTerms={estimationTermsForNewLoan}
          onClearInitialApplicationTerms={() => setEstimationTermsForNewLoan(null)}
          onCreateBorrower={handleCreateBorrower}
          onQuickAction={handleQuickAction}
          onApproveApplication={handleApproveApplication}
          onRejectApplication={handleRejectApplication}
          onRevertApplication={handleRevertApplication}
          onApproveLoanClosure={handleApproveLoanClosure}
          onRejectLoanClosure={handleRejectLoanClosure}
          onDisburseApprovedLoan={handleDisburseApprovedLoan}
          onMarkPendingDisbursal={handleMarkPendingDisbursal}
          onCollectLoan={(loan) => setSelectedLoanForCollection(loan)}
        />
      )}

      {/* Loan Estimator & Quotation View */}
      {(activeTab.includes('estimation') || activeTab === 'estimation') && (
        <EstimationView
          loanSchemes={loanSchemes}
          tenant={tenant}
          onCreateLoanScheme={handleCreateLoanScheme}
          onApplyLoan={(estimateTerms) => {
            setEstimationTermsForNewLoan(estimateTerms);
            setActiveTabState('loan-management/loans-register');
          }}
        />
      )}

      {/* Fixed Deposits */}
      {activeTab === 'fixed-deposits' && (
        <FixedDepositsView
          fixedDeposits={fixedDeposits}
          borrowers={borrowers}
          tenant={tenant}
          user={user}
          branchesList={branchesList}
          selectedBranch={selectedBranch}
          journalEntries={ledgerEntries}
          onCreateFd={handleCreateFixedDeposit}
          onMatureFd={handleMatureFixedDeposit}
          onPrematureCloseFd={handlePrematureCloseFixedDeposit}
          onPayFdMonthlyInterest={handlePayFdMonthlyInterest}
        />
      )}

      {/* Recurring Deposits */}
      {activeTab === 'recurring-deposits' && (
        <RecurringDepositsView
          recurringDeposits={recurringDeposits}
          borrowers={borrowers}
          tenant={tenant}
          branchesList={branchesList}
          selectedBranch={selectedBranch}
          bankAccounts={bankAccounts}
          journalEntries={ledgerEntries}
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
          employees={employees}
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
          onApproveWaiver={handleApproveWaiver}
          onRejectWaiver={handleRejectWaiver}
        />
      )}

      {/* Finance & Accounting — each menu item is its own standalone page */}
      {(activeTab.includes('general-ledger') || activeTab === 'finance' || activeTab === 'finance-accounting') && (
        <GeneralLedgerView
          chartOfAccounts={ledgerAccounts}
          journalEntries={ledgerEntries}
          branchesList={branchesList}
          selectedBranch={selectedBranch}
          onCreateOpeningBalance={handleCreateManualVoucher}
          tenant={tenant}
        />
      )}
      {(activeTab.includes('loan-ledger')) && (
        <LoanLedgerView loans={loans} collections={collections} branchesList={branchesList} selectedBranch={selectedBranch} />
      )}
      {(activeTab.includes('customer-ledger')) && (
        <CustomerLedgerView borrowers={borrowers} loans={loans} collections={collections} branchesList={branchesList} selectedBranch={selectedBranch} />
      )}
      {(activeTab.includes('trial-balance')) && (
        <TrialBalanceView chartOfAccounts={ledgerAccounts} journalEntries={ledgerEntries} branchesList={branchesList} selectedBranch={selectedBranch} />
      )}
      {(activeTab.includes('auto-vouchers')) && (
        <AutoVouchersView journalEntries={ledgerEntries} branchesList={branchesList} chartOfAccounts={ledgerAccounts} tenant={tenant} selectedBranch={selectedBranch} />
      )}
      {(activeTab === 'branch-expenses' || activeTab.includes('finance/expenses')) && (
        <BranchExpenseTrackerView
          expenseCategories={expenseCategories}
          expenseVouchers={expenseVouchers}
          journalEntries={ledgerEntries}
          branchesList={branchesList}
          employees={employees}
          selectedBranch={selectedBranch}
          user={user}
          expenseAllocationRequests={expenseAllocationRequests}
          onCreateExpenseVoucher={handleCreateManualVoucher}
        />
      )}
      {(activeTab.includes('manual-vouchers')) && (
        <ManualVouchersView
          journalEntries={ledgerEntries}
          chartOfAccounts={ledgerAccounts}
          branchesList={branchesList}
          employees={employees}
          expenseCategories={expenseCategories}
          bankAccounts={bankAccounts}
          tenant={tenant}
          selectedBranch={selectedBranch}
          onCreateManualVoucher={handleCreateManualVoucher}
          onRevertVoucher={handleRevertVoucher}
        />
      )}
      {(activeTab.includes('eod-process')) && (
        <EODProcessView
          branchesList={branchesList}
          selectedBranch={selectedBranch}
          journalEntries={ledgerEntries}
          chartOfAccounts={ledgerAccounts}
          eodRecords={eodRecords}
          eodDenominationSettings={eodDenominationSettings}
          user={user}
          onCreateOpeningBalance={handleCreateManualVoucher}
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
        <BorrowersView
          borrowers={borrowers}
          loans={loans}
          collections={collections}
          fixedDeposits={fixedDeposits}
          recurringDeposits={recurringDeposits}
          journalEntries={ledgerEntries}
          branches={branchesList}
          selectedBranch={selectedBranch}
          tenant={tenant}
          onCreateBorrower={handleCreateBorrower}
          onUpdateBorrower={handleUpdateBorrower}
          onDeleteBorrower={handleDeleteBorrower}
        />
      )}

      {/* Reports Module — each report is a standalone read-only page */}
      {(activeTab.includes('reports/loan-portfolio')) && (
        <LoanPortfolioReportView loans={loans} borrowers={borrowers} receipts={collections} branchesList={branchesList} journalEntries={ledgerEntries} tenant={tenant} user={user} selectedBranch={selectedBranch} />
      )}
      {(activeTab.includes('reports/collections')) && (
        <CollectionsReportView collections={collections} loans={loans} branchesList={branchesList} journalEntries={ledgerEntries} tenant={tenant} user={user} selectedBranch={selectedBranch} />
      )}
      {(activeTab.includes('reports/investor-capital')) && (
        <InvestorCapitalReportView investors={investors} tenant={tenant} user={user} />
      )}
      {(activeTab.includes('reports/fixed-deposits')) && (
        <FixedDepositReportView fixedDeposits={fixedDeposits} borrowers={borrowers} journalEntries={ledgerEntries} tenant={tenant} user={user} />
      )}
      {(activeTab.includes('reports/recurring-deposits')) && (
        <RecurringDepositReportView recurringDeposits={recurringDeposits} borrowers={borrowers} journalEntries={ledgerEntries} tenant={tenant} user={user} />
      )}
      {(activeTab.includes('reports/financial-statements')) && (
        <FinancialStatementsReportView chartOfAccounts={ledgerAccounts} journalEntries={ledgerEntries} branchesList={branchesList} tenant={tenant} user={user} selectedBranch={selectedBranch} />
      )}
      {(activeTab.includes('reports/staff-performance')) && (
        <StaffPerformanceReportView employees={employees} loans={loans} collections={collections} branchesList={branchesList} journalEntries={ledgerEntries} tenant={tenant} user={user} selectedBranch={selectedBranch} />
      )}
      {(activeTab.includes('reports/expenses') || activeTab.includes('reports/expense')) && (
        <ExpenseReportView expenseCategories={expenseCategories} expenseVouchers={expenseVouchers} branchesList={branchesList} employees={employees} tenant={tenant} user={user} selectedBranch={selectedBranch} />
      )}

      {/* Master Settings Module */}
      {(activeTab.startsWith('master-settings') || activeTab.startsWith('settings') || activeTab === 'employees' || activeTab === 'investor-capital') && !activeTab.includes('customer-details') && (
          <MasterSettingsView
            initialTab={getSettingsSubTab(activeTab)}
            tenant={tenant}
            user={user}
            employees={employees}
            roles={roles}
            onCreateRole={handleCreateRole}
            onUpdateRole={handleUpdateRole}
            onDeleteRole={handleDeleteRole}
            onSavePermissions={handleSavePermissions}
            onCreateEmployee={handleCreateEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onUpdateEmployeePermissions={handleUpdateEmployeePermissions}
            onQuickAction={handleQuickAction}
            borrowers={borrowers}
            loans={loans}
            onCreateBorrower={handleCreateBorrower}
            onUpdateBorrower={handleUpdateBorrower}
            onDeleteBorrower={handleDeleteBorrower}
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
            chartOfAccounts={ledgerAccounts}
            onCreateAccount={async (payload) => {
              const res = await api.post('/finance/ledger/accounts', payload);
              const created = res.data?.data;
              if (created) {
                setLedgerAccounts(prev => [...prev, normalizeLedgerAccount(created)]);
              }
              return created;
            }}
            onUpdateAccount={async (code, payload) => {
              const res = await api.put(`/finance/ledger/accounts/${code}`, payload);
              const updated = res.data?.data;
              if (updated) {
                setLedgerAccounts(prev => prev.map(a => (a.account_code === code || a.code === code) ? normalizeLedgerAccount(updated) : a));
              }
              return updated;
            }}
            onDeleteAccount={async (code) => {
              await api.delete(`/finance/ledger/accounts/${code}`);
              setLedgerAccounts(prev => prev.filter(a => (a.account_code !== code && a.code !== code)));
            }}
            bankAccounts={bankAccounts}
            onCreateBankAccount={handleCreateBankAccount}
            onUpdateBankAccount={handleUpdateBankAccount}
            onDeleteBankAccount={handleDeleteBankAccount}
            investors={investors}
            onCreateInvestor={handleCreateInvestor}
            onUpdateInvestor={handleUpdateInvestor}
            onDeleteInvestor={handleDeleteInvestor}
            onAddInvestorCapital={handleAddInvestorCapital}
            journalEntries={ledgerEntries}
            onSaveTheme={handleSaveCompanyProfile}
            onRefreshData={fetchData}
          />
      )}

      {/* Collection Drawer */}
      <CollectionDrawer
        isOpen={Boolean(selectedLoanForCollection)}
        onClose={() => setSelectedLoanForCollection(null)}
        loan={selectedLoanForCollection}
        borrowers={borrowers}
        employees={employees}
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
