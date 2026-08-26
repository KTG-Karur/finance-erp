import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Plus,
  Search,
  Building2,
  CreditCard,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  Wallet,
  ArrowUpRight,
  ExternalLink,
  X,
  AlertTriangle
} from 'lucide-react';
import SharedDropdown from '../components/common/SharedDropdown';
import { useLanguage } from '../i18n/LanguageContext.jsx';

const POPULAR_BANKS = [
  'State Bank of India (SBI)',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Canara Bank',
  'Punjab National Bank (PNB)',
  'Bank of Baroda',
  'Union Bank of India',
  'Indian Bank',
  'Kotak Mahindra Bank',
  'Karur Vysya Bank (KVB)',
  'City Union Bank (CUB)',
  'Federal Bank',
  'IndusInd Bank',
  'IDFC FIRST Bank'
];

export default function BankAccountMasterView({
  bankAccounts = [],
  branchesList = [],
  chartOfAccounts = [],
  onCreateBankAccount,
  onUpdateBankAccount,
  onDeleteBankAccount
}) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');
  const [modalMode, setModalMode] = useState(null); // 'CREATE' | 'EDIT' | null
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    bank_name: '',
    account_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    company_branch: branchesList[0]?.name || 'Main Branch',
    account_type: 'CURRENT',
    opening_balance: '',
    ledger_account_code: ''
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredAccounts = useMemo(() => {
    return bankAccounts.filter(acc => {
      const matchesBranch = selectedBranchFilter === 'ALL' || (acc.branch_name === selectedBranchFilter) || (acc.branch === selectedBranchFilter);
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (acc.bank_name && acc.bank_name.toLowerCase().includes(q)) ||
        (acc.account_name && acc.account_name.toLowerCase().includes(q)) ||
        (acc.account_number && acc.account_number.includes(q)) ||
        (acc.ifsc_code && acc.ifsc_code.toLowerCase().includes(q)) ||
        (acc.branch_name && acc.branch_name.toLowerCase().includes(q))
      );
      return matchesBranch && matchesSearch;
    });
  }, [bankAccounts, selectedBranchFilter, searchQuery]);

  const totalBalance = useMemo(() => {
    return bankAccounts.reduce((sum, acc) => sum + (parseFloat(acc.current_balance || acc.opening_balance) || 0), 0);
  }, [bankAccounts]);

  const activeCount = useMemo(() => {
    return bankAccounts.filter(a => a.is_active !== false).length;
  }, [bankAccounts]);

  const handleOpenCreate = () => {
    setFormData({
      bank_name: '',
      account_name: '',
      account_number: '',
      ifsc_code: '',
      branch_name: '',
      company_branch: branchesList[0]?.name || 'Main Branch',
      account_type: 'CURRENT',
      opening_balance: '',
      ledger_account_code: ''
    });
    setFormError('');
    setSelectedAccount(null);
    setModalMode('CREATE');
  };

  const handleOpenEdit = (acc) => {
    setSelectedAccount(acc);
    setFormData({
      bank_name: acc.bank_name || '',
      account_name: acc.account_name || '',
      account_number: acc.account_number || '',
      ifsc_code: acc.ifsc_code || '',
      branch_name: acc.branch_name || '',
      company_branch: acc.branch || acc.branch_name || branchesList[0]?.name || 'Main Branch',
      account_type: acc.account_type || 'CURRENT',
      opening_balance: acc.opening_balance != null ? String(acc.opening_balance) : '',
      ledger_account_code: acc.ledger_account_code || ''
    });
    setFormError('');
    setModalMode('EDIT');
  };

  const handleCopy = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.bank_name.trim()) {
      setFormError('Bank Name is required.');
      return;
    }
    if (!formData.account_name.trim()) {
      setFormError('Account Holder / Display Title is required.');
      return;
    }
    if (!formData.account_number.trim()) {
      setFormError('Account Number is required.');
      return;
    }
    if (!formData.ifsc_code.trim()) {
      setFormError('IFSC Code is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'CREATE') {
        await onCreateBankAccount?.(formData);
      } else {
        await onUpdateBankAccount?.(selectedAccount.id, formData);
      }
      setModalMode(null);
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to save bank account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (acc) => {
    if (!window.confirm(`Are you sure you want to deactivate bank account "${acc.bank_name} (${acc.account_number})"?`)) {
      return;
    }
    try {
      await onDeleteBankAccount?.(acc.id);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to deactivate bank account.');
    }
  };

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  return (
    <div className="fin-page">
      
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="active-loans-header" style={{ marginBottom: 20 }}>
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: 'var(--brand-primary-light, #F0FEF5)',
            border: '1px solid var(--brand-primary-border, #A3F5C1)',
            color: 'var(--brand-primary, #15803D)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Landmark style={{ width: 22, height: 22, flexShrink: 0 }} />
          </div>
          <div className="header-text">
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
              Bank Account Master
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
              Manage registered company bank accounts, IFSC codes, branches, and linked Chart of Accounts ledgers.
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            onClick={handleOpenCreate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              background: 'var(--brand-primary, #15803D)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.82rem',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 4px rgba(21, 128, 61, 0.2)'
            }}
          >
            <Plus style={{ width: 16, height: 16, flexShrink: 0 }} />
            <span>Add Bank Account</span>
          </button>
        </div>
      </div>

      {/* ── KPI Stat Badges ─────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 18px' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
            Total Bank Accounts
          </span>
          <strong style={{ fontSize: '1.4rem', color: '#0F172A' }}>{bankAccounts.length}</strong>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 18px' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
            Active Operational Accounts
          </span>
          <strong style={{ fontSize: '1.4rem', color: '#15803D' }}>{activeCount}</strong>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 18px' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
            Total Registered Book Balance
          </span>
          <strong style={{ fontSize: '1.4rem', color: '#2563EB' }}>₹{fmt(totalBalance)}</strong>
        </div>
      </div>

      {/* ── Filters & Search ────────────────────────────────────────── */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '10px 10px 0 0',
        padding: '12px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
            <Search style={{ width: 14, height: 14, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search by bank name, account no, IFSC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: 34,
                padding: '0 12px 0 32px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: '0.8rem',
                color: '#0F172A'
              }}
            />
          </div>

          <SharedDropdown
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            size="sm"
            buttonStyle={{ height: 34, minWidth: 140 }}
            options={[
              { value: 'ALL', label: 'All Branches' },
              ...branchesList.map(b => ({ value: b.name, label: b.name }))
            ]}
          />
        </div>

        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
          Showing <strong>{filteredAccounts.length}</strong> of <strong>{bankAccounts.length}</strong> accounts
        </span>
      </div>

      {/* ── High-Density Data Table ─────────────────────────────────── */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderTop: 'none',
        borderRadius: '0 0 10px 10px',
        overflow: 'hidden'
      }}>
        <div className="fin-table-scroll">
          <table style={{ width: '100%', minWidth: 780, borderCollapse: 'collapse', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
              <th style={{ padding: '10px 14px', width: 40, textAlign: 'center' }}>#</th>
              <th style={{ padding: '10px 14px' }}>Bank Name & Account Title</th>
              <th style={{ padding: '10px 14px' }}>Account Number</th>
              <th style={{ padding: '10px 14px' }}>IFSC & Bank Branch</th>
              <th style={{ padding: '10px 14px' }}>Linked Company Branch</th>
              <th style={{ padding: '10px 14px' }}>GL Ledger Code</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Book Balance</th>
              <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                  No bank accounts found matching your filters.
                </td>
              </tr>
            ) : (
              filteredAccounts.map((acc, idx) => (
                <tr key={acc.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 14px', textAlign: 'center', color: '#94A3B8' }}>
                    {idx + 1}
                  </td>

                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        color: '#2563EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        flexShrink: 0
                      }}>
                        {acc.bank_name ? acc.bank_name.slice(0, 2).toUpperCase() : 'BK'}
                      </div>
                      <div>
                        <strong style={{ color: '#0F172A', display: 'block', fontSize: '0.82rem' }}>
                          {acc.bank_name}
                        </strong>
                        <span style={{ color: '#64748B', fontSize: '0.72rem' }}>
                          {acc.account_name} &bull; <span style={{ textTransform: 'capitalize' }}>{acc.account_type?.toLowerCase() || 'current'}</span>
                        </span>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, fontWeight: 700, color: '#0F172A' }}>
                        {acc.account_number}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(acc.account_number, acc.id)}
                        title="Copy Account Number"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8' }}
                      >
                        {copiedId === acc.id ? <Check style={{ width: 12, height: 12, color: '#15803D' }} /> : <Copy style={{ width: 12, height: 12 }} />}
                      </button>
                    </div>
                  </td>

                  <td style={{ padding: '12px 14px' }}>
                    <strong style={{ display: 'block', color: '#0F172A' }}>{acc.ifsc_code}</strong>
                    <span style={{ color: '#64748B', fontSize: '0.72rem' }}>{acc.branch_name || '—'}</span>
                  </td>

                  <td style={{ padding: '12px 14px', color: '#475569', fontWeight: 600 }}>
                    {acc.branch || acc.branch_name || 'Main Branch'}
                  </td>

                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      display: 'inline-block',
                      background: '#F0FEF5',
                      border: '1px solid #A3F5C1',
                      color: '#15803D',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontWeight: 700,
                      fontSize: '0.72rem'
                    }}>
                      {acc.ledger_account_code || '1002'}
                    </span>
                  </td>

                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                    ₹{fmt(acc.current_balance || acc.opening_balance || 0)}
                  </td>

                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: acc.is_active !== false ? '#DCFCE7' : '#F1F5F9',
                      color: acc.is_active !== false ? '#15803D' : '#64748B'
                    }}>
                      {acc.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap', width: 110 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(acc)}
                        title="Edit Bank Account"
                        style={{
                          width: 30,
                          height: 30,
                          flexShrink: 0,
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          color: '#475569',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        <Edit2 style={{ width: 14, height: 14, flexShrink: 0 }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(acc)}
                        title="Deactivate Bank Account"
                        style={{
                          width: 30,
                          height: 30,
                          flexShrink: 0,
                          borderRadius: 6,
                          border: '1px solid #FECACA',
                          background: '#FEF2F2',
                          color: '#DC2626',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        <Trash2 style={{ width: 14, height: 14, flexShrink: 0 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* ── Modal (Create / Edit) ──────────────────────────────────── */}
      {modalMode && (
        <div className="saas-modal-backdrop" style={{ zIndex: 100000 }}>
          <div className="saas-modal-card" style={{ maxWidth: 540 }}>
            
            {/* Modal Header */}
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary, #15803D)' }}>
                  <Landmark style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3 style={{ fontWeight: 600, fontSize: '0.98rem', color: '#0F172A', margin: 0 }}>
                    {modalMode === 'CREATE' ? 'Register New Company Bank Account' : `Edit Account: ${selectedAccount?.bank_name}`}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748B' }}>
                    {modalMode === 'CREATE' ? 'Add bank details for automated loan disbursal, payments & manual vouchers' : 'Update bank details or branch linkage'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="close-btn"
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ padding: '16px 20px', overflowY: 'auto', maxHeight: '72vh' }}>

                {formError && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'var(--color-danger-light, #FEF2F2)',
                    border: '1px solid var(--color-danger-border, #FECACA)',
                    color: 'var(--color-danger-hover, #B91C1C)',
                    fontSize: '0.78rem',
                    marginBottom: 16
                  }}>
                    <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0 }} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Popular Bank Selector / Autocomplete */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    required
                    list="popular-banks-list"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="e.g. State Bank of India, HDFC, ICICI..."
                    style={{
                      width: '100%',
                      height: 36,
                      padding: '0 10px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.8rem',
                      color: '#0F172A'
                    }}
                  />
                  <datalist id="popular-banks-list">
                    {POPULAR_BANKS.map(b => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>

                {/* Account Title & Account Type */}
                <div className="modal-grid-2" style={{ marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Account Holder / Display Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.account_name}
                      onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      placeholder="e.g. Main Disbursal Current A/C"
                      style={{
                        width: '100%',
                        height: 36,
                        padding: '0 10px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.8rem',
                        color: '#0F172A'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Account Type
                    </label>
                    <SharedDropdown
                      value={formData.account_type}
                      onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                      buttonStyle={{ height: 36, width: '100%' }}
                      options={[
                        { value: 'CURRENT', label: 'Current Account' },
                        { value: 'SAVINGS', label: 'Savings Account' },
                        { value: 'OVERDRAFT', label: 'Overdraft / OD' }
                      ]}
                    />
                  </div>
                </div>

                {/* Account Number & IFSC Code */}
                <div className="modal-grid-2" style={{ marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Account Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value.replace(/\s+/g, '') })}
                      placeholder="e.g. 50200012345678"
                      style={{
                        width: '100%',
                        height: 36,
                        padding: '0 10px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.8rem',
                        color: '#0F172A',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                      IFSC Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ifsc_code}
                      onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                      placeholder="e.g. HDFC0001234"
                      style={{
                        width: '100%',
                        height: 36,
                        padding: '0 10px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.8rem',
                        color: '#0F172A',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>

                {/* Bank Branch & Company Branch Assignment */}
                <div className="modal-grid-2" style={{ marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Bank Branch Location
                    </label>
                    <input
                      type="text"
                      value={formData.branch_name}
                      onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                      placeholder="e.g. Karur Main Branch"
                      style={{
                        width: '100%',
                        height: 36,
                        padding: '0 10px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.8rem',
                        color: '#0F172A'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Company Branch Assignment
                    </label>
                    <SharedDropdown
                      value={formData.company_branch}
                      onChange={(e) => setFormData({ ...formData, company_branch: e.target.value })}
                      placeholder="All Branches (Global / Central)"
                      buttonStyle={{ height: 36, width: '100%' }}
                      options={[
                        { value: '', label: 'All Branches (Global / Central)' },
                        ...branchesList.map(b => ({ value: b.name, label: b.name }))
                      ]}
                    />
                  </div>
                </div>

                {/* Opening Balance */}
                {modalMode === 'CREATE' && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Opening Book Balance (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.opening_balance}
                      onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        height: 36,
                        padding: '0 10px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.8rem',
                        color: '#0F172A'
                      }}
                    />
                  </div>
                )}

              </div>

              {/* Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                padding: '14px 20px',
                borderTop: '1px solid #E2E8F0',
                background: '#F8FAFC',
                flexShrink: 0
              }}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setModalMode(null)}
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
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Check style={{ width: 14, height: 14 }} />
                  {submitting ? 'Saving...' : modalMode === 'CREATE' ? 'Register Bank Account' : 'Update Bank Account'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
