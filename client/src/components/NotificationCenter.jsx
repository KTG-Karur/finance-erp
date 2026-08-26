import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Banknote,
  FileText,
  X,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';

export default function NotificationCenter({
  loans = [],
  bankAccounts = [],
  chartOfAccounts = [],
  onNavigate
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL' | 'DISBURSAL' | 'OVERDUE' | 'APPLICATION'
  const [readIds, setReadIds] = useState(() => new Set());
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Calculate available liquid funds in Treasury (Cash In Hand + Active Bank Balances)
  const liquidTreasury = useMemo(() => {
    const cashTotal = (chartOfAccounts || [])
      .filter(a => {
        const type = (a.account_type || a.type || '').toUpperCase();
        const name = (a.account_name || a.name || '').toLowerCase();
        const code = String(a.account_code || a.code || '');
        return (type === 'CASH' || type === 'ASSET') && (name.includes('cash') || code === '1001' || code === '1000');
      })
      .reduce((sum, a) => sum + (parseFloat(a.current_balance || a.opening_balance) || 0), 0);

    const bankTotal = (bankAccounts || [])
      .filter(b => b.is_active !== false)
      .reduce((sum, b) => sum + (parseFloat(b.current_balance || b.opening_balance) || 0), 0);

    return Math.max(0, cashTotal + bankTotal);
  }, [chartOfAccounts, bankAccounts]);

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

  // Derive notifications dynamically
  const notificationsList = useMemo(() => {
    const list = [];

    // 1. Pending Disbursals — ONLY notify when there is ENOUGH CASH/BANK FUND to disburse
    const pendingDisbursals = loans.filter(l => l.status === 'PENDING_DISBURSAL');
    pendingDisbursals.forEach(loan => {
      const reqAmount = parseFloat(loan.principal_amount) || 0;
      const hasEnoughFunds = liquidTreasury >= reqAmount;

      if (hasEnoughFunds) {
        list.push({
          id: `disbursal-ready-${loan.id}`,
          targetLoanId: loan.id,
          targetAccountNo: loan.loan_account_no,
          category: 'DISBURSAL',
          type: 'READY',
          title: `Ready for Disbursal: ${loan.loan_account_no}`,
          message: `Sufficient treasury balance available (₹${fmt(liquidTreasury)}). Ready to disburse ₹${fmt(reqAmount)} for ${loan.borrower_name || 'Borrower'}.`,
          date: loan.created_at || loan.loan_date || new Date().toISOString(),
          badge: 'Funds Available',
          badgeColor: '#15803D',
          badgeBg: '#F0FEF5',
          icon: CheckCircle2,
          iconColor: '#15803D',
          iconBg: '#F0FEF5',
          actionText: 'Disburse Now',
          targetRoute: 'loan-management/loan-applications'
        });
      }
    });

    // 2. Overdue Accounts
    const overdueLoans = loans.filter(l => l.status === 'OVERDUE' || (Number(l.dpd) > 0 && l.status === 'ACTIVE'));
    overdueLoans.forEach(loan => {
      const overdueAmt = parseFloat(loan.pending_amount) || 0;
      list.push({
        id: `overdue-${loan.id}`,
        targetLoanId: loan.id,
        targetAccountNo: loan.loan_account_no,
        category: 'OVERDUE',
        type: 'OVERDUE',
        title: `Overdue Loan: ${loan.loan_account_no}`,
        message: `${loan.borrower_name || 'Customer'} has overdue pending dues of ₹${fmt(overdueAmt)}${loan.dpd ? ` (${loan.dpd} Days Past Due)` : ''}.`,
        date: loan.next_due || loan.created_at || new Date().toISOString(),
        badge: 'Overdue',
        badgeColor: '#DC2626',
        badgeBg: '#FEF2F2',
        icon: Clock,
        iconColor: '#DC2626',
        iconBg: '#FEF2F2',
        actionText: 'Record Collection',
        targetRoute: 'loan-management/loans-register'
      });
    });

    // 3. Pending Application Reviews
    const pendingApps = loans.filter(l => l.status === 'PENDING');
    pendingApps.forEach(loan => {
      list.push({
        id: `app-pending-${loan.id}`,
        targetLoanId: loan.id,
        targetAccountNo: loan.loan_account_no,
        category: 'APPLICATION',
        type: 'APPLICATION',
        title: `Application Under Review: ${loan.loan_account_no}`,
        message: `New application submitted for ${loan.borrower_name || 'Applicant'} (₹${fmt(loan.principal_amount)}). Awaiting credit appraisal.`,
        date: loan.created_at || loan.loan_date || new Date().toISOString(),
        badge: 'Pending Review',
        badgeColor: '#2563EB',
        badgeBg: '#EFF6FF',
        icon: FileText,
        iconColor: '#2563EB',
        iconBg: '#EFF6FF',
        actionText: 'Review Application',
        targetRoute: 'loan-management/loan-applications'
      });
    });

    return list;
  }, [loans, liquidTreasury]);

  // Filtered notifications
  const filteredList = useMemo(() => {
    if (selectedFilter === 'ALL') return notificationsList;
    return notificationsList.filter(n => n.category === selectedFilter);
  }, [notificationsList, selectedFilter]);

  const unreadCount = notificationsList.filter(n => !readIds.has(n.id)).length;

  const handleMarkAllRead = () => {
    const allIds = new Set(notificationsList.map(n => n.id));
    setReadIds(allIds);
  };

  const handleNotificationClick = (item) => {
    setReadIds(prev => new Set([...prev, item.id]));
    setIsOpen(false);
    if (item.targetRoute && onNavigate) {
      onNavigate(item.targetRoute, item.targetLoanId, item.category);
    }
  };

  return (
    <div className="notif-center-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
      {/* ── Topbar Trigger Bell Button ── */}
      <button
        id="notification-bell-btn"
        type="button"
        onClick={() => setIsOpen(v => !v)}
        title="Financial Notifications & Alerts"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 8,
          border: isOpen ? '1px solid #CBD5E1' : '1px solid #E2E8F0',
          background: isOpen ? '#FFFFFF' : '#F8FAFC',
          color: unreadCount > 0 ? '#0F172A' : '#64748B',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
        }}
      >
        <Bell style={{ width: 16, height: 16 }} />

        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -3,
            right: -3,
            minWidth: 18,
            height: 18,
            padding: '0 4px',
            borderRadius: 999,
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            fontSize: '0.65rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 2px #FFFFFF',
            lineHeight: 1
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Popover ── */}
      {isOpen && (
        <div className="notif-popover-card">
          {/* Popover Header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFFFFF'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span style={{
                  padding: '2px 7px',
                  borderRadius: 12,
                  background: '#FEF2F2',
                  color: '#DC2626',
                  fontSize: '0.68rem',
                  fontWeight: 700
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--brand-primary, #15803D)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>

          {/* Treasury Snapshot Banner */}
          <div style={{
            padding: '8px 16px',
            background: '#F8FAFC',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem'
          }}>
            <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Banknote style={{ width: 13, height: 13, color: '#15803D' }} />
              Liquid Treasury (Cash + Bank):
            </span>
            <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>
              ₹{fmt(liquidTreasury)}
            </strong>
          </div>

          {/* Category Tabs */}
          <div style={{
            display: 'flex',
            gap: 4,
            padding: '8px 12px',
            borderBottom: '1px solid #F1F5F9',
            background: '#FFFFFF',
            overflowX: 'auto'
          }}>
            {[
              { id: 'ALL', label: 'All', count: notificationsList.length },
              { id: 'DISBURSAL', label: 'Disbursals', count: notificationsList.filter(n => n.category === 'DISBURSAL').length },
              { id: 'OVERDUE', label: 'Overdue', count: notificationsList.filter(n => n.category === 'OVERDUE').length },
              { id: 'APPLICATION', label: 'Applications', count: notificationsList.filter(n => n.category === 'APPLICATION').length }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedFilter(tab.id)}
                style={{
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: '0.7rem',
                  fontWeight: selectedFilter === tab.id ? 700 : 500,
                  background: selectedFilter === tab.id ? 'var(--brand-primary-light, #F0FEF5)' : 'transparent',
                  color: selectedFilter === tab.id ? 'var(--brand-primary, #15803D)' : '#64748B',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span style={{
                    fontSize: '0.62rem',
                    padding: '1px 5px',
                    borderRadius: 10,
                    background: selectedFilter === tab.id ? 'var(--brand-primary, #15803D)' : '#E2E8F0',
                    color: selectedFilter === tab.id ? '#FFFFFF' : '#475569'
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Notifications Scroll List */}
          <div style={{ maxHeight: 380, overflowY: 'auto', padding: '4px 0' }} className="thin-scroll">
            {filteredList.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748B' }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: '#F0FEF5',
                  color: '#15803D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px auto'
                }}>
                  <CheckCircle2 style={{ width: 20, height: 20 }} />
                </div>
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>
                  All Caught Up!
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: '#94A3B8' }}>
                  No pending alerts or financial notices at this time.
                </p>
              </div>
            ) : (
              filteredList.map((item) => {
                const isUnread = !readIds.has(item.id);
                const IconComponent = item.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #F8FAFC',
                      background: isUnread ? '#F8FAFC' : '#FFFFFF',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                      transition: 'background 0.12s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isUnread ? '#F8FAFC' : '#FFFFFF'; }}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: item.iconBg,
                      color: item.iconColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2
                    }}>
                      <IconComponent style={{ width: 16, height: 16 }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                        <h4 style={{
                          margin: 0,
                          fontSize: '0.8rem',
                          fontWeight: isUnread ? 700 : 600,
                          color: '#0F172A',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {item.title}
                        </h4>
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          background: item.badgeBg,
                          color: item.badgeColor,
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}>
                          {item.badge}
                        </span>
                      </div>

                      <p style={{
                        margin: '0 0 6px 0',
                        fontSize: '0.74rem',
                        color: '#475569',
                        lineHeight: 1.35
                      }}>
                        {item.message}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                          {item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today'}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: 'var(--brand-primary, #15803D)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2
                        }}>
                          {item.actionText}
                          <ChevronRight style={{ width: 12, height: 12 }} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid #F1F5F9',
            background: '#F8FAFC',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
              Real-time cash balance &amp; loan alerts
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
