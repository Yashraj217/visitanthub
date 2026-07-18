import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import api from '../services/api';

function daysDiff(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(String(dateStr).slice(0, 10) + 'T12:00:00'); d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(String(dateStr).slice(0, 10) + 'T12:00:00')
    .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DateChip({ dateStr }) {
  const diff = daysDiff(dateStr);
  let bg, color, label;
  if (diff < 0)       { bg = '#fee2e2'; color = '#dc2626'; label = `${Math.abs(diff)}d overdue`; }
  else if (diff === 0){ bg = '#fef3c7'; color = '#d97706'; label = 'Today'; }
  else if (diff === 1){ bg = '#fef3c7'; color = '#d97706'; label = 'Tomorrow'; }
  else if (diff <= 7) { bg = '#dbeafe'; color = '#1d4ed8'; label = `In ${diff}d`; }
  else                { bg = '#d1fae5'; color = '#065f46'; label = `In ${diff}d`; }
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      <Text style={[s.chipDate, { color }]}>{fmtDate(dateStr)}</Text>
      <Text style={[s.chipLabel, { color }]}> · {label}</Text>
    </View>
  );
}

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'overdue',  label: 'Overdue' },
  { key: 'today',    label: 'Today' },
  { key: 'week',     label: 'This week' },
  { key: 'upcoming', label: 'Upcoming' },
];

function applyFilter(rows, filter) {
  return rows.filter(r => {
    const diff = daysDiff(r.next_visit_date);
    if (filter === 'overdue')  return diff < 0;
    if (filter === 'today')    return diff === 0;
    if (filter === 'week')     return diff >= 0 && diff <= 7;
    if (filter === 'upcoming') return diff > 7;
    return true;
  });
}

export default function RevisitsScreen() {
  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [filter,    setFilter]    = useState('all');
  const [search,    setSearch]    = useState('');
  const [sending,   setSending]   = useState({});

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/visits/revisits');
      setRows(data);
    } catch {
      if (!silent) Alert.alert('Error', 'Failed to load revisits.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  async function sendReminder(row) {
    setSending(s => ({ ...s, [row.visitor_id]: true }));
    try {
      await api.post(`/visitors/${row.visitor_id}/revisit-reminder`);
      Alert.alert('Sent', `WhatsApp reminder sent to ${row.visitor_name}`);
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.message || 'Could not send reminder.');
    } finally {
      setSending(s => ({ ...s, [row.visitor_id]: false }));
    }
  }

  const counts = {
    overdue: rows.filter(r => daysDiff(r.next_visit_date) < 0).length,
    today:   rows.filter(r => daysDiff(r.next_visit_date) === 0).length,
    week:    rows.filter(r => { const d = daysDiff(r.next_visit_date); return d >= 0 && d <= 7; }).length,
  };

  const filtered = applyFilter(rows, filter).filter(r =>
    !search || (r.visitor_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.mobile || '').includes(search)
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Revisits</Text>
          <Text style={s.subtitle}>
            {rows.length} pending
            {counts.overdue > 0 ? `  ·  ${counts.overdue} overdue` : ''}
          </Text>
        </View>
        {counts.overdue > 0 && (
          <View style={s.overdueTag}>
            <Text style={s.overdueTagText}>{counts.overdue} overdue</Text>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 6 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or mobile…"
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter pills */}
      <View style={s.filterRow}>
        {FILTERS.map(f => {
          const cnt = f.key === 'all' ? rows.length : f.key === 'overdue' ? counts.overdue
            : f.key === 'today' ? counts.today : f.key === 'week' ? counts.week
            : rows.length - counts.week;
          const active = filter === f.key;
          return (
            <TouchableOpacity key={f.key}
              style={[s.filterPill, active && s.filterPillActive,
                      f.key === 'overdue' && counts.overdue > 0 && !active && s.filterPillDanger]}
              onPress={() => setFilter(f.key)} activeOpacity={0.7}>
              <Text style={[s.filterPillText, active && s.filterPillTextActive,
                            f.key === 'overdue' && counts.overdue > 0 && !active && { color: '#dc2626' }]}>
                {f.label}{cnt > 0 ? ` (${cnt})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={r => String(r.visitor_id)}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor={COLORS.primary} />
          }
          contentContainerStyle={filtered.length === 0 ? s.emptyContainer : { padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyIcon}>📅</Text>
              <Text style={s.emptyTitle}>No revisits found</Text>
              <Text style={s.emptyBody}>
                {filter !== 'all' ? 'Try a different filter' : 'Set next visit dates from a visit detail screen'}
              </Text>
            </View>
          }
          renderItem={({ item: r }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.visitorInfo}>
                  <Text style={s.visitorName}>{r.visitor_name}</Text>
                  <Text style={s.visitorMobile}>{r.mobile}</Text>
                </View>
                <TouchableOpacity
                  style={[s.remindBtn, sending[r.visitor_id] && s.remindBtnDisabled]}
                  onPress={() => sendReminder(r)}
                  disabled={!!sending[r.visitor_id]}
                  activeOpacity={0.7}>
                  {sending[r.visitor_id] ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="logo-whatsapp" size={14} color="#fff" />
                      <Text style={s.remindBtnText}>Remind</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <DateChip dateStr={r.next_visit_date} />

              <View style={s.cardMeta}>
                {r.service_name && (
                  <Text style={s.metaText}>📋 {r.service_name}</Text>
                )}
                {r.employee_name && (
                  <Text style={s.metaText}>
                    👤 {r.employee_name}{r.designation ? ` — ${r.designation}` : ''}
                  </Text>
                )}
                {r.last_visit_time && (
                  <Text style={s.metaText}>
                    🕐 Last: {new Date(r.last_visit_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                )}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: COLORS.background },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                     paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title:           { fontSize: 24, fontWeight: '800', color: COLORS.text },
  subtitle:        { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  overdueTag:      { backgroundColor: '#fee2e2', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  overdueTagText:  { color: '#dc2626', fontWeight: '700', fontSize: 12 },

  searchRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
                     borderRadius: 12, marginHorizontal: 16, marginBottom: 10,
                     paddingHorizontal: 12, paddingVertical: 10,
                     borderWidth: 1, borderColor: COLORS.border },
  searchInput:     { flex: 1, fontSize: 14, color: COLORS.text, padding: 0 },

  filterRow:       { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 12, gap: 6, flexWrap: 'wrap' },
  filterPill:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                     backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  filterPillActive:{ backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterPillDanger:{ borderColor: '#fca5a5' },
  filterPillText:  { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  filterPillTextActive: { color: '#fff' },

  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon:       { fontSize: 40, marginBottom: 12 },
  emptyTitle:      { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptyBody:       { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },

  card:            { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10,
                     shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
                     elevation: 2, borderWidth: 1, borderColor: COLORS.border },
  cardTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  visitorInfo:     { flex: 1, marginRight: 10 },
  visitorName:     { fontSize: 16, fontWeight: '700', color: COLORS.text },
  visitorMobile:   { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },

  remindBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6,
                     backgroundColor: '#25D366', borderRadius: 10,
                     paddingHorizontal: 12, paddingVertical: 8 },
  remindBtnDisabled:{ opacity: 0.6 },
  remindBtnText:   { color: '#fff', fontWeight: '700', fontSize: 13 },

  chip:            { flexDirection: 'row', alignSelf: 'flex-start',
                     borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8 },
  chipDate:        { fontSize: 13, fontWeight: '700' },
  chipLabel:       { fontSize: 12, fontWeight: '500' },

  cardMeta:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaText:        { fontSize: 12, color: COLORS.textMuted },
});
