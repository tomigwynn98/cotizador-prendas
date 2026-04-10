import { useCallback, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import {
  Cotizacion, getCotizaciones, deleteCotizacion, setCotizacionActual, formatARS, formatFecha,
} from '@/lib/storage';
import { COLORS, SHADOWS, RADIUS } from '@/lib/theme';
import { Card, PageHeader, EmptyState } from '@/components/ui-kit';
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

  const handleEliminar = (id: string) => {
    Alert.alert('Eliminar cotizacion', 'Seguro que queres eliminar esta cotizacion?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await deleteCotizacion(id);
          setCotizaciones((prev) => prev.filter((c) => c.id !== id));
          showToast('Cotizacion eliminada');
        },
      },
    ]);
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
            <TouchableOpacity key={c.id} activeOpacity={0.7} onPress={() => handleVer(c)}>
              <Card>
                <View style={styles.cardTop}>
                  <View style={styles.dateRow}>
                    <MaterialIcons name="schedule" size={14} color={COLORS.textMuted} />
                    <Text style={styles.fecha}>{formatFecha(c.fecha)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleEliminar(c.id)} hitSlop={8} style={styles.deleteBtn}>
                    <MaterialIcons name="delete-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>

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

                <View style={styles.tapHint}>
                  <MaterialIcons name="touch-app" size={14} color={COLORS.primaryLight} />
                  <Text style={styles.tapHintText}>Toca para ver desglose</Text>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fecha: { fontSize: 12, color: COLORS.textMuted },
  deleteBtn: { padding: 4 },
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
  tapHint: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  tapHintText: { fontSize: 11, color: COLORS.primaryLight },
});
