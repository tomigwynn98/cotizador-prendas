import { useCallback, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { getAllProfiles, getAllCotizaciones, getTeams, setUserTeam } from '@/lib/supabase-storage';
import { formatFecha } from '@/lib/storage';
import { Moneda, getMonedaActiva, getCachedTipoCambio, fetchTipoCambio, formatFromUSD } from '@/lib/currency';
import { COLORS, RADIUS } from '@/lib/theme';
import { Card } from '@/components/ui-kit';
import { TopBar } from '@/components/top-bar';
import { useAuth } from '@/contexts/auth-context';
import { showToast } from '@/components/toast';

export default function AdminScreen() {
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [moneda, setMoneda] = useState<Moneda>(getMonedaActiva());
  const [tc, setTc] = useState(getCachedTipoCambio());

  const load = async () => {
    const [p, c, t, rate] = await Promise.all([getAllProfiles(), getAllCotizaciones(), getTeams(), fetchTipoCambio()]);
    setProfiles(p); setCotizaciones(c); setTeams(t); setTc(rate); setMoneda(getMonedaActiva());
  };

  useFocusEffect(useCallback(() => {
    if (profile?.role !== 'admin') return;
    load();
  }, [profile?.role]));

  const fmt = (usd: number) => formatFromUSD(usd, moneda, tc);

  const toggleTeamMember = async (userId: string, currentTeamId: string | null, teamId: string) => {
    const newTeamId = currentTeamId === teamId ? null : teamId;
    await setUserTeam(userId, newTeamId);
    showToast(newTeamId ? 'Agregado al equipo' : 'Quitado del equipo');
    load();
  };

  if (profile?.role !== 'admin') {
    return <View style={s.center}><Text style={s.noAccess}>Acceso restringido</Text></View>;
  }

  const defaultTeam = teams[0];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <TopBar onUpdate={(m, r) => { setMoneda(m); setTc(r); }} />
      <ScrollView contentContainerStyle={s.content}>
        <View style={{ marginBottom: 12 }}>
          <Text style={s.pageTitle}>Admin</Text>
          <Text style={s.pageSub}>{profiles.length} usuarios · {cotizaciones.length} cotizaciones</Text>
        </View>

        {/* Team info */}
        {defaultTeam && (
          <Card style={{ backgroundColor: COLORS.primaryGhost, borderColor: COLORS.primarySoft }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <MaterialIcons name="groups" size={22} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary }}>Equipo {defaultTeam.name}</Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                  {profiles.filter((p) => p.team_id === defaultTeam.id).length} miembros comparten datos
                </Text>
              </View>
            </View>
          </Card>
        )}

        <Text style={s.section}>Usuarios ({profiles.length})</Text>
        {profiles.map((p: any) => {
          const inTeam = defaultTeam && p.team_id === defaultTeam.id;
          return (
            <Card key={p.id}>
              <View style={s.userRow}>
                <MaterialIcons name={p.role === 'admin' ? 'shield' : 'person'} size={20} color={p.role === 'admin' ? COLORS.warning : COLORS.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={s.email}>{p.email}</Text>
                  <Text style={s.role}>{p.role} · {formatFecha(p.created_at)}</Text>
                </View>
                {defaultTeam && (
                  <TouchableOpacity
                    style={[s.teamBtn, inTeam && s.teamBtnActive]}
                    onPress={() => toggleTeamMember(p.id, p.team_id, defaultTeam.id)}
                  >
                    <MaterialIcons name={inTeam ? 'check-circle' : 'add-circle-outline'} size={14} color={inTeam ? '#fff' : COLORS.primary} />
                    <Text style={[s.teamBtnText, inTeam && { color: '#fff' }]}>
                      {inTeam ? 'En equipo' : 'Agregar'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          );
        })}

        <Text style={s.section}>Cotizaciones recientes</Text>
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
  content: { padding: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  pageSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  noAccess: { fontSize: 16, color: COLORS.textMuted },
  section: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 18, marginBottom: 8 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  email: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  role: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  teamBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryGhost, borderWidth: 1, borderColor: COLORS.primarySoft,
  },
  teamBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  teamBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  cotRow: { flexDirection: 'row', alignItems: 'center' },
  cotUser: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  cotDetail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  cotDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  cotPrice: { fontSize: 15, fontWeight: '800', color: COLORS.success },
});
