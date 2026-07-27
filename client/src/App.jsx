import React, { useState, useEffect } from 'react';
import AppLayout from './layouts/AppLayout';
import LoginPage from './modules/auth/LoginPage';
import SuperAdminLoginPage from './modules/auth/SuperAdminLoginPage';
import SuperAdminPortal from './modules/auth/SuperAdminPortal';
import OperationalWorkspaceView from './modules/loan/OperationalWorkspaceView';
import BorrowersView from './modules/borrowers/BorrowersView';
import LoansView from './modules/loan/LoansView';
import DailyCollectionsView from './modules/finance/DailyCollectionsView';
import CollectionsHistoryView from './modules/loan/CollectionsHistoryView';
import FinanceAccountingView from './modules/finance/FinanceAccountingView';
import MasterSettingsView from './modules/settings/MasterSettingsView';
import CollectionDrawer from './components/CollectionDrawer';
import NewLoanModal from './components/NewLoanModal';
import QuickActionModal from './components/QuickActionModal';
import api from './api/client';

const INITIAL_LOANS = [
  { id: 101, company_id: 1, loan_account_no: 'LN-2026-001', borrower_name: 'Rajesh Kumar', phone: '9876543210', branch: 'Main Branch', collector: 'Sarah Collector', loan_date: '2026-05-10', next_due: '2026-07-24', principal_amount: 50000, total_payable: 55000, collected_amount: 22000, pending_amount: 33000, installment_amount: 500, tenure_days: 110, status: 'ACTIVE', aadhaar: '4589-1234-8971', pan: 'ABCDE1234F', guarantor: 'Mahesh Kumar', monthly_interest_rate: 2.0 },
  { id: 102, company_id: 1, loan_account_no: 'LN-2026-002', borrower_name: 'Priya Sharma', phone: '9812345678', branch: 'Main Branch', collector: 'Sarah Collector', loan_date: '2026-04-15', next_due: '2026-07-20', principal_amount: 100000, total_payable: 112000, collected_amount: 60000, pending_amount: 52000, installment_amount: 1000, tenure_days: 112, status: 'OVERDUE', daysOverdue: 4, aadhaar: '8912-3456-7890', pan: 'XYZPD9876K', guarantor: 'Sunil Sharma', monthly_interest_rate: 2.0 },
  { id: 103, company_id: 1, loan_account_no: 'LN-2026-003', borrower_name: 'Anil Verma', phone: '9765432109', branch: 'West Branch', collector: 'Mike Manager', loan_date: '2026-02-01', next_due: '2026-05-20', principal_amount: 30000, total_payable: 33000, collected_amount: 33000, pending_amount: 0, installment_amount: 300, tenure_days: 110, status: 'CLOSED', daysOverdue: 0, aadhaar: '1234-5678-9012', pan: 'LKJHG5432M', guarantor: 'Vijay Verma', monthly_interest_rate: 2.0 },
  { id: 104, company_id: 1, loan_account_no: 'LN-2026-004', borrower_name: 'Suresh Patel', phone: '9988776655', branch: 'Main Branch', collector: 'Sarah Collector', loan_date: '2026-06-01', next_due: '2026-07-24', principal_amount: 75000, total_payable: 82500, collected_amount: 15000, pending_amount: 67500, installment_amount: 750, tenure_days: 110, status: 'ACTIVE', aadhaar: '7766-5544-3322', pan: 'MNBVC9876L', guarantor: 'Dinesh Patel', monthly_interest_rate: 2.0 },
  { id: 105, company_id: 1, loan_account_no: 'LN-2026-005', borrower_name: 'Meena Reddy', phone: '9445566778', branch: 'East Branch', collector: 'Sarah Collector', loan_date: '2026-06-15', next_due: '2026-07-24', principal_amount: 40000, total_payable: 44000, collected_amount: 8000, pending_amount: 36000, installment_amount: 400, tenure_days: 110, status: 'ACTIVE', aadhaar: '5566-7788-9900', pan: 'QWERT1234N', guarantor: 'Kiran Reddy', monthly_interest_rate: 2.0 }
];

const INITIAL_EMPLOYEES = [
  { id: 1, company_id: 1, name: 'John Admin', email: 'admin@alpha.com', role: 'ADMIN', permissions: [] },
  { id: 2, company_id: 1, name: 'Sarah Collector', email: 'sarah@alpha.com', role: 'COLLECTOR', permissions: [{ module: 'LOANS', action: 'VIEW', allowed: 1 }, { module: 'COLLECTIONS', action: 'COLLECT', allowed: 1 }] },
  { id: 3, company_id: 1, name: 'Mike Manager', email: 'mike@alpha.com', role: 'MANAGER', permissions: [{ module: 'LOANS', action: 'CREATE', allowed: 1 }, { module: 'EMPLOYEES', action: 'MANAGE', allowed: 1 }] }
];

const INITIAL_COLLECTIONS = [
  { id: 501, company_id: 1, loan_id: 101, borrower_name: 'Rajesh Kumar', collector_name: 'Sarah Collector', amount: 500, collection_date: '2026-07-23', payment_mode: 'CASH', receipt_no: 'REC-20260723-01' },
  { id: 502, company_id: 1, loan_id: 102, borrower_name: 'Priya Sharma', collector_name: 'Sarah Collector', amount: 1000, collection_date: '2026-07-23', payment_mode: 'UPI', receipt_no: 'REC-20260723-02' }
];

export default function App() {
  const [path, setPath] = useState(() => window.location.pathname || '/login');

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
    return current || 'loan-management/active-loans';
  });

  const [isJumpingTenant, setIsJumpingTenant] = useState(false);

  const [loans, setLoans] = useState(INITIAL_LOANS);
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
  const [collections, setCollections] = useState(INITIAL_COLLECTIONS);

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
  };

  const handleLoginSuccess = (userData, token) => {
    setUser(userData);
    setTenant({ id: userData.companyId || 1, name: userData.companyName || 'Alpha Financial Services Ltd' });
    setIsAuthenticated(true);
    setIsJumpingTenant(false);

    if (userData.role === 'SUPER_ADMIN') {
      navigateTo('/superadmin');
    } else {
      navigateTo('/loan-management/active-loans');
      setActiveTabState('loan-management/active-loans');
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
    navigateTo('/login');
  };

  const handleSuperAdminJumpToTenant = (targetTenant) => {
    setTenant({ id: targetTenant.id, name: targetTenant.name });
    localStorage.setItem('financial_erp_tenant_id', targetTenant.id);
    localStorage.setItem('financial_erp_db_name', targetTenant.db_name);
    setIsJumpingTenant(true);
  };

  const handleQuickAction = (actionType) => {
    if (actionType === 'LOAN') {
      setIsDisburseModalOpen(true);
    } else if (actionType === 'COLLECT') {
      const activeLoan = loans.find(l => l.status === 'ACTIVE');
      if (activeLoan) setSelectedLoanForCollection(activeLoan);
    } else {
      setQuickActionModalType(actionType);
    }
  };

  const handleQuickActionSubmit = (type, formData) => {
    if (type === 'BORROWER') {
      const newBorrowerLoan = {
        id: Date.now(),
        loan_account_no: `LN-2026-${Math.floor(100 + Math.random() * 900)}`,
        borrower_name: formData.name,
        phone: formData.phone,
        branch: 'Main Branch',
        collector: 'Sarah Collector',
        loan_date: new Date().toISOString().slice(0, 10),
        next_due: new Date().toISOString().slice(0, 10),
        principal_amount: 50000,
        total_payable: 55000,
        collected_amount: 0,
        pending_amount: 55000,
        installment_amount: 500,
        tenure_days: 110,
        status: 'ACTIVE',
        aadhaar: formData.aadhaar,
        pan: formData.pan,
        guarantor: 'Self',
        monthly_interest_rate: 2.0
      };
      setLoans(prev => [newBorrowerLoan, ...prev]);
    }
  };

  const handleRecordCollection = async (payload) => {
    try {
      const res = await api.post('/collections', payload);
      const totalAmt = payload.amount;
      const principalPaid = payload.principal_portion || 0;
      const interestPaid = payload.interest_portion || 0;
      const receiptNo = res.data?.data?.receipt_no || `REC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`;

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

  const handleDisburseLoan = async (form) => {
    try {
      const res = await api.post('/loans', form);
      const mRate = parseFloat(form.monthly_interest_rate || form.interest_rate) || 2.0;
      const months = (form.tenure_days / 30) || 4;
      const total_payable = form.principal_amount * (1 + (mRate / 100) * months);

      const newLoan = {
        id: res.data?.data?.id || Date.now(),
        loan_account_no: res.data?.data?.loan_account_no || `LN-2026-${Math.floor(100 + Math.random() * 900)}`,
        borrower_name: form.borrower_name,
        phone: form.phone,
        branch: 'Main Branch',
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
        status: 'ACTIVE'
      };

      setLoans(prev => [newLoan, ...prev]);
    } catch (err) {
      console.error(err);
    }
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

  const handleCreateEmployee = async (newEmpData) => {
    try {
      const res = await api.post('/employees', newEmpData);
      const created = {
        id: res.data?.data?.id || Date.now(),
        name: newEmpData.name,
        email: newEmpData.email,
        role: newEmpData.role,
        permissions: []
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
    if (tabStr.includes('interest')) return 'interest-master';
    if (tabStr.includes('calculator')) return 'calculator';
    if (tabStr.includes('rbac')) return 'rbac-matrix';
    if (tabStr.includes('company')) return 'company-info';
    return 'staff-directory';
  };

  // Route 1: Dedicated Super Admin Login Page (/superadmin/login)
  if (path === '/superadmin/login') {
    return <SuperAdminLoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Route 2: Render Tenant Login Page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
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

      {/* Primary Operational Workspace (Active Loan Register - Default Landing) */}
      {(activeTab === 'dashboard' || activeTab.startsWith('loan-management') || activeTab === 'active-loans' || activeTab === 'loan-applications' || activeTab === 'closed-loans') && !activeTab.includes('collections') && !activeTab.includes('receipts') && (
        <OperationalWorkspaceView
          loans={loans}
          collections={collections}
          onOpenCollectDrawer={(loan) => setSelectedLoanForCollection(loan)}
          onQuickAction={handleQuickAction}
        />
      )}

      {/* Borrowers Master Directory Tab */}
      {activeTab === 'borrowers' && (
        <BorrowersView
          loans={loans}
          onOpenCollectDrawer={(loan) => setSelectedLoanForCollection(loan)}
          onQuickAction={handleQuickAction}
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
        />
      )}

      {/* Master Settings Module */}
      {(activeTab.startsWith('master-settings') || activeTab.startsWith('settings') || activeTab === 'employees') && (
        <MasterSettingsView
          initialTab={getSettingsSubTab(activeTab)}
          tenant={tenant}
          user={user}
          employees={employees}
          onSavePermissions={handleSavePermissions}
          onCreateEmployee={handleCreateEmployee}
          onQuickAction={handleQuickAction}
        />
      )}

      {/* Collection Drawer */}
      <CollectionDrawer
        isOpen={Boolean(selectedLoanForCollection)}
        onClose={() => setSelectedLoanForCollection(null)}
        loan={selectedLoanForCollection}
        onSubmit={handleRecordCollection}
      />

      {/* New Loan Disbursal Modal */}
      <NewLoanModal
        isOpen={isDisburseModalOpen}
        onClose={() => setIsDisburseModalOpen(false)}
        onSubmit={handleDisburseLoan}
      />

      {/* Quick Action Modal */}
      <QuickActionModal
        type={quickActionModalType}
        isOpen={Boolean(quickActionModalType)}
        onClose={() => setQuickActionModalType(null)}
        onSubmit={handleQuickActionSubmit}
      />
    </AppLayout>
  );
}
