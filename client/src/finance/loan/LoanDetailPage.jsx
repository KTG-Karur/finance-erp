import React, { useState, useMemo } from 'react';
import {
  ArrowLeft, User, Receipt, Wallet, PieChart,
  Phone, MapPin, CreditCard, Building2, Calendar, Clock,
  CheckCircle2, AlertTriangle, FileText, Download, TrendingUp, TrendingDown, History,
  Check, FileCheck, CalendarClock, Paperclip, Eye, ZoomIn, ZoomOut, RotateCw,
  Maximize2, Printer, ShieldCheck, Users, Shield, Briefcase, Landmark
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import PrintablePaymentHistorySheet from './PrintablePaymentHistorySheet';
import PrintableLoanApplicationSheet from './PrintableLoanApplicationSheet';
import VoucherReceiptModal from '../../components/VoucherReceiptModal';

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

export default function LoanDetailPage({
  loan,
  borrower,
  receipts = [],
  tenant,
  onBack,
  onPreclose,
  onEmergencyClose,
  onViewNoc
}) {
  const { t, tStatus } = useLanguage();
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // 'OVERVIEW' | 'BORROWER' | 'DOCUMENTS' | 'HISTORY'
  const [showPaymentHistorySheet, setShowPaymentHistorySheet] = useState(false);
  const [showAppSheet, setShowAppSheet] = useState(false);
  const [selectedVoucherForModal, setSelectedVoucherForModal] = useState(null);

  // Document canvas / zoom state
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!loan) return null;

  // Parse Guarantor, Nominee, and Security details
  const rawGuarantor = typeof loan.guarantor === 'string'
    ? (() => { try { return JSON.parse(loan.guarantor); } catch { return { name: loan.guarantor }; } })()
    : (loan.guarantor || null);

  const rawNominee = typeof loan.nominee === 'string'
    ? (() => { try { return JSON.parse(loan.nominee); } catch { return null; } })()
    : (loan.nominee || null);

  const rawSecurity = typeof loan.security === 'string'
    ? (() => { try { return JSON.parse(loan.security); } catch { return null; } })()
    : (loan.security || null);

  // Robust Guarantor extraction (with fallback to borrower guarantor fields)
  const guarantor = {
    name: rawGuarantor?.name || (typeof loan.guarantor === 'string' && !loan.guarantor.startsWith('{') ? loan.guarantor : '') || borrower?.guarantor_name || '',
    relationship: rawGuarantor?.final_relationship || rawGuarantor?.relationship || 'Guarantor',
    dob: rawGuarantor?.dob || '',
    mobile: rawGuarantor?.mobile || borrower?.guarantor_phone || '',
    id_proof_type: rawGuarantor?.id_proof_type || (rawGuarantor?.id_proof_number ? 'Aadhaar Card' : ''),
    id_proof_number: rawGuarantor?.id_proof_number || rawGuarantor?.aadhaar || '',
    files: rawGuarantor?.files || []
  };

  // Robust Nominee extraction
  const nominee = rawNominee || (borrower?.nominee_name ? {
    name: borrower.nominee_name,
    relationship: borrower.nominee_relation || 'Nominee',
    dob: '',
    mobile: borrower.nominee_phone || '',
    id_proof_type: '',
    id_proof_number: '',
    files: []
  } : null);

  // Robust Security extraction (exclude pure nominee choices from collateral)
  const security = rawSecurity && rawSecurity.type !== 'NOMINEE' && rawSecurity.type !== 'NONE' ? rawSecurity : null;

  // Consolidate all uploaded documents from borrower + loan application sections
  const borrowerDocs = (borrower?.documents || []).map((d, idx) => ({
    id: d.id || `borrower-doc-${idx}`,
    name: d.name || 'KYC Document',
    category: d.category || 'KYC',
    type: 'Borrower KYC',
    url: d.url,
    mime: d.mime
  }));

  const guarantorDocs = (guarantor?.files || []).map((f, idx) => ({
    id: `guarantor-doc-${idx}`,
    name: f.name || 'Guarantor ID Proof',
    category: 'GUARANTOR',
    type: 'Guarantor Document',
    url: f.url,
    mime: f.type
  }));

  const nomineeDocs = (nominee?.files || []).map((f, idx) => ({
    id: `nominee-doc-${idx}`,
    name: f.name || 'Nominee Document',
    category: 'NOMINEE',
    type: 'Nominee Document',
    url: f.url,
    mime: f.type
  }));

  const securityDocs = (security?.details?.files || []).map((f, idx) => ({
    id: `security-doc-${idx}`,
    name: f.name || 'Collateral / Security Document',
    category: 'SECURITY',
    type: 'Security Collateral',
    url: f.url,
    mime: f.type
  }));

  const allApplicationDocs = [
    ...borrowerDocs,
    ...guarantorDocs,
    ...nomineeDocs,
    ...securityDocs
  ];

  const activeDoc = allApplicationDocs.find(d => d.id === selectedDocId) || allApplicationDocs[0] || null;
  const activeIsImage = activeDoc?.url && (
    (activeDoc?.mime || '').startsWith('image/') ||
    activeDoc.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
    activeDoc.url.startsWith('data:image') ||
    activeDoc.url.match(/\.(jpg|jpeg|png|gif|webp)/i)
  );

  // The installment label/suffix and tenure unit used to be hardcoded to
  // "Daily"/"days" regardless of the loan's actual repayment_frequency — a
  // monthly-EMI loan would show "₹2,000 /day" and "180 Days" instead of
  // "₹2,000 /month" and "6 Months", which is exactly backwards from what the
  // loan was actually set up as.
  const isInterestOnly = loan.repayment_method === 'INTEREST_ONLY';
  const freq = loan.repayment_frequency || 'DAILY';
  const installmentLabel = isInterestOnly
    ? 'Interest Only'
    : (freq === 'MONTHLY' ? t('nla.freq_monthly_emi') : freq === 'WEEKLY' ? t('nla.freq_weekly_installment') : t('nla.freq_daily_emi'));
  const installmentSuffix = freq === 'MONTHLY' ? t('nla.per_month') : freq === 'WEEKLY' ? `/${t('nla.freq_weekly_short')}` : t('cp.per_day');
  const tenureDisplay = loan.tenure_days
    ? (freq === 'MONTHLY' && loan.tenure_days % 30 === 0
      ? `${loan.tenure_days / 30} ${t('nla.months_suffix')}`
      : freq === 'WEEKLY' && loan.tenure_days % 7 === 0
        ? `${loan.tenure_days / 7} ${t('nla.freq_weekly_short')}`
        : `${loan.tenure_days} ${t('ld.days_suffix')}`)
    : '—';

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
    const totalAmt = Number(r.amount ?? (principalAmt + interestAmt + penaltyAmt));
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
      interest_from_date: r.interest_from_date || null,
      interest_paid_upto: r.interest_paid_upto || null,
      interest_days: r.interest_days ?? null,
      interest_shortfall: Number(r.interest_shortfall || 0),
      interest_waiver: Number(r.interest_waiver || 0),
      waiver_status: r.waiver_status || (Number(r.interest_waiver || 0) > 0 ? 'PENDING_APPROVAL' : 'NONE'),
      waiver_rejection_reason: r.waiver_rejection_reason || null,
      waiver_approved_by: r.waiver_approved_by || null,
      total_paid: totalAmt,
      balance_after: (r.new_principal_balance ?? r.balance_after) ?? null,
      status: r.voided ? 'VOIDED' : (r.reverted ? 'REVERTED' : (r.clearance_status || r.status || 'CLEARED')),
      remarks: r.notes || r.remarks || t('ld.emi_payment_received')
    };
  });

  const todayISO = new Date().toISOString().slice(0, 10);
  const nextDueDate = loan.next_due || loan.next_due_date || (loan.repayment_schedule && loan.repayment_schedule.find(r => (r.principal - (r.principal_paid || 0)) > 0.001 || (r.interest - (r.interest_paid || 0)) > 0.001)?.due_date) || null;
  const overdueDays = nextDueDate && nextDueDate < todayISO
    ? Math.max(0, Math.round((new Date(todayISO) - new Date(nextDueDate)) / (1000 * 60 * 60 * 24)))
    : (loan.daysOverdue || 0);
  const isActuallyOverdue = loan.status === 'OVERDUE' || overdueDays > 0;
  const isOverdue = isActuallyOverdue;
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
            {loan.status === 'CLOSED' ? (
              <button
                type="button"
                onClick={() => onViewNoc?.(loan)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#F0FDF4',
                  color: '#15803D',
                  border: '1px solid #BBF7D0',
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <FileCheck style={{ width: 14, height: 14 }} />
                <span>Print NOC Certificate</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onPreclose?.(loan)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--brand-primary, #15803D)',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <CheckCircle2 style={{ width: 14, height: 14 }} />
                <span>Preclose Loan</span>
              </button>
            )}

            <button type="button" onClick={() => setShowAppSheet(true)} className="btn-header-secondary">
              <Printer style={{ width: 14, height: 14 }} />
              <span>{t('ld.view_app_form', 'Application Form')}</span>
            </button>

            <button type="button" onClick={() => setShowPaymentHistorySheet(true)} className="btn-header-secondary">
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
                <span className="info-chip"><Paperclip style={{ width: 12, height: 12 }} />{allApplicationDocs.length} Docs</span>
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
            <span className="lbl">{installmentLabel}</span>
            <span className="val">{isInterestOnly ? 'Interest Only' : `₹${fmt(loan.installment_amount)}`}</span>
            <span className="sub">{isInterestOnly ? 'Accrues Daily' : installmentSuffix}</span>
          </div>
        </div>

        <div className={`kpi-detail-card ${isActuallyOverdue ? 'accent-rose' : 'accent-emerald'}`}>
          <div className={`kpi-icon-badge ${isActuallyOverdue ? 'badge-rose' : 'badge-emerald'}`}>
            {isActuallyOverdue ? <AlertTriangle style={{ width: 18, height: 18 }} /> : <CalendarClock style={{ width: 18, height: 18 }} />}
          </div>
          <div className="kpi-body">
            <span className="lbl">{t('ld.repayment_status')}</span>
            <span className={`val ${isActuallyOverdue ? 'text-rose' : 'text-emerald'}`}>
              {overdueDays > 0 ? `${overdueDays} ${t('ld.days_late_suffix')}` : (loan.status === 'OVERDUE' ? 'Overdue' : t('ld.on_schedule'))}
            </span>
            <span className="sub">{t('ld.due_date')} {nextDueDate || '—'}</span>
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
          className={`detail-tab-btn ${activeTab === 'DOCUMENTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('DOCUMENTS')}
        >
          <Paperclip style={{ width: 15, height: 15 }} />
          <span>{t('ld.tab_documents', 'Application & Documents')} ({allApplicationDocs.length})</span>
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
                <span className="lbl">{installmentLabel}</span>
                <span className="val text-emerald">₹{fmt(loan.installment_amount)} {installmentSuffix}</span>
              </div>
              <div className="meta-row">
                <span className="lbl">{t('ld.disbursement_date')}</span>
                <span className="val">{loan.loan_date || '—'}</span>
              </div>
              <div className="meta-row">
                <span className="lbl">{t('ld.tenure_period')}</span>
                <span className="val">{tenureDisplay}</span>
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
                <span className="val">{guarantor?.name || borrower?.guarantor_name || '—'}</span>
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

      {/* Tab 3: Application Documents & Guarantor Dossier */}
      {activeTab === 'DOCUMENTS' && (
        <div className="detail-tab-content-single" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Section A: Application Overview Bar */}
          <div className="detail-card">
            <div className="detail-card-header" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
                <h3>Application Dossier & Submitted Documents</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAppSheet(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: 'var(--brand-primary, #15803D)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Printer style={{ width: 15, height: 15 }} />
                <span>View & Print Loan Application Sheet</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 12 }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Loan Application No</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{loan.loan_account_no}</div>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Loan Purpose</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A', marginTop: 4 }}>{loan.purpose || 'Business / Personal Credit'}</div>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Total Uploaded Documents</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--brand-primary, #15803D)', marginTop: 4 }}>{allApplicationDocs.length} Attachments</div>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Guarantor Status</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: guarantor.name ? '#0F172A' : '#94A3B8', marginTop: 4 }}>
                  {guarantor.name ? 'Guarantor Recorded' : 'Not Recorded'}
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Grid of 3 Separate Cards: Guarantor, Nominee & Security Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            
            {/* Card 1: Guarantor Details */}
            <div className="detail-card">
              <div className="detail-card-header">
                <Users style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
                <h3>Guarantor Details</h3>
              </div>

              <div className="detail-meta-list" style={{ marginTop: 8 }}>
                <div className="meta-row">
                  <span className="lbl">Guarantor Name</span>
                  <span className="val" style={{ fontWeight: 700, color: guarantor.name ? '#0F172A' : '#94A3B8' }}>
                    {guarantor.name || 'Not Recorded'}
                  </span>
                </div>
                <div className="meta-row">
                  <span className="lbl">Relationship</span>
                  <span className="val">{guarantor.relationship || 'Guarantor'}</span>
                </div>
                <div className="meta-row">
                  <span className="lbl">Date of Birth</span>
                  <span className="val">{guarantor.dob || '—'}</span>
                </div>
                <div className="meta-row">
                  <span className="lbl">Mobile Number</span>
                  <span className="val">{guarantor.mobile || '—'}</span>
                </div>
                <div className="meta-row">
                  <span className="lbl">ID Proof Type</span>
                  <span className="val">{guarantor.id_proof_type || '—'}</span>
                </div>
                <div className="meta-row">
                  <span className="lbl">ID Proof Number</span>
                  <span className="val monospace">{guarantor.id_proof_number || '—'}</span>
                </div>
                <div className="meta-row">
                  <span className="lbl">Attached Proof Files</span>
                  <span className="val font-semibold">{guarantorDocs.length} File(s)</span>
                </div>
              </div>
            </div>

            {/* Card 2: Nominee Details (Only displayed if a nominee was designated) */}
            {nominee?.name && (
              <div className="detail-card">
                <div className="detail-card-header">
                  <Users style={{ width: 16, height: 16, color: '#7C3AED' }} />
                  <h3>Nominee Details</h3>
                </div>

                <div className="detail-meta-list" style={{ marginTop: 8 }}>
                  <div className="meta-row">
                    <span className="lbl">Nominee Name</span>
                    <span className="val" style={{ fontWeight: 700, color: '#0F172A' }}>
                      {nominee.name}
                    </span>
                  </div>
                  <div className="meta-row">
                    <span className="lbl">Relationship</span>
                    <span className="val">{nominee.final_relationship || nominee.relationship || '—'}</span>
                  </div>
                  <div className="meta-row">
                    <span className="lbl">Date of Birth</span>
                    <span className="val">{nominee.dob || '—'}</span>
                  </div>
                  <div className="meta-row">
                    <span className="lbl">Mobile Number</span>
                    <span className="val">{nominee.mobile || '—'}</span>
                  </div>
                  <div className="meta-row">
                    <span className="lbl">ID Proof Type</span>
                    <span className="val">{nominee.id_proof_type || '—'}</span>
                  </div>
                  <div className="meta-row">
                    <span className="lbl">ID Proof Number</span>
                    <span className="val monospace">{nominee.id_proof_number || '—'}</span>
                  </div>
                  <div className="meta-row">
                    <span className="lbl">Attached Proof Files</span>
                    <span className="val font-semibold">{nomineeDocs.length} File(s)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Card 3: Security Collateral & Pledged Assets (Only displayed if collateral was pledged) */}
            {security && security.type && security.type !== 'NONE' && security.type !== 'NOMINEE' && (
              <div className="detail-card">
                <div className="detail-card-header">
                  <ShieldCheck style={{ width: 16, height: 16, color: '#2563EB' }} />
                  <h3>Security & Collateral</h3>
                </div>

                <div className="detail-meta-list" style={{ marginTop: 8 }}>
                  <div className="meta-row">
                    <span className="lbl">Collateral Type</span>
                    <span className="val" style={{ fontWeight: 700, color: 'var(--brand-primary, #15803D)' }}>
                      {security.type}
                    </span>
                  </div>

                  {security.type === 'PROPERTY' && (
                    <>
                      <div className="meta-row">
                        <span className="lbl">Property Type</span>
                        <span className="val">{security.details?.final_type || security.details?.type || '—'}</span>
                      </div>
                      <div className="meta-row">
                        <span className="lbl">Survey Number</span>
                        <span className="val monospace">{security.details?.survey_number || '—'}</span>
                      </div>
                      <div className="meta-row">
                        <span className="lbl">Estimated Valuation</span>
                        <span className="val font-semibold">₹{fmt(security.details?.market_value)}</span>
                      </div>
                    </>
                  )}

                  {security.type === 'VEHICLE' && (
                    <>
                      <div className="meta-row">
                        <span className="lbl">Vehicle RC Number</span>
                        <span className="val monospace uppercase">{security.details?.rc_number || '—'}</span>
                      </div>
                      <div className="meta-row">
                        <span className="lbl">Make & Model</span>
                        <span className="val">{security.details?.make_model || '—'}</span>
                      </div>
                      <div className="meta-row">
                        <span className="lbl">RC Registered Owner</span>
                        <span className="val">{security.details?.rc_owner_name || '—'}</span>
                      </div>
                    </>
                  )}

                  {security.type === 'CHEQUE' && (
                    <>
                      <div className="meta-row">
                        <span className="lbl">Bank Name</span>
                        <span className="val">{security.details?.bank_name || '—'}</span>
                      </div>
                      <div className="meta-row">
                        <span className="lbl">Account Number</span>
                        <span className="val monospace">{security.details?.account_number || '—'}</span>
                      </div>
                      <div className="meta-row">
                        <span className="lbl">Cheque Leaf Range</span>
                        <span className="val">{security.details?.cheque_number_range || '—'} ({security.details?.cheques_count || 0} leaves)</span>
                      </div>
                    </>
                  )}

                  {security.type === 'OTHERS' && (
                    <div className="meta-row">
                      <span className="lbl">Security Description</span>
                      <span className="val">{security.details?.description || '—'}</span>
                    </div>
                  )}

                  <div className="meta-row">
                    <span className="lbl">Attached Collateral Files</span>
                    <span className="val font-semibold">{securityDocs.length} File(s)</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Section C: Interactive Uploaded Documents Inspection Canvas */}
          <div className="detail-card">
            <div className="detail-card-header" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Paperclip style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
                <h3>Uploaded Document Inspection & KYC Verification ({allApplicationDocs.length})</h3>
              </div>
              {activeDoc && (
                <a
                  href={activeDoc.url}
                  download={activeDoc.name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--brand-primary, #15803D)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  <Download style={{ width: 14, height: 14 }} />
                  <span>Download Document</span>
                </a>
              )}
            </div>

            {/* Document Select Tabs */}
            {allApplicationDocs.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, marginBottom: 16 }}>
                {allApplicationDocs.map((doc) => {
                  const isSelected = activeDoc?.id === doc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        setSelectedDocId(doc.id);
                        setZoomScale(1);
                        setRotation(0);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: isSelected ? '1px solid var(--brand-primary, #15803D)' : '1px solid #CBD5E1',
                        background: isSelected ? 'var(--brand-primary-light, #F0FEF5)' : '#FFFFFF',
                        color: isSelected ? 'var(--brand-primary, #15803D)' : '#334155',
                        fontSize: '0.75rem',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <FileText style={{ width: 13, height: 13 }} />
                      <span>{doc.name}</span>
                      <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: 4, background: isSelected ? '#DCFCE7' : '#F1F5F9', color: isSelected ? '#166534' : '#64748B' }}>
                        {doc.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>
                No uploaded application documents or KYC files attached to this loan.
              </div>
            )}

            {/* Document Canvas Viewer Frame */}
            {activeDoc && (
              <div style={{
                position: 'relative',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                minHeight: 380,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: 16
              }}>
                {activeIsImage ? (
                  <img
                    src={activeDoc.url}
                    alt={activeDoc.name}
                    style={{
                      maxWidth: '100%',
                      maxHeight: 500,
                      objectFit: 'contain',
                      transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s ease',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <FileText style={{ width: 48, height: 48, color: 'var(--brand-primary, #15803D)', margin: '0 auto 12px' }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A' }}>{activeDoc.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>{activeDoc.type}</div>
                    <a
                      href={activeDoc.url}
                      download={activeDoc.name}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 16,
                        padding: '8px 16px',
                        background: 'var(--brand-primary, #15803D)',
                        color: '#FFFFFF',
                        borderRadius: 6,
                        textDecoration: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      <Download style={{ width: 14, height: 14 }} />
                      <span>Download File</span>
                    </a>
                  </div>
                )}

                {/* Floating Canvas Controls */}
                <div style={{
                  position: 'absolute',
                  bottom: 12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 12px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  borderRadius: 20,
                  backdropFilter: 'blur(4px)',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  <button
                    type="button"
                    onClick={() => setZoomScale(z => Math.max(0.6, z - 0.2))}
                    style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title="Zoom Out"
                  >
                    <ZoomOut style={{ width: 14, height: 14 }} />
                  </button>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, minWidth: 36, textAlign: 'center' }}>
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomScale(z => Math.min(2.5, z + 0.2))}
                    style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title="Zoom In"
                  >
                    <ZoomIn style={{ width: 14, height: 14 }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: 4 }}
                    title="Rotate"
                  >
                    <RotateCw style={{ width: 14, height: 14 }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setZoomScale(1); setRotation(0); }}
                    style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: 4 }}
                    title="Reset View"
                  >
                    <Maximize2 style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Tab 4: Expanded Full Payment Ledger */}
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
                        <td>
                          <button
                            type="button"
                            onClick={() => setSelectedVoucherForModal({
                              voucher_no: r.voucher_no,
                              date: r.date,
                              branch: r.branch || loan.branch,
                              borrower_name: loan.borrower_name || borrower?.full_name,
                              phone: loan.phone || borrower?.phone,
                              loan_account_no: loan.loan_account_no,
                              payment_mode: r.mode,
                              reference_no: r.txn_ref,
                              amount: r.total_paid,
                              principal_paid: r.principal,
                              interest_paid: r.interest,
                              penalty: r.penalty,
                              interest_from_date: r.interest_from_date,
                              interest_paid_upto: r.interest_paid_upto,
                              interest_days: r.interest_days,
                              interest_shortfall: r.interest_shortfall,
                              interest_waiver: r.interest_waiver,
                              pending_balance: r.balance_after,
                              collector_name: r.collector
                            })}
                            style={{
                              background: '#F1F5F9',
                              border: '1px solid #CBD5E1',
                              borderRadius: 6,
                              padding: '3px 8px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              color: 'var(--brand-primary, #15803D)',
                              fontFamily: 'monospace',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Click to view and print official voucher"
                          >
                            <Receipt style={{ width: 12, height: 12 }} />
                            <span>{r.voucher_no}</span>
                          </button>
                        </td>
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
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 600, color: '#7C3AED' }}>₹{fmt(r.interest)}</div>
                          {(r.interest_paid_upto || r.interest_from_date) && (
                            <div style={{ fontSize: '0.66rem', color: '#64748B', whiteSpace: 'nowrap', marginTop: 2 }}>
                              {r.interest_from_date ? `${r.interest_from_date} → ${r.interest_paid_upto}` : `Up to ${r.interest_paid_upto}`}
                              {r.interest_days !== null && r.interest_days !== undefined ? ` (${r.interest_days}d)` : ''}
                            </div>
                          )}
                          {r.interest_shortfall > 0 && (
                            <div style={{ fontSize: '0.62rem', color: '#B45309' }}>C/F: ₹{fmt(r.interest_shortfall)}</div>
                          )}
                          {r.interest_waiver > 0 && (
                            <div style={{ marginTop: 2 }}>
                              {r.waiver_status === 'REJECTED' ? (
                                <span style={{
                                  display: 'inline-block',
                                  fontSize: '0.62rem',
                                  color: '#DC2626',
                                  background: '#FEF2F2',
                                  border: '1px solid #FECACA',
                                  borderRadius: 4,
                                  padding: '1px 4px',
                                  fontWeight: 600
                                }} title={`Rejection Reason: ${r.waiver_rejection_reason || 'Rejected by Manager'}`}>
                                  Waiver Rejected: ₹{fmt(r.interest_waiver)} (Arrears)
                                </span>
                              ) : r.waiver_status === 'APPROVED' ? (
                                <span style={{
                                  display: 'inline-block',
                                  fontSize: '0.62rem',
                                  color: '#15803D',
                                  background: '#F0FDF4',
                                  border: '1px solid #BBF7D0',
                                  borderRadius: 4,
                                  padding: '1px 4px',
                                  fontWeight: 600
                                }} title={`Approved by: ${r.waiver_approved_by || 'Manager'}`}>
                                  Waived: ₹{fmt(r.interest_waiver)} (Approved)
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-block',
                                  fontSize: '0.62rem',
                                  color: '#B45309',
                                  background: '#FFFBEB',
                                  border: '1px solid #FDE68A',
                                  borderRadius: 4,
                                  padding: '1px 4px',
                                  fontWeight: 600
                                }}>
                                  Waiver: ₹{fmt(r.interest_waiver)} (Pending Approval)
                                </span>
                              )}
                            </div>
                          )}
                        </td>
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

      {showPaymentHistorySheet && (
        <PrintablePaymentHistorySheet
          loan={loan}
          borrower={borrower}
          receipts={receipts}
          tenant={tenant}
          onClose={() => setShowPaymentHistorySheet(false)}
        />
      )}

      {showAppSheet && (
        <PrintableLoanApplicationSheet
          applicationData={loan}
          borrowerData={borrower}
          tenant={tenant}
          onClose={() => setShowAppSheet(false)}
        />
      )}

      {selectedVoucherForModal && (
        <VoucherReceiptModal
          company={tenant}
          voucher={selectedVoucherForModal}
          typeLabel="COLLECTION RECEIPT"
          onClose={() => setSelectedVoucherForModal(null)}
        />
      )}

    </div>
  );
}
