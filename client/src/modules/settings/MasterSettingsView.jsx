import React, { useState, useEffect } from 'react';
import UnifiedPageHeader from '../../components/UnifiedPageHeader';
import PermissionMatrix from '../../components/PermissionMatrix';
import { Settings, Users, Shield, Building2, Save, Plus, Check, Percent } from 'lucide-react';

export default function MasterSettingsView({ 
  initialTab = 'staff-directory',
  tenant, 
  user, 
  employees, 
  onSavePermissions, 
  onCreateEmployee, 
  onQuickAction 
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedEmployee, setSelectedEmployee] = useState(employees[0] || null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: '', email: '', role: 'COLLECTOR' });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (initialTab && initialTab !== 'calculator') {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Master Interest Rate Settings State
  const [interestMaster, setInterestMaster] = useState({
    defaultRate: 14.0,
    minRate: 10.0,
    maxRate: 24.0,
    defaultTenureDays: 110,
    interestType: 'REDUCING_BALANCE',
    repaymentFrequency: 'DAILY',
    penaltyRatePct: 2.0
  });

  const [companyForm, setCompanyForm] = useState({
    name: tenant.name || 'Alpha Financial Services Ltd',
    code: 'ALPHA',
    db_name: 'tenant_alpha_db',
    gstin: '33AAAAA0000A1Z5',
    pan: 'ABCDE1234F',
    address: '123 Enterprise Financial Towers, Commerce Road, Chennai - 600001',
    phone: '+91 44 2850 1000'
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await onCreateEmployee(newEmp);
      setShowAddForm(false);
      setNewEmp({ name: '', email: '', role: 'COLLECTOR' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompanySave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const filteredEmployees = employees.filter(emp => 
    !searchQuery || 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3 font-sans text-xs">
      {/* Sub-Tab Navigation Bar */}
      <div className="bg-white border border-gray-200 rounded p-1.5 flex items-center space-x-2 font-semibold">
        <button
          onClick={() => setActiveTab('staff-directory')}
          className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition ${
            activeTab === 'staff-directory' ? 'bg-blue-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Staff Directory</span>
        </button>

        <button
          onClick={() => setActiveTab('rbac-matrix')}
          className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition ${
            activeTab === 'rbac-matrix' ? 'bg-blue-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>RBAC Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('interest-master')}
          className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition ${
            activeTab === 'interest-master' ? 'bg-blue-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Percent className="w-3.5 h-3.5" />
          <span>Interest Rate Master</span>
        </button>

        <button
          onClick={() => setActiveTab('company-info')}
          className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition ${
            activeTab === 'company-info' ? 'bg-blue-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Company & Branch Info</span>
        </button>
      </div>

      {/* Sub-Tab Content Views */}

      {/* INTEREST RATE MASTER CONFIGURATION */}
      {activeTab === 'interest-master' && (
        <form onSubmit={handleCompanySave} className="bg-white border border-gray-200 rounded p-4 space-y-4 font-sans">
          <div className="border-b border-gray-200 pb-2 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase">Company Finance Interest & Policy Master</h3>
              <p className="text-xs text-gray-500 font-mono">Configure default loan product interest rates, calculation type, and penalty fine rules</p>
            </div>
            {savedSuccess && (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded font-bold text-xs flex items-center space-x-1">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Master Rates Saved!</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-gray-700">Default Annual Interest Rate (% P.A.)</label>
              <input
                type="number"
                step="0.1"
                value={interestMaster.defaultRate}
                onChange={(e) => setInterestMaster({ ...interestMaster, defaultRate: parseFloat(e.target.value) })}
                required
                className="w-full bg-white border border-gray-200 rounded p-2 text-gray-900 font-bold font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Minimum Allowed Interest Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={interestMaster.minRate}
                onChange={(e) => setInterestMaster({ ...interestMaster, minRate: parseFloat(e.target.value) })}
                required
                className="w-full bg-white border border-gray-200 rounded p-2 text-gray-900 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Maximum Interest Rate Cap (%)</label>
              <input
                type="number"
                step="0.1"
                value={interestMaster.maxRate}
                onChange={(e) => setInterestMaster({ ...interestMaster, maxRate: parseFloat(e.target.value) })}
                required
                className="w-full bg-white border border-gray-200 rounded p-2 text-gray-900 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Interest Calculation Method</label>
              <select
                value={interestMaster.interestType}
                onChange={(e) => setInterestMaster({ ...interestMaster, interestType: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded p-2 text-gray-900 font-bold"
              >
                <option value="REDUCING_BALANCE">Reducing Balance (Standard Banking)</option>
                <option value="FLAT_RATE">Flat Rate (Microfinance Fixed)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Default Repayment Frequency</label>
              <select
                value={interestMaster.repaymentFrequency}
                onChange={(e) => setInterestMaster({ ...interestMaster, repaymentFrequency: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded p-2 text-gray-900 font-bold"
              >
                <option value="DAILY">Daily Installments</option>
                <option value="WEEKLY">Weekly Installments</option>
                <option value="MONTHLY">Monthly Installments</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Overdue Late Fine Rate (% Per Month)</label>
              <input
                type="number"
                step="0.1"
                value={interestMaster.penaltyRatePct}
                onChange={(e) => setInterestMaster({ ...interestMaster, penaltyRatePct: parseFloat(e.target.value) })}
                required
                className="w-full bg-white border border-gray-200 rounded p-2 text-red-600 font-bold font-mono"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Interest Master Policy</span>
            </button>
          </div>
        </form>
      )}

      {/* STAFF & EMPLOYEE DIRECTORY */}
      {activeTab === 'staff-directory' && (
        <div className="space-y-3 font-sans">
          {showAddForm && (
            <form onSubmit={handleAddSubmit} className="bg-white border border-gray-200 rounded p-3 flex flex-col md:flex-row gap-3 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-bold text-gray-600">Full Name</label>
                <input
                  type="text"
                  value={newEmp.name}
                  onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                  required
                  placeholder="e.g. David Manager"
                  className="w-full bg-white border border-gray-200 rounded p-2 text-xs text-gray-900"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-bold text-gray-600">Email Address</label>
                <input
                  type="email"
                  value={newEmp.email}
                  onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                  required
                  placeholder="david@company.com"
                  className="w-full bg-white border border-gray-200 rounded p-2 text-xs text-gray-900 font-mono"
                />
              </div>
              <div className="w-40 space-y-1">
                <label className="text-[11px] font-bold text-gray-600">Role</label>
                <select
                  value={newEmp.role}
                  onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded p-2 text-xs text-gray-900 font-semibold"
                >
                  <option value="COLLECTOR">COLLECTOR</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded transition"
              >
                Save Staff Member
              </button>
            </form>
          )}

          <div className="bg-white border border-gray-200 rounded p-3 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">Tenant Staff Members Register</h3>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Staff Member</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-700 uppercase font-bold bg-gray-50 text-[10px]">
                    <th className="py-2.5 px-3">Staff Member</th>
                    <th className="py-2.5 px-3 font-mono">Email Address</th>
                    <th className="py-2.5 px-3">Assigned Role</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50 transition h-10">
                      <td className="py-2 px-3 font-bold text-gray-900">
                        {emp.name}
                      </td>
                      <td className="py-2 px-3 font-mono text-gray-600">{emp.email}</td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-600">{emp.role}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold font-mono">
                          ACTIVE
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => { setSelectedEmployee(emp); setActiveTab('rbac-matrix'); }}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800 font-bold text-[11px] rounded"
                        >
                          Configure RBAC
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RBAC PERMISSION MATRIX */}
      {activeTab === 'rbac-matrix' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded p-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 border-b border-gray-200 pb-2">Select Staff Member</h3>
            <div className="space-y-2">
              {employees.map((emp) => {
                const isSelected = selectedEmployee?.id === emp.id;
                return (
                  <div
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp)}
                    className={`p-2.5 rounded border cursor-pointer transition flex items-center justify-between ${
                      isSelected ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{emp.name}</h4>
                      <p className="text-[11px] text-gray-500 font-mono">{emp.email}</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-purple-700 uppercase">{emp.role}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedEmployee ? (
              <PermissionMatrix
                key={selectedEmployee.id}
                employee={selectedEmployee}
                onSave={onSavePermissions}
              />
            ) : (
              <div className="bg-white border border-gray-200 rounded p-12 text-center text-gray-500 font-mono">
                Select an employee to configure permissions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMPANY & BRANCH INFO */}
      {activeTab === 'company-info' && (
        <form onSubmit={handleCompanySave} className="bg-white border border-gray-200 rounded p-5 space-y-4">
          <div className="border-b border-gray-200 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase">Tenant Organization & Branch Profile</h3>
              <p className="text-xs text-gray-500 font-mono">Master Settings for company tax registration, branch locations, and isolated database</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            <div className="space-y-1">
              <label className="font-bold text-gray-700">Company Name</label>
              <input
                type="text"
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                required
                className="w-full bg-white border border-gray-200 rounded p-2 text-gray-900 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">GSTIN Registration No</label>
              <input
                type="text"
                value={companyForm.gstin}
                onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded p-2 text-gray-900 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Company PAN Number</label>
              <input
                type="text"
                value={companyForm.pan}
                onChange={(e) => setCompanyForm({ ...companyForm, pan: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded p-2 text-gray-900 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Contact Phone</label>
              <input
                type="text"
                value={companyForm.phone}
                onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded p-2 text-gray-900"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Master Settings</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
