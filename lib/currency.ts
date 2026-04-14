import { Platform } from 'react-native';

export type Moneda = 'USD' | 'GS';

const STORAGE_KEY_TC = 'tipoCambio';
const STORAGE_KEY_MONEDA = 'monedaActiva';
const DEFAULT_TC = 7850; // fallback

// --- Storage helpers (duplicated to avoid circular dep) ---
function storageGet(key: string): string | null {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
}
function storageSet(key: string, value: string): void {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

// --- Tipo de cambio ---

export async function fetchTipoCambio(): Promise<number> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data.rates?.PYG) {
      const tc = Math.round(data.rates.PYG);
      storageSet(STORAGE_KEY_TC, JSON.stringify({ rate: tc, date: new Date().toISOString() }));
      return tc;
    }
  } catch (e) {
    console.warn('fetchTipoCambio error:', e);
  }
  // Fallback: cached
  const cached = storageGet(STORAGE_KEY_TC);
  if (cached) {
    try { return JSON.parse(cached).rate; } catch {}
  }
  return DEFAULT_TC;
}

export function getCachedTipoCambio(): number {
  const cached = storageGet(STORAGE_KEY_TC);
  if (cached) {
    try { return JSON.parse(cached).rate; } catch {}
  }
  return DEFAULT_TC;
}

// --- Moneda activa ---

export function getMonedaActiva(): Moneda {
  const val = storageGet(STORAGE_KEY_MONEDA);
  return (val === 'GS' || val === 'USD') ? val : 'GS';
}

export function setMonedaActiva(moneda: Moneda): void {
  storageSet(STORAGE_KEY_MONEDA, moneda);
}

// --- Conversión ---

/** Convierte un monto de una moneda a otra */
export function convertir(amount: number, from: Moneda, to: Moneda, tc: number): number {
  if (from === to) return amount;
  if (from === 'USD' && to === 'GS') return amount * tc;
  if (from === 'GS' && to === 'USD') return amount / tc;
  return amount;
}

/** Convierte a USD (moneda interna de cálculo) */
export function toUSD(amount: number, moneda: Moneda, tc: number): number {
  return convertir(amount, moneda, 'USD', tc);
}

/** Convierte de USD a la moneda activa */
export function fromUSD(amount: number, to: Moneda, tc: number): number {
  return convertir(amount, 'USD', to, tc);
}

// --- Formateo ---

export function formatMoney(amount: number, moneda: Moneda): string {
  if (moneda === 'USD') {
    return 'US$ ' + amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  // GS: sin decimales
  return '₲ ' + Math.round(amount).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** Formatea en la moneda activa, convirtiendo desde USD */
export function formatFromUSD(amountUSD: number, monedaActiva: Moneda, tc: number): string {
  const converted = fromUSD(amountUSD, monedaActiva, tc);
  return formatMoney(converted, monedaActiva);
}
