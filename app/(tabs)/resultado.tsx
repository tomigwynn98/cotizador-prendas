import { useCallback, useState } from 'react';
import {
  StyleSheet, ScrollView, View, Text, TextInput, TouchableOpacity, Linking, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import {
  Cotizacion, getCotizacionActual, precioSugerido, formatARS, formatFecha, getMargenDefault,
} from '@/lib/storage';
import { COLORS, SHADOWS, RADIUS } from '@/lib/theme';
import { Button, Card, Chip, SectionHeader, PageHeader, EmptyState, Row, Divider } from '@/components/ui-kit';
import { showToast } from '@/components/toast';

const MARGENES_RAPIDOS = [30, 40, 50];

export default function ResultadoScreen() {
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [margen, setMargen] = useState('40');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [c, md] = await Promise.all([getCotizacionActual(), getMargenDefault()]);
        if (c) setCotizacion(c);
        setMargen(md.toString());
      })();
    }, []),
  );

  if (!cotizacion) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <PageHeader icon="receipt-long" title="Resultado" subtitle="Desglose de costos" />
        <EmptyState
          icon="calculate"
          title="Sin cotizacion"
          subtitle="Realiza una cotizacion desde la pantalla Cotizar para ver el desglose"
        />
      </ScrollView>
    );
  }

  const margenNum = parseFloat(margen) || 0;
  const totalCosto = cotizacion.lineas.reduce((s, l) => s + l.subtotal, 0);
  const totalPrecio = margenNum >= 100 ? Infinity : totalCosto / (1 - margenNum / 100);
  const totalUnidades = cotizacion.lineas.reduce((s, l) => s + l.cantidad, 0);

  const buildTextoWhatsApp = (): string => {
    let txt = `*Cotizacion - ${formatFecha(cotizacion.fecha)}*\n`;
    if (cotizacion.cliente) txt += `Cliente: ${cotizacion.cliente}\n`;
    txt += `Costo minuto: ${formatARS(cotizacion.costoMinuto)}/min\n\n`;
    cotizacion.lineas.forEach((l, i) => {
      const u = l.tejido.tipo === 'punto' ? 'kg' : 'm';
      txt += `*${i + 1}. ${l.prenda.nombre} + ${l.tejido.nombre}*\n`;
      txt += `  Tejido: ${l.consumo} ${u} x ${formatARS(l.tejido.precio)}/${u} = ${formatARS(l.costoTejido)}\n`;
      txt += `  Confeccion: ${l.prenda.minutos} min x ${formatARS(cotizacion.costoMinuto)}/min = ${formatARS(l.confeccion)}\n`;
      txt += `  Insumos: ${formatARS(l.insumos)}\n`;
      txt += `  *Costo unitario: ${formatARS(l.costoUnitario)}*\n`;
      txt += `  Cantidad: ${l.cantidad} u | Subtotal: ${formatARS(l.subtotal)}\n`;
      txt += `  Precio de venta: ${formatARS(precioSugerido(l.costoUnitario, margenNum))}/u\n\n`;
    });
    txt += `---\n*TOTAL COSTO: ${formatARS(totalCosto)}*\nMargen: ${margenNum}%\n*PRECIO DE VENTA TOTAL: ${formatARS(totalPrecio)}*\nTotal unidades: ${totalUnidades}`;
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
        title={cotizacion.cliente ? `Cotizacion - ${cotizacion.cliente}` : 'Cotizacion'}
        subtitle={formatFecha(cotizacion.fecha)}
        rightContent={
          <View style={styles.shareRow}>
            <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp}>
              <MaterialIcons name="share" size={16} color="#fff" />
              <Text style={styles.shareBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopiar}>
              <MaterialIcons name="content-copy" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Líneas */}
      {cotizacion.lineas.map((l, i) => {
        const u = l.tejido.tipo === 'punto' ? 'kg' : 'm';
        const precioUnit = precioSugerido(l.costoUnitario, margenNum);
        return (
          <Card key={i}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardNumWrap}>
                <Text style={styles.cardNum}>{i + 1}</Text>
              </View>
              <Text style={styles.cardTitle}>{l.prenda.nombre} + {l.tejido.nombre}</Text>
            </View>
            <Row icon="texture" label={`Tejido (${l.consumo} ${u} x ${formatARS(l.tejido.precio)}/${u})`} value={formatARS(l.costoTejido)} />
            <Row icon="precision-manufacturing" label={`Confeccion (${l.prenda.minutos} min x ${formatARS(cotizacion.costoMinuto)}/min)`} value={formatARS(l.confeccion)} />
            <Row icon="category" label="Insumos" value={formatARS(l.insumos)} />
            <Divider />
            <Row icon="functions" label="Costo unitario" value={formatARS(l.costoUnitario)} bold />
            <Row icon="inventory" label={`Subtotal (x${l.cantidad})`} value={formatARS(l.subtotal)} bold />
            <Divider />
            <Row icon="sell" label="Precio de venta/u" value={formatARS(precioUnit)} accent bold />
          </Card>
        );
      })}

      {/* Margen */}
      <SectionHeader icon="tune" title="Margen de ganancia" />
      <Card>
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

      {/* Totales */}
      <Card accent>
        <View style={styles.totalHeader}>
          <MaterialIcons name="assessment" size={20} color={COLORS.primary} />
          <Text style={styles.totalTitle}>Resumen final</Text>
        </View>
        <Row icon="group" label="Total unidades" value={totalUnidades.toString()} bold />
        <Row icon="account-balance-wallet" label="Costo total" value={formatARS(totalCosto)} bold />
        <Divider />
        <Row icon="trending-up" label={`Margen ${margenNum}%`} value="" />
        <View style={styles.finalRow}>
          <MaterialIcons name="star" size={18} color={COLORS.primary} />
          <Text style={styles.finalLabel}>PRECIO DE VENTA TOTAL</Text>
          <Text style={styles.finalValue}>{formatARS(totalPrecio)}</Text>
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
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 6,
  },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardNumWrap: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primarySoft,
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  cardNum: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  margenRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  margenInputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingHorizontal: 10, backgroundColor: COLORS.primaryGhost, flex: 1,
  },
  margenInput: { flex: 1, fontSize: 14, paddingVertical: 8, color: COLORS.text },
  margenPct: { fontSize: 14, color: COLORS.textMuted },
  totalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  totalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  finalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primaryGhost, borderRadius: RADIUS.md, padding: 12, marginTop: 8,
  },
  finalLabel: { flex: 1, fontSize: 13, fontWeight: '800', color: COLORS.primary },
  finalValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
});
