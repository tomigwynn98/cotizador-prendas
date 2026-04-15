import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TextInput, TouchableOpacity, Switch } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import {
  Prenda, Tejido, Insumo, PaisOrigen, getPrendas, getTejidos, getInsumos, getPaises,
  getCostoMinuto, calcularCotizacion, setCotizacionActual,
  getConsumo, saveConsumo, getMargenDefault, precioSugerido, parseNumero,
} from '@/lib/storage';
import { Moneda, getMonedaActiva, getCachedTipoCambio, fetchTipoCambio, formatFromUSD, toUSD } from '@/lib/currency';
import { COLORS, RADIUS } from '@/lib/theme';
import { Button, Card, Chip, PageHeader, Row, Divider } from '@/components/ui-kit';
import { CurrencyBar } from '@/components/currency-bar';
import { showToast } from '@/components/toast';

const CANTIDADES_RAPIDAS = [50, 100, 200, 500];

export default function CotizarScreen() {
  const router = useRouter();
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [tejidos, setTejidos] = useState<Tejido[]>([]);
  const [insumosList, setInsumosList] = useState<Insumo[]>([]);
  const [paises, setPaises] = useState<PaisOrigen[]>([]);
  const [costoMinuto, setCostoMinuto] = useState(0);
  const [margenDefault, setMargenDefault] = useState(40);
  const [selPrenda, setSelPrenda] = useState<string | null>(null);
  const [selTejido, setSelTejido] = useState<string | null>(null);
  const [selPais, setSelPais] = useState<string>('local');
  const [consumo, setConsumo] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [cantFromChip, setCantFromChip] = useState(false);
  const [consumoAuto, setConsumoAuto] = useState(false);
  const [selInsumos, setSelInsumos] = useState<Set<string>>(new Set());
  const [comisionActiva, setComisionActiva] = useState(false);
  const [comisionPct, setComisionPct] = useState('10');
  const [mermaActiva, setMermaActiva] = useState(false);
  const [mermaPct, setMermaPct] = useState('5');
  const [logisticaActiva, setLogisticaActiva] = useState(false);
  const [logisticaPct, setLogisticaPct] = useState('3');
  const [moneda, setMoneda] = useState<Moneda>(getMonedaActiva());
  const [tc, setTc] = useState(getCachedTipoCambio());

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [p, t, ins, ps, cm, md] = await Promise.all([
          getPrendas(), getTejidos(), getInsumos(), getPaises(), getCostoMinuto(), getMargenDefault(),
        ]);
        setPrendas(p); setTejidos(t); setInsumosList(ins); setPaises(ps);
        setCostoMinuto(cm); setMargenDefault(md);
        setMoneda(getMonedaActiva());
        const rate = await fetchTipoCambio();
        setTc(rate);
      })();
    }, []),
  );

  useEffect(() => {
    if (!selPrenda || !selTejido) { setConsumoAuto(false); return; }
    (async () => {
      const saved = await getConsumo(selPrenda, selTejido);
      if (saved !== null) { setConsumo(saved.toString()); setConsumoAuto(true); }
      else setConsumoAuto(false);
    })();
  }, [selPrenda, selTejido]);

  const tejidoSel = tejidos.find((t) => t.id === selTejido);
  const unidad = tejidoSel?.tipo === 'plano' ? 'm' : 'kg';
  const paisSel = paises.find((p) => p.id === selPais);
  const fmt = (usd: number) => formatFromUSD(usd, moneda, tc);

  const toggleInsumo = (id: string) => {
    const next = new Set(selInsumos);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelInsumos(next);
  };

  const insumosActivos = insumosList.filter((i) => selInsumos.has(i.id));

  const liveCalc = (() => {
    if (!selPrenda || !selTejido) return null;
    const c = parseNumero(consumo), q = parseInt(cantidad, 10);
    if (!c || c <= 0 || !q || q <= 0) return null;
    const p = prendas.find((x) => x.id === selPrenda);
    const t = tejidos.find((x) => x.id === selTejido);
    if (!p || !t) return null;
    const costoTejidoUSD = c * t.precio;
    const tasa = paisSel && !paisSel.isLocal ? paisSel.tasa : 0;
    const costoImpUSD = costoTejidoUSD * (tasa / 100);
    const costoTejFinalUSD = costoTejidoUSD + costoImpUSD;
    const confUSD = p.minutos * costoMinuto;
    const insUSD = insumosActivos.reduce((s, i) => s + toUSD(i.precio, i.moneda, tc), 0);
    const costoUnitUSD = costoTejFinalUSD + confUSD + insUSD;
    // Merma y logística sobre el costo
    const merma = mermaActiva ? parseNumero(mermaPct) || 0 : 0;
    const costoMermaUSD = costoUnitUSD * (merma / 100);
    const costoPostMerma = costoUnitUSD + costoMermaUSD;
    const logistica = logisticaActiva ? parseNumero(logisticaPct) || 0 : 0;
    const costoLogUSD = costoPostMerma * (logistica / 100);
    const costoRealUSD = costoPostMerma + costoLogUSD;
    // Comisión va en el denominador del precio, no en el costo
    const comision = comisionActiva ? parseNumero(comisionPct) || 0 : 0;
    const subtUSD = costoRealUSD * q;
    const pvUSD = precioSugerido(costoRealUSD, margenDefault, comision);
    return { costoTejidoUSD, costoImpUSD, tasa, confUSD, insUSD, costoUnitUSD, merma, costoMermaUSD, logistica, costoLogUSD, costoRealUSD, comision, subtUSD, pvUSD, pvTotalUSD: pvUSD * q, tejNombre: t.nombre };
  })();

  const handleCalc = async () => {
    if (!selPrenda || !selTejido) return showToast('Selecciona prenda y tejido', 'error');
    const c = parseNumero(consumo), q = parseInt(cantidad, 10);
    if (!c || c <= 0) return showToast('Consumo invalido', 'error');
    if (!q || q <= 0) return showToast('Cantidad invalida', 'error');
    await saveConsumo(selPrenda, selTejido, c);
    const cot = calcularCotizacion(
      [{ prendaId: selPrenda, tejidoId: selTejido, consumo: c, cantidad: q }],
      prendas, tejidos, costoMinuto, margenDefault, tc, undefined, paisSel, insumosActivos,
      comisionActiva ? parseNumero(comisionPct) || 0 : 0,
      mermaActiva ? parseNumero(mermaPct) || 0 : 0,
      logisticaActiva ? parseNumero(logisticaPct) || 0 : 0,
    );
    if (!cot) return showToast('Error al calcular', 'error');
    await setCotizacionActual(cot);
    router.navigate('/resultado');
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <CurrencyBar onUpdate={(m, r) => { setMoneda(m); setTc(r); }} />
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader icon="calculate" title="Cotizar" subtitle="Selecciona, configura y calcula" />

        <Card>
          <Text style={styles.label}>Prenda</Text>
          <View style={styles.chipsRow}>
            {prendas.map((p) => (
              <Chip key={p.id} label={p.nombre} selected={selPrenda === p.id}
                onPress={() => { setSelPrenda(p.id); setConsumo(''); }} />
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Tejido <Text style={styles.hint}>(precio en USD)</Text></Text>
          <View style={styles.chipsRow}>
            {tejidos.map((t) => (
              <Chip key={t.id} label={t.nombre} sublabel={`${t.tipo === 'punto' ? 'Punto' : 'Plano'} · $${t.precio}`}
                selected={selTejido === t.id}
                onPress={() => { setSelTejido(t.id); setConsumo(''); }} />
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Origen del tejido</Text>
          <View style={styles.chipsRow}>
            {paises.map((p) => (
              <Chip key={p.id} label={p.nombre} sublabel={p.tasa > 0 ? `+${p.tasa}%` : undefined}
                selected={selPais === p.id} onPress={() => setSelPais(p.id)} />
            ))}
          </View>

          <View style={styles.inputsRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Consumo ({unidad}){consumoAuto && <Text style={styles.autoTag}> (memo)</Text>}</Text>
              <TextInput style={[styles.input, consumoAuto && styles.inputAuto]} keyboardType="decimal-pad"
                placeholder="0.35" placeholderTextColor={COLORS.textMuted} value={consumo}
                onChangeText={(v) => { setConsumo(v); setConsumoAuto(false); }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Cantidad</Text>
              <View style={styles.cantRow}>
                {CANTIDADES_RAPIDAS.map((q) => (
                  <TouchableOpacity key={q} style={[styles.cantMini, cantFromChip && cantidad === q.toString() && styles.cantMiniSel]}
                    onPress={() => { setCantidad(q.toString()); setCantFromChip(true); }}>
                    <Text style={[styles.cantMiniText, cantFromChip && cantidad === q.toString() && styles.cantMiniTextSel]}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={styles.input} keyboardType="number-pad" placeholder="Otra"
                placeholderTextColor={COLORS.textMuted} value={cantFromChip ? '' : cantidad}
                onChangeText={(v) => { setCantidad(v); setCantFromChip(false); }} />
            </View>
          </View>

          {/* Insumos checkboxes */}
          <Text style={[styles.label, { marginTop: 12 }]}>Insumos</Text>
          {insumosList.map((ins) => {
            const active = selInsumos.has(ins.id);
            return (
              <TouchableOpacity key={ins.id} style={[styles.insumoRow, active && styles.insumoRowActive]}
                onPress={() => toggleInsumo(ins.id)} activeOpacity={0.7}>
                <MaterialIcons name={active ? 'check-box' : 'check-box-outline-blank'}
                  size={20} color={active ? COLORS.primary : COLORS.textMuted} />
                <Text style={[styles.insumoName, active && { color: COLORS.text }]}>{ins.nombre}</Text>
                <Text style={styles.insumoPrice}>
                  {ins.moneda === 'USD'
                    ? `US$ ${ins.precio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`
                    : `₲ ${ins.precio.toLocaleString('es-AR')}`}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Comisión toggle */}
          <View style={styles.toggleRow}>
            <MaterialIcons name="percent" size={16} color={comisionActiva ? '#7c3aed' : COLORS.textMuted} />
            <Text style={[styles.toggleLabel, !comisionActiva && { color: COLORS.textMuted }]}>Comision</Text>
            <Switch value={comisionActiva} onValueChange={setComisionActiva}
              trackColor={{ false: COLORS.border, true: '#ede9fe' }} thumbColor={comisionActiva ? '#7c3aed' : '#ccc'} />
          </View>
          {comisionActiva && (
            <View style={styles.mermaRow}>
              <TextInput style={[styles.mermaInput, { borderColor: '#7c3aed', backgroundColor: '#f5f3ff' }]}
                keyboardType="decimal-pad" value={comisionPct} onChangeText={setComisionPct}
                placeholder="10" placeholderTextColor={COLORS.textMuted} />
              <Text style={styles.mermaPct}>%</Text>
            </View>
          )}

          {/* Merma toggle */}
          <View style={styles.toggleRow}>
            <MaterialIcons name="warning-amber" size={16} color={mermaActiva ? '#f59e0b' : COLORS.textMuted} />
            <Text style={[styles.toggleLabel, !mermaActiva && { color: COLORS.textMuted }]}>Merma</Text>
            <Switch value={mermaActiva} onValueChange={setMermaActiva}
              trackColor={{ false: COLORS.border, true: '#fef3c7' }} thumbColor={mermaActiva ? '#f59e0b' : '#ccc'} />
          </View>
          {mermaActiva && (
            <View style={styles.mermaRow}>
              <TextInput style={styles.mermaInput} keyboardType="decimal-pad"
                value={mermaPct} onChangeText={setMermaPct} placeholder="5" placeholderTextColor={COLORS.textMuted} />
              <Text style={styles.mermaPct}>%</Text>
            </View>
          )}

          {/* Logística toggle */}
          <View style={styles.toggleRow}>
            <MaterialIcons name="local-shipping" size={16} color={logisticaActiva ? '#0284c7' : COLORS.textMuted} />
            <Text style={[styles.toggleLabel, !logisticaActiva && { color: COLORS.textMuted }]}>Logistica</Text>
            <Switch value={logisticaActiva} onValueChange={setLogisticaActiva}
              trackColor={{ false: COLORS.border, true: '#bae6fd' }} thumbColor={logisticaActiva ? '#0284c7' : '#ccc'} />
          </View>
          {logisticaActiva && (
            <View style={styles.mermaRow}>
              <TextInput style={[styles.mermaInput, { borderColor: '#0284c7', backgroundColor: '#f0f9ff' }]}
                keyboardType="decimal-pad" value={logisticaPct} onChangeText={setLogisticaPct}
                placeholder="3" placeholderTextColor={COLORS.textMuted} />
              <Text style={styles.mermaPct}>%</Text>
            </View>
          )}

          {/* Live result */}
          {liveCalc && (
            <View style={styles.liveResult}>
              <Row icon="texture" label={liveCalc.tejNombre} value={fmt(liveCalc.costoTejidoUSD)} />
              {liveCalc.tasa > 0 && <Row icon="public" label={`Importacion ${paisSel?.nombre} ${liveCalc.tasa}%`} value={fmt(liveCalc.costoImpUSD)} />}
              <Row icon="precision-manufacturing" label="Confeccion" value={fmt(liveCalc.confUSD)} />
              {liveCalc.insUSD > 0 && <Row icon="category" label={`Insumos (${insumosActivos.length})`} value={fmt(liveCalc.insUSD)} />}
              <Divider />
              <Row icon="functions" label="Costo unitario" value={fmt(liveCalc.costoUnitUSD)} bold />
              {(liveCalc.merma > 0 || liveCalc.logistica > 0) && (
                <>
                  {liveCalc.merma > 0 && <Row icon="warning-amber" label={`Merma ${liveCalc.merma}%`} value={fmt(liveCalc.costoMermaUSD)} />}
                  {liveCalc.logistica > 0 && <Row icon="local-shipping" label={`Logistica ${liveCalc.logistica}%`} value={fmt(liveCalc.costoLogUSD)} />}
                  <Row icon="functions" label="Costo real" value={fmt(liveCalc.costoRealUSD)} bold />
                </>
              )}
              <Divider />
              <View style={styles.pvRow}>
                <Text style={styles.pvLabel}>
                  Precio de venta/u ({margenDefault}%{liveCalc.comision > 0 ? ` + Com. ${liveCalc.comision}%` : ''})
                </Text>
                <Text style={styles.pvValue}>{fmt(liveCalc.pvUSD)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL ({cantidad} u)</Text>
                <Text style={styles.totalValue}>{fmt(liveCalc.pvTotalUSD)}</Text>
              </View>
            </View>
          )}

          <Button title="Calcular" icon="calculate" onPress={handleCalc} disabled={!liveCalc} style={{ marginTop: 14 }} />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 4 },
  autoTag: { fontSize: 11, color: COLORS.success, fontWeight: '700' },
  hint: { fontSize: 11, color: COLORS.textMuted, fontWeight: '400' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inputsRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  input: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, fontSize: 15, backgroundColor: COLORS.primaryGhost, color: COLORS.text },
  inputAuto: { borderColor: COLORS.success, backgroundColor: COLORS.successSoft },
  cantRow: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  cantMini: { flex: 1, paddingVertical: 6, borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.bgWhite, alignItems: 'center' },
  cantMiniSel: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  cantMiniText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  cantMiniTextSel: { color: '#fff' },
  insumoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingHorizontal: 4, borderRadius: RADIUS.sm },
  insumoRowActive: { backgroundColor: COLORS.primaryGhost },
  insumoName: { flex: 1, fontSize: 13, color: COLORS.textMuted },
  insumoPrice: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  liveResult: { marginTop: 14, backgroundColor: '#f8fafc', borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  pvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  pvLabel: { fontSize: 13, fontWeight: '600', color: COLORS.success },
  pvValue: { fontSize: 22, fontWeight: '800', color: COLORS.success },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: 10, marginTop: 8 },
  totalLabel: { fontSize: 13, fontWeight: '800', color: '#fff' },
  totalValue: { fontSize: 17, fontWeight: '800', color: '#fff' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingVertical: 6 },
  toggleLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.text },
  mermaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  mermaInput: { borderWidth: 1.5, borderColor: '#fbbf24', borderRadius: RADIUS.sm, padding: 8, fontSize: 15, backgroundColor: '#fefce8', color: COLORS.text, width: 70, textAlign: 'center' },
  mermaPct: { fontSize: 15, color: COLORS.textMuted, fontWeight: '600' },
});
