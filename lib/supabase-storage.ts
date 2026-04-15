import { supabase, getUser } from './supabase';
import type { Prenda, Tejido, Insumo, PaisOrigen, Cotizacion } from './storage';

async function uid(): Promise<string> {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

/** Devuelve el team_id del usuario actual, o null si no esta en un equipo */
async function getTeamId(): Promise<string | null> {
  try {
    const user = await getUser();
    if (!user) return null;
    const { data } = await supabase.from('profiles').select('team_id').eq('id', user.id).single();
    return (data?.team_id as string) || null;
  } catch { return null; }
}

/** Helper para construir filtro: team_id si hay equipo, user_id sino */
async function scopeFilter() {
  const teamId = await getTeamId();
  const userId = await uid();
  return { teamId, userId };
}

// --- Prendas ---
export async function getPrendas(): Promise<Prenda[]> {
  const { teamId, userId } = await scopeFilter();
  const q = teamId
    ? supabase.from('prendas').select('*').or(`team_id.eq.${teamId},and(user_id.eq.${userId},team_id.is.null)`)
    : supabase.from('prendas').select('*').eq('user_id', userId).is('team_id', null);
  const { data } = await q;
  return (data || []).map((r: any) => ({ id: r.id, nombre: r.nombre, minutos: Number(r.minutos) }));
}

export async function savePrendas(prendas: Prenda[]): Promise<void> {
  const { teamId, userId } = await scopeFilter();
  if (teamId) {
    await supabase.from('prendas').delete().eq('team_id', teamId);
  } else {
    await supabase.from('prendas').delete().eq('user_id', userId).is('team_id', null);
  }
  if (prendas.length > 0) {
    await supabase.from('prendas').insert(prendas.map((p) => ({
      id: p.id, user_id: userId, team_id: teamId, nombre: p.nombre, minutos: p.minutos,
    })));
  }
}

// --- Tejidos ---
export async function getTejidos(): Promise<Tejido[]> {
  const { teamId, userId } = await scopeFilter();
  const q = teamId
    ? supabase.from('tejidos').select('*').or(`team_id.eq.${teamId},and(user_id.eq.${userId},team_id.is.null)`)
    : supabase.from('tejidos').select('*').eq('user_id', userId).is('team_id', null);
  const { data } = await q;
  return (data || []).map((r: any) => ({ id: r.id, nombre: r.nombre, tipo: r.tipo, precio: Number(r.precio_usd) }));
}

export async function saveTejidos(tejidos: Tejido[]): Promise<void> {
  const { teamId, userId } = await scopeFilter();
  if (teamId) await supabase.from('tejidos').delete().eq('team_id', teamId);
  else await supabase.from('tejidos').delete().eq('user_id', userId).is('team_id', null);
  if (tejidos.length > 0) {
    await supabase.from('tejidos').insert(tejidos.map((t) => ({
      id: t.id, user_id: userId, team_id: teamId, nombre: t.nombre, tipo: t.tipo, precio_usd: t.precio,
    })));
  }
}

// --- Insumos ---
export async function getInsumos(): Promise<Insumo[]> {
  const { teamId, userId } = await scopeFilter();
  const q = teamId
    ? supabase.from('insumos').select('*').or(`team_id.eq.${teamId},and(user_id.eq.${userId},team_id.is.null)`)
    : supabase.from('insumos').select('*').eq('user_id', userId).is('team_id', null);
  const { data } = await q;
  return (data || []).map((r: any) => ({ id: r.id, nombre: r.nombre, precio: Number(r.precio), moneda: r.moneda }));
}

export async function saveInsumos(insumos: Insumo[]): Promise<void> {
  const { teamId, userId } = await scopeFilter();
  if (teamId) await supabase.from('insumos').delete().eq('team_id', teamId);
  else await supabase.from('insumos').delete().eq('user_id', userId).is('team_id', null);
  if (insumos.length > 0) {
    await supabase.from('insumos').insert(insumos.map((i) => ({
      id: i.id, user_id: userId, team_id: teamId, nombre: i.nombre, precio: i.precio, moneda: i.moneda,
    })));
  }
}

// --- Paises ---
export async function getPaises(): Promise<PaisOrigen[]> {
  const { teamId, userId } = await scopeFilter();
  const q = teamId
    ? supabase.from('paises').select('*').or(`team_id.eq.${teamId},and(user_id.eq.${userId},team_id.is.null)`)
    : supabase.from('paises').select('*').eq('user_id', userId).is('team_id', null);
  const { data } = await q;
  return (data || []).map((r: any) => ({ id: r.id, nombre: r.nombre, tasa: Number(r.tasa), isLocal: r.is_local }));
}

export async function savePaises(paises: PaisOrigen[]): Promise<void> {
  const { teamId, userId } = await scopeFilter();
  if (teamId) await supabase.from('paises').delete().eq('team_id', teamId);
  else await supabase.from('paises').delete().eq('user_id', userId).is('team_id', null);
  if (paises.length > 0) {
    await supabase.from('paises').insert(paises.map((p) => ({
      id: p.id, user_id: userId, team_id: teamId, nombre: p.nombre, tasa: p.tasa, is_local: p.isLocal || false,
    })));
  }
}

// --- Config ---
export async function getCostoMinuto(): Promise<number> {
  const { teamId, userId } = await scopeFilter();
  const q = teamId
    ? supabase.from('config').select('costo_minuto').eq('team_id', teamId).limit(1).maybeSingle()
    : supabase.from('config').select('costo_minuto').eq('user_id', userId).is('team_id', null).limit(1).maybeSingle();
  const { data } = await q;
  return data ? Number(data.costo_minuto) : 0.02;
}

export async function saveCostoMinuto(v: number): Promise<void> {
  const { teamId, userId } = await scopeFilter();
  if (teamId) {
    const { data: existing } = await supabase.from('config').select('id').eq('team_id', teamId).maybeSingle();
    if (existing) await supabase.from('config').update({ costo_minuto: v }).eq('id', existing.id);
    else await supabase.from('config').insert({ user_id: userId, team_id: teamId, costo_minuto: v, margen_default: 40 });
  } else {
    await supabase.from('config').upsert({ user_id: userId, costo_minuto: v }, { onConflict: 'user_id' });
  }
}

export async function getMargenDefault(): Promise<number> {
  const { teamId, userId } = await scopeFilter();
  const q = teamId
    ? supabase.from('config').select('margen_default').eq('team_id', teamId).limit(1).maybeSingle()
    : supabase.from('config').select('margen_default').eq('user_id', userId).is('team_id', null).limit(1).maybeSingle();
  const { data } = await q;
  return data ? Number(data.margen_default) : 40;
}

export async function saveMargenDefault(v: number): Promise<void> {
  const { teamId, userId } = await scopeFilter();
  if (teamId) {
    const { data: existing } = await supabase.from('config').select('id').eq('team_id', teamId).maybeSingle();
    if (existing) await supabase.from('config').update({ margen_default: v }).eq('id', existing.id);
    else await supabase.from('config').insert({ user_id: userId, team_id: teamId, margen_default: v, costo_minuto: 0.02 });
  } else {
    await supabase.from('config').upsert({ user_id: userId, margen_default: v }, { onConflict: 'user_id' });
  }
}

// --- Cotizaciones ---
export async function getCotizaciones(): Promise<Cotizacion[]> {
  const { teamId, userId } = await scopeFilter();
  const q = teamId
    ? supabase.from('cotizaciones').select('*').or(`team_id.eq.${teamId},and(user_id.eq.${userId},team_id.is.null)`).order('created_at', { ascending: false })
    : supabase.from('cotizaciones').select('*').eq('user_id', userId).is('team_id', null).order('created_at', { ascending: false });
  const { data } = await q;
  return (data || []).map((r: any) => r.data as Cotizacion);
}

export async function saveCotizacion(c: Cotizacion): Promise<void> {
  const { teamId, userId } = await scopeFilter();
  const { error } = await supabase.from('cotizaciones').insert({ user_id: userId, team_id: teamId, data: c });
  if (error) console.error('saveCotizacion error:', error);
}

export async function deleteCotizacion(id: string): Promise<void> {
  await supabase.from('cotizaciones').delete().filter('data->>id', 'eq', id);
}

// --- Consumos ---
export async function getConsumos(): Promise<Record<string, number>> {
  const { teamId, userId } = await scopeFilter();
  const q = teamId
    ? supabase.from('consumos').select('*').or(`team_id.eq.${teamId},and(user_id.eq.${userId},team_id.is.null)`)
    : supabase.from('consumos').select('*').eq('user_id', userId).is('team_id', null);
  const { data } = await q;
  const result: Record<string, number> = {};
  (data || []).forEach((r: any) => { result[`${r.prenda_id}_${r.tejido_id}`] = Number(r.consumo); });
  return result;
}

export async function saveConsumo(pId: string, tId: string, c: number): Promise<void> {
  const { teamId, userId } = await scopeFilter();
  if (teamId) {
    const { data: existing } = await supabase.from('consumos').select('id').eq('team_id', teamId).eq('prenda_id', pId).eq('tejido_id', tId).maybeSingle();
    if (existing) await supabase.from('consumos').update({ consumo: c }).eq('id', existing.id);
    else await supabase.from('consumos').insert({ user_id: userId, team_id: teamId, prenda_id: pId, tejido_id: tId, consumo: c });
  } else {
    await supabase.from('consumos').upsert(
      { user_id: userId, prenda_id: pId, tejido_id: tId, consumo: c },
      { onConflict: 'user_id,prenda_id,tejido_id' },
    );
  }
}

export async function getConsumo(pId: string, tId: string): Promise<number | null> {
  const { teamId, userId } = await scopeFilter();
  const q = teamId
    ? supabase.from('consumos').select('consumo').eq('team_id', teamId).eq('prenda_id', pId).eq('tejido_id', tId).maybeSingle()
    : supabase.from('consumos').select('consumo').eq('user_id', userId).is('team_id', null).eq('prenda_id', pId).eq('tejido_id', tId).maybeSingle();
  const { data } = await q;
  return data ? Number(data.consumo) : null;
}

// --- Admin / Teams ---
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

export async function getTeams() {
  const { data } = await supabase.from('teams').select('*').order('created_at');
  return data || [];
}

export async function setUserTeam(userId: string, teamId: string | null) {
  const { error } = await supabase.from('profiles').update({ team_id: teamId }).eq('id', userId);
  if (error) console.error('setUserTeam error:', error);
}

// --- Seed defaults for new user ---
export async function seedDefaults(userIdParam?: string): Promise<void> {
  const userId = userIdParam || await uid();
  const short = userId.slice(0, 4);

  const { error: cfgErr } = await supabase.from('config').upsert({ user_id: userId, costo_minuto: 0.02, margen_default: 40 }, { onConflict: 'user_id' });
  if (cfgErr) console.error('seed config error:', cfgErr);

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
