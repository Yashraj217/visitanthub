import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons }     from '@expo/vector-icons';
import { COLORS }       from '../constants/colors';
import StatusBadge      from '../components/StatusBadge';
import api              from '../services/api';

function fmt(dt) {
  if (!dt) return '—';
  try { return new Date(dt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return new Date(dt).toISOString().slice(0, 16).replace('T', ' '); }
}
function fmtDate(dt) {
  if (!dt) return '—';
  try { return new Date(dt).toLocaleDateString([], { dateStyle: 'medium' }); }
  catch { return new Date(dt).toISOString().slice(0, 10); }
}

export default function VisitorHistoryScreen({ route, navigation }) {
  const { visitorId, visitorName } = route.params;
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get(`/visitors/${visitorId}/visits`)
      .then(({ data }) => setData(data))
      .catch(() => setError('Failed to load visitor history.'))
      .finally(() => setLoading(false));
  }, [visitorId]);

  if (loading) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <Header navigation={navigation} name={visitorName} />
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <Header navigation={navigation} name={visitorName} />
        <View style={s.center}>
          <Text style={s.errorText}>{error || 'Something went wrong.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { visitor, visits } = data;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header navigation={navigation} name={visitor.name} />
      <FlatList
        data={visits}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <ProfileCard visitor={visitor} />
        }
        renderItem={({ item, index }) => (
          <VisitRow
            item={item}
            isFirst={index === 0}
            onPress={() => navigation.navigate('VisitDetail', { visit: item })}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyText}>No visits on record.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function Header({ navigation, name }) {
  return (
    <View style={s.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
        <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
      </TouchableOpacity>
      <Text style={s.headerTitle} numberOfLines={1}>{name || 'Visitor History'}</Text>
    </View>
  );
}

function ProfileCard({ visitor }) {
  return (
    <View style={s.profileCard}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{visitor.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={s.profileInfo}>
        <Text style={s.profileName}>{visitor.name}</Text>
        <Text style={s.profileSub}>{visitor.mobile}</Text>
        {visitor.email ? <Text style={s.profileSub}>{visitor.email}</Text> : null}
      </View>
      <View style={s.totalBadge}>
        <Text style={s.totalCount}>{visitor.total_visits}</Text>
        <Text style={s.totalLabel}>visits</Text>
      </View>
    </View>
  );
}

function VisitRow({ item, isFirst, onPress }) {
  return (
    <View style={s.visitRow}>
      {/* Timeline dot + line */}
      <View style={s.timeline}>
        <View style={[s.dot, isFirst && s.dotFirst]} />
        <View style={s.line} />
      </View>

      <TouchableOpacity style={s.visitContent} onPress={onPress} activeOpacity={0.7}>
        <View style={s.visitTop}>
          <Text style={s.refNum}>{item.ref_number || `#${item.id}`}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <StatusBadge status={item.status} />
            <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
          </View>
        </View>
        <Text style={s.visitTime}>{fmt(item.visit_time)}</Text>
        <View style={s.visitMeta}>
          {item.service_name ? <Text style={s.metaTag}>📋 {item.service_name}</Text> : null}
          {item.employee_name ? (
            <Text style={s.metaTag}>
              👤 {item.employee_name}{item.designation ? ` — ${item.designation}` : ''}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: COLORS.background },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText:    { color: COLORS.danger, fontSize: 14 },

  header:       { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16,
                  backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn:      { padding: 2 },
  headerTitle:  { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.text },

  list:         { padding: 16, paddingBottom: 40 },

  profileCard:  { flexDirection: 'row', alignItems: 'center', gap: 14,
                  backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 20,
                  shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10,
                  shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  avatar:       { width: 52, height: 52, borderRadius: 26, backgroundColor: '#eff0ff',
                  alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  profileInfo:  { flex: 1 },
  profileName:  { fontSize: 17, fontWeight: '700', color: COLORS.text },
  profileSub:   { fontSize: 13, color: COLORS.textMuted, marginTop: 1 },
  totalBadge:   { alignItems: 'center' },
  totalCount:   { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  totalLabel:   { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },

  visitRow:     { flexDirection: 'row', gap: 12, marginBottom: 4 },
  timeline:     { alignItems: 'center', width: 16 },
  dot:          { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.border,
                  marginTop: 6 },
  dotFirst:     { backgroundColor: COLORS.primary },
  line:         { flex: 1, width: 2, backgroundColor: COLORS.border, marginTop: 4 },

  visitContent: { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 12,
                  marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  visitTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  refNum:       { fontSize: 11, fontFamily: 'monospace', color: COLORS.primary, fontWeight: '700' },
  visitTime:    { fontSize: 12, color: COLORS.textMuted, marginBottom: 6 },
  visitMeta:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaTag:      { fontSize: 12, color: COLORS.textMuted, backgroundColor: COLORS.background,
                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  empty:        { alignItems: 'center', paddingTop: 40 },
  emptyIcon:    { fontSize: 36, marginBottom: 10 },
  emptyText:    { color: COLORS.textMuted, fontSize: 14 },
});
