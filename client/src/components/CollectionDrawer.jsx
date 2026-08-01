import React, { useState, useEffect } from 'react';
import { X, Receipt, CheckCircle2, ShieldCheck, ArrowRight, User } from 'lucide-react';

export default function CollectionDrawer({ isOpen, onClose, loan, allLoans = [], onSubmit }) {
  if (!isOpen) return null;

  const activeLoansList = (allLoans && allLoans.length > 0)
    ? allLoans.filter(l => l.status === 'ACTIVE' || l.status === 'OVERDUE')
    : (loan ? [loan] : []);

  const [selectedLoanId, setSelectedLoanId] = useState(loan?.id || activeLoansList[0]?.id);
  
  const currentLoan = activeLoansList.find(l => l.id === Number(selectedLoanId)) || loan || activeLoansList[0];

  useEffect(() => {
    if (loan) {
      setSelectedLoanId(loan.id);
    }
  }, [loan]);

  if (!currentLoan) return null;

  // Monthly Rate & Daily Rate Calculations
  const monthlyRatePct = currentLoan.monthly_interest_rate || 2.0;
  const dailyRatePct = monthlyRatePct / 30;

  // Calculate interest due for current period
  const interestDue = Math.round((currentLoan.pending_amount || 0) * (dailyRatePct / 100) * 30);

  // Flexible Collection Mode state
  const [collectionType, setCollectionType] = useState('PRINCIPAL_AND_INTEREST');
  const [principalAmountPaid, setPrincipalAmountPaid] = useState(currentLoan.installment_amount || 500);
  const [interestAmountPaid, setInterestAmountPaid] = useState(interestDue);
  const [penalty, setPenalty] = useState(0);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // Reset form inputs when currentLoan changes
  useEffect(() => {
    if (currentLoan) {
      setPrincipalAmountPaid(currentLoan.installment_amount || 500);
      setInterestAmountPaid(Math.round((currentLoan.pending_amount || 0) * (dailyRatePct / 100) * 30));
      setReceipt(null);
    }
  }, [selectedLoanId]);

  // Compute dynamic amounts
  const pPaid = collectionType === 'INTEREST_ONLY' ? 0 : (parseFloat(principalAmountPaid) || 0);
  const iPaid = parseFloat(interestAmountPaid) || 0;
  const penPaid = parseFloat(penalty) || 0;

  const totalReceived = pPaid + iPaid + penPaid;
  const newPrincipalBalance = Math.max(0, (currentLoan.pending_amount || 0) - pPaid);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalReceived <= 0) return;

    setLoading(true);
    try {
      const res = await onSubmit({
        loan_id: currentLoan.id,
        amount: totalReceived,
        principal_portion: pPaid,
        interest_portion: iPaid,
        penalty: penPaid,
        new_principal_balance: newPrincipalBalance,
        payment_mode: paymentMode,
        collection_type: collectionType,
        notes: remarks
      });

      setReceipt(res?.data || {
        receipt_no: `REC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`,
        principalPaid: pPaid,
        interestPaid: iPaid,
        penalty: penPaid,
        newPrincipalBalance,
        payment_mode: paymentMode,
        collection_date: new Date().toISOString().slice(0, 10)
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card">
        
        {/* Header */}
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: '#ECFDF5', color: '#059669' }}>
              <Receipt style={{ width: 18, height: 18 }} />
            </div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600 }}>Record Payment Collection</h3>
              <p style={{ fontWeight: 400 }}>Loan Account: <strong style={{ color: '#059669', fontFamily: 'monospace' }}>{currentLoan.loan_account_no}</strong></p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button">
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Borrower Account Selection Dropdown if multiple loans available */}
        {activeLoansList.length > 1 && (
          <div style={{ padding: '12px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <label style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Select Borrower Loan Account
            </label>
            <select
              value={selectedLoanId}
              onChange={(e) => setSelectedLoanId(Number(e.target.value))}
              style={{
                width: '100%',
                height: 38,
                padding: '0 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                fontSize: '0.82rem',
                color: '#0F172A',
                fontWeight: 500
              }}
            >
              {activeLoansList.map(l => (
                <option key={l.id} value={l.id}>
                  {l.borrower_name} ({l.loan_account_no}) — Outstanding: ₹{fmt(l.pending_amount)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Borrower Overview Banner */}
        <div className="saas-modal-banner">
          <div className="banner-top">
            <div>
              <div className="borrower-name" style={{ fontWeight: 600 }}>{currentLoan.borrower_name}</div>
              <div className="borrower-sub" style={{ fontWeight: 400 }}>{currentLoan.phone} • {currentLoan.branch || 'Main Branch'}</div>
            </div>
            <span className={`status-badge ${currentLoan.status === 'ACTIVE' ? 'status-badge--active' : 'status-badge--overdue'}`} style={{ fontWeight: 500 }}>
              {currentLoan.status}
            </span>
          </div>

          <div className="banner-stats">
            <div className="stat-col">
              <span>Disbursed</span>
              <strong style={{ fontWeight: 600 }}>₹{fmt(currentLoan.principal_amount)}</strong>
            </div>
            <div className="stat-col">
              <span>Collected</span>
              <strong className="green" style={{ fontWeight: 600 }}>₹{fmt(currentLoan.collected_amount)}</strong>
            </div>
            <div className="stat-col">
              <span>Pending Balance</span>
              <strong className="orange" style={{ fontWeight: 600 }}>₹{fmt(currentLoan.pending_amount)}</strong>
            </div>
          </div>
        </div>

        {/* Modal Form Body */}
        {receipt ? (
          <div className="saas-modal-body" style={{ textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <CheckCircle2 style={{ width: 24, height: 24 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>Collection Recorded Successfully!</h4>
              <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4, fontWeight: 400 }}>Receipt No: <strong style={{ color: '#059669', fontFamily: 'monospace' }}>{receipt.receipt_no}</strong></p>
            </div>

            <div className="summary-card">
              <div className="summary-row">
                <span>Borrower:</span>
                <strong style={{ fontWeight: 600 }}>{currentLoan.borrower_name}</strong>
              </div>
              <div className="summary-row">
                <span>Amount Received:</span>
                <strong className="lg" style={{ fontWeight: 600 }}>₹{fmt(receipt.amount || totalReceived)}</strong>
              </div>
              <div className="summary-divider" />
              <div className="summary-row">
                <span>Payment Mode:</span>
                <strong style={{ fontWeight: 500 }}>{receipt.payment_mode || paymentMode}</strong>
              </div>
              <div className="summary-row">
                <span>New Outstanding Balance:</span>
                <strong className="orange" style={{ fontWeight: 600 }}>₹{fmt(newPrincipalBalance)}</strong>
              </div>
            </div>

            <button
              onClick={onClose}
              className="btn-submit"
              style={{ width: '100%', marginTop: 16, background: '#059669', fontWeight: 500 }}
            >
              Done & Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div className="saas-modal-body">
              
              {/* Collection Type Segmented Switch */}
              <div className="form-group">
                <label style={{ fontWeight: 500 }}>Collection Mode</label>
                <div className="segmented-control">
                  <button
                    type="button"
                    onClick={() => setCollectionType('PRINCIPAL_AND_INTEREST')}
                    className={`seg-btn ${collectionType === 'PRINCIPAL_AND_INTEREST' ? 'active' : ''}`}
                    style={{ fontWeight: 500 }}
                  >
                    Principal + Interest
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectionType('INTEREST_ONLY')}
                    className={`seg-btn ${collectionType === 'INTEREST_ONLY' ? 'active' : ''}`}
                    style={{ fontWeight: 500 }}
                  >
                    Interest Only
                  </button>
                </div>
              </div>

              <div className="form-row">
                {collectionType !== 'INTEREST_ONLY' && (
                  <div className="form-group">
                    <label style={{ fontWeight: 500 }}>Principal Amount (₹)</label>
                    <input
                      type="number"
                      value={principalAmountPaid}
                      onChange={(e) => setPrincipalAmountPaid(e.target.value)}
                      className="input-control mono"
                      placeholder="0.00"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label style={{ fontWeight: 500 }}>Interest Portion (₹)</label>
                  <input
                    type="number"
                    value={interestAmountPaid}
                    onChange={(e) => setInterestAmountPaid(e.target.value)}
                    className="input-control mono"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label style={{ fontWeight: 500 }}>Late Penalty / Fine (₹)</label>
                  <input
                    type="number"
                    value={penalty}
                    onChange={(e) => setPenalty(e.target.value)}
                    className="input-control mono"
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 500 }}>Payment Method</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="input-control"
                    style={{ fontWeight: 500 }}
                  >
                    <option value="CASH">CASH (Branch Vault / Agent)</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="BANK_TRANSFER">Bank NEFT / RTGS</option>
                    <option value="CHEQUE">Cheque Clearance</option>
                  </select>
                </div>
              </div>

              {/* Total Calculation Strip */}
              <div className="metric-strip">
                <div className="metric-col">
                  <span>Total Received</span>
                  <strong className="green" style={{ fontWeight: 600 }}>₹{fmt(totalReceived)}</strong>
                </div>
                <div className="metric-col">
                  <span>New Outstanding Balance</span>
                  <strong className="orange" style={{ fontWeight: 600 }}>₹{fmt(newPrincipalBalance)}</strong>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="saas-modal-footer">
              <button type="button" onClick={onClose} className="btn-cancel" style={{ fontWeight: 500 }}>
                Cancel
              </button>
              <button type="submit" disabled={loading || totalReceived <= 0} className="btn-submit" style={{ background: '#059669', fontWeight: 500 }}>
                {loading ? 'Recording...' : 'Confirm Payment & Issue Receipt'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
