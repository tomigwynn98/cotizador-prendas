import { Platform } from 'react-native';

// --- Storage abstraction ---

const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn('storage.getItem error:', e);
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return;
      }
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn('storage.setItem error:', e);
    }
  },
};

// --- Types ---

export type TipoTejido = 'punto' | 'plano';

export interface Prenda {
  id: string;
  nombre: string;
  minutos: number;
  insumos: number;
}

export interface Tejido {
  id: string;
  nombre: string;
  tipo: TipoTejido;
  precio: number;
}

export interface PaisOrigen {
  id: string;
  nombre: string;
  tasa: number; // porcentaje de importación
  isLocal?: boolean; // true solo para "Local", no se puede eliminar/editar tasa
}

export interface LineaCotizacion {
  prendaId: string;
  tejidoId: string;
  consumo: number;
  cantidad: number;
}

export interface LineaResultado {
  prenda: Prenda;
  tejido: Tejido;
  consumo: number;
  cantidad: number;
  costoTejido: number;
  costoImportacion: number;
  costoTejidoFinal: number;
  confeccion: number;
  insumos: number;
  costoUnitario: number;
  subtotal: number;
  paisOrigen?: PaisOrigen;
  insumosActivos: boolean;
}

export interface Cotizacion {
  id: string;
  fecha: string;
  cliente?: string;
  lineas: LineaResultado[];
  costoMinuto: number;
  totalGeneral: number;
  margen: number;
  precioSugeridoTotal: number;
}

// --- Keys ---

const KEYS = {
  PRENDAS: 'prendas',
  TEJIDOS: 'tejidos',
  COSTO_MINUTO: 'costoMinuto',
  COTIZACIONES: 'cotizaciones',
  COTIZACION_ACTUAL: 'cotizacionActual',
  CONSUMOS: 'consumos',
  MARGEN_DEFAULT: 'margenDefault',
  PAISES: 'paises',
};

// --- Defaults ---

const DEFAULT_COSTO_MINUTO = 15;

const DEFAULT_PRENDAS: Prenda[] = [
  { id: '1', nombre: 'Remera', minutos: 12, insumos: 150 },
  { id: '2', nombre: 'Pantalón', minutos: 25, insumos: 300 },
  { id: '3', nombre: 'Buzo', minutos: 20, insumos: 250 },
  { id: '4', nombre: 'Campera', minutos: 35, insumos: 500 },
];

const DEFAULT_TEJIDOS: Tejido[] = [
  { id: '1', nombre: 'Jersey', tipo: 'punto', precio: 5500 },
  { id: '2', nombre: 'Interlock', tipo: 'punto', precio: 6200 },
  { id: '3', nombre: 'Frisa', tipo: 'punto', precio: 7000 },
  { id: '4', nombre: 'Gabardina', tipo: 'plano', precio: 4500 },
];

const DEFAULT_PAISES: PaisOrigen[] = [
  { id: 'local', nombre: 'Local', tasa: 0, isLocal: true },
  { id: 'brasil', nombre: 'Brasil', tasa: 5 },
  { id: 'china', nombre: 'China', tasa: 15 },
];

// --- Storage helpers ---

async function getOrDefault<T>(key: string, defaultValue: T): Promise<T> {
  const raw = await storage.getItem(key);
  if (raw === null) {
    await storage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  return JSON.parse(raw);
}

// --- Prendas ---
export async function getPrendas(): Promise<Prenda[]> { return getOrDefault(KEYS.PRENDAS, DEFAULT_PRENDAS); }
export async function savePrendas(prendas: Prenda[]): Promise<void> { await storage.setItem(KEYS.PRENDAS, JSON.stringify(prendas)); }

// --- Tejidos ---
export async function getTejidos(): Promise<Tejido[]> { return getOrDefault(KEYS.TEJIDOS, DEFAULT_TEJIDOS); }
export async function saveTejidos(tejidos: Tejido[]): Promise<void> { await storage.setItem(KEYS.TEJIDOS, JSON.stringify(tejidos)); }

// --- Paises ---
export async function getPaises(): Promise<PaisOrigen[]> { return getOrDefault(KEYS.PAISES, DEFAULT_PAISES); }
export async function savePaises(paises: PaisOrigen[]): Promise<void> { await storage.setItem(KEYS.PAISES, JSON.stringify(paises)); }

// --- Costo minuto ---
export async function getCostoMinuto(): Promise<number> { return getOrDefault(KEYS.COSTO_MINUTO, DEFAULT_COSTO_MINUTO); }
export async function saveCostoMinuto(valor: number): Promise<void> { await storage.setItem(KEYS.COSTO_MINUTO, JSON.stringify(valor)); }

// --- Margen default ---
export async function getMargenDefault(): Promise<number> { return getOrDefault(KEYS.MARGEN_DEFAULT, 40); }
export async function saveMargenDefault(margen: number): Promise<void> { await storage.setItem(KEYS.MARGEN_DEFAULT, JSON.stringify(margen)); }

// --- Cotizaciones ---
export async function getCotizaciones(): Promise<Cotizacion[]> { return getOrDefault(KEYS.COTIZACIONES, []); }
export async function saveCotizacion(cotizacion: Cotizacion): Promise<void> {
  const lista = await getCotizaciones();
  lista.unshift(cotizacion);
  await storage.setItem(KEYS.COTIZACIONES, JSON.stringify(lista));
}
export async function deleteCotizacion(id: string): Promise<void> {
  const lista = await getCotizaciones();
  await storage.setItem(KEYS.COTIZACIONES, JSON.stringify(lista.filter((c) => c.id !== id)));
}

// --- Consumos memorizados ---
export async function getConsumos(): Promise<Record<string, number>> { return getOrDefault(KEYS.CONSUMOS, {}); }
export async function saveConsumo(prendaId: string, tejidoId: string, consumo: number): Promise<void> {
  const consumos = await getConsumos();
  consumos[`${prendaId}_${tejidoId}`] = consumo;
  await storage.setItem(KEYS.CONSUMOS, JSON.stringify(consumos));
}
export async function getConsumo(prendaId: string, tejidoId: string): Promise<number | null> {
  const consumos = await getConsumos();
  return consumos[`${prendaId}_${tejidoId}`] ?? null;
}

// --- Cotización actual ---
export async function setCotizacionActual(cotizacion: Cotizacion): Promise<void> {
  await storage.setItem(KEYS.COTIZACION_ACTUAL, JSON.stringify(cotizacion));
}
export async function getCotizacionActual(): Promise<Cotizacion | null> {
  const raw = await storage.getItem(KEYS.COTIZACION_ACTUAL);
  return raw ? JSON.parse(raw) : null;
}

// --- Backup ---
export async function exportarDatos(): Promise<string> {
  const [prendas, tejidos, paises, cm, md, cotizaciones, consumos] = await Promise.all([
    getPrendas(), getTejidos(), getPaises(), getCostoMinuto(), getMargenDefault(), getCotizaciones(), getConsumos(),
  ]);
  return JSON.stringify({ prendas, tejidos, paises, costoMinuto: cm, margenDefault: md, cotizaciones, consumos, exportDate: new Date().toISOString() }, null, 2);
}
export async function importarDatos(json: string): Promise<void> {
  const data = JSON.parse(json);
  if (data.prendas) await savePrendas(data.prendas);
  if (data.tejidos) await saveTejidos(data.tejidos);
  if (data.paises) await savePaises(data.paises);
  if (data.costoMinuto) await saveCostoMinuto(data.costoMinuto);
  if (data.margenDefault) await saveMargenDefault(data.margenDefault);
  if (data.cotizaciones) await storage.setItem(KEYS.COTIZACIONES, JSON.stringify(data.cotizaciones));
  if (data.consumos) await storage.setItem(KEYS.CONSUMOS, JSON.stringify(data.consumos));
}

// --- Cálculo ---

export function calcularLinea(
  prenda: Prenda,
  tejido: Tejido,
  consumo: number,
  cantidad: number,
  costoMinuto: number,
  paisOrigen?: PaisOrigen,
  insumosActivos: boolean = true,
): LineaResultado {
  const costoTejido = consumo * tejido.precio;
  const tasa = paisOrigen && !paisOrigen.isLocal ? paisOrigen.tasa : 0;
  const costoImportacion = costoTejido * (tasa / 100);
  const costoTejidoFinal = costoTejido + costoImportacion;
  const confeccion = prenda.minutos * costoMinuto;
  const insumos = insumosActivos ? prenda.insumos : 0;
  const costoUnitario = costoTejidoFinal + confeccion + insumos;
  const subtotal = costoUnitario * cantidad;

  return {
    prenda, tejido, consumo, cantidad,
    costoTejido, costoImportacion, costoTejidoFinal,
    confeccion, insumos, costoUnitario, subtotal,
    paisOrigen, insumosActivos,
  };
}

export function calcularCotizacion(
  lineas: LineaCotizacion[],
  prendas: Prenda[],
  tejidos: Tejido[],
  costoMinuto: number,
  margen: number,
  cliente?: string,
  paisOrigen?: PaisOrigen,
  insumosActivos: boolean = true,
): Cotizacion | null {
  const resultados: LineaResultado[] = [];
  for (const linea of lineas) {
    const prenda = prendas.find((p) => p.id === linea.prendaId);
    const tejido = tejidos.find((t) => t.id === linea.tejidoId);
    if (!prenda || !tejido) return null;
    resultados.push(calcularLinea(prenda, tejido, linea.consumo, linea.cantidad, costoMinuto, paisOrigen, insumosActivos));
  }
  const totalGeneral = resultados.reduce((sum, r) => sum + r.subtotal, 0);
  const precioSugeridoTotal = margen >= 100 ? Infinity : totalGeneral / (1 - margen / 100);
  return {
    id: generateId(), fecha: new Date().toISOString(), cliente: cliente || undefined,
    lineas: resultados, costoMinuto, totalGeneral, margen, precioSugeridoTotal,
  };
}

export function precioSugerido(costoUnitario: number, margen: number): number {
  if (margen >= 100) return Infinity;
  return costoUnitario / (1 - margen / 100);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// --- Input helpers ---
export function parseNumero(val: string): number {
  return parseFloat(val.replace(',', '.'));
}

// --- Formateo ---
export function formatARS(n: number): string {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function formatFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
