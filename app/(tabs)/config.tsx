import { useCallback, useRef, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '@/contexts/auth-context';

function confirmAction(t: string, m: string, ok: () => void) {
  if (Platform.OS === 'web') { try { if (window.confirm(`${t}\n${m}`)) ok(); } catch { ok(); } }
  else { const { Alert } = require('react-native'); Alert.alert(t, m, [{ text: 'No', style: 'cancel' }, { text: 'Si', style: 'destructive', onPress: ok }]); }
}

import {
  Prenda, Tejido, TipoTejido, Insumo, PaisOrigen,
  getPrendas, savePrendas, getTejidos, saveTejidos, getInsumos, saveInsumos,
  getPaises, savePaises, getCostoMinuto, saveCostoMinuto, getMargenDefault, saveMargenDefault,
  generateId, parseNumero, exportarDatos, importarDatos,
} from '@/lib/storage';
import type { Moneda } from '@/lib/currency';
import { COLORS, RADIUS } from '@/lib/theme';
import { Button, Card, Chip, SectionHeader, PageHeader } from '@/components/ui-kit';
import { CurrencyBar } from '@/components/currency-bar';
import { showToast } from '@/components/toast';

export default function ConfigScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [costoMinuto, setCostoMinuto] = useState('');
  const [margenDefault, setMargenDefault] = useState('');
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [tejidos, setTejidos] = useState<Tejido[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [paises, setPaises] = useState<PaisOrigen[]>([]);

  const [prendasOpen, setPrendasOpen] = useState(false);
  const [tejidosOpen, setTejidosOpen] = useState(false);
  const [insumosOpen, setInsumosOpen] = useState(false);
  const [paisesOpen, setPaisesOpen] = useState(false);

  // Edit states
  const [editingPrenda, setEditingPrenda] = useState<string | null>(null);
  const [epData, setEpData] = useState({ nombre: '', minutos: '' });
  const [editingTejido, setEditingTejido] = useState<string | null>(null);
  const [etData, setEtData] = useState({ nombre: '', tipo: 'punto' as TipoTejido, precio: '' });
  const [editingInsumo, setEditingInsumo] = useState<string | null>(null);
  const [eiData, setEiData] = useState({ nombre: '', precio: '', moneda: 'GS' as Moneda });
  const [editingPais, setEditingPais] = useState<string | null>(null);
  const [epsData, setEpsData] = useState({ nombre: '', tasa: '' });

  // New forms
  const [np, setNp] = useState({ nombre: '', minutos: '' });
  const [nt, setNt] = useState({ nombre: '', tipo: 'punto' as TipoTejido, precio: '' });
  const [ni, setNi] = useState({ nombre: '', precio: '', moneda: 'GS' as Moneda });
  const [nps, setNps] = useState({ nombre: '', tasa: '' });

  const cmTimeout = useRef<ReturnType<typeof setTimeout>>();
  const mdTimeout = useRef<ReturnType<typeof setTimeout>>();

  useFocusEffect(useCallback(() => {
    (async () => {
      const [cm, p, t, ins, ps, md] = await Promise.all([
        getCostoMinuto(), getPrendas(), getTejidos(), getInsumos(), getPaises(), getMargenDefault(),
      ]);
      setCostoMinuto(cm.toString()); setMargenDefault(md.toString());
      setPrendas(p); setTejidos(t); setInsumos(ins); setPaises(ps);
    })();
  }, []));

  const autosave = (ref: React.MutableRefObject<any>, val: string, saveFn: (n: number) => Promise<void>, msg: string) => {
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(async () => {
      const n = parseNumero(val);
      if (n && n > 0) { await saveFn(n); showToast(msg); }
    }, 800);
  };

  // CRUD helpers
  const addP = async () => { if (!np.nombre.trim()) return showToast('Nombre requerido', 'error'); const m = parseNumero(np.minutos); if (!m) return showToast('Minutos invalidos', 'error'); const u = [...prendas, { id: generateId(), nombre: np.nombre.trim(), minutos: m }]; await savePrendas(u); setPrendas(u); setNp({ nombre: '', minutos: '' }); showToast('Agregada'); };
  const delP = (id: string, n: string) => confirmAction('Eliminar', `"${n}"?`, async () => { const u = prendas.filter((x) => x.id !== id); await savePrendas(u); setPrendas(u); showToast('Eliminada'); });
  const saveP = async () => { if (!editingPrenda) return; const m = parseNumero(epData.minutos); if (!epData.nombre.trim() || !m) return showToast('Datos invalidos', 'error'); const u = prendas.map((x) => x.id === editingPrenda ? { ...x, nombre: epData.nombre.trim(), minutos: m } : x); await savePrendas(u); setPrendas(u); setEditingPrenda(null); showToast('Actualizada'); };

  const addT = async () => { if (!nt.nombre.trim()) return showToast('Nombre requerido', 'error'); const p = parseNumero(nt.precio); if (!p) return showToast('Precio invalido', 'error'); const u = [...tejidos, { id: generateId(), nombre: nt.nombre.trim(), tipo: nt.tipo, precio: p }]; await saveTejidos(u); setTejidos(u); setNt({ nombre: '', tipo: 'punto', precio: '' }); showToast('Agregado'); };
  const delT = (id: string, n: string) => confirmAction('Eliminar', `"${n}"?`, async () => { const u = tejidos.filter((x) => x.id !== id); await saveTejidos(u); setTejidos(u); showToast('Eliminado'); });
  const saveT = async () => { if (!editingTejido) return; const p = parseNumero(etData.precio); if (!etData.nombre.trim() || !p) return showToast('Datos invalidos', 'error'); const u = tejidos.map((x) => x.id === editingTejido ? { ...x, nombre: etData.nombre.trim(), tipo: etData.tipo, precio: p } : x); await saveTejidos(u); setTejidos(u); setEditingTejido(null); showToast('Actualizado'); };

  const addI = async () => { if (!ni.nombre.trim()) return showToast('Nombre requerido', 'error'); const p = parseNumero(ni.precio); if (isNaN(p) || p < 0) return showToast('Precio invalido', 'error'); const u = [...insumos, { id: generateId(), nombre: ni.nombre.trim(), precio: p, moneda: ni.moneda }]; await saveInsumos(u); setInsumos(u); setNi({ nombre: '', precio: '', moneda: 'GS' }); showToast('Agregado'); };
  const delI = (id: string, n: string) => confirmAction('Eliminar', `"${n}"?`, async () => { const u = insumos.filter((x) => x.id !== id); await saveInsumos(u); setInsumos(u); showToast('Eliminado'); });
  const saveI = async () => { if (!editingInsumo) return; const p = parseNumero(eiData.precio); if (!eiData.nombre.trim() || isNaN(p)) return showToast('Datos invalidos', 'error'); const u = insumos.map((x) => x.id === editingInsumo ? { ...x, nombre: eiData.nombre.trim(), precio: p, moneda: eiData.moneda } : x); await saveInsumos(u); setInsumos(u); setEditingInsumo(null); showToast('Actualizado'); };

  const addPs = async () => { if (!nps.nombre.trim()) return showToast('Nombre requerido', 'error'); const t = parseNumero(nps.tasa); if (isNaN(t) || t < 0) return showToast('Tasa invalida', 'error'); const u = [...paises, { id: generateId(), nombre: nps.nombre.trim(), tasa: t }]; await savePaises(u); setPaises(u); setNps({ nombre: '', tasa: '' }); showToast('Agregado'); };
  const delPs = (id: string, n: string) => confirmAction('Eliminar', `"${n}"?`, async () => { const u = paises.filter((x) => x.id !== id); await savePaises(u); setPaises(u); showToast('Eliminado'); });
  const savePs = async () => { if (!editingPais) return; const t = parseNumero(epsData.tasa); if (!epsData.nombre.trim() || isNaN(t)) return showToast('Datos invalidos', 'error'); const u = paises.map((x) => x.id === editingPais ? { ...x, nombre: epsData.nombre.trim(), tasa: t } : x); await savePaises(u); setPaises(u); setEditingPais(null); showToast('Actualizado'); };

  const reloadAll = async () => {
    const [cm, p, t, ins, ps, md] = await Promise.all([getCostoMinuto(), getPrendas(), getTejidos(), getInsumos(), getPaises(), getMargenDefault()]);
    setCostoMinuto(cm.toString()); setMargenDefault(md.toString()); setPrendas(p); setTejidos(t); setInsumos(ins); setPaises(ps);
  };

  // Render helper for collapsible
  const CollHeader = ({ icon, iconBg, iconColor, title, count, open, toggle }: any) => (
    <TouchableOpacity activeOpacity={0.7} onPress={toggle} style={s.colH}>
      <View style={s.colLeft}>
        <View style={[s.colIcon, { backgroundColor: iconBg }]}><MaterialIcons name={icon} size={20} color={iconColor} /></View>
        <View><Text style={s.colTitle}>{title}</Text><Text style={s.colCount}>{count}</Text></View>
      </View>
      <View style={[s.badge, { backgroundColor: iconBg }]}><Text style={[s.badgeText, { color: iconColor }]}>{typeof count === 'string' ? count.split(' ')[0] : count}</Text></View>
      <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={24} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  const EditCard = ({ children }: { children: React.ReactNode }) => <Card style={s.editCard}>{children}</Card>;
  const EditActions = ({ onCancel, onSave, canSave = true }: any) => (
    <View style={s.editActions}>
      <Button title="Cancelar" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
      {canSave && <Button title="Guardar" icon="check" onPress={onSave} style={{ flex: 1 }} />}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <CurrencyBar onUpdate={() => {}} />
      <ScrollView contentContainerStyle={s.content}>
        <PageHeader icon="settings" title="Configuracion" subtitle="Parametros de tu fabrica" />

        {/* Costo minuto USD */}
        <SectionHeader icon="speed" title="Costo minuto (USD)" subtitle="Se guarda automaticamente" />
        <Card>
          <View style={s.valRow}>
            <Text style={s.valPrefix}>US$</Text>
            <TextInput style={s.valInput} keyboardType="decimal-pad" value={costoMinuto}
              onChangeText={(v) => { setCostoMinuto(v); autosave(cmTimeout, v, saveCostoMinuto, `Costo minuto: US$ ${parseNumero(v)}`); }}
              placeholder="0.02" placeholderTextColor={COLORS.textMuted} />
            <Text style={s.valSuffix}>/min</Text>
          </View>
        </Card>

        {/* Margen */}
        <SectionHeader icon="trending-up" title="Margen default" subtitle="Se usa al cotizar" />
        <Card>
          <View style={s.valRow}>
            <MaterialIcons name="percent" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
            <TextInput style={s.valInput} keyboardType="decimal-pad" value={margenDefault}
              onChangeText={(v) => { setMargenDefault(v); autosave(mdTimeout, v, saveMargenDefault, `Margen: ${v}%`); }}
              placeholder="40" placeholderTextColor={COLORS.textMuted} />
            <Text style={s.valSuffix}>%</Text>
          </View>
        </Card>

        {/* Prendas */}
        <CollHeader icon="checkroom" iconBg={COLORS.primaryGhost} iconColor={COLORS.primary}
          title="Prendas" count={`${prendas.length} items`} open={prendasOpen} toggle={() => setPrendasOpen(!prendasOpen)} />
        {prendasOpen && <View style={s.colContent}>
          {prendas.map((p) => editingPrenda === p.id ? (
            <EditCard key={p.id}><TextInput style={s.eInput} value={epData.nombre} onChangeText={(v) => setEpData({ ...epData, nombre: v })} placeholder="Nombre" placeholderTextColor={COLORS.textMuted} />
              <TextInput style={s.eInput} value={epData.minutos} onChangeText={(v) => setEpData({ ...epData, minutos: v })} placeholder="Minutos" placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" />
              <EditActions onCancel={() => setEditingPrenda(null)} onSave={saveP} /></EditCard>
          ) : (
            <Card key={p.id}><View style={s.itemRow}>
              <View style={[s.itemIcon, { backgroundColor: COLORS.primaryGhost }]}><MaterialIcons name="checkroom" size={18} color={COLORS.primary} /></View>
              <View style={{ flex: 1 }}><Text style={s.itemName}>{p.nombre}</Text><Text style={s.itemDetail}>{p.minutos} min</Text></View>
              <TouchableOpacity style={s.editTag} onPress={() => { setEditingPrenda(p.id); setEpData({ nombre: p.nombre, minutos: p.minutos.toString() }); }}><MaterialIcons name="edit" size={12} color={COLORS.primaryLight} /></TouchableOpacity>
              <TouchableOpacity onPress={() => delP(p.id, p.nombre)} style={s.delBtn}><MaterialIcons name="close" size={14} color={COLORS.danger} /></TouchableOpacity>
            </View></Card>
          ))}
          <Card style={s.addCard}><Text style={s.addTitle}>Nueva prenda</Text>
            <TextInput style={s.aInput} placeholder="Nombre" placeholderTextColor={COLORS.textMuted} value={np.nombre} onChangeText={(v) => setNp({ ...np, nombre: v })} />
            <TextInput style={s.aInput} placeholder="Minutos" placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" value={np.minutos} onChangeText={(v) => setNp({ ...np, minutos: v })} />
            <Button title="+ Agregar" icon="add" variant="success" onPress={addP} />
          </Card>
        </View>}

        {/* Tejidos */}
        <CollHeader icon="texture" iconBg={COLORS.warningSoft} iconColor={COLORS.warning}
          title="Tejidos" count={`${tejidos.length} items`} open={tejidosOpen} toggle={() => setTejidosOpen(!tejidosOpen)} />
        {tejidosOpen && <View style={s.colContent}>
          {tejidos.map((t) => editingTejido === t.id ? (
            <EditCard key={t.id}><TextInput style={s.eInput} value={etData.nombre} onChangeText={(v) => setEtData({ ...etData, nombre: v })} placeholder="Nombre" placeholderTextColor={COLORS.textMuted} />
              <View style={s.row}><Chip label="Punto" selected={etData.tipo === 'punto'} onPress={() => setEtData({ ...etData, tipo: 'punto' })} /><Chip label="Plano" selected={etData.tipo === 'plano'} onPress={() => setEtData({ ...etData, tipo: 'plano' })} /></View>
              <TextInput style={s.eInput} value={etData.precio} onChangeText={(v) => setEtData({ ...etData, precio: v })} placeholder={`USD/${etData.tipo === 'punto' ? 'kg' : 'm'}`} placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" />
              <EditActions onCancel={() => setEditingTejido(null)} onSave={saveT} /></EditCard>
          ) : (
            <Card key={t.id}><View style={s.itemRow}>
              <View style={[s.itemIcon, { backgroundColor: COLORS.warningSoft }]}><MaterialIcons name="texture" size={18} color={COLORS.warning} /></View>
              <View style={{ flex: 1 }}><Text style={s.itemName}>{t.nombre}</Text><Text style={s.itemDetail}>{t.tipo === 'punto' ? 'Punto' : 'Plano'} · US$ {t.precio}/{t.tipo === 'punto' ? 'kg' : 'm'}</Text></View>
              <TouchableOpacity style={s.editTag} onPress={() => { setEditingTejido(t.id); setEtData({ nombre: t.nombre, tipo: t.tipo, precio: t.precio.toString() }); }}><MaterialIcons name="edit" size={12} color={COLORS.primaryLight} /></TouchableOpacity>
              <TouchableOpacity onPress={() => delT(t.id, t.nombre)} style={s.delBtn}><MaterialIcons name="close" size={14} color={COLORS.danger} /></TouchableOpacity>
            </View></Card>
          ))}
          <Card style={s.addCard}><Text style={s.addTitle}>Nuevo tejido</Text>
            <TextInput style={s.aInput} placeholder="Nombre" placeholderTextColor={COLORS.textMuted} value={nt.nombre} onChangeText={(v) => setNt({ ...nt, nombre: v })} />
            <View style={s.row}><Chip label="Punto" selected={nt.tipo === 'punto'} onPress={() => setNt({ ...nt, tipo: 'punto' })} /><Chip label="Plano" selected={nt.tipo === 'plano'} onPress={() => setNt({ ...nt, tipo: 'plano' })} /></View>
            <TextInput style={s.aInput} placeholder={`Precio USD/${nt.tipo === 'punto' ? 'kg' : 'm'}`} placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" value={nt.precio} onChangeText={(v) => setNt({ ...nt, precio: v })} />
            <Button title="+ Agregar" icon="add" variant="success" onPress={addT} />
          </Card>
        </View>}

        {/* Insumos */}
        <CollHeader icon="category" iconBg={COLORS.successSoft} iconColor={COLORS.success}
          title="Insumos" count={`${insumos.length} items`} open={insumosOpen} toggle={() => setInsumosOpen(!insumosOpen)} />
        {insumosOpen && <View style={s.colContent}>
          {insumos.map((i) => editingInsumo === i.id ? (
            <EditCard key={i.id}><TextInput style={s.eInput} value={eiData.nombre} onChangeText={(v) => setEiData({ ...eiData, nombre: v })} placeholder="Nombre" placeholderTextColor={COLORS.textMuted} />
              <View style={s.row}><Chip label="GS" selected={eiData.moneda === 'GS'} onPress={() => setEiData({ ...eiData, moneda: 'GS' })} /><Chip label="USD" selected={eiData.moneda === 'USD'} onPress={() => setEiData({ ...eiData, moneda: 'USD' })} /></View>
              <TextInput style={s.eInput} value={eiData.precio} onChangeText={(v) => setEiData({ ...eiData, precio: v })} placeholder={`Precio ${eiData.moneda}`} placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" />
              <EditActions onCancel={() => setEditingInsumo(null)} onSave={saveI} /></EditCard>
          ) : (
            <Card key={i.id}><View style={s.itemRow}>
              <View style={[s.itemIcon, { backgroundColor: COLORS.successSoft }]}><MaterialIcons name="label" size={18} color={COLORS.success} /></View>
              <View style={{ flex: 1 }}><Text style={s.itemName}>{i.nombre}</Text><Text style={s.itemDetail}>{i.moneda === 'USD' ? `US$ ${i.precio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}` : `₲ ${i.precio.toLocaleString('es-AR')}`}</Text></View>
              <TouchableOpacity style={s.editTag} onPress={() => { setEditingInsumo(i.id); setEiData({ nombre: i.nombre, precio: i.precio.toString(), moneda: i.moneda }); }}><MaterialIcons name="edit" size={12} color={COLORS.primaryLight} /></TouchableOpacity>
              <TouchableOpacity onPress={() => delI(i.id, i.nombre)} style={s.delBtn}><MaterialIcons name="close" size={14} color={COLORS.danger} /></TouchableOpacity>
            </View></Card>
          ))}
          <Card style={s.addCard}><Text style={s.addTitle}>Nuevo insumo</Text>
            <TextInput style={s.aInput} placeholder="Nombre" placeholderTextColor={COLORS.textMuted} value={ni.nombre} onChangeText={(v) => setNi({ ...ni, nombre: v })} />
            <View style={s.row}><Chip label="GS" selected={ni.moneda === 'GS'} onPress={() => setNi({ ...ni, moneda: 'GS' })} /><Chip label="USD" selected={ni.moneda === 'USD'} onPress={() => setNi({ ...ni, moneda: 'USD' })} /></View>
            <TextInput style={s.aInput} placeholder={`Precio ${ni.moneda}`} placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" value={ni.precio} onChangeText={(v) => setNi({ ...ni, precio: v })} />
            <Button title="+ Agregar" icon="add" variant="success" onPress={addI} />
          </Card>
        </View>}

        {/* Importacion */}
        <CollHeader icon="public" iconBg="#e0f2fe" iconColor="#0284c7"
          title="Importacion" count={`${paises.length} paises`} open={paisesOpen} toggle={() => setPaisesOpen(!paisesOpen)} />
        {paisesOpen && <View style={s.colContent}>
          {paises.map((p) => editingPais === p.id ? (
            <EditCard key={p.id}><TextInput style={s.eInput} value={epsData.nombre} onChangeText={(v) => setEpsData({ ...epsData, nombre: v })} placeholder="Pais" placeholderTextColor={COLORS.textMuted} editable={!p.isLocal} />
              <TextInput style={s.eInput} value={epsData.tasa} onChangeText={(v) => setEpsData({ ...epsData, tasa: v })} placeholder="Tasa %" placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" editable={!p.isLocal} />
              <EditActions onCancel={() => setEditingPais(null)} onSave={savePs} canSave={!p.isLocal} /></EditCard>
          ) : (
            <Card key={p.id}><View style={s.itemRow}>
              <View style={[s.itemIcon, { backgroundColor: '#e0f2fe' }]}><MaterialIcons name={p.isLocal ? 'home' : 'public'} size={18} color="#0284c7" /></View>
              <View style={{ flex: 1 }}><Text style={s.itemName}>{p.nombre}</Text><Text style={s.itemDetail}>Tasa: {p.tasa}%{p.isLocal ? ' (fijo)' : ''}</Text></View>
              {!p.isLocal && <><TouchableOpacity style={s.editTag} onPress={() => { setEditingPais(p.id); setEpsData({ nombre: p.nombre, tasa: p.tasa.toString() }); }}><MaterialIcons name="edit" size={12} color={COLORS.primaryLight} /></TouchableOpacity>
              <TouchableOpacity onPress={() => delPs(p.id, p.nombre)} style={s.delBtn}><MaterialIcons name="close" size={14} color={COLORS.danger} /></TouchableOpacity></>}
            </View></Card>
          ))}
          <Card style={s.addCard}><Text style={s.addTitle}>Nuevo pais</Text>
            <TextInput style={s.aInput} placeholder="Nombre del pais" placeholderTextColor={COLORS.textMuted} value={nps.nombre} onChangeText={(v) => setNps({ ...nps, nombre: v })} />
            <TextInput style={s.aInput} placeholder="Tasa %" placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" value={nps.tasa} onChangeText={(v) => setNps({ ...nps, tasa: v })} />
            <Button title="+ Agregar" icon="add" variant="success" onPress={addPs} />
          </Card>
        </View>}

        {/* Cuenta */}
        <SectionHeader icon="account-circle" title="Cuenta" subtitle={user?.email || ''} />
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <MaterialIcons name="email" size={18} color={COLORS.primaryLight} />
            <Text style={{ fontSize: 14, color: COLORS.text, flex: 1 }}>{user?.email}</Text>
          </View>
          <Button title="Cerrar sesion" icon="logout" variant="danger" onPress={async () => {
            await signOut();
            router.replace('/login');
          }} />
        </Card>

        {/* Backup */}
        <SectionHeader icon="backup" title="Backup" subtitle="Exportar o importar datos" />
        <Card>
          <Button title="Exportar (copiar JSON)" icon="file-download" variant="secondary"
            onPress={async () => { try { const j = await exportarDatos(); if (Platform.OS === 'web') await navigator.clipboard.writeText(j); showToast('Copiado'); } catch { showToast('Error', 'error'); } }} />
          <View style={{ height: 8 }} />
          <Button title="Importar (pegar JSON)" icon="file-upload" variant="ghost"
            onPress={async () => { try { if (Platform.OS === 'web') { const j = await navigator.clipboard.readText(); if (!j.includes('prendas')) return showToast('JSON invalido', 'error'); await importarDatos(j); await reloadAll(); showToast('Importado'); } } catch { showToast('Error', 'error'); } }} />
        </Card>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60 },
  valRow: { flexDirection: 'row', alignItems: 'center' },
  valPrefix: { fontSize: 16, fontWeight: '600', color: COLORS.primary, marginRight: 6 },
  valInput: { flex: 1, fontSize: 22, fontWeight: '700', color: COLORS.text, paddingVertical: 4 },
  valSuffix: { fontSize: 14, color: COLORS.textMuted },
  // Collapsible
  colH: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, marginTop: 20, marginBottom: 4, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  colLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  colIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  colTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  colCount: { fontSize: 12, color: COLORS.textMuted },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 },
  badgeText: { fontSize: 13, fontWeight: '800' },
  colContent: { marginTop: 8 },
  // Items
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  itemName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  itemDetail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  editTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm, backgroundColor: COLORS.primaryGhost, marginRight: 8 },
  delBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.dangerSoft, justifyContent: 'center', alignItems: 'center' },
  // Edit
  editCard: { borderWidth: 2, borderColor: COLORS.primaryLight, gap: 8 },
  eInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, fontSize: 15, backgroundColor: COLORS.primaryGhost, color: COLORS.text },
  editActions: { flexDirection: 'row', gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  // Add
  addCard: { borderStyle: 'dashed', borderWidth: 1.5, borderColor: COLORS.border, gap: 8 },
  addTitle: { fontSize: 13, fontWeight: '600', color: COLORS.success },
  aInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, fontSize: 15, backgroundColor: '#fff', color: COLORS.text },
});
