import { Platform } from 'react-native';
import type { Moneda } from './currency';

// --- Storage abstraction ---

const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') return localStorage.getItem(key);
      const AS = (await import('@react-native-async-storage/async-storage')).default;
      return await AS.getItem(key);
    } catch { return null; }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') { localStorage.setItem(key, value); return; }
      const AS = (await import('@react-native-async-storage/async-storage')).default;
      await AS.setItem(key, value);
    } catch {}
  },
};

// --- Types ---

export type TipoTejido = 'punto' | 'plano';

export interface Prenda {
  id: string;
  nombre: string;
  minutos: number;
  insumos?: number; // legacy, ignored in new calc
}

export interface Tejido {
  id: string;
  nombre: string;
  tipo: TipoTejido;
  precio: number; // siempre USD/kg o USD/m
}

export interface Insumo {
  id: string;
  nombre: string;
  precio: number;
  moneda: Moneda;
}

export interface PaisOrigen {
  id: string;
  nombre: string;
  tasa: number;
  isLocal?: boolean;
}

export interface InsumoSeleccionado {
  insumo: Insumo;
  costoUSD: number;
}

export interface LineaResultado {
  prenda: Prenda;
  tejido: Tejido;
  consumo: number;
  cantidad: number;
  costoTejidoUSD: number;
  costoImportacionUSD: number;
  costoTejidoFinalUSD: number;
  confeccionUSD: number;
  insumosSeleccionados: InsumoSeleccionado[];
  totalInsumosUSD: number;
  costoUnitarioUSD: number;    // antes de merma/logistica
  mermaPct: number;
  costoMermaUSD: number;
  costoPostMermaUSD: number;
  logisticaPct: number;
  costoLogisticaUSD: number;
  costoRealUSD: number;        // costo final (base para precio venta)
  comisionPct: number;         // se aplica en el denominador, no en el costo
  subtotalUSD: number;
  paisOrigen?: PaisOrigen;
}

export interface Cotizacion {
  id: string;
  fecha: string;
  cliente?: string;
  lineas: LineaResultado[];
  costoMinutoUSD: number;
  totalGeneralUSD: number;
  margen: number;
  tipoCambio: number;
}

export interface LineaCotizacion {
  prendaId: string;
  tejidoId: string;
  consumo: number;
  cantidad: number;
}

// --- Keys ---

const KEYS = {
  PRENDAS: 'prendas', TEJIDOS: 'tejidos', INSUMOS: 'insumos_v2', PAISES: 'paises',
  COSTO_MINUTO: 'costoMinutoUSD', MARGEN_DEFAULT: 'margenDefault',
  COTIZACIONES: 'cotizaciones_v2', COTIZACION_ACTUAL: 'cotizacionActual_v2',
  CONSUMOS: 'consumos',
};

// --- Defaults ---

const DEFAULT_COSTO_MINUTO = 0.02; // USD/min

const DEFAULT_PRENDAS: Prenda[] = [
  { id: '1', nombre: 'Remera', minutos: 12 },
  { id: '2', nombre: 'Pantalón', minutos: 25 },
  { id: '3', nombre: 'Buzo', minutos: 20 },
  { id: '4', nombre: 'Campera', minutos: 35 },
];

const DEFAULT_TEJIDOS: Tejido[] = [
  { id: '1', nombre: 'Jersey', tipo: 'punto', precio: 0.70 },
  { id: '2', nombre: 'Interlock', tipo: 'punto', precio: 0.80 },
  { id: '3', nombre: 'Frisa', tipo: 'punto', precio: 0.90 },
  { id: '4', nombre: 'Gabardina', tipo: 'plano', precio: 0.58 },
];

const DEFAULT_INSUMOS: Insumo[] = [
  { id: 'i1', nombre: 'Hilos recta (2000 yrd)', precio: 6778, moneda: 'GS' },
  { id: 'i2', nombre: 'Hilos text (100 Gr)', precio: 11896, moneda: 'GS' },
  { id: 'i3', nombre: 'Poliamida (200 mts.)', precio: 77000, moneda: 'GS' },
  { id: 'i4', nombre: 'Ribbon (450 mts.)', precio: 65000, moneda: 'GS' },
  { id: 'i5', nombre: 'Gomas 6 cm (25 mts.)', precio: 20250, moneda: 'GS' },
  { id: 'i6', nombre: 'Gomas 7 mm (100 mts.)', precio: 22000, moneda: 'GS' },
  { id: 'i7', nombre: 'Rfid', precio: 0.0516, moneda: 'USD' },
  { id: 'i8', nombre: 'Transfer', precio: 284, moneda: 'GS' },
  { id: 'i9', nombre: 'Etiquetas bordadas', precio: 300, moneda: 'GS' },
];

const DEFAULT_PAISES: PaisOrigen[] = [
  { id: 'local', nombre: 'Local', tasa: 0, isLocal: true },
  { id: 'brasil', nombre: 'Brasil', tasa: 5 },
  { id: 'china', nombre: 'China', tasa: 15 },
];

// --- Storage helpers ---

async function getOrDefault<T>(key: string, defaultValue: T): Promise<T> {
  const raw = await storage.getItem(key);
  if (raw === null) { await storage.setItem(key, JSON.stringify(defaultValue)); return defaultValue; }
  return JSON.parse(raw);
}

// --- CRUD ---
export async function getPrendas(): Promise<Prenda[]> { return getOrDefault(KEYS.PRENDAS, DEFAULT_PRENDAS); }
export async function savePrendas(v: Prenda[]): Promise<void> { await storage.setItem(KEYS.PRENDAS, JSON.stringify(v)); }
export async function getTejidos(): Promise<Tejido[]> { return getOrDefault(KEYS.TEJIDOS, DEFAULT_TEJIDOS); }
export async function saveTejidos(v: Tejido[]): Promise<void> { await storage.setItem(KEYS.TEJIDOS, JSON.stringify(v)); }
export async function getInsumos(): Promise<Insumo[]> { return getOrDefault(KEYS.INSUMOS, DEFAULT_INSUMOS); }
export async function saveInsumos(v: Insumo[]): Promise<void> { await storage.setItem(KEYS.INSUMOS, JSON.stringify(v)); }
export async function getPaises(): Promise<PaisOrigen[]> { return getOrDefault(KEYS.PAISES, DEFAULT_PAISES); }
export async function savePaises(v: PaisOrigen[]): Promise<void> { await storage.setItem(KEYS.PAISES, JSON.stringify(v)); }
export async function getCostoMinuto(): Promise<number> { return getOrDefault(KEYS.COSTO_MINUTO, DEFAULT_COSTO_MINUTO); }
export async function saveCostoMinuto(v: number): Promise<void> { await storage.setItem(KEYS.COSTO_MINUTO, JSON.stringify(v)); }
export async function getMargenDefault(): Promise<number> { return getOrDefault(KEYS.MARGEN_DEFAULT, 40); }
export async function saveMargenDefault(v: number): Promise<void> { await storage.setItem(KEYS.MARGEN_DEFAULT, JSON.stringify(v)); }
export async function getCotizaciones(): Promise<Cotizacion[]> { return getOrDefault(KEYS.COTIZACIONES, []); }
export async function saveCotizacion(c: Cotizacion): Promise<void> {
  const l = await getCotizaciones(); l.unshift(c);
  await storage.setItem(KEYS.COTIZACIONES, JSON.stringify(l));
}
export async function deleteCotizacion(id: string): Promise<void> {
  const l = await getCotizaciones();
  await storage.setItem(KEYS.COTIZACIONES, JSON.stringify(l.filter((c) => c.id !== id)));
}
export async function getConsumos(): Promise<Record<string, number>> { return getOrDefault(KEYS.CONSUMOS, {}); }
export async function saveConsumo(pId: string, tId: string, c: number): Promise<void> {
  const cs = await getConsumos(); cs[`${pId}_${tId}`] = c;
  await storage.setItem(KEYS.CONSUMOS, JSON.stringify(cs));
}
export async function getConsumo(pId: string, tId: string): Promise<number | null> {
  const cs = await getConsumos(); return cs[`${pId}_${tId}`] ?? null;
}
export async function setCotizacionActual(c: Cotizacion): Promise<void> { await storage.setItem(KEYS.COTIZACION_ACTUAL, JSON.stringify(c)); }
export async function getCotizacionActual(): Promise<Cotizacion | null> {
  const raw = await storage.getItem(KEYS.COTIZACION_ACTUAL);
  return raw ? JSON.parse(raw) : null;
}

// --- Backup ---
export async function exportarDatos(): Promise<string> {
  const [prendas, tejidos, insumos, paises, cm, md, cotizaciones, consumos] = await Promise.all([
    getPrendas(), getTejidos(), getInsumos(), getPaises(), getCostoMinuto(), getMargenDefault(), getCotizaciones(), getConsumos(),
  ]);
  return JSON.stringify({ prendas, tejidos, insumos, paises, costoMinuto: cm, margenDefault: md, cotizaciones, consumos, exportDate: new Date().toISOString() }, null, 2);
}
export async function importarDatos(json: string): Promise<void> {
  const d = JSON.parse(json);
  if (d.prendas) await savePrendas(d.prendas);
  if (d.tejidos) await saveTejidos(d.tejidos);
  if (d.insumos) await saveInsumos(d.insumos);
  if (d.paises) await savePaises(d.paises);
  if (d.costoMinuto) await saveCostoMinuto(d.costoMinuto);
  if (d.margenDefault) await saveMargenDefault(d.margenDefault);
  if (d.cotizaciones) await storage.setItem(KEYS.COTIZACIONES, JSON.stringify(d.cotizaciones));
  if (d.consumos) await storage.setItem(KEYS.CONSUMOS, JSON.stringify(d.consumos));
}

// --- Cálculo (todo interno en USD) ---

export function calcularLinea(
  prenda: Prenda, tejido: Tejido, consumo: number, cantidad: number,
  costoMinutoUSD: number, tipoCambio: number,
  paisOrigen?: PaisOrigen, insumosSeleccionadosRaw?: Insumo[],
  comisionPct: number = 0, mermaPct: number = 0, logisticaPct: number = 0,
): LineaResultado {
  const costoTejidoUSD = consumo * tejido.precio;
  const tasa = paisOrigen && !paisOrigen.isLocal ? paisOrigen.tasa : 0;
  const costoImportacionUSD = costoTejidoUSD * (tasa / 100);
  const costoTejidoFinalUSD = costoTejidoUSD + costoImportacionUSD;
  const confeccionUSD = prenda.minutos * costoMinutoUSD;

  const insumosSeleccionados: InsumoSeleccionado[] = (insumosSeleccionadosRaw || []).map((ins) => ({
    insumo: ins,
    costoUSD: ins.moneda === 'USD' ? ins.precio : ins.precio / tipoCambio,
  }));
  const totalInsumosUSD = insumosSeleccionados.reduce((s, i) => s + i.costoUSD, 0);

  const costoUnitarioUSD = costoTejidoFinalUSD + confeccionUSD + totalInsumosUSD;
  // 1. Merma (sobre costo unitario)
  const costoMermaUSD = mermaPct > 0 ? costoUnitarioUSD * (mermaPct / 100) : 0;
  const costoPostMermaUSD = costoUnitarioUSD + costoMermaUSD;
  // 2. Logística (sobre post-merma)
  const costoLogisticaUSD = logisticaPct > 0 ? costoPostMermaUSD * (logisticaPct / 100) : 0;
  const costoRealUSD = costoPostMermaUSD + costoLogisticaUSD;
  // Comisión NO se suma al costo — va en el denominador del precio venta
  const subtotalUSD = costoRealUSD * cantidad;

  return {
    prenda, tejido, consumo, cantidad,
    costoTejidoUSD, costoImportacionUSD, costoTejidoFinalUSD,
    confeccionUSD, insumosSeleccionados, totalInsumosUSD,
    mermaPct, costoMermaUSD, costoPostMermaUSD,
    logisticaPct, costoLogisticaUSD, costoRealUSD, comisionPct,
    costoUnitarioUSD, subtotalUSD, paisOrigen,
  };
}

export function calcularCotizacion(
  lineas: LineaCotizacion[], prendas: Prenda[], tejidos: Tejido[],
  costoMinutoUSD: number, margen: number, tipoCambio: number,
  cliente?: string, paisOrigen?: PaisOrigen, insumosSeleccionados?: Insumo[],
  comisionPct: number = 0, mermaPct: number = 0, logisticaPct: number = 0,
): Cotizacion | null {
  const resultados: LineaResultado[] = [];
  for (const linea of lineas) {
    const prenda = prendas.find((p) => p.id === linea.prendaId);
    const tejido = tejidos.find((t) => t.id === linea.tejidoId);
    if (!prenda || !tejido) return null;
    resultados.push(calcularLinea(prenda, tejido, linea.consumo, linea.cantidad, costoMinutoUSD, tipoCambio, paisOrigen, insumosSeleccionados, comisionPct, mermaPct, logisticaPct));
  }
  const totalGeneralUSD = resultados.reduce((s, r) => s + r.subtotalUSD, 0);
  return {
    id: generateId(), fecha: new Date().toISOString(), cliente: cliente || undefined,
    lineas: resultados, costoMinutoUSD: costoMinutoUSD, totalGeneralUSD, margen, tipoCambio,
  };
}

export function precioSugerido(costo: number, margen: number, comision: number = 0): number {
  const denominador = 1 - margen / 100 - comision / 100;
  if (denominador <= 0) return Infinity;
  return costo / denominador;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function parseNumero(val: string): number {
  return parseFloat(val.replace(',', '.'));
}

export function formatFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
