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
  await supabase.from('cotizaciones').insert({ user_id: userId, data: c });
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
export async function seedDefaults(): Promise<void> {
  const userId = await uid();

  await supabase.from('config').upsert({ user_id: userId, costo_minuto: 0.02, margen_default: 40 }, { onConflict: 'user_id' });

  const prendas = [
    { id: `p_${userId.slice(0, 4)}_1`, user_id: userId, nombre: 'Remera', minutos: 12 },
    { id: `p_${userId.slice(0, 4)}_2`, user_id: userId, nombre: 'Pantalón', minutos: 25 },
    { id: `p_${userId.slice(0, 4)}_3`, user_id: userId, nombre: 'Buzo', minutos: 20 },
    { id: `p_${userId.slice(0, 4)}_4`, user_id: userId, nombre: 'Campera', minutos: 35 },
  ];
  await supabase.from('prendas').insert(prendas);

  const tejidos = [
    { id: `t_${userId.slice(0, 4)}_1`, user_id: userId, nombre: 'Jersey', tipo: 'punto', precio_usd: 0.70 },
    { id: `t_${userId.slice(0, 4)}_2`, user_id: userId, nombre: 'Interlock', tipo: 'punto', precio_usd: 0.80 },
    { id: `t_${userId.slice(0, 4)}_3`, user_id: userId, nombre: 'Frisa', tipo: 'punto', precio_usd: 0.90 },
    { id: `t_${userId.slice(0, 4)}_4`, user_id: userId, nombre: 'Gabardina', tipo: 'plano', precio_usd: 0.58 },
  ];
  await supabase.from('tejidos').insert(tejidos);

  const insumos = [
    { id: `i_${userId.slice(0, 4)}_1`, user_id: userId, nombre: 'Hilos recta (2000 yrd)', precio: 6778, moneda: 'GS' },
    { id: `i_${userId.slice(0, 4)}_2`, user_id: userId, nombre: 'Hilos text (100 Gr)', precio: 11896, moneda: 'GS' },
    { id: `i_${userId.slice(0, 4)}_3`, user_id: userId, nombre: 'Poliamida (200 mts.)', precio: 77000, moneda: 'GS' },
    { id: `i_${userId.slice(0, 4)}_4`, user_id: userId, nombre: 'Ribbon (450 mts.)', precio: 65000, moneda: 'GS' },
    { id: `i_${userId.slice(0, 4)}_5`, user_id: userId, nombre: 'Gomas 6 cm (25 mts.)', precio: 20250, moneda: 'GS' },
    { id: `i_${userId.slice(0, 4)}_6`, user_id: userId, nombre: 'Gomas 7 mm (100 mts.)', precio: 22000, moneda: 'GS' },
    { id: `i_${userId.slice(0, 4)}_7`, user_id: userId, nombre: 'Rfid', precio: 0.0516, moneda: 'USD' },
    { id: `i_${userId.slice(0, 4)}_8`, user_id: userId, nombre: 'Transfer', precio: 284, moneda: 'GS' },
    { id: `i_${userId.slice(0, 4)}_9`, user_id: userId, nombre: 'Etiquetas bordadas', precio: 300, moneda: 'GS' },
  ];
  await supabase.from('insumos').insert(insumos);

  const paises = [
    { id: `ps_${userId.slice(0, 4)}_local`, user_id: userId, nombre: 'Local', tasa: 0, is_local: true },
    { id: `ps_${userId.slice(0, 4)}_brasil`, user_id: userId, nombre: 'Brasil', tasa: 5, is_local: false },
    { id: `ps_${userId.slice(0, 4)}_china`, user_id: userId, nombre: 'China', tasa: 15, is_local: false },
  ];
  await supabase.from('paises').insert(paises);
}
