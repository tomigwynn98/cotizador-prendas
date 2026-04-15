import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { COLORS, RADIUS } from '@/lib/theme';

const DISMISS_KEY = 'ios_install_dismissed';

function isIOS(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function isStandalone(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  // @ts-ignore
  return window.navigator.standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true;
}

export function IosInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (!dismissed && isIOS() && !isStandalone()) {
        setTimeout(() => setShow(true), 2000);
      }
    } catch {}
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setShow(false);
  };

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={dismiss} style={styles.container}>
      <View style={styles.iconWrap}>
        <MaterialIcons name="ios-share" size={22} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Instalá TexQuote</Text>
        <Text style={styles.sub}>Tocá el icono compartir y luego "Agregar a pantalla de inicio"</Text>
      </View>
      <MaterialIcons name="close" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 72,
    left: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: RADIUS.card,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 99,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryGhost,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  sub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
