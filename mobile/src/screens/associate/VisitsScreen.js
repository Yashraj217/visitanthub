import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView }    from 'react-native-safe-area-context';
import { useFocusEffect }  from '@react-navigation/native';
import { Ionicons }        from '@expo/vector-icons';
import { useNotification } from '../../context/NotificationContext';
import { useAuth }         from '../../context/AuthContext';
import { COLORS }          from '../../constants/colors';
import VisitCard           from '../../components/VisitCard';
import api                 from '../../services/api';

const PAGE_SIZE = 20;

function byTimeAsc(a, b) {
  const ta = a.visit_time ? String(a.visit_time) : '';
  const tb = b.visit_time ? String(b.visit_time) : '';
  return ta > tb ? 1 : ta < tb ? -1 : 0;
}

const STATUS_FILTERS = ['all', 'pending', 'approved', 'completed'];
const STATUS_LABELS  = { all: 'All', pending: 'Pending', approved: 'In Progress', completed: 'Done' };

const DATE_FILTERS = [
  { key: 'all',       label: 'All Time'  },
  { key: 'today',     label: 'Today'     },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week',      label: 'This Week' },
];

export default function AssocVisitsScreen({ navigation, route }) {
  const { refreshKey } = useNotification();
  const { user }       = useAuth();
  const tz             = user?.company_timezone || 'Asia/Kolkata';

  const [visits,      setVisits]      = useState([]);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(false);
  const [status,      setStatus]      = useState(route.params?.initialFilter || 'pending');
  const [dateFilter,  setDateFilter]  = useState('all');
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);

  const abortRef      = useRef(null);
  const loadIdRef     = useRef(0);
  const statusRef     = useRef(status);
  const dateFilterRef = useRef(dateFilter);
  const searchRef     = useRef(search);
  statusRef.current     = status;
  dateFilterRef.current = dateFilter;
  searchRef.current     = search;

  function buildDateParams(df) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    if (df === 'today') return { date: today };
    if (df === 'yesterday') {
      const d = new Date(); d.setDate(d.getDate() - 1);
      return { date: d.toLocaleDateString('en-CA', { timeZone: tz }) };
    }
    if (df === 'week') {
      const from = new Date(); from.setDate(from.getDate() - 6);
      return { date_from: from.toLocaleDateString('en-CA', { timeZone: tz }), date_to: today };
    }
    return {};
  }

  async function loadPage(pg, { st, df, sq, append = false } = {}) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const myId = ++loadIdRef.current;

    if (pg === 1) setLoading(true);
    else          setLoadingMore(true);

    try {
      const params = { page: pg, limit: PAGE_SIZE };
      if (st !== 'all') params.status = st;
      if (sq?.trim())   params.search = sq.trim();
      Object.assign(params, buildDateParams(df));

      const { data } = await api.get('/visits', { params, signal: ctrl.signal });
      if (myId !== loadIdRef.current) return; // superseded by a newer request

      const incoming = data.visits || [];
      setHasMore(data.hasMore ?? false);
      setPage(pg);
      setVisits(prev => {
        const merged = append && pg > 1 ? [...prev, ...incoming] : incoming;
        return [...merged].sort(byTimeAsc);
      });
    } catch (err) {
      if (err?.code === 'ERR_CANCELED') return;
    } finally {
      if (myId === loadIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  }

  // Status or date filter changes → reload from page 1 immediately
  useEffect(() => {
    loadPage(1, { st: status, df: dateFilter, sq: searchRef.current });
  }, [status, dateFilter]);

  // Search changes → debounced reload from page 1
  useEffect(() => {
    const t = setTimeout(() => {
      loadPage(1, { st: statusRef.current, df: dateFilterRef.current, sq: searchRef.current });
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Screen gains focus → reload to pick up changes from VisitDetail
  useFocusEffect(useCallback(() => {
    const incoming = route.params?.initialFilter;
    if (incoming && incoming !== statusRef.current) {
      setStatus(incoming);  // triggers [status, dateFilter] effect
    } else {
      loadPage(1, { st: statusRef.current, df: dateFilterRef.current, sq: searchRef.current });
    }
  }, [route.params?.initialFilter]));

  // Push notification → reload
  useEffect(() => {
    if (refreshKey > 0) loadPage(1, { st: statusRef.current, df: dateFilterRef.current, sq: searchRef.current });
  }, [refreshKey]);

  function handleLoadMore() {
    if (hasMore && !loadingMore && !loading) {
      loadPage(page + 1, { st: statusRef.current, df: dateFilterRef.current, sq: searchRef.current, append: true });
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    loadPage(1, { st: statusRef.current, df: dateFilterRef.current, sq: searchRef.current });
  }

  const listFooter = loadingMore
    ? <View style={s.footerRow}><ActivityIndicator size="small" color={COLORS.primary} /></View>
    : !hasMore && visits.length > 0
      ? <View style={s.footerRow}>
          <Text style={s.footerText}>{visits.length} visit{visits.length !== 1 ? 's' : ''} total</Text>
        </View>
      : null;

  return (
    <SafeAreaView style={s.root} edges={['top']}>

      {/* Top bar */}
      <View style={s.topBar}>
        <Text style={s.title}>My Visits</Text>
        <Text style={s.countBadge}>{visits.length}{hasMore ? '+' : ''}</Text>
      </View>

      {/* Search bar */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={COLORS.textMuted} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Search visitor, mobile, ref…"
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={s.searchClear}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status filter */}
      <View style={s.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {STATUS_FILTERS.map(f => (
            <TouchableOpacity key={f}
              style={[s.chip, status === f && s.chipActive]}
              onPress={() => setStatus(f)}>
              <Text style={[s.chipText, status === f && s.chipTextActive]}>{STATUS_LABELS[f]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Date filter */}
      <View style={[s.filterWrap, s.dateWrap]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {DATE_FILTERS.map(d => (
            <TouchableOpacity key={d.key}
              style={[s.chip, dateFilter === d.key && s.chipActive]}
              onPress={() => setDateFilter(d.key)}>
              <Text style={[s.chipText, dateFilter === d.key && s.chipTextActive]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={visits}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh}
              colors={[COLORS.primary]} tintColor={COLORS.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={listFooter}
          renderItem={({ item }) => (
            <VisitCard visit={item}
              onPress={() => navigation.navigate('VisitDetail', { visit: item })} />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📋</Text>
              <Text style={s.emptyText}>
                {search.trim() ? `No visits match "${search}"` : 'No visits found'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: COLORS.background },
  topBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    padding: 16, paddingBottom: 12, backgroundColor: COLORS.card,
                    borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:          { fontSize: 20, fontWeight: '700', color: COLORS.text },
  countBadge:     { fontSize: 13, fontWeight: '700', color: COLORS.primary,
                    backgroundColor: '#eff0ff', paddingHorizontal: 10, paddingVertical: 3,
                    borderRadius: 12 },
  searchRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
                    paddingHorizontal: 12, paddingVertical: 8,
                    borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchIcon:     { marginRight: 8 },
  searchInput:    { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 6 },
  searchClear:    { padding: 4 },
  filterWrap:     { backgroundColor: COLORS.card, paddingVertical: 8,
                    borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dateWrap:       { borderTopWidth: 0 },
  chips:          { paddingHorizontal: 12, flexDirection: 'row', gap: 8 },
  chip:           { height: 34, paddingHorizontal: 16, borderRadius: 17,
                    justifyContent: 'center', alignItems: 'center',
                    backgroundColor: '#f1f2f8', borderWidth: 1.5, borderColor: '#c7c8e0' },
  chipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:       { fontSize: 13, fontWeight: '600', color: '#374151' },
  chipTextActive: { color: '#fff' },
  list:           { padding: 12, paddingBottom: 32 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty:          { alignItems: 'center', paddingTop: 60 },
  emptyIcon:      { fontSize: 40, marginBottom: 10 },
  emptyText:      { color: COLORS.textMuted, fontSize: 15, textAlign: 'center' },
  footerRow:      { alignItems: 'center', paddingVertical: 16 },
  footerText:     { color: COLORS.textMuted, fontSize: 13 },
});
