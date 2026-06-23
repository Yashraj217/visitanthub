import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView }    from 'react-native-safe-area-context';
import { useFocusEffect }  from '@react-navigation/native';
import { Ionicons }        from '@expo/vector-icons';
import { useNotification } from '../../context/NotificationContext';
import { COLORS }          from '../../constants/colors';
import VisitCard           from '../../components/VisitCard';
import api                 from '../../services/api';

const PAGE_SIZE = 20;

function byTimeAsc(a, b) {
  const ta = a.visit_time ? String(a.visit_time) : '';
  const tb = b.visit_time ? String(b.visit_time) : '';
  return ta > tb ? 1 : ta < tb ? -1 : 0;
}

const FILTERS       = ['all', 'pending', 'approved', 'completed', 'rejected'];
const FILTER_LABELS = {
  all: 'All', pending: 'Pending', approved: 'In Progress',
  completed: 'Done', rejected: 'Cancelled',
};

export default function AdminVisitsScreen({ navigation }) {
  const { refreshKey } = useNotification();

  const [visits,      setVisits]      = useState([]);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(false);
  const [filter,      setFilter]      = useState('all');
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);

  const abortRef  = useRef(null);
  const loadIdRef = useRef(0);
  const filterRef = useRef(filter);
  const searchRef = useRef(search);
  filterRef.current = filter;
  searchRef.current = search;

  async function loadPage(pg, { ft, sq, append = false } = {}) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const myId = ++loadIdRef.current;

    if (pg === 1) setLoading(true);
    else          setLoadingMore(true);

    try {
      const params = { page: pg, limit: PAGE_SIZE };
      if (ft !== 'all') params.status = ft;
      if (sq?.trim())   params.search = sq.trim();

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

  // Filter changes → reload from page 1 immediately
  useEffect(() => {
    loadPage(1, { ft: filter, sq: searchRef.current });
  }, [filter]);

  // Search changes → debounced reload from page 1
  useEffect(() => {
    const t = setTimeout(() => {
      loadPage(1, { ft: filterRef.current, sq: searchRef.current });
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Screen gains focus → reload
  useFocusEffect(useCallback(() => {
    loadPage(1, { ft: filterRef.current, sq: searchRef.current });
  }, []));

  // Push notification → reload
  useEffect(() => {
    if (refreshKey > 0) loadPage(1, { ft: filterRef.current, sq: searchRef.current });
  }, [refreshKey]);

  // Auto-refresh every 2 minutes so scheduled visits appear without manual pull-to-refresh
  useEffect(() => {
    const t = setInterval(
      () => loadPage(1, { ft: filterRef.current, sq: searchRef.current }),
      2 * 60 * 1000
    );
    return () => clearInterval(t);
  }, []);

  function handleLoadMore() {
    if (hasMore && !loadingMore && !loading) {
      loadPage(page + 1, { ft: filterRef.current, sq: searchRef.current, append: true });
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    loadPage(1, { ft: filterRef.current, sq: searchRef.current });
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
      <View style={s.topBar}>
        <View style={s.titleRow}>
          <Text style={s.title}>Visits</Text>
          <Text style={s.countBadge}>{visits.length}{hasMore ? '+' : ''}</Text>
        </View>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
          <TextInput style={s.searchInput} placeholder="Search visitor, mobile, ref…"
            placeholderTextColor={COLORS.textMuted} value={search}
            onChangeText={setSearch}
            returnKeyType="search" autoCorrect={false} />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Status filter chips */}
      <View style={s.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f}
              style={[s.chip, filter === f && s.chipActive]}
              onPress={() => setFilter(f)}>
              <Text style={[s.chipText, filter === f && s.chipTextActive]}>
                {FILTER_LABELS[f]}
              </Text>
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
              <Text style={s.emptyText}>No visits found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: COLORS.background },
  topBar:         { padding: 16, paddingBottom: 8, backgroundColor: COLORS.card,
                    borderBottomWidth: 1, borderBottomColor: COLORS.border },
  titleRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  title:          { fontSize: 20, fontWeight: '700', color: COLORS.text },
  countBadge:     { fontSize: 13, fontWeight: '700', color: COLORS.primary,
                    backgroundColor: '#eff0ff', paddingHorizontal: 10, paddingVertical: 3,
                    borderRadius: 12 },
  searchBox:      { flexDirection: 'row', alignItems: 'center', gap: 8,
                    backgroundColor: COLORS.background, borderRadius: 10,
                    paddingHorizontal: 12, paddingVertical: 8,
                    borderWidth: 1, borderColor: COLORS.border },
  searchInput:    { flex: 1, fontSize: 14, color: COLORS.text, padding: 0 },
  filterWrap:     { backgroundColor: COLORS.card, paddingVertical: 8,
                    borderBottomWidth: 1, borderBottomColor: COLORS.border },
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
  emptyText:      { color: COLORS.textMuted, fontSize: 15 },
  footerRow:      { alignItems: 'center', paddingVertical: 16 },
  footerText:     { color: COLORS.textMuted, fontSize: 13 },
});
