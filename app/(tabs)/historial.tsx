import { useCallback, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import {
  Cotizacion,
  getCotizaciones,
  deleteCotizacion,
  setCotizacionActual,
  formatARS,
  formatFecha,
} from '@/lib/storage';
import { showToast } from '@/components/toast';

export default function HistorialScreen() {
  const router = useRouter();
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const c = await getCotizaciones();
        setCotizaciones(c);
      })();
    }, []),
  );

  const handleVer = async (cotizacion: Cotizacion) => {
    await setCotizacionActual(cotizacion);
    router.navigate('/resultado');
  };

  const handleEliminar = (id: string) => {
    Alert.alert(
      'Eliminar cotizacion',
      'Seguro que queres eliminar esta cotizacion del historial?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteCotizacion(id);
            setCotizaciones((prev) => prev.filter((c) => c.id !== id));
            showToast('Cotizacion eliminada');
          },
        },
      ],
    );
  };

  if (cotizaciones.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>No hay cotizaciones en el historial.</Text>
        <Text style={styles.emptyHint}>Las cotizaciones se guardan automaticamente al cotizar.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Historial ({cotizaciones.length})</Text>

      {cotizaciones.map((c) => {
        const resumen = c.lineas.map((l) => l.prenda.nombre).join(', ');
        const totalUnidades = c.lineas.reduce((s, l) => s + l.cantidad, 0);

        return (
          <TouchableOpacity key={c.id} style={styles.card} onPress={() => handleVer(c)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardFecha}>{formatFecha(c.fecha)}</Text>
              <TouchableOpacity onPress={() => handleEliminar(c.id)} hitSlop={8}>
                <Text style={styles.deleteText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardPrendas} numberOfLines={1}>{resumen}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardDetail}>{totalUnidades} unidades | {c.lineas.length} items</Text>
              <Text style={styles.cardTotal}>{formatARS(c.totalGeneral)}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center' },
  emptyHint: { fontSize: 13, color: '#bbb', textAlign: 'center', marginTop: 6 },
  title: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardFecha: { fontSize: 12, color: '#888' },
  deleteText: { fontSize: 12, color: '#ff3b30', fontWeight: '600' },
  cardPrendas: { fontSize: 15, fontWeight: '600', color: '#222', marginBottom: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDetail: { fontSize: 13, color: '#777' },
  cardTotal: { fontSize: 15, fontWeight: '700', color: '#0a7ea4' },
});
