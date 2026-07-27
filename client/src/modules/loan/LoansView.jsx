import React, { useState } from 'react';
import UnifiedPageHeader from '../../components/UnifiedPageHeader';
import FinancialSummaryStrip from '../../components/FinancialSummaryStrip';
import EnterpriseLoanTable from '../../components/EnterpriseLoanTable';
import RightBorrowerPanel from '../../components/RightBorrowerPanel';

export default function LoansView({ loans, activeTab, onOpenCollectDrawer, onQuickAction }) {
  const [selectedLoan, setSelectedLoan] = useState(loans[0] || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const totalCollected = loans.reduce((sum, l) => sum + (parseFloat(l.collected_amount) || 0), 0);
  const totalPending = loans.reduce((sum, l) => sum + (parseFloat(l.pending_amount) || 0), 0);

  const metrics = {
    todaysCollection: 28500,
    todaysInterest: 4200,
    todaysCash: 45800,
    activeVolume: totalPending,
    overdueAmount: 94000
  };

  // Filter loans based on activeTab and search query
  const filteredLoans = loans.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (item.borrower_name && item.borrower_name.toLowerCase().includes(q)) ||
      (item.loan_account_no && item.loan_account_no.toLowerCase().includes(q)) ||
      (item.phone && item.phone.includes(q)) ||
      (item.aadhaar && item.aadhaar.includes(q)) ||
      (item.pan && item.pan.toLowerCase().includes(q))
    );

    let matchesTab = true;
    if (activeTab === 'active-loans') matchesTab = item.status === 'ACTIVE';
    else if (activeTab === 'closed-loans') matchesTab = item.status === 'CLOSED';
    else if (activeTab === 'loan-applications') matchesTab = item.status === 'PENDING';

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

    return matchesSearch && matchesTab && matchesStatus;
  });

  const getTitle = () => {
    switch(activeTab) {
      case 'active-loans': return 'Active Loans Register';
      case 'closed-loans': return 'Closed Loans Archive';
      case 'loan-applications': return 'Pending Loan Applications';
      case 'borrowers': return 'Borrowers Master Directory';
      default: return 'Financial Operations Workspace';
    }
  };

  return (
    <div className="space-y-3 font-sans h-full flex flex-col">
      {/* 1. Unified Page Header with Search & Quick Shortcuts */}
      <UnifiedPageHeader
        title={getTitle()}
        subtitle="Manage daily loan accounts, interest payments, and borrower ledger status"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onQuickAction={onQuickAction}
        onRefresh={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
      />

      {/* 2. Single 58px Horizontal Summary Strip */}
      <FinancialSummaryStrip metrics={metrics} />

      {/* 3. Master-Detail Workspace Split (75% Grid / 25% Fixed Right Panel) */}
      <div className="flex-1 flex gap-3 overflow-hidden min-h-[560px]">
        {/* 75% Left Data Grid */}
        <div className="flex-1 overflow-hidden">
          <EnterpriseLoanTable
            loans={filteredLoans}
            selectedLoan={selectedLoan}
            onSelectLoan={(loan) => setSelectedLoan(loan)}
            onCollect={onOpenCollectDrawer}
          />
        </div>

        {/* 25% Fixed Right Borrower Info Panel */}
        <div className="hidden lg:block shrink-0">
          <RightBorrowerPanel
            loan={selectedLoan}
            onCollect={onOpenCollectDrawer}
          />
        </div>
      </div>
    </div>
  );
}
