import AsyncStorage from '@react-native-async-storage/async-storage';

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
  confeccion: number;
  insumos: number;
  costoUnitario: number;
  subtotal: number;
}

export interface Cotizacion {
  id: string;
  fecha: string; // ISO string
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

// --- Storage helpers ---

async function getOrDefault<T>(key: string, defaultValue: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) {
    await AsyncStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  return JSON.parse(raw);
}

// --- Prendas ---

export async function getPrendas(): Promise<Prenda[]> {
  return getOrDefault(KEYS.PRENDAS, DEFAULT_PRENDAS);
}

export async function savePrendas(prendas: Prenda[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.PRENDAS, JSON.stringify(prendas));
}

// --- Tejidos ---

export async function getTejidos(): Promise<Tejido[]> {
  return getOrDefault(KEYS.TEJIDOS, DEFAULT_TEJIDOS);
}

export async function saveTejidos(tejidos: Tejido[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.TEJIDOS, JSON.stringify(tejidos));
}

// --- Costo minuto ---

export async function getCostoMinuto(): Promise<number> {
  return getOrDefault(KEYS.COSTO_MINUTO, DEFAULT_COSTO_MINUTO);
}

export async function saveCostoMinuto(valor: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.COSTO_MINUTO, JSON.stringify(valor));
}

// --- Cotizaciones (historial) ---

export async function getCotizaciones(): Promise<Cotizacion[]> {
  return getOrDefault(KEYS.COTIZACIONES, []);
}

export async function saveCotizacion(cotizacion: Cotizacion): Promise<void> {
  const lista = await getCotizaciones();
  lista.unshift(cotizacion); // más reciente primero
  await AsyncStorage.setItem(KEYS.COTIZACIONES, JSON.stringify(lista));
}

export async function deleteCotizacion(id: string): Promise<void> {
  const lista = await getCotizaciones();
  const updated = lista.filter((c) => c.id !== id);
  await AsyncStorage.setItem(KEYS.COTIZACIONES, JSON.stringify(updated));
}

// Cotización actual (para pasar entre Cotizar → Resultado sin URL params)
export async function setCotizacionActual(cotizacion: Cotizacion): Promise<void> {
  await AsyncStorage.setItem(KEYS.COTIZACION_ACTUAL, JSON.stringify(cotizacion));
}

export async function getCotizacionActual(): Promise<Cotizacion | null> {
  const raw = await AsyncStorage.getItem(KEYS.COTIZACION_ACTUAL);
  return raw ? JSON.parse(raw) : null;
}

// --- Cálculo ---

export function calcularLinea(
  prenda: Prenda,
  tejido: Tejido,
  consumo: number,
  cantidad: number,
  costoMinuto: number,
): LineaResultado {
  const costoTejido = consumo * tejido.precio;
  const confeccion = prenda.minutos * costoMinuto;
  const insumos = prenda.insumos;
  const costoUnitario = costoTejido + confeccion + insumos;
  const subtotal = costoUnitario * cantidad;

  return {
    prenda,
    tejido,
    consumo,
    cantidad,
    costoTejido,
    confeccion,
    insumos,
    costoUnitario,
    subtotal,
  };
}

export function calcularCotizacion(
  lineas: LineaCotizacion[],
  prendas: Prenda[],
  tejidos: Tejido[],
  costoMinuto: number,
  margen: number,
): Cotizacion | null {
  const resultados: LineaResultado[] = [];

  for (const linea of lineas) {
    const prenda = prendas.find((p) => p.id === linea.prendaId);
    const tejido = tejidos.find((t) => t.id === linea.tejidoId);
    if (!prenda || !tejido) return null;
    resultados.push(calcularLinea(prenda, tejido, linea.consumo, linea.cantidad, costoMinuto));
  }

  const totalGeneral = resultados.reduce((sum, r) => sum + r.subtotal, 0);
  const precioSugeridoTotal = margen >= 100 ? Infinity : totalGeneral / (1 - margen / 100);

  return {
    id: generateId(),
    fecha: new Date().toISOString(),
    lineas: resultados,
    costoMinuto,
    totalGeneral,
    margen,
    precioSugeridoTotal,
  };
}

export function precioSugerido(costoUnitario: number, margen: number): number {
  if (margen >= 100) return Infinity;
  return costoUnitario / (1 - margen / 100);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// --- Formateo ---

export function formatARS(n: number): string {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
