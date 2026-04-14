import { useCallback, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TextInput, TouchableOpacity, Linking, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Cotizacion, getCotizacionActual, precioSugerido, formatFecha, getMargenDefault } from '@/lib/storage';
import { Moneda, getMonedaActiva, getCachedTipoCambio, fetchTipoCambio, formatFromUSD, formatMoney, fromUSD } from '@/lib/currency';
import { COLORS, RADIUS } from '@/lib/theme';
import { Card, Chip, PageHeader, EmptyState, Row, Divider } from '@/components/ui-kit';
import { CurrencyBar } from '@/components/currency-bar';
import { showToast } from '@/components/toast';

const MARGENES_RAPIDOS = [30, 40, 50];

export default function ResultadoScreen() {
  const [cot, setCot] = useState<Cotizacion | null>(null);
  const [margen, setMargen] = useState('40');
  const [cliente, setCliente] = useState('');
  const [moneda, setMoneda] = useState<Moneda>(getMonedaActiva());
  const [tc, setTc] = useState(getCachedTipoCambio());

  useFocusEffect(useCallback(() => {
    (async () => {
      const [c, md, rate] = await Promise.all([getCotizacionActual(), getMargenDefault(), fetchTipoCambio()]);
      if (c) { setCot(c); setCliente(c.cliente || ''); }
      setMargen(md.toString()); setTc(rate); setMoneda(getMonedaActiva());
    })();
  }, []));

  if (!cot) return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <CurrencyBar onUpdate={(m, r) => { setMoneda(m); setTc(r); }} />
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader icon="receipt-long" title="Resultado" />
        <EmptyState icon="calculate" title="Sin cotizacion" subtitle="Calcula desde la pantalla Cotizar" />
      </ScrollView>
    </View>
  );

  const margenNum = parseFloat(margen.replace(',', '.')) || 0;
  const l = cot.lineas[0];
  const u = l.tejido.tipo === 'punto' ? 'kg' : 'm';
  const pvUSD = precioSugerido(l.costoRealUSD, margenNum);
  const pvTotalUSD = pvUSD * l.cantidad;
  const tieneImp = l.costoImportacionUSD > 0 && l.paisOrigen && !l.paisOrigen.isLocal;
  const tieneMerma = l.mermaPct > 0;
  const tieneLogistica = l.logisticaPct > 0;
  const tieneExtras = tieneMerma || tieneLogistica;
  const fmt = (usd: number) => formatFromUSD(usd, moneda, tc);

  const buildWA = (): string => {
    let t = `*Cotizacion - ${formatFecha(cot.fecha)}*\n`;
    if (cliente.trim()) t += `Cliente: ${cliente.trim()}\n`;
    t += `1 USD = ${cot.tipoCambio.toLocaleString('es-AR')} GS\n\n`;
    t += `*${l.prenda.nombre}*\n`;
    t += `  Tejido ${l.tejido.nombre}: ${fmt(l.costoTejidoUSD)}\n`;
    if (tieneImp) t += `  Importacion ${l.paisOrigen!.nombre} ${l.paisOrigen!.tasa}%: ${fmt(l.costoImportacionUSD)}\n`;
    t += `  Confeccion: ${fmt(l.confeccionUSD)}\n`;
    l.insumosSeleccionados.forEach((is) => { t += `  ${is.insumo.nombre}: ${fmt(is.costoUSD)}\n`; });
    t += `  *Costo unitario: ${fmt(l.costoUnitarioUSD)}*\n`;
    if (tieneMerma) t += `  Merma ${l.mermaPct}%: ${fmt(l.costoMermaUSD)}\n`;
    if (tieneLogistica) t += `  Logistica ${l.logisticaPct}%: ${fmt(l.costoLogisticaUSD)}\n`;
    if (tieneExtras) t += `  *Costo real: ${fmt(l.costoRealUSD)}*\n`;
    t += `\nCantidad: ${l.cantidad} u | Margen: ${margenNum}%\n`;
    t += `*Precio de venta: ${fmt(pvUSD)}/u*\n*TOTAL: ${fmt(pvTotalUSD)}*`;
    return t;
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <CurrencyBar onUpdate={(m, r) => { setMoneda(m); setTc(r); }} />
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader icon="receipt-long" title={l.prenda.nombre}
          subtitle={`${formatFecha(cot.fecha)} | ${l.cantidad} u`}
          rightContent={
            <View style={styles.shareRow}>
              <TouchableOpacity style={styles.waBtn} onPress={async () => {
                const url = `https://wa.me/?text=${encodeURIComponent(buildWA())}`;
                if (await Linking.canOpenURL(url)) Linking.openURL(url);
                else showToast('WhatsApp no disponible', 'error');
              }}>
                <MaterialIcons name="share" size={15} color="#fff" />
                <Text style={styles.waBtnText}>WA</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.copyBtn} onPress={async () => {
                try { if (Platform.OS === 'web') await navigator.clipboard.writeText(buildWA().replace(/\*/g, '')); showToast('Copiado'); }
                catch { showToast('Error', 'error'); }
              }}>
                <MaterialIcons name="content-copy" size={15} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          }
        />

        <Card style={{ marginBottom: 8 }}>
          <View style={styles.clienteRow}>
            <MaterialIcons name="person" size={16} color={COLORS.primaryLight} />
            <TextInput style={styles.clienteInput} placeholder="Cliente (opcional)"
              placeholderTextColor={COLORS.textMuted} value={cliente} onChangeText={setCliente} />
          </View>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Desglose de costos</Text>
          <Row icon="texture" label={`${l.tejido.nombre} (${l.consumo} ${u} × US$ ${l.tejido.precio}/${u})`} value={fmt(l.costoTejidoUSD)} />
          {tieneImp && <Row icon="public" label={`Importacion ${l.paisOrigen!.nombre} ${l.paisOrigen!.tasa}%`} value={fmt(l.costoImportacionUSD)} />}
          <Row icon="precision-manufacturing" label={`Confeccion (${l.prenda.minutos} min)`} value={fmt(l.confeccionUSD)} />
          {l.insumosSeleccionados.length > 0 && (
            <>
              <Divider />
              <Text style={styles.subTitle}>Insumos ({l.insumosSeleccionados.length})</Text>
              {l.insumosSeleccionados.map((is, i) => (
                <Row key={i} icon="label" label={is.insumo.nombre} value={fmt(is.costoUSD)} />
              ))}
            </>
          )}
          <Divider />
          <Row icon="functions" label="Costo unitario" value={fmt(l.costoUnitarioUSD)} bold />
          {tieneMerma && <Row icon="warning-amber" label={`Merma ${l.mermaPct}%`} value={fmt(l.costoMermaUSD)} />}
          {tieneLogistica && <Row icon="local-shipping" label={`Logistica ${l.logisticaPct}%`} value={fmt(l.costoLogisticaUSD)} />}
          {tieneExtras && <Row icon="functions" label="Costo real" value={fmt(l.costoRealUSD)} bold />}
          <Row icon="inventory" label={`Costo total (×${l.cantidad})`} value={fmt(l.subtotalUSD)} bold />
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Margen de ganancia</Text>
          <View style={styles.margenRow}>
            {MARGENES_RAPIDOS.map((m) => (
              <Chip key={m} label={`${m}%`} selected={margen === m.toString()} onPress={() => setMargen(m.toString())} />
            ))}
            <View style={styles.margenWrap}>
              <TextInput style={styles.margenInput} keyboardType="decimal-pad" value={margen} onChangeText={setMargen} maxLength={5} />
              <Text style={styles.margenPct}>%</Text>
            </View>
          </View>
        </Card>

        <Card accent>
          <View style={styles.pvSection}>
            <Text style={styles.pvLabel}>Precio de venta unitario</Text>
            <Text style={styles.pvValue}>{fmt(pvUSD)}</Text>
          </View>
          <View style={styles.totalSection}>
            <View style={styles.totalHeader}>
              <MaterialIcons name="star" size={18} color="#fff" />
              <Text style={styles.totalLabel}>TOTAL ({l.cantidad} u)</Text>
            </View>
            <Text style={styles.totalValue}>{fmt(pvTotalUSD)}</Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  shareRow: { flexDirection: 'row', gap: 6 },
  waBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#25d366', borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 6 },
  waBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  copyBtn: { backgroundColor: COLORS.primaryGhost, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 6 },
  clienteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clienteInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 2 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10 },
  subTitle: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 4 },
  margenRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  margenWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 10, backgroundColor: COLORS.primaryGhost, flex: 1 },
  margenInput: { flex: 1, fontSize: 14, paddingVertical: 8, color: COLORS.text },
  margenPct: { fontSize: 14, color: COLORS.textMuted },
  pvSection: { alignItems: 'center', paddingVertical: 8 },
  pvLabel: { fontSize: 13, fontWeight: '600', color: COLORS.success, marginBottom: 4 },
  pvValue: { fontSize: 32, fontWeight: '800', color: COLORS.success },
  totalSection: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 14, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  totalLabel: { fontSize: 13, fontWeight: '800', color: '#fff' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
});
