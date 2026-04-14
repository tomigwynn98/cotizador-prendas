import { Tabs, Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
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
      tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 0, elevation: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 8, paddingTop: 4, height: 60 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
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
