import { useCallback, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, Platform, Image, Modal } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

function confirmAction(title: string, msg: string, onOk: () => void) {
  if (Platform.OS === 'web') { try { if (window.confirm(`${title}\n${msg}`)) onOk(); } catch { onOk(); } }
  else { const { Alert } = require('react-native'); Alert.alert(title, msg, [{ text: 'No', style: 'cancel' }, { text: 'Si', style: 'destructive', onPress: onOk }]); }
}

import {
  Cotizacion, getCotizaciones, deleteCotizacion, setCotizacionActual,
  saveCotizacion, calcularCotizacion, getPrendas, getTejidos, getInsumos, getPaises,
  getCostoMinuto, getMargenDefault, precioSugerido, formatFecha,
} from '@/lib/storage';
import { Moneda, getMonedaActiva, getCachedTipoCambio, fetchTipoCambio, formatFromUSD } from '@/lib/currency';
import { pickPhoto, uploadPhoto, updateCotizacionFoto } from '@/lib/photos';
import { COLORS, RADIUS } from '@/lib/theme';
import { Card, EmptyState, Button, Tag } from '@/components/ui-kit';
import { TopBar } from '@/components/top-bar';
import { showToast } from '@/components/toast';

export default function HistorialScreen() {
  const router = useRouter();
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [moneda, setMoneda] = useState<Moneda>(getMonedaActiva());
  const [tc, setTc] = useState(getCachedTipoCambio());
  const [photoModalFor, setPhotoModalFor] = useState<string | null>(null);

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
      prendas, tejidos, cm, md, rate, c.cliente, pais, insAct, l.comisionPct || 0, l.mermaPct || 0, l.logisticaPct || 0,
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

  const handleChangePhoto = async (c: Cotizacion, source: 'camera' | 'library') => {
    setPhotoModalFor(null);
    try {
      const asset = await pickPhoto(source);
      if (!asset) return;
      const url = await uploadPhoto(asset, c.id);
      if (!url) return showToast('Error al subir', 'error');
      await updateCotizacionFoto(c.id, url);
      setCotizaciones((prev) => prev.map((x) => x.id === c.id ? { ...x, fotoUrl: url } : x));
      showToast('Foto actualizada');
    } catch { showToast('Error', 'error'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <TopBar onUpdate={(m, r) => { setMoneda(m); setTc(r); }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Historial</Text>
          <Text style={styles.headerSub}>{cotizaciones.length} cotizaciones</Text>
        </View>

        {cotizaciones.length === 0 ? (
          <EmptyState icon="history" title="Sin cotizaciones" subtitle="Se guardan desde la pantalla Resultado" />
        ) : cotizaciones.map((c) => {
          const l = c.lineas[0]; if (!l) return null;
          const pvUSD = precioSugerido(l.costoRealUSD, c.margen, l.comisionPct || 0);
          const tags: string[] = [];
          if (l.paisOrigen && !l.paisOrigen.isLocal) tags.push(`${l.paisOrigen.nombre} ${l.paisOrigen.tasa}%`);
          if (l.comisionPct > 0) tags.push(`Com. ${l.comisionPct}%`);
          if (l.mermaPct > 0) tags.push(`Merma ${l.mermaPct}%`);
          if (l.logisticaPct > 0) tags.push(`Log. ${l.logisticaPct}%`);

          return (
            <Card key={c.id} style={{ padding: 0, overflow: 'hidden' }}>
              {/* Top row with photo + info */}
              <View style={styles.cardTop}>
                <TouchableOpacity onPress={() => setPhotoModalFor(c.id)} activeOpacity={0.8}>
                  {c.fotoUrl ? (
                    <Image source={{ uri: c.fotoUrl }} style={styles.thumb} />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <MaterialIcons name="checkroom" size={26} color={COLORS.primary} />
                    </View>
                  )}
                </TouchableOpacity>

                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.fecha}>{formatFecha(c.fecha)}</Text>
                    <TouchableOpacity onPress={() => handleEliminar(c.id)} hitSlop={8}>
                      <MaterialIcons name="delete-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.prenda}>{l.prenda.nombre}</Text>
                  <Text style={styles.tejido}>{l.tejido.nombre} · {l.cantidad} u</Text>
                  {c.cliente && (
                    <View style={styles.clienteRow}>
                      <MaterialIcons name="person" size={12} color={COLORS.primary} />
                      <Text style={styles.clienteText}>{c.cliente}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Tags */}
              {tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {tags.map((t, i) => <Tag key={i} label={t} />)}
                </View>
              )}

              {/* Prices */}
              <View style={styles.pricesRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.priceLabel}>Costo/u</Text>
                  <Text style={styles.costoValue}>{fmt(l.costoRealUSD)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.priceLabel}>Venta/u</Text>
                  <Text style={styles.ventaValue}>{fmt(pvUSD)}</Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.verBtn} onPress={() => handleVer(c)}>
                  <MaterialIcons name="visibility" size={15} color={COLORS.primary} />
                  <Text style={styles.verText}>Ver desglose</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.recotBtn} onPress={() => handleRecotizar(c)}>
                  <MaterialIcons name="refresh" size={15} color="#fff" />
                  <Text style={styles.recotText}>Recotizar</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        })}
      </ScrollView>

      {/* Modal foto */}
      <Modal visible={!!photoModalFor} transparent animationType="fade" onRequestClose={() => setPhotoModalFor(null)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setPhotoModalFor(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cambiar foto</Text>
            <TouchableOpacity style={styles.modalOpt} onPress={() => {
              const c = cotizaciones.find((x) => x.id === photoModalFor);
              if (c) handleChangePhoto(c, 'camera');
            }}>
              <MaterialIcons name="photo-camera" size={22} color={COLORS.primary} />
              <Text style={styles.modalOptText}>Tomar foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOpt} onPress={() => {
              const c = cotizaciones.find((x) => x.id === photoModalFor);
              if (c) handleChangePhoto(c, 'library');
            }}>
              <MaterialIcons name="photo-library" size={22} color={COLORS.primary} />
              <Text style={styles.modalOptText}>Elegir de galeria</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalOpt, { justifyContent: 'center' }]} onPress={() => setPhotoModalFor(null)}>
              <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 14 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  cardTop: { flexDirection: 'row', padding: 12, gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: COLORS.border },
  thumbPlaceholder: { width: 56, height: 56, borderRadius: 10, backgroundColor: COLORS.primaryGhost, justifyContent: 'center', alignItems: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  fecha: { fontSize: 11, color: COLORS.textMuted },
  prenda: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  tejido: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  clienteRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4, alignSelf: 'flex-start' },
  clienteText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingHorizontal: 12, paddingBottom: 8 },
  pricesRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  priceLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  costoValue: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginTop: 2 },
  ventaValue: { fontSize: 18, fontWeight: '800', color: COLORS.success, marginTop: 2 },
  actionsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  verBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, padding: 12, borderRightWidth: 1, borderRightColor: COLORS.border },
  verText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  recotBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, padding: 12, backgroundColor: COLORS.primary },
  recotText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 16 },
  modalOpt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.bg, marginBottom: 8 },
  modalOptText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
});
