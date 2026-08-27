import React, { useState } from 'react';
import { Building2, MapPin, Plus, Trash2, Pencil, X, AlertTriangle, Loader2, Save, CheckCircle2, Camera, Trash, Crown, Clock, Calendar, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { theme } from '../styles/theme.js';
import { uploadFile } from '../api/upload.js';

const inputStyle = { width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 500, boxSizing: 'border-box' };
const labelStyle = { fontSize: '0.72rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 4 };

function BranchModal({ isOpen, initialData, onClose, onSubmit }) {
  const { t } = useLanguage();
  const emptyForm = { name: '', code: '', address: '', city: '', state: '', pincode: '', phone: '', is_active: true };
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setForm(initialData
        ? {
            name: initialData.name,
            code: initialData.code,
            address: initialData.address || '',
            city: initialData.city || '',
            state: initialData.state || '',
            pincode: initialData.pincode || '',
            phone: initialData.phone || '',
            is_active: Boolean(initialData.is_active)
          }
        : emptyForm);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onSubmit(form, initialData?.id);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || t('branch.save_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card" style={{ maxWidth: 560 }}>
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: 'var(--color-info-light, #EFF6FF)', color: 'var(--color-info, #2563EB)', flexShrink: 0 }}>
              <MapPin style={{ width: 18, height: 18 }} />
            </div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600, fontSize: '0.98rem', color: '#0F172A', margin: 0 }}>{initialData ? t('branch.title_edit') : t('org.add_branch')}</h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748B' }}>{t('branch.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 20px', maxHeight: '78vh', overflowY: 'auto' }}>
          {error && (
            <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{error}</span></div>
          )}

          <div className="modal-grid-2">
            <div>
              <label style={labelStyle}>{t('branch.modal.name')} *</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Karur Main Branch" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('branch.modal.code')} *</label>
              <input type="text" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. KRR-01" style={inputStyle} />
            </div>
          </div>

          <div className="modal-grid-2">
            <div>
              <label style={labelStyle}>{t('branch.modal.phone')}</label>
              <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 04324-220000" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('branch.modal.pincode')}</label>
              <input type="text" value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} placeholder="e.g. 639001" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t('branch.modal.address')}</label>
            <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street address..." style={inputStyle} />
          </div>

          <div className="modal-grid-2">
            <div>
              <label style={labelStyle}>{t('branch.modal.city')}</label>
              <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="City" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('branch.modal.state')}</label>
              <input type="text" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="State" style={inputStyle} />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#334155', fontWeight: 500, cursor: 'pointer', marginTop: 4 }}>
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} style={{ width: 16, height: 16, accentColor: 'var(--brand-primary, #15803D)' }} />
            <span>{t('form.active')}</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12, borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: 6, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              {t('btn.cancel')}
            </button>
            <button type="submit" disabled={loading} style={{ background: 'var(--color-info, #2563EB)', color: '#FFFFFF', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? t('form.saving') : (initialData ? t('form.save_changes') : t('branch.add'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OrganizationHierarchyView({
  tenant,
  branches = [],
  loading,
  error,
  onCreateBranch,
  onUpdateBranch,
  onDeleteBranch,
  companyForm,
  setCompanyForm,
  onSaveCompany,
  savedSuccess,
  companySaveError,
  companySaving
}) {
  const { t, tStatus } = useLanguage();
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchEditing, setBranchEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [logoError, setLogoError] = useState('');
  const [logoImgError, setLogoImgError] = useState(false);

  React.useEffect(() => {
    setLogoImgError(false);
  }, [companyForm?.logo]);

  const confirmDelete = async () => {
    if (!deleteTarget || deleteLoading) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await onDeleteBranch(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err?.response?.data?.message || 'Unable to delete this branch.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoError('Please upload an image file (JPG or PNG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoError('Logo is too large — please upload an image under 5MB.');
      return;
    }
    setLogoError('');
    try {
      const res = await uploadFile(file, { subfolder: 'company-info', category: 'logo', prefix: 'company_logo' });
      if (res?.url && setCompanyForm) {
        setLogoImgError(false);
        setCompanyForm(prev => ({ ...prev, logo: res.url }));
      }
    } catch {
      setLogoError('Failed to upload logo.');
    }
  };

  return (
    <div className="master-settings-page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div className="active-loans-header">
        <div className="header-left">
          <div className="header-badge-icon" style={{ background: '#F1F5F9', borderColor: '#CBD5E1', color: '#334155', flexShrink: 0 }}>
            <Building2 style={{ width: 20, height: 20, flexShrink: 0 }} />
          </div>
          <div className="header-text">
            <h1 style={{ fontWeight: 700, fontSize: '1.25rem', color: '#0F172A', margin: 0 }}>{t('org.title')}</h1>
            <p style={{ fontWeight: 400, fontSize: '0.78rem', color: '#64748B', margin: '2px 0 0 0' }}>{t('org.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="org-split-layout">

        {/* ── Left Panel: Company Profile ─────────────────────────── */}
        {companyForm && (
          <form onSubmit={onSaveCompany} className="loans-table-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: 10 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 style={{ width: 16, height: 16, color: '#334155', flexShrink: 0 }} />
                <span>Company Profile</span>
              </div>
              {savedSuccess && (
                <span style={{ padding: '4px 12px', borderRadius: 20, background: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary-hover, #0E5327)', border: '1px solid var(--brand-primary-border, #A3F5C1)', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 style={{ width: 14, height: 14 }} />
                  <span>Saved!</span>
                </span>
              )}
            </div>

            {companySaveError && (
              <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{companySaveError}</span></div>
            )}
            {logoError && (
              <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{logoError}</span></div>
            )}

            {/* Company Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 56, height: 56, flexShrink: 0 }}>
                {companyForm.logo && !logoImgError ? (
                  <img
                    key={companyForm.logo}
                    src={companyForm.logo}
                    alt="Company logo"
                    onError={() => setLogoImgError(true)}
                    style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', border: '1px solid #E2E8F0' }}
                  />
                ) : (
                  <div style={{
                    width: 56, height: 56, borderRadius: 10, background: '#F1F5F9', border: '1px solid #CBD5E1',
                    color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Building2 style={{ width: 24, height: 24 }} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 500,
                  color: '#334155', border: '1px solid #CBD5E1', background: '#FFF', borderRadius: 7,
                  padding: '6px 12px', cursor: 'pointer', width: 'fit-content'
                }}>
                  <Camera style={{ width: 13, height: 13 }} />
                  <span>{companyForm.logo ? 'Change Logo' : 'Upload Logo'}</span>
                  <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                </label>
                {companyForm.logo && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoImgError(false);
                      setCompanyForm({ ...companyForm, logo: null });
                    }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 500,
                      color: 'var(--color-danger, #DC2626)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: 'fit-content'
                    }}
                  >
                    <Trash style={{ width: 11, height: 11 }} />
                    <span>Remove Logo</span>
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Company / Entity Name *</label>
                <input type="text" required value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>GSTIN Registration No</label>
                <input
                  type="text"
                  value={companyForm.gstin}
                  onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value.toUpperCase() })}
                  maxLength={15}
                  placeholder="22AAAAA0000A1Z5"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>PAN Number</label>
                <input
                  type="text"
                  value={companyForm.pan}
                  onChange={(e) => setCompanyForm({ ...companyForm, pan: e.target.value.toUpperCase() })}
                  maxLength={10}
                  placeholder="ABCDE1234F"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Corporate Phone</label>
                <input type="text" value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Registered Address</label>
                <input type="text" value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="submit"
                disabled={companySaving}
                style={{
                  height: 38,
                  background: companySaving ? '#94A3B8' : theme.primary,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0 18px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: companySaving ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  maxWidth: '100%'
                }}
              >
                <Save style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span>{companySaving ? 'Saving...' : 'Save Company Profile'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ── Right Panel: Branches ────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div className="form-alert form-alert--error" style={{ margin: 0 }}>
              <AlertTriangle style={{ width: 14, height: 14 }} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="loans-table-card" style={{ padding: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#64748B' }}>
              <Loader2 className="spin" style={{ width: 16, height: 16 }} />
              <span>Loading organization structure...</span>
            </div>
          ) : (
            <div className="loans-table-card">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 400, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin style={{ width: 16, height: 16, color: 'var(--color-info, #2563EB)' }} />
                  <span>Branches</span>
                </div>
                <button
                  onClick={() => { setBranchEditing(null); setBranchModalOpen(true); }}
                  style={{ background: 'var(--color-info, #2563EB)', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: '0.78rem', fontWeight: 400, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  <span>{t('org.add_branch')}</span>
                </button>
              </div>
              <div className="fin-table-scroll">
                <table style={{ minWidth: 600 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 50, textAlign: 'center' }}>{t('col.sno')}</th>
                      <th>{t('col.branch_name')}</th>
                      <th>{t('col.code')}</th>
                      <th>{t('col.phone')}</th>
                      <th>{t('col.address')}</th>
                      <th style={{ textAlign: 'center' }}>{t('col.status')}</th>
                      <th style={{ textAlign: 'right' }}>{t('col.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>No branches yet.</td></tr>
                    ) : branches.map((b, idx) => (
                      <tr key={b.id}>
                        <td style={{ textAlign: 'center', color: '#64748B', fontWeight: 500 }}>{idx + 1}</td>
                        <td><strong style={{ fontWeight: 400, color: '#0F172A' }}>{b.name}</strong></td>
                        <td><span style={{ fontFamily: 'monospace', fontWeight: 400, color: '#334155' }}>{b.code}</span></td>
                        <td><span style={{ fontSize: '0.78rem', color: '#64748B' }}>{b.phone || '—'}</span></td>
                        <td><span style={{ fontSize: '0.78rem', color: '#64748B' }}>{b.address || '—'}</span></td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 400, background: b.is_active ? 'var(--color-info-light, #EFF6FF)' : '#F1F5F9', color: b.is_active ? 'var(--color-info, #2563EB)' : '#94A3B8' }}>
                            {b.is_active ? tStatus('ACTIVE') : tStatus('INACTIVE')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap', width: 90 }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => { setBranchEditing(b); setBranchModalOpen(true); }}
                              title="Edit Branch"
                              style={{ width: 30, height: 30, flexShrink: 0, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                            >
                              <Pencil style={{ width: 13, height: 13, flexShrink: 0 }} />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setDeleteTarget(b); setDeleteError(''); }}
                              title="Delete Branch"
                              style={{ width: 30, height: 30, flexShrink: 0, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                            >
                              <Trash2 style={{ width: 13, height: 13, flexShrink: 0 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Subscription & Plan Overview Card ── */}
          <div className="loans-table-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Crown style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Subscription & License Details
                  </h3>
                  <p style={{ fontSize: '0.74rem', color: '#64748B', margin: '2px 0 0 0' }}>
                    Active ERP plan, validity schedule, and allocated branch limits
                  </p>
                </div>
              </div>

              <div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: 14,
                  backgroundColor: (tenant?.subscription_status || 'ACTIVE') === 'ACTIVE' ? '#DCFCE7' : (tenant?.subscription_status === 'TRIAL' ? '#FEF3C7' : '#FEE2E2'),
                  color: (tenant?.subscription_status || 'ACTIVE') === 'ACTIVE' ? '#15803D' : (tenant?.subscription_status === 'TRIAL' ? '#B45309' : '#DC2626'),
                  border: `1px solid ${(tenant?.subscription_status || 'ACTIVE') === 'ACTIVE' ? '#BBF7D0' : (tenant?.subscription_status === 'TRIAL' ? '#FDE68A' : '#FECACA')}`
                }}>
                  {tenant?.subscription_status || 'ACTIVE'}
                </span>
              </div>
            </div>

            {/* 3-Column Stat Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              {/* Plan Name */}
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <ShieldCheck style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} />
                  <span>Current Plan</span>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                  {tenant?.plan_name || tenant?.plan_tier || 'Standard Plan'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>
                  Tier: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{tenant?.plan_code || tenant?.plan_tier || 'STANDARD'}</span>
                </div>
              </div>

              {/* Remaining Days */}
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Clock style={{ width: 14, height: 14, color: '#2563EB' }} />
                  <span>Remaining Days</span>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: (tenant?.remaining_days !== null && tenant?.remaining_days !== undefined && tenant?.remaining_days <= 10) ? '#DC2626' : '#0F172A' }}>
                  {tenant?.remaining_days !== null && tenant?.remaining_days !== undefined ? `${tenant.remaining_days} Days` : '365 Days'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>
                  {tenant?.subscription_end_date ? `Valid till ${new Date(tenant.subscription_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'Annual Active Cycle'}
                </div>
              </div>

              {/* Branch Allocation Limit */}
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <MapPin style={{ width: 14, height: 14, color: '#7C3AED' }} />
                  <span>Branch Allocation</span>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                  {branches.length} <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 500 }}>/ {tenant?.max_branches ? `${tenant.max_branches} max` : 'Unlimited'}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>
                  {tenant?.max_branches ? `${Math.max(0, tenant.max_branches - branches.length)} branch slot(s) remaining` : 'Unlimited physical branches'}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <BranchModal
        isOpen={branchModalOpen}
        initialData={branchEditing}
        onClose={() => setBranchModalOpen(false)}
        onSubmit={(form, id) => id ? onUpdateBranch(id, form) : onCreateBranch(form)}
      />

      {deleteTarget && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card">
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: 'var(--color-danger-light, #FEF2F2)', borderColor: 'var(--color-danger-border, #FECACA)', color: 'var(--color-danger, #DC2626)' }}>
                  <Trash2 style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>Delete Branch</h3>
                  <p>This action cannot be undone</p>
                </div>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="close-btn" type="button" disabled={deleteLoading}><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="saas-modal-body">
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>
                Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong>?
              </p>
              {deleteError && (
                <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{deleteError}</span></div>
              )}
            </div>
            <div className="saas-modal-footer">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleteLoading} className="btn-cancel">Cancel</button>
              <button type="button" onClick={confirmDelete} disabled={deleteLoading} className="btn-submit" style={{ background: 'var(--color-danger, #DC2626)', boxShadow: '0 2px 6px rgba(var(--color-danger-rgb), 0.3)' }}>
                {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
