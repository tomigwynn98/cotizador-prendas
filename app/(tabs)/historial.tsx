import { useCallback, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

import {
  Cotizacion, getCotizaciones, deleteCotizacion, setCotizacionActual,
  saveCotizacion, calcularCotizacion, getPrendas, getTejidos, getCostoMinuto,
  getMargenDefault, formatARS, formatFecha,
} from '@/lib/storage';
import { COLORS, RADIUS } from '@/lib/theme';
import { Card, PageHeader, EmptyState, Button } from '@/components/ui-kit';
import { showToast } from '@/components/toast';

export default function HistorialScreen() {
  const router = useRouter();
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => setCotizaciones(await getCotizaciones()))();
    }, []),
  );

  const handleVer = async (c: Cotizacion) => {
    await setCotizacionActual(c);
    router.navigate('/resultado');
  };

  const handleRecotizar = async (c: Cotizacion) => {
    // Recalcular con precios actuales
    const [prendas, tejidos, cm, md] = await Promise.all([
      getPrendas(), getTejidos(), getCostoMinuto(), getMargenDefault(),
    ]);

    const lineas = c.lineas.map((l) => ({
      prendaId: l.prenda.id,
      tejidoId: l.tejido.id,
      consumo: l.consumo,
      cantidad: l.cantidad,
    }));

    const nueva = calcularCotizacion(lineas, prendas, tejidos, cm, md, c.cliente);
    if (!nueva) return showToast('Error: prenda o tejido eliminado', 'error');

    await setCotizacionActual(nueva);
    await saveCotizacion(nueva);
    setCotizaciones((prev) => [nueva, ...prev]);
    showToast('Recotizado con precios actuales');
    router.navigate('/resultado');
  };

  const handleEliminar = (id: string) => {
    confirmAction('Eliminar cotizacion', 'Seguro que queres eliminar esta cotizacion?', async () => {
      await deleteCotizacion(id);
      setCotizaciones((prev) => prev.filter((c) => c.id !== id));
      showToast('Cotizacion eliminada');
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader
        icon="history"
        title="Historial"
        subtitle={cotizaciones.length > 0 ? `${cotizaciones.length} cotizaciones` : 'Tus cotizaciones'}
      />

      {cotizaciones.length === 0 ? (
        <EmptyState
          icon="history"
          title="Sin cotizaciones"
          subtitle="Las cotizaciones se guardan automaticamente cuando cotizas un pedido"
        />
      ) : (
        cotizaciones.map((c) => {
          const resumen = c.lineas.map((l) => l.prenda.nombre).join(', ');
          const totalUnidades = c.lineas.reduce((s, l) => s + l.cantidad, 0);

          return (
            <Card key={c.id}>
              <View style={styles.cardTop}>
                <View style={styles.dateRow}>
                  <MaterialIcons name="schedule" size={14} color={COLORS.textMuted} />
                  <Text style={styles.fecha}>{formatFecha(c.fecha)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleEliminar(c.id)} style={styles.deleteBtn}>
                  <MaterialIcons name="delete-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>

              {c.cliente && (
                <View style={styles.clienteRow}>
                  <MaterialIcons name="person" size={14} color={COLORS.primaryLight} />
                  <Text style={styles.clienteText}>{c.cliente}</Text>
                </View>
              )}

              <TouchableOpacity activeOpacity={0.7} onPress={() => handleVer(c)}>
                <View style={styles.cardBody}>
                  <View style={styles.iconWrap}>
                    <MaterialIcons name="receipt-long" size={22} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prendas} numberOfLines={1}>{resumen}</Text>
                    <Text style={styles.detail}>
                      {totalUnidades} unidades | {c.lineas.length} {c.lineas.length === 1 ? 'item' : 'items'}
                    </Text>
                  </View>
                  <View style={styles.priceWrap}>
                    <Text style={styles.priceLabel}>Costo total</Text>
                    <Text style={styles.price}>{formatARS(c.totalGeneral)}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleVer(c)}>
                  <MaterialIcons name="visibility" size={14} color={COLORS.primaryLight} />
                  <Text style={styles.actionText}>Ver desglose</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.recotizarBtn]} onPress={() => handleRecotizar(c)}>
                  <MaterialIcons name="refresh" size={14} color={COLORS.primary} />
                  <Text style={[styles.actionText, { color: COLORS.primary, fontWeight: '700' }]}>Recotizar</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fecha: { fontSize: 12, color: COLORS.textMuted },
  deleteBtn: { padding: 6 },
  clienteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6,
    backgroundColor: COLORS.primaryGhost, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  clienteText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  cardBody: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryGhost,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  prendas: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  detail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  priceWrap: { alignItems: 'flex-end' },
  priceLabel: { fontSize: 10, color: COLORS.textMuted },
  price: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  actionsRow: {
    flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryGhost,
  },
  recotizarBtn: { backgroundColor: COLORS.primarySoft },
  actionText: { fontSize: 12, color: COLORS.primaryLight, fontWeight: '500' },
});
