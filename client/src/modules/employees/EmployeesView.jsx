import React, { useState } from 'react';
import UnifiedPageHeader from '../../components/UnifiedPageHeader';
import PermissionMatrix from '../../components/PermissionMatrix';

export default function EmployeesView({ employees, onSavePermissions, onCreateEmployee, onQuickAction }) {
  const [selectedEmployee, setSelectedEmployee] = useState(employees[0] || null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: '', email: '', role: 'COLLECTOR' });
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredEmployees = employees.filter(emp => 
    !searchQuery || 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3 font-sans">
      {/* Unified Top Page Header */}
      <UnifiedPageHeader
        title="Staff Directory & Dynamic RBAC"
        subtitle="Manage tenant staff members and configure granular module access rights"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onQuickAction={onQuickAction}
        onRefresh={() => setSearchQuery('')}
      />

      {/* Add Employee Form */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="bg-white border border-gray-200/90 rounded-lg p-3 flex flex-col md:flex-row gap-3 items-end shadow-xs animate-in fade-in duration-200">
          <div className="flex-1 space-y-1">
            <label className="text-[11px] font-bold text-gray-600">Full Name</label>
            <input
              type="text"
              value={newEmp.name}
              onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
              required
              placeholder="e.g. David Manager"
              className="w-full bg-white border border-gray-200/90 rounded-md p-2 text-xs text-gray-900"
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
              className="w-full bg-white border border-gray-200/90 rounded-md p-2 text-xs text-gray-900 font-mono"
            />
          </div>
          <div className="w-40 space-y-1">
            <label className="text-[11px] font-bold text-gray-600">Role</label>
            <select
              value={newEmp.role}
              onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
              className="w-full bg-white border border-gray-200/90 rounded-md p-2 text-xs text-gray-900 font-semibold"
            >
              <option value="COLLECTOR">COLLECTOR</option>
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#15803D] hover:bg-emerald-800 text-white font-bold text-xs rounded-md shadow-xs transition"
          >
            Save Staff Member
          </button>
        </form>
      )}

      {/* Main Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left Staff List */}
        <div className="bg-white border border-gray-200/90 rounded-lg p-3 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Staff Members</h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-[11px] font-bold text-blue-700 hover:underline"
            >
              {showAddForm ? 'Cancel' : '+ Add Staff'}
            </button>
          </div>

          <div className="space-y-2">
            {filteredEmployees.map((emp) => {
              const isSelected = selectedEmployee?.id === emp.id;
              return (
                <div
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className={`p-2.5 rounded-md border cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-500 shadow-xs'
                      : 'bg-white border-gray-200/80 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-8 h-8 rounded-md font-mono text-xs font-bold flex items-center justify-center border ${
                      isSelected ? 'bg-[#2563EB] text-white border-blue-600' : 'bg-gray-100 text-gray-700 border-gray-300'
                    }`}>
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{emp.name}</h4>
                      <p className="text-[11px] text-gray-500 font-mono">{emp.email}</p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                    emp.role === 'ADMIN'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}>
                    {emp.role}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Permission Matrix */}
        <div className="lg:col-span-2">
          {selectedEmployee ? (
            <PermissionMatrix
              key={selectedEmployee.id}
              employee={selectedEmployee}
              onSave={onSavePermissions}
            />
          ) : (
            <div className="bg-white border border-gray-200/90 rounded-lg p-12 text-center text-gray-500 font-mono shadow-xs">
              Select an employee from the staff directory to configure permissions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
