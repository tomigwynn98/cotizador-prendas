import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '@/contexts/auth-context';
import { COLORS, RADIUS } from '@/lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) { setError('Completa email y contraseña'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }

    setLoading(true);
    const err = isRegister ? await signUp(email.trim(), password) : await signIn(email.trim(), password);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <MaterialIcons name="checkroom" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.appName}>Cotizador</Text>
          <Text style={styles.appSub}>de Prendas</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{isRegister ? 'Crear cuenta' : 'Iniciar sesion'}</Text>

          {error ? (
            <View style={styles.errorBox}>
              <MaterialIcons name="error-outline" size={16} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="tu@email.com" placeholderTextColor={COLORS.textMuted}
            value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput style={styles.input} placeholder="Minimo 6 caracteres" placeholderTextColor={COLORS.textMuted}
            value={password} onChangeText={setPassword} secureTextEntry />

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{isRegister ? 'Registrarse' : 'Entrar'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setIsRegister(!isRegister); setError(''); }} style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              {isRegister ? 'Ya tengo cuenta.' : 'No tengo cuenta.'}{' '}
              <Text style={styles.toggleLink}>{isRegister ? 'Iniciar sesion' : 'Registrarse'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryGhost,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  appName: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  appSub: { fontSize: 16, color: COLORS.textSecondary, marginTop: 2 },
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: 12, fontSize: 16, backgroundColor: COLORS.primaryGhost, color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 14,
    alignItems: 'center', marginTop: 24,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.dangerSoft, borderRadius: RADIUS.sm, padding: 10, marginBottom: 8,
  },
  errorText: { fontSize: 13, color: COLORS.danger, flex: 1 },
  toggleRow: { marginTop: 16, alignItems: 'center' },
  toggleText: { fontSize: 14, color: COLORS.textSecondary },
  toggleLink: { color: COLORS.primary, fontWeight: '600' },
});
