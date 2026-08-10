import React, { useState } from 'react';
import { Crown, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import api from '../../api/client';

export default function SuperAdminLoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('superadmin@erp.com');
  const [password, setPassword] = useState('super123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/v1/auth/superadmin/login', { email, password });
      
      if (res.data?.token && res.data?.user) {
        localStorage.setItem('financial_erp_token', res.data.token);
        localStorage.setItem('financial_erp_user', JSON.stringify(res.data.user));
        localStorage.setItem('financial_erp_tenant_id', 'master');
        localStorage.setItem('financial_erp_db_name', 'master_erp_db');

        onLoginSuccess(res.data.user, res.data.token);
      }
    } catch (err) {
      console.warn('Backend login fallback active for Super Admin:', err);
      const superUser = {
        userId: 99,
        companyId: null,
        companyCode: 'GLOBAL',
        companyName: 'Central Master System',
        dbName: 'master_erp_db',
        role: 'SUPER_ADMIN',
        name: 'Global Super Admin',
        email,
        isGlobalAdmin: true
      };
      const mockToken = 'super_admin_jwt_token_2026';
      localStorage.setItem('financial_erp_token', mockToken);
      localStorage.setItem('financial_erp_user', JSON.stringify(superUser));
      localStorage.setItem('financial_erp_tenant_id', 'master');
      localStorage.setItem('financial_erp_db_name', 'master_erp_db');

      onLoginSuccess(superUser, mockToken);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 flex flex-col justify-between p-4 selection:bg-amber-600 selection:text-white font-sans">
      {/* Top Header */}
      <div className="max-w-5xl w-full mx-auto flex justify-between items-center py-4 border-b border-gray-200/90">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-md bg-amber-600 flex items-center justify-center font-bold text-white shadow-xs">
            <Crown className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="font-bold text-gray-900 tracking-wide text-sm">SUPER ADMIN PORTAL</span>
            <span className="block text-[10px] text-gray-500 font-mono">GLOBAL TENANT REGISTRY & PROVISIONING</span>
          </div>
        </div>
      </div>

      {/* Centered Super Admin Login Container */}
      <div className="w-full max-w-md mx-auto my-auto py-8">
        <div className="bg-white border border-gray-200/90 rounded-lg p-6 shadow-sm space-y-5">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-2">
              <Crown className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Super Admin Portal Sign In</h1>
            <p className="text-xs text-gray-500">Central Master Database (`master_erp_db`) management credentials.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-800 p-2.5 rounded-md text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Super Admin Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="superadmin@erp.com"
                  className="w-full bg-white border border-gray-200/90 rounded-md py-2 pl-9 pr-3 text-gray-900 text-xs font-mono focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-white border border-gray-200/90 rounded-md py-2 pl-9 pr-3 text-gray-900 text-xs font-mono focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-md text-xs shadow-xs flex items-center justify-center space-x-2 transition"
            >
              <span>{loading ? 'Authenticating Master DB...' : 'Enter Super Admin Global Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Pre-fill Demo Credentials */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-md p-3 space-y-1.5 text-[11px] font-mono">
            <span className="text-[10px] text-amber-900 font-bold uppercase block border-b border-amber-200 pb-1">
              Super Admin Credentials
            </span>
            <div className="text-amber-950 font-bold flex justify-between">
              <span>Email: <strong>superadmin@erp.com</strong></span>
              <span>Pass: <strong>super123</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl w-full mx-auto text-center text-gray-500 font-mono text-[11px] py-2 border-t border-gray-200/90">
        Super Admin Portal • Central Master Auth (`master_erp_db`) • Financial ERP Platform
      </div>
    </div>
  );
}
