import { useCallback, useEffect, useState } from 'react';
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

export default function AssocDashboardScreen({ navigation }) {
  const { user }       = useAuth();
  const { refreshKey } = useNotification();
  const [stats,      setStats]      = useState(null);
  const [pending,    setPending]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function openHelp() {
    try {
      const { data } = await api.get('/auth/sso-link');
      await Linking.openURL(data.url);
    } catch { /* silent */ }
  }

  async function load() {
    try {
      const { data: visits } = await api.get('/visits', {
        params: { employee_self: true },
      });
      const list = visits.visits || visits || [];
      const tz = user?.company_timezone || 'Asia/Kolkata';
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
      const today = list.filter(v => {
        return new Date(v.visit_time).toLocaleDateString('en-CA', { timeZone: tz }) === todayStr;
      });
      setStats({
        total:       today.length,
        pending:     today.filter(v => v.status === 'pending').length,
        in_progress: today.filter(v => v.status === 'approved').length,
        done:        today.filter(v => v.status === 'completed').length,
      });
      setPending(today.filter(v => !['completed','rejected'].includes(v.status)).slice(0, 5));
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
      refreshControl={<RefreshControl refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); load(); }}
        colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{user?.name} 👋</Text>
            <Text style={s.company}>{user?.company_name}</Text>
          </View>
          <TouchableOpacity style={s.helpBtn} onPress={openHelp}>
            <Ionicons name="help-circle-outline" size={18} color={COLORS.primary} />
            <Text style={s.helpBtnText}>Need Help?</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={s.sectionTitle}>My Visits Today</Text>
      <View style={s.statsRow}>
        <StatCard label="Total"   value={stats?.total}   color={COLORS.primary} icon="📋"
          onPress={() => navigation.navigate('MyVisits', { initialFilter: 'all' })} />
        <StatCard label="Pending" value={stats?.pending} color={COLORS.warning} icon="⏳"
          onPress={() => navigation.navigate('MyVisits', { initialFilter: 'pending' })} />
      </View>
      <View style={[s.statsRow, { marginTop: 10 }]}>
        <StatCard label="In Progress" value={stats?.in_progress} color={COLORS.info}    icon="🔄"
          onPress={() => navigation.navigate('MyVisits', { initialFilter: 'approved' })} />
        <StatCard label="Done"        value={stats?.done}        color={COLORS.success} icon="✅"
          onPress={() => navigation.navigate('MyVisits', { initialFilter: 'completed' })} />
      </View>

      {pending.length > 0 && (
        <>
          <Text style={[s.sectionTitle, { marginTop: 24 }]}>Needs Attention</Text>
          {pending.map(v => (
            <VisitCard key={v.id} visit={v}
              onPress={() => navigation.navigate('VisitDetail', { visit: v })} />
          ))}
        </>
      )}

      {pending.length === 0 && stats?.total > 0 && (
        <View style={s.allDone}>
          <Text style={s.allDoneIcon}>🎉</Text>
          <Text style={s.allDoneText}>All caught up!</Text>
          <Text style={s.allDoneSub}>No pending visits right now.</Text>
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.background },
  content:     { padding: 16, paddingBottom: 32 },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header:      { marginBottom: 20, marginTop: 8 },
  headerRow:   { flexDirection: 'row', alignItems: 'center' },
  greeting:    { fontSize: 20, fontWeight: '700', color: COLORS.text, flexWrap: 'wrap' },
  company:     { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
  helpBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4,
                 backgroundColor: '#eff0ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  helpBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  sectionTitle:{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  statsRow:    { flexDirection: 'row', gap: 10 },
  allDone:     { alignItems: 'center', paddingVertical: 40 },
  allDoneIcon: { fontSize: 40, marginBottom: 10 },
  allDoneText: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  allDoneSub:  { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
});
