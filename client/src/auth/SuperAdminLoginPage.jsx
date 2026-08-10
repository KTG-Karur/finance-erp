import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import api from '../api/client';

export default function SuperAdminLoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExiting, setIsExiting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const completeAuth = (u, t) => {
      setIsExiting(true);
      setTimeout(() => {
        onLoginSuccess(u, t);
      }, 500);
    };

    try {
      const res = await api.post('/auth/superadmin/login', { email, password });
      if (res.data?.token && res.data?.user) {
        localStorage.setItem('financial_erp_token', res.data.token);
        localStorage.setItem('financial_erp_user', JSON.stringify(res.data.user));
        localStorage.setItem('financial_erp_tenant_id', 'master');
        localStorage.setItem('financial_erp_db_name', 'master_erp_db');
        completeAuth(res.data.user, res.data.token);
      }
    } catch (err) {
      // A failed login is real, specific feedback ("wrong email/password") — show
      // it, don't paper over it with a fake session. A fabricated SUPER_ADMIN
      // token used to be issued here on ANY failure (wrong password, network
      // drop, server down), which silently let the user "in" with a token that
      // then fails every real API call the portal makes — a much more confusing
      // failure mode than just saying the login didn't work.
      setError(err?.response?.data?.message || 'Login failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fluid-login-screen">
      {/* ── Ambient Glowing Mesh Canvas Background (Emerald Fintech Palette) ── */}
      <div className="ambient-mesh-bg">
        <div className="ambient-orb orb-1" />
        <div className="ambient-orb orb-2" />

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

          {/* Brand Header Badge */}
          <div className="fluid-brand-pill">
            <div className="brand-icon-wrap" style={{ background: '#ECFDF5', color: '#059669' }}>
              <ShieldCheck style={{ width: 14, height: 14 }} />
            </div>
            <span className="brand-owner" style={{ fontWeight: 500 }}>SUPER ADMIN PORTAL</span>
          </div>

          {/* Headline Typography */}
          <div className="fluid-hero-text">
            <h2 style={{ fontWeight: 500 }}>
              Global Tenant Registry <br />
              <span className="gradient-text">& Multi-Tenant Provisioning</span>
            </h2>
            <p style={{ fontWeight: 400 }}>Central database management, database-per-tenant isolation, and master system administration.</p>
          </div>

          {/* Frameless Live Telemetry Wave Section */}
          <div className="fluid-telemetry-row">
            <div className="live-indicator" style={{ fontWeight: 500 }}>
              <span className="live-dot" />
              <span>Master Registry (`master_erp_db`) Online</span>
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

            <div className="telemetry-metrics" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <div className="metric-cell">
                <span className="lbl" style={{ fontWeight: 400 }}>Access Level</span>
                <span className="val" style={{ fontWeight: 500 }}>Global Admin</span>
              </div>
              <div className="metric-cell">
                <span className="lbl" style={{ fontWeight: 400 }}>Isolation</span>
                <span className="val" style={{ fontWeight: 500 }}>Database-per-Tenant</span>
              </div>
              <div className="metric-cell">
                <span className="lbl" style={{ fontWeight: 400 }}>Encryption</span>
                <span className="val" style={{ fontWeight: 500 }}>AES-256</span>
              </div>
            </div>
          </div>

        </div>

        {/* ── Right Column: Sleek Modern SaaS Form Card ─────────── */}
        <div className="fluid-form-col">
          <div className={`modern-saas-card ${isExiting ? 'auth-card-exit' : ''}`}>

            {/* Stepper Header */}
            <div className="saas-segmented-tabs">
              <button type="button" className="saas-tab saas-tab--active" style={{ cursor: 'default' }}>
                <span className="tab-num" style={{ fontWeight: 500 }}>★</span>
                <span style={{ fontWeight: 500 }}>Master Auth</span>
              </button>
            </div>

            {/* Form Top Header */}
            <div className="saas-form-head" style={{ marginBottom: 12 }}>
              <h3 style={{ fontWeight: 600, fontSize: '1.25rem', color: '#0F172A' }}>Super Admin Sign In</h3>
            </div>

            {error && (
              <div className="saas-alert-banner alert-danger">
                <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
                <span style={{ fontWeight: 400 }}>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="saas-form">
              <div className="saas-input-group">
                <label htmlFor="superadmin-email" style={{ fontWeight: 500 }}>Master Email</label>
                <div className="saas-input-wrap">
                  <Mail className="saas-icon" />
                  <input
                    id="superadmin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter super admin email"
                  />
                </div>
              </div>

              <div className="saas-input-group">
                <label htmlFor="superadmin-password" style={{ fontWeight: 500 }}>Master Password</label>
                <div className="saas-input-wrap">
                  <Lock className="saas-icon" />
                  <input
                    id="superadmin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || isExiting}
                className="saas-primary-btn"
                style={{ fontWeight: 500, marginTop: 12 }}
              >
                {loading || isExiting ? (
                  <>
                    <span className="btn-round-spinner" />
                    <span style={{ fontWeight: 500 }}>Authenticating Master DB...</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontWeight: 500 }}>Enter Global Portal</span>
                    <ArrowRight style={{ width: 14, height: 14 }} />
                  </>
                )}
              </button>
            </form>

          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="fluid-page-footer">
        <span style={{ fontWeight: 400, fontVariantNumeric: 'tabular-nums' }}>Super Admin Portal • Central Master Auth (`master_erp_db`) • Financial ERP Platform</span>
      </div>
    </div>
  );
}