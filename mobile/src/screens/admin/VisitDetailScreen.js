import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Modal, FlatList, TextInput, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  const [reassigning,   setReassigning]   = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [fetching,      setFetching]      = useState(true);
  const [loadingEmps,   setLoadingEmps]   = useState(false);

  // Stage tracking
  const [stages,         setStages]         = useState([]);
  const [advancingStage, setAdvancingStage] = useState(false);
  const [waitingLoading, setWaitingLoading] = useState(false);
  const [nowMs,          setNowMs]          = useState(() => Date.now());

  // Notes
  const [notes,        setNotes]        = useState([]);
  const [noteText,     setNoteText]     = useState('');
  const [addingNote,   setAddingNote]   = useState(false);
  const noteInputRef   = useRef(null);

  // Next visit
  const [nextVisitSaving,  setNextVisitSaving]  = useState(false);
  const [showDatePicker,   setShowDatePicker]   = useState(false);
  const [pickerDate,       setPickerDate]       = useState(new Date());

  // Fetch full visit detail + stages
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api.get(`/visits/${visit.id}`)
      .then(({ data }) => setVisit(data))
      .catch(() => {})
      .finally(() => setFetching(false));
    api.get('/stages').then(({ data }) => setStages(data)).catch(() => {});
    api.get(`/visits/${visit.id}/notes`).then(({ data }) => setNotes(data)).catch(() => {});
  }, []);

  function confirmStageMove(stage, isBackward) {
    const transfersTo = stage.employee_id && stage.employee_id !== visit.employee_id
      ? ` Visitor will be transferred to ${stage.employee_name}.`
      : '';
    const warning = isBackward ? ' This moves the visitor backward.' : '';
    Alert.alert(
      'Move to Stage',
      `Move visitor to "${stage.name}"?${transfersTo}${warning}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Move', onPress: () => handleAdvanceStage(stage.id) },
      ]
    );
  }

  async function handleAdvanceStage(stageId) {
    setAdvancingStage(true);
    try {
      const { data } = await api.put(`/visits/${visit.id}/stage`, { stageId });
      setVisit(v => ({
        ...v,
        current_stage_id:    data.current_stage_id,
        current_stage_name:  data.current_stage_name,
        current_stage_color: data.current_stage_color,
        stage_logs:          data.logs,
        ...(data.status_reset ? { status: data.status_reset } : {}),
      }));
      if (data.is_final) {
        Alert.alert('Visit Completed', `Visitor has completed all stages.`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch { Alert.alert('Error', 'Failed to update stage.'); }
    finally { setAdvancingStage(false); }
  }

  async function handleStageWaiting(stage_status) {
    setWaitingLoading(true);
    try {
      const { data } = await api.put(`/visits/${visit.id}/stage-waiting`, { stage_status });
      setVisit(v => ({ ...v, stage_status: data.stage_status, stage_waiting_since: data.stage_waiting_since }));
    } catch { Alert.alert('Error', 'Failed to update waiting status.'); }
    finally { setWaitingLoading(false); }
  }

  function fmtElapsedMs(since) {
    if (!since) return '0m';
    const ms = nowMs - new Date(since).getTime();
    if (ms < 0) return '0m';
    const m = Math.floor(ms / 60000);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60 ? (m % 60) + 'm' : ''}`.trim();
  }

  async function fetchEmployees() {
    setLoadingEmps(true);
    try {
      const { data } = await api.get('/visits/employees');
      setEmployees(data);
    } catch { /* silent */ }
    finally { setLoadingEmps(false); }
  }

  async function changeStatus(nextStatus, force = false) {
    Alert.alert('Update Status', `Change to "${STATUS_LABELS[nextStatus] || nextStatus}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', onPress: async () => {
          setLoading(true);
          try {
            const { data } = await api.put(`/visits/${visit.id}/status`, { status: nextStatus, force });
            if (data?.queue_warning) {
              setLoading(false);
              Alert.alert(
                'Someone is ahead',
                data.message || `${data.ahead_visitor} is waiting before this visitor.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Approve Anyway', onPress: () => changeStatus(nextStatus, true) },
                ]
              );
              return;
            }
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

  async function submitNote() {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      const { data } = await api.post(`/visits/${visit.id}/notes`, { note: noteText.trim() });
      setNotes(prev => [...prev, data]);
      setNoteText('');
    } catch { Alert.alert('Error', 'Failed to add note.'); }
    finally { setAddingNote(false); }
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

  async function saveNextVisit(date) {
    setNextVisitSaving(true);
    try {
      const dateStr = date.toISOString().slice(0, 10);
      await api.put(`/visits/${visit.id}/next-visit`, { next_visit_date: dateStr });
      setVisit(v => ({ ...v, next_visit_date: dateStr }));
    } catch {
      Alert.alert('Error', 'Failed to save next visit date.');
    } finally { setNextVisitSaving(false); }
  }

  function applyPreset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    saveNextVisit(d);
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

        {/* Waiting status — only visible when admin has enabled the feature */}
        {(visit.status === 'pending' || visit.status === 'approved') && user?.company_waiting_status_enabled && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Waiting Status</Text>
            <View style={st.waitingRow}>
              {visit.stage_status === 'waiting' ? (
                <>
                  <View style={st.waitingBadge}>
                    <Text style={st.waitingBadgeText}>⏱ Waiting</Text>
                  </View>
                  {visit.stage_waiting_since && (
                    <Text style={st.waitingTimer}>{fmtElapsedMs(visit.stage_waiting_since)}</Text>
                  )}
                  <TouchableOpacity
                    style={[st.waitingBtn, st.callInBtn]}
                    onPress={() => handleStageWaiting('in_progress')}
                    disabled={waitingLoading}>
                    <Text style={st.waitingBtnText}>
                      {waitingLoading ? '…' : 'Call In ▶'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={st.waitingHint}>
                    {visit.stage_status === 'in_progress' ? '▶ In progress' : 'Not waiting'}
                  </Text>
                  <TouchableOpacity
                    style={[st.waitingBtn, st.markWaitingBtn]}
                    onPress={() => handleStageWaiting('waiting')}
                    disabled={waitingLoading}>
                    <Text style={[st.waitingBtnText, { color: '#92400e' }]}>
                      {waitingLoading ? '…' : 'Mark Waiting'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {/* Stage tracker */}
        {stages.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Stage Progress</Text>

            {/* Stage pills — tap any non-current pill to move there */}
            {(visit.status === 'pending' || visit.status === 'approved') && (
              <Text style={st.stageHint}>Tap any stage to move visitor</Text>
            )}
            <View style={st.stageRow}>
              {stages.map((stage, i) => {
                const isCurrent  = visit.current_stage_id === stage.id;
                const logs       = visit.stage_logs || [];
                const isDone     = logs.some(l => l.stage_name === stage.name);
                const curIdx     = stages.findIndex(sg => sg.id === visit.current_stage_id);
                const isBackward = !isCurrent && curIdx !== -1 && i < curIdx;
                const canMove    = (visit.status === 'pending' || visit.status === 'approved') && !isCurrent;
                return (
                  <View key={stage.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                      style={[
                        st.stageBtn,
                        isCurrent && { backgroundColor: stage.color, borderColor: stage.color },
                        isDone && !isCurrent && { backgroundColor: stage.color + 'aa', borderColor: stage.color },
                        !isCurrent && !isDone && st.stageBtnInactive,
                        canMove && !isDone && { borderColor: stage.color, backgroundColor: stage.color + '22' },
                      ]}
                      disabled={!canMove || advancingStage}
                      onPress={() => confirmStageMove(stage, isBackward)}
                      activeOpacity={0.75}>
                      <Text style={[st.stageBtnText, (isCurrent || isDone) && { color: '#fff' },
                        canMove && !isDone && { color: stage.color }]}>
                        {isDone && !isCurrent ? '✓ ' : ''}{stage.name}{stage.is_final ? ' 🏁' : ''}
                      </Text>
                    </TouchableOpacity>
                    {i < stages.length - 1 && <Text style={st.arrow}>›</Text>}
                  </View>
                );
              })}
            </View>

            {(visit.stage_logs || []).length > 0 && (
              <View style={st.logBox}>
                {(visit.stage_logs || []).map((log, i) => (
                  <View key={i} style={st.logRow}>
                    <View style={[st.logDot, { backgroundColor: log.color || COLORS.primary }]} />
                    <Text style={st.logName}>{log.stage_name}</Text>
                    <Text style={st.logTime}>
                      {new Date(log.entered_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </Text>
                    {log.entered_by_name && <Text style={st.logBy}>· {log.entered_by_name}</Text>}
                  </View>
                ))}
              </View>
            )}
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

        {/* Notes */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Notes {notes.length > 0 ? `(${notes.length})` : ''}</Text>
          {notes.length === 0 && (
            <Text style={sn.empty}>No notes yet. Add one below.</Text>
          )}
          {notes.map(n => (
            <View key={n.id} style={sn.noteItem}>
              <View style={sn.noteHeader}>
                <Text style={sn.noteAuthor}>{n.author_name}</Text>
                <Text style={sn.noteTime}>
                  {new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </Text>
              </View>
              <Text style={sn.noteText}>{n.note}</Text>
            </View>
          ))}
          <View style={sn.inputRow}>
            <TextInput
              ref={noteInputRef}
              style={sn.input}
              placeholder="Add a note…"
              placeholderTextColor={COLORS.textMuted}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[sn.sendBtn, (!noteText.trim() || addingNote) && sn.sendBtnDisabled]}
              onPress={submitNote}
              disabled={!noteText.trim() || addingNote}>
              {addingNote
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Next Visit */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Next Visit</Text>
          {visit.next_visit_date ? (
            <Text style={s.current}>
              Scheduled: <Text style={{ color: COLORS.primary, fontWeight: '600' }}>
                {new Date(String(visit.next_visit_date).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </Text>
          ) : (
            <Text style={s.current}>No next visit scheduled</Text>
          )}
          <View style={s.snvPresets}>
            {[{ label: '1 Wk', days: 7 }, { label: '2 Wks', days: 14 }, { label: '3 Wks', days: 21 },
              { label: '1 Mo', days: 30 }, { label: '3 Mo', days: 90 }].map(({ label, days }) => (
              <TouchableOpacity key={days} style={s.snvChip} activeOpacity={0.7} onPress={() => applyPreset(days)} disabled={nextVisitSaving}>
                <Text style={s.snvChipText}>{label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.snvChip} activeOpacity={0.7} onPress={() => { setPickerDate(new Date()); setShowDatePicker(true); }} disabled={nextVisitSaving}>
              <Text style={s.snvChipText}>Custom</Text>
            </TouchableOpacity>
          </View>
          {nextVisitSaving && <Text style={s.current}>Saving…</Text>}
          {showDatePicker && (
            <DateTimePicker
              value={pickerDate}
              mode="date"
              minimumDate={new Date()}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(e, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) { setPickerDate(date); saveNextVisit(date); }
              }}
            />
          )}
        </View>

        {/* Reassign */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Associate</Text>
          <Text style={s.current}>
            Assigned to: <Text style={{ color: COLORS.primary, fontWeight: '600' }}>{visit.employee_name || 'Unassigned'}</Text>
          </Text>
          <TouchableOpacity
            style={s.reassignBtn}
            activeOpacity={0.7}
            onPress={() => { setReassigning(true); fetchEmployees(); }}>
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
          {loadingEmps ? (
            <View style={s.empLoading}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={s.empLoadingText}>Loading associates…</Text>
            </View>
          ) : (
            <FlatList
              data={employees}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <View style={s.empEmpty}>
                  <Ionicons name="people-outline" size={40} color={COLORS.textMuted} />
                  <Text style={s.empEmptyText}>No associates found</Text>
                  <Text style={s.empEmptySubText}>Make sure employees are marked active in settings.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.empItem, visit.employee_id === item.id && s.empItemActive]}
                  activeOpacity={0.7}
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
          )}
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
  snvPresets:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 4 },
  snvChip:      { backgroundColor: '#eff0ff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  snvChipText:  { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
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
  empLoading:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  empLoadingText:  { marginTop: 12, fontSize: 14, color: COLORS.textMuted },
  empEmpty:        { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  empEmptyText:    { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 14 },
  empEmptySubText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
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

const sn = StyleSheet.create({
  empty:      { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 10 },
  noteItem:   { backgroundColor: COLORS.background, borderRadius: 10, padding: 10, marginBottom: 8,
                borderWidth: 1, borderColor: COLORS.border },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  noteAuthor: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  noteTime:   { fontSize: 11, color: COLORS.textMuted },
  noteText:   { fontSize: 13, color: COLORS.text, lineHeight: 19 },
  inputRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  input:      { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
                paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
                color: COLORS.text, backgroundColor: '#fafafa', maxHeight: 100 },
  sendBtn:        { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.primary,
                    alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:{ backgroundColor: COLORS.border },
});

const st = StyleSheet.create({
  stageHint:   { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 8 },
  stageRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  stageBtn:    { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                 borderWidth: 1.5, borderColor: COLORS.border },
  stageBtnInactive: { backgroundColor: COLORS.background, borderColor: COLORS.border },
  stageBtnText:{ fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: COLORS.textMuted },
  arrow:         { color: COLORS.border, fontSize: 16, marginHorizontal: 2 },
  waitingRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8,
                   backgroundColor: '#fafafa', borderRadius: 10, padding: 10,
                   borderWidth: 1, borderColor: COLORS.border },
  waitingBadge:  { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  waitingBadgeText: { fontSize: 11, fontWeight: '700', color: '#d97706' },
  waitingTimer:  { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: '#b45309',
                   backgroundColor: '#fde68a', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  waitingHint:   { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  waitingBtn:    { marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  markWaitingBtn:{ backgroundColor: '#fef3c7' },
  callInBtn:     { backgroundColor: '#d1fae5' },
  waitingBtnText:{ fontSize: 12, fontWeight: '700', color: '#065f46' },
  logBox:        { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, gap: 6 },
  logRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logDot:      { width: 7, height: 7, borderRadius: 4 },
  logName:     { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: COLORS.text },
  logTime:     { fontSize: 11, color: COLORS.textMuted },
  logBy:       { fontSize: 11, color: COLORS.textMuted },
});
