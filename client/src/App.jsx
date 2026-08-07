import React, { useState, useEffect } from 'react';
import AppLayout from './layouts/AppLayout';
import CompanyCodePage from './modules/auth/CompanyCodePage';
import LoginPage from './modules/auth/LoginPage';
import SuperAdminLoginPage from './modules/auth/SuperAdminLoginPage';
import SuperAdminPortal from './modules/auth/SuperAdminPortal';
import ModuleSelectorPage from './modules/auth/ModuleSelectorPage';
import OperationalWorkspaceView from './modules/loan/OperationalWorkspaceView';
import DashboardOverviewView from './modules/dashboard/DashboardOverviewView';
import CustomerKycReviewPage from './modules/borrowers/CustomerKycReviewPage';
import BorrowersView from './modules/borrowers/BorrowersView';
import LoansView from './modules/loan/LoansView';
import LoanApplicationsView from './modules/loan/LoanApplicationsView';
import InvestorCapitalView from './modules/investors/InvestorCapitalView';
import FixedDepositsView from './modules/fixedDeposits/FixedDepositsView';
import DailyCollectionsView from './modules/finance/DailyCollectionsView';
import GeneralLedgerView from './modules/finance/GeneralLedgerView';
import LoanLedgerView from './modules/finance/LoanLedgerView';
import CustomerLedgerView from './modules/finance/CustomerLedgerView';
import TrialBalanceView from './modules/finance/TrialBalanceView';
import AutoVouchersView from './modules/finance/AutoVouchersView';
import ManualVouchersView from './modules/finance/ManualVouchersView';
import EODProcessView from './modules/finance/EODProcessView';
import LoanPortfolioReportView from './modules/reports/LoanPortfolioReportView';
import CollectionsReportView from './modules/reports/CollectionsReportView';
import BorrowerKycReportView from './modules/reports/BorrowerKycReportView';
import InvestorCapitalReportView from './modules/reports/InvestorCapitalReportView';
import FixedDepositReportView from './modules/reports/FixedDepositReportView';
import FinancialStatementsReportView from './modules/reports/FinancialStatementsReportView';
import StaffPerformanceReportView from './modules/reports/StaffPerformanceReportView';
import MasterSettingsView from './modules/settings/MasterSettingsView';
import CollectionDrawer from './components/CollectionDrawer';
import NewLoanModal from './components/NewLoanModal';
import QuickActionModal from './components/QuickActionModal';
import api from './api/client';
import {
  INITIAL_LOAN_SCHEMES,
  INITIAL_INVESTORS,
  INITIAL_INVESTOR_TRANSACTIONS,
  INITIAL_FIXED_DEPOSITS,
  INITIAL_EXPENSE_CATEGORIES,
  INITIAL_EXPENSE_ALLOCATION_REQUESTS,
  INITIAL_EXPENSE_VOUCHERS,
  INITIAL_CHART_OF_ACCOUNTS
} from './data/mockFinanceData';
import { generateEmiSchedule, resolveSchemeRepaymentMethod, resolveSchemeInterestCalculation } from './utils/loanCalculations';
import { journalLine, buildJournalEntry, buildVoucherLines } from './utils/accounting';

// Every ACTIVE/CLOSED/OVERDUE loan below is seeded with numbers actually produced by
// utils/loanCalculations.js (not hand-typed guesses), so collected_amount /
// pending_amount / the sample collection receipts are internally consistent with the
// engine that runs every real payment. One loan per Repayment Method x Interest
// Calculation combination, plus a closed one and an overdue one. Mirrors
// server/src/config/db.js's mock data so behavior is identical whether the backend
// is reachable or not.
const INITIAL_LOANS = [
  // Interest Only + Flexible (DAILY) — 3 payments made so far
  { id: 101, company_id: 1, loan_account_no: 'LN-2026-001', borrower_id: 1, scheme_id: 1, borrower_name: 'Rajesh Kumar', phone: '9876543210', branch: 'Main Branch', collector: 'Sarah Collector', loan_date: '2026-05-10', next_due: '2026-07-24', principal_amount: 50000, total_payable: 57500, collected_amount: 22000, pending_amount: 29271, installment_amount: 500, tenure_days: 110, status: 'ACTIVE', aadhaar: '4589-1234-8971', pan: 'ABCDE1234F', guarantor: 'Mahesh Kumar', monthly_interest_rate: 2.0, repayment_method: 'INTEREST_ONLY', interest_calculation: 'FLEXIBLE_REDUCING', repayment_frequency: 'DAILY', last_payment_date: '2026-06-23', repayment_schedule: null },
  // EMI + Flexible / Reducing EMI (MONTHLY) — 2 of 6 installments paid
  { id: 102, company_id: 1, loan_account_no: 'LN-2026-002', borrower_id: 2, scheme_id: 1, borrower_name: 'Priya Sharma', phone: '9812345678', branch: 'Main Branch', collector: 'Sarah Collector', loan_date: '2026-02-15', next_due: '2026-05-16', principal_amount: 100000, total_payable: 107116, collected_amount: 35706, pending_amount: 67977, installment_amount: 17853, tenure_days: 180, status: 'ACTIVE', aadhaar: '8912-3456-7890', pan: 'XYZPD9876K', guarantor: 'Sunil Sharma', monthly_interest_rate: 2.0, repayment_method: 'EMI', interest_calculation: 'FLEXIBLE_REDUCING', repayment_frequency: 'MONTHLY', last_payment_date: '2026-04-15',
    repayment_schedule: [
      { period: 1, due_date: '2026-03-17', principal: 15853, interest: 2000, emi: 17853, principal_paid: 15853, interest_paid: 2000 },
      { period: 2, due_date: '2026-04-16', principal: 16170, interest: 1683, emi: 17853, principal_paid: 16170, interest_paid: 1683 },
      { period: 3, due_date: '2026-05-16', principal: 16493, interest: 1360, emi: 17853, principal_paid: 0, interest_paid: 0 },
      { period: 4, due_date: '2026-06-15', principal: 16823, interest: 1030, emi: 17853, principal_paid: 0, interest_paid: 0 },
      { period: 5, due_date: '2026-07-15', principal: 17160, interest: 693, emi: 17853, principal_paid: 0, interest_paid: 0 },
      { period: 6, due_date: '2026-08-14', principal: 17501, interest: 350, emi: 17851, principal_paid: 0, interest_paid: 0 }
    ] },
  // Interest Only + Constant (DAILY) — fully repaid, CLOSED
  { id: 103, company_id: 1, loan_account_no: 'LN-2026-003', borrower_id: null, scheme_id: 3, borrower_name: 'Anil Verma', phone: '9765432109', branch: 'West Branch', collector: 'Mike Manager', loan_date: '2026-02-01', next_due: '2026-05-20', principal_amount: 30000, total_payable: 31040, collected_amount: 31040, pending_amount: 0, installment_amount: 300, tenure_days: 110, status: 'CLOSED', daysOverdue: 0, aadhaar: '1234-5678-9012', pan: 'LKJHG5432M', guarantor: 'Vijay Verma', monthly_interest_rate: 2.0, repayment_method: 'INTEREST_ONLY', interest_calculation: 'CONSTANT_FLAT', repayment_frequency: 'DAILY', last_payment_date: '2026-03-25', repayment_schedule: null },
  // EMI + Constant / Flat EMI (MONTHLY) — 2 of 6 installments paid
  { id: 104, company_id: 1, loan_account_no: 'LN-2026-004', borrower_id: 3, scheme_id: 2, borrower_name: 'Suresh Patel', phone: '9988776655', branch: 'Main Branch', collector: 'Sarah Collector', loan_date: '2026-04-01', next_due: '2026-06-30', principal_amount: 75000, total_payable: 84000, collected_amount: 28000, pending_amount: 50000, installment_amount: 14000, tenure_days: 180, status: 'ACTIVE', aadhaar: '7766-5544-3322', pan: 'MNBVC9876L', guarantor: 'Dinesh Patel', monthly_interest_rate: 2.0, repayment_method: 'EMI', interest_calculation: 'CONSTANT_FLAT', repayment_frequency: 'MONTHLY', last_payment_date: '2026-06-01',
    repayment_schedule: [
      { period: 1, due_date: '2026-05-01', principal: 12500, interest: 1500, emi: 14000, principal_paid: 12500, interest_paid: 1500 },
      { period: 2, due_date: '2026-05-31', principal: 12500, interest: 1500, emi: 14000, principal_paid: 12500, interest_paid: 1500 },
      { period: 3, due_date: '2026-06-30', principal: 12500, interest: 1500, emi: 14000, principal_paid: 0, interest_paid: 0 },
      { period: 4, due_date: '2026-07-30', principal: 12500, interest: 1500, emi: 14000, principal_paid: 0, interest_paid: 0 },
      { period: 5, due_date: '2026-08-29', principal: 12500, interest: 1500, emi: 14000, principal_paid: 0, interest_paid: 0 },
      { period: 6, due_date: '2026-09-28', principal: 12500, interest: 1500, emi: 14000, principal_paid: 0, interest_paid: 0 }
    ] },
  // Interest Only + Flexible (DAILY) — no payment since 2026-07-05, OVERDUE
  { id: 105, company_id: 1, loan_account_no: 'LN-2026-005', borrower_id: null, scheme_id: 1, borrower_name: 'Meena Reddy', phone: '9445566778', branch: 'East Branch', collector: 'Sarah Collector', loan_date: '2026-06-15', next_due: '2026-07-24', principal_amount: 40000, total_payable: 46000, collected_amount: 4000, pending_amount: 36522, installment_amount: 400, tenure_days: 110, status: 'OVERDUE', daysOverdue: 32, aadhaar: '5566-7788-9900', pan: 'QWERT1234N', guarantor: 'Kiran Reddy', monthly_interest_rate: 2.0, repayment_method: 'INTEREST_ONLY', interest_calculation: 'FLEXIBLE_REDUCING', repayment_frequency: 'DAILY', last_payment_date: '2026-07-05', repayment_schedule: null },
  { id: 106, company_id: 1, loan_account_no: 'APP-2026-088', borrower_id: null, scheme_id: 1, borrower_name: 'Venkatesh Rao', phone: '9845012345', branch: 'Main Branch', collector: 'Mike Manager', loan_date: '2026-07-27', principal_amount: 60000, pending_amount: 60000, collected_amount: 0, installment_amount: 600, tenure_days: 100, status: 'PENDING', aadhaar: '9845-1234-5678', pan: 'VNKT8901R', guarantor: 'Srinivas Rao', purpose: 'Business Expansion' },
  { id: 107, company_id: 1, loan_account_no: 'APP-2026-089', borrower_id: null, scheme_id: 2, borrower_name: 'Kavitha Sundaram', phone: '9443210987', branch: 'West Branch', collector: 'Sarah Collector', loan_date: '2026-07-26', principal_amount: 45000, pending_amount: 45000, collected_amount: 0, installment_amount: 450, tenure_days: 100, status: 'PENDING', aadhaar: '3412-7890-5612', pan: 'KVTH5678S', guarantor: 'Sundaram Murthy', purpose: 'Working Capital' }
];

const INITIAL_EMPLOYEES = [
  { id: 1, company_id: 1, name: 'John Admin', email: 'admin@alpha.com', role: 'ADMIN', permissions: [] },
  { id: 2, company_id: 1, name: 'Sarah Collector', email: 'sarah@alpha.com', role: 'COLLECTOR', permissions: [{ module: 'LOANS', action: 'VIEW', allowed: 1 }, { module: 'COLLECTIONS', action: 'COLLECT', allowed: 1 }] },
  { id: 3, company_id: 1, name: 'Mike Manager', email: 'mike@alpha.com', role: 'MANAGER', permissions: [{ module: 'LOANS', action: 'CREATE', allowed: 1 }, { module: 'EMPLOYEES', action: 'MANAGE', allowed: 1 }] }
];

const INITIAL_COLLECTIONS = [
  { id: 501, company_id: 1, loan_id: 101, borrower_name: 'Rajesh Kumar', collector_name: 'Sarah Collector', amount: 5000, principalPaid: 4667, interestPaid: 333, penalty: 0, collection_date: '2026-05-20', payment_mode: 'CASH', voucher_no: 'JE-20260520-01' },
  { id: 502, company_id: 1, loan_id: 101, borrower_name: 'Rajesh Kumar', collector_name: 'Sarah Collector', amount: 8000, principalPaid: 7516, interestPaid: 484, penalty: 0, collection_date: '2026-06-05', payment_mode: 'CASH', voucher_no: 'JE-20260605-01' },
  { id: 503, company_id: 1, loan_id: 101, borrower_name: 'Rajesh Kumar', collector_name: 'Sarah Collector', amount: 9000, principalPaid: 8546, interestPaid: 454, penalty: 0, collection_date: '2026-06-23', payment_mode: 'CASH', voucher_no: 'JE-20260623-01' },
  { id: 504, company_id: 1, loan_id: 102, borrower_name: 'Priya Sharma', collector_name: 'Sarah Collector', amount: 17853, principalPaid: 15853, interestPaid: 2000, penalty: 0, collection_date: '2026-03-15', payment_mode: 'UPI', voucher_no: 'JE-20260315-01' },
  { id: 505, company_id: 1, loan_id: 102, borrower_name: 'Priya Sharma', collector_name: 'Sarah Collector', amount: 17853, principalPaid: 16170, interestPaid: 1683, penalty: 0, collection_date: '2026-04-15', payment_mode: 'UPI', voucher_no: 'JE-20260415-01' },
  { id: 506, company_id: 1, loan_id: 103, borrower_name: 'Anil Verma', collector_name: 'Sarah Collector', amount: 12700, principalPaid: 12320, interestPaid: 380, penalty: 0, collection_date: '2026-02-20', payment_mode: 'CASH', voucher_no: 'JE-20260220-01' },
  { id: 507, company_id: 1, loan_id: 103, borrower_name: 'Anil Verma', collector_name: 'Sarah Collector', amount: 12700, principalPaid: 12340, interestPaid: 360, penalty: 0, collection_date: '2026-03-10', payment_mode: 'CASH', voucher_no: 'JE-20260310-01' },
  { id: 508, company_id: 1, loan_id: 103, borrower_name: 'Anil Verma', collector_name: 'Sarah Collector', amount: 5640, principalPaid: 5340, interestPaid: 300, penalty: 0, collection_date: '2026-03-25', payment_mode: 'CASH', voucher_no: 'JE-20260325-01' },
  { id: 509, company_id: 1, loan_id: 104, borrower_name: 'Suresh Patel', collector_name: 'Sarah Collector', amount: 14000, principalPaid: 12500, interestPaid: 1500, penalty: 0, collection_date: '2026-05-01', payment_mode: 'BANK_TRANSFER', voucher_no: 'JE-20260501-01' },
  { id: 510, company_id: 1, loan_id: 104, borrower_name: 'Suresh Patel', collector_name: 'Sarah Collector', amount: 14000, principalPaid: 12500, interestPaid: 1500, penalty: 0, collection_date: '2026-06-01', payment_mode: 'BANK_TRANSFER', voucher_no: 'JE-20260601-02' },
  { id: 511, company_id: 1, loan_id: 105, borrower_name: 'Meena Reddy', collector_name: 'Sarah Collector', amount: 2000, principalPaid: 1733, interestPaid: 267, penalty: 0, collection_date: '2026-06-25', payment_mode: 'CASH', voucher_no: 'JE-20260625-01' },
  { id: 512, company_id: 1, loan_id: 105, borrower_name: 'Meena Reddy', collector_name: 'Sarah Collector', amount: 2000, principalPaid: 1745, interestPaid: 255, penalty: 0, collection_date: '2026-07-05', payment_mode: 'CASH', voucher_no: 'JE-20260705-01' }
];

const INITIAL_BORROWERS = [
  { id: 1, company_id: 1, borrower_code: 'BR-0001', full_name: 'Rajesh Kumar', phone: '9876543210', alt_phone: '', email: '', dob: '1985-04-12', gender: 'MALE', address_line1: 'Main St 123', address_line2: '', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', aadhaar_number: '458912348971', pan_number: 'ABCDE1234F', occupation: 'Business', monthly_income: 45000, employer_name: '', guarantor_name: 'Mahesh Kumar', guarantor_phone: '9876500001', nominee_name: '', nominee_relation: '', branch: 'Karur Branch', kyc_status: 'VERIFIED', kyc_verified_at: '2026-05-01', kyc_expiry_date: '2028-05-01', kyc_rejection_reason: null, kyc_reviewed_by: 'John Admin', kyc_reviewed_at: '2026-05-01', status: 'ACTIVE', notes: '' },
  { id: 2, company_id: 1, borrower_code: 'BR-0002', full_name: 'Priya Sharma', phone: '9812345678', alt_phone: '', email: '', dob: '1990-09-23', gender: 'FEMALE', address_line1: 'Market Road 45', address_line2: '', city: 'Chennai', state: 'Tamil Nadu', pincode: '600002', aadhaar_number: '891234567890', pan_number: 'XYZPD9876K', occupation: 'Salaried', monthly_income: 38000, employer_name: 'ABC Textiles', guarantor_name: 'Sunil Sharma', guarantor_phone: '9812300002', nominee_name: '', nominee_relation: '', branch: 'Karur Branch', kyc_status: 'VERIFIED', kyc_verified_at: '2026-04-15', kyc_expiry_date: '2028-04-15', kyc_rejection_reason: null, kyc_reviewed_by: 'John Admin', kyc_reviewed_at: '2026-04-15', status: 'ACTIVE', notes: '' },
  { id: 3, company_id: 1, borrower_code: 'BR-0003', full_name: 'Suresh Patel', phone: '9988776655', alt_phone: '', email: '', dob: '1992-01-18', gender: 'MALE', address_line1: '', address_line2: '', city: '', state: '', pincode: '', aadhaar_number: '776655443322', pan_number: 'MNBVC9876L', occupation: 'Business', monthly_income: null, employer_name: '', guarantor_name: 'Dinesh Patel', guarantor_phone: '9988700002', nominee_name: '', nominee_relation: '', branch: 'Karur Branch', kyc_status: 'PENDING', kyc_verified_at: null, kyc_expiry_date: null, kyc_rejection_reason: null, kyc_reviewed_by: null, kyc_reviewed_at: null, status: 'ACTIVE', notes: '' }
];

const INITIAL_BRANCHES = [
  { id: 1, company_id: 1, name: 'Karur Branch', code: 'KRM', address: '', phone: '', city: '', state: '', pincode: '', is_active: 1 },
  { id: 2, company_id: 1, name: 'Namakkal Branch', code: 'NKL', address: '', phone: '', city: '', state: '', pincode: '', is_active: 1 },
  { id: 3, company_id: 1, name: 'Salem Branch', code: 'SLM', address: '', phone: '', city: '', state: '', pincode: '', is_active: 1 },
  { id: 4, company_id: 1, name: 'Chennai Branch', code: 'CHN', address: '', phone: '', city: '', state: '', pincode: '', is_active: 1 },
  { id: 5, company_id: 1, name: 'Madurai Branch', code: 'MDU', address: '', phone: '', city: '', state: '', pincode: '', is_active: 1 }
];

export default function App() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [path, setPath] = useState(() => window.location.pathname || '/login');

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
    const current = window.location.pathname.replace(/^\//, '');
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

  const [loans, setLoans] = useState(INITIAL_LOANS);
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
    logAudit('EOD_CLOSURE', record.id, 'CREATE', null, {
      branch: record.branch, date: record.date, counted_cash: record.counted_cash, difference: record.difference, status: record.status
    });
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
    logAudit('EOD_CLOSURE', id, 'UPDATE', before, { ...before, ...payload, status: variance ? 'PENDING_REVIEW' : 'CLOSED' });
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
    logAudit('EOD_CLOSURE', id, 'UPDATE', before, { ...before, status: 'CLOSED', resolution_note: resolutionNote });
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
    logAudit('EOD_CLOSURE', id, 'UPDATE', before, { ...before, reopened_for_hours: hours, reopened_until: grant.expires_at });
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
    logAudit('EOD_REOPEN_REQUEST', request.id, 'CREATE', null, { branch: before?.branch, date: before?.date, reason, requested_hours: hours });
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
    logAudit('EOD_REOPEN_REQUEST', requestId, 'UPDATE', before, { status: 'APPROVED', granted_hours: hours, expires_at: grant.expires_at });
  };

  const handleRejectEodReopen = (id, requestId, decisionReason) => {
    const before = eodRecords.find(r => r.id === id);
    setEodRecords(prev => prev.map(r => (r.id === id ? {
      ...r,
      reopen_requests: (r.reopen_requests || []).map(req => (req.id === requestId ? {
        ...req, status: 'REJECTED', decided_by: user?.name || 'Admin', decided_at: new Date().toISOString(), decision_reason: decisionReason
      } : req))
    } : r)));
    logAudit('EOD_REOPEN_REQUEST', requestId, 'UPDATE', before, { status: 'REJECTED', decision_reason: decisionReason });
  };

  const handleUpdateEodDenominationSettings = (settings) => {
    setEodDenominationSettings(settings);
  };

  // Central audit trail hook — every mutation to a record of consequence (staff
  // permissions, loan schemes, loan closure, collections, branches) writes one
  // entry here with a before/after snapshot, so "who changed what and when" is
  // always answerable without re-deriving it from scattered state history.
  const logAudit = (entityType, entityId, action, before, after) => {
    setAuditLogs(prev => [{
      id: `AL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      entity_type: entityType,
      entity_id: entityId,
      action,
      before: before ?? null,
      after: after ?? null,
      actor_name: user?.name || 'System',
      actor_role: user?.role || '',
      created_at: new Date().toISOString()
    }, ...prev]);
  };
  const [collections, setCollections] = useState(INITIAL_COLLECTIONS);
  const [borrowers, setBorrowers] = useState(INITIAL_BORROWERS);
  const [kycReviewBorrowerId, setKycReviewBorrowerId] = useState(null);
  const [branchesList, setBranchesList] = useState(INITIAL_BRANCHES);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState('');

  // Finance Operations modules — pure mock data, local state only, no backend calls.
  const [loanSchemes, setLoanSchemes] = useState(INITIAL_LOAN_SCHEMES);
  const [investors, setInvestors] = useState(INITIAL_INVESTORS);
  const [investorTransactions, setInvestorTransactions] = useState(INITIAL_INVESTOR_TRANSACTIONS);
  const [fixedDeposits, setFixedDeposits] = useState(INITIAL_FIXED_DEPOSITS);
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
    const targetUrl = `/${newTab}`;
    navigateTo(targetUrl);
  };

  useEffect(() => {
    const handlePopState = () => {
      const currentPath = window.location.pathname || '/login';
      setPath(currentPath);
      const tabName = currentPath.replace(/^\//, '');
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

  const fetchData = async () => {
    try {
      const [loansRes, empsRes, colRes] = await Promise.all([
        api.get('/finance/loans'),
        api.get('/employees'),
        api.get('/finance/collections')
      ]);
      if (loansRes.data?.data) setLoans(loansRes.data.data);
      if (empsRes.data?.data) setEmployees(empsRes.data.data);
      if (colRes.data?.data) setCollections(colRes.data.data);
    } catch (err) {
      console.warn('Using initial state for demo preview');
    }
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
    logAudit('EMPLOYEE', id, 'UPDATE', before, { ...before, ...payload });
  };

  const handleDeleteEmployee = (id) => {
    const before = employees.find(e => e.id === id);
    setEmployees(prev => prev.filter(e => e.id !== id));
    logAudit('EMPLOYEE', id, 'DELETE', before, null);
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

  // ── Loan Scheme Master (mock-only, no backend) ──
  const handleCreateLoanScheme = (payload) => {
    const newScheme = { id: Date.now(), is_active: true, ...payload };
    setLoanSchemes(prev => [...prev, newScheme]);
    logAudit('LOAN_SCHEME', newScheme.id, 'CREATE', null, newScheme);
  };
  const handleUpdateLoanScheme = (id, payload) => {
    const before = loanSchemes.find(s => s.id === id);
    setLoanSchemes(prev => prev.map(s => (s.id === id ? { ...s, ...payload } : s)));
    logAudit('LOAN_SCHEME', id, 'UPDATE', before, { ...before, ...payload });
  };
  const handleDeleteLoanScheme = (id) => {
    const inUse = loans.some(l => l.scheme_id === id && (l.status === 'ACTIVE' || l.status === 'OVERDUE' || l.status === 'PENDING'));
    if (inUse) {
      const err = new Error('Cannot delete: this scheme is assigned to active loans or applications.');
      err.response = { data: { message: err.message } };
      throw err;
    }
    const before = loanSchemes.find(s => s.id === id);
    setLoanSchemes(prev => prev.filter(s => s.id !== id));
    logAudit('LOAN_SCHEME', id, 'DELETE', before, null);
  };

  // ── Investor Capital (mock-only, no backend) ──
  const handleCreateInvestor = (payload) => {
    const nextSeq = investors.length ? Math.max(...investors.map(i => parseInt((i.investor_code || 'INV-0000').split('-')[1], 10) || 0)) + 1 : 1;
    const newInvestor = { id: Date.now(), investor_code: `INV-${String(nextSeq).padStart(4, '0')}`, status: 'ACTIVE', ...payload };
    setInvestors(prev => [...prev, newInvestor]);
  };
  const handleUpdateInvestor = (id, payload) => {
    setInvestors(prev => prev.map(i => (i.id === id ? { ...i, ...payload } : i)));
  };
  const handleDeleteInvestor = (id) => {
    const hasTransactions = investorTransactions.some(t => t.investor_id === id);
    if (hasTransactions) {
      const err = new Error('Cannot delete: this investor has capital transactions on record.');
      err.response = { data: { message: err.message } };
      throw err;
    }
    setInvestors(prev => prev.filter(i => i.id !== id));
  };
  const investorBalance = (investorId) => investorTransactions
    .filter(t => t.investor_id === investorId)
    .reduce((acc, t) => acc + (t.type === 'WITHDRAWAL' ? -t.amount : (t.type === 'CAPITAL_INJECTION' || t.type === 'TOP_UP' ? t.amount : 0)), 0);
  // Every capital movement also hits the double-entry ledger so investor capital
  // shows up in General Ledger / Trial Balance like every other cash movement in
  // the app — injections and top-ups credit Investor Capital, a withdrawal debits
  // it back down, and a yield payout is a real expense (return paid on that
  // capital), not a reduction of the capital balance itself.
  const handleCreateInvestorTransaction = (payload) => {
    if (payload.type === 'WITHDRAWAL' && payload.amount > investorBalance(payload.investor_id)) {
      const err = new Error('Withdrawal amount exceeds the investor\'s available capital balance.');
      err.response = { data: { message: err.message } };
      throw err;
    }
    const txnId = Date.now();
    const investor = investors.find(i => i.id === payload.investor_id);
    const cashAccount = payload.payment_mode === 'BANK' ? '1002' : '1001';
    const amount = payload.amount;
    let lines;
    let narration;
    if (payload.type === 'WITHDRAWAL') {
      lines = [journalLine('2100', amount, 0), journalLine(cashAccount, 0, amount)];
      narration = `Investor capital withdrawal — ${investor?.name || 'Investor'}`;
    } else if (payload.type === 'YIELD_PAYOUT') {
      lines = [journalLine('5002', amount, 0), journalLine(cashAccount, 0, amount)];
      narration = `Investor yield payout — ${investor?.name || 'Investor'}`;
    } else {
      lines = [journalLine(cashAccount, amount, 0), journalLine('2100', 0, amount)];
      narration = `Investor capital ${payload.type === 'TOP_UP' ? 'top-up' : 'injection'} — ${investor?.name || 'Investor'}`;
    }
    postJournal(narration, lines, 'INVESTOR_CAPITAL', txnId, payload.date, null);
    setInvestorTransactions(prev => [{ id: txnId, ...payload }, ...prev]);
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
  const handlePrematureCloseFixedDeposit = (id) => {
    const fd = fixedDeposits.find(f => f.id === id);
    if (fd) {
      const penaltyRate = 0.02; // 2% penalty on the maturity value for early exit
      const payout = Math.round(fd.maturity_value * (1 - penaltyRate));
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

  // ── Expense Allocation (mock-only, no backend) ──
  // Categories are funded accounts: PENDING (no balance, not spendable) until an admin
  // approves the requested amount, at which point they go ACTIVE and vouchers can draw
  // down `balance`. Creating a category and requesting its initial funding is one step.
  const handleCreateExpenseCategory = (payload) => {
    const catId = Date.now();
    const newCategory = { id: catId, name: payload.name, status: 'PENDING', balance: 0, allocated_total: 0 };
    setExpenseCategories(prev => [...prev, newCategory]);
    setExpenseAllocationRequests(prev => [
      {
        id: catId + 1,
        category_id: catId,
        category_name: payload.name,
        type: 'INITIAL',
        amount: Number(payload.amount) || 0,
        reason: payload.reason || '',
        status: 'PENDING',
        requested_by: user?.name || 'Staff',
        requested_at: new Date().toISOString(),
        approved_by: null,
        approved_at: null,
        rejection_reason: null
      },
      ...prev
    ]);
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
    if (expenseAllocationRequests.some(r => r.category_id === id && r.status === 'PENDING')) {
      throw new Error(`Cannot delete "${category.name}" — it has a pending approval request.`);
    }
    setExpenseCategories(prev => prev.filter(c => c.id !== id));
  };

  // A funded (ACTIVE) account running low or to zero requests a TOPUP; an ad-hoc urgent
  // need not covered by the normal balance requests EMERGENCY funds — both credit the
  // account's balance once approved, but are tracked separately for audit purposes.
  const handleRequestExpenseAllocation = (payload) => {
    const category = expenseCategories.find(c => c.id === Number(payload.category_id));
    if (!category) return;
    setExpenseAllocationRequests(prev => [
      {
        id: Date.now(),
        category_id: category.id,
        category_name: category.name,
        type: payload.type || 'TOPUP',
        amount: Number(payload.amount) || 0,
        reason: payload.reason || '',
        status: 'PENDING',
        requested_by: user?.name || 'Staff',
        requested_at: new Date().toISOString(),
        approved_by: null,
        approved_at: null,
        rejection_reason: null
      },
      ...prev
    ]);
  };

  const handleApproveExpenseAllocation = (requestId) => {
    const request = expenseAllocationRequests.find(r => r.id === requestId);
    if (!request || request.status !== 'PENDING') return;

    setExpenseCategories(prev => prev.map(c => (
      c.id === request.category_id
        ? { ...c, status: 'ACTIVE', balance: c.balance + request.amount, allocated_total: c.allocated_total + request.amount }
        : c
    )));
    setExpenseAllocationRequests(prev => prev.map(r => (
      r.id === requestId
        ? { ...r, status: 'APPROVED', approved_by: user?.name || 'Admin', approved_at: new Date().toISOString() }
        : r
    )));
  };

  const handleRejectExpenseAllocation = (requestId, reason) => {
    const request = expenseAllocationRequests.find(r => r.id === requestId);
    if (!request || request.status !== 'PENDING') return;

    if (request.type === 'INITIAL') {
      setExpenseCategories(prev => prev.map(c => (
        c.id === request.category_id ? { ...c, status: 'REJECTED' } : c
      )));
    }
    setExpenseAllocationRequests(prev => prev.map(r => (
      r.id === requestId
        ? { ...r, status: 'REJECTED', rejection_reason: reason || 'Not specified', approved_by: user?.name || 'Admin', approved_at: new Date().toISOString() }
        : r
    )));
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
      kyc_expiry_date: null,
      kyc_rejection_reason: null,
      kyc_reviewed_by: null,
      kyc_reviewed_at: null,
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
      updated = {
        ...b,
        kyc_status: 'VERIFIED',
        kyc_verified_at: new Date().toISOString().slice(0, 10),
        kyc_expiry_date: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        kyc_rejection_reason: null,
        kyc_reviewed_by: user?.name || 'Admin',
        kyc_reviewed_at: new Date().toISOString().slice(0, 10)
      };
      return updated;
    }));
    return updated;
  };

  const handleRejectBorrowerKyc = (id, reason) => {
    let updated = null;
    setBorrowers(prev => prev.map(b => {
      if (b.id !== id) return b;
      updated = {
        ...b,
        kyc_status: 'REJECTED',
        kyc_rejection_reason: reason,
        kyc_reviewed_by: user?.name || 'Admin',
        kyc_reviewed_at: new Date().toISOString().slice(0, 10)
      };
      return updated;
    }));
    return updated;
  };

  const handleLoginSuccess = (userData, token) => {
    setUser(userData);
    setTenant({ id: userData.companyId || 1, name: userData.companyName || 'Alpha Financial Services Ltd' });
    setIsAuthenticated(true);
    setIsJumpingTenant(false);

    if (userData.role === 'SUPER_ADMIN') {
      navigateTo('/superadmin');
    } else {
      navigateTo('/dashboard');
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
    navigateTo('/login');
  };

  const handleSuperAdminJumpToTenant = (targetTenant) => {
    setTenant({ id: targetTenant.id, name: targetTenant.name });
    localStorage.setItem('financial_erp_tenant_id', targetTenant.id);
    localStorage.setItem('financial_erp_db_name', targetTenant.db_name);
    setIsJumpingTenant(true);
  };

  const [disburseModalMode, setDisburseModalMode] = useState('DISBURSE');

  const handleQuickAction = (actionType, payload) => {
    const act = (actionType || '').toUpperCase();
    if (act === 'SUBMIT_APPLICATION' && payload) {
      const schemeId = payload.scheme_id ? Number(payload.scheme_id) : 1;
      const matchedScheme = loanSchemes.find(s => s.id === schemeId);
      const repaymentMethod = resolveSchemeRepaymentMethod(matchedScheme);
      const interestCalculation = resolveSchemeInterestCalculation(matchedScheme);
      const loanDate = new Date().toISOString().slice(0, 10);

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
        total_payable: payload.principal_amount * (1 + (payload.monthly_interest_rate / 100) * payload.tenure_months),
        collected_amount: 0,
        pending_amount: payload.principal_amount,
        installment_amount: payload.installment_amount,
        tenure_days: Math.round(payload.tenure_months * 30),
        monthly_interest_rate: payload.monthly_interest_rate,
        repayment_frequency: payload.repayment_frequency || matchedScheme?.repayment_frequency || 'DAILY',
        repayment_method: repaymentMethod,
        interest_calculation: interestCalculation,
        repayment_schedule: repaymentMethod === 'EMI' ? generateEmiSchedule({
          principal: payload.principal_amount,
          monthlyInterestRate: payload.monthly_interest_rate,
          tenureMonths: payload.tenure_months,
          repaymentFrequency: payload.repayment_frequency || matchedScheme?.repayment_frequency || 'DAILY',
          interestCalculation,
          startDate: loanDate
        }) : null,
        purpose: payload.purpose,
        nominee: payload.nominee,
        security: payload.security,
        status: 'PENDING'
      };
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
    logAudit('COLLECTION', newReceipt.id, 'PAYMENT_RECORDED', null, {
      loan_id: payload.loan_id, amount: totalAmt, principal_portion: principalPaid,
      interest_portion: interestPaid, voucher_no: voucherNo, payment_mode: newReceipt.payment_mode
    });

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
    logAudit('COLLECTION', collectionId, 'REVERTED', collection, { revert_reason: reason });
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
    logAudit('COLLECTION', collectionId, 'UPDATE', before, updates);
  };

  const handleMarkChequeCleared = (collectionId) => {
    const before = collections.find(c => c.id === collectionId);
    setCollections(prev => prev.map(c => (c.id === collectionId ? {
      ...c, clearance_status: 'CLEARED', cleared_by: user?.name || 'Admin', cleared_at: new Date().toISOString()
    } : c)));
    logAudit('COLLECTION', collectionId, 'CHEQUE_CLEARED', before, { clearance_status: 'CLEARED' });
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
    logAudit('COLLECTION', collectionId, 'CHEQUE_BOUNCED', collection, { clearance_status: 'BOUNCED', bounce_reason: reason });
  };

  const handleDisburseLoan = (form) => {
    const mRate = parseFloat(form.monthly_interest_rate || form.interest_rate) || 2.0;
    const months = (form.tenure_days / 30) || 4;
    const total_payable = form.principal_amount * (1 + (mRate / 100) * months);
    const isApplication = form.mode === 'APPLICATION';

    // Link to an existing Customer Directory record by phone, if one exists.
    const matchedBorrower = borrowers.find(b => b.phone === form.phone);
    const matchedScheme = loanSchemes.find(s => s.id === (form.scheme_id ? Number(form.scheme_id) : loanSchemes[0]?.id));
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
      total_payable: parseFloat(total_payable),
      collected_amount: 0,
      pending_amount: parseFloat(form.principal_amount),
      installment_amount: parseFloat(form.installment_amount),
      tenure_days: parseInt(form.tenure_days),
      monthly_interest_rate: mRate,
      repayment_frequency: repaymentFrequency,
      repayment_method: repaymentMethod,
      interest_calculation: interestCalculation,
      repayment_schedule: repaymentMethod === 'EMI' ? generateEmiSchedule({
        principal: parseFloat(form.principal_amount),
        monthlyInterestRate: mRate,
        tenureMonths: months,
        repaymentFrequency,
        interestCalculation,
        startDate: loanDate
      }) : null,
      aadhaar: matchedBorrower?.aadhaar_number || '',
      pan: matchedBorrower?.pan_number || '',
      guarantor: matchedBorrower?.guarantor_name || 'Self',
      purpose: form.purpose || '',
      status: isApplication ? 'PENDING' : 'ACTIVE'
    };

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
        ? { ...l, status: 'APPROVED', loan_account_no: l.loan_account_no.replace('APP-', 'LN-'), total_payable: l.principal_amount * 1.1, next_due: new Date().toISOString().slice(0, 10) }
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
    logAudit('LOAN', loanId, 'CLOSURE_APPROVED', { status: before?.status }, { status: 'CLOSED' });
  };

  const handleRejectLoanClosure = (loanId, reason) => {
    const before = loans.find(l => l.id === loanId);
    setLoans(prev => prev.map(l => (
      l.id === loanId
        ? { ...l, status: 'ACTIVE', closure_rejection_reason: reason || 'Not specified', closure_requested_at: null, closure_requested_by: null }
        : l
    )));
    logAudit('LOAN', loanId, 'CLOSURE_REJECTED', { status: before?.status }, { status: 'ACTIVE', reason: reason || 'Not specified' });
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

  // Route 1: Dedicated Super Admin Login Page (/superadmin/login or /superadmin)
  if (path === '/superadmin/login' || path === '/superadmin') {
    return <SuperAdminLoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Route 2: Company Code -> Subscribed Module Selection -> Credentials
  // (Guarded against a refresh landing on a step whose prerequisite data went missing.)
  if (!isAuthenticated) {
    const effectiveAuthFlow = authFlow === 'LOGIN' && (!verifiedCompany || !selectedModule)
      ? (verifiedCompany ? 'MODULE_SELECT' : 'COMPANY_CODE')
      : (authFlow === 'MODULE_SELECT' && !verifiedCompany ? 'COMPANY_CODE' : authFlow);

    if (effectiveAuthFlow === 'COMPANY_CODE') {
      return (
        <CompanyCodePage
          onVerified={(company) => {
            setVerifiedCompany(company);
            setAuthFlow('MODULE_SELECT');
          }}
        />
      );
    }

    if (effectiveAuthFlow === 'MODULE_SELECT') {
      return (
        <ModuleSelectorPage
          company={verifiedCompany}
          onBack={() => {
            setVerifiedCompany(null);
            setAuthFlow('COMPANY_CODE');
          }}
          onSelectModule={(mod) => {
            setSelectedModule(mod);
            setAuthFlow('LOGIN');
            navigateTo('/login');
          }}
        />
      );
    }

    return (
      <LoginPage
        company={verifiedCompany}
        module={selectedModule}
        onLoginSuccess={handleLoginSuccess}
        onBackToModules={() => {
          setSelectedModule(null);
          setAuthFlow('MODULE_SELECT');
        }}
      />
    );
  }

  // Route 3: Render Super Admin Portal if logged in as SUPER_ADMIN
  if (user?.role === 'SUPER_ADMIN' && !isJumpingTenant) {
    return (
      <SuperAdminPortal
        user={user}
        onJumpToTenant={handleSuperAdminJumpToTenant}
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
    >
      {/* Super Admin Impersonation Banner */}
      {user?.role === 'SUPER_ADMIN' && isJumpingTenant && (
        <div className="bg-amber-100 border border-amber-300 text-amber-900 px-3 py-1.5 rounded text-xs font-mono mb-2 flex justify-between items-center">
          <span>SUPER ADMIN IMPERSONATION ACTIVE — Inspecting tenant: <strong>{tenant.name}</strong></span>
          <button
            onClick={() => setIsJumpingTenant(false)}
            className="px-2 py-0.5 bg-amber-800 text-white rounded font-bold text-[10px]"
          >
            Return to Super Admin Portal
          </button>
        </div>
      )}

      {/* Dashboard Overview Tab */}
      {activeTab === 'dashboard' && (
        <DashboardOverviewView
          loans={loans}
          collections={collections}
          borrowers={borrowers}
          branchesList={branchesList}
          user={user}
          onQuickAction={handleQuickAction}
          onOpenCollectDrawer={(loan) => setSelectedLoanForCollection(loan)}
        />
      )}

      {/* Loan Register (Active / Closed accounts + Closure Requests) */}
      {(activeTab.includes('active-loans') || activeTab.includes('closed-loans') || activeTab.includes('loans-register')) && (
        <LoansView
          loans={loans}
          borrowers={borrowers}
          loanSchemes={loanSchemes}
          receipts={collections}
          activeTab={activeTab}
          onApproveLoanClosure={handleApproveLoanClosure}
          onRejectLoanClosure={handleRejectLoanClosure}
        />
      )}

      {/* Loan Applications (creation + admin approval — separate from the register) */}
      {activeTab.includes('loan-applications') && (
        <LoanApplicationsView
          loans={loans}
          borrowers={borrowers}
          loanSchemes={loanSchemes}
          onQuickAction={handleQuickAction}
          onApproveApplication={handleApproveApplication}
          onRejectApplication={handleRejectApplication}
          onRevertApplication={handleRevertApplication}
        />
      )}

      {/* Investor Capital */}
      {activeTab === 'investor-capital' && (
        <InvestorCapitalView
          investors={investors}
          transactions={investorTransactions}
          onCreateInvestor={handleCreateInvestor}
          onUpdateInvestor={handleUpdateInvestor}
          onDeleteInvestor={handleDeleteInvestor}
          onCreateTransaction={handleCreateInvestorTransaction}
        />
      )}

      {/* Fixed Deposits */}
      {activeTab === 'fixed-deposits' && (
        <FixedDepositsView
          fixedDeposits={fixedDeposits}
          borrowers={borrowers}
          tenant={tenant}
          onCreateFd={handleCreateFixedDeposit}
          onMatureFd={handleMatureFixedDeposit}
          onPrematureCloseFd={handlePrematureCloseFixedDeposit}
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
        <GeneralLedgerView chartOfAccounts={chartOfAccounts} journalEntries={journalEntries} branchesList={branchesList} />
      )}
      {(activeTab.includes('loan-ledger')) && (
        <LoanLedgerView loans={loans} collections={collections} branchesList={branchesList} />
      )}
      {(activeTab.includes('customer-ledger')) && (
        <CustomerLedgerView borrowers={borrowers} loans={loans} collections={collections} branchesList={branchesList} />
      )}
      {(activeTab.includes('trial-balance')) && (
        <TrialBalanceView chartOfAccounts={chartOfAccounts} journalEntries={journalEntries} branchesList={branchesList} />
      )}
      {(activeTab.includes('auto-vouchers')) && (
        <AutoVouchersView journalEntries={journalEntries} branchesList={branchesList} chartOfAccounts={chartOfAccounts} tenant={tenant} />
      )}
      {(activeTab.includes('manual-vouchers')) && (
        <ManualVouchersView
          journalEntries={journalEntries}
          chartOfAccounts={chartOfAccounts}
          branchesList={branchesList}
          employees={employees}
          expenseCategories={expenseCategories}
          tenant={tenant}
          onCreateManualVoucher={handleCreateManualVoucher}
        />
      )}
      {(activeTab.includes('eod-process')) && (
        <EODProcessView
          branchesList={branchesList}
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
            onCreateBorrower={handleCreateBorrower}
            onUpdateBorrower={handleUpdateBorrower}
            onDeleteBorrower={handleDeleteBorrower}
            onOpenKycReview={(b) => setKycReviewBorrowerId(b.id)}
          />
        )
      )}

      {/* Reports Module — each report is a standalone read-only page */}
      {(activeTab.includes('reports/loan-portfolio')) && (
        <LoanPortfolioReportView loans={loans} branchesList={branchesList} journalEntries={journalEntries} tenant={tenant} user={user} />
      )}
      {(activeTab.includes('reports/collections')) && (
        <CollectionsReportView collections={collections} loans={loans} branchesList={branchesList} journalEntries={journalEntries} tenant={tenant} user={user} />
      )}
      {(activeTab.includes('reports/borrower-kyc')) && (
        <BorrowerKycReportView borrowers={borrowers} loans={loans} branchesList={branchesList} tenant={tenant} user={user} />
      )}
      {(activeTab.includes('reports/investor-capital')) && (
        <InvestorCapitalReportView investors={investors} investorTransactions={investorTransactions} tenant={tenant} user={user} />
      )}
      {(activeTab.includes('reports/fixed-deposits')) && (
        <FixedDepositReportView fixedDeposits={fixedDeposits} borrowers={borrowers} tenant={tenant} user={user} />
      )}
      {(activeTab.includes('reports/financial-statements')) && (
        <FinancialStatementsReportView chartOfAccounts={chartOfAccounts} journalEntries={journalEntries} branchesList={branchesList} tenant={tenant} user={user} />
      )}
      {(activeTab.includes('reports/staff-performance')) && (
        <StaffPerformanceReportView employees={employees} loans={loans} collections={collections} branchesList={branchesList} journalEntries={journalEntries} tenant={tenant} user={user} />
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
            expenseCategories={expenseCategories}
            onCreateExpenseCategory={handleCreateExpenseCategory}
            onUpdateExpenseCategory={handleUpdateExpenseCategory}
            onDeleteExpenseCategory={handleDeleteExpenseCategory}
            expenseAllocationRequests={expenseAllocationRequests}
            onRequestExpenseAllocation={handleRequestExpenseAllocation}
            onApproveExpenseAllocation={handleApproveExpenseAllocation}
            onRejectExpenseAllocation={handleRejectExpenseAllocation}
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
