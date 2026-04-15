import { Tabs, Redirect } from 'expo-router';
import { ActivityIndicator, View, Platform } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { COLORS } from '@/lib/theme';
import { useAuth } from '@/contexts/auth-context';

export default function TabLayout() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>;
  }

  if (!user) return <Redirect href="/login" />;

  const isAdmin = profile?.role === 'admin';

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: '#94a3b8',
      headerShown: false,
      tabBarShowLabel: true,
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        elevation: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        paddingTop: 6,
        paddingBottom: Platform.OS === 'web' ? 'max(6px, env(safe-area-inset-bottom))' as any : 6,
        height: Platform.OS === 'web' ? 'auto' as any : 62,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4, marginTop: 2 },
      tabBarIconStyle: { marginTop: 2 },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Cotizar', tabBarIcon: ({ color, size }) => <MaterialIcons name="calculate" size={size} color={color} /> }} />
      <Tabs.Screen name="resultado" options={{ title: 'Resultado', tabBarIcon: ({ color, size }) => <MaterialIcons name="receipt-long" size={size} color={color} /> }} />
      <Tabs.Screen name="historial" options={{ title: 'Historial', tabBarIcon: ({ color, size }) => <MaterialIcons name="history" size={size} color={color} /> }} />
      <Tabs.Screen name="config" options={{ title: 'Config', tabBarIcon: ({ color, size }) => <MaterialIcons name="settings" size={size} color={color} /> }} />
      <Tabs.Screen name="admin" options={{
        title: 'Admin',
        tabBarIcon: ({ color, size }) => <MaterialIcons name="admin-panel-settings" size={size} color={color} />,
        href: isAdmin ? '/admin' : null,
      }} />
    </Tabs>
  );
}
