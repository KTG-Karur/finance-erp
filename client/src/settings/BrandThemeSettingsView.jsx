import React, { useState, useEffect } from 'react';
import { Palette, Check, RotateCcw, Save, AlertTriangle, Sparkles, CheckCircle2, ShieldCheck, Layers, Banknote } from 'lucide-react';
import { PRESET_THEMES, generateThemePalette, applyTheme, hexToHsl } from '../utils/themeUtils';

const DEFAULT_HEX = '#15803D';

function contrastAgainstWhite(hex) {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(c.substring(i, i + 2), 16) / 255);
  const lin = v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return Number(((1.0 + 0.05) / (L + 0.05)).toFixed(2));
}

export default function BrandThemeSettingsView({ tenant, user, onSaveTheme }) {
  const [customHex, setCustomHex] = useState(tenant?.theme_color || DEFAULT_HEX);
  const [livePalette, setLivePalette] = useState(() => generateThemePalette(tenant?.theme_color || DEFAULT_HEX));
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  useEffect(() => {
    const hex = tenant?.theme_color || DEFAULT_HEX;
    setCustomHex(hex);
    setLivePalette(generateThemePalette(hex));
  }, [tenant?.theme_color]);

  const previewHex = (hex) => {
    setCustomHex(hex);
    setSaveErrorMsg('');
    const palette = generateThemePalette(hex);
    setLivePalette(palette);
    applyTheme(palette);
  };

  const handleSelectPreset = (preset) => previewHex(preset.primary);
  const handleCustomColorChange = (e) => previewHex(e.target.value);
  const handleReset = () => previewHex(DEFAULT_HEX);

  const handleSave = async () => {
    if (saving || !onSaveTheme) return;
    setSaving(true);
    setSaveErrorMsg('');
    try {
      await onSaveTheme({ theme_color: customHex });
      setSaveSuccessMsg('Brand theme saved successfully for all organization users!');
      setTimeout(() => setSaveSuccessMsg(''), 3500);
    } catch (err) {
      setSaveErrorMsg(err?.response?.data?.message || err?.message || 'Failed to save brand theme.');
    } finally {
      setSaving(false);
    }
  };

  const contrast = contrastAgainstWhite(customHex);
  const lowContrast = contrast < 3.0;
  const { h, s, l } = hexToHsl(customHex);
  const isDirty = (tenant?.theme_color || DEFAULT_HEX).toLowerCase() !== customHex.toLowerCase();

  return (
    <div className="fin-page master-settings-page">
      {/* ── Page Header ── */}
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: livePalette.light, border: `1px solid ${livePalette.border}`, color: livePalette.primary }}>
              <Palette style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">Brand Theme &amp; Color Scheme</h1>
              <p className="fin-page-header__subtitle">
                Customize your organization's primary brand theme. All modules, navigation bars, buttons, and status tags update live.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={handleReset}
              className="fin-btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 36, fontSize: '0.8rem', fontWeight: 600, borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer' }}
            >
              <RotateCcw style={{ width: 14, height: 14 }} />
              Reset to Default
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="fin-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 18px',
                height: 36,
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: 6,
                background: (!isDirty || saving) ? '#94A3B8' : livePalette.primary,
                color: '#FFFFFF',
                border: 'none',
                cursor: (!isDirty || saving) ? 'not-allowed' : 'pointer',
                boxShadow: isDirty ? '0 2px 8px rgba(0,0,0,0.12)' : 'none'
              }}
            >
              <Save style={{ width: 14, height: 14 }} />
              {saving ? 'Saving...' : 'Save Brand Theme'}
            </button>
          </div>
        </div>
      </div>

      {saveSuccessMsg && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', padding: '12px 16px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 style={{ width: 16, height: 16 }} />
          {saveSuccessMsg}
        </div>
      )}

      {saveErrorMsg && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '12px 16px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle style={{ width: 16, height: 16 }} />
          {saveErrorMsg}
        </div>
      )}

      {/* ── Main Content Grid ── */}
      <div className="theme-split-layout">
        
        {/* Left Column: Color Controls & Live Swatch */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Card: Active Color Inspector */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Palette style={{ width: 16, height: 16, color: livePalette.primary }} />
              Active Brand Color
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                backgroundColor: customHex,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                border: '3px solid #FFFFFF',
                outline: '1px solid #E2E8F0',
                flexShrink: 0
              }} />
              <div>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                  {customHex.toUpperCase()}
                </span>
                <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                  HSL({h}°, {s}%, {l}%) &bull; RGB({livePalette.rgb})
                </span>
              </div>
            </div>

            {/* Contrast / Accessibility Metric */}
            <div style={{
              background: lowContrast ? '#FFFBEB' : '#F0FEF5',
              border: `1px solid ${lowContrast ? '#FDE68A' : '#A3F5C1'}`,
              borderRadius: 8,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {lowContrast ? (
                  <AlertTriangle style={{ width: 15, height: 15, color: '#D97706' }} />
                ) : (
                  <ShieldCheck style={{ width: 15, height: 15, color: '#15803D' }} />
                )}
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: lowContrast ? '#B45309' : '#15803D' }}>
                  {lowContrast ? 'Low Contrast Warning' : 'WCAG AA Compliant'}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: lowContrast ? '#B45309' : '#15803D', fontFamily: 'monospace' }}>
                {contrast}:1
              </span>
            </div>

            {/* Custom Picker Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Choose Custom Color
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="color"
                  value={customHex}
                  onChange={handleCustomColorChange}
                  style={{
                    width: 44,
                    height: 40,
                    padding: 0,
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    cursor: 'pointer',
                    background: 'transparent'
                  }}
                />
                <input
                  type="text"
                  maxLength={7}
                  value={customHex}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith('#') || val === '') {
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                        setCustomHex(val);
                        if (val.length === 7) previewHex(val);
                      }
                    }
                  }}
                  placeholder="#15803D"
                  style={{
                    flex: 1,
                    height: 40,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    fontFamily: 'monospace'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card: Live UI Components Simulation */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0' }}>
              Component Preview
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Primary Button Preview */}
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: 4 }}>Primary Action Button</span>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: 6,
                    border: 'none',
                    background: livePalette.primary,
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'default'
                  }}
                >
                  Confirm &amp; Disburse Loan
                </button>
              </div>

              {/* Status Pill & Badge Preview */}
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: 4 }}>Status Tag / Pill</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    background: livePalette.light,
                    border: `1px solid ${livePalette.border}`,
                    color: livePalette.text
                  }}>
                    ACTIVE LOAN
                  </span>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    background: livePalette.primary,
                    color: '#FFFFFF'
                  }}>
                    SANCTIONED
                  </span>
                </div>
              </div>

              {/* Form Focus Ring Preview */}
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: 4 }}>Input Focus State</span>
                <input
                  type="text"
                  readOnly
                  value="Sample Form Field Text"
                  style={{
                    width: '100%',
                    height: 36,
                    padding: '0 10px',
                    borderRadius: 6,
                    border: `1.5px solid ${livePalette.primary}`,
                    boxShadow: `0 0 0 3px rgba(${livePalette.rgb}, 0.15)`,
                    fontSize: '0.8rem',
                    background: '#FFFFFF',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Curated Preset Themes Palette */}
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Curated Financial Presets
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '4px 0 0 0' }}>
              Select a pre-tuned, high-contrast financial ERP color palette designed for readability and professional aesthetics.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {PRESET_THEMES.map((preset) => {
              const isSelected = customHex.toLowerCase() === preset.primary.toLowerCase();
              const presetPalette = generateThemePalette(preset.primary);

              return (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  style={{
                    border: isSelected ? `2px solid ${preset.primary}` : '1px solid #E2E8F0',
                    borderRadius: 10,
                    padding: 14,
                    background: isSelected ? presetPalette.light : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    boxShadow: isSelected ? `0 2px 8px rgba(0,0,0,0.08)` : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: preset.primary,
                        display: 'inline-block',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                        {preset.name}
                      </span>
                    </div>

                    {isSelected && (
                      <span style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: preset.primary,
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Check style={{ width: 12, height: 12, strokeWidth: 3 }} />
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '0 0 8px 0', lineHeight: 1.3 }}>
                    {preset.desc}
                  </p>

                  <span style={{
                    fontSize: '0.68rem',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: preset.primary,
                    background: isSelected ? '#FFFFFF' : '#F8FAFC',
                    padding: '2px 6px',
                    borderRadius: 4,
                    border: '1px solid #E2E8F0'
                  }}>
                    {preset.primary}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
