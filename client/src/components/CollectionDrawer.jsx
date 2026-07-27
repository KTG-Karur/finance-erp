import React, { useState } from 'react';
import { X, Receipt, Printer, CheckCircle, Percent, Wallet } from 'lucide-react';

export default function CollectionDrawer({ isOpen, onClose, loan, onSubmit }) {
  if (!isOpen || !loan) return null;

  // Monthly Rate & Daily Rate Calculations
  const monthlyRatePct = loan.monthly_interest_rate || 2.0; // Default 2% per month
  const dailyRatePct = monthlyRatePct / 30; // Daily Rate %

  // Calculate interest due for current period
  const interestDue = Math.round(loan.pending_amount * (dailyRatePct / 100) * 30); // 1 Month Interest
  const dailyInterestDue = Math.round(loan.pending_amount * (dailyRatePct / 100)); // 1 Day Interest

  // Flexible Collection Mode state: 'PRINCIPAL_AND_INTEREST' vs 'INTEREST_ONLY'
  const [collectionType, setCollectionType] = useState('PRINCIPAL_AND_INTEREST');

  const [principalAmountPaid, setPrincipalAmountPaid] = useState(loan.installment_amount || 500);
  const [interestAmountPaid, setInterestAmountPaid] = useState(interestDue);
  const [penalty, setPenalty] = useState(0);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // Compute dynamic amounts
  const pPaid = collectionType === 'INTEREST_ONLY' ? 0 : (parseFloat(principalAmountPaid) || 0);
  const iPaid = parseFloat(interestAmountPaid) || 0;
  const penPaid = parseFloat(penalty) || 0;

  const totalReceived = pPaid + iPaid + penPaid;

  // Calculate NEW principal outstanding after principal knock-off
  const newPrincipalBalance = Math.max(0, loan.pending_amount - pPaid);

  // Recalculate NEW daily interest on reduced principal balance
  const newDailyInterestAmt = Math.round(newPrincipalBalance * (dailyRatePct / 100));
  const newMonthlyInterestAmt = Math.round(newPrincipalBalance * (monthlyRatePct / 100));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalReceived <= 0) return;

    setLoading(true);
    try {
      const res = await onSubmit({
        loan_id: loan.id,
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
        totalReceived,
        newPrincipalBalance,
        newDailyInterestAmt,
        payment_mode: paymentMode,
        date: new Date().toLocaleDateString('en-IN')
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDone = () => {
    setReceipt(null);
    setRemarks('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end font-sans">
      <div className="w-full max-w-md bg-white border-l border-gray-200 text-gray-900 flex flex-col h-full shadow-2xl">
        {/* Drawer Header */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-blue-600" />
            <div>
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Flexible Collection Voucher</h2>
              <p className="text-[10px] font-mono text-gray-500">Account: <span className="text-blue-700 font-bold">{loan.loan_account_no}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-900 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        {receipt ? (
          /* Official Receipt Output */
          <div className="flex-1 p-4 flex flex-col justify-between overflow-y-auto">
            <div id="printable-receipt" className="bg-white border border-gray-200 rounded p-4 space-y-3 font-mono text-xs shadow-xs">
              <div className="text-center border-b border-gray-200 pb-2">
                <h3 className="text-xs font-bold text-gray-900 uppercase">OFFICIAL COLLECTION RECEIPT</h3>
                <p className="text-[10px] text-gray-500">FINANCIAL ERP PLATFORM • BRANCH RECOVERY</p>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Receipt No:</span>
                  <span className="text-blue-700 font-bold">{receipt.receipt_no}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Borrower:</span>
                  <span className="text-gray-900 font-bold">{loan.borrower_name}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Principal Portion Paid:</span>
                  <span className="text-gray-900 font-bold tabular-nums">₹{receipt.principalPaid.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Interest Portion Paid:</span>
                  <span className="text-emerald-700 font-bold tabular-nums">₹{receipt.interestPaid.toLocaleString('en-IN')}</span>
                </div>
                {receipt.penalty > 0 && (
                  <div className="flex justify-between border-b border-gray-100 pb-1">
                    <span className="text-gray-500">Late Penalty Fee:</span>
                    <span className="text-red-700 font-bold tabular-nums">₹{receipt.penalty.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1 text-xs border-t border-gray-200">
                  <span className="text-gray-600">Total Received:</span>
                  <span className="text-emerald-700 tabular-nums text-sm">₹{receipt.totalReceived.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Recalculated Principal & Daily Interest Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5 space-y-1 text-[11px] font-mono text-emerald-900">
                <div className="flex justify-between">
                  <span>New Principal Outstanding:</span>
                  <span className="font-bold">₹{receipt.newPrincipalBalance.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-purple-800">
                  <span>New Recalculated Daily Interest:</span>
                  <span className="font-bold">₹{receipt.newDailyInterestAmt} / day</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-gray-200">
              <button
                onClick={handlePrint}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded text-xs flex items-center justify-center space-x-2 border border-gray-300"
              >
                <Printer className="w-4 h-4 text-gray-600" />
                <span>Print Official Receipt</span>
              </button>

              <button
                onClick={handleDone}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs shadow-sm"
              >
                Done & Return
              </button>
            </div>
          </div>
        ) : (
          /* Collection Form */
          <form onSubmit={handleSubmit} className="flex-1 p-4 flex flex-col justify-between space-y-3 overflow-y-auto font-sans text-xs">
            <div className="space-y-3">
              {/* Current Account Summary Box */}
              <div className="bg-gray-50 border border-gray-200 rounded p-3 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span className="text-gray-500">Borrower:</span>
                  <span className="text-gray-900 font-bold">{loan.borrower_name}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span className="text-gray-500">Current Principal Balance:</span>
                  <span className="text-amber-800 font-bold tabular-nums">₹{loan.pending_amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span className="text-gray-500">Interest Rate:</span>
                  <span className="text-blue-700 font-bold">{monthlyRatePct}% / month ({dailyRatePct.toFixed(4)}% / day)</span>
                </div>
                <div className="flex justify-between text-gray-900 font-bold pt-0.5">
                  <span className="text-gray-600">Current Daily Interest:</span>
                  <span className="text-emerald-700 tabular-nums">₹{dailyInterestDue} / day</span>
                </div>
              </div>

              {/* Collection Mode Selector (Interest-Only vs Principal + Interest) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-gray-600">Collection Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCollectionType('INTEREST_ONLY')}
                    className={`py-2 px-2 rounded border text-left flex items-center space-x-1.5 transition cursor-pointer ${
                      collectionType === 'INTEREST_ONLY'
                        ? 'bg-blue-600 text-white font-bold border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" />
                    <span>Interest Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCollectionType('PRINCIPAL_AND_INTEREST')}
                    className={`py-2 px-2 rounded border text-left flex items-center space-x-1.5 transition cursor-pointer ${
                      collectionType === 'PRINCIPAL_AND_INTEREST'
                        ? 'bg-blue-600 text-white font-bold border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Principal + Interest</span>
                  </button>
                </div>
              </div>

              {/* Input: Interest Portion Paid */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-gray-600">Interest Amount Collected (₹)</label>
                <input
                  type="number"
                  value={interestAmountPaid}
                  onChange={(e) => setInterestAmountPaid(e.target.value)}
                  required
                  className="w-full bg-white border border-gray-200 rounded p-2 text-xs font-mono text-emerald-700 font-bold focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Input: Principal Portion Paid (if Principal + Interest mode) */}
              {collectionType === 'PRINCIPAL_AND_INTEREST' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-gray-600">Principal Amount Collected (₹)</label>
                  <input
                    type="number"
                    value={principalAmountPaid}
                    onChange={(e) => setPrincipalAmountPaid(e.target.value)}
                    required
                    max={loan.pending_amount}
                    className="w-full bg-white border border-gray-200 rounded p-2 text-xs font-mono text-gray-900 font-bold focus:outline-none focus:border-blue-600"
                  />
                </div>
              )}

              {/* Input: Late Penalty */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-gray-600">Late Fine Penalty (₹)</label>
                <input
                  type="number"
                  value={penalty}
                  onChange={(e) => setPenalty(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded p-2 text-xs font-mono text-red-600 font-bold focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Input: Payment Mode */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-gray-600">Payment Method</label>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  {['CASH', 'UPI', 'BANK'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`py-1.5 px-2 rounded text-xs font-bold border transition ${
                        paymentMode === mode
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recalculated Dynamic Principal & New Daily Interest Preview Box */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded p-2.5 space-y-1 text-xs font-mono text-emerald-900">
                <div className="flex justify-between">
                  <span>Total Payment Received:</span>
                  <span className="font-bold text-sm">₹{totalReceived.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-t border-emerald-200 pt-1 text-gray-700">
                  <span>New Principal Outstanding:</span>
                  <span className="font-bold text-gray-900">₹{newPrincipalBalance.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-purple-800">
                  <span>New Daily Interest (From Tomorrow):</span>
                  <span className="font-bold">₹{newDailyInterestAmt} / day</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading || totalReceived <= 0}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded flex items-center justify-center space-x-2 transition shadow-sm"
              >
                <Receipt className="w-4 h-4" />
                <span>{loading ? 'Posting Collection...' : 'Post Collection & Recalculate Interest'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
