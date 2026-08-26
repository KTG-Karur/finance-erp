import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Banknote,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Landmark,
  RefreshCw,
  ShieldCheck,
  Wallet,
  X
} from 'lucide-react';
import DropdownSelect from '../../components/DropdownSelect';
import SharedDatePicker from '../../components/common/SharedDatePicker';
import api from '../../api/client';

export default function DisburseLoanModal({
  loan,
  branchesList = [],
  chartOfAccounts = [],
  bankAccounts = [],
  onConfirm,
  onMarkPendingDisbursal,
  onClose
}) {
  const [branch, setBranch] = useState(loan?.branch || branchesList[0]?.name || 'Main Branch');
  const [paymentMode, setPaymentMode] = useState('CASH'); // 'CASH' | 'BANK' | 'CHEQUE'
  const [disbursalDate, setDisbursalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [transactionRef, setTransactionRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [accountBalances, setAccountBalances] = useState({});
  const [loadingBalances, setLoadingBalances] = useState(false);

  // Filter asset accounts from chart of accounts
  const assetAccounts = useMemo(() => {
    return chartOfAccounts.filter(a => a.account_type === 'ASSET' || (a.code && String(a.code).startsWith('1')));
  }, [chartOfAccounts]);

  const cashAccounts = useMemo(() => {
    const list = assetAccounts.filter(a => (String(a.code) === '1001' || (a.name || '').toLowerCase().includes('cash')));
    return list.length ? list : [{ code: '1001', name: 'Cash in Hand (Vault)' }];
  }, [assetAccounts]);

  const bankAccountsList = useMemo(() => {
    if (bankAccounts && bankAccounts.length > 0) {
      return bankAccounts.filter(b => b.is_active !== false).map(b => {
        const last4 = (b.account_number || '').slice(-4);
        const bankName = b.bank_name || 'Bank Account';
        const name = last4 ? `${bankName} (...${last4})` : bankName;
        return {
          code: b.ledger_account_code || '1002',
          name,
          branch: b.branch || b.branch_name,
          raw: b
        };
      });
    }
    const list = assetAccounts.filter(a => (String(a.code) === '1002' || (a.name || '').toLowerCase().includes('bank')));
    return list.length ? list : [{ code: '1002', name: 'Primary Bank Account', branch: branch }];
  }, [assetAccounts, bankAccounts, branch]);

  // Selected source account code & name
  const [sourceAccountCode, setSourceAccountCode] = useState(
    paymentMode === 'CASH' ? cashAccounts[0]?.code : bankAccountsList[0]?.code
  );

  const fetchLiveBalances = async () => {
    setLoadingBalances(true);
    try {
      const res = await api.get('/finance/ledger/accounts/balances');
      if (res.data?.success && Array.isArray(res.data?.data)) {
        const map = {};
        res.data.data.forEach(acc => {
          map[acc.account_code] = acc.available_balance;
        });
        setAccountBalances(map);
      }
    } catch (err) {
      console.warn('Could not load live balances from server, falling back to local COA balances:', err);
    } finally {
      setLoadingBalances(false);
    }
  };

  useEffect(() => {
    fetchLiveBalances();
  }, [branch]);

  const branchBankAccounts = useMemo(() => {
    return bankAccountsList.filter(b => b.branch === branch);
  }, [bankAccountsList, branch]);

  const otherBankAccounts = useMemo(() => {
    return bankAccountsList.filter(b => b.branch !== branch);
  }, [bankAccountsList, branch]);

  const activeAccountsList = paymentMode === 'CASH' ? cashAccounts : bankAccountsList;
  const currentAccount = activeAccountsList.find(a => String(a.code) === String(sourceAccountCode)) || activeAccountsList[0];

  const handleBranchChange = (newBranch) => {
    setBranch(newBranch);
    if (paymentMode !== 'CASH') {
      const matchInNewBranch = bankAccountsList.find(b => b.branch === newBranch);
      if (matchInNewBranch) {
        setSourceAccountCode(matchInNewBranch.code);
      }
    }
  };

  const handleModeChange = (mode) => {
    setPaymentMode(mode);
    if (mode === 'CASH') {
      setSourceAccountCode(cashAccounts[0]?.code || '1001');
    } else {
      const branchBank = bankAccountsList.find(b => b.branch === branch) || bankAccountsList[0];
      setSourceAccountCode(branchBank?.code || '1002');
    }
  };

  const handleBankSelect = (code) => {
    setSourceAccountCode(code);
    const matched = bankAccountsList.find(b => String(b.code) === String(code));
    if (matched?.branch && branchesList.some(b => b.name === matched.branch)) {
      setBranch(matched.branch);
    }
  };

  const principal = Number(loan?.principal_amount || 0);
  const processingFee = Number(loan?.processing_fee || loan?.processing_fee_amount || 0);
  const advanceEmi = Number(loan?.advance_emi || loan?.advance_emi_amount || 0);
  const totalDeductions = processingFee + advanceEmi;
  const netDisbursed = Math.max(0, principal - totalDeductions);

  // Derive available balance for selected source account
  const currentAccountCode = currentAccount?.code || (paymentMode === 'CASH' ? '1001' : '1002');
  const availableBalance = useMemo(() => {
    if (accountBalances[currentAccountCode] !== undefined) {
      return Number(accountBalances[currentAccountCode]) || 0;
    }
    // Fallback to COA account balance if available
    const coaMatch = chartOfAccounts.find(a => String(a.code || a.account_code) === String(currentAccountCode));
    return Number(coaMatch?.balance || 0);
  }, [accountBalances, currentAccountCode, chartOfAccounts]);

  const isInsufficient = availableBalance < netDisbursed;
  const balanceAfterDisbursal = availableBalance - netDisbursed;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (isInsufficient) {
      setErrorMsg(`Insufficient funds in ${currentAccount?.name || 'Selected Account'} (${currentAccountCode}). Available: ₹${availableBalance.toLocaleString('en-IN')}, Required: ₹${netDisbursed.toLocaleString('en-IN')}. Disbursal cannot proceed.`);
      return;
    }

    if (paymentMode !== 'CASH' && !transactionRef.trim() && paymentMode === 'CHEQUE') {
      setErrorMsg('Please provide a Cheque Number.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      await onConfirm({
        branch,
        payment_mode: paymentMode,
        source_account_code: currentAccountCode,
        source_account_name: currentAccount?.name || (paymentMode === 'CASH' ? 'Cash in Hand' : 'Bank Account'),
        transaction_ref: transactionRef.trim(),
        disbursal_date: disbursalDate,
        processing_fee: processingFee,
        advance_emi: advanceEmi
      });
      onClose();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to disburse loan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveToPendingDisbursal = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      if (onMarkPendingDisbursal) {
        await onMarkPendingDisbursal(loan.id, 'Insufficient balance in ' + (currentAccount?.name || 'source account'));
      }
      onClose();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to move to Disbursement Pending stage');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="saas-modal-backdrop" style={{ zIndex: 9999 }}>
      <div className="saas-modal-card" style={{ maxWidth: 600, width: '100%', padding: 0, overflow: 'hidden' }}>
        
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #E2E8F0',
          background: '#FFFFFF',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#F0FEF5',
              color: '#15803D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #A3F5C1'
            }}>
              <Landmark style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
                Confirm Loan Disbursal
              </h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>
                Verify available cash / bank balance and post disbursal accounting voucher.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Modal Body with Scrollable Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px', overflowY: 'auto', overflowX: 'hidden', flex: 1, minHeight: 0 }}>
          
          {/* Error Message */}
          {errorMsg && (
            <div style={{
              marginBottom: 14,
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: '0.78rem',
              background: '#FEF2F2',
              color: '#991B1B',
              border: '1px solid #FECACA',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* Loan Summary Badge Card */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block' }}>Loan Account / Borrower</span>
                <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>
                  {loan?.borrower_name || 'Borrower'} ({loan?.loan_account_no || 'LN-NEW'})
                </strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block' }}>Net Disbursal Required</span>
                <strong style={{ fontSize: '1.05rem', color: '#15803D', fontFamily: 'monospace' }}>
                  ₹{netDisbursed.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
            {totalDeductions > 0 && (
              <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed #E2E8F0', fontSize: '0.72rem', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
                <span>Gross Principal: ₹{principal.toLocaleString('en-IN')}</span>
                <span>Deductions (Fee/EMI): -₹{totalDeductions.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          {/* Row 1: Disbursing Branch & Date */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, marginBottom: 14 }}>
            <div style={{ minWidth: 0 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                Disbursing Branch
              </label>
              <DropdownSelect
                value={branch}
                onChange={(e) => handleBranchChange(e.target.value)}
                buttonStyle={{ height: 36 }}
                options={branchesList.map(b => ({
                  value: b.name,
                  label: b.name
                }))}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                Disbursal Date
              </label>
              <SharedDatePicker
                required
                value={disbursalDate}
                onChange={(e) => setDisbursalDate(e.target.value)}
                buttonStyle={{ height: 36 }}
              />
            </div>
          </div>

          {/* Row 2: Payment Mode Channel Toggle */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', margin: 0 }}>
                Payment Channel / Mode
              </label>
              <button
                type="button"
                onClick={fetchLiveBalances}
                disabled={loadingBalances}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  padding: 0
                }}
                title="Refresh Live Balances"
              >
                <RefreshCw style={{ width: 12, height: 12, animation: loadingBalances ? 'spin 1s linear infinite' : 'none' }} />
                {loadingBalances ? 'Checking...' : 'Refresh Balance'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <button
                type="button"
                onClick={() => handleModeChange('CASH')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  height: 38,
                  borderRadius: 6,
                  border: paymentMode === 'CASH' ? '2px solid #15803D' : '1px solid #CBD5E1',
                  background: paymentMode === 'CASH' ? '#F0FEF5' : '#FFFFFF',
                  color: paymentMode === 'CASH' ? '#15803D' : '#475569',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Wallet style={{ width: 14, height: 14 }} /> Cash (Vault)
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('BANK')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  height: 38,
                  borderRadius: 6,
                  border: paymentMode === 'BANK' ? '2px solid #2563EB' : '1px solid #CBD5E1',
                  background: paymentMode === 'BANK' ? '#EFF6FF' : '#FFFFFF',
                  color: paymentMode === 'BANK' ? '#2563EB' : '#475569',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Landmark style={{ width: 14, height: 14 }} /> Bank / Online
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('CHEQUE')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  height: 38,
                  borderRadius: 6,
                  border: paymentMode === 'CHEQUE' ? '2px solid #7C3AED' : '1px solid #CBD5E1',
                  background: paymentMode === 'CHEQUE' ? '#F5F3FF' : '#FFFFFF',
                  color: paymentMode === 'CHEQUE' ? '#7C3AED' : '#475569',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <FileText style={{ width: 14, height: 14 }} /> Cheque
              </button>
            </div>
          </div>

          {/* Row 3: Source Account & Reference */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 12, marginBottom: 14 }}>
            <div style={{ minWidth: 0 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                Source Account (Cash Vault / Bank A/C)
              </label>
              <DropdownSelect
                value={sourceAccountCode}
                onChange={(e) => handleBankSelect(e.target.value)}
                buttonStyle={{ height: 36 }}
                options={
                  paymentMode === 'CASH'
                    ? cashAccounts.map(a => ({
                        value: a.code,
                        label: `${a.name || 'Cash in Hand'} · Bal: ₹${(accountBalances[a.code] ?? a.balance ?? 0).toLocaleString('en-IN')}`
                      }))
                    : [
                        ...branchBankAccounts.map(a => ({
                          value: a.code,
                          label: `${a.name} · Bal: ₹${(accountBalances[a.code] ?? a.raw?.balance ?? 0).toLocaleString('en-IN')}`
                        })),
                        ...otherBankAccounts.map(a => ({
                          value: a.code,
                          label: `${a.name}${a.branch ? ` (${a.branch})` : ''} · Bal: ₹${(accountBalances[a.code] ?? a.raw?.balance ?? 0).toLocaleString('en-IN')}`
                        }))
                      ]
                }
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                {paymentMode === 'CHEQUE' ? 'Cheque Number' : 'Ref / UTR Number (Optional)'}
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder={paymentMode === 'CHEQUE' ? 'e.g. CHQ-40291' : 'e.g. UTR-9876543'}
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 10px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.78rem',
                  color: '#0F172A',
                  background: '#FFFFFF',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* ── Real-Time Available Balance Check Panel ── */}
          <div style={{
            background: isInsufficient ? '#FFF1F2' : '#F0FDF4',
            border: isInsufficient ? '1px solid #FECDD3' : '1px solid #BBF7D0',
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {paymentMode === 'CASH' ? (
                  <Wallet style={{ width: 15, height: 15, color: isInsufficient ? '#E11D48' : '#16A34A' }} />
                ) : (
                  <Landmark style={{ width: 15, height: 15, color: isInsufficient ? '#E11D48' : '#16A34A' }} />
                )}
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isInsufficient ? '#9F1239' : '#166534', textTransform: 'uppercase' }}>
                  {paymentMode === 'CASH' ? 'Cash Vault Liquidity Check' : 'Bank Balance Liquidity Check'}
                </span>
              </div>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
                background: isInsufficient ? '#FFE4E6' : '#DCFCE7',
                color: isInsufficient ? '#BE123C' : '#15803D',
                border: isInsufficient ? '1px solid #FDA4AF' : '1px solid #86EFAC'
              }}>
                {isInsufficient ? 'INSUFFICIENT FUNDS' : 'FUNDS AVAILABLE'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
              <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.64rem', color: '#64748B', display: 'block' }}>Available Balance</span>
                <strong style={{ fontSize: '0.86rem', color: isInsufficient ? '#E11D48' : '#0F172A', fontFamily: 'monospace' }}>
                  ₹{availableBalance.toLocaleString('en-IN')}
                </strong>
              </div>

              <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.64rem', color: '#64748B', display: 'block' }}>Required Net Disbursal</span>
                <strong style={{ fontSize: '0.86rem', color: '#0F172A', fontFamily: 'monospace' }}>
                  ₹{netDisbursed.toLocaleString('en-IN')}
                </strong>
              </div>

              <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.64rem', color: '#64748B', display: 'block' }}>
                  {isInsufficient ? 'Shortfall' : 'Projected Balance'}
                </span>
                <strong style={{ fontSize: '0.86rem', color: isInsufficient ? '#E11D48' : '#16A34A', fontFamily: 'monospace' }}>
                  {isInsufficient ? `-₹${Math.abs(balanceAfterDisbursal).toLocaleString('en-IN')}` : `₹${balanceAfterDisbursal.toLocaleString('en-IN')}`}
                </strong>
              </div>
            </div>

            {/* Explanatory Banner */}
            {isInsufficient ? (
              <div style={{
                marginTop: 10,
                padding: '10px 14px',
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: 8,
                fontSize: '0.74rem',
                color: '#92400E',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1, color: '#D97706' }} />
                  <div>
                    <strong>{loan?.status === 'PENDING_DISBURSAL' ? 'Disbursal On Hold (Awaiting Funds):' : 'No Funds Available for Disbursal:'}</strong> Required net disbursal of <strong>₹{netDisbursed.toLocaleString('en-IN')}</strong> exceeds available balance of <strong>₹{availableBalance.toLocaleString('en-IN')}</strong> in {currentAccount?.name || 'Selected Account'}.
                    <div style={{ marginTop: 3, color: '#78350F' }}>
                      {loan?.status === 'PENDING_DISBURSAL'
                        ? 'This application is in the Disbursement Pending stage. You can disburse once funds are replenished into vault/bank, or select another funded account.'
                        : 'You can move this loan to the Disbursement Pending stage until funds are deposited into vault or bank.'}
                    </div>
                  </div>
                </div>

                {onMarkPendingDisbursal && loan?.status !== 'PENDING_DISBURSAL' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleMoveToPendingDisbursal}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 12px',
                        background: '#D97706',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: submitting ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Clock style={{ width: 13, height: 13 }} />
                      <span>{submitting ? 'Updating...' : 'Move to Disbursement Pending Stage'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span>Account has adequate funds. Disbursing will transfer funds to the borrower.</span>
              </div>
            )}
          </div>

          {/* Live Double-Entry Voucher Preview */}
          <div style={{
            background: '#F8FAFC',
            border: '1px dashed #CBD5E1',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 20
          }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Automatic Accounting Entry Preview
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: '0.74rem', color: '#334155', marginBottom: 3 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Debit: Loan Receivables Portfolio</span>
              <strong style={{ flexShrink: 0 }}>₹{principal.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: '0.74rem', color: '#334155', marginBottom: totalDeductions > 0 ? 3 : 0 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Credit: {currentAccount?.name || (paymentMode === 'CASH' ? 'Cash in Hand' : 'Bank Account')} ({branch}) {totalDeductions > 0 ? '[Net Disbursed]' : ''}</span>
              <strong style={{ flexShrink: 0 }}>₹{netDisbursed.toLocaleString('en-IN')}</strong>
            </div>
            {processingFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: '0.74rem', color: '#334155', marginBottom: advanceEmi > 0 ? 3 : 0 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Credit: Processing Fee Income (Deducted at Source)</span>
                <strong style={{ flexShrink: 0 }}>₹{processingFee.toLocaleString('en-IN')}</strong>
              </div>
            )}
            {advanceEmi > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: '0.74rem', color: '#334155' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Credit: Advance EMI / Member Deposits (Deducted at Source)</span>
                <strong style={{ flexShrink: 0 }}>₹{advanceEmi.toLocaleString('en-IN')}</strong>
              </div>
            )}
          </div>

          </div>

          {/* Pinned Modal Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            padding: '14px 20px',
            borderTop: '1px solid #E2E8F0',
            background: '#F8FAFC',
            flexShrink: 0
          }}>
            <div>
              {isInsufficient && onMarkPendingDisbursal && loan?.status !== 'PENDING_DISBURSAL' && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleMoveToPendingDisbursal}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid #FDE68A',
                    background: '#FEF3C7',
                    color: '#92400E',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Clock style={{ width: 14, height: 14 }} />
                  <span>{submitting ? 'Updating...' : 'Move to Disbursement Pending'}</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting || isInsufficient}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: 'none',
                  background: isInsufficient ? '#94A3B8' : 'var(--brand-primary, #15803D)',
                  color: '#FFFFFF',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: (submitting || isInsufficient) ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1
                }}
                title={isInsufficient ? 'Cannot disburse due to insufficient balance' : 'Confirm and disburse loan'}
              >
                <Check style={{ width: 14, height: 14 }} />
                {submitting
                  ? 'Disbursing & Posting Voucher...'
                  : isInsufficient
                    ? 'Cannot Disburse (Insufficient Funds)'
                    : 'Confirm & Disburse Loan'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
