import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  ActivityIndicator, TouchableOpacity, Linking, Modal, FlatList,
} from 'react-native';
import { SafeAreaView }    from 'react-native-safe-area-context';
import { useFocusEffect }  from '@react-navigation/native';
import { Ionicons }        from '@expo/vector-icons';
import { useAuth }         from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { COLORS }          from '../../constants/colors';
import StatCard            from '../../components/StatCard';
import VisitCard           from '../../components/VisitCard';
import api                 from '../../services/api';

/* ── Appointment modal ────────────────────────────────────────────────────── */
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
          {/* Header */}
          <View style={m.header}>
            <Text style={m.title}>My Scheduled Appointments</Text>
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
                  {/* Visitor name + time/date */}
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
                  {!!a.purpose && (
                    <Text style={m.purpose}>{a.purpose}</Text>
                  )}

                  {a.status === 'pending' ? (
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
                  ) : (
                    <View style={m.confirmedBadge}>
                      <Text style={m.confirmedText}>Confirmed</Text>
                    </View>
                  )}
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
export default function AssocDashboardScreen({ navigation }) {
  const { user }       = useAuth();
  const { refreshKey } = useNotification();
  const [stats,        setStats]       = useState(null);
  const [pending,      setPending]     = useState([]);
  const [appts,        setAppts]       = useState([]);
  const [apptModal,    setApptModal]   = useState(false);
  const [loading,      setLoading]     = useState(true);
  const [refreshing,   setRefreshing]  = useState(false);

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
      const today = list.filter(v =>
        new Date(v.visit_time).toLocaleDateString('en-CA', { timeZone: tz }) === todayStr
      );
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

  async function loadAppts() {
    if (!user?.employee_id) return;
    try {
      const { data } = await api.get('/scheduling/bookings', {
        params: { employee_id: user.employee_id },
      });
      setAppts(data.filter(a => ['pending', 'confirmed'].includes(a.status)));
    } catch { /* silent */ }
  }

  useFocusEffect(useCallback(() => { load(); loadAppts(); }, []));
  useEffect(() => { if (refreshKey > 0) { load(); loadAppts(); } }, [refreshKey]);

  function handleAction(id, status) {
    if (status === 'cancelled') {
      setAppts(prev => prev.filter(a => a.id !== id));
    } else {
      setAppts(prev => prev.map(a => a.id === id ? { ...a, status: 'confirmed' } : a));
    }
  }

  const pendingApptCount   = appts.filter(a => a.status === 'pending').length;
  const confirmedApptCount = appts.filter(a => a.status === 'confirmed').length;

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
              <Text style={s.company}>{user?.company_name?.toUpperCase()}</Text>
              <Text style={s.greeting}>{user?.name} 👋</Text>
            </View>
            <TouchableOpacity style={s.helpBtn} onPress={openHelp}>
              <Ionicons name="help-circle-outline" size={18} color={COLORS.primary} />
              <Text style={s.helpBtnText}>Need Help?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scheduled appointments banner */}
        {appts.length > 0 && (
          <TouchableOpacity style={s.apptBanner} onPress={() => setApptModal(true)} activeOpacity={0.85}>
            <Text style={s.apptBannerIcon}>📅</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.apptBannerTitle}>
                {appts.length} Scheduled Appointment{appts.length !== 1 ? 's' : ''}
              </Text>
              <Text style={s.apptBannerSub}>
                {confirmedApptCount > 0 ? `${confirmedApptCount} confirmed` : ''}
                {confirmedApptCount > 0 && pendingApptCount > 0 ? ' · ' : ''}
                {pendingApptCount > 0 ? `${pendingApptCount} awaiting approval` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {/* Visit stats */}
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
  company:        { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: COLORS.primary,
                    letterSpacing: 1.2, marginBottom: 2 },
  greeting:       { fontSize: 22, fontFamily: 'Poppins_700Bold', color: COLORS.text, flexWrap: 'wrap' },
  helpBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4,
                    backgroundColor: '#eff0ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  helpBtnText:    { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  apptBanner:     { flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: '#eff0ff', borderWidth: 1, borderColor: '#c7c8f8',
                    borderRadius: 14, padding: 14, marginBottom: 20 },
  apptBannerIcon: { fontSize: 24 },
  apptBannerTitle:{ fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: COLORS.primary },
  apptBannerSub:  { fontSize: 12, color: '#6366f1aa', marginTop: 2 },

  sectionTitle:   { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  statsRow:       { flexDirection: 'row', gap: 10 },
  allDone:        { alignItems: 'center', paddingVertical: 40 },
  allDoneIcon:    { fontSize: 40, marginBottom: 10 },
  allDoneText:    { fontSize: 18, fontWeight: '700', color: COLORS.text },
  allDoneSub:     { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
});

/* ── Modal styles ─────────────────────────────────────────────────────────── */
const m = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
                    maxHeight: '85%' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
                    borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:          { fontSize: 17, fontFamily: 'Poppins_700Bold', color: COLORS.text },
  empty:          { alignItems: 'center', paddingVertical: 48 },
  emptyIcon:      { fontSize: 40, marginBottom: 12 },
  emptyText:      { fontSize: 15, color: COLORS.textMuted },

  card:           { backgroundColor: COLORS.background, borderRadius: 14,
                    borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  cardTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  visitorName:    { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: COLORS.text, flex: 1, marginRight: 8 },
  timeBox:        { alignItems: 'flex-end' },
  timeText:       { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: COLORS.primary,
                    backgroundColor: '#eff0ff', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  dateText:       { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  mobile:         { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  service:        { fontSize: 13, color: COLORS.text, marginBottom: 2 },
  label:          { fontWeight: '600' },
  purpose:        { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 2 },

  btnRow:         { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn:            { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnApprove:     { backgroundColor: '#22c55e' },
  btnReject:      { backgroundColor: COLORS.danger },
  btnText:        { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14 },

  confirmedBadge: { marginTop: 10, alignSelf: 'flex-start',
                    backgroundColor: '#dcfce7', borderRadius: 20,
                    paddingHorizontal: 12, paddingVertical: 4 },
  confirmedText:  { fontSize: 12, fontWeight: '700', color: '#15803d' },
});
