import React from 'react';
import { 
  DollarSign, TrendingUp, ArrowDownLeft, Clock, AlertTriangle,
  Users, CheckCircle, FileText, CreditCard, PieChart, Calendar, MinusCircle
} from 'lucide-react';

const WIDGETS = [
  { label: "Today's Collection",  icon: TrendingUp,   key:'todaysCollection', def:28500, fmt:true,  prefix:'₹', accent:'#10B981', bg:'#ECFDF5', color:'#047857' },
  { label: "Today's Interest",    icon: DollarSign,   key:'todaysInterest',   def:4200,  fmt:true,  prefix:'₹', accent:'#3B82F6', bg:'#EFF6FF', color:'#1D4ED8' },
  { label: "Today's Principal",   icon: ArrowDownLeft,key:'todaysPrincipal',  def:24300, fmt:true,  prefix:'₹', accent:'#06B6D4', bg:'#ECFEFF', color:'#0E7490' },
  { label: "Cash in Hand",        icon: CreditCard,   key:'todaysCash',       def:45800, fmt:true,  prefix:'₹', accent:'#14B8A6', bg:'#F0FDFA', color:'#0F766E' },
  { label: "New Loans Today",     icon: Calendar,     key:'todaysNewLoans',   def:3,     suffix:' Loans', subKey:'todaysNewLoansVal', subDef:150000, accent:'#6366F1', bg:'#EEF2FF', color:'#4338CA' },
  { label: "Overdue Loans",       icon: AlertTriangle,key:'overdueLoans',     def:8,     suffix:' Accounts', subKey:'overdueAmount', subDef:94000, accent:'#EF4444', bg:'#FEF2F2', color:'#B91C1C' },
  { label: "Active Loans",        icon: PieChart,     key:'activeLoans',      def:142,   suffix:' Accounts', subKey:'activeVolume', subDef:2850000, accent:'#3B82F6', bg:'#EFF6FF', color:'#1D4ED8' },
  { label: "Closed Loans",        icon: CheckCircle,  key:'closedLoans',      def:64,    suffix:' Accounts', accent:'#6B7280', bg:'#F9FAFB', color:'#374151' },
  { label: "Total Customers",     icon: Users,        key:'totalBorrowers',   def:186,   suffix:' Active', accent:'#A855F7', bg:'#FAF5FF', color:'#7E22CE' },
  { label: "Pending Approvals",   icon: Clock,        key:'pendingApprovals', def:4,     suffix:' Files', accent:'#F59E0B', bg:'#FFFBEB', color:'#92400E' },
  { label: "Late Collections",    icon: FileText,     key:'lateCollections',  def:5,     suffix:' Receipts', accent:'#F97316', bg:'#FFF7ED', color:'#C2410C' },
  { label: "Today's Expenses",    icon: MinusCircle,  key:'todaysExpenses',   def:1250,  fmt:true, prefix:'₹', accent:'#EF4444', bg:'#FEF2F2', color:'#B91C1C' },
];

function fmt(val) { return Number(val).toLocaleString('en-IN'); }

export default function KPIDashboardWidgets({ metrics = {} }) {
  return (
    <div className="kpi-grid">
      {WIDGETS.map(({ label, icon: Icon, key, def, fmt: doFmt, prefix='', suffix='', subKey, subDef, accent, bg, color }) => {
        const rawVal = metrics[key] ?? def;
        const mainVal = doFmt ? `${prefix}${fmt(rawVal)}` : `${prefix}${rawVal}${suffix}`;
        const subVal  = subKey ? `₹${fmt(metrics[subKey] ?? subDef)}` : null;

        return (
          <div
            key={label}
            className="kpi-card"
            style={{ '--kpi-accent': accent }}
          >
            <div className="kpi-card__top">
              <span className="kpi-card__label">{label}</span>
              <div className="kpi-card__icon" style={{ background: bg }}>
                <Icon style={{ width: 20, height: 20, color }} />
              </div>
            </div>
            <div>
              <div className="kpi-card__value">{mainVal}</div>
              {subVal && <div className="kpi-card__sub">{subVal}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
