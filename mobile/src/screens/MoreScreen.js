import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Modal, TextInput, ActivityIndicator, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView }         from 'react-native-safe-area-context';
import { Ionicons }             from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore         from 'expo-secure-store';
import { useAuth }              from '../context/AuthContext';
import { COLORS }               from '../constants/colors';
import api                      from '../services/api';

const BIO_ENABLED_KEY  = 'biometric_enabled';
const BIO_EMAIL_KEY    = 'biometric_email';
const BIO_PASSWORD_KEY = 'biometric_password';

function MenuItem({ icon, label, value, onPress, danger, right }) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={[s.menuIcon, { backgroundColor: danger ? '#fef2f2' : '#eff0ff' }]}>
        <Ionicons name={icon} size={20} color={danger ? COLORS.danger : COLORS.primary} />
      </View>
      <Text style={[s.menuLabel, danger && { color: COLORS.danger }]}>{label}</Text>
      {right ?? <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />}
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const { user, logout } = useAuth();

  // Password change
  const [showPwd, setShowPwd] = useState(false);
  const [current, setCurrent] = useState('');
  const [newPwd,  setNewPwd]  = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving,  setSaving]  = useState(false);

  // Biometric
  const [bioSupported,  setBioSupported]  = useState(false);
  const [bioEnabled,    setBioEnabled]    = useState(false);
  const [showEnableBio, setShowEnableBio] = useState(false);
  const [bioPassword,   setBioPassword]   = useState('');
  const [bioSaving,     setBioSaving]     = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [hasHw, isEnrolled, enabled] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
          SecureStore.getItemAsync(BIO_ENABLED_KEY),
        ]);
        setBioSupported(hasHw && isEnrolled);
        setBioEnabled(enabled === 'true');
      } catch {}
    })();
  }, []);

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  async function changePassword() {
    if (!current || !newPwd) { Alert.alert('Required', 'Fill in all fields.'); return; }
    if (newPwd !== confirm)   { Alert.alert('Mismatch', 'Passwords do not match.'); return; }
    if (newPwd.length < 6)    { Alert.alert('Too Short', 'Minimum 6 characters.'); return; }
    setSaving(true);
    try {
      await api.post('/auth/change-password', { current_password: current, new_password: newPwd });
      Alert.alert('Success', 'Password changed successfully.');
      setShowPwd(false);
      setCurrent(''); setNewPwd(''); setConfirm('');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to change password.');
    } finally { setSaving(false); }
  }

  async function toggleBiometric(value) {
    if (value) {
      setShowEnableBio(true);
    } else {
      Alert.alert('Disable Biometric Login', 'You will need to enter your password on next login.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable', style: 'destructive', onPress: async () => {
            await Promise.all([
              SecureStore.setItemAsync(BIO_ENABLED_KEY, 'false'),
              SecureStore.deleteItemAsync(BIO_EMAIL_KEY),
              SecureStore.deleteItemAsync(BIO_PASSWORD_KEY),
            ]);
            setBioEnabled(false);
          },
        },
      ]);
    }
  }

  async function enableBiometric() {
    if (!bioPassword) {
      Alert.alert('Required', 'Enter your current password to enable biometric login.');
      return;
    }
    setBioSaving(true);
    try {
      await api.post('/auth/login', { email: user.email, password: bioPassword });
      await Promise.all([
        SecureStore.setItemAsync(BIO_ENABLED_KEY,  'true'),
        SecureStore.setItemAsync(BIO_EMAIL_KEY,    user.email),
        SecureStore.setItemAsync(BIO_PASSWORD_KEY, bioPassword),
      ]);
      setBioEnabled(true);
      setShowEnableBio(false);
      setBioPassword('');
      Alert.alert('Enabled', 'You can now log in with biometrics.');
    } catch {
      Alert.alert('Incorrect Password', 'Please check your password and try again.');
    } finally { setBioSaving(false); }
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
    <ScrollView contentContainerStyle={s.content}>

      {/* Profile card */}
      <View style={s.profileCard}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.userName}>{user?.name}</Text>
          <Text style={s.userEmail}>{user?.email}</Text>
          <View style={s.roleBadge}>
            <Text style={s.roleText}>
              {user?.role === 'company_admin' ? 'Admin' : 'Associate'}
            </Text>
          </View>
        </View>
      </View>

      <Text style={s.sectionTitle}>Account</Text>
      <View style={s.section}>
        <MenuItem icon="lock-closed-outline" label="Change Password" onPress={() => setShowPwd(true)} />
        {bioSupported && (
          <View style={[s.menuItem, { borderBottomWidth: 0 }]}>
            <View style={[s.menuIcon, { backgroundColor: '#eff0ff' }]}>
              <Ionicons name="finger-print-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={s.menuLabel}>Biometric Login</Text>
            <Switch
              value={bioEnabled}
              onValueChange={toggleBiometric}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
        )}
      </View>

      <Text style={s.sectionTitle}>App</Text>
      <View style={s.section}>
        <View style={s.menuItem}>
          <View style={[s.menuIcon, { backgroundColor: '#f0fdf4' }]}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.success} />
          </View>
          <Text style={s.menuLabel}>Version</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>1.0.0</Text>
        </View>
        <View style={[s.menuItem, { borderBottomWidth: 0 }]}>
          <View style={[s.menuIcon, { backgroundColor: '#f0fdf4' }]}>
            <Ionicons name="business-outline" size={20} color={COLORS.success} />
          </View>
          <Text style={s.menuLabel}>{user?.company_name}</Text>
        </View>
      </View>

      <View style={[s.section, { marginTop: 8 }]}>
        <MenuItem icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger
          right={<Ionicons name="chevron-forward" size={16} color={COLORS.danger} />} />
      </View>

      {/* Change Password Modal */}
      <Modal visible={showPwd} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={() => { setShowPwd(false); setCurrent(''); setNewPwd(''); setConfirm(''); }}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={s.label}>Current Password</Text>
            <TextInput style={s.input} secureTextEntry placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted} value={current} onChangeText={setCurrent} />
            <Text style={s.label}>New Password</Text>
            <TextInput style={s.input} secureTextEntry placeholder="Min 6 characters"
              placeholderTextColor={COLORS.textMuted} value={newPwd} onChangeText={setNewPwd} />
            <Text style={s.label}>Confirm New Password</Text>
            <TextInput style={s.input} secureTextEntry placeholder="Repeat password"
              placeholderTextColor={COLORS.textMuted} value={confirm} onChangeText={setConfirm} />
            <TouchableOpacity style={s.btn} onPress={changePassword} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Update Password</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Enable Biometric Modal */}
      <Modal visible={showEnableBio} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Enable Biometric Login</Text>
            <TouchableOpacity onPress={() => { setShowEnableBio(false); setBioPassword(''); }}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
            <View style={s.bioInfo}>
              <Ionicons name="finger-print-outline" size={40} color={COLORS.primary} />
              <Text style={s.bioInfoTitle}>Confirm Your Password</Text>
              <Text style={s.bioInfoSub}>
                Enter your current password once to enable fingerprint or Face ID login for future sessions.
              </Text>
            </View>
            <Text style={s.label}>Password</Text>
            <TextInput style={s.input} secureTextEntry placeholder="Your current password"
              placeholderTextColor={COLORS.textMuted} value={bioPassword} onChangeText={setBioPassword}
              onSubmitEditing={enableBiometric} returnKeyType="done" />
            <TouchableOpacity style={s.btn} onPress={enableBiometric} disabled={bioSaving}>
              {bioSaving
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Enable Biometric Login</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

    </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.background },
  content:     { padding: 16, paddingBottom: 40 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14,
                 backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 24,
                 shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
                 shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  avatar:      { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary,
                 alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: '#fff', fontSize: 22, fontWeight: '800' },
  userName:    { fontSize: 17, fontWeight: '700', color: COLORS.text },
  userEmail:   { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  roleBadge:   { marginTop: 6, backgroundColor: '#eff0ff', paddingHorizontal: 10,
                 paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  roleText:    { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  sectionTitle:{ fontSize: 12, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.8,
                 textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  section:     { backgroundColor: COLORS.card, borderRadius: 14, overflow: 'hidden',
                 marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04,
                 shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  menuItem:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
                 borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuIcon:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel:   { flex: 1, fontSize: 15, fontWeight: '500', color: COLORS.text },
  modal:       { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                 padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
                 backgroundColor: COLORS.card },
  modalTitle:  { fontSize: 17, fontWeight: '700', color: COLORS.text },
  modalBody:   { padding: 20 },
  label:       { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input:       { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
                 paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
                 color: COLORS.text, backgroundColor: '#fafafa', marginBottom: 16 },
  btn:         { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14,
                 alignItems: 'center', marginTop: 8 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  bioInfo:     { alignItems: 'center', marginBottom: 28, paddingTop: 12 },
  bioInfoTitle:{ fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 14, marginBottom: 8 },
  bioInfoSub:  { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
});
