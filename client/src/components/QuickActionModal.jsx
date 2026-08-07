import React, { useState } from 'react';
import { X, Plus, UserPlus, CreditCard, BookOpen, ArrowRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

function tp(t, key, vars) {
  let str = t(key);
  Object.keys(vars || {}).forEach(k => {
    str = str.replace(`{${k}}`, vars[k]);
  });
  return str;
}

export default function QuickActionModal({ type, isOpen, onClose, onSubmit, expenseCategories = [] }) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  const activeCategories = expenseCategories.filter(c => c.status === 'ACTIVE');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    aadhaar: '',
    pan: '',
    payee: '',
    category_id: activeCategories[0]?.id || '',
    amount: '',
    notes: '',
    type: 'CASH_IN'
  });

  const selectedCategory = expenseCategories.find(c => String(c.id) === String(form.category_id));
  const amountEntered = Number(form.amount) || 0;
  const insufficientBalance = type === 'EXPENSE' && selectedCategory && amountEntered > selectedCategory.balance;
  const canSubmitExpense = type !== 'EXPENSE' || (selectedCategory && amountEntered > 0 && !insufficientBalance);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (type === 'EXPENSE' && !canSubmitExpense) return;
    setLoading(true);
    setError('');
    try {
      await onSubmit(type, form);
      onClose();
    } catch (err) {
      setError(err.message || t('qa.err_save_generic'));
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch(type) {
      case 'BORROWER': return t('qa.title_borrower');
      case 'EXPENSE': return t('qa.title_expense');
      case 'CASH_ENTRY': return t('qa.title_cash_entry');
      default: return t('qa.title_default');
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
              <p>{t('qa.subtitle')}</p>
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
                  <label>{t('qa.customer_full_name')}</label>
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
                    <label>{t('qa.mobile_phone')}</label>
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
                    <label>{t('qa.aadhaar_no')}</label>
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
                  <label>{t('qa.pan_card_number')}</label>
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
                  <label>{t('qa.payee')}</label>
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
                  <label>{t('qa.expense_account_category')}</label>
                  {activeCategories.length === 0 ? (
                    <div className="form-alert form-alert--warning">
                      {t('qa.no_active_expense_accounts')}
                    </div>
                  ) : (
                    <select
                      value={form.category_id}
                      onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                      className="input-control"
                    >
                      {activeCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name} — ₹{cat.balance.toLocaleString('en-IN')} {t('qa.available_suffix')}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label>{t('qa.voucher_amount_rs')}</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    className="input-control mono"
                  />
                  {selectedCategory && (
                    <span style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 4, display: 'block' }}>
                      {t('qa.available_balance_prefix')} ₹{selectedCategory.balance.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                {insufficientBalance && (
                  <div className="form-alert form-alert--warning">
                    {t('qa.exceeds_balance_prefix')} (₹{selectedCategory.balance.toLocaleString('en-IN')}) {tp(t, 'qa.exceeds_balance_suffix', { name: selectedCategory.name })}
                  </div>
                )}

                {error && (
                  <div className="form-alert form-alert--error">{error}</div>
                )}

                <div className="form-group">
                  <label>{t('qa.expense_notes_remarks')}</label>
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
                  <label>{t('qa.entry_type')}</label>
                  <div className="segmented-switch">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'CASH_IN' })}
                      className={`seg-btn ${form.type === 'CASH_IN' ? 'active' : ''}`}
                    >
                      {t('qa.cash_in')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'CASH_OUT' })}
                      className={`seg-btn ${form.type === 'CASH_OUT' ? 'active' : ''}`}
                    >
                      {t('qa.cash_out')}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>{t('qa.transaction_amount_rs')}</label>
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
                  <label>{t('qa.ledger_particulars')}</label>
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
              {t('btn.cancel')}
            </button>
            <button type="submit" disabled={loading || (type === 'EXPENSE' && !canSubmitExpense)} className="btn-submit">
              {loading ? (
                <>
                  <span className="loader loader--white"></span>
                  <span>{t('qa.saving_record')}</span>
                </>
              ) : (
                <>
                  <span>{t('qa.save_record')}</span>
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
