import { useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  Prenda,
  Tejido,
  TipoTejido,
  getPrendas,
  savePrendas,
  getTejidos,
  saveTejidos,
  getCostoMinuto,
  saveCostoMinuto,
  generateId,
} from '@/lib/storage';
import { showToast } from '@/components/toast';

export default function ConfigScreen() {
  const [costoMinuto, setCostoMinuto] = useState('');
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [tejidos, setTejidos] = useState<Tejido[]>([]);

  // Editing state
  const [editingPrenda, setEditingPrenda] = useState<string | null>(null);
  const [editPrendaData, setEditPrendaData] = useState({ nombre: '', minutos: '', insumos: '' });
  const [editingTejido, setEditingTejido] = useState<string | null>(null);
  const [editTejidoData, setEditTejidoData] = useState({ nombre: '', tipo: 'punto' as TipoTejido, precio: '' });

  // New item forms
  const [np, setNp] = useState({ nombre: '', minutos: '', insumos: '' });
  const [nt, setNt] = useState({ nombre: '', tipo: 'punto' as TipoTejido, precio: '' });

  // Autoguardado costo minuto
  const costoMinutoTimeout = useRef<ReturnType<typeof setTimeout>>();

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

  // --- Costo minuto con autoguardado ---
  const handleCostoMinutoChange = (val: string) => {
    setCostoMinuto(val);
    if (costoMinutoTimeout.current) clearTimeout(costoMinutoTimeout.current);
    costoMinutoTimeout.current = setTimeout(async () => {
      const num = parseFloat(val);
      if (num && num > 0) {
        await saveCostoMinuto(num);
        showToast(`Costo minuto: $${num}/min`);
      }
    }, 800);
  };

  // --- Prendas ---
  const handleAddPrenda = async () => {
    if (!np.nombre.trim()) return showToast('Ingresa un nombre', 'error');
    const minutos = parseFloat(np.minutos);
    const insumos = parseFloat(np.insumos);
    if (!minutos || minutos <= 0) return showToast('Minutos invalidos', 'error');
    if (isNaN(insumos) || insumos < 0) return showToast('Insumos invalidos', 'error');

    const nueva: Prenda = { id: generateId(), nombre: np.nombre.trim(), minutos, insumos };
    const updated = [...prendas, nueva];
    await savePrendas(updated);
    setPrendas(updated);
    setNp({ nombre: '', minutos: '', insumos: '' });
    showToast(`${nueva.nombre} agregada`);
  };

  const handleDeletePrenda = (id: string, nombre: string) => {
    Alert.alert('Eliminar prenda', `Seguro que queres eliminar "${nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          const updated = prendas.filter((p) => p.id !== id);
          await savePrendas(updated);
          setPrendas(updated);
          showToast(`${nombre} eliminada`);
        },
      },
    ]);
  };

  const startEditPrenda = (p: Prenda) => {
    setEditingPrenda(p.id);
    setEditPrendaData({ nombre: p.nombre, minutos: p.minutos.toString(), insumos: p.insumos.toString() });
  };

  const handleSavePrenda = async () => {
    if (!editingPrenda) return;
    const minutos = parseFloat(editPrendaData.minutos);
    const insumos = parseFloat(editPrendaData.insumos);
    if (!editPrendaData.nombre.trim()) return showToast('Nombre requerido', 'error');
    if (!minutos || minutos <= 0) return showToast('Minutos invalidos', 'error');
    if (isNaN(insumos) || insumos < 0) return showToast('Insumos invalidos', 'error');

    const updated = prendas.map((p) =>
      p.id === editingPrenda ? { ...p, nombre: editPrendaData.nombre.trim(), minutos, insumos } : p,
    );
    await savePrendas(updated);
    setPrendas(updated);
    setEditingPrenda(null);
    showToast('Prenda actualizada');
  };

  // --- Tejidos ---
  const handleAddTejido = async () => {
    if (!nt.nombre.trim()) return showToast('Ingresa un nombre', 'error');
    const precio = parseFloat(nt.precio);
    if (!precio || precio <= 0) return showToast('Precio invalido', 'error');

    const nuevo: Tejido = { id: generateId(), nombre: nt.nombre.trim(), tipo: nt.tipo, precio };
    const updated = [...tejidos, nuevo];
    await saveTejidos(updated);
    setTejidos(updated);
    setNt({ nombre: '', tipo: 'punto', precio: '' });
    showToast(`${nuevo.nombre} agregado`);
  };

  const handleDeleteTejido = (id: string, nombre: string) => {
    Alert.alert('Eliminar tejido', `Seguro que queres eliminar "${nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          const updated = tejidos.filter((t) => t.id !== id);
          await saveTejidos(updated);
          setTejidos(updated);
          showToast(`${nombre} eliminado`);
        },
      },
    ]);
  };

  const startEditTejido = (t: Tejido) => {
    setEditingTejido(t.id);
    setEditTejidoData({ nombre: t.nombre, tipo: t.tipo, precio: t.precio.toString() });
  };

  const handleSaveTejido = async () => {
    if (!editingTejido) return;
    const precio = parseFloat(editTejidoData.precio);
    if (!editTejidoData.nombre.trim()) return showToast('Nombre requerido', 'error');
    if (!precio || precio <= 0) return showToast('Precio invalido', 'error');

    const updated = tejidos.map((t) =>
      t.id === editingTejido
        ? { ...t, nombre: editTejidoData.nombre.trim(), tipo: editTejidoData.tipo, precio }
        : t,
    );
    await saveTejidos(updated);
    setTejidos(updated);
    setEditingTejido(null);
    showToast('Tejido actualizado');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Costo minuto */}
      <Text style={styles.sectionTitle}>Costo minuto de fabrica</Text>
      <View style={styles.rowInput}>
        <Text style={styles.prefix}>$</Text>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          keyboardType="decimal-pad"
          value={costoMinuto}
          onChangeText={handleCostoMinutoChange}
          placeholder="15"
          placeholderTextColor="#999"
        />
        <Text style={styles.suffix}>/min</Text>
      </View>
      <Text style={styles.autoSaveHint}>Se guarda automaticamente</Text>

      {/* Prendas */}
      <Text style={styles.sectionTitle}>Prendas</Text>
      {prendas.map((p) =>
        editingPrenda === p.id ? (
          <View key={p.id} style={styles.editForm}>
            <TextInput
              style={styles.editInput}
              value={editPrendaData.nombre}
              onChangeText={(v) => setEditPrendaData({ ...editPrendaData, nombre: v })}
              placeholder="Nombre"
              placeholderTextColor="#999"
            />
            <View style={styles.editRow}>
              <TextInput
                style={[styles.editInput, { flex: 1 }]}
                value={editPrendaData.minutos}
                onChangeText={(v) => setEditPrendaData({ ...editPrendaData, minutos: v })}
                placeholder="Minutos"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.editInput, { flex: 1 }]}
                value={editPrendaData.insumos}
                onChangeText={(v) => setEditPrendaData({ ...editPrendaData, insumos: v })}
                placeholder="Insumos $"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingPrenda(null)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveEditBtn} onPress={handleSavePrenda}>
                <Text style={styles.saveEditBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity key={p.id} style={styles.listItem} onPress={() => startEditPrenda(p)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listName}>{p.nombre}</Text>
              <Text style={styles.listDetail}>{p.minutos} min | Insumos: ${p.insumos}</Text>
            </View>
            <Text style={styles.editHint}>Editar</Text>
            <TouchableOpacity
              onPress={() => handleDeletePrenda(p.id, p.nombre)}
              style={styles.deleteBtn}
              hitSlop={4}
            >
              <Text style={styles.deleteBtnText}>X</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ),
      )}

      <View style={styles.addForm}>
        <Text style={styles.addFormTitle}>Nueva prenda</Text>
        <TextInput
          style={styles.inputSmall}
          placeholder="Nombre"
          placeholderTextColor="#999"
          value={np.nombre}
          onChangeText={(v) => setNp({ ...np, nombre: v })}
        />
        <View style={styles.addFormRow}>
          <TextInput
            style={[styles.inputSmall, { flex: 1 }]}
            placeholder="Minutos"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
            value={np.minutos}
            onChangeText={(v) => setNp({ ...np, minutos: v })}
          />
          <TextInput
            style={[styles.inputSmall, { flex: 1 }]}
            placeholder="Insumos $"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
            value={np.insumos}
            onChangeText={(v) => setNp({ ...np, insumos: v })}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddPrenda}>
          <Text style={styles.addBtnText}>+ Agregar prenda</Text>
        </TouchableOpacity>
      </View>

      {/* Tejidos */}
      <Text style={styles.sectionTitle}>Tejidos</Text>
      {tejidos.map((t) =>
        editingTejido === t.id ? (
          <View key={t.id} style={styles.editForm}>
            <TextInput
              style={styles.editInput}
              value={editTejidoData.nombre}
              onChangeText={(v) => setEditTejidoData({ ...editTejidoData, nombre: v })}
              placeholder="Nombre"
              placeholderTextColor="#999"
            />
            <View style={styles.tipoRow}>
              <TouchableOpacity
                style={[styles.tipoBtn, editTejidoData.tipo === 'punto' && styles.tipoBtnSel]}
                onPress={() => setEditTejidoData({ ...editTejidoData, tipo: 'punto' })}
              >
                <Text style={[styles.tipoBtnText, editTejidoData.tipo === 'punto' && styles.tipoBtnTextSel]}>Punto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tipoBtn, editTejidoData.tipo === 'plano' && styles.tipoBtnSel]}
                onPress={() => setEditTejidoData({ ...editTejidoData, tipo: 'plano' })}
              >
                <Text style={[styles.tipoBtnText, editTejidoData.tipo === 'plano' && styles.tipoBtnTextSel]}>Plano</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.editInput}
              value={editTejidoData.precio}
              onChangeText={(v) => setEditTejidoData({ ...editTejidoData, precio: v })}
              placeholder={editTejidoData.tipo === 'punto' ? 'Precio $/kg' : 'Precio $/m'}
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingTejido(null)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveEditBtn} onPress={handleSaveTejido}>
                <Text style={styles.saveEditBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity key={t.id} style={styles.listItem} onPress={() => startEditTejido(t)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listName}>{t.nombre}</Text>
              <Text style={styles.listDetail}>
                {t.tipo === 'punto' ? 'Punto' : 'Plano'} | ${t.precio}/{t.tipo === 'punto' ? 'kg' : 'm'}
              </Text>
            </View>
            <Text style={styles.editHint}>Editar</Text>
            <TouchableOpacity
              onPress={() => handleDeleteTejido(t.id, t.nombre)}
              style={styles.deleteBtn}
              hitSlop={4}
            >
              <Text style={styles.deleteBtnText}>X</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ),
      )}

      <View style={styles.addForm}>
        <Text style={styles.addFormTitle}>Nuevo tejido</Text>
        <TextInput
          style={styles.inputSmall}
          placeholder="Nombre"
          placeholderTextColor="#999"
          value={nt.nombre}
          onChangeText={(v) => setNt({ ...nt, nombre: v })}
        />
        <View style={styles.tipoRow}>
          <TouchableOpacity
            style={[styles.tipoBtn, nt.tipo === 'punto' && styles.tipoBtnSel]}
            onPress={() => setNt({ ...nt, tipo: 'punto' })}
          >
            <Text style={[styles.tipoBtnText, nt.tipo === 'punto' && styles.tipoBtnTextSel]}>Punto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tipoBtn, nt.tipo === 'plano' && styles.tipoBtnSel]}
            onPress={() => setNt({ ...nt, tipo: 'plano' })}
          >
            <Text style={[styles.tipoBtnText, nt.tipo === 'plano' && styles.tipoBtnTextSel]}>Plano</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.inputSmall}
          placeholder={nt.tipo === 'punto' ? 'Precio $/kg' : 'Precio $/m'}
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
          value={nt.precio}
          onChangeText={(v) => setNt({ ...nt, precio: v })}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAddTejido}>
          <Text style={styles.addBtnText}>+ Agregar tejido</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  content: { padding: 20, paddingBottom: 60 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginTop: 24, marginBottom: 10 },
  rowInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1.5, borderColor: '#ddd' },
  prefix: { fontSize: 18, fontWeight: '600', color: '#555', paddingLeft: 12 },
  suffix: { fontSize: 14, color: '#888', paddingRight: 12 },
  input: { padding: 12, fontSize: 18, color: '#333', fontWeight: '600' },
  autoSaveHint: { fontSize: 11, color: '#aaa', marginTop: 4, fontStyle: 'italic' },
  listItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 10, padding: 12, marginBottom: 8,
  },
  listName: { fontSize: 15, fontWeight: '600', color: '#222' },
  listDetail: { fontSize: 13, color: '#777', marginTop: 2 },
  editHint: { fontSize: 12, color: '#0a7ea4', fontWeight: '500', marginRight: 10 },
  deleteBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#ff3b30',
    justifyContent: 'center', alignItems: 'center',
  },
  deleteBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  // Edit inline
  editForm: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 2, borderColor: '#0a7ea4', gap: 8,
  },
  editInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10,
    fontSize: 15, backgroundColor: '#f8f8f8', color: '#333',
  },
  editRow: { flexDirection: 'row', gap: 8 },
  editActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f0f0f0' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#666' },
  saveEditBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#0a7ea4' },
  saveEditBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  // Add form
  addForm: { backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 8, marginTop: 4 },
  addFormTitle: { fontSize: 14, fontWeight: '600', color: '#888', marginBottom: 2 },
  addFormRow: { flexDirection: 'row', gap: 8 },
  inputSmall: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10,
    fontSize: 15, backgroundColor: '#f8f8f8', color: '#333',
  },
  addBtn: { backgroundColor: '#34c759', borderRadius: 8, padding: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  tipoRow: { flexDirection: 'row', gap: 8 },
  tipoBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5,
    borderColor: '#ddd', alignItems: 'center', backgroundColor: '#f8f8f8',
  },
  tipoBtnSel: { borderColor: '#0a7ea4', backgroundColor: '#0a7ea4' },
  tipoBtnText: { fontSize: 14, fontWeight: '600', color: '#333' },
  tipoBtnTextSel: { color: '#fff' },
});
