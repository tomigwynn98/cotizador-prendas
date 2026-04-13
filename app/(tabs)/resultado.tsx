import { useCallback, useState } from 'react';
import {
  StyleSheet, ScrollView, View, Text, TextInput, TouchableOpacity, Linking, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import {
  Cotizacion, getCotizacionActual, setCotizacionActual, precioSugerido,
  formatARS, formatFecha, getMargenDefault,
} from '@/lib/storage';
import { COLORS, RADIUS } from '@/lib/theme';
import { Card, Chip, SectionHeader, PageHeader, EmptyState, Row, Divider } from '@/components/ui-kit';
import { showToast } from '@/components/toast';

const MARGENES_RAPIDOS = [30, 40, 50];

export default function ResultadoScreen() {
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [margen, setMargen] = useState('40');
  const [cliente, setCliente] = useState('');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [c, md] = await Promise.all([getCotizacionActual(), getMargenDefault()]);
        if (c) { setCotizacion(c); setCliente(c.cliente || ''); }
        setMargen(md.toString());
      })();
    }, []),
  );

  if (!cotizacion) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <PageHeader icon="receipt-long" title="Resultado" subtitle="Desglose de costos" />
        <EmptyState icon="calculate" title="Sin cotizacion"
          subtitle="Calcula una cotizacion desde la pantalla Cotizar" />
      </ScrollView>
    );
  }

  const margenNum = parseFloat(margen.replace(',', '.')) || 0;
  const l = cotizacion.lineas[0]; // Una sola prenda
  const u = l.tejido.tipo === 'punto' ? 'kg' : 'm';
  const precioUnit = precioSugerido(l.costoUnitario, margenNum);
  const precioTotal = precioUnit * l.cantidad;

  const buildTextoWhatsApp = (): string => {
    let txt = `*Cotizacion - ${formatFecha(cotizacion.fecha)}*\n`;
    if (cliente.trim()) txt += `Cliente: ${cliente.trim()}\n`;
    txt += `Costo minuto: ${formatARS(cotizacion.costoMinuto)}/min\n\n`;
    txt += `*${l.prenda.nombre}*\n`;
    txt += `  ${l.tejido.nombre}: ${l.consumo} ${u} x ${formatARS(l.tejido.precio)}/${u} = ${formatARS(l.costoTejido)}\n`;
    txt += `  Confeccion: ${l.prenda.minutos} min x ${formatARS(cotizacion.costoMinuto)}/min = ${formatARS(l.confeccion)}\n`;
    txt += `  Insumos: ${formatARS(l.insumos)}\n`;
    txt += `  *Costo unitario: ${formatARS(l.costoUnitario)}*\n\n`;
    txt += `Cantidad: ${l.cantidad} u\n`;
    txt += `Margen: ${margenNum}%\n`;
    txt += `*Precio de venta: ${formatARS(precioUnit)}/u*\n`;
    txt += `*TOTAL: ${formatARS(precioTotal)}*`;
    return txt;
  };

  const handleWhatsApp = async () => {
    const url = `https://wa.me/?text=${encodeURIComponent(buildTextoWhatsApp())}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) await Linking.openURL(url);
    else showToast('WhatsApp no disponible', 'error');
  };

  const handleCopiar = async () => {
    try {
      if (Platform.OS === 'web') await navigator.clipboard.writeText(buildTextoWhatsApp().replace(/\*/g, ''));
      showToast('Copiado al portapapeles');
    } catch { showToast('No se pudo copiar', 'error'); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader
        icon="receipt-long"
        title={l.prenda.nombre}
        subtitle={`${formatFecha(cotizacion.fecha)} | ${l.cantidad} unidades`}
        rightContent={
          <View style={styles.shareRow}>
            <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp}>
              <MaterialIcons name="share" size={15} color="#fff" />
              <Text style={styles.shareBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopiar}>
              <MaterialIcons name="content-copy" size={15} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Cliente opcional */}
      <Card style={{ marginBottom: 8 }}>
        <View style={styles.clienteRow}>
          <MaterialIcons name="person" size={16} color={COLORS.primaryLight} />
          <TextInput style={styles.clienteInput} placeholder="Cliente (opcional)"
            placeholderTextColor={COLORS.textMuted} value={cliente} onChangeText={setCliente} />
        </View>
      </Card>

      {/* Desglose */}
      <Card>
        <Text style={styles.cardTitle}>Desglose de costos</Text>
        <Row icon="texture" label={`${l.tejido.nombre} (${l.consumo} ${u} x ${formatARS(l.tejido.precio)}/${u})`} value={formatARS(l.costoTejido)} />
        <Row icon="precision-manufacturing" label={`Confeccion (${l.prenda.minutos} min x ${formatARS(cotizacion.costoMinuto)}/min)`} value={formatARS(l.confeccion)} />
        <Row icon="category" label="Insumos" value={formatARS(l.insumos)} />
        <Divider />
        <Row icon="functions" label="Costo unitario" value={formatARS(l.costoUnitario)} bold />
        <Row icon="inventory" label={`Costo total (x${l.cantidad})`} value={formatARS(l.subtotal)} bold />
      </Card>

      {/* Margen */}
      <Card>
        <Text style={styles.cardTitle}>Margen de ganancia</Text>
        <View style={styles.margenRow}>
          {MARGENES_RAPIDOS.map((m) => (
            <Chip key={m} label={`${m}%`} selected={margen === m.toString()}
              onPress={() => setMargen(m.toString())} />
          ))}
          <View style={styles.margenInputWrap}>
            <TextInput style={styles.margenInput} keyboardType="decimal-pad"
              value={margen} onChangeText={setMargen} maxLength={5} />
            <Text style={styles.margenPct}>%</Text>
          </View>
        </View>
      </Card>

      {/* Precio de venta — destacado */}
      <Card accent>
        <View style={styles.precioSection}>
          <Text style={styles.precioLabel}>Precio de venta unitario</Text>
          <Text style={styles.precioValue}>{formatARS(precioUnit)}</Text>
        </View>
        <View style={styles.totalSection}>
          <View style={styles.totalHeader}>
            <MaterialIcons name="star" size={18} color="#fff" />
            <Text style={styles.totalLabel}>TOTAL ({l.cantidad} unidades)</Text>
          </View>
          <Text style={styles.totalValue}>{formatARS(precioTotal)}</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  shareRow: { flexDirection: 'row', gap: 6 },
  whatsappBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#25d366', borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 6,
  },
  copyBtn: {
    backgroundColor: COLORS.primaryGhost, borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 6,
  },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  clienteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clienteInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 2 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10 },
  margenRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  margenInputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingHorizontal: 10, backgroundColor: COLORS.primaryGhost, flex: 1,
  },
  margenInput: { flex: 1, fontSize: 14, paddingVertical: 8, color: COLORS.text },
  margenPct: { fontSize: 14, color: COLORS.textMuted },
  // Precio de venta destacado
  precioSection: { alignItems: 'center', paddingVertical: 8 },
  precioLabel: { fontSize: 13, fontWeight: '600', color: COLORS.success, marginBottom: 4 },
  precioValue: { fontSize: 32, fontWeight: '800', color: COLORS.success },
  totalSection: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 14,
    marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  totalHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  totalLabel: { fontSize: 13, fontWeight: '800', color: '#fff' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
});
