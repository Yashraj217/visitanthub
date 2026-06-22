import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons }        from '@expo/vector-icons';
import { useAuth }         from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { COLORS }          from '../../constants/colors';
import StatCard            from '../../components/StatCard';
import VisitCard           from '../../components/VisitCard';
import api                 from '../../services/api';

export default function AdminDashboardScreen({ navigation }) {
  const { user }         = useAuth();
  const { refreshKey }   = useNotification();
  const [stats,     setStats]     = useState(null);
  const [recent,    setRecent]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);

  async function openHelp() {
    try {
      const { data } = await api.get('/auth/sso-link');
      await Linking.openURL(data.url);
    } catch { /* silent */ }
  }

  async function load() {
    try {
      const [statsRes, visitsRes] = await Promise.all([
        api.get('/companies/me/stats'),
        api.get('/visits', { params: { limit: 5 } }),
      ]);
      setStats(statsRes.data);
      setRecent(visitsRes.data.visits || visitsRes.data || []);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  }

  useFocusEffect(useCallback(() => { load(); }, []));
  useEffect(() => { if (refreshKey > 0) load(); }, [refreshKey]);

  if (loading) {
    return <SafeAreaView style={s.root} edges={['top']}><View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
    <ScrollView contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}
        colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>Good day, {user?.name?.split(' ')[0]} 👋</Text>
            <Text style={s.company}>{user?.company_name}</Text>
          </View>
          <TouchableOpacity style={s.helpBtn} onPress={openHelp}>
            <Ionicons name="help-circle-outline" size={18} color={COLORS.primary} />
            <Text style={s.helpBtnText}>Need Help?</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={s.sectionTitle}>Today's Summary</Text>
      <View style={s.statsRow}>
        <StatCard label="Total Today"  value={stats?.today_total}  color={COLORS.primary}  icon="📋" />
        <StatCard label="Pending"      value={stats?.today_pending} color={COLORS.warning}  icon="⏳" />
      </View>
      <View style={[s.statsRow, { marginTop: 10 }]}>
        <StatCard label="In Progress"  value={stats?.today_in_progress} color={COLORS.info}    icon="🔄" />
        <StatCard label="Done"         value={stats?.today_done}        color={COLORS.success} icon="✅" />
      </View>

      {recent.length > 0 && (
        <>
          <Text style={[s.sectionTitle, { marginTop: 24 }]}>Recent Visits</Text>
          {recent.map(v => (
            <VisitCard key={v.id} visit={v}
              onPress={() => navigation.navigate('VisitDetail', { visit: v })} />
          ))}
        </>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: COLORS.background },
  content:      { padding: 16, paddingBottom: 32 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header:       { marginBottom: 20, marginTop: 8 },
  headerRow:    { flexDirection: 'row', alignItems: 'center' },
  greeting:     { fontSize: 22, fontWeight: '700', color: COLORS.text },
  company:      { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
  helpBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: '#eff0ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  helpBtnText:  { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  statsRow:     { flexDirection: 'row', gap: 10 },
});
