// Paleta de colores azul/blanco profesional
export const COLORS = {
  // Primary blues
  primary: '#1e40af',       // Azul principal
  primaryLight: '#3b82f6',  // Azul claro
  primaryDark: '#1e3a8a',   // Azul oscuro
  primarySoft: '#dbeafe',   // Azul muy suave (fondo)
  primaryGhost: '#eff6ff',  // Azul casi blanco

  // Backgrounds
  bg: '#f8fafc',            // Fondo general
  bgWhite: '#ffffff',       // Cards
  bgHeader: '#1e40af',      // Header azul

  // Text
  text: '#0f172a',          // Texto principal
  textSecondary: '#475569', // Texto secundario
  textMuted: '#94a3b8',     // Texto deshabilitado
  textWhite: '#ffffff',     // Texto sobre azul

  // Accents
  success: '#10b981',       // Verde éxito
  successSoft: '#d1fae5',
  danger: '#ef4444',        // Rojo eliminar
  dangerSoft: '#fee2e2',
  warning: '#f59e0b',       // Amarillo
  warningSoft: '#fef3c7',

  // Borders
  border: '#e2e8f0',
  borderFocus: '#3b82f6',

  // Shadows
  shadow: '#1e40af',
};

export const SHADOWS = {
  small: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};
