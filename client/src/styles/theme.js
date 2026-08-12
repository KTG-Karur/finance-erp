// ============================================================
// FINANCIAL ERP — CENTRAL THEME DESIGN TOKENS (SINGLE SOURCE OF TRUTH)
// Every color used anywhere in the app should come from here, not a raw hex
// literal in a component. The CSS custom properties this reads (defined in
// styles/_variables.scss's :root block, defaults shown in the fallback below)
// are what ThemeCustomizerDrawer actually rewrites at runtime via
// utils/themeUtils.js's applyTheme() — so anything built from `theme.primary*`
// repaints live the instant a user picks a new brand color, with zero
// per-component code changes needed.
//
// Only the `primary*` family is end-user customizable. `success/warning/
// danger/info` are fixed semantic conventions (red is always destructive,
// amber is always caution) — they're still centralized here so nothing in the
// app ever hardcodes a status color, but the picker deliberately never
// touches them.
// ============================================================

export const theme = {
  // Brand / Primary — the ONE customizable color family. Default is Forest
  // Green (#15803D), not the old Emerald (#059669) — every login with no
  // theme_color saved yet renders this.
  primary: 'var(--brand-primary, #15803D)',
  primaryHover: 'var(--brand-primary-hover, #0E5327)',
  primaryLight: 'var(--brand-primary-light, #F0FEF5)',
  primaryDark: 'var(--brand-primary-dark, #054C1F)',
  primaryBorder: 'var(--brand-primary-border, #A3F5C1)',
  primaryText: 'var(--brand-primary-text, #075F27)',
  primaryRgb: 'var(--brand-primary-rgb, 21, 128, 61)',

  // Deep surface shades — the sidebar / dashboard banner dark backgrounds.
  primaryDeep1: 'var(--brand-primary-deep-1, #041A0C)',
  primaryDeep2: 'var(--brand-primary-deep-2, #062310)',
  primaryDeep3: 'var(--brand-primary-deep-3, #072C15)',
  primaryDeep3Rgb: 'var(--brand-primary-deep-3-rgb, 7, 44, 21)',
  primaryDeep4: 'var(--brand-primary-deep-4, #09391B)',
  primaryDeep5: 'var(--brand-primary-deep-5, #0D4F25)',
  primaryDeep5Rgb: 'var(--brand-primary-deep-5-rgb, 13, 79, 37)',

  // Success — shares the brand hue by default (most finance-app "positive"
  // states are the same green as the brand), but is a distinct token so a
  // future non-green brand color doesn't accidentally recolor status badges.
  success: 'var(--color-success, #15803D)',
  successLight: 'var(--color-success-light, #F0FEF5)',
  successBorder: 'var(--color-success-border, #A3F5C1)',
  successText: 'var(--color-success-text, #075F27)',

  warning: 'var(--color-warning, #D97706)',
  warningLight: 'var(--color-warning-light, #FFFBEB)',
  warningBorder: 'var(--color-warning-border, #FDE68A)',
  warningText: 'var(--color-warning-text, #92400E)',
  warningHover: 'var(--color-warning-hover, #B45309)',
  warningRgb: 'var(--color-warning-rgb, 217, 119, 6)',

  danger: 'var(--color-danger, #DC2626)',
  dangerLight: 'var(--color-danger-light, #FEF2F2)',
  dangerBorder: 'var(--color-danger-border, #FECACA)',
  dangerText: 'var(--color-danger-text, #991B1B)',
  dangerHover: 'var(--color-danger-hover, #B91C1C)',
  dangerRgb: 'var(--color-danger-rgb, 220, 38, 38)',

  info: 'var(--color-info, #2563EB)',
  infoLight: 'var(--color-info-light, #EFF6FF)',
  infoBorder: 'var(--color-info-border, #BFDBFE)',
  infoText: 'var(--color-info-text, #1E40AF)',
  infoHover: 'var(--color-info-hover, #1D4ED8)',
  infoRgb: 'var(--color-info-rgb, 37, 99, 235)',

  // Neutral Slate Surface & Text Tokens — fixed design-system grays, not
  // part of the customizable brand palette.
  bgApp: 'var(--bg-app, #F8FAFC)',
  bgSurface: 'var(--bg-surface, #FFFFFF)',
  textMain: 'var(--text-main, #0F172A)',
  textMuted: 'var(--text-muted, #64748B)',
  borderLight: 'var(--border-light, #E2E8F0)',
  borderBase: 'var(--border-base, #CBD5E1)',
};

export default theme;
