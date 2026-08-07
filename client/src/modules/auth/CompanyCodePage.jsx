import React, { useState } from 'react';
import { Building2, ArrowRight, AlertCircle, Landmark, Coins, Receipt, ShieldCheck } from 'lucide-react';
import api from '../../api/client';

const ECOSYSTEM_MODULES = [
  { title: 'Financial ERP', icon: Landmark, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  { title: 'Gold Loan', icon: Coins, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  { title: 'Chit Fund', icon: Receipt, color: '#7C3AED', bg: '#F3E8FF', border: '#DDD6FE' },
  { title: 'Microfinance', icon: ShieldCheck, color: '#0284C7', bg: '#E0F2FE', border: '#BAE6FD' }
];

export default function CompanyCodePage({ onVerified }) {
  const [companyCode, setCompanyCode] = useState('ALPHA');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCompanyLookup = async (e) => {
    e.preventDefault();
    if (!companyCode.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/company-lookup', { company_code: companyCode.trim() });
      setLoading(false);
      onVerified(res.data.company);
    } catch (err) {
      setError(err?.response?.data?.message || `Company Code '${companyCode.trim()}' not found. Please check and try again.`);
      setLoading(false);
    }
  };

  return (
    <div className="fluid-login-screen theme-blue">
      {/* ── Ambient Glowing Mesh Canvas Background (Platform Blue Palette) ── */}
      <div className="ambient-mesh-bg">
        <div className="ambient-orb orb-1" />
        <div className="ambient-orb orb-2" />

        <svg className="mesh-grid-svg" viewBox="0 0 1440 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
          <pattern id="fluid-grid" width="64" height="64" patternUnits="userSpaceOnUse">
            <path d="M 64 0 L 0 0 0 64" fill="none" stroke="#2563EB" strokeOpacity="0.05" strokeWidth="1" />
            <circle cx="64" cy="64" r="1.25" fill="#2563EB" fillOpacity="0.09" />
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
            <div className="brand-icon-wrap"></div>
            <span className="brand-owner">Knock The Globe Technologies Pvt. Ltd.</span>
          </div>

          {/* Headline Typography */}
          <div className="fluid-hero-text">
            <h2>
              One Platform. <br />
              <span className="gradient-text">Every Financial Vertical.</span>
            </h2>
            <p>Sign in once to access whichever modules your organization has subscribed to.</p>
          </div>

          {/* Module Ecosystem Strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {ECOSYSTEM_MODULES.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.title}
                  title={m.title}
                  style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: m.bg, border: `1px solid ${m.border}`, color: m.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <Icon style={{ width: 16, height: 16 }} />
                </div>
              );
            })}
          </div>

          <div className="live-indicator">
            <span className="live-dot" />
            <span>Multi-Tenant Engine Online</span>
          </div>

        </div>

        {/* ── Right Column: Sleek Modern SaaS Form Card ─────────── */}
        <div className="fluid-form-col">
          <div className="modern-saas-card">

            {/* Minimal Segmented Tab Switcher */}
            <div className="saas-segmented-tabs">
              <button type="button" className="saas-tab saas-tab--active">
                <span className="tab-num">1</span>
                <span>Organization</span>
              </button>
              <button type="button" className="saas-tab">
                <span className="tab-num">2</span>
                <span>Module</span>
              </button>
              <button type="button" className="saas-tab">
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

            <form onSubmit={handleCompanyLookup} className="saas-form">
              <div className="saas-form-head">
                <h3>Enter Organization</h3>
                <p>Lookup your isolated workspace to continue</p>
              </div>

              <div className="saas-input-group">
                <label htmlFor="company-code">Company Code</label>
                <div className="saas-input-wrap">
                  <Building2 className="saas-icon" />
                  <input
                    id="company-code"
                    type="text"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    required
                    autoFocus
                    placeholder="e.g. Alpha"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="lookup-btn"
                disabled={loading || !companyCode.trim()}
                className="saas-primary-btn"
              >
                {loading ? (
                  <>
                    <span className="loader loader--white" style={{ marginRight: 8 }}></span>
                    <span>Resolving Environment...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
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
