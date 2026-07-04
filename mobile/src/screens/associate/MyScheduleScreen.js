import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, FlatList,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons }     from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { FONTS }  from '../../constants/fonts';
import api        from '../../services/api';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const STATUS_COLORS = {
  pending:    { bg: '#fff7ed', text: '#c2410c', dot: '#f97316', border: '#fed7aa' },
  confirmed:  { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', border: '#bbf7d0' },
  cancelled:  { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444', border: '#fecaca' },
  checked_in: { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', border: '#bfdbfe' },
  no_show:    { bg: '#f9fafb', text: '#6b7280', dot: '#9ca3af', border: '#e5e7eb' },
};

function fmt12(time24) {
  if (!time24) return '—';
  const [h, m] = time24.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function fmtShortDate(dateStr) {
  if (!dateStr) return '';
  const [y, mo, d] = dateStr.split('-');
  return `${parseInt(d)} ${MONTHS[parseInt(mo) - 1].slice(0, 3)} ${y}`;
}

/* ── Appointment card ─────────────────────────────────────────────────────── */
function AppointmentCard({ b, showDate }) {
  const sc = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
  return (
    <View style={[ac.card, { borderLeftColor: sc.dot }]}>
      <View style={ac.top}>
        <View style={ac.timeBlock}>
          <Text style={ac.time}>{fmt12(b.scheduled_time?.slice(0, 5))}</Text>
          {showDate && <Text style={ac.date}>{fmtShortDate(b.scheduled_date?.slice(0, 10))}</Text>}
        </View>
        <View style={[ac.badge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
          <Text style={[ac.badgeText, { color: sc.text }]}>
            {(b.status || '').replace('_', ' ')}
          </Text>
        </View>
      </View>
      <Text style={ac.name}>{b.visitor_name}</Text>
      {!!b.visitor_mobile && <Text style={ac.sub}>{b.visitor_mobile}</Text>}
      {!!b.service_name   && <Text style={ac.sub}>{b.service_name}</Text>}
      {!!b.purpose        && <Text style={ac.purpose}>{b.purpose}</Text>}
      {!!b.admin_notes    && <Text style={ac.notes}>Note: {b.admin_notes}</Text>}
      <Text style={ac.ref}>{b.booking_ref}</Text>
    </View>
  );
}

/* ── Main screen ──────────────────────────────────────────────────────────── */
export default function MyScheduleScreen() {
  const { width } = useWindowDimensions();
  const CELL_SIZE = Math.floor((width - 32) / 7); // 16px padding each side

  const now = new Date();
  const [year,     setYear]     = useState(now.getFullYear());
  const [month,    setMonth]    = useState(now.getMonth() + 1);
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [view,     setView]     = useState('calendar');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/scheduling/my-schedule', { params: { year, month } });
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useFocusEffect(load);

  // Group by date key
  const byDate = bookings.reduce((acc, b) => {
    const d = b.scheduled_date?.slice(0, 10);
    if (d) { (acc[d] = acc[d] || []).push(b); }
    return acc;
  }, {});

  // Calendar cells
  const firstDay    = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  function dayKey(d) {
    return `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  function prevMonth() {
    setSelected(null);
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    setSelected(null);
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  const selectedBookings = selected ? (byDate[selected] || []) : [];
  const sortedBookings   = [...bookings].sort((a, b) =>
    ((a.scheduled_date||'')+(a.scheduled_time||'')).localeCompare((b.scheduled_date||'')+(b.scheduled_time||''))
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>My Schedule</Text>
          <Text style={s.sub}>Your appointments</Text>
        </View>
        <View style={s.viewToggle}>
          <TouchableOpacity
            style={[s.toggleBtn, view === 'calendar' && s.toggleActive]}
            onPress={() => setView('calendar')}
            activeOpacity={0.8}>
            <Ionicons name="calendar" size={16} color={view === 'calendar' ? '#fff' : COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, view === 'list' && s.toggleActive]}
            onPress={() => setView('list')}
            activeOpacity={0.8}>
            <Ionicons name="list" size={16} color={view === 'list' ? '#fff' : COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Month navigation */}
      <View style={s.monthNav}>
        <TouchableOpacity onPress={prevMonth} hitSlop={12} style={s.navBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{MONTHS[month - 1]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} hitSlop={12} style={s.navBtn}>
          <Ionicons name="chevron-forward" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : view === 'calendar' ? (
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Day headers */}
          <View style={s.dayHeaders}>
            {DAYS.map((d, i) => (
              <Text key={i} style={[s.dayHeader, { width: CELL_SIZE }]}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={s.calGrid}>
            {cells.map((d, i) => {
              if (!d) return <View key={`e-${i}`} style={{ width: CELL_SIZE, height: CELL_SIZE }} />;
              const key        = dayKey(d);
              const dayAppts   = byDate[key] || [];
              const isToday    = key === todayKey;
              const isSelected = key === selected;

              return (
                <TouchableOpacity
                  key={key}
                  style={[s.cell, { width: CELL_SIZE, height: CELL_SIZE },
                    isSelected && s.cellSelected]}
                  onPress={() => setSelected(isSelected ? null : key)}
                  activeOpacity={0.75}>
                  <View style={[s.dayNum, isToday && s.dayNumToday]}>
                    <Text style={[s.dayNumText, isToday && s.dayNumTextToday]}>{d}</Text>
                  </View>
                  {dayAppts.length > 0 && (
                    <View style={s.dotRow}>
                      {dayAppts.slice(0, 3).map((b, idx) => (
                        <View key={idx} style={[s.dot, {
                          backgroundColor: (STATUS_COLORS[b.status] || STATUS_COLORS.pending).dot
                        }]} />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Status legend */}
          <View style={s.legend}>
            {Object.entries(STATUS_COLORS).map(([status, c]) => (
              <View key={status} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: c.dot }]} />
                <Text style={s.legendLabel}>{status.replace('_', ' ')}</Text>
              </View>
            ))}
          </View>

          {/* Selected day appointments */}
          {selected && (
            <View style={s.selectedSection}>
              <Text style={s.selectedTitle}>
                {fmtShortDate(selected)} · {selectedBookings.length} appointment{selectedBookings.length !== 1 ? 's' : ''}
              </Text>
              {selectedBookings.length === 0 ? (
                <Text style={s.noAppts}>No appointments on this day.</Text>
              ) : (
                selectedBookings.map(b => <AppointmentCard key={b.id} b={b} />)
              )}
            </View>
          )}

          {bookings.length === 0 && (
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>📅</Text>
              <Text style={s.emptyText}>No appointments in {MONTHS[month - 1]} {year}</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={sortedBookings}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>📅</Text>
              <Text style={s.emptyText}>No appointments in {MONTHS[month - 1]} {year}</Text>
            </View>
          }
          renderItem={({ item }) => <AppointmentCard b={item} showDate />}
        />
      )}
    </SafeAreaView>
  );
}

/* ── Screen styles ────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.background },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                   paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title:         { fontSize: 20, fontFamily: FONTS.bold,    color: COLORS.text },
  sub:           { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 1 },

  viewToggle:    { flexDirection: 'row', backgroundColor: COLORS.border, borderRadius: 10, padding: 2, gap: 2 },
  toggleBtn:     { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  toggleActive:  { backgroundColor: COLORS.primary },

  monthNav:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                   paddingHorizontal: 16, paddingVertical: 10,
                   borderBottomWidth: 1, borderBottomColor: COLORS.border },
  navBtn:        { padding: 4 },
  monthLabel:    { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  listContent:   { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 32 },

  dayHeaders:    { flexDirection: 'row', marginTop: 12, marginBottom: 4 },
  dayHeader:     { textAlign: 'center', fontSize: 12, fontFamily: FONTS.semiBold,
                   color: COLORS.textMuted, letterSpacing: 0.5 },

  calGrid:       { flexDirection: 'row', flexWrap: 'wrap' },
  cell:          { alignItems: 'center', justifyContent: 'center', paddingVertical: 4,
                   borderRadius: 10 },
  cellSelected:  { backgroundColor: '#eff0ff' },

  dayNum:        { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  dayNumToday:   { backgroundColor: COLORS.primary },
  dayNumText:    { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.text },
  dayNumTextToday: { color: '#fff' },

  dotRow:        { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot:           { width: 5, height: 5, borderRadius: 3 },

  legend:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16, marginBottom: 8 },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:     { width: 8, height: 8, borderRadius: 4 },
  legendLabel:   { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, textTransform: 'capitalize' },

  selectedSection: { marginTop: 16 },
  selectedTitle:   { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 10 },
  noAppts:         { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textMuted,
                     backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
                     borderWidth: 1, borderColor: COLORS.border },

  emptyState:    { alignItems: 'center', paddingVertical: 48 },
  emptyIcon:     { fontSize: 40, marginBottom: 12 },
  emptyText:     { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textMuted },
});

/* ── Card styles ──────────────────────────────────────────────────────────── */
const ac = StyleSheet.create({
  card:      { backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
               borderWidth: 1, borderColor: COLORS.border,
               borderLeftWidth: 4 },
  top:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  timeBlock: {},
  time:      { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text },
  date:      { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },
  badge:     { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: FONTS.semiBold, textTransform: 'capitalize' },
  name:      { fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.text, marginBottom: 3 },
  sub:       { fontSize: 12, fontFamily: FONTS.regular,  color: COLORS.textMuted, marginBottom: 2 },
  purpose:   { fontSize: 12, fontFamily: FONTS.regular,  color: COLORS.textMuted, fontStyle: 'italic', marginTop: 4 },
  notes:     { fontSize: 12, fontFamily: FONTS.regular,  color: COLORS.primary,   marginTop: 4 },
  ref:       { fontSize: 11, fontFamily: 'Courier New',  color: COLORS.textMuted,
               marginTop: 8, alignSelf: 'flex-end' },
});
