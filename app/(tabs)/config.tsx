import { useCallback, useRef, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

import {
  Prenda, Tejido, TipoTejido, getPrendas, savePrendas, getTejidos, saveTejidos,
  getCostoMinuto, saveCostoMinuto, generateId,
} from '@/lib/storage';
import { COLORS, RADIUS } from '@/lib/theme';
import { Button, Card, Chip, SectionHeader, PageHeader } from '@/components/ui-kit';
import { showToast } from '@/components/toast';

export default function ConfigScreen() {
  const [costoMinuto, setCostoMinuto] = useState('');
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [tejidos, setTejidos] = useState<Tejido[]>([]);

  // Collapsible sections
  const [prendasOpen, setPrendasOpen] = useState(false);
  const [tejidosOpen, setTejidosOpen] = useState(false);

  // Editing
  const [editingPrenda, setEditingPrenda] = useState<string | null>(null);
  const [editPrendaData, setEditPrendaData] = useState({ nombre: '', minutos: '', insumos: '' });
  const [editingTejido, setEditingTejido] = useState<string | null>(null);
  const [editTejidoData, setEditTejidoData] = useState({ nombre: '', tipo: 'punto' as TipoTejido, precio: '' });

  // New item forms
  const [np, setNp] = useState({ nombre: '', minutos: '', insumos: '' });
  const [nt, setNt] = useState({ nombre: '', tipo: 'punto' as TipoTejido, precio: '' });

  const timeout = useRef<ReturnType<typeof setTimeout>>();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [cm, p, t] = await Promise.all([getCostoMinuto(), getPrendas(), getTejidos()]);
        setCostoMinuto(cm.toString());
        setPrendas(p);
        setTejidos(t);
      })();
    }, []),
  );

  const handleCostoChange = (val: string) => {
    setCostoMinuto(val);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(async () => {
      const n = parseFloat(val);
      if (n && n > 0) { await saveCostoMinuto(n); showToast(`Costo minuto: $${n}/min`); }
    }, 800);
  };

  // --- Prendas ---
  const addPrenda = async () => {
    if (!np.nombre.trim()) return showToast('Ingresa un nombre', 'error');
    const min = parseFloat(np.minutos), ins = parseFloat(np.insumos);
    if (!min || min <= 0) return showToast('Minutos invalidos', 'error');
    if (isNaN(ins) || ins < 0) return showToast('Insumos invalidos', 'error');
    const nueva: Prenda = { id: generateId(), nombre: np.nombre.trim(), minutos: min, insumos: ins };
    const u = [...prendas, nueva];
    await savePrendas(u); setPrendas(u);
    setNp({ nombre: '', minutos: '', insumos: '' });
    showToast(`${nueva.nombre} agregada`);
  };

  const deletePrenda = (id: string, nombre: string) => {
    confirmAction('Eliminar prenda', `Eliminar "${nombre}"?`, async () => {
      const u = prendas.filter((p) => p.id !== id);
      await savePrendas(u); setPrendas(u); showToast(`${nombre} eliminada`);
    });
  };

  const startEditP = (p: Prenda) => {
    setEditingPrenda(p.id);
    setEditPrendaData({ nombre: p.nombre, minutos: p.minutos.toString(), insumos: p.insumos.toString() });
  };

  const saveEditP = async () => {
    if (!editingPrenda) return;
    const min = parseFloat(editPrendaData.minutos), ins = parseFloat(editPrendaData.insumos);
    if (!editPrendaData.nombre.trim()) return showToast('Nombre requerido', 'error');
    if (!min || min <= 0) return showToast('Minutos invalidos', 'error');
    if (isNaN(ins) || ins < 0) return showToast('Insumos invalidos', 'error');
    const u = prendas.map((p) => p.id === editingPrenda ? { ...p, nombre: editPrendaData.nombre.trim(), minutos: min, insumos: ins } : p);
    await savePrendas(u); setPrendas(u); setEditingPrenda(null); showToast('Prenda actualizada');
  };

  // --- Tejidos ---
  const addTejido = async () => {
    if (!nt.nombre.trim()) return showToast('Ingresa un nombre', 'error');
    const precio = parseFloat(nt.precio);
    if (!precio || precio <= 0) return showToast('Precio invalido', 'error');
    const nuevo: Tejido = { id: generateId(), nombre: nt.nombre.trim(), tipo: nt.tipo, precio };
    const u = [...tejidos, nuevo];
    await saveTejidos(u); setTejidos(u);
    setNt({ nombre: '', tipo: 'punto', precio: '' });
    showToast(`${nuevo.nombre} agregado`);
  };

  const deleteTejido = (id: string, nombre: string) => {
    confirmAction('Eliminar tejido', `Eliminar "${nombre}"?`, async () => {
      const u = tejidos.filter((t) => t.id !== id);
      await saveTejidos(u); setTejidos(u); showToast(`${nombre} eliminado`);
    });
  };

  const startEditT = (t: Tejido) => {
    setEditingTejido(t.id);
    setEditTejidoData({ nombre: t.nombre, tipo: t.tipo, precio: t.precio.toString() });
  };

  const saveEditT = async () => {
    if (!editingTejido) return;
    const precio = parseFloat(editTejidoData.precio);
    if (!editTejidoData.nombre.trim()) return showToast('Nombre requerido', 'error');
    if (!precio || precio <= 0) return showToast('Precio invalido', 'error');
    const u = tejidos.map((t) => t.id === editingTejido ? { ...t, nombre: editTejidoData.nombre.trim(), tipo: editTejidoData.tipo, precio } : t);
    await saveTejidos(u); setTejidos(u); setEditingTejido(null); showToast('Tejido actualizado');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader icon="settings" title="Configuracion" subtitle="Parametros de tu fabrica" />

      {/* Costo minuto */}
      <SectionHeader icon="speed" title="Costo minuto" subtitle="Se guarda automaticamente" />
      <Card>
        <View style={styles.costoRow}>
          <View style={styles.costoIconWrap}>
            <MaterialIcons name="attach-money" size={22} color={COLORS.primary} />
          </View>
          <TextInput
            style={styles.costoInput}
            keyboardType="decimal-pad"
            value={costoMinuto}
            onChangeText={handleCostoChange}
            placeholder="15"
            placeholderTextColor={COLORS.textMuted}
          />
          <Text style={styles.costoSuffix}>/min</Text>
        </View>
      </Card>

      {/* === PRENDAS === */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setPrendasOpen(!prendasOpen)}
        style={styles.collapseHeader}
      >
        <View style={styles.collapseLeft}>
          <View style={[styles.collapseIconWrap, { backgroundColor: COLORS.primaryGhost }]}>
            <MaterialIcons name="checkroom" size={20} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.collapseTitle}>Prendas</Text>
            <Text style={styles.collapseCount}>{prendas.length} configuradas</Text>
          </View>
        </View>
        <View style={styles.collapseBadge}>
          <Text style={styles.collapseBadgeText}>{prendas.length}</Text>
        </View>
        <MaterialIcons
          name={prendasOpen ? 'expand-less' : 'expand-more'}
          size={24}
          color={COLORS.textMuted}
        />
      </TouchableOpacity>

      {prendasOpen && (
        <View style={styles.collapseContent}>
          {prendas.map((p) =>
            editingPrenda === p.id ? (
              <Card key={p.id} style={styles.editCard}>
                <View style={styles.editHeader}>
                  <MaterialIcons name="edit" size={16} color={COLORS.primaryLight} />
                  <Text style={styles.editHeaderText}>Editando {p.nombre}</Text>
                </View>
                <TextInput style={styles.editInput} value={editPrendaData.nombre}
                  onChangeText={(v) => setEditPrendaData({ ...editPrendaData, nombre: v })}
                  placeholder="Nombre" placeholderTextColor={COLORS.textMuted} />
                <View style={styles.editRow}>
                  <TextInput style={[styles.editInput, { flex: 1 }]} value={editPrendaData.minutos}
                    onChangeText={(v) => setEditPrendaData({ ...editPrendaData, minutos: v })}
                    placeholder="Minutos" placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" />
                  <TextInput style={[styles.editInput, { flex: 1 }]} value={editPrendaData.insumos}
                    onChangeText={(v) => setEditPrendaData({ ...editPrendaData, insumos: v })}
                    placeholder="Insumos $" placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" />
                </View>
                <View style={styles.editActions}>
                  <Button title="Cancelar" variant="ghost" onPress={() => setEditingPrenda(null)} style={{ flex: 1 }} />
                  <Button title="Guardar" icon="check" onPress={saveEditP} style={{ flex: 1 }} />
                </View>
              </Card>
            ) : (
              <Card key={p.id}>
                <View style={styles.itemRow}>
                  <View style={styles.itemIconWrap}>
                    <MaterialIcons name="checkroom" size={18} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{p.nombre}</Text>
                    <Text style={styles.itemDetail}>{p.minutos} min | Insumos: ${p.insumos}</Text>
                  </View>
                  <TouchableOpacity style={styles.editTag} onPress={() => startEditP(p)}>
                    <MaterialIcons name="edit" size={12} color={COLORS.primaryLight} />
                    <Text style={styles.editTagText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); deletePrenda(p.id, p.nombre); }}
                    style={styles.deleteCircle}
                  >
                    <MaterialIcons name="close" size={14} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </Card>
            ),
          )}

          <Card style={styles.addCard}>
            <View style={styles.addHeader}>
              <MaterialIcons name="add-circle" size={16} color={COLORS.success} />
              <Text style={styles.addHeaderText}>Nueva prenda</Text>
            </View>
            <TextInput style={styles.addInput} placeholder="Nombre" placeholderTextColor={COLORS.textMuted}
              value={np.nombre} onChangeText={(v) => setNp({ ...np, nombre: v })} />
            <View style={styles.addRow}>
              <TextInput style={[styles.addInput, { flex: 1 }]} placeholder="Minutos" placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad" value={np.minutos} onChangeText={(v) => setNp({ ...np, minutos: v })} />
              <TextInput style={[styles.addInput, { flex: 1 }]} placeholder="Insumos $" placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad" value={np.insumos} onChangeText={(v) => setNp({ ...np, insumos: v })} />
            </View>
            <Button title="+ Agregar prenda" icon="add" variant="success" onPress={addPrenda} />
          </Card>
        </View>
      )}

      {/* === TEJIDOS === */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setTejidosOpen(!tejidosOpen)}
        style={styles.collapseHeader}
      >
        <View style={styles.collapseLeft}>
          <View style={[styles.collapseIconWrap, { backgroundColor: COLORS.warningSoft }]}>
            <MaterialIcons name="texture" size={20} color={COLORS.warning} />
          </View>
          <View>
            <Text style={styles.collapseTitle}>Tejidos</Text>
            <Text style={styles.collapseCount}>{tejidos.length} configurados</Text>
          </View>
        </View>
        <View style={[styles.collapseBadge, { backgroundColor: COLORS.warningSoft }]}>
          <Text style={[styles.collapseBadgeText, { color: COLORS.warning }]}>{tejidos.length}</Text>
        </View>
        <MaterialIcons
          name={tejidosOpen ? 'expand-less' : 'expand-more'}
          size={24}
          color={COLORS.textMuted}
        />
      </TouchableOpacity>

      {tejidosOpen && (
        <View style={styles.collapseContent}>
          {tejidos.map((t) =>
            editingTejido === t.id ? (
              <Card key={t.id} style={styles.editCard}>
                <View style={styles.editHeader}>
                  <MaterialIcons name="edit" size={16} color={COLORS.primaryLight} />
                  <Text style={styles.editHeaderText}>Editando {t.nombre}</Text>
                </View>
                <TextInput style={styles.editInput} value={editTejidoData.nombre}
                  onChangeText={(v) => setEditTejidoData({ ...editTejidoData, nombre: v })}
                  placeholder="Nombre" placeholderTextColor={COLORS.textMuted} />
                <View style={styles.tipoRow}>
                  <Chip label="Punto" selected={editTejidoData.tipo === 'punto'} icon="grain"
                    onPress={() => setEditTejidoData({ ...editTejidoData, tipo: 'punto' })} />
                  <Chip label="Plano" selected={editTejidoData.tipo === 'plano'} icon="view-stream"
                    onPress={() => setEditTejidoData({ ...editTejidoData, tipo: 'plano' })} />
                </View>
                <TextInput style={styles.editInput} value={editTejidoData.precio}
                  onChangeText={(v) => setEditTejidoData({ ...editTejidoData, precio: v })}
                  placeholder={editTejidoData.tipo === 'punto' ? 'Precio $/kg' : 'Precio $/m'}
                  placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" />
                <View style={styles.editActions}>
                  <Button title="Cancelar" variant="ghost" onPress={() => setEditingTejido(null)} style={{ flex: 1 }} />
                  <Button title="Guardar" icon="check" onPress={saveEditT} style={{ flex: 1 }} />
                </View>
              </Card>
            ) : (
              <Card key={t.id}>
                <View style={styles.itemRow}>
                  <View style={[styles.itemIconWrap, { backgroundColor: COLORS.warningSoft }]}>
                    <MaterialIcons name="texture" size={18} color={COLORS.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{t.nombre}</Text>
                    <Text style={styles.itemDetail}>
                      {t.tipo === 'punto' ? 'Punto' : 'Plano'} | ${t.precio}/{t.tipo === 'punto' ? 'kg' : 'm'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.editTag} onPress={() => startEditT(t)}>
                    <MaterialIcons name="edit" size={12} color={COLORS.primaryLight} />
                    <Text style={styles.editTagText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); deleteTejido(t.id, t.nombre); }}
                    style={styles.deleteCircle}
                  >
                    <MaterialIcons name="close" size={14} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </Card>
            ),
          )}

          <Card style={styles.addCard}>
            <View style={styles.addHeader}>
              <MaterialIcons name="add-circle" size={16} color={COLORS.success} />
              <Text style={styles.addHeaderText}>Nuevo tejido</Text>
            </View>
            <TextInput style={styles.addInput} placeholder="Nombre" placeholderTextColor={COLORS.textMuted}
              value={nt.nombre} onChangeText={(v) => setNt({ ...nt, nombre: v })} />
            <View style={styles.tipoRow}>
              <Chip label="Punto" selected={nt.tipo === 'punto'} icon="grain"
                onPress={() => setNt({ ...nt, tipo: 'punto' })} />
              <Chip label="Plano" selected={nt.tipo === 'plano'} icon="view-stream"
                onPress={() => setNt({ ...nt, tipo: 'plano' })} />
            </View>
            <TextInput style={styles.addInput}
              placeholder={nt.tipo === 'punto' ? 'Precio $/kg' : 'Precio $/m'}
              placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad"
              value={nt.precio} onChangeText={(v) => setNt({ ...nt, precio: v })} />
            <Button title="+ Agregar tejido" icon="add" variant="success" onPress={addTejido} />
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 60 },
  // Costo minuto
  costoRow: { flexDirection: 'row', alignItems: 'center' },
  costoIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryGhost,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  costoInput: { flex: 1, fontSize: 24, fontWeight: '700', color: COLORS.text, paddingVertical: 4 },
  costoSuffix: { fontSize: 16, color: COLORS.textMuted, fontWeight: '500' },
  // Collapsible header
  collapseHeader: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgWhite,
    borderRadius: RADIUS.lg, padding: 14, marginTop: 20, marginBottom: 4,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  collapseLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  collapseIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  collapseTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  collapseCount: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  collapseBadge: {
    backgroundColor: COLORS.primarySoft, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2, marginRight: 8,
  },
  collapseBadgeText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  collapseContent: { marginTop: 8 },
  // Items
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryGhost,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  itemName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  itemDetail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  editTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryGhost, marginRight: 8,
  },
  editTagText: { fontSize: 11, color: COLORS.primaryLight, fontWeight: '600' },
  deleteCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.dangerSoft,
    justifyContent: 'center', alignItems: 'center',
  },
  // Edit form
  editCard: { borderWidth: 2, borderColor: COLORS.primaryLight, gap: 8 },
  editHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  editHeaderText: { fontSize: 13, fontWeight: '600', color: COLORS.primaryLight },
  editInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10,
    fontSize: 15, backgroundColor: COLORS.primaryGhost, color: COLORS.text,
  },
  editRow: { flexDirection: 'row', gap: 8 },
  editActions: { flexDirection: 'row', gap: 8 },
  // Add form
  addCard: { borderStyle: 'dashed', borderWidth: 1.5, borderColor: COLORS.border, gap: 8 },
  addHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  addHeaderText: { fontSize: 13, fontWeight: '600', color: COLORS.success },
  addInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10,
    fontSize: 15, backgroundColor: COLORS.bgWhite, color: COLORS.text,
  },
  addRow: { flexDirection: 'row', gap: 8 },
  tipoRow: { flexDirection: 'row', gap: 8 },
});
