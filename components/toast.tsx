import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

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
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    _show = (msg) => {
      if (timeout.current) clearTimeout(timeout.current);
      setMessage(msg);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      timeout.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          setMessage(null);
        });
      }, 2000);
    };
  }, []);

  if (!message) return null;

  const bg = message.type === 'error' ? '#ff3b30' : '#34c759';

  return (
    <Animated.View style={[styles.container, { opacity, backgroundColor: bg }]} pointerEvents="none">
      <Text style={styles.text}>{message.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  text: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
