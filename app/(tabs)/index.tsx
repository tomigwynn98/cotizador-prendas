import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import {
  Prenda, Tejido, LineaCotizacion, getPrendas, getTejidos, getCostoMinuto,
  calcularCotizacion, setCotizacionActual, saveCotizacion, formatARS,
  getConsumo, saveConsumo, getMargenDefault, precioSugerido,
} from '@/lib/storage';
import { COLORS, RADIUS } from '@/lib/theme';
import { Button, Card, Chip, SectionHeader, PageHeader, EmptyState, Row, Divider } from '@/components/ui-kit';
import { showToast } from '@/components/toast';

const CANTIDADES_RAPIDAS = [50, 100, 200, 500];

interface LineaUI extends LineaCotizacion {
  _key: string;
  _prendaNombre: string;
  _tejidoNombre: string;
  _unidad: string;
  _subtotal: number;
}

export default function CotizarScreen() {
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [tejidos, setTejidos] = useState<Tejido[]>([]);
  const [costoMinuto, setCostoMinuto] = useState(0);
  const [margenDefault, setMargenDefault] = useState(40);
  const [selectedPrenda, setSelectedPrenda] = useState<string | null>(null);
  const [selectedTejido, setSelectedTejido] = useState<string | null>(null);
  const [consumo, setConsumo] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [lineas, setLineas] = useState<LineaUI[]>([]);
  const [consumoAutoLoaded, setConsumoAutoLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [p, t, cm, md] = await Promise.all([
          getPrendas(), getTejidos(), getCostoMinuto(), getMargenDefault(),
        ]);
        setPrendas(p);
        setTejidos(t);
        setCostoMinuto(cm);
        setMargenDefault(md);
      })();
    }, []),
  );

  // Autocomplete consumo cuando se selecciona prenda+tejido
  useEffect(() => {
    if (!selectedPrenda || !selectedTejido) {
      setConsumoAutoLoaded(false);
      return;
    }
    (async () => {
      const saved = await getConsumo(selectedPrenda, selectedTejido);
      if (saved !== null) {
        setConsumo(saved.toString());
        setConsumoAutoLoaded(true);
      } else {
        setConsumoAutoLoaded(false);
      }
    })();
  }, [selectedPrenda, selectedTejido]);

  const tejidoSel = tejidos.find((t) => t.id === selectedTejido);
  const unidad = tejidoSel?.tipo === 'plano' ? 'm' : 'kg';

  // Cálculo en vivo
  const liveCalc = (() => {
    if (!selectedPrenda || !selectedTejido) return null;
    const c = parseFloat(consumo), q = parseInt(cantidad, 10);
    if (!c || c <= 0 || !q || q <= 0) return null;
    const p = prendas.find((x) => x.id === selectedPrenda);
    const t = tejidos.find((x) => x.id === selectedTejido);
    if (!p || !t) return null;
    const costoTejido = c * t.precio;
    const confeccion = p.minutos * costoMinuto;
    const costoUnitario = costoTejido + confeccion + p.insumos;
    const subtotal = costoUnitario * q;
    const precioUnit = precioSugerido(costoUnitario, margenDefault);
    return { costoTejido, confeccion, insumos: p.insumos, costoUnitario, subtotal, precioUnit, precioTotal: precioUnit * q };
  })();

  const handleSelectPrenda = (id: string) => {
    setSelectedPrenda(id);
    setConsumo('');
  };

  const handleSelectTejido = (id: string) => {
    setSelectedTejido(id);
    setConsumo('');
  };

  const handleCantidadRapida = (q: number) => {
    setCantidad(q.toString());
  };

  const handleAgregar = async () => {
    if (!selectedPrenda || !selectedTejido) return showToast('Selecciona prenda y tejido', 'error');
    const c = parseFloat(consumo), q = parseInt(cantidad, 10);
    if (!c || c <= 0) return showToast('Consumo invalido', 'error');
    if (!q || q <= 0) return showToast('Cantidad invalida', 'error');

    // Guardar consumo para próxima vez
    await saveConsumo(selectedPrenda, selectedTejido, c);

    const p = prendas.find((x) => x.id === selectedPrenda)!;
    const t = tejidos.find((x) => x.id === selectedTejido)!;
    const subtotal = (c * t.precio + p.minutos * costoMinuto + p.insumos) * q;

    setLineas([...lineas, {
      _key: Date.now().toString(), prendaId: selectedPrenda, tejidoId: selectedTejido,
      consumo: c, cantidad: q, _prendaNombre: p.nombre, _tejidoNombre: t.nombre,
      _unidad: t.tipo === 'punto' ? 'kg' : 'm', _subtotal: subtotal,
    }]);
    setConsumo('');
    setCantidad('');
    setSelectedPrenda(null);
    setSelectedTejido(null);
    showToast(`${p.nombre} + ${t.nombre} agregado`);
  };

  const handleCotizar = async () => {
    if (lineas.length === 0) return showToast('Agrega al menos una prenda', 'error');
    const cot = calcularCotizacion(lineas, prendas, tejidos, costoMinuto, margenDefault);
    if (!cot) return showToast('Error al calcular', 'error');
    await setCotizacionActual(cot);
    await saveCotizacion(cot);
    showToast('Cotizacion guardada en historial');
  };

  const totalPedido = lineas.reduce((s, l) => s + l._subtotal, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader
        icon="calculate"
        title="Cotizar"
        subtitle={lineas.length > 0 ? `${lineas.length} items en el pedido` : 'Cotiza en segundos'}
      />

      {/* Form principal */}
      <Card>
        {/* Prenda */}
        <Text style={styles.fieldLabel}>
          <MaterialIcons name="checkroom" size={14} color={COLORS.primaryLight} /> Prenda
        </Text>
        <View style={styles.chipsRow}>
          {prendas.map((p) => (
            <Chip key={p.id} label={p.nombre} selected={selectedPrenda === p.id}
              onPress={() => handleSelectPrenda(p.id)} />
          ))}
        </View>
        {prendas.length === 0 && (
          <Text style={styles.hint}>Configura prendas en la tab Config</Text>
        )}

        {/* Tejido */}
        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
          <MaterialIcons name="texture" size={14} color={COLORS.primaryLight} /> Tejido
        </Text>
        <View style={styles.chipsRow}>
          {tejidos.map((t) => (
            <Chip key={t.id} label={t.nombre} sublabel={t.tipo === 'punto' ? 'Punto' : 'Plano'}
              selected={selectedTejido === t.id} onPress={() => handleSelectTejido(t.id)} />
          ))}
        </View>

        {/* Consumo */}
        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
          <MaterialIcons name="straighten" size={14} color={COLORS.primaryLight} /> Consumo ({unidad})
          {consumoAutoLoaded && (
            <Text style={styles.autoTag}> (memorizado)</Text>
          )}
        </Text>
        <TextInput style={[styles.input, consumoAutoLoaded && styles.inputAuto]}
          keyboardType="decimal-pad" placeholder={`Ej: 0.35`}
          placeholderTextColor={COLORS.textMuted} value={consumo} onChangeText={(v) => { setConsumo(v); setConsumoAutoLoaded(false); }} />

        {/* Cantidad - botones rápidos */}
        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
          <MaterialIcons name="inventory" size={14} color={COLORS.primaryLight} /> Cantidad
        </Text>
        <View style={styles.cantidadRow}>
          {CANTIDADES_RAPIDAS.map((q) => (
            <TouchableOpacity
              key={q}
              style={[styles.cantChip, cantidad === q.toString() && styles.cantChipSelected]}
              onPress={() => handleCantidadRapida(q)}
            >
              <Text style={[styles.cantChipText, cantidad === q.toString() && styles.cantChipTextSel]}>{q}</Text>
            </TouchableOpacity>
          ))}
          <TextInput style={[styles.input, styles.cantInput]}
            keyboardType="number-pad" placeholder="Otra"
            placeholderTextColor={COLORS.textMuted} value={
              CANTIDADES_RAPIDAS.includes(parseInt(cantidad)) ? '' : cantidad
            }
            onChangeText={setCantidad} />
        </View>

        {/* Resultado en vivo */}
        {liveCalc && (
          <View style={styles.liveResult}>
            <View style={styles.liveHeader}>
              <MaterialIcons name="flash-on" size={16} color={COLORS.primary} />
              <Text style={styles.liveTitle}>Resultado instantaneo</Text>
            </View>
            <Row icon="texture" label="Tejido" value={formatARS(liveCalc.costoTejido)} />
            <Row icon="precision-manufacturing" label="Confeccion" value={formatARS(liveCalc.confeccion)} />
            <Row icon="category" label="Insumos" value={formatARS(liveCalc.insumos)} />
            <Divider />
            <Row icon="functions" label="Costo unitario" value={formatARS(liveCalc.costoUnitario)} bold />
            <Row icon="inventory" label={`Subtotal (x${cantidad})`} value={formatARS(liveCalc.subtotal)} bold />
            <Divider />
            <View style={styles.precioRow}>
              <MaterialIcons name="sell" size={16} color={COLORS.primary} />
              <Text style={styles.precioLabel}>Precio de venta ({margenDefault}%)</Text>
              <Text style={styles.precioValue}>{formatARS(liveCalc.precioUnit)}/u</Text>
            </View>
            <View style={[styles.precioRow, styles.precioTotal]}>
              <MaterialIcons name="star" size={16} color="#fff" />
              <Text style={styles.precioTotalLabel}>TOTAL</Text>
              <Text style={styles.precioTotalValue}>{formatARS(liveCalc.precioTotal)}</Text>
            </View>
          </View>
        )}

        <Button title="+ Agregar al pedido" icon="add" variant="dashed" onPress={handleAgregar}
          style={{ marginTop: 12 }} />
      </Card>

      {/* Líneas del pedido */}
      {lineas.length > 0 && (
        <>
          <SectionHeader icon="shopping-cart" title="Pedido" subtitle={`${lineas.length} items`} />
          {lineas.map((l) => (
            <Card key={l._key} style={{ marginBottom: 6 }}>
              <View style={styles.lineaRow}>
                <View style={styles.lineaIconWrap}>
                  <MaterialIcons name="checkroom" size={20} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineaName}>{l._prendaNombre} + {l._tejidoNombre}</Text>
                  <Text style={styles.lineaDetail}>
                    {l.consumo} {l._unidad}/u x {l.cantidad} u = {formatARS(l._subtotal)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setLineas(lineas.filter((x) => x._key !== l._key))}
                  style={styles.removeBtn}
                >
                  <MaterialIcons name="close" size={14} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </Card>
          ))}
          <Card accent>
            <View style={styles.totalRow}>
              <MaterialIcons name="receipt-long" size={18} color={COLORS.primary} />
              <Text style={styles.totalLabel}>Total pedido</Text>
              <Text style={styles.totalValue}>{formatARS(totalPedido)}</Text>
            </View>
          </Card>
          <Button
            title={`Guardar cotizacion (${lineas.length} items)`}
            icon="save"
            onPress={handleCotizar}
            style={{ marginTop: 4 }}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  autoTag: { fontSize: 11, color: COLORS.success, fontWeight: '700' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: 11, fontSize: 15, backgroundColor: COLORS.primaryGhost, color: COLORS.text,
  },
  inputAuto: { borderColor: COLORS.success, backgroundColor: COLORS.successSoft },
  hint: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  // Cantidad rápida
  cantidadRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  cantChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.bgWhite,
  },
  cantChipSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  cantChipText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  cantChipTextSel: { color: '#fff' },
  cantInput: { flex: 1, textAlign: 'center' },
  // Live result
  liveResult: {
    marginTop: 14, backgroundColor: COLORS.primaryGhost,
    borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.primarySoft,
  },
  liveHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  liveTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  precioRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4,
  },
  precioLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.primary },
  precioValue: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  precioTotal: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: 10, marginTop: 8,
  },
  precioTotalLabel: { flex: 1, fontSize: 13, fontWeight: '800', color: '#fff' },
  precioTotalValue: { fontSize: 17, fontWeight: '800', color: '#fff' },
  // Lineas
  lineaRow: { flexDirection: 'row', alignItems: 'center' },
  lineaIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryGhost,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  lineaName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  lineaDetail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  removeBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.dangerSoft,
    justifyContent: 'center', alignItems: 'center',
  },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  totalValue: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
});
