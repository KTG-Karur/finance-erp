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
import LoansView from './modules/loan/LoansView';
import InvestorCapitalView from './modules/investors/InvestorCapitalView';
import FixedDepositsView from './modules/fixedDeposits/FixedDepositsView';
import DailyCollectionsView from './modules/finance/DailyCollectionsView';
import CollectionsHistoryView from './modules/loan/CollectionsHistoryView';
import FinanceAccountingView from './modules/finance/FinanceAccountingView';
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
  INITIAL_EXPENSE_VOUCHERS,
  INITIAL_CHART_OF_ACCOUNTS
} from './data/mockFinanceData';

const INITIAL_LOANS = [
  { id: 101, company_id: 1, loan_account_no: 'LN-2026-001', borrower_id: 1, scheme_id: 1, borrower_name: 'Rajesh Kumar', phone: '9876543210', branch: 'Main Branch', collector: 'Sarah Collector', loan_date: '2026-05-10', next_due: '2026-07-24', principal_amount: 50000, total_payable: 55000, collected_amount: 22000, pending_amount: 33000, installment_amount: 500, tenure_days: 110, status: 'ACTIVE', aadhaar: '4589-1234-8971', pan: 'ABCDE1234F', guarantor: 'Mahesh Kumar', monthly_interest_rate: 2.0 },
  { id: 102, company_id: 1, loan_account_no: 'LN-2026-002', borrower_id: 2, scheme_id: 1, borrower_name: 'Priya Sharma', phone: '9812345678', branch: 'Main Branch', collector: 'Sarah Collector', loan_date: '2026-04-15', next_due: '2026-07-20', principal_amount: 100000, total_payable: 112000, collected_amount: 60000, pending_amount: 52000, installment_amount: 1000, tenure_days: 112, status: 'OVERDUE', daysOverdue: 4, aadhaar: '8912-3456-7890', pan: 'XYZPD9876K', guarantor: 'Sunil Sharma', monthly_interest_rate: 2.0 },
  { id: 103, company_id: 1, loan_account_no: 'LN-2026-003', borrower_id: null, scheme_id: 3, borrower_name: 'Anil Verma', phone: '9765432109', branch: 'West Branch', collector: 'Mike Manager', loan_date: '2026-02-01', next_due: '2026-05-20', principal_amount: 30000, total_payable: 33000, collected_amount: 33000, pending_amount: 0, installment_amount: 300, tenure_days: 110, status: 'CLOSED', daysOverdue: 0, aadhaar: '1234-5678-9012', pan: 'LKJHG5432M', guarantor: 'Vijay Verma', monthly_interest_rate: 2.0 },
  { id: 104, company_id: 1, loan_account_no: 'LN-2026-004', borrower_id: 3, scheme_id: 2, borrower_name: 'Suresh Patel', phone: '9988776655', branch: 'Main Branch', collector: 'Sarah Collector', loan_date: '2026-06-01', next_due: '2026-07-24', principal_amount: 75000, total_payable: 82500, collected_amount: 15000, pending_amount: 67500, installment_amount: 750, tenure_days: 110, status: 'ACTIVE', aadhaar: '7766-5544-3322', pan: 'MNBVC9876L', guarantor: 'Dinesh Patel', monthly_interest_rate: 2.0 },
  { id: 105, company_id: 1, loan_account_no: 'LN-2026-005', borrower_id: null, scheme_id: 1, borrower_name: 'Meena Reddy', phone: '9445566778', branch: 'East Branch', collector: 'Sarah Collector', loan_date: '2026-06-15', next_due: '2026-07-24', principal_amount: 40000, total_payable: 44000, collected_amount: 8000, pending_amount: 36000, installment_amount: 400, tenure_days: 110, status: 'ACTIVE', aadhaar: '5566-7788-9900', pan: 'QWERT1234N', guarantor: 'Kiran Reddy', monthly_interest_rate: 2.0 },
  { id: 106, company_id: 1, loan_account_no: 'APP-2026-088', borrower_id: null, scheme_id: 1, borrower_name: 'Venkatesh Rao', phone: '9845012345', branch: 'Main Branch', collector: 'Mike Manager', loan_date: '2026-07-27', principal_amount: 60000, pending_amount: 60000, collected_amount: 0, installment_amount: 600, tenure_days: 100, status: 'PENDING', aadhaar: '9845-1234-5678', pan: 'VNKT8901R', guarantor: 'Srinivas Rao', purpose: 'Business Expansion' },
  { id: 107, company_id: 1, loan_account_no: 'APP-2026-089', borrower_id: null, scheme_id: 2, borrower_name: 'Kavitha Sundaram', phone: '9443210987', branch: 'West Branch', collector: 'Sarah Collector', loan_date: '2026-07-26', principal_amount: 45000, pending_amount: 45000, collected_amount: 0, installment_amount: 450, tenure_days: 100, status: 'PENDING', aadhaar: '3412-7890-5612', pan: 'KVTH5678S', guarantor: 'Sundaram Murthy', purpose: 'Working Capital' }
];

const INITIAL_EMPLOYEES = [
  { id: 1, company_id: 1, name: 'John Admin', email: 'admin@alpha.com', role: 'ADMIN', permissions: [] },
  { id: 2, company_id: 1, name: 'Sarah Collector', email: 'sarah@alpha.com', role: 'COLLECTOR', permissions: [{ module: 'LOANS', action: 'VIEW', allowed: 1 }, { module: 'COLLECTIONS', action: 'COLLECT', allowed: 1 }] },
  { id: 3, company_id: 1, name: 'Mike Manager', email: 'mike@alpha.com', role: 'MANAGER', permissions: [{ module: 'LOANS', action: 'CREATE', allowed: 1 }, { module: 'EMPLOYEES', action: 'MANAGE', allowed: 1 }] }
];

const INITIAL_COLLECTIONS = [
  { id: 501, company_id: 1, loan_id: 101, borrower_name: 'Rajesh Kumar', collector_name: 'Sarah Collector', amount: 500, principalPaid: 420, interestPaid: 80, penalty: 0, collection_date: '2026-07-23', payment_mode: 'CASH', receipt_no: 'REC-20260723-01' },
  { id: 502, company_id: 1, loan_id: 102, borrower_name: 'Priya Sharma', collector_name: 'Sarah Collector', amount: 1000, principalPaid: 833, interestPaid: 167, penalty: 0, collection_date: '2026-07-23', payment_mode: 'UPI', receipt_no: 'REC-20260723-02' }
];

const INITIAL_BORROWERS = [
  { id: 1, company_id: 1, borrower_code: 'BR-0001', full_name: 'Rajesh Kumar', phone: '9876543210', alt_phone: '', email: '', dob: '1985-04-12', gender: 'MALE', address_line1: 'Main St 123', address_line2: '', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', aadhaar_number: '458912348971', pan_number: 'ABCDE1234F', occupation: 'Business', monthly_income: 45000, employer_name: '', guarantor_name: 'Mahesh Kumar', guarantor_phone: '9876500001', nominee_name: '', nominee_relation: '', branch: 'Karur Branch', kyc_status: 'VERIFIED', kyc_verified_at: '2026-05-01', kyc_expiry_date: '2028-05-01', kyc_rejection_reason: null, kyc_reviewed_by: 'John Admin', kyc_reviewed_at: '2026-05-01', status: 'ACTIVE', notes: '' },
  { id: 2, company_id: 1, borrower_code: 'BR-0002', full_name: 'Priya Sharma', phone: '9812345678', alt_phone: '', email: '', dob: '1990-09-23', gender: 'FEMALE', address_line1: 'Market Road 45', address_line2: '', city: 'Chennai', state: 'Tamil Nadu', pincode: '600002', aadhaar_number: '891234567890', pan_number: 'XYZPD9876K', occupation: 'Salaried', monthly_income: 38000, employer_name: 'ABC Textiles', guarantor_name: 'Sunil Sharma', guarantor_phone: '9812300002', nominee_name: '', nominee_relation: '', branch: 'Karur Branch', kyc_status: 'VERIFIED', kyc_verified_at: '2026-04-15', kyc_expiry_date: '2028-04-15', kyc_rejection_reason: null, kyc_reviewed_by: 'John Admin', kyc_reviewed_at: '2026-04-15', status: 'ACTIVE', notes: '' },
  { id: 3, company_id: 1, borrower_code: 'BR-0003', full_name: 'Suresh Patel', phone: '9988776655', alt_phone: '', email: '', dob: '1992-01-18', gender: 'MALE', address_line1: '', address_line2: '', city: '', state: '', pincode: '', aadhaar_number: '776655443322', pan_number: 'MNBVC9876L', occupation: 'Business', monthly_income: null, employer_name: '', guarantor_name: 'Dinesh Patel', guarantor_phone: '9988700002', nominee_name: '', nominee_relation: '', branch: 'Karur Branch', kyc_status: 'PENDING', kyc_verified_at: null, kyc_expiry_date: null, kyc_rejection_reason: null, kyc_reviewed_by: null, kyc_reviewed_at: null, status: 'ACTIVE', notes: '' }
];

const INITIAL_SUB_COMPANIES = [
  { id: 1, company_id: 1, name: 'Sub-Company A1', code: 'A1', is_active: 1 },
  { id: 2, company_id: 1, name: 'Sub-Company A2', code: 'A2', is_active: 1 }
];

const INITIAL_BRANCHES = [
  { id: 1, company_id: 1, sub_company_id: 1, name: 'Karur Branch', code: 'KRM', address: '', is_active: 1 },
  { id: 2, company_id: 1, sub_company_id: 1, name: 'Namakkal Branch', code: 'NKL', address: '', is_active: 1 },
  { id: 3, company_id: 1, sub_company_id: 1, name: 'Salem Branch', code: 'SLM', address: '', is_active: 1 },
  { id: 4, company_id: 1, sub_company_id: 2, name: 'Chennai Branch', code: 'CHN', address: '', is_active: 1 },
  { id: 5, company_id: 1, sub_company_id: 2, name: 'Madurai Branch', code: 'MDU', address: '', is_active: 1 }
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
  const [collections, setCollections] = useState(INITIAL_COLLECTIONS);
  const [borrowers, setBorrowers] = useState(INITIAL_BORROWERS);
  const [kycReviewBorrowerId, setKycReviewBorrowerId] = useState(null);
  const [subCompanies, setSubCompanies] = useState(INITIAL_SUB_COMPANIES);
  const [branchesList, setBranchesList] = useState(INITIAL_BRANCHES);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState('');

  // Finance Operations modules — pure mock data, local state only, no backend calls.
  const [loanSchemes, setLoanSchemes] = useState(INITIAL_LOAN_SCHEMES);
  const [investors, setInvestors] = useState(INITIAL_INVESTORS);
  const [investorTransactions, setInvestorTransactions] = useState(INITIAL_INVESTOR_TRANSACTIONS);
  const [fixedDeposits, setFixedDeposits] = useState(INITIAL_FIXED_DEPOSITS);
  const [expenseCategories, setExpenseCategories] = useState(INITIAL_EXPENSE_CATEGORIES);
  const [expenseVouchers, setExpenseVouchers] = useState(INITIAL_EXPENSE_VOUCHERS);
  const [chartOfAccounts, setChartOfAccounts] = useState(INITIAL_CHART_OF_ACCOUNTS);

  const [selectedLoanForCollection, setSelectedLoanForCollection] = useState(null);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [quickActionModalType, setQuickActionModalType] = useState(null);

  const navigateTo = (targetPath) => {
    window.history.pushState({}, '', targetPath);
    setPath(targetPath);
  };

  const handleTabChange = (newTab) => {
    setActiveTabState(newTab);
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
        api.get('/loans'),
        api.get('/employees'),
        api.get('/collections')
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
      const [subRes, branchRes] = await Promise.all([
        api.get('/sub-companies'),
        api.get('/branches')
      ]);
      setSubCompanies(subRes.data?.data || []);
      setBranchesList(branchRes.data?.data || []);
    } catch (err) {
      console.warn('Using demo organization hierarchy (no backend connected).');
    } finally {
      setOrgLoading(false);
    }
  };

  const handleCreateSubCompany = async (payload) => {
    const res = await api.post('/sub-companies', payload);
    const created = res.data?.data;
    if (created) setSubCompanies(prev => [...prev, created]);
    return created;
  };

  const handleUpdateSubCompany = async (id, payload) => {
    const res = await api.put(`/sub-companies/${id}`, payload);
    const updated = res.data?.data;
    if (updated) setSubCompanies(prev => prev.map(s => (s.id === id ? updated : s)));
    return updated;
  };

  const handleDeleteSubCompany = async (id) => {
    await api.delete(`/sub-companies/${id}`);
    setSubCompanies(prev => prev.filter(s => s.id !== id));
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
  };
  const handleUpdateLoanScheme = (id, payload) => {
    setLoanSchemes(prev => prev.map(s => (s.id === id ? { ...s, ...payload } : s)));
  };
  const handleDeleteLoanScheme = (id) => {
    const inUse = loans.some(l => l.scheme_id === id && (l.status === 'ACTIVE' || l.status === 'OVERDUE' || l.status === 'PENDING'));
    if (inUse) {
      const err = new Error('Cannot delete: this scheme is assigned to active loans or applications.');
      err.response = { data: { message: err.message } };
      throw err;
    }
    setLoanSchemes(prev => prev.filter(s => s.id !== id));
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
  const handleCreateInvestorTransaction = (payload) => {
    if (payload.type === 'WITHDRAWAL' && payload.amount > investorBalance(payload.investor_id)) {
      const err = new Error('Withdrawal amount exceeds the investor\'s available capital balance.');
      err.response = { data: { message: err.message } };
      throw err;
    }
    setInvestorTransactions(prev => [{ id: Date.now(), ...payload }, ...prev]);
  };

  // ── Fixed Deposits (mock-only, no backend) ──
  const handleCreateFixedDeposit = (payload) => {
    const nextSeq = fixedDeposits.length ? Math.max(...fixedDeposits.map(f => parseInt((f.fd_account_no || 'FD-2026-000').split('-')[2], 10) || 0)) + 1 : 1;
    const newFd = { id: Date.now(), fd_account_no: `FD-2026-${String(nextSeq).padStart(3, '0')}`, status: 'ACTIVE', ...payload };
    setFixedDeposits(prev => [...prev, newFd]);
  };
  const handleMatureFixedDeposit = (id) => {
    setFixedDeposits(prev => prev.map(f => (f.id === id ? { ...f, status: 'MATURED' } : f)));
  };
  const handlePrematureCloseFixedDeposit = (id) => {
    setFixedDeposits(prev => prev.map(f => {
      if (f.id !== id) return f;
      const penaltyRate = 0.02; // 2% penalty on the maturity value for early exit
      const payout = Math.round(f.maturity_value * (1 - penaltyRate));
      return { ...f, status: 'CLOSED_PREMATURE', payout_amount: payout };
    }));
  };

  // ── Expense Category Master (mock-only, no backend) ──
  const handleCreateExpenseCategory = (payload) => {
    setExpenseCategories(prev => [...prev, { id: Date.now(), ...payload }]);
  };
  const handleUpdateExpenseCategory = (id, payload) => {
    setExpenseCategories(prev => prev.map(c => (c.id === id ? { ...c, ...payload } : c)));
  };
  const handleDeleteExpenseCategory = (id) => {
    setExpenseCategories(prev => prev.filter(c => c.id !== id));
  };

  // ── Expense Vouchers (mock-only, no backend) ──
  const handleCreateExpenseVoucher = (payload) => {
    const category = expenseCategories.find(c => c.name === payload.category);
    const requiresApproval = category ? Number(payload.amount) > category.approval_threshold : false;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(expenseVouchers.filter(v => v.voucher_no.includes(today)).length + 1).padStart(2, '0');
    const newVoucher = {
      id: Date.now(),
      voucher_no: `EXP-${today}-${seq}`,
      payee: payload.payee || payload.notes || 'Unnamed Payee',
      category: payload.category,
      amount: Number(payload.amount),
      date: new Date().toISOString().slice(0, 10),
      status: requiresApproval ? 'PENDING_APPROVAL' : 'APPROVED',
      notes: payload.notes || ''
    };
    setExpenseVouchers(prev => [newVoucher, ...prev]);
  };

  // ── Chart of Accounts (mock-only, no backend) ──
  const handleCreateAccount = (payload) => {
    setChartOfAccounts(prev => [...prev, { id: Date.now(), ...payload }]);
  };
  const handleUpdateAccount = (id, payload) => {
    setChartOfAccounts(prev => prev.map(a => (a.id === id ? { ...a, ...payload } : a)));
  };
  const handleDeleteAccount = (id) => {
    setChartOfAccounts(prev => prev.filter(a => a.id !== id));
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

  const handleQuickAction = (actionType) => {
    const act = (actionType || '').toUpperCase();
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

  const handleRecordCollection = (payload) => {
    const totalAmt = payload.amount;
    const principalPaid = payload.principal_portion || 0;
    const interestPaid = payload.interest_portion || 0;
    const receiptNo = `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    try {
      setLoans(prev => prev.map(l => {
        if (l.id === payload.loan_id) {
          const newCollected = l.collected_amount + totalAmt;
          // Calculate new principal balance after principal knock-off
          const newPending = payload.new_principal_balance !== undefined
            ? payload.new_principal_balance
            : Math.max(0, l.pending_amount - principalPaid);

          return {
            ...l,
            collected_amount: newCollected,
            pending_amount: newPending,
            status: newPending === 0 ? 'CLOSED' : 'ACTIVE'
          };
        }
        return l;
      }));

      const newReceipt = {
        id: Date.now(),
        loan_id: payload.loan_id,
        borrower_name: selectedLoanForCollection?.borrower_name || 'Borrower',
        collector_name: user?.name || 'Collector',
        amount: totalAmt,
        principalPaid,
        interestPaid,
        penalty: payload.penalty || 0,
        newPrincipalBalance: payload.new_principal_balance,
        payment_mode: payload.payment_mode || 'CASH',
        receipt_no: receiptNo,
        collection_date: new Date().toISOString().slice(0, 10)
      };

      setCollections(prev => [newReceipt, ...prev]);
      return { data: newReceipt };
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleDisburseLoan = (form) => {
    const mRate = parseFloat(form.monthly_interest_rate || form.interest_rate) || 2.0;
    const months = (form.tenure_days / 30) || 4;
    const total_payable = form.principal_amount * (1 + (mRate / 100) * months);
    const isApplication = form.mode === 'APPLICATION';

    // Link to an existing Customer Directory record by phone, if one exists.
    const matchedBorrower = borrowers.find(b => b.phone === form.phone);

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
      loan_date: new Date().toISOString().slice(0, 10),
      next_due: new Date().toISOString().slice(0, 10),
      principal_amount: parseFloat(form.principal_amount),
      total_payable: parseFloat(total_payable),
      collected_amount: 0,
      pending_amount: parseFloat(form.principal_amount),
      installment_amount: parseFloat(form.installment_amount),
      tenure_days: parseInt(form.tenure_days),
      monthly_interest_rate: mRate,
      aadhaar: matchedBorrower?.aadhaar_number || '',
      pan: matchedBorrower?.pan_number || '',
      guarantor: matchedBorrower?.guarantor_name || 'Self',
      purpose: form.purpose || '',
      status: isApplication ? 'PENDING' : 'ACTIVE'
    };

    setLoans(prev => [newLoan, ...prev]);
  };

  const handleApproveApplication = (loanId) => {
    setLoans(prev => prev.map(l => (
      l.id === loanId
        ? { ...l, status: 'ACTIVE', loan_account_no: l.loan_account_no.replace('APP-', 'LN-'), total_payable: l.principal_amount * 1.1, next_due: new Date().toISOString().slice(0, 10) }
        : l
    )));
  };

  const handleRejectApplication = (loanId, reason) => {
    setLoans(prev => prev.map(l => (
      l.id === loanId ? { ...l, status: 'REJECTED', rejection_reason: reason || 'Not specified' } : l
    )));
  };

  const handleSavePermissions = async (userId, permissionsList) => {
    try {
      await api.put(`/employees/${userId}/permissions`, { permissions: permissionsList });
      setEmployees(prev => prev.map(emp => {
        if (emp.id === userId) {
          return { ...emp, permissions: permissionsList };
        }
        return emp;
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const GLOBAL_SCOPE_ROLES = ['ADMIN', 'COMPANY_ADMIN', 'SUPER_ADMIN'];

  const handleCreateEmployee = async (newEmpData) => {
    try {
      const res = await api.post('/employees', newEmpData);
      const branchIds = res.data?.data?.branch_ids || newEmpData.branch_ids || [];
      const branches = branchIds.map(id => branchesList.find(b => b.id === id)).filter(Boolean).map(b => ({ id: b.id, name: b.name, code: b.code }));
      const created = {
        id: res.data?.data?.id || Date.now(),
        name: newEmpData.name,
        email: newEmpData.email,
        role: newEmpData.role,
        permissions: [],
        branches,
        branchScope: GLOBAL_SCOPE_ROLES.includes(newEmpData.role) ? 'GLOBAL' : (branches.length ? 'RESTRICTED' : 'UNASSIGNED')
      };
      setEmployees(prev => [...prev, created]);
    } catch (err) {
      console.error(err);
    }
  };

  const getFinanceSubTab = (tabStr) => {
    if (tabStr.includes('cash-book')) return 'cash-book';
    if (tabStr.includes('general-ledger')) return 'general-ledger';
    if (tabStr.includes('expenses')) return 'expenses';
    if (tabStr.includes('income-statement')) return 'pnl';
    return 'cash-book';
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

  // Route 1: Dedicated Super Admin Login Page (/superadmin/login)
  if (path === '/superadmin/login') {
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
          user={user}
          onQuickAction={handleQuickAction}
          onOpenCollectDrawer={(loan) => setSelectedLoanForCollection(loan)}
        />
      )}

      {/* Primary Operational Workspace (Active Loans Register) */}
      {(activeTab.startsWith('loan-management') || activeTab === 'active-loans' || activeTab === 'loan-applications' || activeTab === 'closed-loans') && !activeTab.includes('collections') && !activeTab.includes('receipts') && (
        <LoansView
          loans={loans}
          borrowers={borrowers}
          loanSchemes={loanSchemes}
          activeTab={activeTab}
          onOpenCollectDrawer={(loan) => setSelectedLoanForCollection(loan)}
          onQuickAction={handleQuickAction}
          onApproveApplication={handleApproveApplication}
          onRejectApplication={handleRejectApplication}
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
          onOpenCollectDrawer={(loan) => setSelectedLoanForCollection(loan)}
          onQuickAction={handleQuickAction}
        />
      )}

      {/* Receipt Audit Logs */}
      {(activeTab === 'loan-management/receipts' || activeTab === 'receipts') && (
        <CollectionsHistoryView
          collections={collections}
          onQuickAction={handleQuickAction}
        />
      )}

      {/* Finance & Accounting Module */}
      {(activeTab.startsWith('finance-accounting') || activeTab === 'finance' || activeTab === 'cash-book' || activeTab === 'general-ledger' || activeTab === 'expenses' || activeTab === 'income-statement') && (
        <FinanceAccountingView
          initialSubTab={getFinanceSubTab(activeTab)}
          onQuickAction={handleQuickAction}
          expenseVouchers={expenseVouchers}
        />
      )}

      {/* Master Settings Module */}
      {(activeTab.startsWith('master-settings') || activeTab.startsWith('settings') || activeTab === 'employees') && (
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
            onQuickAction={handleQuickAction}
            borrowers={borrowers}
            loans={loans}
            onCreateBorrower={handleCreateBorrower}
            onUpdateBorrower={handleUpdateBorrower}
            onDeleteBorrower={handleDeleteBorrower}
            onOpenKycReview={(b) => setKycReviewBorrowerId(b.id)}
            subCompanies={subCompanies}
            branchesList={branchesList}
            orgLoading={orgLoading}
            orgError={orgError}
            onCreateSubCompany={handleCreateSubCompany}
            onUpdateSubCompany={handleUpdateSubCompany}
            onDeleteSubCompany={handleDeleteSubCompany}
            onCreateBranch={handleCreateBranch}
            onUpdateBranch={handleUpdateBranch}
            onDeleteBranch={handleDeleteBranch}
            loanSchemes={loanSchemes}
            onCreateLoanScheme={handleCreateLoanScheme}
            onUpdateLoanScheme={handleUpdateLoanScheme}
            onDeleteLoanScheme={handleDeleteLoanScheme}
            expenseCategories={expenseCategories}
            onCreateExpenseCategory={handleCreateExpenseCategory}
            onUpdateExpenseCategory={handleUpdateExpenseCategory}
            onDeleteExpenseCategory={handleDeleteExpenseCategory}
            chartOfAccounts={chartOfAccounts}
            onCreateAccount={handleCreateAccount}
            onUpdateAccount={handleUpdateAccount}
            onDeleteAccount={handleDeleteAccount}
          />
        )
      )}

      {/* Collection Drawer */}
      <CollectionDrawer
        isOpen={Boolean(selectedLoanForCollection)}
        onClose={() => setSelectedLoanForCollection(null)}
        loan={selectedLoanForCollection}
        allLoans={loans}
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
