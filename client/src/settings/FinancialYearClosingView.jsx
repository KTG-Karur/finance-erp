import React, { useState, useEffect } from 'react';
import {
  Calendar,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  ArrowRight,
  RefreshCw,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  Check,
  ChevronRight, 
  ShieldCheck,
  AlertCircle,
  Clock
} from 'lucide-react';
import api from '../api/client';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import SharedDropdown from '../components/common/SharedDropdown';

export default function FinancialYearClosingView({ user, onRefreshData }) {
  const { t } = useLanguage();
  const [financialYears, setFinancialYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFyId, setSelectedFyId] = useState(null);
  const [activeTab, setActiveTab] = useState('register'); // 'register' | 'wizard'

  // Wizard state (Steps 1 to 4)
  const [wizardStep, setWizardStep] = useState(1);
  const [preCheckData, setPreCheckData] = useState(null);
  const [preCheckLoading, setPreCheckLoading] = useState(false);
  const [closingNotes, setClosingNotes] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [executingClose, setExecutingClose] = useState(false);
  const [closeSuccessData, setCloseSuccessData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchFinancialYears = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get('/finance/fy');
      if (res?.data?.success) {
        const list = res.data.data || [];
        setFinancialYears(list);
        if (!selectedFyId && list.length > 0) {
          const active = list.find(y => y.status === 'ACTIVE') || list[0];
          setSelectedFyId(active.id);
        }
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to load financial years register.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialYears();
  }, []);

  const runPreCheck = async (fyId) => {
    const targetId = fyId || selectedFyId;
    if (!targetId) return;
    try {
      setPreCheckLoading(true);
      setErrorMsg('');
      const res = await api.get(`/finance/fy/${targetId}/pre-check`);
      if (res?.data?.success) {
        setPreCheckData(res.data.data);
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to run pre-closing audit check.');
    } finally {
      setPreCheckLoading(false);
    }
  };

  const handleStartWizard = (fy) => {
    setSelectedFyId(fy.id);
    setActiveTab('wizard');
    setWizardStep(1);
    setCloseSuccessData(null);
    setErrorMsg('');
    runPreCheck(fy.id);
  };

  const handleToggleSoftLock = async (fy, softLockState) => {
    try {
      setErrorMsg('');
      const res = await api.post(`/finance/fy/${fy.id}/soft-lock`, { softLock: softLockState });
      if (res?.data?.success) {
        await fetchFinancialYears();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to update lock state.');
    }
  };

  const handleExecuteClosing = async () => {
    if (!selectedFyId) return;
    try {
      setExecutingClose(true);
      setErrorMsg('');
      const res = await api.post(`/finance/fy/${selectedFyId}/close`, {
        notes: closingNotes,
        password: adminPassword
      });
      if (res?.data?.success) {
        setCloseSuccessData(res.data.data);
        await fetchFinancialYears();
        onRefreshData?.();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Year-end closing execution failed.');
    } finally {
      setExecutingClose(false);
    }
  };

  const currentSelectedFy = financialYears.find(y => y.id === selectedFyId) || null;
  const isSuperOrAdmin = user?.role === 'ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'SUPER_ADMIN';

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  return (
    <div className="active-loans-page" style={{ padding: '0 4px' }}>
      
      {/* ── 1. Top Header ────────────────────────────────────────────── */}
      <div className="active-loans-header" style={{ marginBottom: 20 }}>
        <div className="header-left">
          <div className="header-badge-icon" style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#1E40AF' }}>
            <Calendar style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#0F172A' }}>
              Financial Year Control & Closing
            </h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: '2px 0 0 0' }}>
              Manage accounting periods (1 April → 31 March), period locking, subledger-to-GL parity, and year-end carry forward.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="fin-btn-secondary"
            onClick={fetchFinancialYears}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer' }}
          >
            <RefreshCw style={{ width: 14, height: 14 }} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, color: '#991B1B', fontSize: 13 }}>
          <AlertTriangle style={{ width: 18, height: 18, flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── 2. Top Nav Tabs ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #E2E8F0', paddingBottom: 12, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setActiveTab('register')}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'register' ? '#0F172A' : '#F1F5F9',
            color: activeTab === 'register' ? '#FFFFFF' : '#475569'
          }}
        >
          Financial Years Register
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('wizard');
            if (currentSelectedFy && !preCheckData) runPreCheck(currentSelectedFy.id);
          }}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'wizard' ? '#0F172A' : '#F1F5F9',
            color: activeTab === 'wizard' ? '#FFFFFF' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Lock style={{ width: 14, height: 14 }} />
          <span>Year-End Closing Wizard</span>
        </button>
      </div>

      {/* ── 3. Tab Content: Financial Years Register ────────────────── */}
      {activeTab === 'register' && (
        <div>
          <div style={{ background: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>FY Code</th>
                  <th style={{ padding: '12px 16px' }}>Start Date</th>
                  <th style={{ padding: '12px 16px' }}>End Date</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Vouchers</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Collections</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Snapshots</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {financialYears.map((fy) => {
                  const isActive = fy.status === 'ACTIVE';
                  const isClosed = fy.status === 'CLOSED';
                  const isSoftLocked = fy.status === 'SOFT_LOCKED';

                  return (
                    <tr key={fy.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0F172A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{fy.code}</span>
                          {Boolean(fy.is_current) && (
                            <span style={{ fontSize: 11, background: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                              CURRENT
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#334155', fontVariantNumeric: 'tabular-nums' }}>{fy.start_date}</td>
                      <td style={{ padding: '14px 16px', color: '#334155', fontVariantNumeric: 'tabular-nums' }}>{fy.end_date}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: isActive ? '#DCFCE7' : isSoftLocked ? '#FEF3C7' : '#F1F5F9',
                            color: isActive ? '#15803D' : isSoftLocked ? '#B45309' : '#475569'
                          }}
                        >
                          {isActive ? <Unlock style={{ width: 12, height: 12 }} /> : <Lock style={{ width: 12, height: 12 }} />}
                          <span>{fy.status}</span>
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(fy.journal_count)}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(fy.collection_count)}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(fy.loan_snapshot_count)}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          {!isClosed && isSuperOrAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleSoftLock(fy, !isSoftLocked)}
                                style={{
                                  padding: '5px 10px',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  borderRadius: 4,
                                  border: '1px solid #CBD5E1',
                                  background: '#FFF',
                                  cursor: 'pointer'
                                }}
                              >
                                {isSoftLocked ? 'Unlock' : 'Soft Lock'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartWizard(fy)}
                                style={{
                                  padding: '5px 12px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  borderRadius: 4,
                                  border: 'none',
                                  background: '#0F172A',
                                  color: '#FFF',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <span>Close FY</span>
                                <ChevronRight style={{ width: 12, height: 12 }} />
                              </button>
                            </>
                          )}
                          {isClosed && (
                            <span style={{ fontSize: 12, color: '#64748B' }}>
                              Closed by {fy.closed_by_name || 'Admin'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 4. Tab Content: 4-Step Year-End Closing Wizard ──────────── */}
      {activeTab === 'wizard' && currentSelectedFy && (
        <div style={{ background: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          
          {/* Wizard Stepper Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 20, marginBottom: 24 }}>
            {[
              { step: 1, title: 'Pre-Audit Integrity' },
              { step: 2, title: 'P&L Nominal Clearance' },
              { step: 3, title: 'Subledger Snapshots' },
              { step: 4, title: 'Execute & Carry Forward' }
            ].map((s, idx) => {
              const isDone = wizardStep > s.step;
              const isCurrent = wizardStep === s.step;
              return (
                <React.Fragment key={s.step}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 700,
                        background: isDone ? '#10B981' : isCurrent ? '#0F172A' : '#F1F5F9',
                        color: isDone || isCurrent ? '#FFFFFF' : '#64748B'
                      }}
                    >
                      {isDone ? <Check style={{ width: 16, height: 16 }} /> : s.step}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748B', fontWeight: 600 }}>Step {s.step}</div>
                      <div style={{ fontSize: 13, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#0F172A' : '#64748B' }}>{s.title}</div>
                    </div>
                  </div>
                  {idx < 3 && <div style={{ flex: 1, height: 2, background: isDone ? '#10B981' : '#E2E8F0', margin: '0 16px' }} />}
                </React.Fragment>
              );
            })}
          </div>

          {/* ── STEP 1: Pre-Audit Parity Checklist ──────────────────── */}
          {wizardStep === 1 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0F172A' }}>
                    Pre-Closing Parity & Integrity Checklist for {currentSelectedFy.code}
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
                    Verify subledger to General Ledger equilibrium before year-end books can be closed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => runPreCheck(currentSelectedFy.id)}
                  disabled={preCheckLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer' }}
                >
                  <RefreshCw style={{ width: 12, height: 12 }} className={preCheckLoading ? 'animate-spin' : ''} />
                  <span>Re-run Audit</span>
                </button>
              </div>

              {preCheckLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                  <RefreshCw style={{ width: 24, height: 24, margin: '0 auto 10px' }} className="animate-spin" />
                  <div>Auditing Trial Balance and Subledgers...</div>
                </div>
              ) : preCheckData ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
                  
                  {/* Card 1: Trial Balance */}
                  <div style={{ padding: 16, borderRadius: 8, border: '1px solid #E2E8F0', background: preCheckData.checks.trialBalance.passed ? '#F8FAFC' : '#FEF2F2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>Trial Balance Equilibrium</span>
                      {preCheckData.checks.trialBalance.passed ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#166534', fontSize: 12, fontWeight: 700 }}>
                          <CheckCircle2 style={{ width: 14, height: 14 }} /> Balanced
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#991B1B', fontSize: 12, fontWeight: 700 }}>
                          <AlertCircle style={{ width: 14, height: 14 }} /> Imbalanced
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>Debit Total: ₹{fmt(preCheckData.checks.trialBalance.totalDebit)}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>Credit Total: ₹{fmt(preCheckData.checks.trialBalance.totalCredit)}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginTop: 4 }}>Variance: ₹{fmt(preCheckData.checks.trialBalance.variance)}</div>
                  </div>

                  {/* Card 2: Loan Subledger Parity */}
                  <div style={{ padding: 16, borderRadius: 8, border: '1px solid #E2E8F0', background: preCheckData.checks.loanParity.passed ? '#F8FAFC' : '#FEF2F2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>Loan Subledger vs GL 1100</span>
                      {preCheckData.checks.loanParity.passed ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#166534', fontSize: 12, fontWeight: 700 }}>
                          <CheckCircle2 style={{ width: 14, height: 14 }} /> Parity Matched
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#991B1B', fontSize: 12, fontWeight: 700 }}>
                          <AlertCircle style={{ width: 14, height: 14 }} /> Variance Detected
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>Active Loans ({preCheckData.checks.loanParity.activeLoanCount}): ₹{fmt(preCheckData.checks.loanParity.subledgerPrincipal)}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>GL Account 1100: ₹{fmt(preCheckData.checks.loanParity.gl1100Balance)}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginTop: 4 }}>Variance: ₹{fmt(preCheckData.checks.loanParity.variance)}</div>
                  </div>

                  {/* Card 3: Deposits Parity */}
                  <div style={{ padding: 16, borderRadius: 8, border: '1px solid #E2E8F0', background: preCheckData.checks.fdParity.passed && preCheckData.checks.rdParity.passed ? '#F8FAFC' : '#FEF2F2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>Deposit Liabilities (FD / RD)</span>
                      {preCheckData.checks.fdParity.passed && preCheckData.checks.rdParity.passed ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#166534', fontSize: 12, fontWeight: 700 }}>
                          <CheckCircle2 style={{ width: 14, height: 14 }} /> Parity Matched
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#991B1B', fontSize: 12, fontWeight: 700 }}>
                          <AlertCircle style={{ width: 14, height: 14 }} /> Variance
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>FD Subledger vs GL 2200: ₹{fmt(preCheckData.checks.fdParity.subledgerTotal)} vs ₹{fmt(preCheckData.checks.fdParity.gl2200Balance)}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>RD Subledger vs GL 2201: ₹{fmt(preCheckData.checks.rdParity.subledgerTotal)} vs ₹{fmt(preCheckData.checks.rdParity.gl2201Balance)}</div>
                  </div>

                  {/* Card 4: Clearing Queue */}
                  <div style={{ padding: 16, borderRadius: 8, border: '1px solid #E2E8F0', background: preCheckData.checks.clearingQueue.passed ? '#F8FAFC' : '#FEF2F2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>Clearing & Waiver Queue</span>
                      {preCheckData.checks.clearingQueue.passed ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#166534', fontSize: 12, fontWeight: 700 }}>
                          <CheckCircle2 style={{ width: 14, height: 14 }} /> All Clear
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#991B1B', fontSize: 12, fontWeight: 700 }}>
                          <AlertCircle style={{ width: 14, height: 14 }} /> Pending Items
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>Uncleared Cheques: {preCheckData.checks.clearingQueue.unclearedChequesCount} (₹{fmt(preCheckData.checks.clearingQueue.unclearedChequesAmount)})</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>Pending Waivers: {preCheckData.checks.clearingQueue.pendingWaiversCount}</div>
                  </div>

                </div>
              ) : null}

              {preCheckData && !preCheckData.isReadyToClose && (
                <div style={{ padding: 14, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, color: '#991B1B', fontSize: 13, marginBottom: 6 }}>
                    Closing is blocked by {preCheckData.issues.length} audit issue(s):
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#7F1D1D' }}>
                    {preCheckData.issues.map((iss, i) => (
                      <li key={i} style={{ marginBottom: 3 }}>{iss}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  disabled={!preCheckData?.isReadyToClose}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    border: 'none',
                    background: preCheckData?.isReadyToClose ? '#0F172A' : '#CBD5E1',
                    color: '#FFF',
                    cursor: preCheckData?.isReadyToClose ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>Proceed to P&L Clearance</span>
                  <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: P&L Summary & Retained Earnings ──────────────── */}
          {wizardStep === 2 && preCheckData && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Step 2: P&L Nominal Account Clearance & Retained Earnings
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 20px 0' }}>
                All revenue (4000s) and expense (5000s) accounts will be zeroed out on 31 March and balanced into Account 3005.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div style={{ padding: 16, borderRadius: 8, border: '1px solid #BBF7D0', background: '#F0FDF4' }}>
                  <div style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>Total Annual Revenue</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#15803D', marginTop: 4 }}>₹{fmt(preCheckData.checks.pnlSummary.totalRevenue)}</div>
                </div>
                <div style={{ padding: 16, borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2' }}>
                  <div style={{ fontSize: 12, color: '#991B1B', fontWeight: 600 }}>Total Operating Expenses</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#B91C1C', marginTop: 4 }}>₹{fmt(preCheckData.checks.pnlSummary.totalExpense)}</div>
                </div>
                <div style={{ padding: 16, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                  <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>Net Profit / (Loss) Transferred to Reserves</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: preCheckData.checks.pnlSummary.netProfit >= 0 ? '#15803D' : '#B91C1C', marginTop: 4 }}>
                    ₹{fmt(preCheckData.checks.pnlSummary.netProfit)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30 }}>
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer' }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  style={{ padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600, border: 'none', background: '#0F172A', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span>Proceed to Snapshot Verification</span>
                  <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Subledger Snapshots Verification ────────────── */}
          {wizardStep === 3 && preCheckData && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Step 3: Subledger Snapshot & Balance Sheet Carry-Forward
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 20px 0' }}>
                Every active loan and deposit account will have an immutable point-in-time snapshot recorded as of 31 March.
              </p>

              <div style={{ padding: 16, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, marginBottom: 24 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A', marginBottom: 8 }}>Carry-Forward Guarantees:</div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#475569', lineHeight: '1.6' }}>
                  <li><strong>Active Loans Continuity:</strong> All active loans continue under identical Loan IDs (<span style={{ fontVariantNumeric: 'tabular-nums' }}>LN-xxxxxx</span>) in the new financial year.</li>
                  <li><strong>Opening Balance Voucher:</strong> Asset, Liability, and Equity ledger heads carry forward into the 01 April opening balance sheet.</li>
                  <li><strong>Audit Lock:</strong> {currentSelectedFy.code} transitions to <span style={{ fontWeight: 700, color: '#0F172A' }}>CLOSED</span> status and rejects retroactive writes.</li>
                </ul>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30 }}>
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer' }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(4)}
                  style={{ padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600, border: 'none', background: '#0F172A', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span>Proceed to Final Execution</span>
                  <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Atomic Execution & Final Confirmation ────────── */}
          {wizardStep === 4 && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Step 4: Execute Year-End Closing & Carry Forward
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 20px 0' }}>
                Confirm closing of {currentSelectedFy.code}. This will atomically close nominal accounts, generate snapshots, and provision the new financial year.
              </p>

              {closeSuccessData ? (
                <div style={{ padding: 24, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, textAlign: 'center' }}>
                  <CheckCircle2 style={{ width: 48, height: 48, color: '#16A34A', margin: '0 auto 12px' }} />
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#15803D', margin: 0 }}>Year-End Closing Completed Successfully!</h3>
                  <p style={{ fontSize: 13, color: '#166534', margin: '6px 0 16px 0' }}>
                    {closeSuccessData.closedYear} is now permanently closed and archived. {closeSuccessData.newYear} is active.
                  </p>

                  <div style={{ maxWidth: 400, margin: '0 auto', textAlign: 'left', background: '#FFFFFF', padding: 14, borderRadius: 6, border: '1px solid #DCFCE7', fontSize: 13 }}>
                    <div style={{ marginBottom: 4 }}><strong>P&L Closing Voucher:</strong> {closeSuccessData.plVoucherNo || 'N/A'}</div>
                    <div style={{ marginBottom: 4 }}><strong>Opening Balance Voucher:</strong> {closeSuccessData.openingVoucherNo || 'N/A'}</div>
                    <div><strong>Loan Snapshots Created:</strong> {closeSuccessData.snapshotsCount}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      setCloseSuccessData(null);
                    }}
                    style={{ marginTop: 20, padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, border: 'none', background: '#0F172A', color: '#FFF', cursor: 'pointer' }}
                  >
                    Return to Register
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Closing Notes & Audit Remarks (Optional)
                    </label>
                    <textarea
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      placeholder="e.g. FY 2025-26 Year-End Accounts Audited & Approved by Statutory Auditor"
                      rows={3}
                      style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 6, border: '1px solid #CBD5E1' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30 }}>
                    <button
                      type="button"
                      onClick={() => setWizardStep(3)}
                      disabled={executingClose}
                      style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer' }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteClosing}
                      disabled={executingClose}
                      style={{
                        padding: '10px 24px',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 700,
                        border: 'none',
                        background: '#DC2626',
                        color: '#FFF',
                        cursor: executingClose ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <Lock style={{ width: 14, height: 14 }} />
                      <span>{executingClose ? 'Executing Atomic Close...' : `Confirm & Close ${currentSelectedFy.code}`}</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
}
