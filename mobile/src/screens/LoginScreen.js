import { useState, useEffect } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore          from 'expo-secure-store';
import { Ionicons }              from '@expo/vector-icons';
import { useAuth }               from '../context/AuthContext';
import { COLORS }                from '../constants/colors';
import api                       from '../services/api';
import { registerForPushNotifications } from '../services/notifications';

const BIOMETRIC_ENABLED_KEY  = 'biometric_enabled';
const BIOMETRIC_EMAIL_KEY    = 'biometric_email';
const BIOMETRIC_PASSWORD_KEY = 'biometric_password';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [biometricReady,  setBiometricReady]  = useState(false); // hw + enrolled + saved creds

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  async function checkBiometricAvailability() {
    try {
      const [hasHw, isEnrolled, enabled, savedEmail] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY),
        SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY),
      ]);
      setBiometricReady(hasHw && isEnrolled && enabled === 'true' && !!savedEmail);
    } catch (_) {}
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Required', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      if (data.user.role === 'super_admin') {
        Alert.alert('Not Supported', 'Super admin login is not available on mobile.');
        return;
      }

      await login(data.token, data.user);
      registerForPushNotifications().catch(() => {});

      // Offer to enable biometric after first successful password login
      const alreadyEnabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      if (!alreadyEnabled) {
        const [hasHw, isEnrolled] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);
        if (hasHw && isEnrolled) {
          Alert.alert(
            'Enable Fingerprint Login?',
            'Use your fingerprint or face to log in next time without typing your password.',
            [
              { text: 'Not now', style: 'cancel', onPress: () => SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'false') },
              {
                text: 'Enable', onPress: async () => {
                  await Promise.all([
                    SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY,  'true'),
                    SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY,    email.trim().toLowerCase()),
                    SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, password),
                  ]);
                },
              },
            ]
          );
        }
      }
    } catch (err) {
      Alert.alert('Login Failed', err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricLogin() {
    try {
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const hasFace        = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:          hasFace ? 'Login with Face ID' : 'Login with Fingerprint',
        fallbackLabel:          'Use Password',
        disableDeviceFallback:  false,
        cancelLabel:            'Cancel',
      });

      if (!result.success) return;

      const [savedEmail, savedPassword] = await Promise.all([
        SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY),
        SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY),
      ]);

      if (!savedEmail || !savedPassword) {
        Alert.alert('Error', 'Saved credentials not found. Please log in with your password.');
        await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
        setBiometricReady(false);
        return;
      }

      setLoading(true);
      const { data } = await api.post('/auth/login', { email: savedEmail, password: savedPassword });
      await login(data.token, data.user);
      registerForPushNotifications().catch(() => {});
    } catch (err) {
      Alert.alert('Login Failed', err.response?.data?.message || 'Biometric login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        <View style={s.logoBox}>
          <Image
            source={require('../../assets/icon.png')}
            style={s.logoIcon}
            resizeMode="contain"
          />
          <Text style={s.appName}>VisitantHub</Text>
          <Text style={s.tagline}>Visitor Management</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Sign In</Text>

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            placeholder="you@company.com"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={s.label}>Password</Text>
          <View style={s.passwordRow}>
            <TextInput
              style={s.passwordInput}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword(v => !v)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.forgotBtn} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={s.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Sign In</Text>
            }
          </TouchableOpacity>

          {biometricReady && (
            <TouchableOpacity style={s.biometricBtn} onPress={handleBiometricLogin} disabled={loading}>
              <Ionicons name="finger-print-outline" size={22} color={COLORS.primary} />
              <Text style={s.biometricText}>Use Fingerprint / Face ID</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Visitor check-in ───────────────────────────────────────── */}
        <View style={s.divider}>
          <View style={s.divLine} />
          <Text style={s.divText}>or</Text>
          <View style={s.divLine} />
        </View>

        <TouchableOpacity
          style={s.visitorBtn}
          onPress={() => navigation.navigate('VisitorScan')}
        >
          <Ionicons name="qr-code-outline" size={20} color={COLORS.primary} />
          <Text style={s.visitorBtnText}>Check In as a Visitor</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        <Text style={s.footer}>© 2025 Sonnet Infotech · VisitantHub</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.background },
  scroll:        { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoBox:       { alignItems: 'center', marginBottom: 32 },
  logoIcon:      { width: 84, height: 84, borderRadius: 20, marginBottom: 12 },
  appName:       { fontSize: 26, fontWeight: '700', color: COLORS.text },
  tagline:       { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  card:          { backgroundColor: COLORS.card, borderRadius: 16, padding: 24,
                   shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
                   shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  cardTitle:     { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  label:         { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input:         { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
                   paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
                   color: COLORS.text, backgroundColor: '#fafafa', marginBottom: 14 },
  passwordRow:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1,
                   borderColor: COLORS.border, borderRadius: 10, backgroundColor: '#fafafa',
                   marginBottom: 14 },
  passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12,
                   fontSize: 15, color: COLORS.text },
  eyeBtn:        { paddingHorizontal: 12, paddingVertical: 12 },
  forgotBtn:     { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText:    { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  btn:           { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14,
                   alignItems: 'center' },
  btnText:       { color: '#fff', fontSize: 16, fontWeight: '700' },
  biometricBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                   gap: 8, marginTop: 16, paddingVertical: 12, borderRadius: 10,
                   borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: '#f5f5ff' },
  biometricText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  footer:        { textAlign: 'center', color: COLORS.textMuted, fontSize: 12, marginTop: 32 },

  // Visitor check-in
  divider:       { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 16 },
  divLine:       { flex: 1, height: 1, backgroundColor: COLORS.border },
  divText:       { marginHorizontal: 12, color: COLORS.textMuted, fontSize: 13 },
  visitorBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                   backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.primary,
                   borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20 },
  visitorBtnText:{ flex: 1, textAlign: 'center', color: COLORS.primary, fontSize: 15, fontWeight: '700' },
});
