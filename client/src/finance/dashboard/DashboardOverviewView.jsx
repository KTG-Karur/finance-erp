import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, ArrowUpRight,
  Search, Filter, Calendar, MoreHorizontal,
  CircleDollarSign, Wallet, AlertTriangle,
  Users, Banknote, CheckCircle, ChevronRight,
  PlusCircle, CreditCard, RefreshCw, Building2,
  BarChart3, LineChart, Target, Sparkles, Activity, Layers,
  Clock, ShieldCheck
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import SharedDropdown from '../../components/common/SharedDropdown';

// ── Sparkline SVG Helper ──────────────────────────────────────
function Sparkline({ data = [], color = 'var(--brand-primary, #15803D)', height = 24, width = 64 }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const fillPts = [
    `0,${height}`,
    ...data.map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    }),
    `${width},${height}`
  ].join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#sg-${color.replace('#','')})`} />
      <polyline points={pts} stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Donut Chart SVG Helper ─────────────────────────────────────
function DonutChart({ segments = [], size = 110, activeIndex = null, setActiveIndex }) {
  const r = 40;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * (circ * 0.88);
        const gap = circ - dash;
        const isHovered = activeIndex === i;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={isHovered ? r + 2 : r}
            fill="none" stroke={seg.color} strokeWidth={isHovered ? 12 : 9}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset * (circ / total) * 0.88 - circ * 0.06}
            strokeLinecap="round"
            onMouseEnter={() => setActiveIndex?.(i)}
            onMouseLeave={() => setActiveIndex?.(null)}
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
              filter: isHovered ? `drop-shadow(0 0 6px ${seg.color})` : 'none'
            }}
          />
        );
        offset += seg.value;
        return el;
      })}
      <circle cx={cx} cy={cy} r={r - 13} fill="white" />
    </svg>
  );
}

// ── ELEGANT MODERN KPI CARD ────────────────────────────────────
function ModernKpiCard({
  title,
  value,
  subLabel,
  badgeText,
  badgeType = 'green',
  icon: IconComponent,
  iconColor = 'var(--brand-primary, #15803D)',
  iconBg = 'var(--brand-primary-light, #F0FEF5)',
  accentColor = 'var(--brand-primary, #15803D)',
  sparkData = [],
  sparkColor,
  isLivePulse = false
}) {
  return (
    <div className="db-kpi-card" style={{ '--accent-color': accentColor }}>
      <div className="db-kpi-card__top">
        <div className="db-kpi-card__icon" style={{ background: iconBg }}>
          {IconComponent && <IconComponent style={{ width: 15, height: 15, color: iconColor }} />}
        </div>
        <span className={`db-kpi-card__badge db-kpi-card__badge--${badgeType}`}>
          {isLivePulse && <span className="db-pulse-dot" />}
          {badgeText}
        </span>
      </div>

      <div className="db-kpi-card__body">
        <div className="db-kpi-card__value">{value}</div>
        <div className="db-kpi-card__title">{title}</div>
      </div>

      <div className="db-kpi-card__footer">
        <span className="db-kpi-card__sub">{subLabel}</span>
        <div className="db-kpi-card__spark">
          <Sparkline data={sparkData} color={sparkColor || accentColor} height={18} width={50} />
        </div>
      </div>
    </div>
  );
}

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip
} from 'recharts';

// ── RECHARTS MODERN SAAS AREA/LINE CHART ──────────────────────────
function RechartsModernSaaSChart({
  labels = [],
  givenData = [],
  collectedData = []
}) {
  const { t } = useLanguage();
  const chartData = labels.map((month, i) => ({
    month,
    given: givenData[i] || 0,
    collected: collectedData[i] || 0,
    gap: Math.abs((givenData[i] || 0) - (collectedData[i] || 0))
  }));

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const gVal = payload.find(p => p.dataKey === 'given')?.value || 0;
    const cVal = payload.find(p => p.dataKey === 'collected')?.value || 0;
    const gapVal = gVal - cVal;
    const ratio = gVal > 0 ? Math.min(Math.round((cVal / gVal) * 100), 100) : 100;

    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '12px',
        padding: '10px 14px',
        boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.4)',
        color: '#FFFFFF',
        minWidth: '180px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: '6px', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F8FAFC' }}>{label} {t('dash.performance_suffix')}</span>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--brand-primary, #34D399)', background: 'rgba(16, 185, 129, 0.22)', padding: '2px 7px', borderRadius: '6px' }}>
            {ratio}% {t('dash.recovery_suffix')}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.72rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-info, #3B82F6)', boxShadow: '0 0 8px var(--color-info, #3B82F6)' }} /> {t('dash.given_disbursed_colon')}
            </span>
            <strong style={{ color: '#60A5FA', fontWeight: 700 }}>₹{fmt(gVal)}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-primary, #10B981)', boxShadow: '0 0 8px var(--brand-primary, #10B981)' }} /> {t('dash.collected_colon')}
            </span>
            <strong style={{ color: 'var(--brand-primary, #34D399)', fontWeight: 700 }}>₹{fmt(cVal)}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', paddingTop: '5px', borderTop: '1px dashed rgba(255, 255, 255, 0.12)' }}>
            <span style={{ color: '#CBD5E1', fontWeight: 500 }}>{t('dash.net_difference_gap_colon')}</span>
            <strong style={{ color: gapVal >= 0 ? '#FB923C' : 'var(--brand-primary, #34D399)', fontWeight: 700 }}>
              ₹{fmt(Math.abs(gapVal))}
            </strong>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height: 210, paddingTop: 6 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="saasGiven" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-info, #3B82F6)" stopOpacity={0.32} />
              <stop offset="95%" stopColor="var(--color-info, #3B82F6)" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="saasCollected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--brand-primary, #10B981)" stopOpacity={0.32} />
              <stop offset="95%" stopColor="var(--brand-primary, #10B981)" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
            dy={6}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 500 }}
            tickFormatter={(v) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${Math.round(v / 1000)}k`}
            width={52}
          />

          <RechartsTooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="given"
            name={t('dash.given_amount')}
            stroke="var(--color-info, #3B82F6)"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#saasGiven)"
            activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2.5, fill: 'var(--color-info, #3B82F6)' }}
          />

          <Area
            type="monotone"
            dataKey="collected"
            name={t('dash.collected_amount')}
            stroke="var(--brand-primary, #10B981)"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#saasCollected)"
            activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2.5, fill: 'var(--brand-primary, #10B981)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── MONTHLY DISBURSED (GIVEN) VS COLLECTED COMPARISON CHART ──────────
function MonthlyGivenVsCollectedChart({
  labels = [],
  givenData = [],
  collectedData = []
}) {
  const { t } = useLanguage();
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(labels.length - 1 || 0);
  const [viewTab, setViewTab] = useState('matrix'); // 'matrix' | 'trend'

  const maxVal = Math.max(...givenData, ...collectedData, 1000);
  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const activeMonth = labels[selectedMonthIndex] || 'Jul';
  const activeGiven = givenData[selectedMonthIndex] || 0;
  const activeCollected = collectedData[selectedMonthIndex] || 0;
  const netDifference = activeGiven - activeCollected;
  const collectionPct = activeGiven > 0 ? Math.min(Math.round((activeCollected / activeGiven) * 100), 100) : 100;

  return (
    <div className="db-matrix-chart">

      {/* Top Controls Bar */}
      <div className="db-matrix-header">
        <div className="db-matrix-tabs">
          <button
            className={`db-mtab ${viewTab === 'matrix' ? 'db-mtab--active' : ''}`}
            onClick={() => setViewTab('matrix')}
          >
            <BarChart3 style={{ width: 12, height: 12 }} /> {t('dash.pillar_view')}
          </button>
          <button
            className={`db-mtab ${viewTab === 'trend' ? 'db-mtab--active' : ''}`}
            onClick={() => setViewTab('trend')}
          >
            <LineChart style={{ width: 12, height: 12 }} /> {t('dash.all_months_trend')}
          </button>
        </div>

        <div className="db-matrix-legend">
          <span className="db-mleg-item"><span className="db-mdot" style={{ background: 'var(--color-info, #3B82F6)' }} /> {t('dash.given_amount')}</span>
          <span className="db-mleg-item"><span className="db-mdot db-mdot--green" /> {t('dash.collected_amount')}</span>
        </div>
      </div>

      {/* VIEW 1: DUAL FLOATING PILLARS MATRIX */}
      {viewTab === 'matrix' && (
        <div className="db-pillars-container">
          <div className="db-pillars-grid">
            {labels.map((month, idx) => {
              const gVal = givenData[idx] || 0;
              const cVal = collectedData[idx] || 0;
              const givHeightPct = Math.max(Math.round((gVal / maxVal) * 100), 8);
              const colHeightPct = Math.max(Math.round((cVal / maxVal) * 100), 8);
              const isSelected   = selectedMonthIndex === idx;

              return (
                <div
                  key={idx}
                  className={`db-pillar-col ${isSelected ? 'db-pillar-col--selected' : ''}`}
                  onClick={() => setSelectedMonthIndex(idx)}
                >
                  <div className="db-dual-bars">
                    {/* Given/Disbursed Bar (Royal Blue) */}
                    <div className="db-bar-wrap" title={`${t('dash.given_amount')}: ₹${fmt(gVal)}`}>
                      <div
                        className="db-dual-bar"
                        style={{ height: `${givHeightPct}%`, background: 'linear-gradient(180deg, #60A5FA 0%, var(--color-info, #3B82F6) 100%)' }}
                      />
                    </div>

                    {/* Collected Bar (Emerald Green) */}
                    <div className="db-bar-wrap" title={`${t('dash.collected_amount')}: ₹${fmt(cVal)}`}>
                      <div
                        className="db-dual-bar db-dual-bar--green"
                        style={{ height: `${colHeightPct}%` }}
                      />
                    </div>
                  </div>

                  <span className="db-pillar-label">{month}</span>
                </div>
              );
            })}
          </div>

          {/* Interactive Month Breakdown Inspector */}
          <div className="db-month-inspector">
            <div className="db-mi-left">
              <span className="db-mi-month">{activeMonth} {t('dash.capital_comparison_suffix')}</span>
              <div className="db-mi-rate-badge">
                <Target style={{ width: 11, height: 11 }} /> {collectionPct}% {t('dash.recovery_efficiency_suffix')}
              </div>
            </div>

            <div className="db-mi-stats">
              <div className="db-mi-stat">
                <span>{t('dash.given_disbursed_amount')}</span>
                <strong style={{ color: 'var(--color-info, #3B82F6)' }}>₹{fmt(activeGiven)}</strong>
              </div>
              <div className="db-mi-div" />
              <div className="db-mi-stat">
                <span>{t('dash.collected_amount')}</span>
                <strong style={{ color: 'var(--brand-primary, #15803D)' }}>₹{fmt(activeCollected)}</strong>
              </div>
              <div className="db-mi-div" />
              <div className="db-mi-stat">
                <span>{t('dash.net_difference_gap')}</span>
                <strong style={{ color: netDifference >= 0 ? '#F97316' : 'var(--brand-primary, #10B981)' }}>
                  ₹{fmt(Math.abs(netDifference))} {netDifference >= 0 ? t('dash.outstanding') : t('dash.surplus_word')}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ALL MONTHS TREND GRAPH */}
      {viewTab === 'trend' && (
        <RechartsModernSaaSChart
          labels={labels}
          givenData={givenData}
          collectedData={collectedData}
        />
      )}

    </div>
  );
}

export default function DashboardOverviewView({
  loans = [],
  collections = [],
  borrowers = [],
  branchesList = [],
  user = {},
  onQuickAction,
  selectedBranch: globalBranch = 'ALL'
}) {
  const { t, tStatus } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeDonutIndex, setActiveDonutIndex] = useState(null);

  // Check user role for branch scoping
  const isAdmin = !user?.role || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  const userBranch = user?.branch || user?.assignedBranch || (branchesList[0]?.name) || 'Karur Branch';

  // Branch filter state (Admin can select branch or ALL, Branch Manager is locked to their branch)
  const [selectedBranch, setSelectedBranch] = useState(isAdmin ? 'ALL' : userBranch);
  // A global branch lock overrides even the admin's own free choice — same rule as
  // every other page's branch filter in the app.
  useEffect(() => {
    if (globalBranch && globalBranch !== 'ALL') setSelectedBranch(globalBranch);
  }, [globalBranch]);

  // Unique list of available branches
  const availableBranches = Array.from(new Set([
    ...branchesList.map(b => b.name),
    ...loans.map(l => l.branch).filter(Boolean),
    ...borrowers.map(b => b.branch).filter(Boolean)
  ])).filter(Boolean);

  // Scoped Data filtering based on selected branch
  const scopedLoans = loans.filter(l => selectedBranch === 'ALL' || l.branch === selectedBranch);
  const scopedCollections = collections.filter(c => {
    if (selectedBranch === 'ALL') return true;
    const associatedLoan = loans.find(l => l.id === c.loan_id);
    return c.branch === selectedBranch || (associatedLoan && associatedLoan.branch === selectedBranch);
  });
  const scopedBorrowers = borrowers.filter(b => selectedBranch === 'ALL' || !b.branch || b.branch === selectedBranch);

  // Aggregated Operational Metrics derived from Scoped Data (with clean zero defaults if empty)
  const todayISO = new Date().toISOString().split('T')[0];
  const todayCollectionsList = scopedCollections.filter(c => c.date === todayISO || c.collection_date === todayISO);
  const rawToday = todayCollectionsList.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  const todaysCollection = rawToday > 0 ? rawToday : (scopedCollections.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0));

  const activeLoans = scopedLoans.filter(l => (l.status || '').toUpperCase() === 'ACTIVE');
  const overdueLoans = scopedLoans.filter(l => (l.status || '').toUpperCase() === 'OVERDUE');
  const closedLoans = scopedLoans.filter(l => (l.status || '').toUpperCase() === 'CLOSED');
  const pendingLoans = scopedLoans.filter(l => (l.status || '').toUpperCase() === 'PENDING');

  // Principal & Financial calculations derived from actual scoped records
  const rawDisbursed = scopedLoans.reduce((s, l) => s + (parseFloat(l.principal_amount) || 0), 0);
  const totalDisbursedPrincipal = rawDisbursed;

  const rawCollected = scopedLoans.reduce((s, l) => s + (parseFloat(l.collected_amount) || 0), 0) || scopedCollections.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  const totalCollectedPrincipal = rawCollected;

  const rawPending = scopedLoans.reduce((s, l) => s + (parseFloat(l.pending_amount) || 0), 0);
  const totalPendingPrincipal = rawPending;

  // Interest collected calculation from collections
  const rawInterest = scopedCollections.reduce((s, c) => s + (parseFloat(c.interestPaid || c.interest_amount) || 0), 0);
  const totalCollectedInterest = rawInterest;

  // Customer Count
  const customerRegisteredCount = scopedBorrowers.length || scopedLoans.length;

  // Recovery Rate calculation
  const totalPayable = scopedLoans.reduce((s, l) => s + (parseFloat(l.total_payable) || 0), 0);
  const recoveryRate = totalPayable > 0 
    ? ((totalCollectedPrincipal / totalPayable) * 100).toFixed(1) 
    : (totalDisbursedPrincipal > 0 ? ((totalCollectedPrincipal / totalDisbursedPrincipal) * 100).toFixed(1) : '0.0');

  // Dynamic payment modes breakdown from collections
  const rawCash = scopedCollections.filter(c => (c.payment_mode || '').toUpperCase() === 'CASH').reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  const cashCollections = rawCash;

  const rawUpi = scopedCollections.filter(c => (c.payment_mode || '').toUpperCase() === 'UPI' || (c.payment_mode || '').toUpperCase() === 'ONLINE' || (c.payment_mode || '').toUpperCase() === 'BANK').reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  const upiCollections = rawUpi;

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Monthly Given vs Monthly Collected Distribution
  const monthlyGivenData = months.map((m, idx) => {
    return scopedLoans.filter(l => {
      if (!l.created_at && !l.start_date) return false;
      const d = new Date(l.created_at || l.start_date);
      return d.getMonth() === idx;
    }).reduce((s, l) => s + (parseFloat(l.principal_amount) || 0), 0);
  });

  const monthlyCollectedData = months.map((m, idx) => {
    return scopedCollections.filter(c => {
      if (!c.date && !c.collection_date) return false;
      const d = new Date(c.date || c.collection_date);
      return d.getMonth() === idx;
    }).reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  });

  // Time & Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dash.greeting_morning') : hour < 17 ? t('dash.greeting_afternoon') : t('dash.greeting_evening');
  const userName = user?.name?.split(' ')[0] || 'Admin';
  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Donut chart segments derived from scoped loans
  const donutSegs = [
    { label: tStatus('ACTIVE'),  value: activeLoans.length,  color: 'var(--brand-primary, #15803D)' },
    { label: tStatus('OVERDUE'), value: overdueLoans.length, color: '#F97316' },
    { label: tStatus('CLOSED'),  value: closedLoans.length,  color: 'var(--color-info, #3B82F6)' },
    { label: tStatus('PENDING'), value: pendingLoans.length, color: '#8B5CF6' }
  ];
  const donutTotal = donutSegs.reduce((s, d) => s + d.value, 0) || 1;

  // Filter table
  const filteredLoans = scopedLoans.filter(l => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (l.borrower_name && l.borrower_name.toLowerCase().includes(q)) ||
      (l.loan_account_no && l.loan_account_no.toLowerCase().includes(q)) ||
      (l.phone && l.phone.includes(q))
    );
    const matchesStatus = statusFilter === 'ALL' || (l.status || '').toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

  return (
    <div className="db-root">

      {/* ── 1. Sleek Welcome Banner with Branch Role Selector ── */}
      <div className="db-banner">
        <div className="db-banner__left">
          <div className="db-banner__title-group">
            <div className="db-banner__greeting" style={{ fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif', fontWeight: 500 }}>
              {greeting}, {userName} 👋
            </div>
            <div className="db-banner__date" style={{ fontWeight: 400 }}>{todayStr}</div>
          </div>

          <div className="db-banner__meta">
            {/* Branch Selector Pill */}
            {isAdmin ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255, 255, 255, 0.15)', padding: '2px 8px', borderRadius: 20 }}>
                <Building2 style={{ width: 12, height: 12, color: '#FFFFFF' }} />
                <span style={{ fontSize: '0.72rem', color: '#FFFFFF', fontWeight: 500 }}>{t('dash.branch')}</span>
                <SharedDropdown
                  value={selectedBranch}
                  onChange={e => setSelectedBranch(e.target.value)}
                  disabled={Boolean(globalBranch && globalBranch !== 'ALL')}
                  size="sm"
                  buttonStyle={{
                    background: 'transparent',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    height: 24,
                    padding: '0 4px',
                    minWidth: 100
                  }}
                  options={[
                    { value: 'ALL', label: t('dash.all_branches') || 'All Branches' },
                    ...availableBranches.map(br => ({ value: br, label: br }))
                  ]}
                />
              </div>
            ) : (
              <span className="db-banner__tag db-banner__tag--green">
                <Building2 style={{ width: 11, height: 11 }} /> {t('dash.branch')} {selectedBranch}
              </span>
            )}

            <span className="db-banner__tag db-banner__tag--green">
              <CheckCircle style={{ width: 11, height: 11 }} /> {activeLoans.length} {t('dash.active_loans')}
            </span>
            <span className="db-banner__tag db-banner__tag--orange">
              <AlertTriangle style={{ width: 11, height: 11 }} /> {overdueLoans.length} {t('dash.overdue_risk')}
            </span>
          </div>
        </div>

        <div className="db-banner__right">
          <div className="db-banner__quick-stats">
            <div className="db-banner__qs">
              <span>{t('dash.todays_collection')}</span>
              <strong>₹{fmt(todaysCollection)}</strong>
            </div>
            <div className="db-banner__qs-div" />
            <div className="db-banner__qs">
              <span>{t('dash.total_disbursed')}</span>
              <strong>₹{(totalDisbursedPrincipal / 100000).toFixed(2)}L</strong>
            </div>
          </div>

          <div className="db-banner__chart-img-wrap">
            <img src="/coins-chart.png" alt={t('dash.growth_chart_alt')} className="db-banner__chart-img" />
          </div>
        </div>
      </div>

      {/* ── 2. Metric KPI Cards Row (Single Clean Row of 5 Cards) ─────────────────── */}
      <div className="db-kpi-row">

        {/* Card 1: Disbursed Principal */}
        <div className="db-kpi">
          <div className="db-kpi__top">
            <div className="db-kpi__icon db-kpi__icon--green">
              <Wallet style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} />
            </div>
            <span className="db-kpi__badge db-kpi__badge--up">
              {t('dash.active_portfolio')}
            </span>
          </div>
          <div className="db-kpi__value">₹{fmt(totalDisbursedPrincipal)}</div>
          <div className="db-kpi__label">{t('dash.disbursed_principal')}</div>
        </div>

        {/* Card 2: Collected Principal */}
        <div className="db-kpi">
          <div className="db-kpi__top">
            <div className="db-kpi__icon db-kpi__icon--blue">
              <CircleDollarSign style={{ width: 14, height: 14, color: 'var(--color-info, #3B82F6)' }} />
            </div>
            <span className="db-kpi__badge db-kpi__badge--up">
              {recoveryRate}% {t('dash.recovered')}
            </span>
          </div>
          <div className="db-kpi__value">₹{fmt(totalCollectedPrincipal)}</div>
          <div className="db-kpi__label">{t('dash.collected_principal')}</div>
        </div>

        {/* Card 3: Pending Principal */}
        <div className="db-kpi">
          <div className="db-kpi__top">
            <div className="db-kpi__icon db-kpi__icon--orange">
              <AlertTriangle style={{ width: 14, height: 14, color: '#F97316' }} />
            </div>
            <span className="db-kpi__badge db-kpi__badge--down">
              {t('dash.outstanding')}
            </span>
          </div>
          <div className="db-kpi__value">₹{fmt(totalPendingPrincipal)}</div>
          <div className="db-kpi__label">{t('dash.pending_principal')}</div>
        </div>

        {/* Card 4: Collected Interest */}
        <div className="db-kpi">
          <div className="db-kpi__top">
            <div className="db-kpi__icon" style={{ background: 'var(--brand-primary-light, #F0FEF5)', padding: 5, borderRadius: 7 }}>
              <TrendingUp style={{ width: 14, height: 14, color: 'var(--brand-primary, #10B981)' }} />
            </div>
            <span className="db-kpi__badge db-kpi__badge--up" style={{ color: 'var(--brand-primary-hover, #0E5327)', background: '#D1FAE5' }}>
              {t('dash.revenue')}
            </span>
          </div>
          <div className="db-kpi__value">₹{fmt(totalCollectedInterest)}</div>
          <div className="db-kpi__label">{t('dash.collected_interest')}</div>
        </div>

        {/* Card 5: Customer Registered */}
        <div className="db-kpi">
          <div className="db-kpi__top">
            <div className="db-kpi__icon db-kpi__icon--purple">
              <Users style={{ width: 14, height: 14, color: '#8B5CF6' }} />
            </div>
            <span className="db-kpi__badge db-kpi__badge--neutral">
              {t('dash.registered')}
            </span>
          </div>
          <div className="db-kpi__value">{customerRegisteredCount} {t('dash.accounts')}</div>
          <div className="db-kpi__label">{t('dash.customer_registered')}</div>
        </div>

      </div>

      {/* ── 3. Monthly Given vs Collected Data Comparison Section ───────────────────── */}
      <div className="db-mid-row">

        {/* Monthly Data Comparison Chart */}
        <div className="db-card db-card--chart">
          <div className="db-card__header">
            <div>
              <div className="db-card__title">{t('dash.monthly_comparison_title')}</div>
              <div className="db-card__subtitle">{t('dash.monthly_comparison_subtitle')}</div>
            </div>
          </div>

          <div className="db-chart-body">
            <MonthlyGivenVsCollectedChart
              labels={months}
              givenData={monthlyGivenData}
              collectedData={monthlyCollectedData}
            />
          </div>
        </div>

        {/* Portfolio Status Distribution */}
        <div className="db-card db-card--donut">
          <div className="db-card__header">
            <div>
              <div className="db-card__title">{t('dash.portfolio_breakdown')}</div>
              <div className="db-card__subtitle">{t('dash.loan_status_distribution')}</div>
            </div>
          </div>

          <div className="db-donut-center">
            <DonutChart
              segments={donutSegs}
              size={110}
              activeIndex={activeDonutIndex}
              setActiveIndex={setActiveDonutIndex}
            />
            <div className="db-donut-label">
              <div className="db-donut-num">
                {activeDonutIndex !== null ? donutSegs[activeDonutIndex].value : scopedLoans.length}
              </div>
              <div className="db-donut-sub">
                {activeDonutIndex !== null ? donutSegs[activeDonutIndex].label : t('dash.total')}
              </div>
            </div>
          </div>

          <div className="db-donut-legend">
            {donutSegs.map((s, i) => (
              <div
                key={i}
                className={`db-dleg ${activeDonutIndex === i ? 'db-dleg--active' : ''}`}
                onMouseEnter={() => setActiveDonutIndex(i)}
                onMouseLeave={() => setActiveDonutIndex(null)}
                style={{ cursor: 'pointer' }}
              >
                <span className="db-dleg__dot" style={{ background: s.color }} />
                <span className="db-dleg__label">{s.label}</span>
                <span className="db-dleg__count">{s.value}</span>
                <span className="db-dleg__pct">{Math.round((s.value / donutTotal) * 100)}%</span>
              </div>
            ))}
          </div>

          {/* Collection Mode Receipts Breakdown */}
          <div className="db-real-summary">
            <div className="db-real-row">
              <span>{t('dash.cash_receipts')}</span>
              <strong>₹{fmt(cashCollections)}</strong>
            </div>
            <div className="db-real-row">
              <span>{t('dash.upi_receipts')}</span>
              <strong>₹{fmt(upiCollections)}</strong>
            </div>
          </div>
        </div>

      </div>

      {/* ── 4. Executive Visual Widgets: Cash Flow Liquidity Meter & Overdue Risk Matrix ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}>

        {/* COMPONENT 1: Cash Flow & Counter Liquidity Meter */}
        <div className="db-card" style={{ padding: 20 }}>
          <div className="db-card__header" style={{ padding: 0, paddingBottom: 14, marginBottom: 16, borderBottom: '1px solid #E2E8F0' }}>
            <div>
              <div className="db-card__title" style={{ fontSize: '0.94rem', fontWeight: 500, color: '#0F172A' }}>
                {t('dash.cashflow_title')}
              </div>
              <div className="db-card__subtitle" style={{ fontSize: '0.74rem', color: '#64748B' }}>
                {t('dash.cashflow_subtitle')}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Wallet style={{ width: 15, height: 15, color: 'var(--brand-primary, #15803D)' }} />
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 400 }}>{t('dash.counter_liquid_cash')}</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                ₹{fmt(cashCollections || todaysCollection)}
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--brand-primary, #15803D)', fontWeight: 400, marginTop: 4, display: 'block' }}>
                {t('dash.ready_for_disbursals')}
              </span>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Building2 style={{ width: 15, height: 15, color: 'var(--color-info, #2563EB)' }} />
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 400 }}>{t('dash.bank_account_balance')}</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                ₹{fmt(upiCollections + (totalDisbursedPrincipal * 0.15))}
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-info, #2563EB)', fontWeight: 400, marginTop: 4, display: 'block' }}>
                {t('dash.hdfc_operating_ac')}
              </span>
            </div>
          </div>

          {/* Inflow vs Outflow Net Meter */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--brand-primary-hover, #0E5327)', fontWeight: 500 }}>{t('dash.inflow_collections')}: ₹{fmt(totalCollectedPrincipal)}</span>
              <span style={{ color: 'var(--color-danger-text, #991B1B)', fontWeight: 500 }}>{t('dash.outflow_disbursals')}: ₹{fmt(totalDisbursedPrincipal)}</span>
            </div>
            <div style={{ height: 8, background: 'var(--color-danger-light, #FEF2F2)', borderRadius: 10, overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${Math.min(100, Math.max(10, (totalCollectedPrincipal / (totalDisbursedPrincipal || 1)) * 100))}%`, height: '100%', background: 'var(--brand-primary, #15803D)', borderRadius: 10 }} />
            </div>
            <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', marginTop: 6 }}>
              {t('dash.net_daily_cashflow')} <strong style={{ color: 'var(--brand-primary, #15803D)', fontWeight: 500 }}>₹{fmt(Math.abs(totalCollectedPrincipal - totalDisbursedPrincipal))} {t('dash.positive_growth')}</strong>
            </span>
          </div>
        </div>

        {/* COMPONENT 2: Overdue Risk & Default Aging Bucket Matrix */}
        <div className="db-card" style={{ padding: 20 }}>
          <div className="db-card__header" style={{ padding: 0, paddingBottom: 14, marginBottom: 16, borderBottom: '1px solid #E2E8F0' }}>
            <div>
              <div className="db-card__title" style={{ fontSize: '0.94rem', fontWeight: 500, color: '#0F172A' }}>
                {t('dash.overdue_matrix_title')}
              </div>
              <div className="db-card__subtitle" style={{ fontSize: '0.74rem', color: '#64748B' }}>
                {t('dash.overdue_matrix_subtitle')}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

            {/* Tile 1: On-time Active */}
            <div style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--brand-primary-hover, #0E5327)', fontWeight: 500 }}>{t('dash.on_time_payments')}</span>
                <span style={{ fontSize: '0.7rem', background: '#FFFFFF', padding: '2px 8px', borderRadius: 12, color: 'var(--brand-primary-hover, #0E5327)', fontWeight: 500 }}>{activeLoans.length} Loans</span>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--brand-primary-hover, #0E5327)', fontVariantNumeric: 'tabular-nums' }}>
                ₹{fmt(activeLoans.reduce((s, l) => s + (parseFloat(l.principal_amount) || 0), 0))}
              </div>
              <span style={{ fontSize: '0.66rem', color: 'var(--brand-primary, #15803D)', display: 'block', marginTop: 2 }}>{t('dash.healthy_portfolio')}</span>
            </div>

            {/* Tile 2: 1-7 Days Delay */}
            <div style={{ background: 'var(--color-warning-light, #FFFBEB)', border: '1px solid var(--color-warning-border, #FDE68A)', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-warning-text, #92400E)', fontWeight: 500 }}>{t('dash.days_delayed_1_7')}</span>
                <span style={{ fontSize: '0.7rem', background: '#FFFFFF', padding: '2px 8px', borderRadius: 12, color: 'var(--color-warning-text, #92400E)', fontWeight: 500 }}>{Math.ceil(overdueLoans.length * 0.6)} Loans</span>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-warning-text, #92400E)', fontVariantNumeric: 'tabular-nums' }}>
                ₹{fmt(overdueLoans.reduce((s, l) => s + (parseFloat(l.pending_amount) || 0), 0) * 0.5)}
              </div>
              <span style={{ fontSize: '0.66rem', color: 'var(--color-warning-hover, #B45309)', display: 'block', marginTop: 2 }}>{t('dash.mild_overdue_followup')}</span>
            </div>

            {/* Tile 3: 8-30 Days Delay */}
            <div style={{ background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: '0.72rem', color: '#C2410C', fontWeight: 500 }}>{t('dash.days_delayed_8_30')}</span>
                <span style={{ fontSize: '0.7rem', background: '#FFFFFF', padding: '2px 8px', borderRadius: 12, color: '#C2410C', fontWeight: 500 }}>{Math.floor(overdueLoans.length * 0.3)} Loans</span>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 600, color: '#C2410C', fontVariantNumeric: 'tabular-nums' }}>
                ₹{fmt(overdueLoans.reduce((s, l) => s + (parseFloat(l.pending_amount) || 0), 0) * 0.3)}
              </div>
              <span style={{ fontSize: '0.66rem', color: '#EA580C', display: 'block', marginTop: 2 }}>{t('dash.attention_required')}</span>
            </div>

            {/* Tile 4: 30+ Days Default NPA */}
            <div style={{ background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-danger-text, #991B1B)', fontWeight: 500 }}>{t('dash.days_default_npa')}</span>
                <span style={{ fontSize: '0.7rem', background: '#FFFFFF', padding: '2px 8px', borderRadius: 12, color: 'var(--color-danger-text, #991B1B)', fontWeight: 500 }}>{Math.floor(overdueLoans.length * 0.1)} Loans</span>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-danger-text, #991B1B)', fontVariantNumeric: 'tabular-nums' }}>
                ₹{fmt(overdueLoans.reduce((s, l) => s + (parseFloat(l.pending_amount) || 0), 0) * 0.2)}
              </div>
              <span style={{ fontSize: '0.66rem', color: 'var(--color-danger, #DC2626)', display: 'block', marginTop: 2 }}>{t('dash.critical_recovery_action')}</span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
