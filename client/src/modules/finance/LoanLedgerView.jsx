import React, { useState, useMemo } from 'react';
import { FileText } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartStr() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
}

// One loan account at a time: pick a branch, pick the loan, see its disbursal and
// every collection against it in order, with a running outstanding balance.
export default function LoanLedgerView({ loans = [], collections = [], branchesList = [] }) {
  const { t } = useLanguage();
  const [branch, setBranch] = useState('');
  const hasBranchSelected = branch !== '';
  const [fromDate, setFromDate] = useState(monthStartStr());
  const [toDate, setToDate] = useState(todayStr());

  const branchLoans = useMemo(() => {
    if (branch === 'ALL') return loans;
    if (!branch) return [];
    return loans.filter(l => l.branch === branch);
  }, [loans, branch]);

  const [loanId, setLoanId] = useState('');
  const effectiveLoanId = branchLoans.some(l => l.id === loanId) ? loanId : '';
  const selectedLoan = loans.find(l => l.id === effectiveLoanId) || null;

  const rows = useMemo(() => {
    if (!selectedLoan) return [];
    const loanCollections = collections
      .filter(c => c.loan_id === selectedLoan.id)
      .slice()
      .sort((a, b) => (a.collection_date < b.collection_date ? -1 : a.collection_date > b.collection_date ? 1 : 0));

    let running = selectedLoan.principal_amount;
    const out = [{
      id: `disbursal-${selectedLoan.id}`,
      date: selectedLoan.loan_date,
      type: 'DISBURSAL',
      receipt_no: '—',
      principal: selectedLoan.principal_amount,
      interest: 0,
      penalty: 0,
      mode: '—',
      balance: running
    }];

    loanCollections.forEach(c => {
      running = Math.max(0, running - (c.principalPaid || 0));
      out.push({
        id: c.id,
        date: c.collection_date,
        type: 'COLLECTION',
        receipt_no: c.receipt_no || '—',
        principal: c.principalPaid || 0,
        interest: c.interestPaid || 0,
        penalty: c.penalty || 0,
        mode: c.payment_mode || '—',
        balance: running
      });
    });

    return out
      .filter(row => (!fromDate || row.date >= fromDate) && (!toDate || row.date <= toDate))
      .slice()
      .reverse();
  }, [selectedLoan, collections, fromDate, toDate]);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  return (
    <div className="fin-page">
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8' }}>
              <FileText style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('nav.loan_ledger')}</h1>
              <p className="fin-page-header__subtitle">{t('fin.loan_ledger_subtitle')}</p>
            </div>
          </div>
        </div>

        <div className="fin-header-stats">
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('col.loan_acc')}</span>
            <span className="fin-header-stat__value">{selectedLoan ? `${selectedLoan.loan_account_no} — ${selectedLoan.borrower_name}` : '—'}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('col.principal')}</span>
            <span className="fin-header-stat__value">{selectedLoan ? `₹${fmt(selectedLoan.principal_amount)}` : '—'}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('col.collected_rs')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">{selectedLoan ? `₹${fmt(selectedLoan.collected_amount)}` : '—'}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('col.balance')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--bad">{selectedLoan ? `₹${fmt(selectedLoan.pending_amount)}` : '—'}</span>
          </div>
        </div>
      </div>

      <div className="fin-filterbar">
        <div className="fin-field">
          <label>{t('fin.branch_label')}</label>
          <select className="fin-select" value={branch} onChange={(e) => { setBranch(e.target.value); setLoanId(''); }}>
            <option value="">{t('fin.select_branch_placeholder')}</option>
            <option value="ALL">{t('fin.all_branches')}</option>
            {branchesList.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        </div>
        {hasBranchSelected && (
          <div className="fin-field" style={{ minWidth: 260 }}>
            <label>{t('col.loan_acc')}</label>
            <select className="fin-select" value={effectiveLoanId} onChange={(e) => setLoanId(Number(e.target.value))}>
              <option value="">{t('fin.select_account_placeholder')}</option>
              {branchLoans.map(l => (
                <option key={l.id} value={l.id}>{l.loan_account_no} — {l.borrower_name}</option>
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
              <th>{t('fin.voucher_type_col')}</th>
              <th>{t('col.receipt_no')}</th>
              <th className="num">{t('col.principal')}</th>
              <th className="num">{t('col.interest')}</th>
              <th className="num">{t('fin.penalty_label')}</th>
              <th>{t('col.mode')}</th>
              <th className="num">{t('col.balance')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>{!hasBranchSelected ? t('fin.select_branch_hint') : t('fin.no_results_hint')}</td></tr>
            ) : rows.map(row => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td><span className="fin-tag">{row.type === 'DISBURSAL' ? t('fin.ref_disbursal') : t('fin.ref_collection')}</span></td>
                <td className="code">{row.receipt_no}</td>
                <td className="num">{row.principal ? `₹${fmt(row.principal)}` : '—'}</td>
                <td className="num">{row.interest ? `₹${fmt(row.interest)}` : '—'}</td>
                <td className="num">{row.penalty ? `₹${fmt(row.penalty)}` : '—'}</td>
                <td>{row.mode}</td>
                <td className="num" style={{ fontWeight: 600, color: '#0F172A' }}>₹{fmt(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
