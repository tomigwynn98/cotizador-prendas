import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TextInput, TouchableOpacity, Switch } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import {
  Prenda, Tejido, PaisOrigen, getPrendas, getTejidos, getPaises, getCostoMinuto,
  calcularCotizacion, setCotizacionActual, saveCotizacion, formatARS,
  getConsumo, saveConsumo, getMargenDefault, precioSugerido, parseNumero,
} from '@/lib/storage';
import { COLORS, RADIUS } from '@/lib/theme';
import { Button, Card, Chip, PageHeader, Row, Divider } from '@/components/ui-kit';
import { showToast } from '@/components/toast';

const CANTIDADES_RAPIDAS = [50, 100, 200, 500];

export default function CotizarScreen() {
  const router = useRouter();
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [tejidos, setTejidos] = useState<Tejido[]>([]);
  const [paises, setPaises] = useState<PaisOrigen[]>([]);
  const [costoMinuto, setCostoMinuto] = useState(0);
  const [margenDefault, setMargenDefault] = useState(40);
  const [selectedPrenda, setSelectedPrenda] = useState<string | null>(null);
  const [selectedTejido, setSelectedTejido] = useState<string | null>(null);
  const [selectedPais, setSelectedPais] = useState<string>('local');
  const [consumo, setConsumo] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [cantidadFromChip, setCantidadFromChip] = useState(false);
  const [consumoAutoLoaded, setConsumoAutoLoaded] = useState(false);
  const [insumosActivos, setInsumosActivos] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [p, t, ps, cm, md] = await Promise.all([
          getPrendas(), getTejidos(), getPaises(), getCostoMinuto(), getMargenDefault(),
        ]);
        setPrendas(p); setTejidos(t); setPaises(ps); setCostoMinuto(cm); setMargenDefault(md);
      })();
    }, []),
  );

  useEffect(() => {
    if (!selectedPrenda || !selectedTejido) { setConsumoAutoLoaded(false); return; }
    (async () => {
      const saved = await getConsumo(selectedPrenda, selectedTejido);
      if (saved !== null) { setConsumo(saved.toString()); setConsumoAutoLoaded(true); }
      else { setConsumoAutoLoaded(false); }
    })();
  }, [selectedPrenda, selectedTejido]);

  const tejidoSel = tejidos.find((t) => t.id === selectedTejido);
  const unidad = tejidoSel?.tipo === 'plano' ? 'm' : 'kg';
  const paisSel = paises.find((p) => p.id === selectedPais);

  const liveCalc = (() => {
    if (!selectedPrenda || !selectedTejido) return null;
    const c = parseNumero(consumo), q = parseInt(cantidad, 10);
    if (!c || c <= 0 || !q || q <= 0) return null;
    const p = prendas.find((x) => x.id === selectedPrenda);
    const t = tejidos.find((x) => x.id === selectedTejido);
    if (!p || !t) return null;
    const costoTejido = c * t.precio;
    const tasa = paisSel && !paisSel.isLocal ? paisSel.tasa : 0;
    const costoImportacion = costoTejido * (tasa / 100);
    const costoTejidoFinal = costoTejido + costoImportacion;
    const confeccion = p.minutos * costoMinuto;
    const insumos = insumosActivos ? p.insumos : 0;
    const costoUnitario = costoTejidoFinal + confeccion + insumos;
    const subtotal = costoUnitario * q;
    const precioUnit = precioSugerido(costoUnitario, margenDefault);
    return { costoTejido, costoImportacion, tasa, costoTejidoFinal, confeccion, insumos, costoUnitario, subtotal, precioUnit, precioTotal: precioUnit * q, tejidoNombre: t.nombre };
  })();

  const handleCalcSave = async () => {
    if (!selectedPrenda || !selectedTejido) return showToast('Selecciona prenda y tejido', 'error');
    const c = parseNumero(consumo), q = parseInt(cantidad, 10);
    if (!c || c <= 0) return showToast('Consumo invalido', 'error');
    if (!q || q <= 0) return showToast('Cantidad invalida', 'error');
    await saveConsumo(selectedPrenda, selectedTejido, c);
    const cot = calcularCotizacion(
      [{ prendaId: selectedPrenda, tejidoId: selectedTejido, consumo: c, cantidad: q }],
      prendas, tejidos, costoMinuto, margenDefault, undefined, paisSel, insumosActivos,
    );
    if (!cot) return showToast('Error al calcular', 'error');
    await setCotizacionActual(cot);
    await saveCotizacion(cot);
    router.navigate('/resultado');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader icon="calculate" title="Cotizar" subtitle="Selecciona, configura y calcula" />

      <Card>
        {/* Prenda */}
        <Text style={styles.label}>Prenda</Text>
        <View style={styles.chipsRow}>
          {prendas.map((p) => (
            <Chip key={p.id} label={p.nombre} selected={selectedPrenda === p.id}
              onPress={() => { setSelectedPrenda(p.id); setConsumo(''); }} />
          ))}
        </View>
        {prendas.length === 0 && <Text style={styles.hint}>Configura prendas en Config</Text>}

        {/* Tejido */}
        <Text style={[styles.label, { marginTop: 12 }]}>Tejido</Text>
        <View style={styles.chipsRow}>
          {tejidos.map((t) => (
            <Chip key={t.id} label={t.nombre} sublabel={t.tipo === 'punto' ? 'Punto' : 'Plano'}
              selected={selectedTejido === t.id}
              onPress={() => { setSelectedTejido(t.id); setConsumo(''); }} />
          ))}
        </View>

        {/* País de origen */}
        <Text style={[styles.label, { marginTop: 12 }]}>Origen del tejido</Text>
        <View style={styles.chipsRow}>
          {paises.map((p) => (
            <Chip key={p.id} label={p.nombre}
              sublabel={p.tasa > 0 ? `+${p.tasa}%` : undefined}
              selected={selectedPais === p.id}
              onPress={() => setSelectedPais(p.id)} />
          ))}
        </View>

        {/* Consumo + Cantidad + Insumos toggle */}
        <View style={styles.inputsRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>
              Consumo ({unidad})
              {consumoAutoLoaded && <Text style={styles.autoTag}> (memo)</Text>}
            </Text>
            <TextInput style={[styles.input, consumoAutoLoaded && styles.inputAuto]}
              keyboardType="decimal-pad" placeholder="0.35"
              placeholderTextColor={COLORS.textMuted} value={consumo}
              onChangeText={(v) => { setConsumo(v); setConsumoAutoLoaded(false); }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Cantidad</Text>
            <View style={styles.cantRow}>
              {CANTIDADES_RAPIDAS.map((q) => (
                <TouchableOpacity key={q}
                  style={[styles.cantMini, cantidadFromChip && cantidad === q.toString() && styles.cantMiniSel]}
                  onPress={() => { setCantidad(q.toString()); setCantidadFromChip(true); }}>
                  <Text style={[styles.cantMiniText, cantidadFromChip && cantidad === q.toString() && styles.cantMiniTextSel]}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} keyboardType="number-pad" placeholder="Otra cant."
              placeholderTextColor={COLORS.textMuted} value={cantidadFromChip ? '' : cantidad}
              onChangeText={(v) => { setCantidad(v); setCantidadFromChip(false); }} />
          </View>
        </View>

        {/* Toggle insumos */}
        <View style={styles.toggleRow}>
          <MaterialIcons name="category" size={16} color={insumosActivos ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.toggleLabel, !insumosActivos && { color: COLORS.textMuted }]}>
            Incluir insumos
          </Text>
          <Switch
            value={insumosActivos}
            onValueChange={setInsumosActivos}
            trackColor={{ false: COLORS.border, true: COLORS.primarySoft }}
            thumbColor={insumosActivos ? COLORS.primary : '#ccc'}
          />
        </View>

        {/* Resultado en vivo */}
        {liveCalc && (
          <View style={styles.liveResult}>
            <Row icon="texture" label={liveCalc.tejidoNombre} value={formatARS(liveCalc.costoTejido)} />
            {liveCalc.tasa > 0 && (
              <Row icon="public" label={`Importacion ${paisSel?.nombre} ${liveCalc.tasa}%`} value={formatARS(liveCalc.costoImportacion)} />
            )}
            <Row icon="precision-manufacturing" label="Confeccion" value={formatARS(liveCalc.confeccion)} />
            {insumosActivos && <Row icon="category" label="Insumos" value={formatARS(liveCalc.insumos)} />}
            <Divider />
            <Row icon="functions" label="Costo unitario" value={formatARS(liveCalc.costoUnitario)} bold />
            <Divider />
            <View style={styles.precioVentaRow}>
              <Text style={styles.precioVentaLabel}>Precio de venta/u ({margenDefault}%)</Text>
              <Text style={styles.precioVentaValue}>{formatARS(liveCalc.precioUnit)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL ({cantidad} u)</Text>
              <Text style={styles.totalValue}>{formatARS(liveCalc.precioTotal)}</Text>
            </View>
          </View>
        )}

        <Button title="Calcular" icon="calculate" onPress={handleCalcSave}
          disabled={!liveCalc} style={{ marginTop: 14 }} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 4 },
  autoTag: { fontSize: 11, color: COLORS.success, fontWeight: '700' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { fontSize: 12, color: COLORS.textMuted },
  inputsRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    padding: 10, fontSize: 15, backgroundColor: COLORS.primaryGhost, color: COLORS.text,
  },
  inputAuto: { borderColor: COLORS.success, backgroundColor: COLORS.successSoft },
  cantRow: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  cantMini: {
    flex: 1, paddingVertical: 6, borderRadius: RADIUS.sm, borderWidth: 1.5,
    borderColor: COLORS.border, backgroundColor: COLORS.bgWhite, alignItems: 'center',
  },
  cantMiniSel: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  cantMiniText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  cantMiniTextSel: { color: '#fff' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    paddingVertical: 8, paddingHorizontal: 4,
  },
  toggleLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.text },
  liveResult: {
    marginTop: 14, backgroundColor: '#f8fafc',
    borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  precioVentaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  precioVentaLabel: { fontSize: 13, fontWeight: '600', color: COLORS.success },
  precioVentaValue: { fontSize: 22, fontWeight: '800', color: COLORS.success },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: 10, marginTop: 8,
  },
  totalLabel: { fontSize: 13, fontWeight: '800', color: '#fff' },
  totalValue: { fontSize: 17, fontWeight: '800', color: '#fff' },
});
