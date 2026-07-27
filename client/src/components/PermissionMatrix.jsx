import React, { useState } from 'react';
import { Shield, Check, Save } from 'lucide-react';

const MODULES = [
  { id: 'LOANS', label: 'Loan Management', actions: ['VIEW', 'CREATE', 'EDIT', 'CLOSE'] },
  { id: 'COLLECTIONS', label: 'Daily Collection Drawer', actions: ['VIEW', 'COLLECT', 'REVERTS', 'EXPORT'] },
  { id: 'EMPLOYEES', label: 'Employee Master & RBAC', actions: ['VIEW', 'CREATE', 'MANAGE'] },
  { id: 'CHIT_FUNDS', label: 'Chit Funds (Extension)', actions: ['VIEW', 'BID', 'COLLECT'] },
  { id: 'GOLD_LOANS', label: 'Gold Loans (Extension)', actions: ['VIEW', 'APPRAISE', 'DISBURSE'] }
];

export default function PermissionMatrix({ employee, onSave }) {
  if (!employee) return null;

  const [perms, setPerms] = useState(() => {
    const map = {};
    (employee.permissions || []).forEach(p => {
      map[`${p.module}_${p.action}`] = Boolean(p.allowed);
    });
    return map;
  });

  const [saving, setSaving] = useState(false);

  const togglePerm = (module, action) => {
    const key = `${module}_${action}`;
    setPerms(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const updatedList = [];
    MODULES.forEach(mod => {
      mod.actions.forEach(act => {
        const key = `${mod.id}_${act}`;
        updatedList.push({
          module: mod.id,
          action: act,
          allowed: Boolean(perms[key])
        });
      });
    });

    try {
      await onSave(employee.id, updatedList);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200/90 rounded-lg p-4 space-y-4 shadow-xs font-sans">
      <div className="flex items-center justify-between border-b border-gray-200/80 pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">RBAC Permission Matrix — {employee.name}</h3>
            <p className="text-xs text-gray-500 font-mono">Role: <span className="text-purple-800 font-bold">{employee.role}</span> | Email: {employee.email}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-md flex items-center space-x-1.5 shadow-xs transition"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Permissions'}</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-200/80 text-gray-700 uppercase font-bold bg-[#F8FAFC] text-[10px]">
              <th className="py-2.5 px-3">Domain Module</th>
              <th className="py-2.5 px-3">Action Permissions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200/80">
            {MODULES.map(mod => (
              <tr key={mod.id} className="hover:bg-[#F8FAFC] transition">
                <td className="py-3 px-3 font-bold text-gray-900">
                  {mod.label}
                  <span className="block text-[10px] text-gray-500 font-mono font-normal uppercase">{mod.id}</span>
                </td>
                <td className="py-3 px-3">
                  <div className="flex flex-wrap gap-2">
                    {mod.actions.map(act => {
                      const key = `${mod.id}_${act}`;
                      const isChecked = Boolean(perms[key]);
                      return (
                        <button
                          key={act}
                          type="button"
                          onClick={() => togglePerm(mod.id, act)}
                          className={`px-2.5 py-1 rounded-md border flex items-center space-x-1.5 font-mono text-[11px] transition ${
                            isChecked
                              ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold shadow-xs'
                              : 'bg-white border-gray-200/90 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${isChecked ? 'bg-purple-700 border-purple-700 text-white' : 'border-gray-300 bg-white'}`}>
                            {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span>{act}</span>
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
