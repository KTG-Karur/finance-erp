import React, { useState, useEffect, useRef } from 'react';
import { Palette, X, RotateCcw, Check, AlertTriangle } from 'lucide-react';
import { PRESET_THEMES, generateThemePalette, applyTheme, hexToHsl } from '../utils/themeUtils';

const DEFAULT_HEX = '#15803D';

// WCAG-ish relative luminance / contrast ratio against white text — a real
// accessibility signal, not decoration: a brand color light enough that white
// button text becomes unreadable is a genuine, easy-to-make picker mistake.
function contrastAgainstWhite(hex) {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(c.substring(i, i + 2), 16) / 255);
  const lin = v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return (1.0 + 0.05) / (L + 0.05);
}

export default function ThemeCustomizerDrawer({ tenant, user, onSaveTheme }) {
  const companyName = tenant?.name || user?.companyName || 'Company';
  const canSave = Boolean(onSaveTheme) && user?.role !== 'SUPER_ADMIN';

  const [isOpen, setIsOpen] = useState(false);
  const [customHex, setCustomHex] = useState(tenant?.theme_color || DEFAULT_HEX);
  const [livePalette, setLivePalette] = useState(() => generateThemePalette(tenant?.theme_color || DEFAULT_HEX));
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [saveError, setSaveError] = useState('');
  const drawerRef = useRef(null);

  // theme_color is a DB column (companies.theme_color) — shared across every
  // user of this tenant. The instant it arrives (or changes, e.g. after a
  // teammate on another device saves a new one and this session refetches),
  // resync the picker so it never shows a stale color as "current".
  useEffect(() => {
    const hex = tenant?.theme_color || DEFAULT_HEX;
    setCustomHex(hex);
    setLivePalette(generateThemePalette(hex));
  }, [tenant?.theme_color]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    const onClick = (e) => { if (drawerRef.current && !drawerRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [isOpen]);

  const previewHex = (hex) => {
    setCustomHex(hex);
    setSaveError('');
    const palette = generateThemePalette(hex);
    setLivePalette(palette);
    applyTheme(palette); // live, app-wide — every screen repaints immediately
  };

  const handleSelectPreset = (preset) => previewHex(preset.primary);
  const handleCustomColorChange = (e) => previewHex(e.target.value);
  const handleReset = () => previewHex(DEFAULT_HEX);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await onSaveTheme?.({ theme_color: customHex });
      setSavedMsg('Saved for everyone');
      setTimeout(() => setSavedMsg(''), 2200);
    } catch (err) {
      setSaveError(err?.response?.data?.message || 'Failed to save theme.');
    } finally {
      setSaving(false);
    }
  };

  const activePresetId = PRESET_THEMES.find(p => p.primary.toLowerCase() === customHex.toLowerCase())?.id;
  const contrast = contrastAgainstWhite(customHex);
  const lowContrast = contrast < 3.0;
  const { h, s, l } = hexToHsl(customHex);
  const isDirty = (tenant?.theme_color || DEFAULT_HEX).toLowerCase() !== customHex.toLowerCase();

  return (
    <>
      {/* ── Trigger Tab (fixed right edge) ────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        title="Customize brand theme"
        style={{
          position: 'fixed', right: 0, top: '48%', transform: 'translateY(-50%)', zIndex: 9998,
          width: 36, height: 44, borderTopLeftRadius: 9, borderBottomLeftRadius: 9,
          border: 'none', background: livePalette.primary, color: '#FFFFFF',
          boxShadow: '-2px 4px 12px rgba(15, 23, 42, 0.25)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.15s ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.width = '40px'; }}
        onMouseLeave={(e) => { e.currentTarget.style.width = '36px'; }}
      >
        <Palette style={{ width: 16, height: 16 }} />
      </button>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.35)', zIndex: 9999 }}
        />
      )}

      {/* ── Compact Drawer ─────────────────────────────────────────── */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-label="Theme customizer"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 288, maxWidth: '85vw',
          backgroundColor: 'var(--bg-surface, #FFFFFF)', boxShadow: '-8px 0 28px rgba(15, 23, 42, 0.18)',
          zIndex: 10000, display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '12px 14px', borderBottom: '1px solid var(--border-light, #E2E8F0)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7, background: livePalette.primary,
              color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Palette style={{ width: 13, height: 13 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0, whiteSpace: 'nowrap' }}>Theme</h3>
              <p style={{ fontSize: '0.66rem', color: 'var(--text-muted, #64748B)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{companyName}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--border-base, #CBD5E1)', backgroundColor: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-muted, #64748B)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {!canSave && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', background: 'var(--color-warning-light, #FFFBEB)', border: '1px solid var(--color-warning-border, #FDE68A)', borderRadius: 8, padding: '7px 9px', fontSize: '0.68rem', lineHeight: 1.35, color: 'var(--color-warning-text, #92400E)' }}>
              <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1 }} />
              <span>Preview is live for you; only a Company Admin can save it for everyone.</span>
            </div>
          )}
          {savedMsg && (
            <div style={{ backgroundColor: livePalette.light, border: `1px solid ${livePalette.border}`, color: livePalette.text, padding: '7px 10px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check style={{ width: 13, height: 13, color: livePalette.primary, flexShrink: 0 }} />
              <span>{savedMsg}</span>
            </div>
          )}
          {saveError && (
            <div style={{ backgroundColor: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', color: 'var(--color-danger-text, #991B1B)', padding: '7px 10px', borderRadius: 8, fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0 }} />
              <span>{saveError}</span>
            </div>
          )}

          {/* Presets — polished, named swatches */}
          <section>
            <div style={{ fontSize: '0.64rem', fontWeight: 700, color: 'var(--text-muted, #475569)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Presets
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 7 }}>
              {PRESET_THEMES.map(preset => {
                const isSelected = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    title={preset.name}
                    style={{
                      aspectRatio: '1', borderRadius: 9, border: isSelected ? `2px solid ${preset.primary}` : '1px solid var(--border-light, #E2E8F0)',
                      background: preset.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isSelected ? `0 0 0 2px ${preset.primary}33` : 'none', transition: 'box-shadow 0.15s ease', padding: 0
                    }}
                  >
                    {isSelected && <Check style={{ width: 13, height: 13, color: '#FFFFFF' }} />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Custom Color — compact single row */}
          <section style={{ backgroundColor: 'var(--bg-app, #F8FAFC)', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: 9, padding: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <input
                type="color"
                value={customHex}
                onChange={handleCustomColorChange}
                style={{ width: 30, height: 30, padding: 0, border: '2px solid var(--border-base, #CBD5E1)', borderRadius: 7, cursor: 'pointer', backgroundColor: 'transparent', flexShrink: 0 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
                <input
                  type="text"
                  value={customHex.toUpperCase()}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                      setCustomHex(v);
                      if (/^#[0-9A-Fa-f]{6}$/.test(v)) previewHex(v);
                    }
                  }}
                  style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main, #0F172A)', fontFamily: 'SF Mono, Consolas, monospace', border: 'none', background: 'transparent', padding: 0, outline: 'none', width: '100%' }}
                />
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted, #64748B)' }}>HSL {h}° {s}% {l}%</span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                title="Reset to default"
                style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border-base, #CBD5E1)', backgroundColor: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-muted, #475569)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <RotateCcw style={{ width: 12, height: 12 }} />
              </button>
            </div>
            {lowContrast && (
              <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start', fontSize: '0.66rem', lineHeight: 1.35, color: 'var(--color-warning-text, #92400E)', background: 'var(--color-warning-light, #FFFBEB)', border: '1px solid var(--color-warning-border, #FDE68A)', borderRadius: 6, padding: '5px 8px', marginTop: 8 }}>
                <AlertTriangle style={{ width: 11, height: 11, flexShrink: 0, marginTop: 1 }} />
                <span>Too light — white button text may be unreadable ({contrast.toFixed(1)}:1, want 3.0+).</span>
              </div>
            )}
          </section>

          {/* Compact Live Preview */}
          <section style={{ border: '1px solid var(--border-light, #E2E8F0)', borderRadius: 9, padding: '10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              style={{
                height: 30, backgroundColor: livePalette.primary, color: '#FFFFFF', border: 'none', borderRadius: 7,
                fontSize: '0.72rem', fontWeight: 600, cursor: 'default'
              }}
            >
              Primary Button
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ backgroundColor: livePalette.light, border: `1px solid ${livePalette.border}`, color: livePalette.text, padding: '2px 8px', borderRadius: 16, fontSize: '0.64rem', fontWeight: 700 }}>
                ACTIVE
              </span>
              <span style={{ fontSize: '0.7rem', color: livePalette.primary, fontWeight: 600 }}>
                Text Link
              </span>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-light, #E2E8F0)', backgroundColor: 'var(--bg-app, #F8FAFC)', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving || !isDirty}
            style={{
              width: '100%', padding: '8px 14px',
              backgroundColor: (!canSave || saving || !isDirty) ? 'var(--border-base, #CBD5E1)' : livePalette.primary,
              color: '#FFFFFF', border: 'none', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700,
              cursor: (!canSave || saving || !isDirty) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
            }}
          >
            <Check style={{ width: 13, height: 13 }} />
            <span>{saving ? 'Saving...' : isDirty ? 'Save for Everyone' : 'Saved'}</span>
          </button>
        </div>
      </div>
    </>
  );
}
