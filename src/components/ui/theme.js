/*
 * theme.js — Single source of truth for all design tokens and reusable styles.
 *
 * Usage:
 *   import { colors, radius, btn, input, modal, table, snackbar } from '../theme'
 *
 * All color values reference CSS custom properties so they react to future
 * theme changes in index.css without touching component files.
 */

// ─── Typography ────────────────────────────────────────────────────────────────
export const font = {
  sans:  "'Sora', system-ui, sans-serif",
  mono:  "'JetBrains Mono', monospace",
}

export const text = {
  xs:   { fontSize: 9,  lineHeight: 1.4 },
  sm:   { fontSize: 10, lineHeight: 1.4 },
  base: { fontSize: 12, lineHeight: 1.5 },
  md:   { fontSize: 13, lineHeight: 1.5 },
  lg:   { fontSize: 15, lineHeight: 1.4 },
  xl:   { fontSize: 18, lineHeight: 1.3 },
  '2xl':{ fontSize: 22, lineHeight: 1.2 },
}

export const weight = {
  normal:  400,
  medium:  500,
  semibold:600,
  bold:    700,
  extrabold:800,
  black:   900,
}

// ─── Colors (maps to CSS vars) ─────────────────────────────────────────────────
export const colors = {
  brand:        'var(--brand)',
  brand2:       'var(--brand-2)',
  brandLight:   'var(--brand-light)',
  brandBg:      'var(--brand-bg)',
  brandTint:    'var(--brand-tint)',
  brandBorder:  'var(--brand-border)',
  brandGlow:    'var(--brand-glow)',

  bg:           'var(--bg)',
  surface:      'var(--surface)',
  surface2:     'var(--surface-2)',
  surface3:     'var(--surface-3)',

  border:       'var(--border)',
  border2:      'var(--border-2)',

  text1:        'var(--text-1)',
  text2:        'var(--text-2)',
  text3:        'var(--text-3)',
  text4:        'var(--text-4)',

  green:        'var(--green)',
  greenBg:      'var(--green-bg)',
  greenBorder:  'var(--green-border)',

  blue:         'var(--blue)',
  blueBg:       'var(--blue-bg)',
  blueBorder:   'var(--blue-border)',

  amber:        'var(--amber)',
  amberBg:      'var(--amber-bg)',
  amberBorder:  'var(--amber-border)',

  purple:       'var(--purple)',
  purpleBg:     'var(--purple-bg)',
  purpleBorder: 'var(--purple-border)',

  red:          'var(--red)',
  redBg:        'var(--red-bg)',
  redBorder:    'var(--red-border)',

  white:        '#ffffff',
}

// Semantic color groups for badges, tags, alerts
export const semantic = {
  success: { color: colors.green,  bg: colors.greenBg,  border: colors.greenBorder  },
  warning: { color: colors.amber,  bg: colors.amberBg,  border: colors.amberBorder  },
  danger:  { color: colors.red,    bg: colors.redBg,    border: colors.redBorder    },
  info:    { color: colors.blue,   bg: colors.blueBg,   border: colors.blueBorder   },
  accent:  { color: colors.purple, bg: colors.purpleBg, border: colors.purpleBorder },
  brand:   { color: colors.brand,  bg: colors.brandBg,  border: colors.brandBorder  },
}

// ─── Spacing ───────────────────────────────────────────────────────────────────
export const space = {
  1:  2,
  2:  4,
  3:  6,
  4:  8,
  5:  10,
  6:  12,
  7:  14,
  8:  16,
  10: 20,
  12: 24,
  14: 28,
  16: 32,
}

// ─── Border Radius ─────────────────────────────────────────────────────────────
export const radius = {
  sm:     'var(--r-sm)',   // 8px
  md:     'var(--r-md)',   // 10px
  lg:     'var(--r-lg)',   // 14px
  xl:     'var(--r-xl)',   // 18px
  '2xl':  24,
  '3xl':  32,
  full:   9999,
}

// ─── Shadows ───────────────────────────────────────────────────────────────────
export const shadow = {
  xs: 'var(--shadow-xs)',
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  modal:  '0 24px 64px rgba(0,0,0,0.18)',
  modalLg:'0 40px 100px rgba(0,0,0,0.22), 0 2px 10px rgba(0,0,0,0.06)',
  brand:  '0 4px 14px rgba(107,0,0,0.22)',
  brandHover: '0 6px 20px rgba(107,0,0,0.32)',
}

// ─── Gradients ─────────────────────────────────────────────────────────────────
export const gradient = {
  brand:   'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
  brandH:  'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)',
  brandV:  'linear-gradient(180deg, var(--brand) 0%, var(--brand-2) 100%)',
  surface: 'linear-gradient(90deg, var(--brand-bg) 0%, var(--surface) 100%)',
}

// ─── Animation ─────────────────────────────────────────────────────────────────
export const transition = {
  fast:   'all 0.1s ease',
  base:   'all 0.15s ease',
  slow:   'all 0.25s ease',
  spring: 'all 0.18s cubic-bezier(.22,.68,0,1.2)',
}

export const animation = {
  modalFade:  'opacity:0 → opacity:1  (0.15s ease)',
  modalSlide: 'scale(0.96) translateY(10px) → scale(1) translateY(0)  (0.18s spring)',
}

// ─── Keyframe strings (inject via <style> in modal components) ─────────────────
export const keyframes = {
  fadeIn:     `@keyframes fadeIn  { from{opacity:0} to{opacity:1} }`,
  slideUp:    `@keyframes slideUp { from{opacity:0;transform:scale(0.96) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }`,
  slideRight: `@keyframes slideRight { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }`,
  pulse:      `@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`,
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
export const modal = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(10,8,6,0.4)',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'fadeIn 0.15s ease',
  },
  card: {
    background: colors.white,
    borderRadius: radius['2xl'],
    overflow: 'hidden',
    boxShadow: shadow.modal,
    display: 'flex', flexDirection: 'column',
    animation: 'slideUp 0.18s cubic-bezier(.22,.68,0,1.2)',
  },
  header: {
    background: gradient.brand,
    padding: '12px 16px',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', flexShrink: 0,
  },
  headerTitle: {
    fontSize: 14, fontWeight: weight.extrabold, color: colors.white,
  },
  closeBtn: {
    width: 28, height: 28, borderRadius: 7,
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: colors.white, cursor: 'pointer',
    transition: transition.fast,
  },
  footer: {
    display: 'flex', gap: 8, padding: '12px 16px',
    borderTop: `1px solid ${colors.border}`,
    background: colors.surface2, flexShrink: 0,
  },
}

// ─── Buttons ───────────────────────────────────────────────────────────────────
export const btn = {
  // Base shared properties
  base: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    fontFamily: font.sans, fontWeight: weight.bold,
    cursor: 'pointer', transition: transition.base,
    borderRadius: radius.md, border: 'none', outline: 'none',
  },

  // Sizes
  sm:  { height: 30, padding: '0 10px', fontSize: 11 },
  md:  { height: 36, padding: '0 14px', fontSize: 12 },
  lg:  { height: 42, padding: '0 18px', fontSize: 13 },

  // Variants
  primary: {
    background: gradient.brand, color: colors.white, border: 'none',
    boxShadow: shadow.brand,
  },
  secondary: {
    background: colors.white, color: colors.text2,
    border: `1.5px solid ${colors.border}`,
  },
  danger: {
    background: colors.redBg, color: colors.red,
    border: `1.5px solid ${colors.redBorder}`,
  },
  success: {
    background: colors.greenBg, color: colors.green,
    border: `1.5px solid ${colors.greenBorder}`,
  },
  warning: {
    background: colors.amberBg, color: colors.amber,
    border: `1.5px solid ${colors.amberBorder}`,
  },
  ghost: {
    background: 'transparent', color: colors.text2,
    border: '1px solid transparent',
  },

  // Numpad button
  numpad: {
    flex: 1, height: 44, borderRadius: radius.sm,
    border: `1.5px solid ${colors.border}`, background: colors.white,
    fontSize: 15, fontWeight: weight.bold, color: colors.text1,
    cursor: 'pointer', transition: transition.fast,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  numpadHover: {
    background: colors.brandBg,
    borderColor: colors.brandBorder,
    color: colors.brand,
  },
}

// Helper: merge btn base + size + variant into one style object
export const makeBtn = (size = 'md', variant = 'primary') => ({
  ...btn.base,
  ...btn[size],
  ...btn[variant],
})

// ─── Input ─────────────────────────────────────────────────────────────────────
export const input = {
  base: {
    width: '100%', height: 34, boxSizing: 'border-box',
    padding: '0 10px',
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    background: colors.surface2,
    fontSize: 12, fontWeight: weight.medium,
    color: colors.text1, outline: 'none',
    transition: transition.fast,
    fontFamily: font.sans,
  },
  active: {
    border: `1.5px solid ${colors.brand}`,
    background: colors.brandBg,
  },
  mono: {
    fontFamily: font.mono,
    fontVariantNumeric: 'tabular-nums',
  },
  label: {
    fontSize: 10, fontWeight: weight.bold,
    color: colors.brand,
    textTransform: 'uppercase', letterSpacing: 0.5,
    display: 'block', marginBottom: 3,
  },
}

// ─── Table ─────────────────────────────────────────────────────────────────────
export const table = {
  wrapper: {
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    border: `1.5px solid ${colors.brandBorder}`,
    borderRadius: 10,
  },
  heading: {
    background: colors.brandBg,
    borderBottom: `1.5px solid ${colors.brandBorder}`,
    padding: '8px 12px', flexShrink: 0,
    borderRadius: '8px 8px 0 0',
  },
  headCell: {
    fontSize: 10, fontWeight: weight.bold,
    color: colors.brand,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  row: {
    padding: '9px 12px',
    borderBottom: `1px solid ${colors.border}`,
    background: colors.white,
    transition: 'background 0.1s',
    cursor: 'pointer',
  },
  rowActive: {
    background: 'rgba(107,0,0,0.06)',
    borderLeft: `3px solid ${colors.brand}`,
  },
  rowHover: {
    background: colors.surface2,
  },
  cell: {
    fontSize: 12, color: colors.text1, fontWeight: weight.medium,
  },
  cellMono: {
    fontSize: 12, color: colors.text1,
    fontFamily: font.mono, fontVariantNumeric: 'tabular-nums',
  },
  cellMuted: {
    fontSize: 12, color: colors.text4,
  },
}

// ─── Badge / Pill ──────────────────────────────────────────────────────────────
export const badge = {
  base: {
    display: 'inline-flex', alignItems: 'center', gap: 3,
    fontSize: 9, fontWeight: weight.bold,
    padding: '2px 7px', borderRadius: radius.full,
    letterSpacing: 0.4, textTransform: 'uppercase',
  },
  brand:   { background: colors.brandBg,   color: colors.brand,  border: `1px solid ${colors.brandBorder}`  },
  success: { background: colors.greenBg,   color: colors.green,  border: `1px solid ${colors.greenBorder}`  },
  warning: { background: colors.amberBg,   color: colors.amber,  border: `1px solid ${colors.amberBorder}`  },
  danger:  { background: colors.redBg,     color: colors.red,    border: `1px solid ${colors.redBorder}`    },
  info:    { background: colors.blueBg,    color: colors.blue,   border: `1px solid ${colors.blueBorder}`   },
  accent:  { background: colors.purpleBg,  color: colors.purple, border: `1px solid ${colors.purpleBorder}` },
  neutral: { background: colors.surface2,  color: colors.text2,  border: `1px solid ${colors.border}`       },
}

// ─── Snackbar / Toast ──────────────────────────────────────────────────────────
export const snackbar = {
  container: {
    position: 'fixed', bottom: 24, left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    pointerEvents: 'none',
  },
  base: {
    display: 'inline-flex', alignItems: 'center', gap: 10,
    padding: '10px 16px', borderRadius: 12,
    boxShadow: shadow.lg,
    fontSize: 12, fontWeight: weight.semibold,
    pointerEvents: 'auto',
    animation: 'slideUp 0.2s cubic-bezier(.22,.68,0,1.2)',
    minWidth: 220, maxWidth: 380,
  },
  success: { background: colors.green,  color: colors.white },
  danger:  { background: colors.red,    color: colors.white },
  warning: { background: colors.amber,  color: colors.white },
  info:    { background: colors.blue,   color: colors.white },
  brand:   { background: gradient.brand, color: colors.white },
  neutral: { background: colors.text1,  color: colors.white },
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
export const statCard = {
  base: {
    borderRadius: 10, padding: '10px 14px',
    border: `1px solid ${colors.border}`,
    background: colors.surface2,
  },
  accent: {
    border: `1.5px solid ${colors.brandBorder}`,
    background: colors.brandBg,
  },
  label: {
    fontSize: 9, fontWeight: weight.bold,
    color: colors.text4,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 4,
  },
  labelAccent: {
    color: colors.brand,
  },
  value: {
    fontSize: 20, fontWeight: weight.black,
    lineHeight: 1, color: colors.text1,
  },
  valueAccent: {
    color: colors.brand,
  },
}

// ─── Divider ───────────────────────────────────────────────────────────────────
export const divider = {
  h: { width: '100%',  height: 1, background: colors.border },
  v: { height: '100%', width: 1,  background: colors.border, flexShrink: 0 },
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
export const avatar = {
  sm: { width: 28, height: 28, borderRadius: 8,  fontSize: 10 },
  md: { width: 36, height: 36, borderRadius: 10, fontSize: 13 },
  lg: { width: 46, height: 46, borderRadius: 13, fontSize: 16 },
  base: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: weight.extrabold, flexShrink: 0,
    background: colors.brandBg,
    border: `1.5px solid ${colors.brandBorder}`,
    color: colors.brand,
  },
}

// ─── Progress Bar ──────────────────────────────────────────────────────────────
export const progress = {
  track: {
    height: 6, borderRadius: 4,
    background: colors.border, overflow: 'hidden',
  },
  fill: {
    height: '100%', borderRadius: 4,
    background: gradient.brand,
    transition: 'width 0.4s ease',
  },
}

// ─── Section Header (inside modals / panels) ───────────────────────────────────
export const sectionHeader = {
  wrapper: {
    padding: '6px 12px 4px',
    borderBottom: `1px solid ${colors.border}`,
    background: colors.surface2, flexShrink: 0,
  },
  text: {
    fontSize: 10, fontWeight: weight.bold,
    color: colors.text4,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
}

// ─── Icon Button (header close, nav arrows, etc.) ─────────────────────────────
export const iconBtn = {
  base: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.sm, cursor: 'pointer',
    transition: transition.fast, flexShrink: 0,
  },
  sm:  { width: 26, height: 26 },
  md:  { width: 32, height: 32 },
  lg:  { width: 40, height: 40 },
  ghost: {
    background: 'transparent', border: `1px solid ${colors.border}`,
    color: colors.text2,
  },
  onBrand: {
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.22)',
    color: colors.white,
  },
}
