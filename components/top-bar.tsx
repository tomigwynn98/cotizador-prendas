import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { COLORS, RADIUS, BRAND } from '@/lib/theme';
import { Moneda, getMonedaActiva, setMonedaActiva, fetchTipoCambio, getCachedTipoCambio } from '@/lib/currency';

export function TopBar({
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
      <View style={styles.brandWrap}>
        <View style={styles.logoSquare}>
          <Text style={styles.logoText}>{BRAND.short}</Text>
        </View>
        <View>
          <Text style={styles.brandName}>{BRAND.name}</Text>
          <Text style={styles.brandSub}>Texcin Group</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.currencyBtn} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.currencyTop}>
          <MaterialIcons name="swap-horiz" size={14} color="#fff" />
          <Text style={styles.currencyText}>{moneda}</Text>
        </View>
        <Text style={styles.rateText}>1 USD = {tc.toLocaleString('es-AR')} GS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoSquare: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  brandSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    marginTop: -1,
  },
  currencyBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'flex-end',
  },
  currencyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currencyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  rateText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
});
