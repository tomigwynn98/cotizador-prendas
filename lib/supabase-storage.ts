import { supabase, getUser } from './supabase';
import type { Prenda, Tejido, Insumo, PaisOrigen, Cotizacion } from './storage';

async function uid(): Promise<string> {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// --- Prendas ---
export async function getPrendas(): Promise<Prenda[]> {
  const userId = await uid();
  const { data } = await supabase.from('prendas').select('*').eq('user_id', userId);
  return (data || []).map((r: any) => ({ id: r.id, nombre: r.nombre, minutos: Number(r.minutos) }));
}

export async function savePrendas(prendas: Prenda[]): Promise<void> {
  const userId = await uid();
  await supabase.from('prendas').delete().eq('user_id', userId);
  if (prendas.length > 0) {
    await supabase.from('prendas').insert(prendas.map((p) => ({ id: p.id, user_id: userId, nombre: p.nombre, minutos: p.minutos })));
  }
}

// --- Tejidos ---
export async function getTejidos(): Promise<Tejido[]> {
  const userId = await uid();
  const { data } = await supabase.from('tejidos').select('*').eq('user_id', userId);
  return (data || []).map((r: any) => ({ id: r.id, nombre: r.nombre, tipo: r.tipo, precio: Number(r.precio_usd) }));
}

export async function saveTejidos(tejidos: Tejido[]): Promise<void> {
  const userId = await uid();
  await supabase.from('tejidos').delete().eq('user_id', userId);
  if (tejidos.length > 0) {
    await supabase.from('tejidos').insert(tejidos.map((t) => ({ id: t.id, user_id: userId, nombre: t.nombre, tipo: t.tipo, precio_usd: t.precio })));
  }
}

// --- Insumos ---
export async function getInsumos(): Promise<Insumo[]> {
  const userId = await uid();
  const { data } = await supabase.from('insumos').select('*').eq('user_id', userId);
  return (data || []).map((r: any) => ({ id: r.id, nombre: r.nombre, precio: Number(r.precio), moneda: r.moneda }));
}

export async function saveInsumos(insumos: Insumo[]): Promise<void> {
  const userId = await uid();
  await supabase.from('insumos').delete().eq('user_id', userId);
  if (insumos.length > 0) {
    await supabase.from('insumos').insert(insumos.map((i) => ({ id: i.id, user_id: userId, nombre: i.nombre, precio: i.precio, moneda: i.moneda })));
  }
}

// --- Paises ---
export async function getPaises(): Promise<PaisOrigen[]> {
  const userId = await uid();
  const { data } = await supabase.from('paises').select('*').eq('user_id', userId);
  return (data || []).map((r: any) => ({ id: r.id, nombre: r.nombre, tasa: Number(r.tasa), isLocal: r.is_local }));
}

export async function savePaises(paises: PaisOrigen[]): Promise<void> {
  const userId = await uid();
  await supabase.from('paises').delete().eq('user_id', userId);
  if (paises.length > 0) {
    await supabase.from('paises').insert(paises.map((p) => ({ id: p.id, user_id: userId, nombre: p.nombre, tasa: p.tasa, is_local: p.isLocal || false })));
  }
}

// --- Config ---
export async function getCostoMinuto(): Promise<number> {
  const userId = await uid();
  const { data } = await supabase.from('config').select('costo_minuto').eq('user_id', userId).single();
  return data ? Number(data.costo_minuto) : 0.02;
}

export async function saveCostoMinuto(v: number): Promise<void> {
  const userId = await uid();
  await supabase.from('config').upsert({ user_id: userId, costo_minuto: v }, { onConflict: 'user_id' });
}

export async function getMargenDefault(): Promise<number> {
  const userId = await uid();
  const { data } = await supabase.from('config').select('margen_default').eq('user_id', userId).single();
  return data ? Number(data.margen_default) : 40;
}

export async function saveMargenDefault(v: number): Promise<void> {
  const userId = await uid();
  await supabase.from('config').upsert({ user_id: userId, margen_default: v }, { onConflict: 'user_id' });
}

// --- Cotizaciones ---
export async function getCotizaciones(): Promise<Cotizacion[]> {
  const userId = await uid();
  const { data } = await supabase.from('cotizaciones').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  return (data || []).map((r: any) => r.data as Cotizacion);
}

export async function saveCotizacion(c: Cotizacion): Promise<void> {
  const userId = await uid();
  const { error } = await supabase.from('cotizaciones').insert({ user_id: userId, data: c });
  if (error) console.error('saveCotizacion error:', error);
}

export async function deleteCotizacion(id: string): Promise<void> {
  const userId = await uid();
  await supabase.from('cotizaciones').delete().eq('user_id', userId).filter('data->>id', 'eq', id);
}

// --- Consumos ---
export async function getConsumos(): Promise<Record<string, number>> {
  const userId = await uid();
  const { data } = await supabase.from('consumos').select('*').eq('user_id', userId);
  const result: Record<string, number> = {};
  (data || []).forEach((r: any) => { result[`${r.prenda_id}_${r.tejido_id}`] = Number(r.consumo); });
  return result;
}

export async function saveConsumo(pId: string, tId: string, c: number): Promise<void> {
  const userId = await uid();
  await supabase.from('consumos').upsert(
    { user_id: userId, prenda_id: pId, tejido_id: tId, consumo: c },
    { onConflict: 'user_id,prenda_id,tejido_id' },
  );
}

export async function getConsumo(pId: string, tId: string): Promise<number | null> {
  const userId = await uid();
  const { data } = await supabase.from('consumos').select('consumo')
    .eq('user_id', userId).eq('prenda_id', pId).eq('tejido_id', tId).single();
  return data ? Number(data.consumo) : null;
}

// --- Admin ---
export async function getAllProfiles() {
  const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  return data || [];
}

export async function getAllCotizaciones() {
  const { data } = await supabase.from('cotizaciones').select('*, profiles!cotizaciones_user_id_fkey(email)')
    .order('created_at', { ascending: false });
  return (data || []).map((r: any) => ({
    ...(r.data as Cotizacion),
    userEmail: r.profiles?.email || 'Desconocido',
    dbId: r.id,
  }));
}

// --- Seed defaults for new user ---
export async function seedDefaults(userIdParam?: string): Promise<void> {
  const userId = userIdParam || await uid();
  const short = userId.slice(0, 4);

  const { error: cfgErr } = await supabase.from('config').upsert({ user_id: userId, costo_minuto: 0.02, margen_default: 40 }, { onConflict: 'user_id' });
  if (cfgErr) console.error('seed config error:', cfgErr);

  // Prendas y tejidos: vacios por defecto — el usuario carga los suyos

  const insumos = [
    { id: `i_${short}_1`, user_id: userId, nombre: 'Hilos Recta', precio: 0.05, moneda: 'USD' },
    { id: `i_${short}_2`, user_id: userId, nombre: 'Hilos Texturizado', precio: 0.04, moneda: 'USD' },
    { id: `i_${short}_3`, user_id: userId, nombre: 'Poliamida', precio: 0.008, moneda: 'USD' },
    { id: `i_${short}_4`, user_id: userId, nombre: 'Ribbon', precio: 0.004, moneda: 'USD' },
    { id: `i_${short}_5`, user_id: userId, nombre: 'Gomas 6cm', precio: 0.13, moneda: 'USD' },
    { id: `i_${short}_6`, user_id: userId, nombre: 'Gomas 7mm', precio: 0.013, moneda: 'USD' },
    { id: `i_${short}_7`, user_id: userId, nombre: 'RFID', precio: 0.05, moneda: 'USD' },
    { id: `i_${short}_8`, user_id: userId, nombre: 'Transfer', precio: 0.04, moneda: 'USD' },
    { id: `i_${short}_9`, user_id: userId, nombre: 'Etiquetas Bordadas', precio: 0.05, moneda: 'USD' },
  ];
  const { error: insErr } = await supabase.from('insumos').insert(insumos);
  if (insErr) console.error('seed insumos error:', insErr);

  const paises = [
    { id: `ps_${short}_local`, user_id: userId, nombre: 'Local', tasa: 0, is_local: true },
    { id: `ps_${short}_brasil`, user_id: userId, nombre: 'Brasil', tasa: 5, is_local: false },
    { id: `ps_${short}_china`, user_id: userId, nombre: 'China', tasa: 15, is_local: false },
  ];
  const { error: paisErr } = await supabase.from('paises').insert(paises);
  if (paisErr) console.error('seed paises error:', paisErr);
}
