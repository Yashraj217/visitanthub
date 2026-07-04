import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Image, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons }     from '@expo/vector-icons';
import * as ImagePicker      from 'expo-image-picker';
import * as ImageManipulator  from 'expo-image-manipulator';
import { COLORS }             from '../../constants/colors';
import StatusBadge      from '../../components/StatusBadge';
import { useAuth }      from '../../context/AuthContext';
import api, { BASE_URL } from '../../services/api';

const IMAGE_BASE  = BASE_URL.replace(/\/api$/, '');
const MAX_KB      = 150;
const MAX_DIM     = 1000; // px on longest side

async function compressImage(uri, origWidth, origHeight) {
  const actions = [];
  if (origWidth && origHeight) {
    if (origWidth >= origHeight && origWidth > MAX_DIM)
      actions.push({ resize: { width: MAX_DIM } });
    else if (origHeight > origWidth && origHeight > MAX_DIM)
      actions.push({ resize: { height: MAX_DIM } });
  } else {
    actions.push({ resize: { width: MAX_DIM } });
  }

  // First pass at 55% quality
  let res = await ImageManipulator.manipulateAsync(
    uri, actions, { compress: 0.55, format: ImageManipulator.SaveFormat.JPEG }
  );

  // Second pass if still likely too large (very detailed photo — halve dimensions again)
  if (origWidth > MAX_DIM * 2 || origHeight > MAX_DIM * 2) {
    res = await ImageManipulator.manipulateAsync(
      res.uri, [{ resize: { width: 800 } }],
      { compress: 0.45, format: ImageManipulator.SaveFormat.JPEG }
    );
  }

  return res.uri;
}

const STATUS_ACTIONS = {
  pending:  [{ label: 'Call / Start', next: 'approved',  color: COLORS.info    },
             { label: 'Mark Done',    next: 'completed', color: COLORS.success  },
             { label: 'Mark No Show', next: 'rejected',  color: COLORS.danger   }],
  approved: [{ label: 'Mark Done',    next: 'completed', color: COLORS.success  },
             { label: 'Mark No Show', next: 'rejected',  color: COLORS.danger   }],
};

const STATUS_LABELS = { approved: 'In Progress', completed: 'Done', rejected: 'No Show' };

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{String(value)}</Text>
    </View>
  );
}

function SelectField({ field, value, onChange }) {
  return (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{field.field_label}</Text>
      <View style={s.optionsWrap}>
        {field.field_options.map(opt => {
          const active = value === opt;
          return (
            <TouchableOpacity key={opt}
              style={[s.optionChip, active && s.optionChipActive]}
              onPress={() => onChange(active ? '' : opt)}>
              <Text style={[s.optionText, active && s.optionTextActive]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function TextField({ field, value, onChange }) {
  const multiline = field.field_type === 'textarea';
  return (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{field.field_label}</Text>
      <TextInput
        style={[s.fieldInput, multiline && s.fieldInputMulti]}
        value={value}
        onChangeText={onChange}
        placeholder={`Enter ${field.field_label.toLowerCase()}…`}
        placeholderTextColor={COLORS.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

export default function AssocVisitDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const tz = user?.company_timezone || 'Asia/Kolkata';
  const [visit,      setVisit]      = useState(route.params.visit);
  const [fetching,   setFetching]   = useState(true);
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [fieldVals,  setFieldVals]  = useState({});
  const [dirty,      setDirty]      = useState(false);
  const savedRef = useRef({});

  // Stage tracking
  const [stages,          setStages]          = useState([]);
  const [advancingStage,  setAdvancingStage]  = useState(false);
  const [waitingLoading,  setWaitingLoading]  = useState(false);
  const [nowMs,           setNowMs]           = useState(() => Date.now());

  // Photos
  const [photos,         setPhotos]         = useState([]);
  const [photosLoading,  setPhotosLoading]  = useState(true);
  const [uploading,      setUploading]      = useState(false);  // true = uploading, 'compressing' = compressing
  const [lightbox,       setLightbox]       = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api.get(`/visits/${visit.id}`)
      .then(({ data }) => {
        setVisit(data);
        const initial = {};
        (data.custom_fields || []).forEach(f => { initial[f.field_id] = f.value || ''; });
        setFieldVals(initial);
        savedRef.current = { ...initial };
      })
      .catch(() => {})
      .finally(() => setFetching(false));

    api.get('/stages').then(({ data }) => setStages(data)).catch(() => {});

    api.get(`/visits/${visit.id}/photos`)
      .then(({ data }) => setPhotos(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setPhotosLoading(false));
  }, []);

  function handleFieldChange(fieldId, value) {
    setFieldVals(prev => ({ ...prev, [fieldId]: value }));
    setDirty(true);
  }

  async function saveFieldValues() {
    setSaving(true);
    try {
      await api.put(`/visits/${visit.id}/field-values`, { field_values: fieldVals });
      savedRef.current = { ...fieldVals };
      setDirty(false);
      Alert.alert('Saved', 'Field values updated successfully.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save.');
    } finally { setSaving(false); }
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

  async function pickAndUpload(source) {
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera access is needed to take photos.');
          return;
        }
        // Pick at full quality — we compress ourselves
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library access is needed to pick photos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'], quality: 1, allowsMultipleSelection: true,
        });
      }

      if (result.canceled || !result.assets?.length) return;

      // Compress each image to ≤150 KB before uploading
      setUploading('compressing');
      const formData = new FormData();
      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        const compressedUri = await compressImage(asset.uri, asset.width, asset.height);
        formData.append('photos', {
          uri:  compressedUri,
          name: `photo-${Date.now()}-${i}.jpg`,
          type: 'image/jpeg',
        });
      }

      setUploading(true);
      const { data } = await api.post(`/visits/${visit.id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhotos(prev => [...prev, ...data]);
    } catch (err) {
      Alert.alert('Upload Failed', 'Could not upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function confirmDeletePhoto(photo) {
    Alert.alert('Delete Photo', 'Remove this photo permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/visits/${visit.id}/photos/${photo.id}`);
            setPhotos(prev => prev.filter(p => p.id !== photo.id));
            setLightbox(null);
          } catch {
            Alert.alert('Error', 'Failed to delete photo.');
          }
        },
      },
    ]);
  }

  function fmtDt(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-IN', {
      timeZone: tz,
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  const actions       = STATUS_ACTIONS[visit.status] || [];
  const visitorFields = (visit.custom_fields || []).filter(f => !f.is_hidden);
  const staffFields   = (visit.custom_fields || []).filter(f => f.is_hidden);

  if (fetching) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
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

        {/* Visitor Info */}
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

        {/* Visit Details */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Visit Details</Text>
          <Row label="Service"   value={visit.service_name} />
          <Row label="Purpose"   value={visit.purpose} />
          <Row label="Associate" value={visit.employee_name} />
          <Row label="Notes"     value={visit.notes} />
        </View>

        {/* Stage tracker */}
        {stages.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Stage Progress</Text>

            {/* Stage buttons */}
            <View style={st.stageRow}>
              {stages.map((stage, i) => {
                const isCurrent = visit.current_stage_id === stage.id;
                const logs      = visit.stage_logs || [];
                const isDone    = logs.some(l => l.stage_name === stage.name);
                return (
                  <View key={stage.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                      style={[
                        st.stageBtn,
                        isCurrent && { backgroundColor: stage.color, borderColor: stage.color },
                        isDone && !isCurrent && { backgroundColor: stage.color + 'aa', borderColor: stage.color },
                        !isCurrent && !isDone && st.stageBtnInactive,
                      ]}
                      disabled={advancingStage}
                      onPress={() => handleAdvanceStage(isCurrent ? null : stage.id)}
                      activeOpacity={0.75}>
                      <Text style={[st.stageBtnText, (isCurrent || isDone) && { color: '#fff' }]}>
                        {isDone && !isCurrent ? '✓ ' : ''}{stage.name}{stage.is_final ? ' 🏁' : ''}
                      </Text>
                    </TouchableOpacity>
                    {i < stages.length - 1 && <Text style={st.arrow}>›</Text>}
                  </View>
                );
              })}
            </View>

            {/* Waiting toggle — shown when a stage is active */}
            {visit.current_stage_id && (
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
                      <Text style={st.waitingBtnText}>Call In ▶</Text>
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
                      <Text style={[st.waitingBtnText, { color: '#92400e' }]}>Mark Waiting</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* Stage history */}
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

        {/* Visitor-filled fields (read-only) */}
        {visitorFields.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Additional Info</Text>
            {visitorFields.map(f => <Row key={f.id} label={f.field_label} value={f.value} />)}
          </View>
        )}

        {/* Staff / hidden fields (editable) */}
        {staffFields.length > 0 && (
          <View style={[s.card, s.staffCard]}>
            <View style={s.staffCardHeader}>
              <Ionicons name="create-outline" size={16} color={COLORS.primary} />
              <Text style={s.sectionTitle}>Staff Notes</Text>
            </View>
            <Text style={s.staffHint}>These fields are only visible to staff.</Text>
            {staffFields.map(f => {
              const val = fieldVals[f.field_id] ?? '';
              const onChange = v => handleFieldChange(f.field_id, v);
              if (f.field_type === 'select' && f.field_options?.length)
                return <SelectField key={f.id} field={f} value={val} onChange={onChange} />;
              return <TextField key={f.id} field={f} value={val} onChange={onChange} />;
            })}
            <TouchableOpacity
              style={[s.saveBtn, (!dirty || saving) && s.saveBtnDisabled]}
              onPress={saveFieldValues} disabled={!dirty || saving}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.saveBtnText}>Save Notes</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Visitor fields editable when no hidden fields */}
        {staffFields.length === 0 && visitorFields.length > 0 && (
          <View style={[s.card, s.staffCard]}>
            <View style={s.staffCardHeader}>
              <Ionicons name="create-outline" size={16} color={COLORS.primary} />
              <Text style={s.sectionTitle}>Edit Fields</Text>
            </View>
            {visitorFields.map(f => {
              const val = fieldVals[f.field_id] ?? '';
              const onChange = v => handleFieldChange(f.field_id, v);
              if (f.field_type === 'select' && f.field_options?.length)
                return <SelectField key={f.id} field={f} value={val} onChange={onChange} />;
              return <TextField key={f.id} field={f} value={val} onChange={onChange} />;
            })}
            <TouchableOpacity
              style={[s.saveBtn, (!dirty || saving) && s.saveBtnDisabled]}
              onPress={saveFieldValues} disabled={!dirty || saving}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.saveBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Status actions */}
        {actions.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Update Status</Text>
            {actions.map(a => (
              <TouchableOpacity key={a.next}
                style={[s.actionBtn, { backgroundColor: a.color }]}
                onPress={() => changeStatus(a.next)} disabled={loading}>
                <Text style={s.actionBtnText}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Photos */}
        <View style={s.card}>
          <View style={s.photosHeader}>
            <Text style={s.sectionTitle}>
              Photos{photos.length > 0 ? ` (${photos.length})` : ''}
            </Text>
            <View style={s.photoActions}>
              <TouchableOpacity style={[s.photoBtn, uploading && s.photoBtnDisabled]}
                onPress={() => pickAndUpload('camera')} disabled={!!uploading}>
                <Ionicons name="camera-outline" size={18} color={uploading ? COLORS.textMuted : COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[s.photoBtn, uploading && s.photoBtnDisabled]}
                onPress={() => pickAndUpload('gallery')} disabled={!!uploading}>
                <Ionicons name="images-outline" size={18} color={uploading ? COLORS.textMuted : COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {photosLoading ? (
            <ActivityIndicator size="small" color={COLORS.textMuted} style={{ marginVertical: 8 }} />
          ) : photos.length === 0 && !uploading ? (
            <Text style={s.noPhotos}>No photos yet. Use camera or gallery to add.</Text>
          ) : (
            <View style={s.photoGrid}>
              {photos.map(p => (
                <TouchableOpacity key={p.id} style={s.photoThumb} onPress={() => setLightbox(p)}>
                  <Image source={{ uri: `${IMAGE_BASE}${p.filename}` }} style={s.photoThumbImg} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {uploading && (
            <View style={s.uploadingRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={s.uploadingText}>
                {uploading === 'compressing' ? 'Compressing…' : 'Uploading…'}
              </Text>
            </View>
          )}
        </View>

      </ScrollView>

      {loading && (
        <View style={s.overlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      {/* Lightbox */}
      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <View style={s.lightboxOverlay}>
          <TouchableOpacity style={s.lightboxClose} onPress={() => setLightbox(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {lightbox && (
            <>
              <Image
                source={{ uri: `${IMAGE_BASE}${lightbox.filename}` }}
                style={s.lightboxImage}
                resizeMode="contain"
              />
              <View style={s.lightboxFooter}>
                {lightbox.uploaded_by_name ? (
                  <Text style={s.lightboxUploader}>By {lightbox.uploaded_by_name}</Text>
                ) : <View />}
                <TouchableOpacity style={s.lightboxDeleteBtn} onPress={() => confirmDeletePhoto(lightbox)}>
                  <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
                  <Text style={s.lightboxDeleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: COLORS.background },
  content:          { padding: 16, paddingBottom: 40 },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card:             { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 12,
                      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  staffCard:        { borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  staffCardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  staffHint:        { fontSize: 12, color: COLORS.textMuted, marginBottom: 12 },
  cardTop:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  ref:              { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', fontFamily: 'monospace' },
  visitorName:      { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  time:             { fontSize: 13, color: COLORS.textMuted },
  sectionTitle:     { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  cardRowBetween:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4,
                      backgroundColor: '#eff0ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  historyBtnText:   { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  row:              { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
                      borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel:         { fontSize: 13, color: COLORS.textMuted, fontWeight: '500', flex: 1 },
  rowValue:         { fontSize: 13, color: COLORS.text, fontWeight: '600', flex: 2, textAlign: 'right', marginLeft: 12 },
  fieldGroup:       { marginBottom: 14 },
  fieldLabel:       { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  fieldInput:       { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
                      paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
                      color: COLORS.text, backgroundColor: '#fafafa' },
  fieldInputMulti:  { minHeight: 80, paddingTop: 10 },
  optionsWrap:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                      borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background },
  optionChipActive: { borderColor: COLORS.primary, backgroundColor: '#eff0ff' },
  optionText:       { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  optionTextActive: { color: COLORS.primary, fontWeight: '700' },
  saveBtn:          { backgroundColor: COLORS.primary, borderRadius: 10,
                      paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  saveBtnDisabled:  { backgroundColor: COLORS.border },
  saveBtnText:      { color: '#fff', fontWeight: '700', fontSize: 14 },
  actionBtn:        { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  actionBtnText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
  overlay:          { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)',
                      justifyContent: 'center', alignItems: 'center' },

  // Photos
  photosHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  photoActions:     { flexDirection: 'row', gap: 8 },
  photoBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff0ff',
                      alignItems: 'center', justifyContent: 'center' },
  photoBtnDisabled: { backgroundColor: COLORS.border },
  noPhotos:         { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic',
                      textAlign: 'center', paddingVertical: 10 },
  photoGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  photoThumb:       { width: '31%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden',
                      backgroundColor: COLORS.border },
  photoThumbImg:    { width: '100%', height: '100%' },
  uploadingRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  uploadingText:    { fontSize: 13, color: COLORS.textMuted },

  // Lightbox
  lightboxOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.93)',
                      justifyContent: 'center', alignItems: 'center' },
  lightboxClose:    { position: 'absolute', top: 52, right: 20, zIndex: 10, padding: 8,
                      backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 },
  lightboxImage:    { width: '100%', height: '70%' },
  lightboxFooter:   { position: 'absolute', bottom: 60, left: 0, right: 0,
                      flexDirection: 'row', justifyContent: 'space-between',
                      alignItems: 'center', paddingHorizontal: 24 },
  lightboxUploader: { color: '#bbb', fontSize: 13 },
  lightboxDeleteBtn:{ flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14,
                      paddingVertical: 8, borderRadius: 10 },
  lightboxDeleteText:{ color: '#ff6b6b', fontSize: 14, fontWeight: '600' },
});

const st = StyleSheet.create({
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
