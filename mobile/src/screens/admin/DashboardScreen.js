import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  ActivityIndicator, TouchableOpacity, Linking, Modal, FlatList,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons }       from '@expo/vector-icons';
import { useAuth }        from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { COLORS }         from '../../constants/colors';
import { FONTS }          from '../../constants/fonts';
import StatCard           from '../../components/StatCard';
import VisitCard          from '../../components/VisitCard';
import api                from '../../services/api';

/* ── Pending appointments modal ───────────────────────────────────────────── */
function AppointmentsModal({ visible, onClose, appointments, onAction }) {
  const [acting, setActing] = useState({});

  async function act(id, status) {
    setActing(p => ({ ...p, [id]: status }));
    try {
      await api.put(`/scheduling/bookings/${id}`, { status });
      onAction(id, status);
    } catch { /* silent */ }
    finally { setActing(p => { const n = { ...p }; delete n[id]; return n; }); }
  }

  function formatDate(raw) {
    if (!raw) return '';
    return new Date(raw).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={m.overlay}>
        <View style={m.sheet}>
          <View style={m.header}>
            <Text style={m.title}>Pending Appointments</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {appointments.length === 0 ? (
            <View style={m.empty}>
              <Text style={m.emptyIcon}>📅</Text>
              <Text style={m.emptyText}>No pending appointments</Text>
            </View>
          ) : (
            <FlatList
              data={appointments}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              renderItem={({ item: a }) => (
                <View style={m.card}>
                  <View style={m.cardTop}>
                    <Text style={m.visitorName}>{a.visitor_name}</Text>
                    <View style={m.timeBox}>
                      <Text style={m.timeText}>{a.scheduled_time?.slice(0, 5)}</Text>
                      <Text style={m.dateText}>{formatDate(a.scheduled_date)}</Text>
                    </View>
                  </View>

                  <Text style={m.mobile}>{a.visitor_mobile}</Text>
                  <Text style={m.service}>
                    <Text style={m.label}>Service: </Text>{a.service_name}
                  </Text>
                  {!!a.employee_name && (
                    <Text style={m.service}>
                      <Text style={m.label}>Associate: </Text>{a.employee_name}
                      {a.designation ? `  ·  ${a.designation}` : ''}
                    </Text>
                  )}
                  {!!a.purpose && (
                    <Text style={m.purpose}>{a.purpose}</Text>
                  )}

                  <View style={m.btnRow}>
                    <TouchableOpacity
                      style={[m.btn, m.btnApprove]}
                      disabled={!!acting[a.id]}
                      onPress={() => act(a.id, 'confirmed')}
                      activeOpacity={0.8}>
                      <Text style={m.btnText}>
                        {acting[a.id] === 'confirmed' ? 'Approving…' : 'Approve'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[m.btn, m.btnReject]}
                      disabled={!!acting[a.id]}
                      onPress={() => act(a.id, 'cancelled')}
                      activeOpacity={0.8}>
                      <Text style={m.btnText}>
                        {acting[a.id] === 'cancelled' ? 'Rejecting…' : 'Reject'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

/* ── Main screen ──────────────────────────────────────────────────────────── */
export default function AdminDashboardScreen({ navigation }) {
  const { user }          = useAuth();
  const { refreshKey }    = useNotification();
  const [stats,      setStats]      = useState(null);
  const [recent,     setRecent]     = useState([]);
  const [appts,      setAppts]      = useState([]);
  const [apptModal,  setApptModal]  = useState(false);
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
      const [statsRes, visitsRes] = await Promise.all([
        api.get('/companies/me/stats'),
        api.get('/visits', { params: { limit: 5 } }),
      ]);
      setStats(statsRes.data);
      setRecent(visitsRes.data.visits || visitsRes.data || []);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  }

  async function loadAppts() {
    try {
      const { data } = await api.get('/scheduling/bookings', {
        params: { status: 'pending' },
      });
      setAppts(data);
    } catch { /* silent */ }
  }

  useFocusEffect(useCallback(() => { load(); loadAppts(); }, []));
  useEffect(() => { if (refreshKey > 0) { load(); loadAppts(); } }, [refreshKey]);

  function handleAction(id) {
    // Both approve and reject remove the card from the pending list
    setAppts(prev => prev.filter(a => a.id !== id));
  }

  if (loading) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); loadAppts(); }}
            colors={[COLORS.primary]} tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
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

        {/* Pending appointments banner */}
        {appts.length > 0 && (
          <TouchableOpacity style={s.apptBanner} onPress={() => setApptModal(true)} activeOpacity={0.85}>
            <Text style={s.apptBannerIcon}>📅</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.apptBannerTitle}>
                {appts.length} Appointment{appts.length !== 1 ? 's' : ''} Pending Approval
              </Text>
              <Text style={s.apptBannerSub}>Tap to review and approve or reject</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {/* Visit stats */}
        <Text style={s.sectionTitle}>Today's Summary</Text>
        <View style={s.statsRow}>
          <StatCard label="Total Today" value={stats?.today_total}       color={COLORS.primary} icon="📊" />
          <StatCard label="Pending"     value={stats?.today_pending}     color={COLORS.warning} icon="🔔" />
        </View>
        <View style={[s.statsRow, { marginTop: 10 }]}>
          <StatCard label="In Progress" value={stats?.today_in_progress} color={COLORS.info}    icon="⚡" />
          <StatCard label="Done"        value={stats?.today_done}        color={COLORS.success} icon="🎯" />
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

      <AppointmentsModal
        visible={apptModal}
        onClose={() => setApptModal(false)}
        appointments={appts}
        onAction={handleAction}
      />
    </SafeAreaView>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: COLORS.background },
  content:        { padding: 16, paddingBottom: 32 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header:         { marginBottom: 20, marginTop: 8 },
  headerRow:      { flexDirection: 'row', alignItems: 'center' },
  greeting:       { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text },
  company:        { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },
  helpBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4,
                    backgroundColor: '#eff0ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  helpBtnText:    { fontSize: 12, color: COLORS.primary, fontFamily: FONTS.semiBold },

  apptBanner:     { flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa',
                    borderRadius: 14, padding: 14, marginBottom: 20 },
  apptBannerIcon: { fontSize: 24 },
  apptBannerTitle:{ fontSize: 14, fontFamily: FONTS.semiBold, color: '#92400e' },
  apptBannerSub:  { fontSize: 12, fontFamily: FONTS.regular, color: '#b45309', marginTop: 2 },

  sectionTitle:   { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 12 },
  statsRow:       { flexDirection: 'row', gap: 10 },
});

/* ── Modal styles ─────────────────────────────────────────────────────────── */
const m = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
                  maxHeight: '85%' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
                  borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:        { fontSize: 17, fontFamily: 'Poppins_700Bold', color: COLORS.text },
  empty:        { alignItems: 'center', paddingVertical: 48 },
  emptyIcon:    { fontSize: 40, marginBottom: 12 },
  emptyText:    { fontSize: 15, fontFamily: FONTS.regular, color: COLORS.textMuted },

  card:         { backgroundColor: COLORS.background, borderRadius: 14,
                  borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  visitorName:  { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: COLORS.text, flex: 1, marginRight: 8 },
  timeBox:      { alignItems: 'flex-end' },
  timeText:     { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: COLORS.primary,
                  backgroundColor: '#eff0ff', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  dateText:     { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.text, marginTop: 4 },
  mobile:       { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted, marginBottom: 4 },
  service:      { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.text, marginBottom: 2 },
  label:        { fontFamily: FONTS.semiBold },
  purpose:      { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 2 },

  btnRow:       { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn:          { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnApprove:   { backgroundColor: '#22c55e' },
  btnReject:    { backgroundColor: COLORS.danger },
  btnText:      { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
});
