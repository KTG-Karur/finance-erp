import React, { useState } from 'react';
import { Building2, MapPin, Plus, Trash2, Pencil, X, AlertTriangle, Loader2, Save, CheckCircle2 } from 'lucide-react';

const inputStyle = { width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 500 };
const labelStyle = { fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 };

function SubCompanyModal({ isOpen, initialData, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', code: '', is_active: true });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setForm(initialData ? { name: initialData.name, code: initialData.code, is_active: Boolean(initialData.is_active) } : { name: '', code: '', is_active: true });
      setError('');
    }
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
      setError(err?.response?.data?.message || 'Unable to save sub-company.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card" style={{ maxWidth: 460 }}>
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: '#ECFDF5', color: '#059669' }}>
              <Building2 style={{ width: 18, height: 18 }} />
            </div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600 }}>{initialData ? 'Edit Sub-Company' : 'Add Sub-Company'}</h3>
              <p>Organizational unit grouping branches together</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
          {error && (
            <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{error}</span></div>
          )}
          <div>
            <label style={labelStyle}>Sub-Company Name *</label>
            <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sub-Company A1" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Code *</label>
            <input type="text" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. A1" style={{ ...inputStyle, fontFamily: 'monospace', textTransform: 'uppercase' }} maxLength={20} />
          </div>
          {initialData && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#334155' }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ background: '#059669', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Sub-Company')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BranchModal({ isOpen, initialData, subCompanies, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', code: '', sub_company_id: '', address: '', is_active: true });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setForm(initialData
        ? { name: initialData.name, code: initialData.code, sub_company_id: initialData.sub_company_id || '', address: initialData.address || '', is_active: Boolean(initialData.is_active) }
        : { name: '', code: '', sub_company_id: '', address: '', is_active: true });
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onSubmit({ ...form, sub_company_id: form.sub_company_id ? Number(form.sub_company_id) : null }, initialData?.id);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save branch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card" style={{ maxWidth: 520 }}>
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <MapPin style={{ width: 18, height: 18 }} />
            </div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600 }}>{initialData ? 'Edit Branch' : 'Add Branch'}</h3>
              <p>Physical operating location under this organization</p>
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
              <label style={labelStyle}>Branch Name *</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Karur Main Branch" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Code *</label>
              <input type="text" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. KRM" style={{ ...inputStyle, fontFamily: 'monospace', textTransform: 'uppercase' }} maxLength={20} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Sub-Company</label>
            <select value={form.sub_company_id} onChange={e => setForm({ ...form, sub_company_id: e.target.value })} style={inputStyle}>
              <option value="">— No Sub-Company (Direct under Company) —</option>
              {subCompanies.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Address</label>
            <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Branch office address" style={inputStyle} />
          </div>
          {initialData && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#334155' }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Branch')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OrganizationHierarchyView({
  subCompanies = [], branches = [], loading, error,
  onCreateSubCompany, onUpdateSubCompany, onDeleteSubCompany,
  onCreateBranch, onUpdateBranch, onDeleteBranch,
  companyForm, setCompanyForm, onSaveCompany, savedSuccess
}) {
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subEditing, setSubEditing] = useState(null);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchEditing, setBranchEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type, item }
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const subCompanyName = (id) => subCompanies.find(s => s.id === id)?.name || '—';

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      if (deleteTarget.type === 'SUB_COMPANY') await onDeleteSubCompany(deleteTarget.item.id);
      else await onDeleteBranch(deleteTarget.item.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err?.response?.data?.message || 'Unable to delete this record.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div className="active-loans-header">
        <div className="header-left">
          <div className="header-badge-icon" style={{ background: '#F1F5F9', borderColor: '#CBD5E1', color: '#334155' }}>
            <Building2 style={{ width: 20, height: 20 }} />
          </div>
          <div className="header-text">
            <h1 style={{ fontWeight: 600 }}>Organization & Company Profile</h1>
            <p style={{ fontWeight: 400 }}>Company registration details plus the sub-company & branch hierarchy staff logins and access scoping are built on</p>
          </div>
        </div>
      </div>

      {companyForm && (
        <form onSubmit={onSaveCompany} className="loans-table-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: 10 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div>
              <label style={labelStyle}>Company / Entity Name</label>
              <input type="text" required value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} style={{ ...inputStyle, fontWeight: 600 }} />
            </div>
            <div>
              <label style={labelStyle}>GSTIN Registration No</label>
              <input type="text" value={companyForm.gstin} onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Company PAN Number</label>
              <input type="text" value={companyForm.pan} onChange={(e) => setCompanyForm({ ...companyForm, pan: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Corporate Phone</label>
              <input type="text" value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" style={{ height: 38, background: '#059669', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '0 18px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Save style={{ width: 14, height: 14 }} />
              <span>Save Company Profile</span>
            </button>
          </div>
        </form>
      )}

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
        <>
          {/* Sub-Companies */}
          <div className="loans-table-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 style={{ width: 16, height: 16, color: '#059669' }} />
                <span>Sub-Companies</span>
              </div>
              <button
                onClick={() => { setSubEditing(null); setSubModalOpen(true); }}
                style={{ background: '#059669', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Plus style={{ width: 14, height: 14 }} />
                <span>Add Sub-Company</span>
              </button>
            </div>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 50, textAlign: 'center' }}>S.No</th>
                    <th>Name</th>
                    <th>Code</th>
                    <th style={{ textAlign: 'center' }}>Branches</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subCompanies.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>No sub-companies yet.</td></tr>
                  ) : subCompanies.map((sc, idx) => (
                    <tr key={sc.id}>
                      <td style={{ textAlign: 'center', color: '#64748B', fontWeight: 500 }}>{idx + 1}</td>
                      <td><strong style={{ fontWeight: 600, color: '#0F172A' }}>{sc.name}</strong></td>
                      <td><span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{sc.code}</span></td>
                      <td style={{ textAlign: 'center', color: '#64748B' }}>{branches.filter(b => b.sub_company_id === sc.id).length}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, background: sc.is_active ? '#ECFDF5' : '#F1F5F9', color: sc.is_active ? '#059669' : '#94A3B8' }}>
                          {sc.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button onClick={() => { setSubEditing(sc); setSubModalOpen(true); }} style={{ border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                            <Pencil style={{ width: 12, height: 12 }} />
                          </button>
                          <button onClick={() => { setDeleteTarget({ type: 'SUB_COMPANY', item: sc }); setDeleteError(''); }} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
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

          {/* Branches */}
          <div className="loans-table-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin style={{ width: 16, height: 16, color: '#2563EB' }} />
                <span>Branches</span>
              </div>
              <button
                onClick={() => { setBranchEditing(null); setBranchModalOpen(true); }}
                style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Plus style={{ width: 14, height: 14 }} />
                <span>Add Branch</span>
              </button>
            </div>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 50, textAlign: 'center' }}>S.No</th>
                    <th>Branch Name</th>
                    <th>Code</th>
                    <th>Sub-Company</th>
                    <th>Address</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>No branches yet.</td></tr>
                  ) : branches.map((b, idx) => (
                    <tr key={b.id}>
                      <td style={{ textAlign: 'center', color: '#64748B', fontWeight: 500 }}>{idx + 1}</td>
                      <td><strong style={{ fontWeight: 600, color: '#0F172A' }}>{b.name}</strong></td>
                      <td><span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{b.code}</span></td>
                      <td><span style={{ fontSize: '0.78rem', color: '#64748B' }}>{b.sub_company_id ? subCompanyName(b.sub_company_id) : '—'}</span></td>
                      <td><span style={{ fontSize: '0.78rem', color: '#64748B' }}>{b.address || '—'}</span></td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, background: b.is_active ? '#EFF6FF' : '#F1F5F9', color: b.is_active ? '#2563EB' : '#94A3B8' }}>
                          {b.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button onClick={() => { setBranchEditing(b); setBranchModalOpen(true); }} style={{ border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                            <Pencil style={{ width: 12, height: 12 }} />
                          </button>
                          <button onClick={() => { setDeleteTarget({ type: 'BRANCH', item: b }); setDeleteError(''); }} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
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
        </>
      )}

      <SubCompanyModal
        isOpen={subModalOpen}
        initialData={subEditing}
        onClose={() => setSubModalOpen(false)}
        onSubmit={(form, id) => id ? onUpdateSubCompany(id, form) : onCreateSubCompany(form)}
      />

      <BranchModal
        isOpen={branchModalOpen}
        initialData={branchEditing}
        subCompanies={subCompanies}
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
                  <h3>Delete {deleteTarget.type === 'SUB_COMPANY' ? 'Sub-Company' : 'Branch'}</h3>
                  <p>This action cannot be undone</p>
                </div>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="saas-modal-body">
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>
                Are you sure you want to permanently delete <strong>{deleteTarget.item.name}</strong>?
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
