import React, { useState } from 'react';
import {
  Landmark,
  Coins,
  Receipt,
  ShieldCheck,
  ChevronRight,
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

export default function ModuleSelectorPage({ company, onSelectModule, onBack }) {
  const [selectedModuleModal, setSelectedModuleModal] = useState(null);

  const ALL_MODULES = [
    {
      id: 'financial-erp',
      title: 'Financial ERP',
      subtitle: 'Complete loan portfolio, daily collections & cash book ledger',
      icon: Landmark,
      color: '#059669',
      bg: '#ECFDF5',
      border: '#A7F3D0'
    },
    {
      id: 'gold-loan',
      title: 'Gold Loan',
      subtitle: 'Ornament purity valuation, LTV calculator & packet vaulting',
      icon: Coins,
      color: '#D97706',
      bg: '#FFFBEB',
      border: '#FDE68A'
    },
    {
      id: 'chit-fund',
      title: 'Chit',
      subtitle: 'Subscriber bidding passbook & dividend distribution ledger',
      icon: Receipt,
      color: '#7C3AED',
      bg: '#F3E8FF',
      border: '#DDD6FE'
    },
    {
      id: 'vehicle-loan',
      title: 'Microfinance',
      subtitle: 'Hire purchase (HPA) agreements & vehicle loan tracking',
      icon: ShieldCheck,
      color: '#0284C7',
      bg: '#E0F2FE',
      border: '#BAE6FD'
    }
  ];

  const MODULES = ALL_MODULES.filter(m => !company?.subscribedModules || company.subscribedModules.includes(m.id));

  // Background glow shifts to the selected module's brand color; blue by default (no module chosen yet).
  const ORB_SECONDARY = {
    'financial-erp': '#0D9488',
    'gold-loan': '#F59E0B',
    'chit-fund': '#A78BFA',
    'vehicle-loan': '#0EA5E9'
  };
  const activeColor1 = selectedModuleModal?.color || '#2563EB';
  const activeColor2 = (selectedModuleModal && ORB_SECONDARY[selectedModuleModal.id]) || '#0EA5E9';

  return (
    <div className="fluid-login-screen" style={{
      minHeight: '100vh',
      width: '100vw',
      position: 'relative',
      backgroundColor: '#F8FAFC',
      color: '#0F172A',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>

      {/* ── Ambient Glowing Mesh Canvas Background (shifts to the selected module's brand color) ── */}
      <div className="ambient-mesh-bg" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{
          position: 'absolute',
          width: 650,
          height: 650,
          top: -120,
          left: -120,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${activeColor1} 0%, transparent 70%)`,
          filter: 'blur(110px)',
          opacity: 0.35,
          transition: 'background 0.35s ease'
        }} />
        <div style={{
          position: 'absolute',
          width: 550,
          height: 550,
          bottom: -120,
          right: -80,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${activeColor2} 0%, transparent 70%)`,
          filter: 'blur(110px)',
          opacity: 0.35,
          transition: 'background 0.35s ease'
        }} />

        {/* Precision Coordinate Grid Overlay */}
        <svg style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} viewBox="0 0 1440 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
          <pattern id="select-grid" width="64" height="64" patternUnits="userSpaceOnUse">
            <path d="M 64 0 L 0 0 0 64" fill="none" stroke={activeColor1} strokeOpacity="0.05" strokeWidth="1" />
            <circle cx="64" cy="64" r="1.25" fill={activeColor1} fillOpacity="0.09" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#select-grid)" />
        </svg>
      </div>

      {/* ── Main SaaS Glass Container (Professional & Responsive) ── */}
      <div style={{
        maxWidth: 780,
        width: '100%',
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 24,
        border: '1px solid rgba(226, 232, 240, 0.9)',
        padding: 'clamp(24px, 5vw, 40px) clamp(16px, 4vw, 36px)',
        boxShadow: '0 20px 50px -15px rgba(5, 150, 105, 0.12), 0 4px 20px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box',
        zIndex: 1,
        position: 'relative'
      }}>

        {/* Company Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(24px, 4vw, 32px)', width: '100%', position: 'relative' }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                color: '#475569',
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <ArrowLeft style={{ width: 12, height: 12 }} />
              <span>Change Company</span>
            </button>
          )}

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 14px',
            borderRadius: 20,
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#047857',
            fontSize: '0.78rem',
            fontWeight: 600,
            marginBottom: 14
          }}>
            <Sparkles style={{ width: 13, height: 13, color: '#059669' }} />
            <span>Knock The Globe Technologies Pvt. Ltd.</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(1.25rem, 3.5vw, 1.65rem)',
            fontWeight: 700,
            color: '#0F172A',
            margin: '0 0 6px 0',
            letterSpacing: '-0.015em'
          }}>
            {company?.companyName || 'Select Your Workspace'}
          </h1>
          <p style={{
            fontSize: 'clamp(0.8125rem, 2vw, 0.9rem)',
            color: '#059669',
            margin: 0,
            fontWeight: 600,
            letterSpacing: '0.02em',
            textTransform: 'uppercase'
          }}>
            Select Subscribed Module
          </p>
        </div>

        {/* 2 Larger Responsive Boxes Per Row Grid */}
        {MODULES.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem', width: '100%' }}>
            This company has no subscribed modules. Contact Knock The Globe Technologies to enable a module.
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'clamp(12px, 2.5vw, 18px)',
          width: '100%',
          marginBottom: 32
        }}>
          {MODULES.map((mod) => {
            const IconComp = mod.icon;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => setSelectedModuleModal(mod)}
                style={{
                  width: '100%',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 16,
                  padding: 'clamp(14px, 3vw, 20px)',
                  minHeight: 100,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxSizing: 'border-box',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = mod.color;
                  e.currentTarget.style.boxShadow = `0 10px 24px -4px ${mod.bg}, 0 4px 12px rgba(15, 23, 42, 0.06)`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.03)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: mod.bg,
                  border: `1px solid ${mod.border}`,
                  color: mod.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <IconComp style={{ width: 24, height: 24 }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', gap: 3 }}>
                  <span style={{ fontSize: '1.025rem', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {mod.title}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 400, lineHeight: 1.35 }}>
                    {mod.subtitle}
                  </span>
                </div>

                <ChevronRight style={{ width: 18, height: 18, color: '#94A3B8', flexShrink: 0 }} />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 500 }}>
          Knock The Globe Technologies Pvt. Ltd. © 2026 Enterprise Suite
        </div>

      </div>

      {/* ── Confirm Module Entrance Modal (Modern SaaS Glass Theme) ── */}
      {selectedModuleModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            maxWidth: 370,
            width: '100%',
            background: '#FFFFFF',
            borderRadius: 20,
            padding: 28,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.22)',
            border: '1px solid #E2E8F0',
            position: 'relative'
          }}>
            <button
              onClick={() => setSelectedModuleModal(null)}
              style={{
                position: 'absolute', top: 16, right: 16,
                border: 'none', background: '#F1F5F9',
                borderRadius: '50%', width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748B', cursor: 'pointer'
              }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>

            <div style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: selectedModuleModal.bg,
              border: `1px solid ${selectedModuleModal.border}`,
              color: selectedModuleModal.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {React.createElement(selectedModuleModal.icon, { style: { width: 26, height: 26 } })}
            </div>

            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
                Open {selectedModuleModal.title}?
              </h3>
              <p style={{ fontSize: '0.825rem', color: '#64748B', margin: 0, fontWeight: 400, lineHeight: 1.45 }}>
                Do you want to proceed to <strong>{selectedModuleModal.title}</strong> login?
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setSelectedModuleModal(null)}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#334155',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const mod = selectedModuleModal;
                  setSelectedModuleModal(null);
                  onSelectModule(mod);
                }}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 10,
                  border: 'none',
                  background: '#059669',
                  color: '#FFFFFF',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <span>Yes, Proceed</span>
                <ArrowRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
