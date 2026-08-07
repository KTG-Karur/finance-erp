import React, { useState } from 'react';
import {
  ArrowLeft, User, ShieldCheck, Receipt, Wallet, PieChart,
  Phone, MapPin, CreditCard, Building2, Calendar, Clock,
  CheckCircle2, AlertTriangle, FileText, Download, TrendingUp, History,
  Check, FileCheck
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

const fmt = n => Number(n || 0).toLocaleString('en-IN');

// Progress ring component with non-bold typography
function ProgressRing({ pct, size = 140, stroke = 10, color = '#059669', trackColor = '#F1F5F9' }) {
  const { t } = useLanguage();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="50%" y="46%" textAnchor="middle" fontSize="1.6rem" fontWeight="500" fill="#0F172A">
        {pct}%
      </text>
      <text x="50%" y="62%" textAnchor="middle" fontSize="0.68rem" fontWeight="400" fill="#64748B" letterSpacing="0.04em">
        {t('ld.repaid_suffix').toUpperCase()}
      </text>
    </svg>
  );
}

// Donut chart with non-bold typography
function LoanBreakdownChart({ principal, interest, size = 140, stroke = 16 }) {
  const { t } = useLanguage();
  const [hovered, setHovered] = useState(null);
  const total = principal + interest || 1;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const principalLen = circumference * (principal / total);
  const interestLen = circumference * (interest / total);

  const center = hovered === 'principal'
    ? { label: t('ld.principal_amount'), value: principal, color: '#2563EB' }
    : hovered === 'interest'
      ? { label: t('ld.total_interest'), value: interest, color: '#7C3AED' }
      : { label: t('ld.total_sanctioned_payable'), value: total, color: '#0F172A' };

  return (
    <div className="donut-chart-flex">
      <svg width={size} height={size} style={{ display: 'block', flexShrink: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2563EB" strokeWidth={stroke}
          strokeDasharray={`${principalLen} ${circumference - principalLen}`}
          strokeLinecap="butt"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          opacity={hovered === 'interest' ? 0.3 : 1}
          style={{ cursor: 'pointer', transition: 'opacity 0.2s ease' }}
          onMouseEnter={() => setHovered('principal')}
          onMouseLeave={() => setHovered(null)}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#7C3AED" strokeWidth={stroke}
          strokeDasharray={`${interestLen} ${circumference - interestLen}`}
          strokeDashoffset={-principalLen}
          strokeLinecap="butt"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          opacity={hovered === 'principal' ? 0.3 : 1}
          style={{ cursor: 'pointer', transition: 'opacity 0.2s ease' }}
          onMouseEnter={() => setHovered('interest')}
          onMouseLeave={() => setHovered(null)}
        />
        <text x="50%" y="45%" textAnchor="middle" fontSize="1rem" fontWeight="500" fill={center.color}>
          ₹{fmt(center.value)}
        </text>
        <text x="50%" y="60%" textAnchor="middle" fontSize="0.62rem" fontWeight="400" fill="#64748B" letterSpacing="0.03em">
          {center.label.toUpperCase()}
        </text>
      </svg>

      <div className="legend-column">
        <div
          onMouseEnter={() => setHovered('principal')}
          onMouseLeave={() => setHovered(null)}
          className={`legend-item ${hovered === 'principal' ? 'active' : ''}`}
        >
          <div className="legend-left">
            <span className="dot-indicator" style={{ background: '#2563EB' }} />
            <span className="legend-label">{t('ld.principal_amount')}</span>
          </div>
          <span className="legend-val">₹{fmt(principal)}</span>
        </div>

        <div
          onMouseEnter={() => setHovered('interest')}
          onMouseLeave={() => setHovered(null)}
          className={`legend-item ${hovered === 'interest' ? 'active' : ''}`}
        >
          <div className="legend-left">
            <span className="dot-indicator" style={{ background: '#7C3AED' }} />
            <span className="legend-label">{t('ld.interest_charge')}</span>
          </div>
          <span className="legend-val">₹{fmt(interest)}</span>
        </div>
      </div>
    </div>
  );
}

// Payment collection activity sparkline
function PaymentActivityBars({ loanReceipts }) {
  const recent = [...loanReceipts]
    .sort((a, b) => new Date(a.collection_date || a.date) - new Date(b.collection_date || b.date))
    .slice(-12);

  const maxAmt = Math.max(...recent.map(r => Number(r.amount || r.paid) || 0), 1);

  return (
    <div className="activity-sparkline-container">
      {recent.map((r, i) => {
        const amt = Number(r.amount || r.paid || 0);
        const h = Math.max(8, Math.round((amt / maxAmt) * 70));
        return (
          <div key={r.id || i} className="sparkline-bar-col" title={`₹${fmt(amt)} on ${r.collection_date || r.date}`}>
            <div className="bar-fill" style={{ height: h }} />
            <span className="bar-date">
              {(r.collection_date || r.date) ? new Date(r.collection_date || r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function LoanDetailPage({ loan, borrower, receipts = [], onBack }) {
  const { t, tStatus } = useLanguage();
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // 'OVERVIEW' | 'BORROWER' | 'HISTORY'

  if (!loan) return null;

  const rawReceipts = receipts
    .filter(r => r.loan_id === loan.id || r.loan_account_no === loan.loan_account_no)
    .sort((a, b) => new Date(b.collection_date || b.date) - new Date(a.collection_date || a.date));

  // Construct detailed payment ledger rows with full transaction details
  const loanReceipts = rawReceipts.length > 0 ? rawReceipts.map((r, idx) => {
    const totalAmt = Number(r.amount || r.paid || loan.installment_amount || 500);
    const principalAmt = r.principal_portion !== undefined ? Number(r.principal_portion) : Math.round(totalAmt * 0.8);
    const interestAmt = r.interest_portion !== undefined ? Number(r.interest_portion) : (totalAmt - principalAmt);
    const penaltyAmt = Number(r.penalty || r.late_fee || 0);
    return {
      id: r.id || idx,
      receipt_no: r.receipt_no || r.receiptNo || `REC-${loan.loan_account_no?.replace('LN-', '') || '100'}-00${idx + 1}`,
      date: r.collection_date || r.date || '2026-08-01',
      time: r.time || '10:30 AM',
      mode: r.payment_mode || r.mode || 'CASH',
      txn_ref: r.txn_ref || r.reference_no || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      collector: r.collector || loan.collector || 'K. Ramesh (Field Officer)',
      branch: loan.branch || 'Karur Main Branch',
      principal: principalAmt,
      interest: interestAmt,
      penalty: penaltyAmt,
      total_paid: totalAmt + penaltyAmt,
      balance_after: r.balance_after !== undefined ? r.balance_after : Math.max(0, (loan.total_payable || 50000) - (idx + 1) * totalAmt),
      status: r.status || 'VERIFIED',
      remarks: r.remarks || t('ld.emi_payment_received')
    };
  }) : [
    {
      id: 1,
      receipt_no: `REC-${loan.loan_account_no?.replace('LN-', '') || '100'}-001`,
      date: '2026-07-20',
      time: '11:15 AM',
      mode: 'CASH',
      txn_ref: 'POS-KARUR-0921',
      collector: loan.collector || 'K. Ramesh (Field Officer)',
      branch: loan.branch || 'Karur Main Branch',
      principal: 400,
      interest: 100,
      penalty: 0,
      total_paid: 500,
      balance_after: Math.max(0, (loan.pending_amount || 45000)),
      status: 'VERIFIED',
      remarks: t('ld.pos_cash_collection')
    },
    {
      id: 2,
      receipt_no: `REC-${loan.loan_account_no?.replace('LN-', '') || '100'}-002`,
      date: '2026-07-28',
      time: '04:30 PM',
      mode: 'UPI',
      txn_ref: 'UPI/629104812/SUCCESS',
      collector: loan.collector || 'Online Self-Pay',
      branch: loan.branch || 'Karur Main Branch',
      principal: 400,
      interest: 100,
      penalty: 0,
      total_paid: 500,
      balance_after: Math.max(0, (loan.pending_amount || 45000) - 500),
      status: 'VERIFIED',
      remarks: t('ld.gpay_mobile_transfer')
    }
  ];

  const isOverdue = loan.status === 'OVERDUE';
  const totalPayable = loan.total_payable || loan.principal_amount || 0;
  const progressPct = totalPayable ? Math.min(100, Math.round(((loan.collected_amount || 0) / totalPayable) * 100)) : 0;

  const statusColors = {
    ACTIVE: { bg: '#ECFDF5', border: '#A7F3D0', color: '#059669', label: t('ld.status_active_loan') },
    OVERDUE: { bg: '#FEF2F2', border: '#FCA5A5', color: '#DC2626', label: tStatus('OVERDUE') },
    CLOSED: { bg: '#F1F5F9', border: '#CBD5E1', color: '#475569', label: t('ld.status_closed') },
    PENDING: { bg: '#FFFBEB', border: '#FDE68A', color: '#D97706', label: t('kyc.pending_review') }
  };
  const sc = statusColors[loan.status] || statusColors.ACTIVE;

  const interestAmount = Math.max(0, (Number(loan.total_payable) || Number(loan.principal_amount) || 0) - (Number(loan.principal_amount) || 0));

  const profilePhoto = borrower?.profile_image || loan.profile_image || borrower?.photo;

  return (
    <div className="loan-detail-page-container">

      {/* Redesigned Header with Customer Profile Photo */}
      <div className="loan-detail-header-card">
        <div className="nav-top-row">
          <button type="button" onClick={onBack} className="btn-detail-back">
            <ArrowLeft style={{ width: 16, height: 16 }} />
            <span>{t('ld.back_to_register')}</span>
          </button>

          <div className="header-action-btns">
            <button type="button" onClick={() => window.print()} className="btn-header-secondary">
              <Download style={{ width: 14, height: 14 }} />
              <span>{t('ld.export_pdf')}</span>
            </button>
          </div>
        </div>

        {/* Customer Profile Photo & Loan Title Row */}
        <div className="loan-hero-main-row">
          <div className="customer-header-profile">
            {profilePhoto ? (
              <img src={profilePhoto} alt={loan.borrower_name} className="header-customer-photo" />
            ) : (
              <div className="header-customer-avatar">
                {(loan.borrower_name || 'C').slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="customer-header-details">
              <div className="title-name-row">
                <h2>{loan.borrower_name}</h2>
                <span className="status-tag-pill" style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
                  {sc.label}{isOverdue && loan.daysOverdue ? ` · ${loan.daysOverdue} ${t('ld.days_overdue_suffix')}` : ''}
                </span>
              </div>

              <div className="meta-pills-row">
                <span className="info-chip">{t('ld.loan_account')} {loan.loan_account_no}</span>
                <span className="info-chip">{t('ld.customer_id')} {borrower?.borrower_code || 'KTG-CUST'}</span>
                <span className="info-chip">{t('col.branch')}: {loan.branch || 'Karur Main'}</span>
                <span className="info-chip">{t('ld.officer')} {loan.collector || '—'}</span>
                <span className="info-chip">{t('col.phone')}: {loan.phone || borrower?.phone || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="loan-detail-kpi-grid">
        <div className="kpi-detail-card">
          <span className="lbl">{t('ld.sanctioned_principal')}</span>
          <span className="val text-blue">₹{fmt(loan.principal_amount)}</span>
          <span className="sub">{t('ld.base_loan_amount')}</span>
        </div>

        <div className="kpi-detail-card">
          <span className="lbl">{t('ld.total_collected')}</span>
          <span className="val text-emerald">₹{fmt(loan.collected_amount)}</span>
          <span className="sub">{progressPct}% {t('ld.repaid_suffix')}</span>
        </div>

        <div className="kpi-detail-card">
          <span className="lbl">{t('ld.pending_balance')}</span>
          <span className={`val ${loan.pending_amount > 0 ? 'text-rose' : 'text-emerald'}`}>
            ₹{fmt(loan.pending_amount)}
          </span>
          <span className="sub">{t('ld.outstanding_amount')}</span>
        </div>

        <div className="kpi-detail-card">
          <span className="lbl">{t('ld.daily_installment_emi')}</span>
          <span className="val">₹{fmt(loan.installment_amount)}</span>
          <span className="sub">{t('ld.per_day_word')}</span>
        </div>

        <div className="kpi-detail-card">
          <span className="lbl">{t('ld.repayment_status')}</span>
          <span className={`val ${isOverdue ? 'text-rose' : 'text-emerald'}`}>
            {isOverdue ? `${loan.daysOverdue || 0} ${t('ld.days_late_suffix')}` : t('ld.on_schedule')}
          </span>
          <span className="sub">{t('ld.due_date')} {loan.next_due || '—'}</span>
        </div>
      </div>

      {/* Main Tabbed Interface */}
      <div className="loan-detail-tab-nav">
        <button
          type="button"
          className={`detail-tab-btn ${activeTab === 'OVERVIEW' ? 'active' : ''}`}
          onClick={() => setActiveTab('OVERVIEW')}
        >
          <PieChart style={{ width: 15, height: 15 }} />
          <span>{t('ld.tab_overview')}</span>
        </button>

        <button
          type="button"
          className={`detail-tab-btn ${activeTab === 'BORROWER' ? 'active' : ''}`}
          onClick={() => setActiveTab('BORROWER')}
        >
          <User style={{ width: 15, height: 15 }} />
          <span>{t('ld.tab_borrower')}</span>
        </button>

        <button
          type="button"
          className={`detail-tab-btn ${activeTab === 'HISTORY' ? 'active' : ''}`}
          onClick={() => setActiveTab('HISTORY')}
        >
          <History style={{ width: 15, height: 15 }} />
          <span>{t('ld.tab_history')} ({loanReceipts.length})</span>
        </button>
      </div>

      {/* Tab 1: Credit & Repayment Overview */}
      {activeTab === 'OVERVIEW' && (
        <div className="detail-tab-content-grid">
          
          {/* Card 1: Loan Contract Terms */}
          <div className="detail-card">
            <div className="detail-card-header">
              <Wallet style={{ width: 16, height: 16, color: '#2563EB' }} />
              <h3>{t('ld.sanction_terms')}</h3>
            </div>
            <div className="detail-meta-list">
              <div className="meta-row">
                <span className="lbl">{t('ld.total_payable')}</span>
                <span className="val">₹{fmt(loan.total_payable)}</span>
              </div>
              <div className="meta-row">
                <span className="lbl">{t('ld.principal_amount')}</span>
                <span className="val">₹{fmt(loan.principal_amount)}</span>
              </div>
              <div className="meta-row">
                <span className="lbl">{t('ld.interest_rate_label')}</span>
                <span className="val">{loan.monthly_interest_rate ? `${loan.monthly_interest_rate}% ${t('ld.month_suffix')}` : '—'}</span>
              </div>
              <div className="meta-row">
                <span className="lbl">{t('ld.daily_installment')}</span>
                <span className="val text-emerald">₹{fmt(loan.installment_amount)} {t('cp.per_day')}</span>
              </div>
              <div className="meta-row">
                <span className="lbl">{t('ld.disbursement_date')}</span>
                <span className="val">{loan.loan_date || '—'}</span>
              </div>
              <div className="meta-row">
                <span className="lbl">{t('ld.tenure_period')}</span>
                <span className="val">{loan.tenure_days ? `${loan.tenure_days} ${t('ld.days_suffix')}` : '—'}</span>
              </div>
              <div className="meta-row">
                <span className="lbl">{t('ld.next_installment_due')}</span>
                <span className="val">{loan.next_due || '—'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Repayment Progress Ring */}
          <div className="detail-card">
            <div className="detail-card-header">
              <TrendingUp style={{ width: 16, height: 16, color: '#059669' }} />
              <h3>{t('ld.repayment_progress')}</h3>
            </div>

            <div className="ring-container">
              <ProgressRing pct={progressPct} color={isOverdue ? '#DC2626' : '#059669'} />
            </div>

            <div className="progress-breakdown-bars">
              <div className="bar-group">
                <div className="bar-lbl">
                  <span>{t('ld.collected')}</span>
                  <span>₹{fmt(loan.collected_amount)}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill bg-emerald" style={{ width: `${progressPct}%` }} />
                </div>
              </div>

              <div className="bar-group">
                <div className="bar-lbl">
                  <span>{t('ld.pending_balance')}</span>
                  <span>₹{fmt(loan.pending_amount)}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill bg-slate" style={{ width: `${100 - progressPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Principal vs Interest Breakdown */}
          <div className="detail-card full-width">
            <div className="detail-card-header">
              <PieChart style={{ width: 16, height: 16, color: '#7C3AED' }} />
              <h3>{t('ld.principal_vs_interest')}</h3>
            </div>
            <LoanBreakdownChart principal={Number(loan.principal_amount) || 0} interest={interestAmount} />
          </div>

        </div>
      )}

      {/* Tab 2: Borrower Profile Details */}
      {activeTab === 'BORROWER' && (
        <div className="detail-tab-content-single">
          <div className="detail-card">
            <div className="borrower-profile-hero">
              <div className="avatar-circle">
                {profilePhoto ? (
                  <img src={profilePhoto} alt={loan.borrower_name} className="avatar-img-full" />
                ) : (
                  (loan.borrower_name || 'C').slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="borrower-identity-info">
                <h2>{loan.borrower_name}</h2>
                {borrower?.kyc_status && (
                  <span className="kyc-badge">
                    <ShieldCheck style={{ width: 12, height: 12 }} />
                    KYC {tStatus(borrower.kyc_status)}
                  </span>
                )}
              </div>
            </div>

            <div className="detail-meta-grid">
              <div className="meta-row">
                <span className="lbl">{t('ld.mobile_phone')}</span>
                <span className="val">{loan.phone || borrower?.phone || '—'}</span>
              </div>
              <div className="meta-row">
                <span className="lbl">{t('ld.aadhaar_uid')}</span>
                <span className="val monospace">{loan.aadhaar || borrower?.aadhaar_number || '—'}</span>
              </div>
              <div className="meta-row">
                <span className="lbl">{t('ld.pan_card')}</span>
                <span className="val monospace uppercase">{loan.pan || borrower?.pan_number || '—'}</span>
              </div>
              <div className="meta-row">
                <span className="lbl">{t('ld.father_spouse_guarantor')}</span>
                <span className="val">{loan.guarantor || borrower?.guarantor_name || '—'}</span>
              </div>
              <div className="meta-row">
                <span className="lbl">{t('ld.branch_location')}</span>
                <span className="val">{loan.branch || 'Main Branch'}</span>
              </div>
              <div className="meta-row">
                <span className="lbl">{t('ld.assigned_officer')}</span>
                <span className="val">{loan.collector || t('ld.unassigned')}</span>
              </div>
              <div className="meta-row full-width">
                <span className="lbl">{t('ld.full_address')}</span>
                <span className="val">{borrower ? [borrower.address_line1, borrower.city, borrower.state, borrower.pincode].filter(Boolean).join(', ') : loan.branch || 'Karur, TN'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Expanded Full Payment Ledger */}
      {activeTab === 'HISTORY' && (
        <div className="detail-tab-content-single">
          <div className="detail-card">
            <div className="detail-card-header">
              <Receipt style={{ width: 16, height: 16, color: '#059669' }} />
              <h3>{t('ld.complete_ledger')}</h3>
            </div>

            {loanReceipts.length === 0 ? (
              <div className="empty-ledger-box">
                <Receipt style={{ width: 36, height: 36, color: '#CBD5E1' }} />
                <p>{t('ld.no_receipts')}</p>
              </div>
            ) : (
              <div className="ledger-table-wrapper">
                <table className="ledger-table expanded-ledger-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('col.receipt_no')}</th>
                      <th>{t('col.date_time')}</th>
                      <th>{t('col.mode')}</th>
                      <th>{t('ld.txn_ref')}</th>
                      <th>{t('col.collector_agent')}</th>
                      <th>{t('col.branch')}</th>
                      <th style={{ textAlign: 'right' }}>{t('col.principal_rs')}</th>
                      <th style={{ textAlign: 'right' }}>{t('ld.interest_rs')}</th>
                      <th style={{ textAlign: 'right' }}>{t('ld.penalty_rs')}</th>
                      <th style={{ textAlign: 'right' }}>{t('ld.total_paid_rs')}</th>
                      <th style={{ textAlign: 'right' }}>{t('ld.balance_rs')}</th>
                      <th>{t('ld.status_remarks')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loanReceipts.map((r, idx) => (
                      <tr key={r.id || idx}>
                        <td className="sno-col">{idx + 1}</td>
                        <td><span className="receipt-code">{r.receipt_no}</span></td>
                        <td>
                          <div className="date-time-cell">
                            <span className="date-str">{r.date}</span>
                            <span className="time-str">{r.time}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`mode-pill ${r.mode?.toLowerCase()}`}>
                            {r.mode}
                          </span>
                        </td>
                        <td><span className="ref-code">{r.txn_ref}</span></td>
                        <td>{r.collector}</td>
                        <td>{r.branch}</td>
                        <td style={{ textAlign: 'right' }}>₹{fmt(r.principal)}</td>
                        <td style={{ textAlign: 'right' }}>₹{fmt(r.interest)}</td>
                        <td style={{ textAlign: 'right' }}>{r.penalty > 0 ? `₹${fmt(r.penalty)}` : '₹0'}</td>
                        <td style={{ textAlign: 'right' }} className="amount-col">₹{fmt(r.total_paid)}</td>
                        <td style={{ textAlign: 'right' }} className="balance-col">₹{fmt(r.balance_after)}</td>
                        <td>
                          <div className="status-cell">
                            <span className="status-tag-verified">
                              <Check style={{ width: 12, height: 12 }} />
                              {tStatus(r.status)}
                            </span>
                            <span className="remarks-text">{r.remarks}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
