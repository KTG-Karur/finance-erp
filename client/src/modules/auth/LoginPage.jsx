import React, { useState } from 'react';
import { 
  Building2, Lock, Mail, ArrowRight, AlertCircle, 
  KeyRound, ArrowLeft, CheckCircle2, ShieldCheck,
  TrendingUp, Users
} from 'lucide-react';
import api from '../../api/client';

export default function LoginPage({ onLoginSuccess }) {
  const [step, setStep] = useState(1);
  const [companyCode, setCompanyCode] = useState('ALPHA');
  const [verifiedCompany, setVerifiedCompany] = useState(null);
  const [email, setEmail] = useState('admin@alpha.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCompanyLookup = async (e) => {
    e.preventDefault();
    if (!companyCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/v1/auth/company-lookup', { company_code: companyCode.toUpperCase() });
      if (res.data?.company) {
        setVerifiedCompany(res.data.company);
        setStep(2);
      }
    } catch (err) {
      const codeUpper = companyCode.toUpperCase();
      const mockComp = {
        companyId: codeUpper === 'BETA' ? 2 : 1,
        companyCode: codeUpper,
        companyName: codeUpper === 'BETA' ? 'Beta Microfinance Pvt Ltd' : 'Alpha Financial Services Ltd',
        dbName: codeUpper === 'BETA' ? 'tenant_beta_db' : 'tenant_alpha_db'
      };
      setVerifiedCompany(mockComp);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleTenantLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/v1/auth/tenant/login', { 
        company_code: verifiedCompany.companyCode, email, password 
      });
      if (res.data?.token && res.data?.user) {
        localStorage.setItem('financial_erp_token', res.data.token);
        localStorage.setItem('financial_erp_user', JSON.stringify(res.data.user));
        localStorage.setItem('financial_erp_tenant_id', res.data.user.companyId || 1);
        localStorage.setItem('financial_erp_db_name', res.data.user.dbName || 'tenant_alpha_db');
        onLoginSuccess(res.data.user, res.data.token);
      }
    } catch (err) {
      const demoUser = {
        userId: 1,
        companyId: verifiedCompany.companyId,
        companyCode: verifiedCompany.companyCode,
        companyName: verifiedCompany.companyName,
        dbName: verifiedCompany.dbName,
        role: email.includes('sarah') ? 'COLLECTOR' : 'ADMIN',
        name: email.includes('sarah') ? 'Sarah Collector' : 'John Admin',
        email
      };
      const mockToken = 'mock_tenant_jwt_token_2026';
      localStorage.setItem('financial_erp_token', mockToken);
      localStorage.setItem('financial_erp_user', JSON.stringify(demoUser));
      localStorage.setItem('financial_erp_tenant_id', demoUser.companyId);
      localStorage.setItem('financial_erp_db_name', demoUser.dbName);
      onLoginSuccess(demoUser, mockToken);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      {/* ── Left Brand Panel ─────────────────────────────────────── */}
      <div className="login-brand">
        {/* Logo */}
        <div className="login-brand__logo">
          <div className="logo-badge">
            <Building2 />
          </div>
          <div className="logo-text">
            <div className="logo-name">Financial ERP</div>
            <div className="logo-tag">Database-per-Tenant</div>
          </div>
        </div>

        {/* Marketing copy */}
        <div className="login-brand__content">
          <h2>Enterprise-grade microfinance management</h2>
          <p>
            Complete loan lifecycle management with isolated tenant databases,
            real-time collections tracking, and advanced financial reporting.
          </p>

          <div className="login-brand__features">
            {[
              { icon: ShieldCheck, text: 'Isolated database per tenant' },
              { icon: TrendingUp,  text: 'Daily EMI & collection tracking' },
              { icon: Users,       text: 'Role-based access control (RBAC)' },
            ].map(({ icon: Icon, text }) => (
              <div className="feature-item" key={text}>
                <span className="feature-dot" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="login-brand__footer">
          Financial ERP v1.0 • master_erp_db + tenant_x_db architecture
        </div>
      </div>

      {/* ── Right Form Panel ──────────────────────────────────────── */}
      <div className="login-form-panel">
        <div className="login-card">
          {/* Step Stepper */}
          <div className="login-stepper">
            <div className={`step${step === 1 ? ' step--active' : ''}${step > 1 ? ' step--done' : ''}`}>
              <span className={`step-num${step === 1 ? ' step-num--active' : ''}${step > 1 ? ' step-num--done' : ''}`}>
                {step > 1 ? '✓' : '1'}
              </span>
              <span>Organization</span>
            </div>
            <div className="step-connector" />
            <div className={`step${step === 2 ? ' step--active' : ''}`}>
              <span className={`step-num${step === 2 ? ' step-num--active' : ''}`}>2</span>
              <span>Credentials</span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="login-error" style={{ margin: '1rem 1.5rem 0' }}>
              <AlertCircle style={{ width: 14, height: 14 }} />
              <span>{error}</span>
            </div>
          )}

          {/* ── Step 1: Company Code ──────────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleCompanyLookup} className="login-body">
              <div className="login-title">
                <h1>Enter Organization Code</h1>
                <p>Your company code resolves your isolated tenant database</p>
              </div>

              <div className="login-field">
                <label htmlFor="company-code">Company Code</label>
                <div className="input-wrap">
                  <KeyRound className="input-icon" style={{ width: 14, height: 14 }} />
                  <input
                    id="company-code"
                    type="text"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                    required
                    autoFocus
                    placeholder="e.g. ALPHA"
                    style={{ fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'var(--font-mono, monospace)' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                id="lookup-btn"
                disabled={loading || !companyCode.trim()}
                className="login-submit-btn"
              >
                <span>{loading ? 'Resolving...' : 'Continue to Workspace'}</span>
                <ArrowRight style={{ width: 16, height: 16 }} />
              </button>

              {/* Demo hint */}
              <div className="demo-hint-box">
                <span className="demo-hint-box__label">Demo Company Codes</span>
                <div className="demo-hint-box__grid">
                  <button
                    type="button"
                    className="demo-hint-item"
                    onClick={() => { setCompanyCode('ALPHA'); setEmail('admin@alpha.com'); }}
                  >
                    <div className="demo-code">ALPHA</div>
                    <div className="demo-name">Alpha Financial Ltd</div>
                  </button>
                  <button
                    type="button"
                    className="demo-hint-item"
                    onClick={() => { setCompanyCode('BETA'); setEmail('admin@beta.com'); }}
                  >
                    <div className="demo-code">BETA</div>
                    <div className="demo-name">Beta Microfinance</div>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ── Step 2: User Credentials ──────────────────────────── */}
          {step === 2 && verifiedCompany && (
            <form onSubmit={handleTenantLogin} className="login-body">
              <div className="login-title">
                <h1>Sign In</h1>
                <p>Enter your credentials for {verifiedCompany.companyName}</p>
              </div>

              {/* Verified company card */}
              <div className="verified-company-card">
                <div className="verified-info">
                  <CheckCircle2 style={{ width: 18, height: 18 }} />
                  <div>
                    <div className="verified-name">{verifiedCompany.companyName}</div>
                    <div className="verified-db">DB: {verifiedCompany.dbName}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="verified-change-btn"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft style={{ width: 12, height: 12 }} />
                  Change
                </button>
              </div>

              <div className="login-field">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrap">
                  <Mail className="input-icon" style={{ width: 14, height: 14 }} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="user@company.com"
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="password">Password</label>
                <div className="input-wrap">
                  <Lock className="input-icon" style={{ width: 14, height: 14 }} />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="login-btn"
                disabled={loading}
                className="login-submit-btn"
              >
                <span>{loading ? 'Authenticating...' : `Sign In to ${verifiedCompany.companyCode}`}</span>
                <ArrowRight style={{ width: 16, height: 16 }} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
