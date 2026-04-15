import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Platform } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/auth-context';
import { Toast } from '@/components/toast';
import { IosInstallBanner } from '@/components/ios-install-banner';
import { OfflineIndicator } from '@/components/offline-indicator';

// Register service worker on web with auto-update
if (Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // NUKE old service workers and caches first
      const regs = await navigator.serviceWorker.getRegistrations();
      let hadOld = false;
      for (const reg of regs) {
        // If SW script URL points to old version, unregister
        const swUrl = reg.active?.scriptURL || '';
        if (swUrl.includes('sw.js') && !reg.scope.endsWith('/')) {
          // Keep only the current one — unregister older ones
        }
      }

      // Clear old caches (keep only current version)
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) {
          if (k !== 'texquote-v2') {
            await caches.delete(k);
            hadOld = true;
          }
        }
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await reg.update();

      // Si habia caches viejos, recargar
      if (hadOld) {
        setTimeout(() => window.location.reload(), 500);
        return;
      }

      setInterval(() => reg.update(), 60000);
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          });
        }
      });
    } catch {}
  });
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <View style={{ flex: 1 }}>
        <OfflineIndicator />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        <IosInstallBanner />
        <Toast />
      </View>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
