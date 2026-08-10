import React, { useState, useMemo } from 'react';
import { Users } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartStr() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
}

// One customer at a time, across every loan they have — every disbursal and every
// collection, in one list, so a manager can answer "what's this person's full
// history with us" without opening each loan separately.
export default function CustomerLedgerView({ borrowers = [], loans = [], collections = [], branchesList = [] }) {
  const { t } = useLanguage();
  const [branch, setBranch] = useState('');
  const hasBranchSelected = branch !== '';
  const [fromDate, setFromDate] = useState(monthStartStr());
  const [toDate, setToDate] = useState(todayStr());

  const branchBorrowers = useMemo(() => {
    if (branch === 'ALL') return borrowers;
    if (!branch) return [];
    return borrowers.filter(b => b.branch === branch);
  }, [borrowers, branch]);

  const [borrowerId, setBorrowerId] = useState('');
  const effectiveBorrowerId = branchBorrowers.some(b => b.id === borrowerId) ? borrowerId : '';
  const selectedBorrower = borrowers.find(b => b.id === effectiveBorrowerId) || null;

  const customerLoans = useMemo(
    () => (selectedBorrower ? loans.filter(l => l.borrower_id === selectedBorrower.id) : []),
    [selectedBorrower, loans]
  );

  const rows = useMemo(() => {
    if (!selectedBorrower) return [];
    const loanIds = customerLoans.map(l => l.id);
    const disbursalRows = customerLoans.map(l => ({
      id: `disbursal-${l.id}`,
      date: l.loan_date,
      loan_account_no: l.loan_account_no,
      voucher_no: '—',
      type: 'DISBURSAL',
      mode: '—',
      amount: l.principal_amount
    }));
    const collectionRows = collections
      .filter(c => loanIds.includes(c.loan_id))
      .map(c => ({
        id: c.id,
        date: c.collection_date,
        loan_account_no: c.loan_account_no,
        voucher_no: c.voucher_no || '—',
        type: 'COLLECTION',
        mode: c.payment_mode || '—',
        amount: c.amount
      }));
    return [...disbursalRows, ...collectionRows]
      .filter(row => (!fromDate || row.date >= fromDate) && (!toDate || row.date <= toDate))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [selectedBorrower, customerLoans, collections, fromDate, toDate]);

  const totalBorrowed = customerLoans.reduce((s, l) => s + (l.principal_amount || 0), 0);
  const totalCollected = customerLoans.reduce((s, l) => s + (l.collected_amount || 0), 0);
  const totalOutstanding = customerLoans.reduce((s, l) => s + (l.pending_amount || 0), 0);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  return (
    <div className="fin-page">
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', color: '#7C3AED' }}>
              <Users style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('nav.customer_ledger')}</h1>
              <p className="fin-page-header__subtitle">{t('fin.customer_ledger_subtitle')}</p>
            </div>
          </div>
        </div>

        <div className="fin-header-stats">
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('col.customer')}</span>
            <span className="fin-header-stat__value">{selectedBorrower ? selectedBorrower.full_name : '—'}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.loans_count_label')}</span>
            <span className="fin-header-stat__value">{selectedBorrower ? customerLoans.length : '—'}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fin.total_borrowed_label')}</span>
            <span className="fin-header-stat__value">{selectedBorrower ? `₹${fmt(totalBorrowed)}` : '—'}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('col.collected_rs')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">{selectedBorrower ? `₹${fmt(totalCollected)}` : '—'}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('col.balance')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--bad">{selectedBorrower ? `₹${fmt(totalOutstanding)}` : '—'}</span>
          </div>
        </div>
      </div>

      <div className="fin-filterbar">
        <div className="fin-field">
          <label>{t('fin.branch_label')}</label>
          <select className="fin-select" value={branch} onChange={(e) => { setBranch(e.target.value); setBorrowerId(''); }}>
            <option value="">{t('fin.select_branch_placeholder')}</option>
            <option value="ALL">{t('fin.all_branches')}</option>
            {branchesList.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        </div>
        {hasBranchSelected && (
          <div className="fin-field" style={{ minWidth: 260 }}>
            <label>{t('col.customer')}</label>
            <select className="fin-select" value={effectiveBorrowerId} onChange={(e) => setBorrowerId(Number(e.target.value))}>
              <option value="">{t('fin.select_account_placeholder')}</option>
              {branchBorrowers.map(b => (
                <option key={b.id} value={b.id}>{b.full_name} — {b.phone}</option>
              ))}
            </select>
          </div>
        )}
        <div className="fin-field">
          <label>{t('fin.from_label')}</label>
          <input type="date" className="fin-input" value={fromDate} max={toDate || todayStr()} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="fin-field">
          <label>{t('fin.to_label')}</label>
          <input type="date" className="fin-input" value={toDate} max={todayStr()} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      <div className="fin-tablewrap">
        <table className="fin-grid-table">
          <thead>
            <tr>
              <th>{t('col.date')}</th>
              <th>{t('col.loan_acc')}</th>
              <th>{t('fin.voucher_type_col')}</th>
              <th>{t('col.voucher_no')}</th>
              <th>{t('col.mode')}</th>
              <th className="num">{t('col.amount_rs')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>{!hasBranchSelected ? t('fin.select_branch_hint') : t('fin.no_results_hint')}</td></tr>
            ) : rows.map(row => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td className="code">{row.loan_account_no}</td>
                <td><span className="fin-tag">{row.type === 'DISBURSAL' ? t('fin.ref_disbursal') : t('fin.ref_collection')}</span></td>
                <td className="code">{row.voucher_no}</td>
                <td>{row.mode}</td>
                <td className="num" style={{ fontWeight: 600, color: '#0F172A' }}>₹{fmt(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
