import { useCallback, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TextInput, TouchableOpacity, Linking, Platform, Image, Modal } from 'react-native';
import { useFocusEffect } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Cotizacion, getCotizacionActual, precioSugerido, formatFecha, getMargenDefault, saveCotizacion, setCotizacionActual } from '@/lib/storage';
import { Moneda, getMonedaActiva, getCachedTipoCambio, fetchTipoCambio, formatFromUSD } from '@/lib/currency';
import { pickPhoto, uploadPhoto } from '@/lib/photos';
import { COLORS, RADIUS } from '@/lib/theme';
import { Card, SectionCard, Chip, EmptyState, Row, Divider, Button } from '@/components/ui-kit';
import { TopBar } from '@/components/top-bar';
import { showToast } from '@/components/toast';

const MARGENES = [30, 40, 50];

export default function ResultadoScreen() {
  const [cot, setCot] = useState<Cotizacion | null>(null);
  const [margen, setMargen] = useState('40');
  const [cliente, setCliente] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | undefined>();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoOpts, setShowPhotoOpts] = useState(false);
  const [moneda, setMoneda] = useState<Moneda>(getMonedaActiva());
  const [tc, setTc] = useState(getCachedTipoCambio());
  const [guardado, setGuardado] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => {
      const [c, md, rate] = await Promise.all([getCotizacionActual(), getMargenDefault(), fetchTipoCambio()]);
      if (c) { setCot(c); setCliente(c.cliente || ''); setFotoUrl(c.fotoUrl); setGuardado(false); }
      setMargen(md.toString()); setTc(rate); setMoneda(getMonedaActiva());
    })();
  }, []));

  if (!cot) return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <TopBar onUpdate={(m, r) => { setMoneda(m); setTc(r); }} />
      <ScrollView contentContainerStyle={styles.content}>
        <EmptyState icon="calculate" title="Sin cotizacion" subtitle="Calcula desde la pantalla Cotizar" />
      </ScrollView>
    </View>
  );

  const margenNum = parseFloat(margen.replace(',', '.')) || 0;
  const l = cot.lineas[0];
  const u = l.tejido.tipo === 'punto' ? 'kg' : 'm';
  const comisionNum = l.comisionPct || 0;
  const pvUSD = precioSugerido(l.costoRealUSD, margenNum, comisionNum);
  const pvTotalUSD = pvUSD * l.cantidad;
  const tieneImp = l.costoImportacionUSD > 0 && l.paisOrigen && !l.paisOrigen.isLocal;
  const tieneMerma = l.mermaPct > 0;
  const tieneLogistica = l.logisticaPct > 0;
  const tieneExtras = tieneMerma || tieneLogistica;
  const fmt = (usd: number) => formatFromUSD(usd, moneda, tc);

  const handlePickPhoto = async (source: 'camera' | 'library') => {
    setShowPhotoOpts(false);
    setUploadingPhoto(true);
    try {
      const asset = await pickPhoto(source);
      if (!asset) { setUploadingPhoto(false); return; }
      const url = await uploadPhoto(asset, cot.id);
      if (url) {
        setFotoUrl(url);
        const updated = { ...cot, fotoUrl: url };
        setCot(updated);
        await setCotizacionActual(updated);
        showToast('Foto agregada');
      } else {
        showToast('Error al subir foto', 'error');
      }
    } catch { showToast('Error con la foto', 'error'); }
    setUploadingPhoto(false);
  };

  const buildWA = (): string => {
    let t = `*${l.prenda.nombre}*\n`;
    if (cliente.trim()) t += `Cliente: ${cliente.trim()}\n`;
    t += `${formatFecha(cot.fecha)}\n\n`;
    t += `Tejido ${l.tejido.nombre}: ${fmt(l.costoTejidoUSD)}\n`;
    if (tieneImp) t += `Importacion ${l.paisOrigen!.nombre} ${l.paisOrigen!.tasa}%: ${fmt(l.costoImportacionUSD)}\n`;
    t += `Confeccion: ${fmt(l.confeccionUSD)}\n`;
    l.insumosSeleccionados.forEach((is) => { t += `${is.insumo.nombre}: ${fmt(is.costoUSD)}\n`; });
    t += `*Costo unitario: ${fmt(l.costoUnitarioUSD)}*\n`;
    if (tieneMerma) t += `Merma ${l.mermaPct}%: ${fmt(l.costoMermaUSD)}\n`;
    if (tieneLogistica) t += `Logistica ${l.logisticaPct}%: ${fmt(l.costoLogisticaUSD)}\n`;
    if (tieneExtras) t += `*Costo real: ${fmt(l.costoRealUSD)}*\n`;
    t += `\nCantidad: ${l.cantidad} u\n`;
    t += comisionNum > 0 ? `Margen ${margenNum}% + Comision ${comisionNum}% = ${margenNum + comisionNum}%\n` : `Margen: ${margenNum}%\n`;
    t += `*Precio venta: ${fmt(pvUSD)}/u*\n*TOTAL: ${fmt(pvTotalUSD)}*`;
    return t;
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <TopBar onUpdate={(m, r) => { setMoneda(m); setTc(r); }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header prenda */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.prendaTitle}>{l.prenda.nombre}</Text>
            <Text style={styles.prendaSub}>{formatFecha(cot.fecha)} · {l.cantidad} u</Text>
          </View>
          <View style={styles.shareRow}>
            <TouchableOpacity style={styles.waBtn} onPress={async () => {
              const url = `https://wa.me/?text=${encodeURIComponent(buildWA())}`;
              if (await Linking.canOpenURL(url)) Linking.openURL(url);
              else showToast('WhatsApp no disponible', 'error');
            }}>
              <MaterialIcons name="share" size={15} color="#fff" />
              <Text style={styles.waBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.copyBtn} onPress={async () => {
              try { if (Platform.OS === 'web') await navigator.clipboard.writeText(buildWA().replace(/\*/g, '')); showToast('Copiado'); }
              catch { showToast('Error', 'error'); }
            }}>
              <MaterialIcons name="content-copy" size={15} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Foto */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => setShowPhotoOpts(true)} style={styles.photoContainer}>
          {fotoUrl ? (
            <Image source={{ uri: fotoUrl }} style={styles.photoBig} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <MaterialIcons name="add-a-photo" size={32} color={COLORS.primary} />
              <Text style={styles.photoHint}>Agregar foto de la prenda</Text>
            </View>
          )}
          {uploadingPhoto && (
            <View style={styles.photoOverlay}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Subiendo...</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Cliente */}
        <Card>
          <View style={styles.clienteRow}>
            <MaterialIcons name="person" size={16} color={COLORS.primaryLight} />
            <TextInput style={styles.clienteInput} placeholder="Cliente (opcional)"
              placeholderTextColor={COLORS.textMuted} value={cliente} onChangeText={setCliente} />
          </View>
        </Card>

        {/* Desglose */}
        <SectionCard title="Desglose de costos">
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
        </SectionCard>

        {/* Margen */}
        <SectionCard title="Margen de ganancia">
          <View style={styles.margenRow}>
            {MARGENES.map((m) => (
              <Chip key={m} label={`${m}%`} selected={margen === m.toString()}
                onPress={() => setMargen(m.toString())} />
            ))}
            <View style={styles.margenInputWrap}>
              <TextInput style={styles.margenInput} keyboardType="decimal-pad"
                value={margen} onChangeText={setMargen} maxLength={5} />
              <Text style={styles.margenPct}>%</Text>
            </View>
          </View>
        </SectionCard>

        {/* Precio venta - Hero */}
        <View style={styles.heroGradient}>
          <View style={styles.heroTop}>
            <MaterialIcons name="sell" size={16} color="#fff" />
            <Text style={styles.heroLabel}>Precio de venta unitario</Text>
          </View>
          {comisionNum > 0 && (
            <Text style={styles.heroMargen}>Margen {margenNum}% + Comision {comisionNum}% = {margenNum + comisionNum}%</Text>
          )}
          <Text style={styles.heroPrice}>{fmt(pvUSD)}</Text>
          <View style={styles.heroDivider} />
          <View style={styles.heroTotalRow}>
            <Text style={styles.heroTotalLabel}>TOTAL ({l.cantidad} u)</Text>
            <Text style={styles.heroTotalValue}>{fmt(pvTotalUSD)}</Text>
          </View>
        </View>

        {/* Guardar */}
        {guardado ? (
          <View style={styles.savedBox}>
            <MaterialIcons name="check-circle" size={20} color={COLORS.success} />
            <Text style={styles.savedText}>Guardado en historial</Text>
          </View>
        ) : (
          <Button title="Guardar en historial" icon="save" variant="success" onPress={async () => {
            if (!cot) return;
            const toSave = { ...cot, cliente: cliente.trim() || undefined, fotoUrl };
            try {
              await saveCotizacion(toSave);
              setGuardado(true);
              showToast('Guardado en historial');
            } catch { showToast('Error al guardar', 'error'); }
          }} />
        )}
      </ScrollView>

      {/* Modal opciones de foto */}
      <Modal visible={showPhotoOpts} transparent animationType="fade" onRequestClose={() => setShowPhotoOpts(false)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setShowPhotoOpts(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{fotoUrl ? 'Cambiar foto' : 'Agregar foto'}</Text>
            <TouchableOpacity style={styles.modalOpt} onPress={() => handlePickPhoto('camera')}>
              <MaterialIcons name="photo-camera" size={22} color={COLORS.primary} />
              <Text style={styles.modalOptText}>Tomar foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOpt} onPress={() => handlePickPhoto('library')}>
              <MaterialIcons name="photo-library" size={22} color={COLORS.primary} />
              <Text style={styles.modalOptText}>Elegir de galeria</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalOpt, { justifyContent: 'center' }]} onPress={() => setShowPhotoOpts(false)}>
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
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 8 },
  prendaTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  prendaSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  shareRow: { flexDirection: 'row', gap: 6 },
  waBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.whatsapp, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 7 },
  waBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  copyBtn: { backgroundColor: COLORS.border, borderRadius: RADIUS.sm, paddingHorizontal: 9, paddingVertical: 7 },
  photoContainer: { borderRadius: RADIUS.card, overflow: 'hidden', marginBottom: 10, position: 'relative' },
  photoBig: { width: '100%', height: 200, backgroundColor: COLORS.border },
  photoPlaceholder: { height: 140, backgroundColor: COLORS.primaryGhost, borderWidth: 2, borderColor: COLORS.primarySoft, borderStyle: 'dashed', borderRadius: RADIUS.card, justifyContent: 'center', alignItems: 'center', gap: 6 },
  photoHint: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  photoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  clienteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clienteInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 2 },
  subTitle: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 4 },
  margenRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  margenInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 10, backgroundColor: COLORS.bg, flex: 1 },
  margenInput: { flex: 1, fontSize: 14, paddingVertical: 8, color: COLORS.text },
  margenPct: { fontSize: 14, color: COLORS.textMuted },
  heroGradient: { backgroundColor: COLORS.primary, borderRadius: RADIUS.card, padding: 20, marginTop: 4, marginBottom: 12, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  heroLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  heroMargen: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  heroPrice: { fontSize: 34, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 14 },
  heroTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTotalLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 },
  heroTotalValue: { fontSize: 20, fontWeight: '800', color: 'rgba(255,255,255,0.9)' },
  savedBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, backgroundColor: COLORS.successSoft, borderRadius: RADIUS.md },
  savedText: { fontSize: 15, fontWeight: '700', color: COLORS.success },
  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 16 },
  modalOpt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.bg, marginBottom: 8 },
  modalOptText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
});
