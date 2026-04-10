import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { COLORS, RADIUS } from '@/lib/theme';

interface ToastMessage {
  text: string;
  type?: 'success' | 'error';
}

let _show: (msg: ToastMessage) => void = () => {};

export function showToast(text: string, type: 'success' | 'error' = 'success') {
  _show({ text, type });
}

export function Toast() {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    _show = (msg) => {
      if (timeout.current) clearTimeout(timeout.current);
      setMessage(msg);
      translateY.setValue(20);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, friction: 8, useNativeDriver: true }),
      ]).start();
      timeout.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 20, duration: 250, useNativeDriver: true }),
        ]).start(() => setMessage(null));
      }, 2200);
    };
  }, []);

  if (!message) return null;

  const isError = message.type === 'error';

  return (
    <Animated.View
      style={[styles.container, { opacity, transform: [{ translateY }] },
        { backgroundColor: isError ? COLORS.danger : COLORS.primary }]}
      pointerEvents="none"
    >
      <MaterialIcons
        name={isError ? 'error-outline' : 'check-circle'}
        size={18}
        color="#fff"
      />
      <Text style={styles.text}>{message.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    borderRadius: RADIUS.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
