import { useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  type ViewStyle,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { COLORS, SHADOWS, RADIUS } from '@/lib/theme';

// --- Animated Pressable Button ---
export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  style,
  disabled,
}: {
  title: string;
  onPress: () => void;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'dashed';
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  const variantStyles = {
    primary: { bg: COLORS.primary, text: '#fff', border: COLORS.primary },
    secondary: { bg: COLORS.primarySoft, text: COLORS.primary, border: COLORS.primarySoft },
    success: { bg: COLORS.success, text: '#fff', border: COLORS.success },
    danger: { bg: COLORS.danger, text: '#fff', border: COLORS.danger },
    ghost: { bg: 'transparent', text: COLORS.primary, border: COLORS.border },
    dashed: { bg: COLORS.primaryGhost, text: COLORS.primaryLight, border: COLORS.primaryLight },
  };

  const v = variantStyles[variant];

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
        style={[
          styles.button,
          {
            backgroundColor: disabled ? COLORS.border : v.bg,
            borderColor: variant === 'dashed' ? v.border : v.bg,
            borderStyle: variant === 'dashed' ? 'dashed' : 'solid',
          },
        ]}
      >
        {icon && (
          <MaterialIcons
            name={icon as any}
            size={18}
            color={disabled ? COLORS.textMuted : v.text}
            style={{ marginRight: title ? 6 : 0 }}
          />
        )}
        {title ? (
          <Text style={[styles.buttonText, { color: disabled ? COLORS.textMuted : v.text }]}>
            {title}
          </Text>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

// --- Card ---
export function Card({
  children,
  style,
  accent,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  accent?: boolean;
}) {
  return (
    <View
      style={[
        styles.card,
        SHADOWS.small,
        accent && { borderWidth: 2, borderColor: COLORS.primaryLight },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// --- Section Header ---
export function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <MaterialIcons name={icon as any} size={20} color={COLORS.primaryLight} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

// --- Chip selector ---
export function Chip({
  label,
  sublabel,
  selected,
  onPress,
  icon,
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
  icon?: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon && (
        <MaterialIcons
          name={icon as any}
          size={16}
          color={selected ? '#fff' : COLORS.primaryLight}
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      {sublabel && (
        <Text style={[styles.chipSub, selected && { color: 'rgba(255,255,255,0.8)' }]}>
          {sublabel}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// --- Empty state ---
export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <MaterialIcons name={icon as any} size={48} color={COLORS.primaryLight} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    </View>
  );
}

// --- Divider ---
export function Divider() {
  return <View style={styles.divider} />;
}

// --- Row ---
export function Row({
  label,
  value,
  bold,
  accent,
  green,
  icon,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
  green?: boolean;
  icon?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {icon && (
          <MaterialIcons
            name={icon as any}
            size={14}
            color={green ? COLORS.success : accent ? COLORS.primaryLight : COLORS.textMuted}
            style={{ marginRight: 6 }}
          />
        )}
        <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      </View>
      <Text style={[styles.rowValue, bold && styles.bold, accent && { color: COLORS.primary }, green && { color: COLORS.success }]}>
        {value}
      </Text>
    </View>
  );
}

// --- Page Header (light version) ---
export function PageHeader({
  icon,
  title,
  subtitle,
  rightContent,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderLeft}>
        <View style={styles.pageHeaderIconWrap}>
          <MaterialIcons name={icon as any} size={22} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageHeaderTitle}>{title}</Text>
          {subtitle && <Text style={styles.pageHeaderSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightContent}
    </View>
  );
}

const styles = StyleSheet.create({
  // Button
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Card
  card: {
    backgroundColor: COLORS.bgWhite,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
  },
  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryGhost,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  // Chip
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgWhite,
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  chipTextSelected: {
    color: '#fff',
  },
  chipSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    width: '100%',
    textAlign: 'center',
    marginTop: 2,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryGhost,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 40,
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  // Row
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  rowLabel: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  rowValue: { fontSize: 13, color: COLORS.text, fontVariant: ['tabular-nums'] },
  bold: { fontWeight: '700', fontSize: 14 },
  // Page Header — light
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: -20,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
  },
  pageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pageHeaderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryGhost,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pageHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  pageHeaderSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
});
