// TexQuote / Texcin Group — Design System
export const COLORS = {
  // Primary navy
  primary: '#1E3A6E',
  primaryLight: '#2B4F96',
  primaryDark: '#17315B',
  primarySoft: '#DBE3F3',
  primaryGhost: '#EEF2FF',

  // Backgrounds
  bg: '#F4F6FB',
  bgWhite: '#FFFFFF',
  bgHeader: '#1E3A6E',

  // Text
  text: '#1A202C',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textWhite: '#FFFFFF',

  // Accents
  success: '#16A34A',
  successSoft: '#D1FAE5',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  purple: '#7C3AED',
  purpleSoft: '#EDE9FE',

  // Borders
  border: '#E2E8F0',
  borderFocus: '#2B4F96',

  // Shadows
  shadow: '#1E3A6E',

  // WhatsApp
  whatsapp: '#25D366',
};

export const SHADOWS = {
  small: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  large: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
};

export const RADIUS = {
  sm: 8,
  md: 10,
  card: 14,
  lg: 16,
  xl: 20,
  full: 999,
};

export const BRAND = {
  name: 'TexQuote',
  subtitle: 'Texcin Group · Private Label',
  short: 'TXN',
};
