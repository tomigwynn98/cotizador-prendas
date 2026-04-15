import { useCallback, useState } from 'react';
import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { getAllProfiles, getAllCotizaciones } from '@/lib/supabase-storage';
import { formatFecha } from '@/lib/storage';
import { Moneda, getMonedaActiva, getCachedTipoCambio, fetchTipoCambio, formatFromUSD } from '@/lib/currency';
import { COLORS, RADIUS } from '@/lib/theme';
import { Card } from '@/components/ui-kit';
import { TopBar } from '@/components/top-bar';
import { useAuth } from '@/contexts/auth-context';

export default function AdminScreen() {
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [moneda, setMoneda] = useState<Moneda>(getMonedaActiva());
  const [tc, setTc] = useState(getCachedTipoCambio());

  useFocusEffect(useCallback(() => {
    if (profile?.role !== 'admin') return;
    (async () => {
      const [p, c, rate] = await Promise.all([getAllProfiles(), getAllCotizaciones(), fetchTipoCambio()]);
      setProfiles(p); setCotizaciones(c); setTc(rate); setMoneda(getMonedaActiva());
    })();
  }, []));

  const fmt = (usd: number) => formatFromUSD(usd, moneda, tc);

  if (profile?.role !== 'admin') {
    return <View style={s.center}><Text style={s.noAccess}>Acceso restringido</Text></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <TopBar onUpdate={(m, r) => { setMoneda(m); setTc(r); }} />
      <ScrollView contentContainerStyle={s.content}>
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.text }}>Admin</Text>
          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{profiles.length} usuarios · {cotizaciones.length} cotizaciones</Text>
        </View>

        <Text style={s.section}>Usuarios ({profiles.length})</Text>
        {profiles.map((p: any) => (
          <Card key={p.id}>
            <View style={s.userRow}>
              <MaterialIcons name={p.role === 'admin' ? 'shield' : 'person'} size={20} color={p.role === 'admin' ? '#f59e0b' : COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.email}>{p.email}</Text>
                <Text style={s.role}>{p.role} · {formatFecha(p.created_at)}</Text>
              </View>
            </View>
          </Card>
        ))}

        <Text style={s.section}>Cotizaciones recientes ({cotizaciones.length})</Text>
        {cotizaciones.slice(0, 50).map((c: any, i: number) => {
          const l = c.lineas?.[0];
          return (
            <Card key={c.dbId || i}>
              <View style={s.cotRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cotUser}>{c.userEmail}</Text>
                  <Text style={s.cotDetail}>
                    {l?.prenda?.nombre || '?'} · {l?.tejido?.nombre || '?'} · {l?.cantidad || 0} u
                  </Text>
                  <Text style={s.cotDate}>{formatFecha(c.fecha)}</Text>
                </View>
                <Text style={s.cotPrice}>{fmt(c.totalGeneralUSD || 0)}</Text>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  noAccess: { fontSize: 16, color: COLORS.textMuted },
  section: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 20, marginBottom: 8 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  email: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  role: { fontSize: 12, color: COLORS.textMuted },
  cotRow: { flexDirection: 'row', alignItems: 'center' },
  cotUser: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  cotDetail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  cotDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  cotPrice: { fontSize: 15, fontWeight: '800', color: COLORS.success },
});
