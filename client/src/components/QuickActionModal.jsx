import React, { useState } from 'react';
import { X, Plus, UserPlus, CreditCard, BookOpen, ArrowRight } from 'lucide-react';

export default function QuickActionModal({ type, isOpen, onClose, onSubmit, expenseCategories = [] }) {
  if (!isOpen) return null;

  const [form, setForm] = useState({
    name: '',
    phone: '',
    aadhaar: '',
    pan: '',
    payee: '',
    category: expenseCategories[0]?.name || '',
    amount: '',
    notes: '',
    type: 'CASH_IN'
  });

  const selectedCategory = expenseCategories.find(c => c.name === form.category);
  const requiresApproval = type === 'EXPENSE' && selectedCategory && Number(form.amount) > selectedCategory.approval_threshold;

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(type, form);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch(type) {
      case 'BORROWER': return 'Add New Customer Master';
      case 'EXPENSE': return 'Record Expense Voucher';
      case 'CASH_ENTRY': return 'Record Cash Book Entry';
      default: return 'Quick Action Entry';
    }
  };

  const getIcon = () => {
    switch(type) {
      case 'BORROWER': return UserPlus;
      case 'EXPENSE': return CreditCard;
      case 'CASH_ENTRY': return BookOpen;
      default: return Plus;
    }
  };

  const IconComp = getIcon();

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card">
        
        {/* Header */}
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge">
              <IconComp style={{ width: 18, height: 18 }} />
            </div>
            <div className="head-titles">
              <h3>{getTitle()}</h3>
              <p>Enter record details below</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button">
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="saas-modal-body">
            
            {type === 'BORROWER' && (
              <>
                <div className="form-group">
                  <label>Customer Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Ramesh Chandra"
                    className="input-control"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Mobile Phone</label>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="10-digit number"
                      className="input-control mono"
                    />
                  </div>

                  <div className="form-group">
                    <label>Aadhaar No</label>
                    <input
                      type="text"
                      value={form.aadhaar}
                      onChange={(e) => setForm({ ...form, aadhaar: e.target.value })}
                      placeholder="12-digit Aadhaar"
                      className="input-control mono"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>PAN Card Number</label>
                  <input
                    type="text"
                    value={form.pan}
                    onChange={(e) => setForm({ ...form, pan: e.target.value })}
                    placeholder="10-character PAN"
                    className="input-control mono"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              </>
            )}

            {type === 'EXPENSE' && (
              <>
                <div className="form-group">
                  <label>Payee</label>
                  <input
                    type="text"
                    required
                    value={form.payee}
                    onChange={(e) => setForm({ ...form, payee: e.target.value })}
                    placeholder="e.g. Indian Oil Fuel Pump"
                    className="input-control"
                  />
                </div>

                <div className="form-group">
                  <label>Expense Head Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="input-control"
                  >
                    {expenseCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Voucher Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    className="input-control mono"
                  />
                </div>

                {requiresApproval && (
                  <div className="form-alert form-alert--warning">
                    Amount exceeds the ₹{selectedCategory.approval_threshold.toLocaleString('en-IN')} threshold for {selectedCategory.name} — this voucher will be marked Pending Approval.
                  </div>
                )}

                <div className="form-group">
                  <label>Expense Notes / Remarks</label>
                  <textarea
                    rows="2"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Describe expense details..."
                    className="input-control"
                    style={{ height: 'auto', padding: '8px 12px' }}
                  />
                </div>
              </>
            )}

            {type === 'CASH_ENTRY' && (
              <>
                <div className="form-group">
                  <label>Entry Type</label>
                  <div className="segmented-switch">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'CASH_IN' })}
                      className={`seg-btn ${form.type === 'CASH_IN' ? 'active' : ''}`}
                    >
                      Cash In (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'CASH_OUT' })}
                      className={`seg-btn ${form.type === 'CASH_OUT' ? 'active' : ''}`}
                    >
                      Cash Out (-)
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Transaction Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    className="input-control mono"
                  />
                </div>

                <div className="form-group">
                  <label>Ledger Particulars / Narration</label>
                  <textarea
                    rows="2"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Enter narration for cash book..."
                    className="input-control"
                    style={{ height: 'auto', padding: '8px 12px' }}
                  />
                </div>
              </>
            )}

          </div>

          {/* Footer */}
          <div className="saas-modal-footer">
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? (
                <>
                  <span className="loader loader--white"></span>
                  <span>Saving Record...</span>
                </>
              ) : (
                <>
                  <span>Save Record</span>
                  <ArrowRight style={{ width: 14, height: 14 }} />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
