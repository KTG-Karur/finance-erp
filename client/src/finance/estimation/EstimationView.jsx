import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Percent,
  Calendar,
  Banknote,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Printer,
  Send,
  Download,
  Info,
  Layers,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Sliders,
  DollarSign,
  Plus,
  X,
  BookmarkPlus,
  Check
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import {
  generateEmiSchedule,
  resolveSchemeRepaymentMethod,
  resolveSchemeInterestCalculation
} from '../../utils/loanCalculations';
import PrintableEstimationSheet from './PrintableEstimationSheet';
import { useLanguage } from '../../i18n/LanguageContext';
import SharedDropdown from '../../components/common/SharedDropdown';
import SharedDatePicker from '../../components/common/SharedDatePicker';

export default function EstimationView({
  loanSchemes = [],
  tenant,
  onCreateLoanScheme,
  onApplyLoan
}) {
  const { t } = useLanguage();
  const activeSchemes = loanSchemes.filter(s => s.is_active !== false);

  // Core Form Controls State
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [principal, setPrincipal] = useState(100000);
  const [tenureUnit, setTenureUnit] = useState('DAYS');         // 'DAYS' | 'MONTHS'
  const [tenureValue, setTenureValue] = useState(30);           // e.g. 30 Days or 12 Months
  const [tenureMonths, setTenureMonths] = useState(1);
  const [repaymentFrequency, setRepaymentFrequency] = useState('MONTHLY');
  const [monthlyInterestRate, setMonthlyInterestRate] = useState(24.0);
  const [interestMode, setInterestMode] = useState('RULE_BASED'); // 'RULE_BASED' | 'PERCENTAGE'
  const [ruleAmount, setRuleAmount] = useState(100000);          // e.g. For ₹1,00,000
  const [ruleDays, setRuleDays] = useState(30);                  // e.g. For 30 Days
  const [ruleInterest, setRuleInterest] = useState(24000);       // e.g. ₹24,000 Interest

  const [repaymentMethod, setRepaymentMethod] = useState('EMI');
  const [interestCalculation, setInterestCalculation] = useState('CONSTANT_FLAT');
  const [processingFeeType, setProcessingFeeType] = useState('AMOUNT'); // 'AMOUNT' | 'PERCENT'
  const [processingFeeValue, setProcessingFeeValue] = useState(0);      // default 0
  const [advanceEmiCount, setAdvanceEmiCount] = useState(0);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Table pagination & search
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Save as Scheme Modal state
  const [showSaveSchemeModal, setShowSaveSchemeModal] = useState(false);
  const [schemeFormName, setSchemeFormName] = useState('');
  const [schemeSaving, setSchemeSaving] = useState(false);
  const [schemeFeedbackMsg, setSchemeFeedbackMsg] = useState(null);

  // Derived effective monthly interest rate
  const calculatedRuleMonthlyRate = useMemo(() => {
    const amt = parseFloat(ruleAmount) || 0;
    const days = parseFloat(ruleDays) || 0;
    const interest = parseFloat(ruleInterest) || 0;
    if (amt <= 0 || days <= 0) return 0;
    return Number(((interest / (amt * days)) * 30 * 100).toFixed(4));
  }, [ruleAmount, ruleDays, ruleInterest]);

  const effectiveMonthlyRate = interestMode === 'RULE_BASED' ? calculatedRuleMonthlyRate : (parseFloat(monthlyInterestRate) || 0);

  // Printable Sheet Modal state
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Save Scheme from current Estimate
  const handleSaveScheme = async (e) => {
    e.preventDefault();
    if (!onCreateLoanScheme || schemeSaving) return;
    if (!schemeFormName.trim()) return;

    setSchemeSaving(true);
    setSchemeFeedbackMsg(null);
    try {
      const payload = {
        name: schemeFormName.trim(),
        unit_base: interestMode === 'RULE_BASED' ? Number(ruleAmount || 100) : 100,
        rate_per_unit: effectiveMonthlyRate,
        formula_type: 'STANDARD',
        repayment_method: repaymentMethod,
        interest_calculation: interestCalculation,
        repayment_frequency: repaymentFrequency,
        interest_basis: 'MONTHLY',
        min_amount: Math.round(principal * 0.5),
        max_amount: Math.round(principal * 2),
        min_tenure_months: 1,
        max_tenure_months: Math.max(1, Math.round(tenureMonths)),
        processing_fee_percent: processingFeeType === 'PERCENT'
          ? (Number(processingFeeValue) || 0)
          : (principal > 0 ? Number(((Number(processingFeeValue || 0) / principal) * 100).toFixed(2)) : 0),
        is_active: true
      };

      const created = await onCreateLoanScheme(payload);
      if (created) {
        setSelectedSchemeId(created.id);
        setSchemeFeedbackMsg({ type: 'success', text: `Scheme "${created.name}" created successfully!` });
        setTimeout(() => {
          setShowSaveSchemeModal(false);
          setSchemeFeedbackMsg(null);
        }, 1200);
      }
    } catch (err) {
      setSchemeFeedbackMsg({ type: 'error', text: err?.response?.data?.message || err?.message || 'Failed to save scheme' });
    } finally {
      setSchemeSaving(false);
    }
  };

  // Scheme Change handler
  const handleSchemeSelect = (schemeId) => {
    setSelectedSchemeId(schemeId);
    const scheme = activeSchemes.find(s => String(s.id) === String(schemeId));
    if (scheme) {
      if (scheme.min_amount) setPrincipal(Number(scheme.min_amount));
      if (scheme.max_tenure_months) {
        const m = Number(scheme.max_tenure_months);
        setTenureMonths(m);
        setTenureUnit('MONTHS');
        setTenureValue(m);
      }
      if (scheme.rate_per_unit != null) {
        const r = Number(scheme.rate_per_unit);
        setMonthlyInterestRate(r);
        setRuleAmount(100);
        setRuleDays(30);
        setRuleInterest(r);
      }
      if (scheme.repayment_frequency) setRepaymentFrequency(scheme.repayment_frequency);
      
      const resolvedMethod = resolveSchemeRepaymentMethod(scheme);
      const resolvedCalc = resolveSchemeInterestCalculation(scheme);
      setRepaymentMethod(resolvedMethod);
      setInterestCalculation(resolvedCalc);

      if (scheme.processing_fee_percent != null) {
        setProcessingFeeType('PERCENT');
        setProcessingFeeValue(Number(scheme.processing_fee_percent));
      } else {
        setProcessingFeeType('AMOUNT');
        setProcessingFeeValue(0);
      }
    }
  };

  // Reset to default parameters
  const handleReset = () => {
    setSelectedSchemeId('');
    setPrincipal(100000);
    setTenureUnit('DAYS');
    setTenureValue(30);
    setTenureMonths(1);
    setRepaymentFrequency('MONTHLY');
    setMonthlyInterestRate(24.0);
    setInterestMode('RULE_BASED');
    setRuleAmount(100000);
    setRuleDays(30);
    setRuleInterest(24000);
    setRepaymentMethod('EMI');
    setInterestCalculation('CONSTANT_FLAT');
    setProcessingFeeType('AMOUNT');
    setProcessingFeeValue(0);
    setAdvanceEmiCount(0);
  };

  // Calculation Engine
  const estimateResult = useMemo(() => {
    const P = parseFloat(principal) || 0;
    const rate = effectiveMonthlyRate;
    const exactTotalDays = tenureUnit === 'DAYS'
      ? Math.max(1, Number(tenureValue || 1))
      : Math.max(1, Math.round(Number(tenureMonths || 1) * 30));
    const months = exactTotalDays / 30;
    const feeVal = parseFloat(processingFeeValue) || 0;
    const advCount = parseInt(advanceEmiCount, 10) || 0;

    const processingFee = processingFeeType === 'AMOUNT'
      ? Math.round(feeVal)
      : Math.round(P * (feeVal / 100));

    const processingFeePercent = processingFeeType === 'PERCENT'
      ? feeVal
      : (P > 0 ? Number(((processingFee / P) * 100).toFixed(2)) : 0);

    let schedule = [];
    if (repaymentMethod === 'EMI') {
      schedule = generateEmiSchedule({
        principal: P,
        monthlyInterestRate: rate,
        tenureMonths: months,
        tenureDays: exactTotalDays,
        repaymentFrequency,
        interestCalculation,
        startDate
      });
    } else {
      // Interest Only
      const totalDays = exactTotalDays;
      const totalInterestAmount = Math.round(P * (rate / 100 / 30) * totalDays);
      const periodsCount = repaymentFrequency === 'WEEKLY' ? Math.ceil(totalDays / 7) : repaymentFrequency === 'MONTHLY' ? Math.ceil(totalDays / 30) : totalDays;
      const interestPerPeriod = Math.round(totalInterestAmount / periodsCount);
      const periodDays = repaymentFrequency === 'WEEKLY' ? 7 : repaymentFrequency === 'MONTHLY' ? 30 : 1;
      const base = startDate ? new Date(startDate) : new Date();

      for (let i = 1; i <= periodsCount; i++) {
        const dueDate = new Date(base);
        dueDate.setDate(dueDate.getDate() + i * periodDays);
        const isLast = i === periodsCount;
        const pPortion = isLast ? P : 0;
        schedule.push({
          period: i,
          due_date: dueDate.toISOString().slice(0, 10),
          principal: pPortion,
          interest: interestPerPeriod,
          emi: pPortion + interestPerPeriod,
          principal_paid: 0,
          interest_paid: 0
        });
      }
    }

    const totalInterest = schedule.reduce((sum, r) => sum + (r.interest || 0), 0);
    const totalPayable = P + totalInterest;
    const installmentAmount = schedule.length > 0 ? schedule[0].emi : 0;

    let advanceEmiAmount = 0;
    if (advCount > 0 && schedule.length > 0) {
      advanceEmiAmount = schedule.slice(0, advCount).reduce((sum, r) => sum + r.emi, 0);
    }

    const totalDeductions = processingFee + advanceEmiAmount;
    const netDisbursed = Math.max(0, P - totalDeductions);
    const effectiveApr = P > 0 ? (((totalInterest + processingFee) / P) / (months / 12) * 100).toFixed(2) : '0.00';

    // Build Payoff Chart trajectory data
    let runningBalance = P;
    const trajectoryData = schedule.map((row) => {
      runningBalance = Math.max(0, runningBalance - row.principal);
      return {
        period: `P${row.period}`,
        balance: runningBalance,
        installment: row.emi,
        principal: row.principal,
        interest: row.interest
      };
    });

    const selectedSchemeObj = activeSchemes.find(s => String(s.id) === String(selectedSchemeId));

    return {
      schemeId: selectedSchemeId,
      schemeName: selectedSchemeObj ? (selectedSchemeObj.name || selectedSchemeObj.scheme_name) : 'Custom Scheme',
      principal: P,
      monthlyRate: rate,
      tenureMonths: months,
      repaymentFrequency,
      repaymentMethod,
      interestCalculation,
      processingFee,
      advanceEmiAmount,
      totalDeductions,
      netDisbursed,
      totalInterest,
      totalPayable,
      installmentAmount,
      effectiveApr,
      schedule,
      trajectoryData
    };
  }, [
    principal,
    monthlyInterestRate,
    tenureMonths,
    tenureUnit,
    tenureValue,
    interestMode,
    ruleAmount,
    ruleDays,
    ruleInterest,
    repaymentFrequency,
    repaymentMethod,
    interestCalculation,
    processingFeeType,
    processingFeeValue,
    advanceEmiCount,
    startDate,
    selectedSchemeId,
    activeSchemes
  ]);

  // Donut Chart Data
  const pieData = [
    { name: 'Net Disbursed', value: estimateResult.netDisbursed, color: 'var(--brand-primary, #15803D)' },
    { name: 'Total Interest', value: estimateResult.totalInterest, color: '#D97706' },
    { name: 'Processing Fee', value: estimateResult.processingFee, color: '#DC2626' }
  ].filter(d => d.value > 0);

  // Filtered & Paginated Schedule
  const filteredSchedule = useMemo(() => {
    if (!searchTerm.trim()) return estimateResult.schedule;
    const q = searchTerm.toLowerCase();
    return estimateResult.schedule.filter(r => 
      String(r.period).includes(q) || (r.due_date && r.due_date.includes(q))
    );
  }, [estimateResult.schedule, searchTerm]);

  const totalPages = Math.ceil(filteredSchedule.length / pageSize) || 1;
  const paginatedSchedule = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSchedule.slice(start, start + pageSize);
  }, [filteredSchedule, currentPage, pageSize]);

  // Export Schedule as CSV
  const handleExportCSV = () => {
    const headers = ['Period', 'Due Date', 'Principal (INR)', 'Interest (INR)', 'Total Installment (INR)', 'Principal Balance (INR)'];
    const rows = estimateResult.schedule.map(r => [
      r.period,
      r.due_date,
      r.principal,
      r.interest,
      r.emi,
      r.balance != null ? r.balance : 0
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Loan_Estimation_Schedule_EST-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="estimation-page">

      {/* ── Top Header ── */}
      <div className="estimation-page__header">
        <div className="estimation-page__header-left">
          <div className="estimation-page__header-icon-badge">
            <Calculator style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 className="estimation-page__header-title">Loan Estimator & Quotation Generator</h1>
            <p className="estimation-page__header-subtitle">
              Interactive financial terms calculator, amortization schedule preview, net disbursement analysis, and printable quote slips.
            </p>
          </div>
        </div>

        <div className="estimation-page__header-actions">
          <button 
            type="button" 
            className="estimation-page__btn estimation-page__btn--secondary"
            onClick={handleReset}
            title="Reset parameters"
          >
            <RotateCcw style={{ width: 14, height: 14 }} /> Reset
          </button>
          <button 
            type="button" 
            className="estimation-page__btn estimation-page__btn--secondary"
            onClick={() => setShowPrintModal(true)}
          >
            <Printer style={{ width: 14, height: 14 }} /> Print Quotation Slip
          </button>
          {onCreateLoanScheme && (
            <button 
              type="button" 
              className="estimation-page__btn estimation-page__btn--secondary"
              onClick={() => {
                const defName = `${repaymentFrequency === 'DAILY' ? 'Daily' : repaymentFrequency === 'WEEKLY' ? 'Weekly' : 'Monthly'} ${tenureUnit === 'DAYS' ? `${tenureValue}D` : `${tenureValue}M`} (${effectiveMonthlyRate.toFixed(1)}% p.m.)`;
                setSchemeFormName(defName);
                setSchemeFeedbackMsg(null);
                setShowSaveSchemeModal(true);
              }}
              style={{ borderColor: 'var(--brand-primary, #15803D)', color: 'var(--brand-primary, #15803D)', fontWeight: 600 }}
              title="Save current calculated terms as a re-usable loan scheme"
            >
              <BookmarkPlus style={{ width: 14, height: 14 }} /> Save as Scheme
            </button>
          )}
          {onApplyLoan && (
            <button 
              type="button" 
              className="estimation-page__btn estimation-page__btn--primary"
              onClick={() => onApplyLoan(estimateResult)}
            >
              <Send style={{ width: 14, height: 14 }} /> Apply For Loan
            </button>
          )}
        </div>
      </div>

      {/* ── Main 2-Column Grid Layout ── */}
      <div className="estimation-page__grid">

        {/* Left Column: Calculator Controls */}
        <div className="estimation-page__panel">
          <h2 className="estimation-page__panel-title">
            <Sliders style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
            Loan Parameters
          </h2>

          {/* Scheme Preset Selection */}
          {activeSchemes.length > 0 && (
            <div className="estimation-page__form-group">
              <label>Preset Loan Scheme</label>
              <SharedDropdown 
                value={selectedSchemeId} 
                onChange={(e) => handleSchemeSelect(e.target.value)}
                options={[
                  { value: '', label: '-- Custom Terms --' },
                  ...activeSchemes.map(s => ({
                    value: s.id,
                    label: `${s.scheme_name} (${s.rate_per_unit || 0}% / mo - ${s.repayment_frequency || 'MONTHLY'})`
                  }))
                ]}
              />
            </div>
          )}

          {/* Principal Amount */}
          <div className="estimation-page__form-group">
            <label>Sanction Principal Amount (₹)</label>
            <div className="estimation-page__input-prefix">
              <span>₹</span>
              <input 
                type="number" 
                value={principal} 
                onChange={(e) => setPrincipal(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} 
                step="1000"
              />
            </div>
            <input 
              type="range" 
              min="5000" 
              max="5000000" 
              step="5000" 
              value={Number(principal) || 5000} 
              onChange={(e) => setPrincipal(Number(e.target.value))}
              style={{ accentColor: 'var(--brand-primary, #15803D)', cursor: 'pointer' }}
            />
          </div>

          {/* Tenure (Days vs Months) & Frequency */}
          <div className="estimation-page__form-row">
            <div className="estimation-page__form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <label style={{ margin: 0 }}>Tenure Duration</label>
                <div style={{ display: 'inline-flex', background: '#E2E8F0', padding: 2, borderRadius: 4 }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (tenureUnit !== 'DAYS') {
                        const days = Math.max(1, Math.round((Number(tenureValue) || 1) * 30));
                        setTenureUnit('DAYS');
                        setTenureValue(days);
                        setTenureMonths(days / 30);
                      }
                    }}
                    style={{
                      border: 'none', padding: '2px 7px', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', borderRadius: 3,
                      background: tenureUnit === 'DAYS' ? 'var(--brand-primary, #15803D)' : 'transparent',
                      color: tenureUnit === 'DAYS' ? '#FFFFFF' : '#475569'
                    }}
                  >
                    Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (tenureUnit !== 'MONTHS') {
                        const mos = Math.max(1, Math.round((Number(tenureValue) || 30) / 30));
                        setTenureUnit('MONTHS');
                        setTenureValue(mos);
                        setTenureMonths(mos);
                      }
                    }}
                    style={{
                      border: 'none', padding: '2px 7px', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', borderRadius: 3,
                      background: tenureUnit === 'MONTHS' ? 'var(--brand-primary, #15803D)' : 'transparent',
                      color: tenureUnit === 'MONTHS' ? '#FFFFFF' : '#475569'
                    }}
                  >
                    Months
                  </button>
                </div>
              </div>
              <input 
                type="number" 
                min="1"
                value={tenureValue} 
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setTenureValue('');
                    setTenureMonths(0);
                  } else {
                    const val = Math.max(0, Number(raw));
                    setTenureValue(val);
                    if (tenureUnit === 'DAYS') {
                      setTenureMonths(val / 30);
                    } else {
                      setTenureMonths(val);
                    }
                  }
                }}
              />
              <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', marginTop: 2 }}>
                {tenureUnit === 'DAYS' ? `${tenureValue || 0} Days (${((Number(tenureValue) || 0) / 30).toFixed(1)} Months)` : `${tenureValue || 0} Months (${(Number(tenureValue) || 0) * 30} Days)`}
              </span>
            </div>
            <div className="estimation-page__form-group">
              <label>Repayment Cycle</label>
              <SharedDropdown 
                value={repaymentFrequency} 
                onChange={(e) => setRepaymentFrequency(e.target.value)}
                options={[
                  { value: 'DAILY', label: 'Daily' },
                  { value: 'WEEKLY', label: 'Weekly' },
                  { value: 'MONTHLY', label: 'Monthly' }
                ]}
              />
            </div>
          </div>

          {/* Interest Specification Method Box (Amount / Days / Interest Amount Rule) */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Percent style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} />
                Interest Specification Rule
              </span>
              <div style={{ display: 'inline-flex', background: '#E2E8F0', padding: 2, borderRadius: 6 }}>
                <button
                  type="button"
                  onClick={() => setInterestMode('RULE_BASED')}
                  style={{
                    border: 'none', padding: '4px 10px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', borderRadius: 4,
                    background: interestMode === 'RULE_BASED' ? 'var(--brand-primary, #15803D)' : 'transparent',
                    color: interestMode === 'RULE_BASED' ? '#FFFFFF' : '#475569'
                  }}
                >
                  Amount / Days Rule
                </button>
                <button
                  type="button"
                  onClick={() => setInterestMode('PERCENTAGE')}
                  style={{
                    border: 'none', padding: '4px 10px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', borderRadius: 4,
                    background: interestMode === 'PERCENTAGE' ? 'var(--brand-primary, #15803D)' : 'transparent',
                    color: interestMode === 'PERCENTAGE' ? '#FFFFFF' : '#475569'
                  }}
                >
                  Direct % Rate
                </button>
              </div>
            </div>

            {interestMode === 'RULE_BASED' ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: 4 }}>Base Amount (₹)</label>
                    <input
                      type="number"
                      value={ruleAmount}
                      onChange={(e) => setRuleAmount(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                      style={{ width: '100%', height: 36, padding: '0 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: 600, background: '#FFFFFF' }}
                    />
                    <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', marginTop: 3 }}>₹{Number(ruleAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: 4 }}>Days Period</label>
                    <input
                      type="number"
                      value={ruleDays}
                      onChange={(e) => setRuleDays(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                      style={{ width: '100%', height: 36, padding: '0 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: 600, background: '#FFFFFF' }}
                    />
                    <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', marginTop: 3 }}>{ruleDays || 0} Days</span>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: 4 }}>Interest (₹)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={ruleInterest}
                      onChange={(e) => setRuleInterest(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                      style={{ width: '100%', height: 36, padding: '0 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-primary, #15803D)', background: '#FFFFFF' }}
                    />
                    <span style={{ fontSize: '0.65rem', color: '#15803D', display: 'block', marginTop: 3, fontWeight: 600 }}>₹{Number(ruleInterest || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                {/* Single Day & Tenure Calculation Banner */}
                <div style={{ marginTop: 10, background: '#F0FEF5', border: '1px solid #A3F5C1', padding: '10px 14px', borderRadius: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, columnGap: 12, alignItems: 'center', fontSize: '0.74rem' }}>
                    <span style={{ color: '#075F27', fontWeight: 600 }}>Single Day (Base ₹{Number(ruleAmount || 0).toLocaleString('en-IN')}):</span>
                    <strong style={{ color: '#075F27', fontWeight: 700, fontFeatureSettings: '"tnum"' }}>₹{(Number(ruleDays) > 0 ? (Number(ruleInterest || 0) / Number(ruleDays)) : 0).toFixed(2)} / day</strong>

                    <span style={{ color: '#075F27', fontWeight: 600 }}>Daily on Loan Principal:</span>
                    <strong style={{ color: '#15803D', fontWeight: 800, fontSize: '0.8rem', fontFeatureSettings: '"tnum"' }}>₹{((Number(ruleAmount) > 0 && Number(ruleDays) > 0) ? (Number(principal || 0) * (Number(ruleInterest || 0) / (Number(ruleAmount) * Number(ruleDays)))) : 0).toFixed(2)} / day</strong>
                  </div>
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #A3F5C1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#0F172A' }}>
                    <span>Daily Rate: <strong>{((Number(ruleAmount) > 0 && Number(ruleDays) > 0) ? ((Number(ruleInterest || 0) / (Number(ruleAmount) * Number(ruleDays))) * 100) : 0).toFixed(3)}%</strong></span>
                    <span>Monthly (30d): <strong style={{ color: '#15803D' }}>{effectiveMonthlyRate.toFixed(2)}%</strong></span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: 4 }}>Monthly Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={monthlyInterestRate}
                  onChange={(e) => setMonthlyInterestRate(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  style={{ width: '100%', height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.82rem', fontWeight: 600, background: '#FFFFFF' }}
                />
              </div>
            )}
          </div>

          {/* Repayment Method & Calculation Formula */}
          <div className="estimation-page__form-row">
            <div className="estimation-page__form-group">
              <label>Repayment Method</label>
              <SharedDropdown 
                value={repaymentMethod} 
                onChange={(e) => setRepaymentMethod(e.target.value)}
                options={[
                  { value: 'EMI', label: 'EMI (Equal Installment)' },
                  { value: 'INTEREST_ONLY', label: 'Interest Only' }
                ]}
              />
            </div>
            <div className="estimation-page__form-group">
              <label>Interest Engine</label>
              <SharedDropdown 
                value={interestCalculation} 
                onChange={(e) => setInterestCalculation(e.target.value)}
                options={[
                  { value: 'CONSTANT_FLAT', label: 'Flat Rate (Constant)' },
                  { value: 'FLEXIBLE_REDUCING', label: 'Reducing Balance' }
                ]}
              />
            </div>
          </div>

          {/* Processing Fee & Advance EMI */}
          <div className="estimation-page__form-row">
            <div className="estimation-page__form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ margin: 0 }}>Processing Fee</label>
                <div style={{ display: 'inline-flex', background: '#E2E8F0', padding: 2, borderRadius: 4 }}>
                  <button
                    type="button"
                    onClick={() => setProcessingFeeType('AMOUNT')}
                    style={{
                      border: 'none', padding: '1px 6px', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', borderRadius: 3,
                      background: processingFeeType === 'AMOUNT' ? 'var(--brand-primary, #15803D)' : 'transparent',
                      color: processingFeeType === 'AMOUNT' ? '#FFFFFF' : '#475569'
                    }}
                  >
                    ₹
                  </button>
                  <button
                    type="button"
                    onClick={() => setProcessingFeeType('PERCENT')}
                    style={{
                      border: 'none', padding: '1px 6px', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', borderRadius: 3,
                      background: processingFeeType === 'PERCENT' ? 'var(--brand-primary, #15803D)' : 'transparent',
                      color: processingFeeType === 'PERCENT' ? '#FFFFFF' : '#475569'
                    }}
                  >
                    %
                  </button>
                </div>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                {processingFeeType === 'AMOUNT' && (
                  <span style={{ position: 'absolute', left: 10, fontSize: '0.8rem', color: '#64748B', fontWeight: 600, pointerEvents: 'none' }}>₹</span>
                )}
                <input 
                  type="number" 
                  min="0"
                  step={processingFeeType === 'AMOUNT' ? '1' : '0.1'} 
                  value={processingFeeValue} 
                  onChange={(e) => setProcessingFeeValue(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  style={{ paddingLeft: processingFeeType === 'AMOUNT' ? 24 : 12, paddingRight: processingFeeType === 'PERCENT' ? 24 : 12, width: '100%' }}
                />
                {processingFeeType === 'PERCENT' && (
                  <span style={{ position: 'absolute', right: 10, fontSize: '0.8rem', color: '#64748B', fontWeight: 600, pointerEvents: 'none' }}>%</span>
                )}
              </div>
            </div>
            <div className="estimation-page__form-group">
              <label>Advance EMIs Deducted</label>
              <input 
                type="number" 
                min="0" 
                max="6" 
                value={advanceEmiCount} 
                onChange={(e) => setAdvanceEmiCount(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
              />
            </div>
          </div>

          {/* Disbursement Date */}
          <div className="estimation-page__form-group">
            <label>Disbursement Date</label>
            <SharedDatePicker
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              buttonStyle={{ height: 38 }}
            />
          </div>

        </div>

        {/* Right Column: Output Metrics, Visual Charts, and Schedule Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>

          {/* 4 Top KPI Cards */}
          <div className="estimation-page__kpi-grid">
            <div className="estimation-page__kpi-card estimation-page__kpi-card--primary">
              <span className="estimation-page__kpi-card-label">Net Disbursed Amount</span>
              <span className="estimation-page__kpi-card-value" style={{ color: 'var(--brand-primary, #15803D)' }}>
                {fmt(estimateResult.netDisbursed)}
              </span>
              <span className="estimation-page__kpi-card-subtext">
                After {fmt(estimateResult.totalDeductions)} deductions
              </span>
            </div>

            <div className="estimation-page__kpi-card estimation-page__kpi-card--info">
              <span className="estimation-page__kpi-card-label">Installment (EMI)</span>
              <span className="estimation-page__kpi-card-value" style={{ color: '#2563EB' }}>
                {fmt(estimateResult.installmentAmount)}
              </span>
              <span className="estimation-page__kpi-card-subtext">
                Per {repaymentFrequency.toLowerCase()} period
              </span>
            </div>

            <div className="estimation-page__kpi-card estimation-page__kpi-card--warning">
              <span className="estimation-page__kpi-card-label">Total Interest Payable</span>
              <span className="estimation-page__kpi-card-value" style={{ color: '#D97706' }}>
                {fmt(estimateResult.totalInterest)}
              </span>
              <span className="estimation-page__kpi-card-subtext">
                {effectiveMonthlyRate.toFixed(2)}% / mo over {tenureUnit === 'DAYS' ? `${tenureValue} Days` : `${tenureMonths} Mos`}
              </span>
            </div>

            <div className="estimation-page__kpi-card estimation-page__kpi-card--success">
              <span className="estimation-page__kpi-card-label">Total Repayable</span>
              <span className="estimation-page__kpi-card-value">
                {fmt(estimateResult.totalPayable)}
              </span>
              <span className="estimation-page__kpi-card-subtext">
                Effective APR: <strong>{estimateResult.effectiveApr}%</strong>
              </span>
            </div>
          </div>

          {/* Visual Charts Row */}
          <div className="estimation-page__charts-grid">

            {/* Donut Chart: Cost Breakdown */}
            <div className="estimation-page__chart-card">
              <h3 className="estimation-page__chart-card-title">Cost Breakdown</h3>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => fmt(value)} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Area Chart: Payoff Curve */}
            <div className="estimation-page__chart-card">
              <h3 className="estimation-page__chart-card-title">Principal Balance Payoff Trajectory</h3>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={estimateResult.trajectoryData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="period" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <Tooltip formatter={(value) => [fmt(value), 'Outstanding Principal']} />
                    <Area 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="var(--brand-primary, #15803D)" 
                      fill="var(--brand-primary-light, #F0FEF5)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Amortization Schedule Table */}
          <div className="estimation-page__table-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Repayment & Amortization Schedule ({estimateResult.schedule.length} Periods)
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  Period-by-period principal, interest, and due dates schedule.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="Filter period or date..." 
                  value={searchTerm} 
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  style={{
                    height: '32px',
                    padding: '0 10px',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1'
                  }}
                />
                <button 
                  type="button" 
                  onClick={handleExportCSV}
                  className="estimation-page__btn estimation-page__btn--secondary"
                  style={{ height: '32px', padding: '0 12px', fontSize: '0.75rem' }}
                >
                  <Download style={{ width: 12, height: 12 }} /> CSV Export
                </button>
              </div>
            </div>

            <div className="estimation-page__table-wrapper">
              <table className="estimation-page__table">
                <thead>
                  <tr>
                    <th>Period #</th>
                    <th>Due Date</th>
                    <th style={{ textAlign: 'right' }}>Principal (₹)</th>
                    <th style={{ textAlign: 'right' }}>Interest (₹)</th>
                    <th style={{ textAlign: 'right' }}>Installment EMI (₹)</th>
                    <th style={{ textAlign: 'right' }}>Principal Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSchedule.length > 0 ? (
                    paginatedSchedule.map((row) => (
                      <tr key={row.period}>
                        <td><strong>#{row.period}</strong></td>
                        <td>{row.due_date}</td>
                        <td style={{ textAlign: 'right' }}>{Number(row.principal || 0).toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right', color: '#D97706' }}>{Number(row.interest || 0).toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--brand-primary, #15803D)' }}>
                          {Number(row.emi || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                          ₹{Number(row.balance != null ? row.balance : 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                        No schedule entries match your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748B' }}>
                <span>Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Previous
                  </button>
                  <button 
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Printable Sheet Modal Portal */}
      {showPrintModal && (
        <PrintableEstimationSheet 
          estimateData={estimateResult}
          tenant={tenant}
          onClose={() => setShowPrintModal(false)}
          onApplyLoan={onApplyLoan}
        />
      )}

      {/* Save as Scheme Modal Dialog */}
      {showSaveSchemeModal && (
        <div className="saas-modal-backdrop" style={{ zIndex: 9999 }}>
          <div className="saas-modal-card" style={{ maxWidth: 480, width: '100%', padding: 0, overflow: 'hidden' }}>
            <div className="saas-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: '#F0FEF5', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #A3F5C1' }}>
                  <BookmarkPlus style={{ width: 16, height: 16 }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>Save as Preset Loan Scheme</h3>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>Convert this calculation into a reusable scheme in master settings.</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowSaveSchemeModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <form onSubmit={handleSaveScheme} style={{ padding: '20px' }}>
              {schemeFeedbackMsg && (
                <div style={{
                  marginBottom: 14,
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: schemeFeedbackMsg.type === 'success' ? '#F0FEF5' : '#FEF2F2',
                  color: schemeFeedbackMsg.type === 'success' ? '#075F27' : '#991B1B',
                  border: schemeFeedbackMsg.type === 'success' ? '1px solid #A3F5C1' : '1px solid #FECACA'
                }}>
                  {schemeFeedbackMsg.type === 'success' ? <CheckCircle2 style={{ width: 14, height: 14 }} /> : <X style={{ width: 14, height: 14 }} />}
                  <span>{schemeFeedbackMsg.text}</span>
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Scheme Name</label>
                <input 
                  type="text" 
                  required
                  value={schemeFormName}
                  onChange={(e) => setSchemeFormName(e.target.value)}
                  placeholder="e.g. Daily 100-Day Microfinance Scheme"
                  style={{ width: '100%', height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}
                />
              </div>

              {/* Terms Summary Card */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '12px', marginBottom: 18 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                  Scheme Parameters to Save
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: '0.76rem' }}>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>Monthly Rate:</span>
                    <strong style={{ color: '#15803D' }}>{effectiveMonthlyRate.toFixed(2)}% / month</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>Single Day Rate:</span>
                    <strong>{((effectiveMonthlyRate / 30)).toFixed(3)}% / day</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>Repayment Cycle:</span>
                    <strong style={{ textTransform: 'capitalize' }}>{repaymentFrequency.toLowerCase()}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>Calculation Method:</span>
                    <strong>{repaymentMethod} ({interestCalculation === 'CONSTANT_FLAT' ? 'Flat' : 'Reducing'})</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>Default Tenure:</span>
                    <strong>{tenureUnit === 'DAYS' ? `${tenureValue} Days` : `${tenureMonths} Months`}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>Processing Fee:</span>
                    <strong>{processingFeeType === 'AMOUNT' ? `₹${Number(processingFeeValue || 0).toLocaleString('en-IN')}` : `${processingFeeValue}%`}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  disabled={schemeSaving}
                  onClick={() => setShowSaveSchemeModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={schemeSaving || !schemeFormName.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'var(--brand-primary, #15803D)',
                    color: '#FFFFFF',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: schemeSaving ? 'not-allowed' : 'pointer',
                    opacity: schemeSaving ? 0.7 : 1
                  }}
                >
                  <Check style={{ width: 14, height: 14 }} /> {schemeSaving ? 'Saving Scheme...' : 'Save & Activate Scheme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
