import { useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, type ViewStyle } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { COLORS, SHADOWS, RADIUS } from '@/lib/theme';

export function Button({
  title, onPress, icon, variant = 'primary', style, disabled,
}: {
  title: string; onPress: () => void; icon?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline' | 'whatsapp';
  style?: ViewStyle; disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const variantStyles: any = {
    primary: { bg: COLORS.primary, text: '#fff', border: COLORS.primary },
    secondary: { bg: COLORS.primarySoft, text: COLORS.primary, border: COLORS.primarySoft },
    success: { bg: COLORS.success, text: '#fff', border: COLORS.success },
    danger: { bg: COLORS.danger, text: '#fff', border: COLORS.danger },
    ghost: { bg: 'transparent', text: COLORS.primary, border: COLORS.border },
    outline: { bg: 'transparent', text: COLORS.primary, border: COLORS.primary },
    whatsapp: { bg: COLORS.whatsapp, text: '#fff', border: COLORS.whatsapp },
  };
  const v = variantStyles[variant];

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start()}
        disabled={disabled} activeOpacity={0.85}
        style={[styles.button, { backgroundColor: disabled ? COLORS.border : v.bg, borderColor: v.border }]}
      >
        {icon && <MaterialIcons name={icon as any} size={18} color={disabled ? COLORS.textMuted : v.text} style={{ marginRight: title ? 6 : 0 }} />}
        {title ? <Text style={[styles.buttonText, { color: disabled ? COLORS.textMuted : v.text }]}>{title}</Text> : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function Card({ children, style, accent }: { children: React.ReactNode; style?: ViewStyle; accent?: boolean }) {
  return (
    <View style={[styles.card, SHADOWS.small, accent && { borderWidth: 2, borderColor: COLORS.primary }, style]}>
      {children}
    </View>
  );
}

/** Card con dot navy como bullet del titulo (estilo TexQuote) */
export function SectionCard({ title, subtitle, children, style }: { title: string; subtitle?: string; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.card, SHADOWS.small, style]}>
      <View style={styles.sectionCardHeader}>
        <View style={styles.dot} />
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionCardTitle}>{title}</Text>
          {subtitle && <Text style={styles.sectionCardSub}>{subtitle}</Text>}
        </View>
      </View>
      {children}
    </View>
  );
}

export function SectionHeader({ icon, title, subtitle, iconColor, iconBg }: { icon: string; title: string; subtitle?: string; iconColor?: string; iconBg?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconWrap, { backgroundColor: iconBg || COLORS.primaryGhost }]}>
        <MaterialIcons name={icon as any} size={18} color={iconColor || COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

export function Chip({
  label, sublabel, selected, onPress, icon, variant = 'navy',
}: {
  label: string; sublabel?: string; selected: boolean; onPress: () => void; icon?: string;
  variant?: 'navy' | 'soft';
}) {
  const selectedStyle = variant === 'soft'
    ? { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGhost }
    : { borderColor: COLORS.primary, backgroundColor: COLORS.primary };
  const selectedTextColor = variant === 'soft' ? COLORS.primary : '#fff';

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}
      style={[styles.chip, selected && selectedStyle]}>
      {icon && <MaterialIcons name={icon as any} size={15} color={selected ? selectedTextColor : COLORS.primaryLight} style={{ marginRight: 4 }} />}
      <Text style={[styles.chipText, selected && { color: selectedTextColor }]}>{label}</Text>
      {sublabel && <Text style={[styles.chipSub, selected && variant === 'navy' && { color: 'rgba(255,255,255,0.8)' }]}>{sublabel}</Text>}
    </TouchableOpacity>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <MaterialIcons name={icon as any} size={44} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Row({ label, value, bold, accent, green, icon }: {
  label: string; value: string; bold?: boolean; accent?: boolean; green?: boolean; icon?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {icon && <MaterialIcons name={icon as any} size={14} color={green ? COLORS.success : accent ? COLORS.primaryLight : COLORS.textMuted} style={{ marginRight: 6 }} />}
        <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      </View>
      <Text style={[styles.rowValue, bold && styles.bold, accent && { color: COLORS.primary }, green && { color: COLORS.success }]}>{value}</Text>
    </View>
  );
}

/** Chip pequeño para mostrar tags (Brasil 5%, Merma 5%, etc) */
export function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, paddingHorizontal: 20, borderRadius: 13, borderWidth: 1.5,
  },
  buttonText: { fontSize: 15, fontWeight: '700' },
  card: { backgroundColor: COLORS.bgWhite, borderRadius: RADIUS.card, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  sectionCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  sectionCardSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 10 },
  sectionIconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sectionSubtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.md,
    borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.bgWhite,
    alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  chipSub: { fontSize: 10, color: COLORS.textMuted, width: '100%', textAlign: 'center', marginTop: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryGhost, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 4, paddingHorizontal: 40 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  rowLabel: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  rowValue: { fontSize: 13, color: COLORS.text, fontVariant: ['tabular-nums'] },
  bold: { fontWeight: '700', fontSize: 14 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: COLORS.primaryGhost },
  tagText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
});
