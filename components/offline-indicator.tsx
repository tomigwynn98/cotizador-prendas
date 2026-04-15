import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { COLORS } from '@/lib/theme';

export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const updateStatus = () => setOffline(!navigator.onLine);
    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  if (!offline) return null;

  return (
    <View style={styles.container}>
      <MaterialIcons name="cloud-off" size={14} color="#fff" />
      <Text style={styles.text}>Sin conexion · usando datos locales</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.warning,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
});
