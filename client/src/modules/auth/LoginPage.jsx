import React, { useState } from 'react';
import {
  Lock, ArrowRight, AlertCircle,
  ArrowLeft, CheckCircle2, Eye, EyeOff, Check, User, ChevronDown, ShieldCheck
} from 'lucide-react';
import { findUser } from '../../data/mockAuthData';

const ROLE_LABELS = {
  COMPANY_ADMIN: 'Company Admin',
  BRANCH_ADMIN: 'Branch Admin',
  EMPLOYEE: 'Employee'
};

export default function LoginPage({ company, module, onLoginSuccess, onBackToModules }) {
  const [loginContext, setLoginContext] = useState('COMPANY_ADMIN'); // 'COMPANY_ADMIN' or a branch id (string)
  const [email, setEmail] = useState('admin@alpha.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);

  const finalizeLogin = (u, t) => {
    localStorage.setItem('financial_erp_token', t);
    localStorage.setItem('financial_erp_user', JSON.stringify(u));
    localStorage.setItem('financial_erp_tenant_id', u.companyId || 1);
    localStorage.setItem('financial_erp_db_name', u.dbName || 'tenant_alpha_db');
    setLoggedInUser(u);
    setIsSuccess(true);
    setTimeout(() => {
      onLoginSuccess(u, t);
    }, 1450);
  };

  const handleTenantLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    setTimeout(() => {
      const user = findUser(company.companyCode, email, password);

      if (!user) {
        setError('Invalid email or password.');
        setLoading(false);
        return;
      }

      const baseUser = {
        userId: user.userId,
        companyId: company.companyId,
        companyCode: company.companyCode,
        companyName: company.companyName,
        dbName: company.dbName,
        moduleId: module.id,
        moduleName: module.title,
        role: user.role,
        name: user.name,
        email: user.email
      };

      if (loginContext === 'COMPANY_ADMIN') {
        if (user.role !== 'COMPANY_ADMIN') {
          setError(`These credentials belong to a ${ROLE_LABELS[user.role]} account, not a Company Admin. Select the correct branch instead.`);
          setLoading(false);
          return;
        }
        setLoading(false);
        finalizeLogin({ ...baseUser, branchId: null, branchName: null }, `mock_jwt_${user.userId}_${Date.now()}`);
        return;
      }

      // loginContext is a branch id here
      const selectedBranch = company.branches.find(b => String(b.id) === String(loginContext));
      if (user.role === 'COMPANY_ADMIN') {
        setError(`This is a Company Admin account — select "Company Admin" above to sign in, not a branch.`);
        setLoading(false);
        return;
      }
      if (String(user.branchId) !== String(loginContext)) {
        setError(`These credentials are not authorized to log in to ${selectedBranch?.name || 'the selected branch'}.`);
        setLoading(false);
        return;
      }

      setLoading(false);
      finalizeLogin({ ...baseUser, branchId: selectedBranch.id, branchName: selectedBranch.name }, `mock_jwt_${user.userId}_${Date.now()}`);
    }, 500);
  };

  return (
    <div className="fluid-login-screen">
      {/* ── Success Animation Modal Overlay ─────────────────────── */}
      {isSuccess && (
        <div className="login-success-overlay">
          <div className="success-glass-card">
            <div className="success-icon-ring">
              <svg className="checkmark-svg" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="23" fill="none" />
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <h3>Authenticated Successfully</h3>
            <p>Welcome back, <strong>{loggedInUser?.name || 'User'}</strong>! Loading <strong>{module?.title}</strong> workspace for <strong>{company?.companyName}</strong>...</p>
            <div className="success-progress-bar">
              <div className="progress-fill" />
            </div>
          </div>
        </div>
      )}
      {/* ── Ambient Glowing Mesh Canvas Background (Emerald Fintech Palette) ── */}
      <div className="ambient-mesh-bg">
        <div className="ambient-orb orb-1" />
        <div className="ambient-orb orb-2" />

        {/* Precision Coordinate Grid Overlay */}
        <svg className="mesh-grid-svg" viewBox="0 0 1440 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
          <pattern id="fluid-grid" width="64" height="64" patternUnits="userSpaceOnUse">
            <path d="M 64 0 L 0 0 0 64" fill="none" stroke="#059669" strokeOpacity="0.04" strokeWidth="1" />
            <circle cx="64" cy="64" r="1.25" fill="#059669" fillOpacity="0.08" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#fluid-grid)" />
        </svg>
      </div>

      {/* ── Main Fluid Screen Container ──────────────────────────── */}
      <div className="fluid-screen-content">

        {/* ── Left Column: Fluid Hero & Telemetry (Frameless) ──── */}
        <div className="fluid-hero-col">

          {onBackToModules && (
            <button
              type="button"
              onClick={onBackToModules}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#94A3B8',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 500,
                cursor: 'pointer',
                marginBottom: 16,
                alignSelf: 'flex-start'
              }}
            >
              <ArrowLeft style={{ width: 14, height: 14 }} />
              <span>Back to Module Selection</span>
            </button>
          )}

          {/* Brand Header Badge */}
          <div className="fluid-brand-pill">
            <div className="brand-icon-wrap">
            </div>
            <span className="brand-owner">{module?.title} · {company?.companyName}</span>
          </div>

          {/* Headline Typography */}
          <div className="fluid-hero-text">
            <h2>
              Enterprise Financial Intelligence <br />
              <span className="gradient-text">Built for Scale</span>
            </h2>
            <p>Database-per-tenant isolation, real-time double-entry ledger verification, and automated microfinance workflows.</p>
          </div>

          {/* Frameless Live Telemetry Wave Section */}
          <div className="fluid-telemetry-row">
            <div className="live-indicator">
              <span className="live-dot" />
              <span>Multi-Tenant Engine Online</span>
            </div>

            <div className="telemetry-sparkline">
              <svg viewBox="0 0 280 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 38 Q 35 15, 70 30 T 140 20 T 210 35 T 280 10 L 280 48 L 0 48 Z" fill="url(#spark-grad)" />
                <path d="M0 38 Q 35 15, 70 30 T 140 20 T 210 35 T 280 10" stroke="#059669" strokeWidth="2" fill="none" />
                <defs>
                  <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#059669" stopOpacity="0.18" />
                    <stop offset="1" stopColor="#059669" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="telemetry-metrics">
              <div className="metric-cell">
                <span className="lbl">Active Capital</span>
                <span className="val">$4,825,000</span>
              </div>
              <div className="metric-cell">
                <span className="lbl">Uptime SLA</span>
                <span className="val">99.99%</span>
              </div>
              <div className="metric-cell">
                <span className="lbl">Encryption</span>
                <span className="val">AES-256</span>
              </div>
            </div>
          </div>

        </div>

        {/* ── Right Column: Sleek Modern SaaS Form Card ─────────── */}
        <div className="fluid-form-col">
          <div className="modern-saas-card">

            {/* Minimal Segmented Tab Switcher */}
            <div className="saas-segmented-tabs">
              <button type="button" className="saas-tab saas-tab--done" onClick={onBackToModules}>
                <span className="tab-num">✓</span>
                <span>Organization</span>
              </button>
              <button type="button" className="saas-tab saas-tab--done" onClick={onBackToModules}>
                <span className="tab-num">✓</span>
                <span>Module</span>
              </button>
              <button type="button" className="saas-tab saas-tab--active">
                <span className="tab-num">3</span>
                <span>Credentials</span>
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="saas-error-alert">
                <AlertCircle style={{ width: 14, height: 14 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleTenantLogin} className="saas-form">

              <div className="saas-verified-bar">
                <div className="verified-info">
                  <CheckCircle2 style={{ width: 14, height: 14, color: '#059669' }} />
                  <span>{company.companyName} ({company.companyCode}) — {module.title}</span>
                </div>
                <button
                  type="button"
                  className="switch-link"
                  onClick={onBackToModules}
                >
                  <ArrowLeft style={{ width: 11, height: 11 }} />
                  Change
                </button>
              </div>

              <div className="saas-form-head">
                <h3>Sign In</h3>
                <p>Welcome back! Enter your login details</p>
              </div>

              {/* Login As: Company Admin or a specific Branch */}
              <div className="saas-input-group">
                <label htmlFor="login-context">Login As</label>
                <div className="saas-input-wrap">
                  <ShieldCheck className="saas-icon" />
                  <select
                    id="login-context"
                    value={loginContext}
                    onChange={(e) => setLoginContext(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#0F172A',
                      fontSize: '0.8125rem',
                      fontFamily: 'inherit',
                      appearance: 'none',
                      cursor: 'pointer',
                      padding: '6px 28px 6px 36px'
                    }}
                  >
                    <option value="COMPANY_ADMIN">Company Admin</option>
                    {company.branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                  <ChevronDown style={{ width: 14, height: 14, color: '#64748B', pointerEvents: 'none', position: 'absolute', right: 12 }} />
                </div>
                <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: '4px 0 0 2px' }}>
                  {loginContext === 'COMPANY_ADMIN'
                    ? 'Signing in as the company-wide administrator.'
                    : `Signing in to ${company.branches.find(b => String(b.id) === String(loginContext))?.name} — credentials must belong to this branch.`}
                </p>
              </div>

              {/* Email Field */}
              <div className="saas-input-group">
                <label htmlFor="email">Email Address</label>
                <div className="saas-input-wrap">
                  <User className="saas-icon" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="saas-input-group">
                <label htmlFor="password">Password</label>
                <div className="saas-input-wrap">
                  <Lock className="saas-icon" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                  </button>
                </div>
              </div>

              {/* Options Row */}
              <div className="saas-options-row">
                <label className="checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="custom-box">
                    {rememberMe && <Check style={{ width: 10, height: 10, strokeWidth: 3 }} />}
                  </span>
                  <span>Remember me</span>
                </label>

                <a href="#forgot" onClick={(e) => e.preventDefault()} className="forgot-link">
                  Forgot password?
                </a>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                id="login-btn"
                disabled={loading}
                className="saas-primary-btn"
              >
                {loading ? (
                  <>
                    <span className="loader loader--white" style={{ marginRight: 8 }}></span>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight style={{ width: 14, height: 14 }} />
                  </>
                )}
              </button>

            </form>

          </div>
        </div>

      </div>

      {/* ── Page Footer: Rights Reserved ───────────────────────────── */}
      <div className="fluid-page-footer">
        <span>© {new Date().getFullYear()} Knock The Globe Technologies Pvt. Ltd. All rights reserved.</span>
      </div>
    </div>
  );
}
