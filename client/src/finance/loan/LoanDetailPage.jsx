import React, { useState } from 'react';
import {
  ArrowLeft, User, Receipt, Wallet, PieChart,
  Phone, MapPin, CreditCard, Building2, Calendar, Clock,
  CheckCircle2, AlertTriangle, FileText, Download, TrendingUp, TrendingDown, History,
  Check, FileCheck, CalendarClock
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

const fmt = n => Number(n || 0).toLocaleString('en-IN');

// Progress ring component with non-bold typography
function ProgressRing({ pct, size = 140, stroke = 10, color = 'var(--brand-primary, #15803D)', trackColor = '#F1F5F9' }) {
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
    ? { label: t('ld.principal_amount'), value: principal, color: 'var(--color-info, #2563EB)' }
    : hovered === 'interest'
      ? { label: t('ld.total_interest'), value: interest, color: '#7C3AED' }
      : { label: t('ld.total_sanctioned_payable'), value: total, color: '#0F172A' };

  return (
    <div className="donut-chart-flex">
      <svg width={size} height={size} style={{ display: 'block', flexShrink: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-info, #2563EB)" strokeWidth={stroke}
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
            <span className="dot-indicator" style={{ background: 'var(--color-info, #2563EB)' }} />
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

  // Construct detailed payment ledger rows strictly from real collection records
  // — no fabricated fallback rows when there's no history yet (principal_paid/
  // interest_paid/new_principal_balance are the actual `collections` table columns).
  const loanReceipts = rawReceipts.map((r, idx) => {
    const principalAmt = Number(r.principal_paid ?? r.principalPaid ?? 0);
    const interestAmt = Number(r.interest_paid ?? r.interestPaid ?? 0);
    const penaltyAmt = Number(r.penalty ?? 0);
    const totalAmt = Number(r.amount ?? (principalAmt + interestAmt));
    return {
      id: r.id || idx,
      voucher_no: r.voucher_no || r.receipt_no || '—',
      date: r.collection_date || r.date || '—',
      time: r.created_at ? new Date(r.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
      mode: r.payment_mode || r.mode || '—',
      txn_ref: r.reference_no || r.txn_ref || '—',
      collector: r.collector_name || r.collector || loan.collector || '—',
      branch: r.branch || loan.branch || '—',
      principal: principalAmt,
      interest: interestAmt,
      penalty: penaltyAmt,
      total_paid: totalAmt + penaltyAmt,
      balance_after: (r.new_principal_balance ?? r.balance_after) ?? null,
      status: r.voided ? 'VOIDED' : (r.reverted ? 'REVERTED' : (r.clearance_status || r.status || 'CLEARED')),
      remarks: r.notes || r.remarks || t('ld.emi_payment_received')
    };
  });

  const isOverdue = loan.status === 'OVERDUE';
  const totalPayable = loan.total_payable || loan.principal_amount || 0;
  const progressPct = totalPayable ? Math.min(100, Math.round(((loan.collected_amount || 0) / totalPayable) * 100)) : 0;

  const statusColors = {
    ACTIVE: { bg: 'var(--brand-primary-light, #F0FEF5)', border: 'var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', label: t('ld.status_active_loan') },
    OVERDUE: { bg: 'var(--color-danger-light, #FEF2F2)', border: 'var(--color-danger-border, #FCA5A5)', color: 'var(--color-danger, #DC2626)', label: tStatus('OVERDUE') },
    CLOSED: { bg: '#F1F5F9', border: '#CBD5E1', color: '#475569', label: t('ld.status_closed') },
    PENDING: { bg: 'var(--color-warning-light, #FFFBEB)', border: 'var(--color-warning-border, #FDE68A)', color: 'var(--color-warning, #D97706)', label: t('kyc.pending_review') }
  };
  const sc = statusColors[loan.status] || statusColors.ACTIVE;

  const interestAmount = Math.max(0, (Number(loan.total_payable) || Number(loan.principal_amount) || 0) - (Number(loan.principal_amount) || 0));

  const profilePhoto = borrower?.profile_image || loan.profile_image || borrower?.photo;

  return (
    <div className="loan-detail-page-container">

      {/* Header with Customer Profile Photo */}
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
                  <span className="status-dot" style={{ background: sc.color }} />
                  {sc.label}{isOverdue && loan.daysOverdue ? ` · ${loan.daysOverdue} ${t('ld.days_overdue_suffix')}` : ''}
                </span>
              </div>

              <div className="meta-pills-row">
                <span className="info-chip"><CreditCard style={{ width: 12, height: 12 }} />{loan.loan_account_no}</span>
                <span className="info-chip"><User style={{ width: 12, height: 12 }} />{borrower?.borrower_code || '—'}</span>
                <span className="info-chip"><Building2 style={{ width: 12, height: 12 }} />{loan.branch || '—'}</span>
                <span className="info-chip"><FileCheck style={{ width: 12, height: 12 }} />{loan.collector || '—'}</span>
                <span className="info-chip"><Phone style={{ width: 12, height: 12 }} />{loan.phone || borrower?.phone || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="loan-detail-kpi-grid">
        <div className="kpi-detail-card accent-blue">
          <div className="kpi-icon-badge badge-blue"><Wallet style={{ width: 18, height: 18 }} /></div>
          <div className="kpi-body">
            <span className="lbl">{t('ld.sanctioned_principal')}</span>
            <span className="val text-blue">₹{fmt(loan.principal_amount)}</span>
            <span className="sub">{t('ld.base_loan_amount')}</span>
          </div>
        </div>

        <div className="kpi-detail-card accent-emerald">
          <div className="kpi-icon-badge badge-emerald"><TrendingUp style={{ width: 18, height: 18 }} /></div>
          <div className="kpi-body">
            <span className="lbl">{t('ld.total_collected')}</span>
            <span className="val text-emerald">₹{fmt(loan.collected_amount)}</span>
            <span className="sub trend-up">{progressPct}% {t('ld.repaid_suffix')}</span>
          </div>
        </div>

        <div className={`kpi-detail-card ${loan.pending_amount > 0 ? 'accent-rose' : 'accent-emerald'}`}>
          <div className={`kpi-icon-badge ${loan.pending_amount > 0 ? 'badge-rose' : 'badge-emerald'}`}>
            {loan.pending_amount > 0 ? <TrendingDown style={{ width: 18, height: 18 }} /> : <CheckCircle2 style={{ width: 18, height: 18 }} />}
          </div>
          <div className="kpi-body">
            <span className="lbl">{t('ld.pending_balance')}</span>
            <span className={`val ${loan.pending_amount > 0 ? 'text-rose' : 'text-emerald'}`}>
              ₹{fmt(loan.pending_amount)}
            </span>
            <span className="sub">{t('ld.outstanding_amount')}</span>
          </div>
        </div>

        <div className="kpi-detail-card accent-violet">
          <div className="kpi-icon-badge badge-violet"><Clock style={{ width: 18, height: 18 }} /></div>
          <div className="kpi-body">
            <span className="lbl">{t('ld.daily_installment_emi')}</span>
            <span className="val">₹{fmt(loan.installment_amount)}</span>
            <span className="sub">{t('ld.per_day_word')}</span>
          </div>
        </div>

        <div className={`kpi-detail-card ${isOverdue ? 'accent-rose' : 'accent-emerald'}`}>
          <div className={`kpi-icon-badge ${isOverdue ? 'badge-rose' : 'badge-emerald'}`}>
            {isOverdue ? <AlertTriangle style={{ width: 18, height: 18 }} /> : <CalendarClock style={{ width: 18, height: 18 }} />}
          </div>
          <div className="kpi-body">
            <span className="lbl">{t('ld.repayment_status')}</span>
            <span className={`val ${isOverdue ? 'text-rose' : 'text-emerald'}`}>
              {isOverdue ? `${loan.daysOverdue || 0} ${t('ld.days_late_suffix')}` : t('ld.on_schedule')}
            </span>
            <span className="sub">{t('ld.due_date')} {loan.next_due || '—'}</span>
          </div>
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
              <Wallet style={{ width: 16, height: 16, color: 'var(--color-info, #2563EB)' }} />
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
              <TrendingUp style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
              <h3>{t('ld.repayment_progress')}</h3>
            </div>

            <div className="ring-container">
              <ProgressRing pct={progressPct} color={isOverdue ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)'} />
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
                <span className="val">{borrower ? [borrower.address_line1, borrower.city, borrower.state, borrower.pincode].filter(Boolean).join(', ') || '—' : loan.branch || '—'}</span>
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
              <Receipt style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
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
                      <th>{t('col.voucher_no')}</th>
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
                        <td><span className="receipt-code">{r.voucher_no}</span></td>
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
                        <td style={{ textAlign: 'right' }} className="balance-col">{r.balance_after !== null ? `₹${fmt(r.balance_after)}` : '—'}</td>
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
