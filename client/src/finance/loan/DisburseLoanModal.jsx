import React, { useState, useMemo } from 'react';
import {
  Banknote,
  Building2,
  Calendar,
  Check,
  CreditCard,
  FileText,
  Landmark,
  ShieldCheck,
  Wallet,
  X
} from 'lucide-react';
import DropdownSelect from '../../components/DropdownSelect';
import SharedDatePicker from '../../components/common/SharedDatePicker';

export default function DisburseLoanModal({
  loan,
  branchesList = [],
  chartOfAccounts = [],
  bankAccounts = [],
  onConfirm,
  onClose
}) {
  const [branch, setBranch] = useState(loan?.branch || branchesList[0]?.name || 'Main Branch');
  const [paymentMode, setPaymentMode] = useState('CASH'); // 'CASH' | 'BANK' | 'CHEQUE'
  const [disbursalDate, setDisbursalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [transactionRef, setTransactionRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
      return bankAccounts.filter(b => b.is_active !== false).map(b => ({
        code: b.ledger_account_code || '1002',
        name: `${b.bank_name} - ${b.account_name || 'Current A/C'} (A/C: ...${(b.account_number || '').slice(-4)}) [IFSC: ${b.ifsc_code}]`,
        branch: b.branch || b.branch_name,
        raw: b
      }));
    }
    const list = assetAccounts.filter(a => (String(a.code) === '1002' || (a.name || '').toLowerCase().includes('bank')));
    return list.length ? list : [{ code: '1002', name: 'Primary Bank Account', branch: branch }];
  }, [assetAccounts, bankAccounts, branch]);

  // Selected source account code & name
  const [sourceAccountCode, setSourceAccountCode] = useState(
    paymentMode === 'CASH' ? cashAccounts[0]?.code : bankAccountsList[0]?.code
  );

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

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
        source_account_code: currentAccount?.code || (paymentMode === 'CASH' ? '1001' : '1002'),
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

  return (
    <div className="saas-modal-backdrop" style={{ zIndex: 9999 }}>
      <div className="saas-modal-card" style={{ maxWidth: 540, width: '100%', padding: 0, overflow: 'hidden' }}>
        
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #E2E8F0',
          background: '#FFFFFF'
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
                Select branch vault or bank source account for accounting voucher entry.
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          
          {/* Error Message */}
          {errorMsg && (
            <div style={{
              marginBottom: 14,
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: '0.78rem',
              background: '#FEF2F2',
              color: '#991B1B',
              border: '1px solid #FECACA'
            }}>
              {errorMsg}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block' }}>Loan Account / Borrower</span>
                <strong style={{ fontSize: '0.82rem', color: '#0F172A' }}>
                  {loan?.borrower_name || 'Borrower'} ({loan?.loan_account_no || 'LN-NEW'})
                </strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block' }}>Principal Amount</span>
                <strong style={{ fontSize: '1rem', color: '#15803D' }}>
                  ₹{principal.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          </div>

          {/* Row 1: Disbursing Branch & Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
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

            <div>
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
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
              Payment Channel / Mode
            </label>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                Credit Account (Negate Money)
              </label>
              <DropdownSelect
                value={sourceAccountCode}
                onChange={(e) => handleBankSelect(e.target.value)}
                buttonStyle={{ height: 36 }}
                options={
                  paymentMode === 'CASH'
                    ? cashAccounts.map(a => ({ value: a.code, label: `${a.code} - ${a.name}` }))
                    : [
                        ...branchBankAccounts.map(a => ({ value: a.code, label: `${a.code} - ${a.name} (${branch})` })),
                        ...otherBankAccounts.map(a => ({ value: a.code, label: `${a.code} - ${a.name} (${a.branch || 'General'})` }))
                      ]
                }
              />
            </div>

            <div>
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
                  background: '#FFFFFF'
                }}
              />
            </div>
          </div>

          {/* Live Double-Entry Voucher Preview */}
          <div style={{
            background: '#F0FDF4',
            border: '1px dashed #86EFAC',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 20
          }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Automatic General Ledger Entry Preview
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#14532D', marginBottom: 3 }}>
              <span>Debit: 1100 - Loan Receivables Portfolio</span>
              <strong>₹{principal.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#14532D', marginBottom: totalDeductions > 0 ? 3 : 0 }}>
              <span>Credit: {currentAccount?.code || '1001'} - {currentAccount?.name || (paymentMode === 'CASH' ? 'Cash in Hand' : 'Bank Account')} ({branch}) {totalDeductions > 0 ? '[Net Disbursed]' : ''}</span>
              <strong>₹{netDisbursed.toLocaleString('en-IN')}</strong>
            </div>
            {processingFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#14532D', marginBottom: advanceEmi > 0 ? 3 : 0 }}>
                <span>Credit: 4002 - Processing Fee Income (Deducted at Source)</span>
                <strong>₹{processingFee.toLocaleString('en-IN')}</strong>
              </div>
            )}
            {advanceEmi > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#14532D' }}>
                <span>Credit: 2001 - Advance EMI / Member Deposits (Deducted at Source)</span>
                <strong>₹{advanceEmi.toLocaleString('en-IN')}</strong>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
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
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1
              }}
            >
              <Check style={{ width: 14, height: 14 }} /> {submitting ? 'Disbursing & Posting Voucher...' : 'Confirm & Disburse Loan'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
