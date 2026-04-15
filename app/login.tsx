import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '@/contexts/auth-context';
import { COLORS, RADIUS, BRAND } from '@/lib/theme';

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

    if (err) setError(err);
    else router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.logoWrap}>
          <View style={styles.logoSquare}>
            <Text style={styles.logoText}>{BRAND.short}</Text>
          </View>
          <Text style={styles.appName}>{BRAND.name}</Text>
          <Text style={styles.appSub}>by {BRAND.subtitle}</Text>
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

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isRegister ? 'Registrarse' : 'Entrar'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setIsRegister(!isRegister); setError(''); }} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={styles.toggleText}>
              {isRegister ? 'Ya tengo cuenta. ' : 'No tengo cuenta. '}
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
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logoSquare: {
    width: 82, height: 82, borderRadius: 18, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16,
  },
  logoText: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  appName: { fontSize: 32, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5 },
  appSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 24,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: 12, fontSize: 16, backgroundColor: COLORS.bg, color: COLORS.text,
  },
  button: { backgroundColor: COLORS.primary, borderRadius: 13, padding: 14, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.dangerSoft, borderRadius: RADIUS.sm, padding: 10, marginBottom: 8 },
  errorText: { fontSize: 13, color: COLORS.danger, flex: 1 },
  toggleText: { fontSize: 14, color: COLORS.textSecondary },
  toggleLink: { color: COLORS.primary, fontWeight: '700' },
});
