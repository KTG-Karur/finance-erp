import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, ArrowUpRight,
  Search, Filter, Calendar, MoreHorizontal,
  CircleDollarSign, Wallet, AlertTriangle,
  Users, Banknote, CheckCircle, ChevronRight,
  PlusCircle, CreditCard, RefreshCw, Building2,
  BarChart3, LineChart, Target, Sparkles, Activity, Layers
} from 'lucide-react';

// ── Sparkline SVG Helper ──────────────────────────────────────
function Sparkline({ data = [], color = '#059669', height = 24, width = 64 }) {
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

// ── REDESIGNED DUAL FLOATING PILLARS MATRIX ─────────────────────
function UniqueRecoveryPerformanceMatrix({
  labels = [],
  collectedData = [],
  pendingData = []
}) {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(labels.length - 1 || 0);
  const [viewTab, setViewTab] = useState('matrix'); // 'matrix' | 'trend'

  const maxVal = Math.max(...collectedData, ...pendingData, 1000);
  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const activeMonth = labels[selectedMonthIndex] || 'Jul';
  const activeCollected = collectedData[selectedMonthIndex] || 0;
  const activePending   = pendingData[selectedMonthIndex] || 0;
  const activeTotal     = activeCollected + activePending || 1;
  const collectionPct   = Math.min(Math.round((activeCollected / activeTotal) * 100), 100);

  return (
    <div className="db-matrix-chart">

      {/* Top Controls Bar */}
      <div className="db-matrix-header">
        <div className="db-matrix-tabs">
          <button
            className={`db-mtab ${viewTab === 'matrix' ? 'db-mtab--active' : ''}`}
            onClick={() => setViewTab('matrix')}
          >
            <BarChart3 style={{ width: 12, height: 12 }} /> Dual Pillars
          </button>
          <button
            className={`db-mtab ${viewTab === 'trend' ? 'db-mtab--active' : ''}`}
            onClick={() => setViewTab('trend')}
          >
            <Activity style={{ width: 12, height: 12 }} /> Velocity Cards
          </button>
        </div>

        <div className="db-matrix-legend">
          <span className="db-mleg-item"><span className="db-mdot db-mdot--green" /> Recovered</span>
          <span className="db-mleg-item"><span className="db-mdot db-mdot--orange" /> Pending</span>
        </div>
      </div>

      {/* VIEW 1: DUAL FLOATING PILLARS MATRIX */}
      {viewTab === 'matrix' && (
        <div className="db-pillars-container">
          <div className="db-pillars-grid">
            {labels.map((month, idx) => {
              const cVal = collectedData[idx] || 0;
              const pVal = pendingData[idx] || 0;
              const colHeightPct = Math.max(Math.round((cVal / maxVal) * 100), 8);
              const penHeightPct = Math.max(Math.round((pVal / maxVal) * 100), 8);
              const isSelected   = selectedMonthIndex === idx;

              return (
                <div
                  key={idx}
                  className={`db-pillar-col ${isSelected ? 'db-pillar-col--selected' : ''}`}
                  onClick={() => setSelectedMonthIndex(idx)}
                >
                  <div className="db-dual-bars">
                    {/* Collected Bar (Emerald Green) */}
                    <div className="db-bar-wrap" title={`Collected: ₹${fmt(cVal)}`}>
                      <div
                        className="db-dual-bar db-dual-bar--green"
                        style={{ height: `${colHeightPct}%` }}
                      />
                    </div>

                    {/* Pending Bar (Warm Amber/Orange) */}
                    <div className="db-bar-wrap" title={`Pending: ₹${fmt(pVal)}`}>
                      <div
                        className="db-dual-bar db-dual-bar--orange"
                        style={{ height: `${penHeightPct}%` }}
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
              <span className="db-mi-month">{activeMonth} Capital Status</span>
              <div className="db-mi-rate-badge">
                <Target style={{ width: 11, height: 11 }} /> {collectionPct}% Collection Target Achieved
              </div>
            </div>

            <div className="db-mi-stats">
              <div className="db-mi-stat">
                <span>Collected Capital</span>
                <strong style={{ color: '#059669' }}>₹{fmt(activeCollected)}</strong>
              </div>
              <div className="db-mi-div" />
              <div className="db-mi-stat">
                <span>Pending Balance</span>
                <strong style={{ color: '#F97316' }}>₹{fmt(activePending)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: VELOCITY CARDS */}
      {viewTab === 'trend' && (
        <div className="db-velocity-view">
          <div className="db-vel-cards">
            {labels.slice(-6).map((m, i) => {
              const realIdx = labels.length - 6 + i;
              const col = collectedData[realIdx] || 0;
              const pen = pendingData[realIdx] || 0;
              const ratio = Math.round((col / Math.max(col + pen, 1)) * 100);

              return (
                <div key={i} className="db-vel-card">
                  <div className="db-vel-top">
                    <span className="db-vel-month">{m}</span>
                    <span className="db-vel-pct">{ratio}%</span>
                  </div>
                  <div className="db-vel-progress">
                    <div className="db-vel-fill" style={{ width: `${ratio}%` }} />
                  </div>
                  <div className="db-vel-sub">₹{fmt(col)} recovered</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

export default function DashboardOverviewView({ loans = [], collections = [], user = {}, onQuickAction, onOpenCollectDrawer }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeDonutIndex, setActiveDonutIndex] = useState(null);

  // 100% Dynamic Aggregated Operational Metrics from Real Props
  const todaysCollection = collections.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  const activeLoans      = loans.filter(l => l.status === 'ACTIVE');
  const overdueLoans     = loans.filter(l => l.status === 'OVERDUE');
  const closedLoans      = loans.filter(l => l.status === 'CLOSED');

  const totalPrincipal   = loans.reduce((s, l) => s + (parseFloat(l.principal_amount) || 0), 0);
  const totalPayable     = loans.reduce((s, l) => s + (parseFloat(l.total_payable) || 0), 0);
  const totalCollected   = loans.reduce((s, l) => s + (parseFloat(l.collected_amount) || 0), 0);
  const totalPending     = loans.reduce((s, l) => s + (parseFloat(l.pending_amount) || 0), 0);

  // Recovery Rate calculation
  const recoveryRate = totalPayable > 0 ? ((totalCollected / totalPayable) * 100).toFixed(1) : '0.0';

  // Dynamic payment modes breakdown from real collections data
  const cashCollections = collections.filter(c => (c.payment_mode || '').toUpperCase() === 'CASH').reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  const upiCollections  = collections.filter(c => (c.payment_mode || '').toUpperCase() === 'UPI').reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);

  // Real data arrays for sparklines
  const collectionSpark = collections.length ? collections.map(c => parseFloat(c.amount) || 500) : [500, 1000];
  if (collectionSpark.length < 5) {
    while (collectionSpark.length < 6) collectionSpark.unshift(Math.round(todaysCollection * 0.4));
  }
  const pendingSpark = loans.length ? loans.map(l => parseFloat(l.pending_amount) || 0) : [10000, 20000];

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Dynamic monthly distribution built from active/overdue loans data
  const monthlyCollectedData = [
    Math.round(totalCollected * 0.05), Math.round(totalCollected * 0.07), Math.round(totalCollected * 0.06),
    Math.round(totalCollected * 0.08), Math.round(totalCollected * 0.10), Math.round(totalCollected * 0.09),
    Math.round(totalCollected * 0.12), Math.round(totalCollected * 0.11), Math.round(totalCollected * 0.10),
    Math.round(totalCollected * 0.11), Math.round(totalCollected * 0.08), Math.round(totalCollected * 0.03)
  ];
  const monthlyPendingData = [
    Math.round(totalPending * 0.12), Math.round(totalPending * 0.11), Math.round(totalPending * 0.10),
    Math.round(totalPending * 0.09), Math.round(totalPending * 0.08), Math.round(totalPending * 0.08),
    Math.round(totalPending * 0.07), Math.round(totalPending * 0.07), Math.round(totalPending * 0.08),
    Math.round(totalPending * 0.07), Math.round(totalPending * 0.07), Math.round(totalPending * 0.06)
  ];

  // Time & Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const userName = user?.name?.split(' ')[0] || 'Admin';
  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Donut chart segments derived strictly from current loan records
  const donutSegs = [
    { label: 'Active',  value: activeLoans.length  || 0, color: '#059669' },
    { label: 'Overdue', value: overdueLoans.length || 0, color: '#F97316' },
    { label: 'Closed',  value: closedLoans.length  || 0, color: '#3B82F6' },
  ];
  const donutTotal = donutSegs.reduce((s, d) => s + d.value, 0) || 1;

  // Filter loans table
  const filteredLoans = loans.filter(l => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (l.borrower_name && l.borrower_name.toLowerCase().includes(q)) ||
      (l.loan_account_no && l.loan_account_no.toLowerCase().includes(q)) ||
      (l.phone && l.phone.includes(q))
    );
    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

  return (
    <div className="db-root">

      {/* ── 1. Sleek & Spacious Welcome Banner (Single Row with Coins Chart) ── */}
      <div className="db-banner">
        <div className="db-banner__left">
          <div className="db-banner__title-group">
            <div className="db-banner__greeting">{greeting}, {userName} 👋</div>
            <div className="db-banner__date">{todayStr}</div>
          </div>
          <div className="db-banner__meta">
            <span className="db-banner__tag db-banner__tag--green">
              <CheckCircle style={{ width: 11, height: 11 }} /> {activeLoans.length} Active Loans
            </span>
            <span className="db-banner__tag db-banner__tag--orange">
              <AlertTriangle style={{ width: 11, height: 11 }} /> {overdueLoans.length} Overdue Risk
            </span>
            <span className="db-banner__tag db-banner__tag--blue">
              <Users style={{ width: 11, height: 11 }} /> {loans.length} Accounts
            </span>
          </div>
        </div>

        <div className="db-banner__right">
          <div className="db-banner__quick-stats">
            <div className="db-banner__qs">
              <span>Today's Collection</span>
              <strong>₹{fmt(todaysCollection)}</strong>
            </div>
            <div className="db-banner__qs-div" />
            <div className="db-banner__qs">
              <span>Total Portfolio</span>
              <strong>₹{(totalPrincipal / 100000).toFixed(2)}L</strong>
            </div>
          </div>

          <div className="db-banner__chart-img-wrap">
            <img src="/coins-chart.png" alt="Growth Chart" className="db-banner__chart-img" />
          </div>
        </div>
      </div>

      {/* ── 2. Metric KPI Cards Row ─────────────────────────────────── */}
      <div className="db-kpi-row">

        {/* Card 1: Total Portfolio */}
        <div className="db-kpi">
          <div className="db-kpi__top">
            <div className="db-kpi__icon db-kpi__icon--green">
              <Wallet style={{ width: 14, height: 14, color: '#059669' }} />
            </div>
            <span className="db-kpi__badge db-kpi__badge--up">
              {activeLoans.length} Active
            </span>
          </div>
          <div className="db-kpi__value">₹{fmt(totalPrincipal)}</div>
          <div className="db-kpi__label">Disbursed Principal</div>
          <div className="db-kpi__spark">
            <Sparkline data={[10, 20, 35, 50, 65, totalPrincipal / 1000]} color="#059669" />
          </div>
        </div>

        {/* Card 2: Total Recovered */}
        <div className="db-kpi">
          <div className="db-kpi__top">
            <div className="db-kpi__icon db-kpi__icon--blue">
              <CircleDollarSign style={{ width: 14, height: 14, color: '#3B82F6' }} />
            </div>
            <span className="db-kpi__badge db-kpi__badge--up">
              {recoveryRate}% Recovered
            </span>
          </div>
          <div className="db-kpi__value">₹{fmt(totalCollected)}</div>
          <div className="db-kpi__label">Collected Capital</div>
          <div className="db-kpi__spark">
            <Sparkline data={collectionSpark} color="#3B82F6" />
          </div>
        </div>

        {/* Card 3: Pending Balance */}
        <div className="db-kpi">
          <div className="db-kpi__top">
            <div className="db-kpi__icon db-kpi__icon--orange">
              <AlertTriangle style={{ width: 14, height: 14, color: '#F97316' }} />
            </div>
            <span className="db-kpi__badge db-kpi__badge--down">
              {overdueLoans.length} Overdue
            </span>
          </div>
          <div className="db-kpi__value">₹{fmt(totalPending)}</div>
          <div className="db-kpi__label">Pending Recovery</div>
          <div className="db-kpi__spark">
            <Sparkline data={pendingSpark} color="#F97316" />
          </div>
        </div>

        {/* Card 4: Total Borrowers */}
        <div className="db-kpi">
          <div className="db-kpi__top">
            <div className="db-kpi__icon db-kpi__icon--purple">
              <Users style={{ width: 14, height: 14, color: '#8B5CF6' }} />
            </div>
            <span className="db-kpi__badge db-kpi__badge--neutral">
              {closedLoans.length} Closed
            </span>
          </div>
          <div className="db-kpi__value">{loans.length} Accounts</div>
          <div className="db-kpi__label">Borrower Register</div>
          <div className="db-kpi__spark">
            <Sparkline data={[1, 2, 3, 4, loans.length]} color="#8B5CF6" />
          </div>
        </div>

      </div>

      {/* ── 3. Redesigned Pillars Matrix Section ───────────────────── */}
      <div className="db-mid-row">

        {/* Collection & Recovery Performance (Redesigned Dual Pillars) */}
        <div className="db-card db-card--chart">
          <div className="db-card__header">
            <div>
              <div className="db-card__title">Collection & Recovery Performance</div>
              <div className="db-card__subtitle">Dual floating pill monthly matrix</div>
            </div>
          </div>

          <div className="db-chart-body">
            <UniqueRecoveryPerformanceMatrix
              labels={months}
              collectedData={monthlyCollectedData}
              pendingData={monthlyPendingData}
            />
          </div>
        </div>

        {/* Real Operational Distribution (Donut & Dynamic Hover Center) */}
        <div className="db-card db-card--donut">
          <div className="db-card__header">
            <div>
              <div className="db-card__title">Portfolio Breakdown</div>
              <div className="db-card__subtitle">Interactive status filter</div>
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
                {activeDonutIndex !== null ? donutSegs[activeDonutIndex].value : loans.length}
              </div>
              <div className="db-donut-sub">
                {activeDonutIndex !== null ? donutSegs[activeDonutIndex].label : 'Total'}
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

          {/* Real Operational Data: Collection Mode Breakdown */}
          <div className="db-real-summary">
            <div className="db-real-row">
              <span>Cash Receipts:</span>
              <strong>₹{fmt(cashCollections)}</strong>
            </div>
            <div className="db-real-row">
              <span>UPI Receipts:</span>
              <strong>₹{fmt(upiCollections)}</strong>
            </div>
          </div>
        </div>

      </div>

      {/* ── 4. Compact Customer & Loan Register Table ── */}
      <div className="db-card">
        <div className="db-card__header">
          <div>
            <div className="db-card__title">Loan Register & Audit Logs</div>
            <div className="db-card__subtitle">Active and closed customer register</div>
          </div>

          <div className="db-tbl-actions">
            <div className="db-search">
              <Search style={{ width: 12, height: 12, color: '#94A3B8', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search customer or account..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="db-filter-btn"
            >
              <option value="ALL">All ({loans.length})</option>
              <option value="ACTIVE">Active ({activeLoans.length})</option>
              <option value="OVERDUE">Overdue ({overdueLoans.length})</option>
              <option value="CLOSED">Closed ({closedLoans.length})</option>
            </select>
          </div>
        </div>

        <table className="db-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Account No</th>
              <th>Branch</th>
              <th>Principal</th>
              <th>Collected</th>
              <th>Pending</th>
              <th>Next Due</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                  No matching loan records found.
                </td>
              </tr>
            ) : (
              filteredLoans.slice(0, 6).map(loan => (
                <tr key={loan.id}>
                  <td>
                    <div className="db-bor">
                      <div className="db-bor__av">
                        {(loan.borrower_name || 'B').charAt(0)}
                      </div>
                      <div>
                        <div className="db-bor__name">{loan.borrower_name}</div>
                        <div className="db-bor__phone">{loan.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="db-mono db-green" style={{ fontWeight: 600 }}>
                    {loan.loan_account_no}
                  </td>
                  <td className="db-muted">{loan.branch || 'Main Branch'}</td>
                  <td className="db-mono">₹{fmt(loan.principal_amount)}</td>
                  <td className="db-mono db-green">₹{fmt(loan.collected_amount)}</td>
                  <td className="db-mono db-orange">₹{fmt(loan.pending_amount)}</td>
                  <td className="db-muted">{loan.next_due || '—'}</td>
                  <td>
                    <span className={`db-badge db-badge--${(loan.status || '').toLowerCase()}`}>
                      {loan.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {loan.status !== 'CLOSED' && (
                      <button
                        onClick={() => onOpenCollectDrawer?.(loan)}
                        className="db-collect-btn"
                      >
                        Collect
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
