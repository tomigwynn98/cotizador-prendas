import { useCallback, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

function confirmAction(title: string, msg: string, onOk: () => void) {
  if (Platform.OS === 'web') { try { if (window.confirm(`${title}\n${msg}`)) onOk(); } catch { onOk(); } }
  else { const { Alert } = require('react-native'); Alert.alert(title, msg, [{ text: 'No', style: 'cancel' }, { text: 'Si', style: 'destructive', onPress: onOk }]); }
}

import {
  Cotizacion, getCotizaciones, deleteCotizacion, setCotizacionActual,
  saveCotizacion, calcularCotizacion, getPrendas, getTejidos, getInsumos, getPaises,
  getCostoMinuto, getMargenDefault, formatFecha,
} from '@/lib/storage';
import { Moneda, getMonedaActiva, getCachedTipoCambio, fetchTipoCambio, formatFromUSD } from '@/lib/currency';
import { COLORS, RADIUS } from '@/lib/theme';
import { Card, PageHeader, EmptyState } from '@/components/ui-kit';
import { CurrencyBar } from '@/components/currency-bar';
import { showToast } from '@/components/toast';

export default function HistorialScreen() {
  const router = useRouter();
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [moneda, setMoneda] = useState<Moneda>(getMonedaActiva());
  const [tc, setTc] = useState(getCachedTipoCambio());

  useFocusEffect(useCallback(() => {
    (async () => {
      setCotizaciones(await getCotizaciones());
      setTc(await fetchTipoCambio());
      setMoneda(getMonedaActiva());
    })();
  }, []));

  const fmt = (usd: number) => formatFromUSD(usd, moneda, tc);

  const handleVer = async (c: Cotizacion) => { await setCotizacionActual(c); router.navigate('/resultado'); };

  const handleRecotizar = async (c: Cotizacion) => {
    const [prendas, tejidos, insumos, paises, cm, md, rate] = await Promise.all([
      getPrendas(), getTejidos(), getInsumos(), getPaises(), getCostoMinuto(), getMargenDefault(), fetchTipoCambio(),
    ]);
    const l = c.lineas[0]; if (!l) return;
    const pais = l.paisOrigen ? paises.find((p) => p.id === l.paisOrigen!.id) || l.paisOrigen : undefined;
    const insAct = l.insumosSeleccionados.map((is) => insumos.find((i) => i.id === is.insumo.id) || is.insumo);
    const nueva = calcularCotizacion(
      [{ prendaId: l.prenda.id, tejidoId: l.tejido.id, consumo: l.consumo, cantidad: l.cantidad }],
      prendas, tejidos, cm, md, rate, c.cliente, pais, insAct, l.mermaPct || 0,
    );
    if (!nueva) return showToast('Error: prenda o tejido eliminado', 'error');
    await setCotizacionActual(nueva); await saveCotizacion(nueva);
    setCotizaciones((prev) => [nueva, ...prev]);
    showToast('Recotizado con precios actuales');
    router.navigate('/resultado');
  };

  const handleEliminar = (id: string) => {
    confirmAction('Eliminar', 'Seguro?', async () => {
      await deleteCotizacion(id);
      setCotizaciones((prev) => prev.filter((c) => c.id !== id));
      showToast('Eliminada');
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <CurrencyBar onUpdate={(m, r) => { setMoneda(m); setTc(r); }} />
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader icon="history" title="Historial"
          subtitle={cotizaciones.length > 0 ? `${cotizaciones.length} cotizaciones` : 'Tus cotizaciones'} />

        {cotizaciones.length === 0 ? (
          <EmptyState icon="history" title="Sin cotizaciones" subtitle="Se guardan al calcular" />
        ) : cotizaciones.map((c) => {
          const l = c.lineas[0]; if (!l) return null;
          const tieneImp = l.paisOrigen && !l.paisOrigen.isLocal;
          const parts = [l.tejido.nombre];
          if (tieneImp) parts.push(`${l.paisOrigen!.nombre} ${l.paisOrigen!.tasa}%`);
          if (l.mermaPct > 0) parts.push(`Merma ${l.mermaPct}%`);
          parts.push(`${l.cantidad} u`);

          return (
            <Card key={c.id}>
              <View style={styles.top}>
                <View style={styles.dateRow}>
                  <MaterialIcons name="schedule" size={14} color={COLORS.textMuted} />
                  <Text style={styles.fecha}>{formatFecha(c.fecha)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleEliminar(c.id)} style={{ padding: 6 }}>
                  <MaterialIcons name="delete-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
              {c.cliente && (
                <View style={styles.clienteBadge}>
                  <MaterialIcons name="person" size={14} color={COLORS.primaryLight} />
                  <Text style={styles.clienteText}>{c.cliente}</Text>
                </View>
              )}
              <TouchableOpacity activeOpacity={0.7} onPress={() => handleVer(c)}>
                <View style={styles.body}>
                  <View style={styles.iconWrap}><MaterialIcons name="checkroom" size={22} color={COLORS.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prenda}>{l.prenda.nombre}</Text>
                    <Text style={styles.detail}>{parts.join(' · ')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 10, color: COLORS.textMuted }}>Costo total</Text>
                    <Text style={styles.price}>{fmt(c.totalGeneralUSD)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actBtn} onPress={() => handleVer(c)}>
                  <MaterialIcons name="visibility" size={14} color={COLORS.primaryLight} />
                  <Text style={styles.actText}>Ver</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actBtn, { backgroundColor: COLORS.primarySoft }]} onPress={() => handleRecotizar(c)}>
                  <MaterialIcons name="refresh" size={14} color={COLORS.primary} />
                  <Text style={[styles.actText, { color: COLORS.primary, fontWeight: '700' }]}>Recotizar</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fecha: { fontSize: 12, color: COLORS.textMuted },
  clienteBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primaryGhost, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 6 },
  clienteText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  body: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryGhost, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  prenda: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  detail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  price: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm, backgroundColor: COLORS.primaryGhost },
  actText: { fontSize: 12, color: COLORS.primaryLight, fontWeight: '500' },
});
