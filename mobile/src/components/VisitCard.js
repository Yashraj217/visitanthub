import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
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

export default function VisitCard({ visit, onPress }) {
  const { user } = useAuth();
  const tz = user?.company_timezone || 'Asia/Kolkata';
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.75}>
      <View style={s.row}>
        <View style={s.info}>
          <Text style={s.ref}>{visit.ref_number || `#${visit.id}`}</Text>
          <Text style={s.name}>{visit.visitor_name || 'Unknown Visitor'}</Text>
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
  card:        { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10,
                 shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
                 shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  row:         { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  info:        { flex: 1 },
  ref:         { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 2, fontFamily: 'monospace' },
  name:        { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  service:     { fontSize: 13, color: COLORS.primary, fontWeight: '500', marginBottom: 3 },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, flexShrink: 1 },
  assignee:    { fontSize: 12, color: COLORS.textMuted, flexShrink: 1, flexWrap: 'wrap' },
  right:       { alignItems: 'flex-end', gap: 6 },
  dateTime:    { alignItems: 'flex-end', gap: 1, marginTop: 4 },
  date:        { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  time:        { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  photoCount:  { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2,
                 backgroundColor: '#eff0ff', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8 },
  photoCountText: { fontSize: 10, color: COLORS.primary, fontWeight: '700' },
});
