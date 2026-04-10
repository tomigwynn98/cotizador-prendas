import { useCallback, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TextInput } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import {
  Prenda, Tejido, LineaCotizacion, getPrendas, getTejidos, getCostoMinuto,
  calcularCotizacion, setCotizacionActual, saveCotizacion, formatARS,
} from '@/lib/storage';
import { COLORS, SHADOWS, RADIUS } from '@/lib/theme';
import { Button, Card, Chip, SectionHeader, PageHeader, EmptyState } from '@/components/ui-kit';
import { showToast } from '@/components/toast';

interface LineaUI extends LineaCotizacion {
  _key: string;
  _prendaNombre: string;
  _tejidoNombre: string;
  _unidad: string;
  _subtotal: number;
}

export default function CotizarScreen() {
  const router = useRouter();

  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [tejidos, setTejidos] = useState<Tejido[]>([]);
  const [costoMinuto, setCostoMinuto] = useState(0);
  const [selectedPrenda, setSelectedPrenda] = useState<string | null>(null);
  const [selectedTejido, setSelectedTejido] = useState<string | null>(null);
  const [consumo, setConsumo] = useState('');
  const [cantidad, setCantidad] = useState('');
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

  const tejidoSel = tejidos.find((t) => t.id === selectedTejido);
  const unidad = tejidoSel?.tipo === 'plano' ? 'm' : 'kg';

  const previewCosto = (() => {
    if (!selectedPrenda || !selectedTejido) return null;
    const c = parseFloat(consumo), q = parseInt(cantidad, 10);
    if (!c || !q) return null;
    const p = prendas.find((x) => x.id === selectedPrenda);
    const t = tejidos.find((x) => x.id === selectedTejido);
    if (!p || !t) return null;
    return (c * t.precio + p.minutos * costoMinuto + p.insumos) * q;
  })();

  const handleAgregar = () => {
    if (!selectedPrenda || !selectedTejido) return showToast('Selecciona prenda y tejido', 'error');
    const c = parseFloat(consumo), q = parseInt(cantidad, 10);
    if (!c || c <= 0) return showToast('Consumo invalido', 'error');
    if (!q || q <= 0) return showToast('Cantidad invalida', 'error');

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
    showToast(`${p.nombre} + ${t.nombre} agregado`);
  };

  const handleCotizar = async () => {
    if (lineas.length === 0) return showToast('Agrega al menos una prenda', 'error');
    const cot = calcularCotizacion(lineas, prendas, tejidos, costoMinuto, 40);
    if (!cot) return showToast('Error al calcular', 'error');
    await setCotizacionActual(cot);
    await saveCotizacion(cot);
    router.navigate('/resultado');
  };

  const totalPedido = lineas.reduce((s, l) => s + l._subtotal, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader
        icon="calculate"
        title="Nueva Cotizacion"
        subtitle={lineas.length > 0 ? `${lineas.length} items en el pedido` : 'Arma tu pedido'}
      />

      {/* Líneas del pedido */}
      {lineas.length > 0 && (
        <>
          <SectionHeader icon="shopping-cart" title="Tu pedido" subtitle={`${lineas.length} items`} />
          {lineas.map((l) => (
            <Card key={l._key} style={styles.lineaCard}>
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
                <Button
                  title=""
                  icon="close"
                  variant="ghost"
                  onPress={() => setLineas(lineas.filter((x) => x._key !== l._key))}
                  style={{ width: 36, height: 36 }}
                />
              </View>
            </Card>
          ))}
          <Card accent style={styles.totalCard}>
            <View style={styles.totalRow}>
              <MaterialIcons name="receipt-long" size={18} color={COLORS.primary} />
              <Text style={styles.totalLabel}>Total estimado del pedido</Text>
              <Text style={styles.totalValue}>{formatARS(totalPedido)}</Text>
            </View>
          </Card>

          <Button
            title={`Cotizar pedido (${lineas.length} items)`}
            icon="arrow-forward"
            onPress={handleCotizar}
            style={{ marginBottom: 16 }}
          />
        </>
      )}

      {/* Form */}
      <SectionHeader icon="add-circle" title="Agregar prenda" subtitle="Selecciona y configura" />

      <Card>
        <Text style={styles.fieldLabel}>
          <MaterialIcons name="checkroom" size={14} color={COLORS.primaryLight} /> Prenda
        </Text>
        <View style={styles.chipsRow}>
          {prendas.map((p) => (
            <Chip key={p.id} label={p.nombre} selected={selectedPrenda === p.id}
              onPress={() => setSelectedPrenda(p.id)} />
          ))}
        </View>
        {prendas.length === 0 && (
          <Text style={styles.hint}>
            <MaterialIcons name="info-outline" size={12} color={COLORS.textMuted} /> Configura prendas en la tab Config
          </Text>
        )}

        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
          <MaterialIcons name="texture" size={14} color={COLORS.primaryLight} /> Tejido
        </Text>
        <View style={styles.chipsRow}>
          {tejidos.map((t) => (
            <Chip key={t.id} label={t.nombre} sublabel={t.tipo === 'punto' ? 'Punto' : 'Plano'}
              selected={selectedTejido === t.id} onPress={() => setSelectedTejido(t.id)} />
          ))}
        </View>

        <View style={styles.inputRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>
              <MaterialIcons name="straighten" size={14} color={COLORS.primaryLight} /> Consumo ({unidad})
            </Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" placeholder={`Ej: 0.35`}
              placeholderTextColor={COLORS.textMuted} value={consumo} onChangeText={setConsumo} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>
              <MaterialIcons name="inventory" size={14} color={COLORS.primaryLight} /> Cantidad
            </Text>
            <TextInput style={styles.input} keyboardType="number-pad" placeholder="Ej: 100"
              placeholderTextColor={COLORS.textMuted} value={cantidad} onChangeText={setCantidad} />
          </View>
        </View>

        {previewCosto !== null && (
          <View style={styles.previewRow}>
            <MaterialIcons name="trending-up" size={16} color={COLORS.success} />
            <Text style={styles.previewText}>Subtotal: {formatARS(previewCosto)}</Text>
          </View>
        )}

        <Button title="+ Agregar al pedido" icon="add" variant="dashed" onPress={handleAgregar}
          style={{ marginTop: 12 }} />
      </Card>

      {lineas.length === 0 && (
        <EmptyState icon="receipt-long" title="Tu pedido esta vacio"
          subtitle="Selecciona una prenda y tejido, configura el consumo y agrega al pedido" />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inputRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: 11, fontSize: 15, backgroundColor: COLORS.primaryGhost, color: COLORS.text,
  },
  hint: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.successSoft, borderRadius: RADIUS.sm, padding: 8, marginTop: 10,
  },
  previewText: { fontSize: 14, fontWeight: '700', color: COLORS.success },
  lineaCard: { marginBottom: 6 },
  lineaRow: { flexDirection: 'row', alignItems: 'center' },
  lineaIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryGhost,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  lineaName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  lineaDetail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  totalCard: { marginBottom: 12 },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  totalValue: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
});
