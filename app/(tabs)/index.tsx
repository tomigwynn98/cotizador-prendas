import { useCallback, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import {
  Prenda,
  Tejido,
  LineaCotizacion,
  getPrendas,
  getTejidos,
  getCostoMinuto,
  calcularCotizacion,
  setCotizacionActual,
  saveCotizacion,
  formatARS,
} from '@/lib/storage';
import { showToast } from '@/components/toast';

interface LineaUI extends LineaCotizacion {
  _key: string;
  _prendaNombre: string;
  _tejidoNombre: string;
  _unidad: string;
}

export default function CotizarScreen() {
  const router = useRouter();

  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [tejidos, setTejidos] = useState<Tejido[]>([]);
  const [costoMinuto, setCostoMinuto] = useState(0);

  // Form para agregar línea
  const [selectedPrenda, setSelectedPrenda] = useState<string | null>(null);
  const [selectedTejido, setSelectedTejido] = useState<string | null>(null);
  const [consumo, setConsumo] = useState('');
  const [cantidad, setCantidad] = useState('');

  // Líneas agregadas
  const [lineas, setLineas] = useState<LineaUI[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [p, t, cm] = await Promise.all([getPrendas(), getTejidos(), getCostoMinuto()]);
        setPrendas(p);
        setTejidos(t);
        setCostoMinuto(cm);
      })();
    }, []),
  );

  const tejidoSeleccionado = tejidos.find((t) => t.id === selectedTejido);
  const unidadConsumo = tejidoSeleccionado?.tipo === 'plano' ? 'm' : 'kg';

  const handleAgregarLinea = () => {
    if (!selectedPrenda || !selectedTejido) {
      return showToast('Selecciona prenda y tejido', 'error');
    }
    const consumoNum = parseFloat(consumo);
    const cantidadNum = parseInt(cantidad, 10);
    if (!consumoNum || consumoNum <= 0) {
      return showToast('Consumo invalido', 'error');
    }
    if (!cantidadNum || cantidadNum <= 0) {
      return showToast('Cantidad invalida', 'error');
    }

    const prenda = prendas.find((p) => p.id === selectedPrenda)!;
    const tejido = tejidos.find((t) => t.id === selectedTejido)!;

    const nueva: LineaUI = {
      _key: Date.now().toString(),
      prendaId: selectedPrenda,
      tejidoId: selectedTejido,
      consumo: consumoNum,
      cantidad: cantidadNum,
      _prendaNombre: prenda.nombre,
      _tejidoNombre: tejido.nombre,
      _unidad: tejido.tipo === 'punto' ? 'kg' : 'm',
    };

    setLineas([...lineas, nueva]);
    setConsumo('');
    setCantidad('');
    showToast(`${prenda.nombre} + ${tejido.nombre} agregado`);
  };

  const handleRemoveLinea = (key: string) => {
    setLineas(lineas.filter((l) => l._key !== key));
  };

  const handleCotizar = async () => {
    if (lineas.length === 0) {
      return showToast('Agrega al menos una prenda', 'error');
    }

    const cotizacion = calcularCotizacion(lineas, prendas, tejidos, costoMinuto, 40);
    if (!cotizacion) {
      return showToast('Error al calcular', 'error');
    }

    await setCotizacionActual(cotizacion);
    await saveCotizacion(cotizacion);

    router.navigate('/resultado');
  };

  // Preview del costo rápido de la línea actual
  const previewCosto = (() => {
    if (!selectedPrenda || !selectedTejido) return null;
    const consumoNum = parseFloat(consumo);
    const cantidadNum = parseInt(cantidad, 10);
    if (!consumoNum || !cantidadNum) return null;
    const prenda = prendas.find((p) => p.id === selectedPrenda);
    const tejido = tejidos.find((t) => t.id === selectedTejido);
    if (!prenda || !tejido) return null;
    const costoTejido = consumoNum * tejido.precio;
    const confeccion = prenda.minutos * costoMinuto;
    const unitario = costoTejido + confeccion + prenda.insumos;
    return unitario * cantidadNum;
  })();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Líneas agregadas */}
      {lineas.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Pedido ({lineas.length} {lineas.length === 1 ? 'item' : 'items'})</Text>
          {lineas.map((l) => (
            <View key={l._key} style={styles.lineaItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineaName}>{l._prendaNombre} + {l._tejidoNombre}</Text>
                <Text style={styles.lineaDetail}>
                  {l.consumo} {l._unidad}/u x {l.cantidad} unidades
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveLinea(l._key)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.divider} />
        </>
      )}

      {/* Form para agregar */}
      <Text style={styles.sectionTitle}>Agregar prenda al pedido</Text>

      <Text style={styles.label}>Prenda</Text>
      <View style={styles.optionsRow}>
        {prendas.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.chip, selectedPrenda === p.id && styles.chipSelected]}
            onPress={() => setSelectedPrenda(p.id)}
          >
            <Text style={[styles.chipText, selectedPrenda === p.id && styles.chipTextSelected]}>
              {p.nombre}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {prendas.length === 0 && (
        <Text style={styles.hint}>No hay prendas. Configuralas en la tab Config.</Text>
      )}

      <Text style={styles.label}>Tejido</Text>
      <View style={styles.optionsRow}>
        {tejidos.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.chip, selectedTejido === t.id && styles.chipSelected]}
            onPress={() => setSelectedTejido(t.id)}
          >
            <Text style={[styles.chipText, selectedTejido === t.id && styles.chipTextSelected]}>
              {t.nombre}
            </Text>
            <Text style={[styles.chipSub, selectedTejido === t.id && styles.chipTextSelected]}>
              {t.tipo === 'punto' ? 'Punto' : 'Plano'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Consumo ({unidadConsumo})</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder={`Ej: 0.35`}
            placeholderTextColor="#999"
            value={consumo}
            onChangeText={setConsumo}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Cantidad</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="Ej: 100"
            placeholderTextColor="#999"
            value={cantidad}
            onChangeText={setCantidad}
          />
        </View>
      </View>

      {previewCosto !== null && (
        <Text style={styles.preview}>Subtotal estimado: {formatARS(previewCosto)}</Text>
      )}

      <TouchableOpacity style={styles.addButton} onPress={handleAgregarLinea}>
        <Text style={styles.addButtonText}>+ Agregar al pedido</Text>
      </TouchableOpacity>

      {/* Botón cotizar */}
      {lineas.length > 0 && (
        <TouchableOpacity style={styles.cotizarButton} onPress={handleCotizar}>
          <Text style={styles.cotizarButtonText}>Cotizar pedido ({lineas.length} items)</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginTop: 14, marginBottom: 6 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#f8f8f8', alignItems: 'center',
  },
  chipSelected: { borderColor: '#0a7ea4', backgroundColor: '#0a7ea4' },
  chipText: { fontSize: 14, fontWeight: '500', color: '#333' },
  chipTextSelected: { color: '#fff' },
  chipSub: { fontSize: 10, color: '#888', marginTop: 1 },
  inputRow: { flexDirection: 'row', gap: 12 },
  input: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8,
    padding: 11, fontSize: 15, backgroundColor: '#f8f8f8', color: '#333',
  },
  preview: { fontSize: 13, color: '#0a7ea4', fontWeight: '600', marginTop: 8 },
  addButton: {
    backgroundColor: '#f0f0f0', borderRadius: 10, padding: 14,
    alignItems: 'center', marginTop: 16, borderWidth: 1.5, borderColor: '#ddd', borderStyle: 'dashed',
  },
  addButtonText: { color: '#0a7ea4', fontSize: 15, fontWeight: '700' },
  cotizarButton: {
    backgroundColor: '#0a7ea4', borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 20,
  },
  cotizarButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  lineaItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f8fb',
    borderRadius: 8, padding: 10, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: '#0a7ea4',
  },
  lineaName: { fontSize: 14, fontWeight: '600', color: '#222' },
  lineaDetail: { fontSize: 12, color: '#666', marginTop: 2 },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#ff3b30',
    justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  removeBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 16 },
  hint: { fontSize: 13, color: '#999', fontStyle: 'italic', marginTop: 4 },
});
