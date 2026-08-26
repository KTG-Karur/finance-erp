import React, { useState, useEffect } from 'react';
import {
  Landmark, Plus, Eye, X, AlertTriangle, CheckCircle2, LogOut, ArrowLeft,
  UserCheck, ChevronLeft, ChevronRight, Search, Printer, FileText, Wallet, History
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import FixedDepositCertificateModal from '../../components/FixedDepositCertificateModal';
import PrintableFixedDepositRegister from './PrintableFixedDepositRegister';
import SharedDropdown from '../../components/common/SharedDropdown';
import SharedDatePicker from '../../components/common/SharedDatePicker';
import TransactionHistoryModal from '../../components/TransactionHistoryModal';
import api from '../../api/client';

const FORM_MAX_WIDTH = 780;

function computeMaturity(principal, tenureMonths, rate, scheme) {
  const p = parseFloat(principal) || 0;
  const months = parseFloat(tenureMonths) || 0;
  const r = parseFloat(rate) || 0;
  if (scheme === 'MONTHLY_PAYOUT') {
    // Principal returned at maturity; interest paid out monthly (not compounded into maturity value)
    return Math.round(p);
  }
  // Cumulative: simple interest over the tenure for this mock calculator
  const interest = p * (r / 100) * (months / 12);
  return Math.round(p + interest);
}

function ErrorBanner({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 9, fontSize: '0.78rem', fontWeight: 600, background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', color: 'var(--color-danger-hover, #B91C1C)' }}>
      <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  );
}

// ── Full-screen "Book New Fixed Deposit" form — narrower width, 3-4 column
// rows and placeholders throughout so fields stay a sensible size instead of
// stretching edge-to-edge.
function BookFdScreen({ borrowers, onCancel, onSubmit }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    borrower_id: '',
    principal_amount: '',
    tenure_months: 12,
    interest_rate: 8.5,
    scheme: 'CUMULATIVE',
    payment_mode: 'CASH',
    reference: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const maturityValue = computeMaturity(form.principal_amount, form.tenure_months, form.interest_rate, form.scheme);
  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const selectedCustomer = borrowers.find(b => b.id === Number(form.borrower_id));

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.borrower_id) { setError(t('fd.modal.select_customer_error')); return; }
    setLoading(true);
    setError('');
    try {
      const bookingDate = new Date();
      const maturityDate = new Date(bookingDate);
      maturityDate.setMonth(maturityDate.getMonth() + Number(form.tenure_months));
      await onSubmit({
        borrower_id: Number(form.borrower_id),
        customer_name: selectedCustomer?.full_name || 'Unknown',
        branch: selectedCustomer?.branch || null,
        principal_amount: parseFloat(form.principal_amount),
        tenure_months: Number(form.tenure_months),
        interest_rate: parseFloat(form.interest_rate),
        scheme: form.scheme,
        payment_mode: form.payment_mode,
        reference: form.reference || null,
        notes: form.notes,
        booking_date: bookingDate.toISOString().slice(0, 10),
        maturity_date: maturityDate.toISOString().slice(0, 10),
        maturity_value: maturityValue
      });
    } catch (err) {
      setError(err?.response?.data?.message || t('fd.modal.save_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-form-page mnc-form-root" style={{ maxWidth: FORM_MAX_WIDTH }}>
      <div className="cf-page-header">
        <div className="cf-header-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="cf-back-btn" onClick={onCancel}>
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>{t('fd.register_title')}</h1>
        </div>
        <div className="cf-header-right">
          <button type="button" onClick={onCancel} className="btn-cancel" disabled={loading}>{t('btn.cancel')}</button>
          <button type="submit" onClick={handleSubmit} disabled={loading} className="btn-submit">
            {loading ? t('fd.saving') : t('fd.modal.submit')}
          </button>
        </div>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <form onSubmit={handleSubmit} className="cf-wizard-body">
        <div className="cf-step-pane" style={{ padding: '20px 22px', gap: 16 }}>
          <div className="cf-pane-title" style={{ paddingBottom: 12 }}>
            <Landmark style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
            <div>
              <h3>{t('fd.section_details_title')}</h3>
              <p>{t('fd.section_details_subtitle')}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>{t('fd.modal.customer_label')}</label>
              <SharedDropdown
                required
                value={form.borrower_id}
                onChange={e => setField('borrower_id', e.target.value)}
                placeholder={t('fd.modal.select_customer') || '— Select Customer —'}
                searchable
                options={borrowers.map(b => ({
                  value: b.id,
                  label: `${b.full_name} (${b.borrower_code}) — ${b.branch}`
                }))}
              />
            </div>
          </div>

          <div className="form-row form-row--3">
            <div className="form-group">
              <label>{t('fd.modal.principal_label')}</label>
              <input type="number" min="1000" step="1000" required value={form.principal_amount} onChange={e => setField('principal_amount', e.target.value)} className="input-control mono" placeholder="e.g. 100000" />
            </div>
            <div className="form-group">
              <label>{t('fd.modal.tenure_label')}</label>
              <input type="number" min="3" max="60" required value={form.tenure_months} onChange={e => setField('tenure_months', e.target.value)} className="input-control mono" placeholder="e.g. 12" />
            </div>
            <div className="form-group">
              <label>{t('fd.modal.rate_label')}</label>
              <input type="number" min="0" max="100" step="0.1" required value={form.interest_rate} onChange={e => setField('interest_rate', e.target.value)} className="input-control mono" placeholder="e.g. 8.5" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('fd.modal.scheme_label')}</label>
              <SharedDropdown
                value={form.scheme}
                onChange={e => setField('scheme', e.target.value)}
                options={[
                  { value: 'CUMULATIVE', label: t('fd.modal.scheme_cumulative') },
                  { value: 'MONTHLY_PAYOUT', label: t('fd.modal.scheme_monthly') }
                ]}
              />
            </div>
            <div className="form-group">
              <label>{t('fd.payment_mode_label')}</label>
              <SharedDropdown
                value={form.payment_mode}
                onChange={e => setField('payment_mode', e.target.value)}
                options={[
                  { value: 'CASH', label: t('fin.mode_cash') },
                  { value: 'BANK_TRANSFER', label: t('fin.mode_bank') },
                  { value: 'UPI', label: 'UPI' },
                  { value: 'CHEQUE', label: t('fin.mode_cheque') || 'Cheque' }
                ]}
              />
            </div>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', textTransform: 'uppercase' }}>{t('col.maturity_date')}</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--color-info, #2563EB)' }}>{form.tenure_months ? `${form.tenure_months} ${t('fd.modal.months_from_booking')}` : '—'}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', textTransform: 'uppercase' }}>{t('col.maturity_value')}</span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--brand-primary, #15803D)' }}>₹{fmt(maturityValue)}</strong>
            </div>
          </div>
        </div>

        <div className="cf-step-pane" style={{ padding: '20px 22px', gap: 16 }}>
          <div className="cf-pane-title" style={{ paddingBottom: 12 }}>
            <UserCheck style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
            <div>
              <h3>Documents & Reference</h3>
              <p style={{ fontSize: '0.74rem', color: '#64748B', margin: 0 }}>Record document references, collateral, certificates, or KYC details handed over.</p>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Reference / Documents Given</label>
              <input
                type="text"
                value={form.reference}
                onChange={e => setField('reference', e.target.value)}
                className="input-control"
                placeholder="e.g. Original FD Bond Certificate, Aadhaar Copy, Security Cheque #..."
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>{t('fd.notes_label')}</label>
              <textarea rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} className="input-control" style={{ height: 'auto', padding: '10px 12px' }} placeholder={t('fd.notes_placeholder')} />
            </div>
          </div>
        </div>

        <div className="cf-wizard-footer">
          <button type="button" onClick={onCancel} className="btn-cancel" disabled={loading}>{t('btn.cancel')}</button>
          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? t('fd.saving') : t('fd.modal.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}

function statusBadgeCls(status) {
  if (status === 'ACTIVE') return 'fin-badge fin-badge--ok';
  if (status === 'CLOSED_PREMATURE') return 'fin-badge fin-badge--warn';
  return 'fin-badge';
}

// Labeled action pills instead of bare icon buttons — the plain icon-only
// buttons this replaced gave no clue what "check mark" vs "arrow out" meant.
function ActionPill({ icon, label, onClick, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: '#FFFFFF', border: '#E2E8F0', color: '#334155' },
    good: { bg: 'var(--brand-primary-light, #F0FEF5)', border: 'var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)' },
    bad: { bg: 'var(--color-danger-light, #FEF2F2)', border: 'var(--color-danger-border, #FECACA)', color: 'var(--color-danger, #DC2626)' }
  };
  const c = tones[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
        border: `1px solid ${c.border}`, background: c.bg, color: c.color,
        borderRadius: 6, padding: '4px 9px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer'
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// Underline-style status tabs — plain text with a colored bottom border on
// the active tab, instead of a rounded "pill" badge.
function StatusTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid #E2E8F0' }}>
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 4px', marginBottom: -1,
              border: 'none', borderBottom: isActive ? '2px solid var(--brand-primary, #15803D)' : '2px solid transparent',
              background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '0.8rem', fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--brand-primary, #15803D)' : '#64748B', marginRight: 18
            }}
          >
            <span>{tab.label}</span>
            <span style={{
              fontSize: '0.68rem', fontWeight: 700, borderRadius: 999, padding: '1px 7px',
              background: isActive ? 'var(--brand-primary-light, #F0FEF5)' : '#F1F5F9',
              color: isActive ? 'var(--brand-primary, #15803D)' : '#94A3B8'
            }}>{tab.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function Pagination({ page, setPage, totalPages, total, startIndex, pageSize }) {
  return (
    <div className="table-pagination">
      <div className="table-pagination__info">
        Showing <strong>{total === 0 ? 0 : startIndex + 1}</strong> to <strong>{Math.min(startIndex + pageSize, total)}</strong> of <strong>{total}</strong> entries
      </div>
      <div className="table-pagination__controls">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
          <ChevronLeft style={{ width: 14, height: 14 }} />
          <span>Previous</span>
        </button>
        <span className="page-indicator">Page {page} of {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
          <span>Next</span>
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}

export default function FixedDepositsView({ fixedDeposits = [], borrowers = [], tenant, user, branchesList = [], selectedBranch = 'ALL', journalEntries = [], onCreateFd, onMatureFd, onPrematureCloseFd, onPayFdMonthlyInterest }) {
  const { t, tStatus } = useLanguage();
  const [screen, setScreen] = useState('LIST'); // 'LIST' | 'BOOK'
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'MATURE'|'PREMATURE', fd }
  const [historyFd, setHistoryFd] = useState(null);
  const [payInterestFd, setPayInterestFd] = useState(null);
  const [payInterestMode, setPayInterestMode] = useState('CASH');
  const [payInterestPeriodType, setPayInterestPeriodType] = useState('MONTHLY'); // 'MONTHLY' | 'CUSTOM'
  const [payInterestFromDate, setPayInterestFromDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payInterestToDate, setPayInterestToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payInterestCustomAmount, setPayInterestCustomAmount] = useState('');
  const [payInterestDate, setPayInterestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payInterestBankId, setPayInterestBankId] = useState('');
  const [payInterestRefNo, setPayInterestRefNo] = useState('');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [payInterestLoading, setPayInterestLoading] = useState(false);
  const [payInterestError, setPayInterestError] = useState('');
  const [payInterestResult, setPayInterestResult] = useState(null);
  const [statusTab, setStatusTab] = useState('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Fetch active company bank accounts
  useEffect(() => {
    api.get('/finance/bank-accounts')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data?.data)) {
          const activeBanks = res.data.data.filter(b => b.is_active !== false);
          setBankAccounts(activeBanks);
          if (activeBanks.length > 0) {
            setPayInterestBankId(String(activeBanks[0].id));
          }
        }
      })
      .catch(err => console.warn('Could not load bank accounts:', err));
  }, []);

  // Branch filter (derived via the linked borrower's branch — FDs don't carry
  // their own branch field) — locked/forced by the sidebar's global control.
  const [branchFilter, setBranchFilter] = useState('ALL');
  useEffect(() => {
    if (selectedBranch && selectedBranch !== 'ALL') setBranchFilter(selectedBranch);
  }, [selectedBranch]);
  const borrowerBranch = (fd) => borrowers.find(b => b.id === fd.borrower_id)?.branch;
  const [certificateFd, setCertificateFd] = useState(null);
  const [printOverallRegister, setPrintOverallRegister] = useState(false);
  const pageSize = 8;

  const [customPayoutAmount, setCustomPayoutAmount] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  if (screen === 'BOOK') {
    return (
      <BookFdScreen
        borrowers={borrowers}
        onCancel={() => setScreen('LIST')}
        onSubmit={async (payload) => { await onCreateFd(payload); setScreen('LIST'); }}
      />
    );
  }

  const certificateLabels = (fd) => ({
    title: 'FIXED DEPOSIT ADVICE / STATEMENT',
    certificateNo: 'Advice Ref',
    fdAccountNo: t('col.fd_account_no'),
    customer: t('col.customer'),
    principal: t('fdc.principal_amount').replace(/:$/, ''),
    rate: t('fdc.interest_rate').replace(/:$/, ''),
    tenure: t('col.tenure'),
    months: t('fdc.months'),
    scheme: t('fdc.scheme').replace(/:$/, ''),
    cumulative: t('fdc.cumulative'),
    monthlyPayout: t('fdc.monthly_payout'),
    bookingDate: t('fdc.booking_date').replace(/:$/, ''),
    maturityDate: t('col.maturity_date'),
    status: t('col.status'),
    statusText: tStatus(fd.status),
    maturityValue: t('fdc.maturity_value').replace(/:$/, ''),
    payoutAfterPenalty: t('fdc.payout_after_penalty').replace(/:$/, ''),
    customerSignature: t('fdc.customer_signature'),
    authorizedSignatory: t('fdc.authorized_signatory'),
    generatedOn: t('fdc.generated_on')
  });

  const branchScopedFds = branchFilter === 'ALL' ? fixedDeposits : fixedDeposits.filter(f => borrowerBranch(f) === branchFilter);

  const totalPrincipal = branchScopedFds.reduce((acc, f) => acc + (f.status === 'ACTIVE' ? f.principal_amount : 0), 0);
  const totalMaturityLiability = branchScopedFds.reduce((acc, f) => acc + (f.status === 'ACTIVE' ? f.maturity_value : 0), 0);
  const activeCount = branchScopedFds.filter(f => f.status === 'ACTIVE').length;

  const byTab = branchScopedFds.filter(f => f.status === statusTab);
  const filteredFds = byTab.filter(f => {
    const q = searchQuery.toLowerCase().trim();
    return !q || f.fd_account_no.toLowerCase().includes(q) || f.customer_name.toLowerCase().includes(q) || (f.reference && f.reference.toLowerCase().includes(q));
  });
  const totalPages = Math.ceil(filteredFds.length / pageSize) || 1;
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedFds = filteredFds.slice(startIndex, startIndex + pageSize);

  const tabCount = (id) => branchScopedFds.filter(f => f.status === id).length;

  return (
    <div className="fin-page">
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)' }}>
              <Landmark style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('fd.title')}</h1>
              <p className="fin-page-header__subtitle">{t('fd.subtitle')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setPrintOverallRegister(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 7, border: '1px solid #CBD5E1',
                background: '#FFFFFF', color: '#334155', fontSize: '0.8rem',
                fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <Printer style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} />
              <span>Print Register</span>
            </button>
            <button type="button" className="fin-btn-primary" onClick={() => setScreen('BOOK')} disabled={!borrowers.length}>
              <Plus style={{ width: 14, height: 14 }} />
              <span>{t('fd.book_new')}</span>
            </button>
          </div>
        </div>

        <div className="fin-header-stats">
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fd.active_principal')}</span>
            <span className="fin-header-stat__value">₹{fmt(totalPrincipal)}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fd.active_accounts')}</span>
            <span className="fin-header-stat__value">{activeCount}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('fd.total_maturity_liability')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">₹{fmt(totalMaturityLiability)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <StatusTabs
          tabs={[
            { id: 'ACTIVE', label: t('fin.status_active'), count: tabCount('ACTIVE') },
            { id: 'MATURED', label: t('fin.fd_status_matured'), count: tabCount('MATURED') },
            { id: 'CLOSED_PREMATURE', label: t('fin.fd_status_closed_premature'), count: tabCount('CLOSED_PREMATURE') }
          ]}
          active={statusTab}
          onChange={(id) => { setStatusTab(id); setPage(1); }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SharedDropdown
            value={branchFilter}
            onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
            disabled={Boolean(selectedBranch && selectedBranch !== 'ALL')}
            size="sm"
            buttonStyle={{ height: 34, minWidth: 140 }}
            options={[
              { value: 'ALL', label: t('fin.all_branches') || 'All Branches' },
              ...branchesList.map(b => ({ value: b.name, label: b.name }))
            ]}
          />
          <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
            <Search style={{ position: 'absolute', left: 10, top: 9, width: 14, height: 14, color: '#94A3B8' }} />
            <input style={{ paddingLeft: 30, width: '100%', height: 34, borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.78rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} type="text" placeholder={t('fd.search_placeholder')} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} />
          </div>
        </div>
      </div>

      <div className="fin-tablewrap">
        <table className="fin-grid-table">
          <thead>
            <tr>
              <th style={{ width: 50, textAlign: 'center' }}>{t('col.sno')}</th>
              <th>{t('col.fd_account_no')}</th>
              <th>{t('col.customer')}</th>
              <th>Documents / Ref</th>
              <th>{t('col.scheme')}</th>
              <th className="num">{t('col.principal')}</th>
              <th style={{ textAlign: 'center' }}>{t('col.tenure')}</th>
              <th className="num">{t('col.rate')}</th>
              <th>{t('fdc.booking_date').replace(/:$/, '')}</th>
              <th>{t('col.maturity_date')}</th>
              <th className="num">{statusTab === 'CLOSED_PREMATURE' ? 'Prematured Amount' : t('col.maturity_value')}</th>
              <th style={{ textAlign: 'center' }}>{t('col.status')}</th>
              <th style={{ textAlign: 'right', minWidth: 220 }}>{t('col.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {pagedFds.length === 0 ? (
              <tr><td colSpan="13" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>{t('fd.no_fds_yet')}</td></tr>
            ) : pagedFds.map((fd, idx) => (
              <tr key={fd.id}>
                <td style={{ textAlign: 'center', color: '#64748B' }}>{startIndex + idx + 1}</td>
                <td className="code" style={{ color: 'var(--brand-primary, #15803D)', fontWeight: 600 }}>{fd.fd_account_no}</td>
                <td>{fd.customer_name}</td>
                <td style={{ fontSize: '0.74rem', color: '#475569', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fd.reference || '—'}>{fd.reference || '—'}</td>
                <td style={{ fontSize: '0.78rem', color: '#64748B' }}>{fd.scheme === 'CUMULATIVE' ? t('fdc.cumulative') : t('fdc.monthly_payout')}</td>
                <td className="num">₹{fmt(fd.principal_amount)}</td>
                <td style={{ textAlign: 'center', color: '#64748B' }}>{fd.tenure_months}mo</td>
                <td className="num">{fd.interest_rate}%</td>
                <td style={{ fontSize: '0.78rem', color: '#64748B' }}>{fd.booking_date}</td>
                <td>{fd.maturity_date}</td>
                <td className="num" style={{ color: fd.status === 'CLOSED_PREMATURE' ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)' }}>₹{fmt(fd.status === 'CLOSED_PREMATURE' ? fd.payout_amount : fd.maturity_value)}</td>
                <td style={{ textAlign: 'center' }}><span className={statusBadgeCls(fd.status)}>{tStatus(fd.status)}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <ActionPill icon={<Printer style={{ width: 11, height: 11 }} />} label="Print" tone="neutral" onClick={() => setCertificateFd(fd)} />
                    <ActionPill icon={<History style={{ width: 11, height: 11 }} />} label="History" tone="neutral" onClick={() => setHistoryFd(fd)} />
                    {fd.status === 'ACTIVE' && (
                      <>
                        {fd.scheme === 'MONTHLY_PAYOUT' && (
                          <ActionPill icon={<Wallet style={{ width: 11, height: 11 }} />} label="Pay Interest" tone="neutral" onClick={() => {
                            const todayStr = new Date().toISOString().slice(0, 10);
                            const bDate = fd.booking_date || todayStr;
                            setPayInterestFd(fd);
                            setPayInterestMode('CASH');
                            setPayInterestPeriodType('MONTHLY');
                            setPayInterestFromDate(bDate);
                            setPayInterestToDate(todayStr);
                            setPayInterestCustomAmount('');
                            setPayInterestDate(todayStr);
                            setPayInterestBankId(bankAccounts[0]?.id ? String(bankAccounts[0].id) : '');
                            setPayInterestRefNo('');
                            setPayInterestError('');
                            setPayInterestResult(null);
                          }} />
                        )}
                        <ActionPill icon={<CheckCircle2 style={{ width: 11, height: 11 }} />} label={t('fd.mark_matured')} tone="good" onClick={() => setConfirmAction({ type: 'MATURE', fd })} />
                        <ActionPill icon={<LogOut style={{ width: 11, height: 11 }} />} label={t('fd.premature_exit')} tone="bad" onClick={() => setConfirmAction({ type: 'PREMATURE', fd })} />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={safePage} setPage={setPage} totalPages={totalPages} total={filteredFds.length} startIndex={startIndex} pageSize={pageSize} />
      </div>

      {confirmAction && (() => {
        const principal = Number(confirmAction.fd.principal_amount) || 0;
        const rate = Number(confirmAction.fd.interest_rate) || 0;
        const tenureMonths = Number(confirmAction.fd.tenure_months) || 12;
        const monthlyAmount = Math.round(principal * (rate / 100) / 12);

        const isMature = confirmAction.type === 'MATURE';
        const isMonthlyPayout = confirmAction.fd.scheme === 'MONTHLY_PAYOUT';

        const bookingDateStr = String(confirmAction.fd.booking_date || confirmAction.fd.deposit_date || confirmAction.fd.created_at || '').slice(0, 10);
        const exitDateStr = new Date().toISOString().slice(0, 10);
        const daysHeld = Math.max(1, Math.round((new Date(exitDateStr) - new Date(bookingDateStr)) / (1000 * 60 * 60 * 24)));

        const fdPayoutVouchers = (journalEntries || []).filter(e => {
          const text = (e.narration || e.description || '');
          const isPayout = e.ref_type === 'FD_INTEREST_PAYOUT' || text.toLowerCase().includes('interest payout');
          const matchesFd = String(e.ref_id) === String(confirmAction.fd.id) || text.includes(confirmAction.fd.fd_account_no);
          return isPayout && matchesFd;
        });

        const monthsPaidCount = fdPayoutVouchers.length;
        const interestPaidAmount = fdPayoutVouchers.reduce((s, v) => {
          const lineTotal = (v.lines || []).reduce((sum, l) => sum + (Number(l.debit || 0)), 0);
          return s + (Number(v.total_amount || lineTotal || v.amount || 0));
        }, 0) || (monthsPaidCount * monthlyAmount);

        let totalAccruedInterest = 0;
        let unpaidInterest = 0;
        let defaultMaturityOrPremature = 0;

        if (isMature) {
          if (isMonthlyPayout) {
            totalAccruedInterest = Math.round(principal * (rate / 100) * (tenureMonths / 12));
            unpaidInterest = Math.max(0, totalAccruedInterest - interestPaidAmount);
            defaultMaturityOrPremature = principal + unpaidInterest;
          } else {
            totalAccruedInterest = Math.round(principal * (rate / 100) * (tenureMonths / 12));
            defaultMaturityOrPremature = Number(confirmAction.fd.maturity_value) || (principal + totalAccruedInterest);
          }
        } else {
          totalAccruedInterest = Math.round(principal * (rate / 100) * (daysHeld / 365));
          unpaidInterest = Math.max(0, totalAccruedInterest - interestPaidAmount);
          defaultMaturityOrPremature = principal + unpaidInterest;
        }

        const payoutAmount = customPayoutAmount !== '' ? (parseFloat(customPayoutAmount) || 0) : defaultMaturityOrPremature;
        const tone = isMature ? { bg: 'var(--brand-primary-light, #F0FEF5)', border: 'var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', icon: 'var(--brand-primary, #15803D)' } : { bg: 'var(--color-danger-light, #FEF2F2)', border: 'var(--color-danger-border, #FECACA)', color: 'var(--color-danger, #DC2626)', icon: 'var(--color-danger, #DC2626)' };
        return (
          <div className="saas-modal-backdrop">
            <div className="saas-modal-card" style={{ maxWidth: 480 }}>
              <div className="saas-modal-header">
                <div className="head-left">
                  <div className="head-icon-badge" style={{ background: tone.bg, color: tone.icon }}>
                    {isMature ? <CheckCircle2 style={{ width: 18, height: 18 }} /> : <LogOut style={{ width: 18, height: 18 }} />}
                  </div>
                  <div className="head-titles">
                    <h3>{isMature ? t('fd.confirm_matured_title') : t('fd.confirm_premature_title')}</h3>
                    <p>{confirmAction.fd.fd_account_no} — {confirmAction.fd.customer_name}</p>
                  </div>
                </div>
                <button onClick={() => { setConfirmAction(null); setCustomPayoutAmount(''); setConfirmError(''); }} className="close-btn" type="button" disabled={confirmLoading}><X style={{ width: 16, height: 16 }} /></button>
              </div>
              <div className="saas-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {confirmError && (
                  <div className="form-alert form-alert--error"><span>{confirmError}</span></div>
                )}
                <div style={{ background: tone.bg, border: `1px solid ${tone.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {isMature ? t('fdc.maturity_value') : 'Final Settlement Payout'}
                    </span>
                    <strong style={{ fontSize: '1.3rem', color: tone.color }}>₹{fmt(payoutAmount)}</strong>
                  </div>
                  {!isMature && (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Original Maturity</span>
                      <span style={{ fontSize: '0.88rem', color: '#94A3B8', textDecoration: 'line-through' }}>₹{fmt(confirmAction.fd.maturity_value || (principal + Math.round(principal * (rate / 100) * (tenureMonths / 12))))}</span>
                    </div>
                  )}
                </div>

                {/* Step-by-Step Accrual & Payout Breakdown */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.74rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 6 }}>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>Holding Duration:</span>
                    <strong style={{ color: '#0F172A', fontFamily: 'monospace', fontSize: '0.74rem' }}>
                      {bookingDateStr} → {exitDateStr} ({daysHeld} day{daysHeld === 1 ? '' : 's'})
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Principal Deposited:</span>
                    <strong style={{ color: '#0F172A' }}>₹{fmt(principal)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Accrued Interest ({daysHeld}d @ {rate}% p.a.):</span>
                    <strong style={{ color: '#15803D' }}>+ ₹{fmt(totalAccruedInterest)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Prior Interest Paid to Customer:</span>
                    <span style={{ color: interestPaidAmount > 0 ? '#DC2626' : '#64748B', fontWeight: 600 }}>
                      - ₹{fmt(interestPaidAmount)} ({monthsPaidCount} payout{monthsPaidCount === 1 ? '' : 's'})
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0F172A', paddingTop: 6, borderTop: '1px dashed #CBD5E1', fontWeight: 700 }}>
                    <span>Net Exit Interest Due:</span>
                    <span style={{ color: unpaidInterest > 0 ? '#2563EB' : '#64748B' }}>+ ₹{fmt(unpaidInterest)}</span>
                  </div>
                </div>

                {!isMature && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                      Premature Settlement Amount (₹)
                    </label>
                    <input
                      type="number"
                      placeholder={`Calculated: ₹${fmt(defaultMaturityOrPremature)}`}
                      value={customPayoutAmount}
                      onChange={(e) => setCustomPayoutAmount(e.target.value)}
                      style={{
                        height: 38, padding: '0 12px', borderRadius: 8,
                        border: '1px solid #CBD5E1', fontSize: '0.85rem',
                        fontWeight: 500, fontFamily: 'inherit', outline: 'none'
                      }}
                    />
                    <span style={{ fontSize: '0.68rem', color: '#64748B' }}>
                      Leave blank to settle with exact formula amount (₹{fmt(defaultMaturityOrPremature)}).
                    </span>
                  </div>
                )}

                <p style={{ fontSize: '0.76rem', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                  {isMature
                    ? t('fd.confirm_matured_desc').replace('{amount}', fmt(payoutAmount))
                    : `Confirming premature settlement for FD #${confirmAction.fd.fd_account_no}. Net disbursement of ₹${fmt(payoutAmount)} will be debited.`}
                </p>
              </div>
              <div className="saas-modal-footer">
                <button type="button" onClick={() => { setConfirmAction(null); setCustomPayoutAmount(''); setConfirmError(''); }} disabled={confirmLoading} className="btn-cancel">{t('btn.cancel')}</button>
                <button
                  type="button"
                  disabled={confirmLoading}
                  onClick={async () => {
                    if (confirmLoading) return;
                    setConfirmLoading(true);
                    setConfirmError('');
                    try {
                      if (isMature) {
                        await onMatureFd(confirmAction.fd.id);
                      } else {
                        await onPrematureCloseFd(confirmAction.fd.id, customPayoutAmount);
                      }
                      setConfirmAction(null);
                      setCustomPayoutAmount('');
                    } catch (err) {
                      setConfirmError(err?.response?.data?.message || 'Action failed. Please try again.');
                    } finally {
                      setConfirmLoading(false);
                    }
                  }}
                  className="btn-submit"
                  style={{ background: confirmLoading ? '#94A3B8' : tone.color, boxShadow: confirmLoading ? 'none' : `0 2px 6px ${tone.color}4D`, cursor: confirmLoading ? 'not-allowed' : 'pointer' }}
                >
                  {confirmLoading ? 'Processing...' : t('fd.confirm_btn')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {payInterestFd && (() => {
        const principal = Number(payInterestFd.principal_amount) || 0;
        const rate = Number(payInterestFd.interest_rate) || 0;
        const monthlyAmount = Math.round(principal * (rate / 100) / 12);
        const monthsAlreadyPaid = journalEntries.filter(e =>
          e.ref_type === 'FD_INTEREST_PAYOUT' && String(e.ref_id) === String(payInterestFd.id)
        ).length;
        const upcomingMonthNumber = monthsAlreadyPaid + 1;
        const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        const customDays = Math.max(1, Math.round((new Date(payInterestToDate) - new Date(payInterestFromDate)) / (1000 * 60 * 60 * 24)));
        const proRatedInterest = Math.round(principal * (rate / 100) * (customDays / 365));
        const effectiveInterestAmount = payInterestPeriodType === 'MONTHLY'
          ? monthlyAmount
          : (payInterestCustomAmount !== '' ? Number(payInterestCustomAmount) : proRatedInterest);

        return (
          <div className="saas-modal-backdrop">
            <div className="saas-modal-card" style={{ maxWidth: 440 }}>
              <div className="saas-modal-header">
                <div className="head-left">
                  <div className="head-icon-badge" style={{ background: '#F1F5F9', color: '#334155' }}>
                    <Wallet style={{ width: 18, height: 18 }} />
                  </div>
                  <div className="head-titles">
                    <h3>Pay FD Interest</h3>
                    <p>{payInterestFd.fd_account_no} — {payInterestFd.customer_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setPayInterestFd(null); setPayInterestError(''); setPayInterestResult(null); }}
                  className="close-btn" type="button" disabled={payInterestLoading}
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
              <div className="saas-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {payInterestError && <div className="form-alert form-alert--error"><span>{payInterestError}</span></div>}

                {payInterestResult ? (
                  <div style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', borderRadius: 12, padding: '16px 18px', textAlign: 'center' }}>
                    <CheckCircle2 style={{ width: 26, height: 26, color: 'var(--brand-primary, #15803D)', marginBottom: 6 }} />
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#0F172A', fontWeight: 600 }}>
                      ₹{fmt(payInterestResult.amount)} paid successfully
                    </p>
                    <div style={{ marginTop: 12, textAlign: 'left', background: '#FFFFFF', border: '1px solid var(--brand-primary-border, #A3F5C1)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.76rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B' }}>Paid by:</span>
                        <strong style={{ color: '#0F172A' }}>{payInterestResult.created_by || user?.name || '—'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B' }}>Date:</span>
                        <strong style={{ color: '#0F172A' }}>{payInterestResult.entry_date || today}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B' }}>Period:</span>
                        <strong style={{ color: '#0F172A' }}>
                          {payInterestPeriodType === 'CUSTOM' ? `${payInterestFromDate} → ${payInterestToDate} (${customDays}d)` : `Month ${payInterestResult.month_number} of ${payInterestResult.tenure_months}`}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B' }}>Voucher No:</span>
                        <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{payInterestResult.voucher_no}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setPayInterestPeriodType('MONTHLY')}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: `1px solid ${payInterestPeriodType === 'MONTHLY' ? 'var(--brand-primary-border, #A3F5C1)' : '#E2E8F0'}`,
                          background: payInterestPeriodType === 'MONTHLY' ? 'var(--brand-primary-light, #F0FEF5)' : '#FFFFFF',
                          color: payInterestPeriodType === 'MONTHLY' ? 'var(--brand-primary, #15803D)' : '#64748B',
                          fontSize: '0.76rem',
                          fontWeight: payInterestPeriodType === 'MONTHLY' ? 600 : 400,
                          cursor: 'pointer'
                        }}
                      >
                        Standard 1 Month
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayInterestPeriodType('CUSTOM')}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: `1px solid ${payInterestPeriodType === 'CUSTOM' ? 'var(--brand-primary-border, #A3F5C1)' : '#E2E8F0'}`,
                          background: payInterestPeriodType === 'CUSTOM' ? 'var(--brand-primary-light, #F0FEF5)' : '#FFFFFF',
                          color: payInterestPeriodType === 'CUSTOM' ? 'var(--brand-primary, #15803D)' : '#64748B',
                          fontSize: '0.76rem',
                          fontWeight: payInterestPeriodType === 'CUSTOM' ? 600 : 400,
                          cursor: 'pointer'
                        }}
                      >
                        Custom Date Range
                      </button>
                    </div>

                    {payInterestPeriodType === 'CUSTOM' && (
                      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>From Date *</label>
                            <SharedDatePicker
                              value={payInterestFromDate}
                              onChange={(e) => setPayInterestFromDate(e.target.value)}
                              buttonStyle={{ height: 36, fontSize: '0.78rem' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>To Date *</label>
                            <SharedDatePicker
                              value={payInterestToDate}
                              onChange={(e) => setPayInterestToDate(e.target.value)}
                              buttonStyle={{ height: 36, fontSize: '0.78rem' }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#64748B', borderTop: '1px dashed #E2E8F0', paddingTop: 8 }}>
                          <span>Days Elapsed: <strong style={{ color: '#0F172A' }}>{customDays} days</strong></span>
                          <span>Formula: <strong style={{ color: '#0F172A' }}>{rate}% p.a. pro-rated</strong></span>
                        </div>
                      </div>
                    )}

                    {/* Interest & Payout Summary Card */}
                    <div style={{ background: '#F0FEF5', border: '1px solid #A3F5C1', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.66rem', color: '#166534', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            {payInterestPeriodType === 'CUSTOM' ? `System Calculated Interest (${customDays}d)` : `This Month's Interest`}
                          </span>
                          <strong style={{ fontSize: '1.2rem', color: '#15803D' }}>
                            ₹{fmt(payInterestPeriodType === 'CUSTOM' ? proRatedInterest : monthlyAmount)}
                          </strong>
                        </div>

                        {payInterestPeriodType === 'CUSTOM' && (
                          <div style={{ textAlign: 'right' }}>
                            <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 3 }}>
                              Actual Payout Amount (₹)
                            </label>
                            <input
                              type="number"
                              value={payInterestCustomAmount}
                              onChange={(e) => setPayInterestCustomAmount(e.target.value)}
                              placeholder={String(proRatedInterest)}
                              style={{
                                width: 110,
                                height: 34,
                                padding: '0 10px',
                                borderRadius: 6,
                                border: '1px solid #86EFAC',
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                color: '#0F172A',
                                textAlign: 'right',
                                outline: 'none',
                                background: '#FFFFFF'
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {payInterestPeriodType === 'CUSTOM' && payInterestCustomAmount !== '' && Number(payInterestCustomAmount) !== proRatedInterest && (
                        <div style={{ fontSize: '0.68rem', color: '#B45309', background: '#FEF3C7', padding: '4px 8px', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                          <span>Manual Payout Override</span>
                          <span>Diff: ₹{fmt(Number(payInterestCustomAmount) - proRatedInterest)}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#334155' }}>Payout Date *</label>
                        <SharedDatePicker
                          value={payInterestDate}
                          onChange={(e) => setPayInterestDate(e.target.value)}
                          buttonStyle={{ height: 38, fontSize: '0.8rem' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#334155' }}>Payment Mode *</label>
                        <SharedDropdown
                          value={payInterestMode}
                          onChange={(e) => setPayInterestMode(e.target.value)}
                          buttonStyle={{ height: 38, fontSize: '0.8rem' }}
                          options={[
                            { value: 'CASH', label: 'Cash in Hand' },
                            { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                            { value: 'UPI', label: 'UPI / QR' },
                            { value: 'CHEQUE', label: 'Cheque' }
                          ]}
                        />
                      </div>
                    </div>

                    {payInterestMode !== 'CASH' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#334155' }}>Source Bank Account *</label>
                          <SharedDropdown
                            value={payInterestBankId ? String(payInterestBankId) : (bankAccounts[0]?.id ? String(bankAccounts[0].id) : '')}
                            onChange={(e) => setPayInterestBankId(e.target.value)}
                            options={bankAccounts.map(b => ({
                              value: String(b.id),
                              label: `${b.bank_name} (${b.account_number ? '...' + String(b.account_number).slice(-4) : b.account_name})`
                            }))}
                            buttonStyle={{ height: 36, fontSize: '0.8rem' }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#334155' }}>Reference / UTR / Cheque No</label>
                          <input
                            type="text"
                            value={payInterestRefNo}
                            onChange={(e) => setPayInterestRefNo(e.target.value)}
                            placeholder="e.g. UTR / Ref No"
                            style={{
                              height: 36,
                              padding: '0 10px',
                              borderRadius: 6,
                              border: '1px solid #CBD5E1',
                              fontSize: '0.8rem',
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="saas-modal-footer">
                <button
                  type="button"
                  onClick={() => { setPayInterestFd(null); setPayInterestError(''); setPayInterestResult(null); }}
                  disabled={payInterestLoading}
                  className="btn-cancel"
                >
                  {payInterestResult ? 'Close' : t('btn.cancel')}
                </button>
                {!payInterestResult && (
                  <button
                    type="button"
                    disabled={payInterestLoading}
                    onClick={async () => {
                      if (payInterestLoading) return;
                      setPayInterestLoading(true);
                      setPayInterestError('');
                      try {
                        const result = await onPayFdMonthlyInterest(payInterestFd.id, {
                          payment_mode: payInterestMode,
                          payout_date: payInterestDate,
                          period_type: payInterestPeriodType,
                          from_date: payInterestPeriodType === 'CUSTOM' ? payInterestFromDate : null,
                          to_date: payInterestPeriodType === 'CUSTOM' ? payInterestToDate : null,
                          interest_amount: effectiveInterestAmount,
                          bank_account_id: payInterestMode !== 'CASH' && payInterestBankId ? Number(payInterestBankId) : null,
                          reference_no: payInterestRefNo
                        });
                        setPayInterestResult(result);
                      } catch (err) {
                        setPayInterestError(err?.response?.data?.message || 'Payout failed. Please try again.');
                      } finally {
                        setPayInterestLoading(false);
                      }
                    }}
                    className="btn-submit"
                  >
                    {payInterestLoading ? 'Processing...' : 'Confirm Payout'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {certificateFd && (
        <FixedDepositCertificateModal
          company={tenant}
          fd={certificateFd}
          journalEntries={journalEntries}
          labels={certificateLabels(certificateFd)}
          onClose={() => setCertificateFd(null)}
        />
      )}

      {historyFd && (() => {
        const isMonthly = historyFd.scheme === 'MONTHLY_PAYOUT';
        const principal = Number(historyFd.principal_amount) || 0;
        const rate = Number(historyFd.interest_rate) || 0;
        const tenureMonths = Number(historyFd.tenure_months) || 12;
        const monthlyAmount = Math.round(principal * (rate / 100) / 12);
        const fullExpectedInterest = Math.round(principal * (rate / 100) * (tenureMonths / 12));

        const fdEntries = journalEntries.filter(e =>
          ['FD_BOOKING', 'FD_INTEREST_PAYOUT', 'FD_MATURITY', 'FD_PREMATURE_CLOSE'].includes(e.ref_type) &&
          (String(e.ref_id) === String(historyFd.id) || (e.description && e.description.includes(historyFd.fd_account_no)))
        );

        const payoutEntries = fdEntries.filter(e => e.ref_type === 'FD_INTEREST_PAYOUT');
        const monthsPaid = payoutEntries.length;
        const totalInterestPaid = payoutEntries.reduce((s, v) => s + ((v.lines || []).reduce((sum, l) => sum + (l.debit || 0), 0) || Number(v.total_amount || v.amount || 0)), 0) || (monthsPaid * monthlyAmount);
        const unpaidInterest = isMonthly ? Math.max(0, fullExpectedInterest - totalInterestPaid) : 0;

        const accountMeta = {
          principal,
          rate,
          tenureMonths,
          ...(isMonthly ? {
            monthlyAmount,
            monthsPaid,
            totalInterestPaid,
            unpaidInterest
          } : {})
        };

        return (
          <TransactionHistoryModal
            title={isMonthly ? "Fixed Deposit Payout & Transaction History" : "Fixed Deposit Transaction History"}
            accountLabel={`${historyFd.fd_account_no} — ${historyFd.customer_name} (${isMonthly ? 'Monthly Payout' : 'Cumulative'})`}
            accountMeta={accountMeta}
            tenant={tenant}
            entries={fdEntries}
            onClose={() => setHistoryFd(null)}
          />
        );
      })()}

      {printOverallRegister && (
        <PrintableFixedDepositRegister
          company={tenant}
          fixedDeposits={filteredFds}
          branchFilter={branchFilter}
          statusTab={statusTab}
          onClose={() => setPrintOverallRegister(false)}
        />
      )}
    </div>
  );
}
