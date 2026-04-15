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

/** Scope helper */
async function scope() {
  const teamId = await getTeamId();
  const userId = await uid();
  return { teamId, userId };
}

/** Obtiene datos con fallback: equipo primero, luego personal */
async function getWithFallback(table: string) {
  const { teamId, userId } = await scope();
  if (teamId) {
    const { data: teamData } = await supabase.from(table).select('*').eq('team_id', teamId);
    if (teamData && teamData.length > 0) return teamData;
    // Fallback: datos personales del usuario
    const { data: personal } = await supabase.from(table).select('*').eq('user_id', userId).is('team_id', null);
    return personal || [];
  }
  const { data } = await supabase.from(table).select('*').eq('user_id', userId).is('team_id', null);
  return data || [];
}

// --- Prendas ---
export async function getPrendas(): Promise<Prenda[]> {
  const rows = await getWithFallback('prendas');
  return rows.map((r: any) => ({ id: r.id, nombre: r.nombre, minutos: Number(r.minutos) }));
}

export async function savePrendas(prendas: Prenda[]): Promise<void> {
  const { teamId, userId } = await scope();
  if (teamId) {
    // Al guardar en equipo, tambien limpiar datos personales del user para no duplicar
    await supabase.from('prendas').delete().eq('team_id', teamId);
    await supabase.from('prendas').delete().eq('user_id', userId).is('team_id', null);
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
  const rows = await getWithFallback('tejidos');
  return rows.map((r: any) => ({ id: r.id, nombre: r.nombre, tipo: r.tipo, precio: Number(r.precio_usd) }));
}

export async function saveTejidos(tejidos: Tejido[]): Promise<void> {
  const { teamId, userId } = await scope();
  if (teamId) {
    await supabase.from('tejidos').delete().eq('team_id', teamId);
    await supabase.from('tejidos').delete().eq('user_id', userId).is('team_id', null);
  } else {
    await supabase.from('tejidos').delete().eq('user_id', userId).is('team_id', null);
  }
  if (tejidos.length > 0) {
    await supabase.from('tejidos').insert(tejidos.map((t) => ({
      id: t.id, user_id: userId, team_id: teamId, nombre: t.nombre, tipo: t.tipo, precio_usd: t.precio,
    })));
  }
}

// --- Insumos ---
export async function getInsumos(): Promise<Insumo[]> {
  const rows = await getWithFallback('insumos');
  return rows.map((r: any) => ({ id: r.id, nombre: r.nombre, precio: Number(r.precio), moneda: r.moneda }));
}

export async function saveInsumos(insumos: Insumo[]): Promise<void> {
  const { teamId, userId } = await scope();
  if (teamId) {
    await supabase.from('insumos').delete().eq('team_id', teamId);
    await supabase.from('insumos').delete().eq('user_id', userId).is('team_id', null);
  } else {
    await supabase.from('insumos').delete().eq('user_id', userId).is('team_id', null);
  }
  if (insumos.length > 0) {
    await supabase.from('insumos').insert(insumos.map((i) => ({
      id: i.id, user_id: userId, team_id: teamId, nombre: i.nombre, precio: i.precio, moneda: i.moneda,
    })));
  }
}

// --- Paises ---
export async function getPaises(): Promise<PaisOrigen[]> {
  const rows = await getWithFallback('paises');
  return rows.map((r: any) => ({ id: r.id, nombre: r.nombre, tasa: Number(r.tasa), isLocal: r.is_local }));
}

export async function savePaises(paises: PaisOrigen[]): Promise<void> {
  const { teamId, userId } = await scope();
  if (teamId) {
    await supabase.from('paises').delete().eq('team_id', teamId);
    await supabase.from('paises').delete().eq('user_id', userId).is('team_id', null);
  } else {
    await supabase.from('paises').delete().eq('user_id', userId).is('team_id', null);
  }
  if (paises.length > 0) {
    await supabase.from('paises').insert(paises.map((p) => ({
      id: p.id, user_id: userId, team_id: teamId, nombre: p.nombre, tasa: p.tasa, is_local: p.isLocal || false,
    })));
  }
}

// --- Config ---
async function getConfigRow() {
  const { teamId, userId } = await scope();
  if (teamId) {
    const { data: teamRow } = await supabase.from('config').select('*').eq('team_id', teamId).maybeSingle();
    if (teamRow) return teamRow;
    const { data: personal } = await supabase.from('config').select('*').eq('user_id', userId).is('team_id', null).maybeSingle();
    return personal;
  }
  const { data } = await supabase.from('config').select('*').eq('user_id', userId).is('team_id', null).maybeSingle();
  return data;
}

export async function getCostoMinuto(): Promise<number> {
  const row = await getConfigRow();
  return row ? Number(row.costo_minuto) : 0.02;
}

export async function saveCostoMinuto(v: number): Promise<void> {
  const { teamId, userId } = await scope();
  if (teamId) {
    const { data: existing } = await supabase.from('config').select('id').eq('team_id', teamId).maybeSingle();
    if (existing) {
      await supabase.from('config').update({ costo_minuto: v }).eq('id', existing.id);
    } else {
      // Migrar config personal al equipo si existe, sino crear nueva
      const { data: personal } = await supabase.from('config').select('*').eq('user_id', userId).is('team_id', null).maybeSingle();
      await supabase.from('config').insert({
        user_id: userId, team_id: teamId,
        costo_minuto: v, margen_default: personal?.margen_default ?? 40,
      });
    }
  } else {
    await supabase.from('config').upsert({ user_id: userId, costo_minuto: v }, { onConflict: 'user_id' });
  }
}

export async function getMargenDefault(): Promise<number> {
  const row = await getConfigRow();
  return row ? Number(row.margen_default) : 40;
}

export async function saveMargenDefault(v: number): Promise<void> {
  const { teamId, userId } = await scope();
  if (teamId) {
    const { data: existing } = await supabase.from('config').select('id').eq('team_id', teamId).maybeSingle();
    if (existing) {
      await supabase.from('config').update({ margen_default: v }).eq('id', existing.id);
    } else {
      const { data: personal } = await supabase.from('config').select('*').eq('user_id', userId).is('team_id', null).maybeSingle();
      await supabase.from('config').insert({
        user_id: userId, team_id: teamId,
        margen_default: v, costo_minuto: personal?.costo_minuto ?? 0.02,
      });
    }
  } else {
    await supabase.from('config').upsert({ user_id: userId, margen_default: v }, { onConflict: 'user_id' });
  }
}

// --- Cotizaciones ---
export async function getCotizaciones(): Promise<Cotizacion[]> {
  const { teamId, userId } = await scope();
  if (teamId) {
    const { data } = await supabase.from('cotizaciones').select('*').eq('team_id', teamId).order('created_at', { ascending: false });
    if (data && data.length > 0) return data.map((r: any) => r.data as Cotizacion);
    const { data: personal } = await supabase.from('cotizaciones').select('*').eq('user_id', userId).is('team_id', null).order('created_at', { ascending: false });
    return (personal || []).map((r: any) => r.data as Cotizacion);
  }
  const { data } = await supabase.from('cotizaciones').select('*').eq('user_id', userId).is('team_id', null).order('created_at', { ascending: false });
  return (data || []).map((r: any) => r.data as Cotizacion);
}

export async function saveCotizacion(c: Cotizacion): Promise<void> {
  const { teamId, userId } = await scope();
  const { error } = await supabase.from('cotizaciones').insert({ user_id: userId, team_id: teamId, data: c });
  if (error) console.error('saveCotizacion error:', error);
}

export async function deleteCotizacion(id: string): Promise<void> {
  await supabase.from('cotizaciones').delete().filter('data->>id', 'eq', id);
}

// --- Consumos ---
export async function getConsumos(): Promise<Record<string, number>> {
  const { teamId, userId } = await scope();
  let rows: any[] = [];
  if (teamId) {
    const { data } = await supabase.from('consumos').select('*').eq('team_id', teamId);
    rows = data && data.length > 0 ? data : (await supabase.from('consumos').select('*').eq('user_id', userId).is('team_id', null)).data || [];
  } else {
    rows = (await supabase.from('consumos').select('*').eq('user_id', userId).is('team_id', null)).data || [];
  }
  const result: Record<string, number> = {};
  rows.forEach((r: any) => { result[`${r.prenda_id}_${r.tejido_id}`] = Number(r.consumo); });
  return result;
}

export async function saveConsumo(pId: string, tId: string, c: number): Promise<void> {
  const { teamId, userId } = await scope();
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
  const { teamId, userId } = await scope();
  if (teamId) {
    const { data: teamRow } = await supabase.from('consumos').select('consumo').eq('team_id', teamId).eq('prenda_id', pId).eq('tejido_id', tId).maybeSingle();
    if (teamRow) return Number(teamRow.consumo);
    const { data: personal } = await supabase.from('consumos').select('consumo').eq('user_id', userId).is('team_id', null).eq('prenda_id', pId).eq('tejido_id', tId).maybeSingle();
    return personal ? Number(personal.consumo) : null;
  }
  const { data } = await supabase.from('consumos').select('consumo').eq('user_id', userId).is('team_id', null).eq('prenda_id', pId).eq('tejido_id', tId).maybeSingle();
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
  const teamId = await getTeamId();

  const { error: cfgErr } = await supabase.from('config').upsert(
    { user_id: userId, team_id: teamId, costo_minuto: 0.02, margen_default: 40 },
    { onConflict: teamId ? 'team_id' : 'user_id' }
  );
  if (cfgErr) console.error('seed config error:', cfgErr);

  const insumos = [
    { id: `i_${short}_1`, user_id: userId, team_id: teamId, nombre: 'Hilos Recta', precio: 0.05, moneda: 'USD' },
    { id: `i_${short}_2`, user_id: userId, team_id: teamId, nombre: 'Hilos Texturizado', precio: 0.04, moneda: 'USD' },
    { id: `i_${short}_3`, user_id: userId, team_id: teamId, nombre: 'Poliamida', precio: 0.008, moneda: 'USD' },
    { id: `i_${short}_4`, user_id: userId, team_id: teamId, nombre: 'Ribbon', precio: 0.004, moneda: 'USD' },
    { id: `i_${short}_5`, user_id: userId, team_id: teamId, nombre: 'Gomas 6cm', precio: 0.13, moneda: 'USD' },
    { id: `i_${short}_6`, user_id: userId, team_id: teamId, nombre: 'Gomas 7mm', precio: 0.013, moneda: 'USD' },
    { id: `i_${short}_7`, user_id: userId, team_id: teamId, nombre: 'RFID', precio: 0.05, moneda: 'USD' },
    { id: `i_${short}_8`, user_id: userId, team_id: teamId, nombre: 'Transfer', precio: 0.04, moneda: 'USD' },
    { id: `i_${short}_9`, user_id: userId, team_id: teamId, nombre: 'Etiquetas Bordadas', precio: 0.05, moneda: 'USD' },
  ];
  const { error: insErr } = await supabase.from('insumos').insert(insumos);
  if (insErr) console.error('seed insumos error:', insErr);

  const paises = [
    { id: `ps_${short}_local`, user_id: userId, team_id: teamId, nombre: 'Local', tasa: 0, is_local: true },
    { id: `ps_${short}_brasil`, user_id: userId, team_id: teamId, nombre: 'Brasil', tasa: 5, is_local: false },
    { id: `ps_${short}_china`, user_id: userId, team_id: teamId, nombre: 'China', tasa: 15, is_local: false },
  ];
  const { error: paisErr } = await supabase.from('paises').insert(paises);
  if (paisErr) console.error('seed paises error:', paisErr);
}
