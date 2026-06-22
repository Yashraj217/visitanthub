import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons }       from '@expo/vector-icons';
import { COLORS }         from '../../constants/colors';
import api                from '../../services/api';

function EmployeeCard({ emp }) {
  return (
    <View style={s.card}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{emp.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={s.info}>
        <Text style={s.name}>{emp.name}</Text>
        {emp.designation && <Text style={s.desig}>{emp.designation}</Text>}
        {emp.location     && <Text style={s.location}>📍 {emp.location}</Text>}
        {emp.department   && <Text style={s.dept}>{emp.department}</Text>}
      </View>
      <View style={[s.badge, { backgroundColor: emp.status === 'active' ? '#f0fdf4' : '#fef2f2' }]}>
        <Text style={[s.badgeText, { color: emp.status === 'active' ? COLORS.success : COLORS.danger }]}>
          {emp.status}
        </Text>
      </View>
    </View>
  );
}

export default function AdminEmployeesScreen() {
  const [employees,  setEmployees]  = useState([]);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const { data } = await api.get('/employees');
      setEmployees(data);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  const displayed = search.trim()
    ? employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    : employees;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.topBar}>
        <Text style={s.title}>Associates</Text>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
          <TextInput style={s.searchInput} placeholder="Search…"
            placeholderTextColor={COLORS.textMuted} value={search}
            onChangeText={setSearch} />
        </View>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          renderItem={({ item }) => <EmployeeCard emp={item} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>👥</Text>
              <Text style={s.emptyText}>No associates found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: COLORS.background },
  topBar:    { padding: 16, paddingBottom: 12, backgroundColor: COLORS.card,
               borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:     { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8,
               backgroundColor: COLORS.background, borderRadius: 10,
               paddingHorizontal: 12, paddingVertical: 8,
               borderWidth: 1, borderColor: COLORS.border },
  searchInput:{ flex: 1, fontSize: 14, color: COLORS.text, padding: 0 },
  list:      { padding: 12, paddingBottom: 32 },
  card:      { flexDirection: 'row', alignItems: 'center', gap: 12,
               backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
               marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04,
               shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  avatar:    { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary,
               alignItems: 'center', justifyContent: 'center' },
  avatarText:{ color: '#fff', fontWeight: '700', fontSize: 18 },
  info:      { flex: 1 },
  name:      { fontSize: 15, fontWeight: '700', color: COLORS.text },
  desig:     { fontSize: 12, color: COLORS.primary, fontWeight: '500', marginTop: 1 },
  location:  { fontSize: 12, color: COLORS.info, marginTop: 1 },
  dept:      { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: COLORS.textMuted, fontSize: 15 },
});
