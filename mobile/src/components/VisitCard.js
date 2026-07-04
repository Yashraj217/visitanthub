import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { FONTS }  from '../constants/fonts';
import StatusBadge from './StatusBadge';
import { useAuth } from '../context/AuthContext';

function fmtDate(dt, tz) {
  if (!dt) return '';
  const locale = tz || 'Asia/Kolkata';
  const d = new Date(dt);
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: locale });
  const visitStr = d.toLocaleDateString('en-CA', { timeZone: locale });
  if (visitStr === todayStr) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (visitStr === yesterday.toLocaleDateString('en-CA', { timeZone: locale })) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { timeZone: locale, day: 'numeric', month: 'short' });
}

function fmtTime(dt, tz) {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('en-IN', {
    timeZone: tz || 'Asia/Kolkata',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function fmtElapsed(ms) {
  if (ms < 0) return '0m';
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function VisitCard({ visit, onPress }) {
  const { user } = useAuth();
  const tz = user?.company_timezone || 'Asia/Kolkata';
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const isReady = visit.is_ready === 1;

  let waitLabel = null;
  let waitIcon = null;
  if (visit.status === 'pending' && visit.visit_time) {
    const elapsed = now - new Date(visit.visit_time);
    if (elapsed > 0) { waitLabel = fmtElapsed(elapsed); waitIcon = '⏱'; }
  } else if (visit.status === 'approved' && visit.approved_at) {
    const elapsed = now - new Date(visit.approved_at);
    if (elapsed > 0) { waitLabel = fmtElapsed(elapsed); waitIcon = '⚡'; }
  }

  return (
    <TouchableOpacity
      style={[s.card, visit.ref_number?.startsWith('BK-') && s.cardScheduled, isReady && s.cardReady]}
      onPress={onPress} activeOpacity={0.75}>
      <View style={s.row}>
        <View style={s.info}>
          <Text style={[s.ref, visit.ref_number?.startsWith('BK-') && s.refScheduled]}>
            {visit.ref_number || `#${visit.id}`}
          </Text>
          <View style={s.nameRow}>
            <Text style={s.name}>{visit.visitor_name || 'Unknown Visitor'}</Text>
            {isReady && (
              <View style={s.readyBadge}>
                <Text style={s.readyText}>READY</Text>
              </View>
            )}
          </View>
          {visit.service_name ? <Text style={s.service}>{visit.service_name}</Text> : null}
          {visit.employee_name ? (
            <View style={s.assigneeRow}>
              <Ionicons name="person-outline" size={12} color={COLORS.textMuted} style={{ flexShrink: 0 }} />
              <Text style={s.assignee}>{visit.employee_name}</Text>
            </View>
          ) : null}
        </View>
        <View style={s.right}>
          <StatusBadge status={visit.status} />
          {waitLabel && (
            <View style={[s.timer, visit.status === 'approved' && s.timerActive]}>
              <Text style={[s.timerText, visit.status === 'approved' && s.timerTextActive]}>
                {waitIcon} {waitLabel}
              </Text>
            </View>
          )}
          <View style={s.dateTime}>
            <Text style={s.date}>{fmtDate(visit.visit_time, tz)}</Text>
            <Text style={s.time}>{fmtTime(visit.visit_time, tz)}</Text>
          </View>
          {visit.photo_count > 0 && (
            <View style={s.photoCount}>
              <Ionicons name="camera-outline" size={10} color={COLORS.primary} />
              <Text style={s.photoCountText}>{visit.photo_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card:            { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10,
                     shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
                     shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardScheduled:   { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
  cardReady:       { backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#86efac' },
  row:             { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  info:            { flex: 1 },
  ref:             { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.semiBold, marginBottom: 2 },
  refScheduled:    { color: '#ea580c' },
  nameRow:         { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 },
  name:            { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
  readyBadge:      { backgroundColor: '#22c55e', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  readyText:       { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  service:         { fontSize: 13, color: COLORS.primary, fontFamily: FONTS.semiBold, marginBottom: 3 },
  assigneeRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, flexShrink: 1 },
  assignee:        { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.regular, flexShrink: 1, flexWrap: 'wrap' },
  right:           { alignItems: 'flex-end', gap: 6 },
  timer:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9',
                     paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  timerActive:     { backgroundColor: '#fff7ed' },
  timerText:       { fontSize: 10, fontWeight: '700', color: '#64748b' },
  timerTextActive: { color: '#f97316' },
  dateTime:        { alignItems: 'flex-end', gap: 1, marginTop: 4 },
  date:            { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.regular },
  time:            { fontSize: 12, color: COLORS.text, fontFamily: FONTS.semiBold },
  photoCount:      { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2,
                     backgroundColor: '#eff0ff', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8 },
  photoCountText:  { fontSize: 10, color: COLORS.primary, fontWeight: '700' },
});
