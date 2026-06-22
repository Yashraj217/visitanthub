import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import api from '../services/api';

export default function ForgotPasswordScreen({ navigation }) {
  const [step,     setStep]     = useState(1); // 1=email, 2=otp+new password
  const [email,    setEmail]    = useState('');
  const [otp,      setOtp]      = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);

  async function sendOtp() {
    if (!email.trim()) { Alert.alert('Required', 'Enter your email address.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setStep(2);
      Alert.alert('Code Sent', 'Check your email for a 5-digit reset code.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (!otp.trim() || !password) { Alert.alert('Required', 'Enter code and new password.'); return; }
    if (password !== confirm)      { Alert.alert('Mismatch', 'Passwords do not match.'); return; }
    if (password.length < 6)       { Alert.alert('Too Short', 'Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email:        email.trim().toLowerCase(),
        otp:          otp.trim(),
        new_password: password,
      });
      Alert.alert('Success', 'Password reset successfully. You can now sign in.', [
        { text: 'Sign In', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Reset failed. Check your code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
          <Text style={s.backText}>Back to login</Text>
        </TouchableOpacity>

        <View style={s.card}>
          <Text style={s.title}>{step === 1 ? 'Forgot Password' : 'Enter Reset Code'}</Text>
          <Text style={s.subtitle}>
            {step === 1
              ? 'Enter your email and we\'ll send a 5-digit code.'
              : `Code sent to ${email}`}
          </Text>

          {step === 1 ? (
            <>
              <Text style={s.label}>Email Address</Text>
              <TextInput style={s.input} placeholder="you@company.com"
                placeholderTextColor={COLORS.textMuted} autoCapitalize="none"
                keyboardType="email-address" value={email} onChangeText={setEmail} />
              <TouchableOpacity style={s.btn} onPress={sendOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Send Reset Code</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.label}>5-Digit Code</Text>
              <TextInput style={s.input} placeholder="12345" placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad" maxLength={5} value={otp} onChangeText={setOtp} />

              <Text style={s.label}>New Password</Text>
              <TextInput style={s.input} placeholder="Min 6 characters"
                placeholderTextColor={COLORS.textMuted} secureTextEntry value={password}
                onChangeText={setPassword} />

              <Text style={s.label}>Confirm Password</Text>
              <TextInput style={s.input} placeholder="Repeat password"
                placeholderTextColor={COLORS.textMuted} secureTextEntry value={confirm}
                onChangeText={setConfirm} />

              <TouchableOpacity style={s.btn} onPress={resetPassword} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Reset Password</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={s.resendBtn} onPress={() => { setStep(1); setOtp(''); }}>
                <Text style={s.resendText}>Resend code</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: COLORS.background },
  scroll:    { flexGrow: 1, padding: 24, paddingTop: 60 },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 28 },
  backText:  { color: COLORS.primary, fontSize: 15, fontWeight: '500' },
  card:      { backgroundColor: COLORS.card, borderRadius: 16, padding: 24,
               shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
               shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  title:     { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  subtitle:  { fontSize: 14, color: COLORS.textMuted, marginBottom: 24, lineHeight: 20 },
  label:     { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input:     { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
               paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
               color: COLORS.text, backgroundColor: '#fafafa', marginBottom: 14 },
  btn:       { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14,
               alignItems: 'center', marginTop: 6 },
  btnText:   { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendBtn: { alignItems: 'center', marginTop: 16 },
  resendText:{ color: COLORS.primary, fontSize: 14, fontWeight: '500' },
});
