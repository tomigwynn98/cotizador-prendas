import { useCallback, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  Cotizacion,
  getCotizacionActual,
  precioSugerido,
  formatARS,
  formatFecha,
} from '@/lib/storage';
import { showToast } from '@/components/toast';

const MARGENES_RAPIDOS = [30, 40, 50];

export default function ResultadoScreen() {
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [margen, setMargen] = useState('40');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const c = await getCotizacionActual();
        if (c) setCotizacion(c);
      })();
    }, []),
  );

  if (!cotizacion) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>Realiza una cotizacion desde la pantalla Cotizar.</Text>
      </View>
    );
  }

  const margenNum = parseFloat(margen) || 0;
  const totalCosto = cotizacion.lineas.reduce((s, l) => s + l.subtotal, 0);
  const totalPrecio = margenNum >= 100 ? Infinity : totalCosto / (1 - margenNum / 100);
  const totalUnidades = cotizacion.lineas.reduce((s, l) => s + l.cantidad, 0);

  const buildTextoWhatsApp = (): string => {
    let txt = `*Cotizacion - ${formatFecha(cotizacion.fecha)}*\n`;
    txt += `Costo minuto: ${formatARS(cotizacion.costoMinuto)}/min\n\n`;

    cotizacion.lineas.forEach((l, i) => {
      const unidad = l.tejido.tipo === 'punto' ? 'kg' : 'm';
      txt += `*${i + 1}. ${l.prenda.nombre} + ${l.tejido.nombre}*\n`;
      txt += `  Tejido: ${l.consumo} ${unidad} x ${formatARS(l.tejido.precio)}/${unidad} = ${formatARS(l.costoTejido)}\n`;
      txt += `  Confeccion: ${l.prenda.minutos} min x ${formatARS(cotizacion.costoMinuto)}/min = ${formatARS(l.confeccion)}\n`;
      txt += `  Insumos: ${formatARS(l.insumos)}\n`;
      txt += `  *Costo unitario: ${formatARS(l.costoUnitario)}*\n`;
      txt += `  Cantidad: ${l.cantidad} u | Subtotal: ${formatARS(l.subtotal)}\n`;

      const precioUnitSugerido = precioSugerido(l.costoUnitario, margenNum);
      txt += `  Precio sugerido: ${formatARS(precioUnitSugerido)}/u\n\n`;
    });

    txt += `---\n`;
    txt += `*TOTAL COSTO: ${formatARS(totalCosto)}*\n`;
    txt += `Margen: ${margenNum}%\n`;
    txt += `*PRECIO SUGERIDO TOTAL: ${formatARS(totalPrecio)}*\n`;
    txt += `Total unidades: ${totalUnidades}`;

    return txt;
  };

  const handleCompartirWhatsApp = async () => {
    const texto = buildTextoWhatsApp();
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // Fallback: copiar al clipboard
      showToast('WhatsApp no disponible', 'error');
    }
  };

  const handleCopiarTexto = async () => {
    const texto = buildTextoWhatsApp().replace(/\*/g, '');
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(texto);
      }
      showToast('Copiado al portapapeles');
    } catch {
      showToast('No se pudo copiar', 'error');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Cotizacion</Text>
          <Text style={styles.fecha}>{formatFecha(cotizacion.fecha)}</Text>
        </View>
        <View style={styles.shareButtons}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleCompartirWhatsApp}>
            <Text style={styles.shareBtnText}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopiarTexto}>
            <Text style={styles.copyBtnText}>Copiar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Líneas */}
      {cotizacion.lineas.map((l, i) => {
        const unidad = l.tejido.tipo === 'punto' ? 'kg' : 'm';
        const precioUnitSugerido = precioSugerido(l.costoUnitario, margenNum);

        return (
          <View key={i} style={styles.card}>
            <Text style={styles.cardTitle}>
              {i + 1}. {l.prenda.nombre} + {l.tejido.nombre}
            </Text>

            <Row
              label={`Tejido (${l.consumo} ${unidad} x ${formatARS(l.tejido.precio)}/${unidad})`}
              value={formatARS(l.costoTejido)}
            />
            <Row
              label={`Confeccion (${l.prenda.minutos} min x ${formatARS(cotizacion.costoMinuto)}/min)`}
              value={formatARS(l.confeccion)}
            />
            <Row label="Insumos" value={formatARS(l.insumos)} />
            <View style={styles.divider} />
            <Row label="Costo unitario" value={formatARS(l.costoUnitario)} bold />
            <Row label={`Subtotal (x${l.cantidad})`} value={formatARS(l.subtotal)} bold />
            <View style={styles.divider} />
            <Row
              label="Precio sugerido/u"
              value={formatARS(precioUnitSugerido)}
              accent
            />
            <Row
              label={`Precio total (x${l.cantidad})`}
              value={formatARS(precioUnitSugerido * l.cantidad)}
              accent
            />
          </View>
        );
      })}

      {/* Margen */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Margen de ganancia</Text>
        <View style={styles.margenRow}>
          {MARGENES_RAPIDOS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.margenChip, margen === m.toString() && styles.margenChipSelected]}
              onPress={() => setMargen(m.toString())}
            >
              <Text style={[styles.margenChipText, margen === m.toString() && styles.margenChipTextSel]}>
                {m}%
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.margenInputWrap}>
            <TextInput
              style={styles.margenInput}
              keyboardType="decimal-pad"
              value={margen}
              onChangeText={setMargen}
              maxLength={5}
            />
            <Text style={styles.margenPercent}>%</Text>
          </View>
        </View>
      </View>

      {/* Totales */}
      <View style={[styles.card, styles.totalCard]}>
        <Row label="Total unidades" value={totalUnidades.toString()} bold />
        <Row label="Costo total" value={formatARS(totalCosto)} bold />
        <View style={styles.divider} />
        <Row label={`Margen ${margenNum}%`} value="" />
        <Row label="PRECIO SUGERIDO TOTAL" value={formatARS(totalPrecio)} bold accent />
      </View>
    </ScrollView>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold, accent && styles.accent]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center', paddingHorizontal: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#111' },
  fecha: { fontSize: 13, color: '#888', marginTop: 2 },
  shareButtons: { flexDirection: 'row', gap: 8 },
  shareBtn: { backgroundColor: '#25d366', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  copyBtn: { backgroundColor: '#007aff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  copyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  totalCard: { borderWidth: 2, borderColor: '#0a7ea4' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  rowLabel: { fontSize: 13, color: '#555', flex: 1 },
  rowValue: { fontSize: 13, color: '#333', fontVariant: ['tabular-nums'] },
  bold: { fontWeight: '700', fontSize: 14 },
  accent: { color: '#0a7ea4' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 6 },
  margenRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  margenChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#f8f8f8',
  },
  margenChipSelected: { borderColor: '#0a7ea4', backgroundColor: '#0a7ea4' },
  margenChipText: { fontSize: 13, fontWeight: '600', color: '#333' },
  margenChipTextSel: { color: '#fff' },
  margenInputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#ddd',
    borderRadius: 8, paddingHorizontal: 10, backgroundColor: '#f8f8f8', flex: 1,
  },
  margenInput: { flex: 1, fontSize: 14, paddingVertical: 7, color: '#333' },
  margenPercent: { fontSize: 14, color: '#888' },
});
