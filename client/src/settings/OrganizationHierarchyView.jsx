import React, { useState } from 'react';
import { Building2, MapPin, Plus, Trash2, Pencil, X, AlertTriangle, Loader2, Save, CheckCircle2, Camera, Trash } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

const inputStyle = { width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 500 };
const labelStyle = { fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 };

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
            <div className="head-icon-badge" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <MapPin style={{ width: 18, height: 18 }} />
            </div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 400 }}>{initialData ? t('branch.title_edit') : t('org.add_branch')}</h3>
              <p>{t('branch.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
          {error && (
            <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{error}</span></div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('branch.name_label')}</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Karur Main Branch" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('branch.code_label')}</label>
              <input type="text" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, '') })} placeholder="e.g. KRM" style={{ ...inputStyle, fontFamily: 'monospace', textTransform: 'uppercase' }} maxLength={20} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('branch.phone_label')}</label>
              <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 04324 123456" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('form.pincode')}</label>
              <input type="text" value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} placeholder="e.g. 639001" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t('col.address')}</label>
            <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Branch office address" style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('form.city')}</label>
              <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="e.g. Karur" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('form.state')}</label>
              <input type="text" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="e.g. Tamil Nadu" style={inputStyle} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#334155' }}>
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
            {t('form.active')}
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>{t('btn.cancel')}</button>
            <button type="submit" disabled={loading} style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 400, cursor: 'pointer' }}>
              {loading ? t('form.saving') : (initialData ? t('form.save_changes') : t('org.add_branch'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OrganizationHierarchyView({
  branches = [], loading, error,
  onCreateBranch, onUpdateBranch, onDeleteBranch,
  companyForm, setCompanyForm, onSaveCompany, savedSuccess
}) {
  const { t, tStatus } = useLanguage();
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchEditing, setBranchEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // branch being deleted
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
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

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setCompanyForm({ ...companyForm, logo: reader.result });
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div className="active-loans-header">
        <div className="header-left">
          <div className="header-badge-icon" style={{ background: '#F1F5F9', borderColor: '#CBD5E1', color: '#334155' }}>
            <Building2 style={{ width: 20, height: 20 }} />
          </div>
          <div className="header-text">
            <h1 style={{ fontWeight: 400 }}>{t('org.title')}</h1>
            <p style={{ fontWeight: 400 }}>{t('org.subtitle')}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Left Panel: Company Profile ─────────────────────────── */}
        {companyForm && (
          <form onSubmit={onSaveCompany} className="loans-table-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: 10 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 400, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 style={{ width: 16, height: 16, color: '#334155' }} />
                <span>Company Profile</span>
              </div>
              {savedSuccess && (
                <span style={{ padding: '4px 12px', borderRadius: 20, background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', fontSize: '0.75rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 style={{ width: 14, height: 14 }} />
                  <span>Saved!</span>
                </span>
              )}
            </div>

            {/* Company Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 60, height: 60, flexShrink: 0 }}>
                {companyForm.logo ? (
                  <img
                    src={companyForm.logo}
                    alt="Company logo"
                    style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover', border: '1px solid #E2E8F0' }}
                  />
                ) : (
                  <div style={{
                    width: 60, height: 60, borderRadius: 10, background: '#F1F5F9', border: '1px solid #CBD5E1',
                    color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Building2 style={{ width: 24, height: 24 }} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 400,
                  color: '#334155', border: '1px solid #CBD5E1', background: '#FFF', borderRadius: 7,
                  padding: '6px 10px', cursor: 'pointer', width: 'fit-content'
                }}>
                  <Camera style={{ width: 13, height: 13 }} />
                  {companyForm.logo ? 'Change Logo' : 'Upload Logo'}
                  <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                </label>
                {companyForm.logo && (
                  <button
                    type="button"
                    onClick={() => setCompanyForm({ ...companyForm, logo: null })}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 500,
                      color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: 'fit-content'
                    }}
                  >
                    <Trash style={{ width: 11, height: 11 }} />
                    Remove Logo
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Company / Entity Name</label>
                <input type="text" required value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} style={{ ...inputStyle, fontWeight: 400 }} />
              </div>
              <div>
                <label style={labelStyle}>GSTIN Registration No</label>
                <input type="text" value={companyForm.gstin} onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value })} style={inputStyle} />
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

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" style={{ height: 38, background: '#059669', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '0 18px', fontSize: '0.78rem', fontWeight: 400, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Save style={{ width: 14, height: 14 }} />
                <span>Save Company Profile</span>
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
                  <MapPin style={{ width: 16, height: 16, color: '#2563EB' }} />
                  <span>Branches</span>
                </div>
                <button
                  onClick={() => { setBranchEditing(null); setBranchModalOpen(true); }}
                  style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: '0.78rem', fontWeight: 400, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  <span>{t('org.add_branch')}</span>
                </button>
              </div>
              <div className="table-responsive">
                <table>
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
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 400, background: b.is_active ? '#EFF6FF' : '#F1F5F9', color: b.is_active ? '#2563EB' : '#94A3B8' }}>
                            {b.is_active ? tStatus('ACTIVE') : tStatus('INACTIVE')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button onClick={() => { setBranchEditing(b); setBranchModalOpen(true); }} style={{ border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                              <Pencil style={{ width: 12, height: 12 }} />
                            </button>
                            <button onClick={() => { setDeleteTarget(b); setDeleteError(''); }} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                              <Trash2 style={{ width: 12, height: 12 }} />
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
                <div className="head-icon-badge" style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' }}>
                  <Trash2 style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>Delete Branch</h3>
                  <p>This action cannot be undone</p>
                </div>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
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
              <button type="button" onClick={() => setDeleteTarget(null)} className="btn-cancel">Cancel</button>
              <button type="button" onClick={confirmDelete} disabled={deleteLoading} className="btn-submit" style={{ background: '#DC2626', boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)' }}>
                {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
