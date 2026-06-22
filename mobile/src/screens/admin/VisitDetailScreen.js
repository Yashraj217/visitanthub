import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth }  from '../../context/AuthContext';
import { COLORS }   from '../../constants/colors';
import StatusBadge  from '../../components/StatusBadge';
import api          from '../../services/api';

const STATUS_ACTIONS = {
  pending:  [{ label: 'Call / Start', next: 'approved',  color: COLORS.info    },
             { label: 'Mark Done',    next: 'completed', color: COLORS.success  },
             { label: 'Mark No Show', next: 'rejected',  color: COLORS.danger   }],
  approved: [{ label: 'Mark Done',    next: 'completed', color: COLORS.success  },
             { label: 'Mark No Show', next: 'rejected',  color: COLORS.danger   }],
};

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{String(value)}</Text>
    </View>
  );
}

export default function AdminVisitDetailScreen({ route, navigation }) {
  const { user }     = useAuth();
  const [visit,       setVisit]       = useState(route.params.visit);
  const [employees,   setEmployees]   = useState([]);
  const [reassigning, setReassigning] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [fetching,    setFetching]    = useState(true);

  // Fetch full visit detail (includes custom_fields)
  useEffect(() => {
    api.get(`/visits/${visit.id}`)
      .then(({ data }) => setVisit(data))
      .catch(() => {})
      .finally(() => setFetching(false));
    api.get('/visits/employees')
      .then(({ data }) => setEmployees(data))
      .catch(() => {});
  }, []);

  async function changeStatus(nextStatus) {
    Alert.alert('Update Status', `Change to "${STATUS_LABELS[nextStatus] || nextStatus}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', onPress: async () => {
          setLoading(true);
          try {
            await api.put(`/visits/${visit.id}/status`, { status: nextStatus });
            if (nextStatus === 'completed' || nextStatus === 'rejected') {
              navigation.goBack();
            } else {
              setVisit(v => ({ ...v, status: nextStatus }));
            }
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to update status.');
          } finally { setLoading(false); }
        },
      },
    ]);
  }

  async function reassign(employee) {
    setReassigning(false);
    setLoading(true);
    try {
      await api.put(`/visits/${visit.id}/employee`, { employee_id: employee.id });
      setVisit(v => ({ ...v, employee_id: employee.id, employee_name: employee.name }));
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to reassign.');
    } finally { setLoading(false); }
  }

  const tz = user?.company_timezone || 'Asia/Kolkata';
  function fmtDt(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-IN', {
      timeZone: tz,
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  const actions = STATUS_ACTIONS[visit.status] || [];
  const visitorFields = (visit.custom_fields || []).filter(f => !f.is_hidden);
  const hiddenFields  = (visit.custom_fields || []).filter(f => f.is_hidden);
  const isAdmin = user?.role === 'company_admin';

  if (fetching) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.content}>

        {/* Header card */}
        <View style={s.card}>
          <View style={s.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.ref}>{visit.ref_number || `#${visit.id}`}</Text>
              <Text style={s.visitorName}>{visit.visitor_name || 'Unknown'}</Text>
            </View>
            <StatusBadge status={visit.status} />
          </View>
          <Text style={s.time}>{fmtDt(visit.visit_time)}</Text>
        </View>

        {/* Visitor info */}
        <View style={s.card}>
          <View style={s.cardRowBetween}>
            <Text style={[s.sectionTitle, { marginBottom: 0 }]}>Visitor Info</Text>
            {visit.visitor_id && (
              <TouchableOpacity
                style={s.historyBtn}
                onPress={() => navigation.navigate('VisitorHistory', {
                  visitorId: visit.visitor_id,
                  visitorName: visit.visitor_name,
                })}>
                <Ionicons name="time-outline" size={13} color={COLORS.primary} />
                <Text style={s.historyBtnText}>Visit History</Text>
              </TouchableOpacity>
            )}
          </View>
          <Row label="Phone"   value={visit.mobile} />
          <Row label="Email"   value={visit.visitor_email} />
          <Row label="Address" value={visit.address} />
        </View>

        {/* Visit details */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Visit Details</Text>
          <Row label="Service"   value={visit.service_name} />
          <Row label="Purpose"   value={visit.purpose} />
          <Row label="Associate" value={visit.employee_name} />
          <Row label="Notes"     value={visit.notes} />
        </View>

        {/* Custom fields filled by visitor */}
        {visitorFields.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Additional Info</Text>
            {visitorFields.map(f => (
              <Row key={f.id} label={f.field_label} value={f.value} />
            ))}
          </View>
        )}

        {/* Hidden fields (staff-only, admin only) */}
        {isAdmin && hiddenFields.length > 0 && (
          <View style={[s.card, { borderLeftWidth: 3, borderLeftColor: COLORS.primary }]}>
            <Text style={s.sectionTitle}>Staff Notes <Text style={s.staffNote}>(Admin only)</Text></Text>
            {hiddenFields.map(f => (
              <Row key={f.id} label={f.field_label} value={f.value || '—'} />
            ))}
          </View>
        )}

        {/* Status actions */}
        {actions.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Update Status</Text>
            {actions.map(a => (
              <TouchableOpacity key={a.next} style={[s.actionBtn, { backgroundColor: a.color }]}
                onPress={() => changeStatus(a.next)} disabled={loading}>
                <Text style={s.actionBtnText}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Reassign */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Associate</Text>
          <Text style={s.current}>
            Assigned to: <Text style={{ color: COLORS.primary, fontWeight: '600' }}>{visit.employee_name || 'Unassigned'}</Text>
          </Text>
          <TouchableOpacity style={s.reassignBtn} onPress={() => setReassigning(true)}>
            <Ionicons name="swap-horizontal-outline" size={16} color={COLORS.primary} />
            <Text style={s.reassignText}>Change Associate</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {loading && (
        <View style={s.overlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      {/* Reassign Modal */}
      <Modal visible={reassigning} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Select Associate</Text>
            <TouchableOpacity onPress={() => setReassigning(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={employees}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.empItem, visit.employee_id === item.id && s.empItemActive]}
                onPress={() => reassign(item)}>
                <View style={s.empAvatar}>
                  <Text style={s.empAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.empName}>{item.name}</Text>
                  {item.designation && <Text style={s.empDesig}>{item.designation}</Text>}
                </View>
                {visit.employee_id === item.id && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const STATUS_LABELS = { approved: 'In Progress', completed: 'Done', rejected: 'No Show' };

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: COLORS.background },
  content:      { padding: 16, paddingBottom: 40 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  card:         { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 12,
                  shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  ref:          { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', fontFamily: 'monospace' },
  visitorName:  { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  time:         { fontSize: 13, color: COLORS.textMuted },
  sectionTitle:    { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  cardRowBetween:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4,
                     backgroundColor: '#eff0ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  historyBtnText:  { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  staffNote:    { fontSize: 11, color: COLORS.textMuted, fontWeight: '400' },
  row:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
                  borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel:     { fontSize: 13, color: COLORS.textMuted, fontWeight: '500', flex: 1 },
  rowValue:     { fontSize: 13, color: COLORS.text, fontWeight: '600', flex: 2, textAlign: 'right', marginLeft: 12 },
  actionBtn:    { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  actionBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  current:      { fontSize: 13, color: COLORS.textMuted, marginBottom: 10 },
  reassignBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eff0ff',
                  paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  reassignText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  overlay:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)',
                  justifyContent: 'center', alignItems: 'center' },
  modal:        { flex: 1, backgroundColor: COLORS.background },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
                  backgroundColor: COLORS.card },
  modalTitle:   { fontSize: 17, fontWeight: '700', color: COLORS.text },
  empItem:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
                  borderRadius: 12, backgroundColor: COLORS.card, marginBottom: 8,
                  borderWidth: 1, borderColor: COLORS.border },
  empItemActive:{ borderColor: COLORS.primary, backgroundColor: '#f5f5ff' },
  empAvatar:    { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
                  alignItems: 'center', justifyContent: 'center' },
  empAvatarText:{ color: '#fff', fontWeight: '700', fontSize: 16 },
  empName:      { fontSize: 15, fontWeight: '600', color: COLORS.text },
  empDesig:     { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
});
