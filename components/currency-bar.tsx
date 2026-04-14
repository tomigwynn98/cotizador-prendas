import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { COLORS, RADIUS } from '@/lib/theme';
import { Moneda, getMonedaActiva, setMonedaActiva, fetchTipoCambio, getCachedTipoCambio } from '@/lib/currency';

export function CurrencyBar({
  onUpdate,
}: {
  onUpdate?: (moneda: Moneda, tc: number) => void;
}) {
  const [moneda, setMoneda] = useState<Moneda>(getMonedaActiva());
  const [tc, setTc] = useState(getCachedTipoCambio());

  useEffect(() => {
    fetchTipoCambio().then((rate) => {
      setTc(rate);
      onUpdate?.(moneda, rate);
    });
  }, []);

  const toggle = () => {
    const next: Moneda = moneda === 'USD' ? 'GS' : 'USD';
    setMoneda(next);
    setMonedaActiva(next);
    onUpdate?.(next, tc);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.toggle} onPress={toggle} activeOpacity={0.7}>
        <MaterialIcons name="swap-horiz" size={16} color={COLORS.primary} />
        <Text style={styles.toggleText}>{moneda}</Text>
      </TouchableOpacity>
      <Text style={styles.rate}>1 USD = {tc.toLocaleString('es-AR')} GS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: COLORS.primaryGhost,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  rate: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
