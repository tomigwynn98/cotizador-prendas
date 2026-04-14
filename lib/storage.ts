import { Platform } from 'react-native';
import type { Moneda } from './currency';

// --- Local storage abstraction (cache + offline fallback) ---

const local = {
  get(key: string): string | null {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') return localStorage.getItem(key);
    } catch {}
    return null;
  },
  set(key: string, value: string): void {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch {}
  },
};

// --- Auth-aware storage: delegates to Supabase or falls back to local ---

let _supaStorage: typeof import('./supabase-storage') | null = null;

async function supa() {
  if (!_supaStorage) _supaStorage = await import('./supabase-storage');
  return _supaStorage;
}

async function isAuthenticated(): Promise<boolean> {
  try {
    const { getUser } = await import('./supabase');
    const user = await getUser();
    return !!user;
  } catch { return false; }
}

// --- Types ---

export type TipoTejido = 'punto' | 'plano';

export interface Prenda { id: string; nombre: string; minutos: number; insumos?: number; }
export interface Tejido { id: string; nombre: string; tipo: TipoTejido; precio: number; }
export interface Insumo { id: string; nombre: string; precio: number; moneda: Moneda; }
export interface PaisOrigen { id: string; nombre: string; tasa: number; isLocal?: boolean; }
export interface InsumoSeleccionado { insumo: Insumo; costoUSD: number; }
export interface LineaCotizacion { prendaId: string; tejidoId: string; consumo: number; cantidad: number; }

export interface LineaResultado {
  prenda: Prenda; tejido: Tejido; consumo: number; cantidad: number;
  costoTejidoUSD: number; costoImportacionUSD: number; costoTejidoFinalUSD: number;
  confeccionUSD: number; insumosSeleccionados: InsumoSeleccionado[]; totalInsumosUSD: number;
  costoUnitarioUSD: number;
  comisionPct: number; mermaPct: number; costoMermaUSD: number; costoPostMermaUSD: number;
  logisticaPct: number; costoLogisticaUSD: number; costoRealUSD: number;
  subtotalUSD: number; paisOrigen?: PaisOrigen;
}

export interface Cotizacion {
  id: string; fecha: string; cliente?: string; lineas: LineaResultado[];
  costoMinutoUSD: number; totalGeneralUSD: number; margen: number; tipoCambio: number;
}

// --- Keys for local cache ---
const K = {
  PRENDAS: 'prendas_v3', TEJIDOS: 'tejidos_v3', INSUMOS: 'insumos_v3', PAISES: 'paises_v3',
  COSTO_MINUTO: 'costoMinutoUSD_v3', MARGEN: 'margenDefault_v3',
  COTIZACIONES: 'cotizaciones_v3', COTIZACION_ACTUAL: 'cotActual_v3', CONSUMOS: 'consumos_v3',
};

// --- Defaults ---
const DEF_CM = 0.02;
const DEF_PRENDAS: Prenda[] = [
  { id: '1', nombre: 'Remera', minutos: 12 }, { id: '2', nombre: 'Pantalón', minutos: 25 },
  { id: '3', nombre: 'Buzo', minutos: 20 }, { id: '4', nombre: 'Campera', minutos: 35 },
];
const DEF_TEJIDOS: Tejido[] = [
  { id: '1', nombre: 'Jersey', tipo: 'punto', precio: 0.70 }, { id: '2', nombre: 'Interlock', tipo: 'punto', precio: 0.80 },
  { id: '3', nombre: 'Frisa', tipo: 'punto', precio: 0.90 }, { id: '4', nombre: 'Gabardina', tipo: 'plano', precio: 0.58 },
];
const DEF_INSUMOS: Insumo[] = [
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
const DEF_PAISES: PaisOrigen[] = [
  { id: 'local', nombre: 'Local', tasa: 0, isLocal: true },
  { id: 'brasil', nombre: 'Brasil', tasa: 5 }, { id: 'china', nombre: 'China', tasa: 15 },
];

// --- Local helpers ---
function localGet<T>(key: string, def: T): T {
  const raw = local.get(key);
  if (!raw) { local.set(key, JSON.stringify(def)); return def; }
  try { return JSON.parse(raw); } catch { return def; }
}

// --- CRUD (auth-aware: Supabase if logged in, else local) ---

export async function getPrendas(): Promise<Prenda[]> {
  if (await isAuthenticated()) { try { const s = await supa(); const d = await s.getPrendas(); local.set(K.PRENDAS, JSON.stringify(d)); return d; } catch {} }
  return localGet(K.PRENDAS, DEF_PRENDAS);
}
export async function savePrendas(v: Prenda[]): Promise<void> {
  local.set(K.PRENDAS, JSON.stringify(v));
  if (await isAuthenticated()) { try { const s = await supa(); await s.savePrendas(v); } catch {} }
}

export async function getTejidos(): Promise<Tejido[]> {
  if (await isAuthenticated()) { try { const s = await supa(); const d = await s.getTejidos(); local.set(K.TEJIDOS, JSON.stringify(d)); return d; } catch {} }
  return localGet(K.TEJIDOS, DEF_TEJIDOS);
}
export async function saveTejidos(v: Tejido[]): Promise<void> {
  local.set(K.TEJIDOS, JSON.stringify(v));
  if (await isAuthenticated()) { try { const s = await supa(); await s.saveTejidos(v); } catch {} }
}

export async function getInsumos(): Promise<Insumo[]> {
  if (await isAuthenticated()) { try { const s = await supa(); const d = await s.getInsumos(); local.set(K.INSUMOS, JSON.stringify(d)); return d; } catch {} }
  return localGet(K.INSUMOS, DEF_INSUMOS);
}
export async function saveInsumos(v: Insumo[]): Promise<void> {
  local.set(K.INSUMOS, JSON.stringify(v));
  if (await isAuthenticated()) { try { const s = await supa(); await s.saveInsumos(v); } catch {} }
}

export async function getPaises(): Promise<PaisOrigen[]> {
  if (await isAuthenticated()) { try { const s = await supa(); const d = await s.getPaises(); local.set(K.PAISES, JSON.stringify(d)); return d; } catch {} }
  return localGet(K.PAISES, DEF_PAISES);
}
export async function savePaises(v: PaisOrigen[]): Promise<void> {
  local.set(K.PAISES, JSON.stringify(v));
  if (await isAuthenticated()) { try { const s = await supa(); await s.savePaises(v); } catch {} }
}

export async function getCostoMinuto(): Promise<number> {
  if (await isAuthenticated()) { try { const s = await supa(); const d = await s.getCostoMinuto(); local.set(K.COSTO_MINUTO, JSON.stringify(d)); return d; } catch {} }
  return localGet(K.COSTO_MINUTO, DEF_CM);
}
export async function saveCostoMinuto(v: number): Promise<void> {
  local.set(K.COSTO_MINUTO, JSON.stringify(v));
  if (await isAuthenticated()) { try { const s = await supa(); await s.saveCostoMinuto(v); } catch {} }
}

export async function getMargenDefault(): Promise<number> {
  if (await isAuthenticated()) { try { const s = await supa(); const d = await s.getMargenDefault(); local.set(K.MARGEN, JSON.stringify(d)); return d; } catch {} }
  return localGet(K.MARGEN, 40);
}
export async function saveMargenDefault(v: number): Promise<void> {
  local.set(K.MARGEN, JSON.stringify(v));
  if (await isAuthenticated()) { try { const s = await supa(); await s.saveMargenDefault(v); } catch {} }
}

export async function getCotizaciones(): Promise<Cotizacion[]> {
  if (await isAuthenticated()) { try { const s = await supa(); const d = await s.getCotizaciones(); local.set(K.COTIZACIONES, JSON.stringify(d)); return d; } catch {} }
  return localGet(K.COTIZACIONES, []);
}
export async function saveCotizacion(c: Cotizacion): Promise<void> {
  const list = localGet<Cotizacion[]>(K.COTIZACIONES, []); list.unshift(c); local.set(K.COTIZACIONES, JSON.stringify(list));
  if (await isAuthenticated()) { try { const s = await supa(); await s.saveCotizacion(c); } catch {} }
}
export async function deleteCotizacion(id: string): Promise<void> {
  const list = localGet<Cotizacion[]>(K.COTIZACIONES, []); local.set(K.COTIZACIONES, JSON.stringify(list.filter((c) => c.id !== id)));
  if (await isAuthenticated()) { try { const s = await supa(); await s.deleteCotizacion(id); } catch {} }
}

export async function getConsumos(): Promise<Record<string, number>> {
  if (await isAuthenticated()) { try { const s = await supa(); const d = await s.getConsumos(); local.set(K.CONSUMOS, JSON.stringify(d)); return d; } catch {} }
  return localGet(K.CONSUMOS, {});
}
export async function saveConsumo(pId: string, tId: string, c: number): Promise<void> {
  const cs = localGet<Record<string, number>>(K.CONSUMOS, {}); cs[`${pId}_${tId}`] = c; local.set(K.CONSUMOS, JSON.stringify(cs));
  if (await isAuthenticated()) { try { const s = await supa(); await s.saveConsumo(pId, tId, c); } catch {} }
}
export async function getConsumo(pId: string, tId: string): Promise<number | null> {
  if (await isAuthenticated()) { try { const s = await supa(); return await s.getConsumo(pId, tId); } catch {} }
  const cs = localGet<Record<string, number>>(K.CONSUMOS, {}); return cs[`${pId}_${tId}`] ?? null;
}

// --- Cotización actual (siempre local, es estado temporal) ---
export async function setCotizacionActual(c: Cotizacion): Promise<void> { local.set(K.COTIZACION_ACTUAL, JSON.stringify(c)); }
export async function getCotizacionActual(): Promise<Cotizacion | null> {
  const raw = local.get(K.COTIZACION_ACTUAL); return raw ? JSON.parse(raw) : null;
}

// --- Backup ---
export async function exportarDatos(): Promise<string> {
  const [prendas, tejidos, insumos, paises, cm, md, cots, consumos] = await Promise.all([
    getPrendas(), getTejidos(), getInsumos(), getPaises(), getCostoMinuto(), getMargenDefault(), getCotizaciones(), getConsumos(),
  ]);
  return JSON.stringify({ prendas, tejidos, insumos, paises, costoMinuto: cm, margenDefault: md, cotizaciones: cots, consumos, exportDate: new Date().toISOString() }, null, 2);
}
export async function importarDatos(json: string): Promise<void> {
  const d = JSON.parse(json);
  if (d.prendas) await savePrendas(d.prendas);
  if (d.tejidos) await saveTejidos(d.tejidos);
  if (d.insumos) await saveInsumos(d.insumos);
  if (d.paises) await savePaises(d.paises);
  if (d.costoMinuto) await saveCostoMinuto(d.costoMinuto);
  if (d.margenDefault) await saveMargenDefault(d.margenDefault);
}

// --- Cálculo (funciones puras, sin cambios) ---

export function calcularLinea(
  prenda: Prenda, tejido: Tejido, consumo: number, cantidad: number,
  costoMinutoUSD: number, tipoCambio: number,
  paisOrigen?: PaisOrigen, insumosRaw?: Insumo[],
  comisionPct: number = 0, mermaPct: number = 0, logisticaPct: number = 0,
): LineaResultado {
  const costoTejidoUSD = consumo * tejido.precio;
  const tasa = paisOrigen && !paisOrigen.isLocal ? paisOrigen.tasa : 0;
  const costoImportacionUSD = costoTejidoUSD * (tasa / 100);
  const costoTejidoFinalUSD = costoTejidoUSD + costoImportacionUSD;
  const confeccionUSD = prenda.minutos * costoMinutoUSD;
  const insumosSeleccionados: InsumoSeleccionado[] = (insumosRaw || []).map((ins) => ({
    insumo: ins, costoUSD: ins.moneda === 'USD' ? ins.precio : ins.precio / tipoCambio,
  }));
  const totalInsumosUSD = insumosSeleccionados.reduce((s, i) => s + i.costoUSD, 0);
  const costoUnitarioUSD = costoTejidoFinalUSD + confeccionUSD + totalInsumosUSD;
  const costoMermaUSD = mermaPct > 0 ? costoUnitarioUSD * (mermaPct / 100) : 0;
  const costoPostMermaUSD = costoUnitarioUSD + costoMermaUSD;
  const costoLogisticaUSD = logisticaPct > 0 ? costoPostMermaUSD * (logisticaPct / 100) : 0;
  const costoRealUSD = costoPostMermaUSD + costoLogisticaUSD;
  const subtotalUSD = costoRealUSD * cantidad;
  return {
    prenda, tejido, consumo, cantidad,
    costoTejidoUSD, costoImportacionUSD, costoTejidoFinalUSD, confeccionUSD,
    insumosSeleccionados, totalInsumosUSD, costoUnitarioUSD,
    comisionPct, mermaPct, costoMermaUSD, costoPostMermaUSD,
    logisticaPct, costoLogisticaUSD, costoRealUSD, subtotalUSD, paisOrigen,
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
    lineas: resultados, costoMinutoUSD, totalGeneralUSD, margen, tipoCambio,
  };
}

export function precioSugerido(costo: number, margen: number, comision: number = 0): number {
  const d = 1 - margen / 100 - comision / 100;
  if (d <= 0) return Infinity;
  return costo / d;
}

export function generateId(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
export function parseNumero(val: string): number { return parseFloat(val.replace(',', '.')); }
export function formatFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
