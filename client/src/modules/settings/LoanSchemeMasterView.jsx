import React, { useState } from 'react';
import { Percent, Plus, Trash2, Pencil, X, AlertTriangle } from 'lucide-react';

const inputStyle = { width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', fontWeight: 500 };
const labelStyle = { fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 };

const REPAYMENT_MODES = [
  { value: 'INTEREST_ONLY', label: 'Interest-Only (principal at closure)' },
  { value: 'FLEXIBLE', label: 'Flexible (interest + variable principal)' },
  { value: 'FIXED_EMI', label: 'Fixed EMI (interest + principal combined)' }
];

const EMPTY_SLAB = { from_day: '', to_day: '', rate: '' };

function SchemeModal({ isOpen, initialData, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', unit_base: 1000, rate_per_unit: '', repayment_mode: 'FIXED_EMI', is_active: true });
  const [slabs, setSlabs] = useState([{ ...EMPTY_SLAB }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          name: initialData.name, unit_base: initialData.unit_base, rate_per_unit: initialData.rate_per_unit,
          repayment_mode: initialData.repayment_mode, is_active: initialData.is_active !== false
        });
        setSlabs(initialData.day_slabs?.length ? initialData.day_slabs.map(s => ({ ...s, to_day: s.to_day ?? '' })) : [{ ...EMPTY_SLAB }]);
      } else {
        setForm({ name: '', unit_base: 1000, rate_per_unit: '', repayment_mode: 'FIXED_EMI', is_active: true });
        setSlabs([{ ...EMPTY_SLAB }]);
      }
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const updateSlab = (idx, field, value) => {
    setSlabs(prev => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };
  const addSlab = () => setSlabs(prev => [...prev, { ...EMPTY_SLAB }]);
  const removeSlab = (idx) => setSlabs(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.rate_per_unit) return;
    if (slabs.some(s => !s.from_day || !s.rate)) {
      setError('Every day-slab row needs at least a From Day and a Rate.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const cleanSlabs = slabs.map(s => ({
        from_day: Number(s.from_day),
        to_day: s.to_day === '' ? null : Number(s.to_day),
        rate: parseFloat(s.rate)
      }));
      await onSubmit({ ...form, unit_base: Number(form.unit_base), rate_per_unit: parseFloat(form.rate_per_unit), day_slabs: cleanSlabs }, initialData?.id);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save loan scheme.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-modal-backdrop">
      <div className="saas-modal-card saas-modal-card--lg">
        <div className="saas-modal-header">
          <div className="head-left">
            <div className="head-icon-badge" style={{ background: '#ECFDF5', color: '#059669' }}>
              <Percent style={{ width: 18, height: 18 }} />
            </div>
            <div className="head-titles">
              <h3 style={{ fontWeight: 600 }}>{initialData ? 'Edit Loan Scheme' : 'Add Loan Scheme'}</h3>
              <p>Unit-base interest rate, day-slab brackets & repayment mode</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
          {error && <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{error}</span></div>}

          <div>
            <label style={labelStyle}>Scheme Name *</label>
            <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Standard Microfinance Plan" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Unit Base</label>
              <select value={form.unit_base} onChange={e => setForm({ ...form, unit_base: e.target.value })} style={inputStyle}>
                <option value={100}>Per ₹100</option>
                <option value={1000}>Per ₹1000</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Rate per Unit (%) *</label>
              <input type="number" step="0.01" required value={form.rate_per_unit} onChange={e => setForm({ ...form, rate_per_unit: e.target.value })} placeholder="14.0" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Repayment Mode</label>
            <select value={form.repayment_mode} onChange={e => setForm({ ...form, repayment_mode: e.target.value })} style={inputStyle}>
              {REPAYMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Day-Slab Rate Brackets</label>
              <button type="button" onClick={addSlab} style={{ border: 'none', background: '#ECFDF5', color: '#059669', borderRadius: 6, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Plus style={{ width: 12, height: 12 }} /> Add Slab
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {slabs.map((slab, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                  <input type="number" min="1" placeholder="From Day" value={slab.from_day} onChange={e => updateSlab(idx, 'from_day', e.target.value)} style={inputStyle} />
                  <input type="number" min="1" placeholder="To Day (blank = open-ended)" value={slab.to_day} onChange={e => updateSlab(idx, 'to_day', e.target.value)} style={inputStyle} />
                  <input type="number" step="0.01" placeholder="Rate %" value={slab.rate} onChange={e => updateSlab(idx, 'rate', e.target.value)} style={inputStyle} />
                  <button type="button" onClick={() => removeSlab(idx)} disabled={slabs.length === 1} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', borderRadius: 6, width: 32, height: 38, cursor: slabs.length === 1 ? 'not-allowed' : 'pointer', opacity: slabs.length === 1 ? 0.5 : 1 }}>
                    <Trash2 style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.68rem', color: '#94A3B8', margin: '6px 0 0 0' }}>
              e.g. Days 1–90 at 14%, Days 91–180 at 16%, 181+ (leave "To Day" blank) at 22% as a penalty slab.
            </p>
          </div>

          {initialData && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#334155' }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ background: '#059669', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Scheme')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoanSchemeMasterView({ schemes = [], onCreateScheme, onUpdateScheme, onDeleteScheme }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const slabSummary = (scheme) => {
    if (!scheme.day_slabs?.length) return '—';
    return scheme.day_slabs.map(s => `${s.from_day}-${s.to_day ?? '∞'}d @ ${s.rate}%`).join(', ');
  };

  const repaymentLabel = (mode) => REPAYMENT_MODES.find(m => m.value === mode)?.label.split(' (')[0] || mode;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="active-loans-header">
        <div className="header-left">
          <div className="header-badge-icon" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#059669' }}>
            <Percent style={{ width: 20, height: 20 }} />
          </div>
          <div className="header-text">
            <h1 style={{ fontWeight: 600 }}>Loan Scheme Master</h1>
            <p style={{ fontWeight: 400 }}>Unit-base interest rates, day-slab brackets, and repayment modes used when disbursing loans</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-disburse" onClick={() => { setEditing(null); setModalOpen(true); }} style={{ background: '#059669', fontWeight: 600 }}>
            <Plus style={{ width: 15, height: 15 }} />
            <span>Add Loan Scheme</span>
          </button>
        </div>
      </div>

      <div className="loans-table-card">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: 50, textAlign: 'center' }}>S.No</th>
                <th>Scheme Name</th>
                <th>Unit Base</th>
                <th style={{ textAlign: 'right' }}>Rate / Unit</th>
                <th>Day-Slab Brackets</th>
                <th>Repayment Mode</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schemes.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>No loan schemes configured yet.</td></tr>
              ) : schemes.map((s, idx) => (
                <tr key={s.id}>
                  <td style={{ textAlign: 'center', color: '#64748B' }}>{idx + 1}</td>
                  <td><strong style={{ fontWeight: 600, color: '#0F172A' }}>{s.name}</strong></td>
                  <td><span style={{ fontFamily: 'monospace', color: '#334155' }}>₹{s.unit_base}</span></td>
                  <td style={{ textAlign: 'right', color: '#059669', fontWeight: 600 }}>{s.rate_per_unit}%</td>
                  <td><span style={{ fontSize: '0.72rem', color: '#64748B' }}>{slabSummary(s)}</span></td>
                  <td><span style={{ fontSize: '0.75rem', color: '#334155' }}>{repaymentLabel(s.repayment_mode)}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, background: s.is_active ? '#ECFDF5' : '#F1F5F9', color: s.is_active ? '#059669' : '#94A3B8' }}>
                      {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button onClick={() => { setEditing(s); setModalOpen(true); }} style={{ border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#334155', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                        <Pencil style={{ width: 12, height: 12 }} />
                      </button>
                      <button onClick={() => { setDeleteTarget(s); setDeleteError(''); }} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
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

      <SchemeModal
        isOpen={modalOpen}
        initialData={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={(form, id) => id ? onUpdateScheme(id, form) : onCreateScheme(form)}
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
                  <h3>Delete Loan Scheme</h3>
                  <p>This action cannot be undone</p>
                </div>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="saas-modal-body">
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong>?</p>
              {deleteError && <div className="form-alert form-alert--error"><AlertTriangle style={{ width: 14, height: 14 }} /><span>{deleteError}</span></div>}
            </div>
            <div className="saas-modal-footer">
              <button type="button" onClick={() => setDeleteTarget(null)} className="btn-cancel">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await onDeleteScheme(deleteTarget.id);
                    setDeleteTarget(null);
                  } catch (err) {
                    setDeleteError(err?.response?.data?.message || 'Unable to delete this scheme.');
                  }
                }}
                className="btn-submit"
                style={{ background: '#DC2626', boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)' }}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
