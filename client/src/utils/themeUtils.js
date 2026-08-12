// ============================================================
// FINANCIAL ERP — DYNAMIC THEME ENGINE & COLOR UTILITIES
// Handles hex-to-HSL conversions and dynamic CSS variable application.
// Persistence is server-side (companies.theme_color, one shared value per
// tenant — see App.jsx's fetchCompanyProfile / handleSaveCompanyProfile and
// auth.service.js's getOwnCompanyProfile/updateOwnCompanyProfile), not
// localStorage — every user of a tenant sees the same brand color regardless
// of device or browser.
// ============================================================

export function hexToHsl(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export function hexToRgbString(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export function generateThemePalette(primaryHex) {
  const { h, s, l } = hexToHsl(primaryHex);
  const hoverHex = hslToHex(h, s, Math.max(l - 10, 15));
  const lightHex = hslToHex(h, Math.min(s + 20, 95), 97);
  const darkHex = hslToHex(h, Math.min(s + 15, 90), 16);
  const borderHex = hslToHex(h, Math.min(s + 10, 80), 80);
  const textHex = hslToHex(h, Math.min(s + 15, 90), 20);

  // Deep surfaces (sidebar / dashboard banner) — same hue, capped saturation
  // (a fully-saturated custom pick would otherwise turn near-black neon at
  // this lightness) and near-black lightness so white sidebar text/icons
  // always stay readable regardless of which brand color is active.
  const deepSat = Math.min(s, 82);
  const deep1 = hslToHex(h, deepSat, 6);
  const deep2 = hslToHex(h, deepSat, 8);
  const deep3 = hslToHex(h, deepSat, 10);
  const deep4 = hslToHex(h, deepSat, 13);
  const deep5 = hslToHex(h, deepSat, 18);

  return {
    primary: primaryHex,
    hover: hoverHex,
    light: lightHex,
    dark: darkHex,
    border: borderHex,
    text: textHex,
    rgb: hexToRgbString(primaryHex),
    deep1, deep2, deep3, deep4, deep5,
    deep3Rgb: hexToRgbString(deep3),
    deep5Rgb: hexToRgbString(deep5)
  };
}

export function applyTheme(palette) {
  if (!palette || !palette.primary) return;
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', palette.primary);
  root.style.setProperty('--brand-primary-hover', palette.hover || palette.primary);
  root.style.setProperty('--brand-primary-light', palette.light || '#F0FEF5');
  root.style.setProperty('--brand-primary-dark', palette.dark || '#054C1F');
  root.style.setProperty('--brand-primary-border', palette.border || '#A3F5C1');
  root.style.setProperty('--brand-primary-text', palette.text || '#075F27');
  root.style.setProperty('--brand-primary-rgb', palette.rgb || hexToRgbString(palette.primary));
  // success shares the brand hue by default (see theme.js) — keep it in sync
  // so "Active"/positive-state badges retheme along with everything else.
  root.style.setProperty('--color-success', palette.primary);
  root.style.setProperty('--color-success-light', palette.light || '#F0FEF5');
  root.style.setProperty('--color-success-border', palette.border || '#A3F5C1');
  root.style.setProperty('--color-success-text', palette.text || '#075F27');
  // Deep surfaces — sidebar background, dashboard welcome banner.
  root.style.setProperty('--brand-primary-deep-1', palette.deep1 || '#041A0C');
  root.style.setProperty('--brand-primary-deep-2', palette.deep2 || '#062310');
  root.style.setProperty('--brand-primary-deep-3', palette.deep3 || '#072C15');
  root.style.setProperty('--brand-primary-deep-3-rgb', palette.deep3Rgb || '7, 44, 21');
  root.style.setProperty('--brand-primary-deep-4', palette.deep4 || '#09391B');
  root.style.setProperty('--brand-primary-deep-5', palette.deep5 || '#0D4F25');
  root.style.setProperty('--brand-primary-deep-5-rgb', palette.deep5Rgb || '13, 79, 37');
}

// Curated, professional-grade brand palette — each chosen for good contrast
// against white button text (see ThemeCustomizerDrawer's contrast check) and
// distinct enough from its neighbors to read clearly as a small swatch.
export const PRESET_THEMES = [
  { id: 'forest', name: 'Forest Green', primary: '#15803D', desc: 'Default — deep, grounded forest green' },
  { id: 'sapphire', name: 'Sapphire Blue', primary: '#2563EB', desc: 'Enterprise royal sapphire blue' },
  { id: 'amber', name: 'Amber Gold', primary: '#D97706', desc: 'Warm executive golden yellow' },
  { id: 'ruby', name: 'Ruby Red', primary: '#DC2626', desc: 'Bold crimson ruby red' },
  { id: 'violet', name: 'Imperial Violet', primary: '#7C3AED', desc: 'Executive luxury violet' },
  { id: 'indigo', name: 'Midnight Indigo', primary: '#4F46E5', desc: 'Modern SaaS tech indigo' },
  { id: 'teal', name: 'Ocean Teal', primary: '#0D9488', desc: 'Sleek pacific ocean teal' },
  { id: 'rose', name: 'Rose Pink', primary: '#DB2777', desc: 'Distinctive rose pink accent' },
  { id: 'slate', name: 'Steel Slate', primary: '#475569', desc: 'Understated corporate steel gray' },
  { id: 'emerald', name: 'Emerald Green', primary: '#059669', desc: 'Trustworthy, modern finance green' }
];
