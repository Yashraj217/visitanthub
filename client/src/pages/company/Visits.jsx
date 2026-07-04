import { useEffect, useState, useRef, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import VisitorHistoryModal from '../../components/VisitorHistoryModal';
import { useAuth } from '../../context/AuthContext';
import { exportToExcel } from '../../utils/exportExcel';
import { formatInTz } from '../../utils/tz';
import { useNow, fmtElapsed } from '../../hooks/useNow';

const statusClass = s => ({
  pending: 'badge-pending', approved: 'badge-approved',
  rejected: 'badge-rejected', completed: 'badge-completed',
}[s] || 'badge-inactive');

const STANDARD_COLS = [
  { id: 'ref_number',    label: 'Ref #' },
  { id: 'visitor_name', label: 'Visitor' },
  { id: 'mobile',       label: 'Mobile' },
  { id: 'employee_name', label: 'Associate' },
  { id: 'service_name', label: 'Service' },
  { id: 'visit_time',   label: 'Visit Time' },
];
const STD_COLS_KEY    = 'admin_visits_cols';
const HIDDEN_COLS_KEY = 'admin_visits_hidden_cols';

function loadSet(key, defaults) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return saved ? new Set(saved) : new Set(defaults);
  } catch { return new Set(defaults); }
}

function loadCols() {
  return loadSet(STD_COLS_KEY, STANDARD_COLS.map(c => c.id));
}

export default function Visits() {
  const { user } = useAuth();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyVisitorId, setHistoryVisitorId] = useState(null);
  const [filters, setFilters] = useState({ statuses: ['pending', 'approved'], date: '' });
  const [statusDropOpen, setStatusDropOpen] = useState(false);
  const statusDropRef = useRef(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editEmp, setEditEmp] = useState(false);
  const [empList, setEmpList] = useState([]);
  const [newEmpId, setNewEmpId] = useState('');
  const [savingEmp, setSavingEmp] = useState(false);

  const [hiddenFields, setHiddenFields] = useState([]);

  // Stage tracking
  const [stages,       setStages]       = useState([]);
  const [advancingStage, setAdvancingStage] = useState(false);

  // Queue-jump confirmation
  const [jumpWarning, setJumpWarning] = useState(null); // { visitId, message, aheadVisitor }

  // Live clock for wait timers
  const now = useNow(30_000);

  // Photos
  const [photos, setPhotos]           = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [lightbox, setLightbox]       = useState(null); // url string

  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [visibleCols, setVisibleCols]           = useState(loadCols);
  const [visibleHiddenCols, setVisibleHiddenCols] = useState(null);
  const colPickerRef = useRef(null);

  const [search, setSearch] = useState('');

  useEffect(() => {
    function handler(e) {
      if (statusDropRef.current && !statusDropRef.current.contains(e.target)) setStatusDropOpen(false);
      if (colPickerRef.current && !colPickerRef.current.contains(e.target)) setColPickerOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    api.get('/services/hidden-fields').then(({ data }) => setHiddenFields(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (hiddenFields.length && visibleHiddenCols === null) {
      setVisibleHiddenCols(loadSet(HIDDEN_COLS_KEY, hiddenFields.map(f => f.id)));
    }
  }, [hiddenFields]);

  function toggleCol(id) {
    setVisibleCols(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(STD_COLS_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  function toggleHiddenCol(id) {
    setVisibleHiddenCols(prev => {
      const next = new Set(prev ?? []);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(HIDDEN_COLS_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  const companyTz = user?.company_timezone || 'UTC';
  const show = id => visibleCols.has(id);
  const gridHiddenCols = hiddenFields.filter(f => visibleHiddenCols?.has(f.id));
  const multipleHiddenSvcs = new Set(hiddenFields.map(f => f.service_id)).size > 1;

  function exportGrid() {
    const cols = [];
    if (show('ref_number'))    cols.push({ header: 'Ref #',      key: 'ref_number' });
    if (show('visitor_name')) cols.push({ header: 'Visitor',    key: 'visitor_name' });
    if (show('mobile'))       cols.push({ header: 'Mobile',     key: 'mobile' });
    if (show('employee_name'))cols.push({ header: 'Associate',  value: v => `${v.employee_name}${v.designation ? ` — ${v.designation}` : ''}` });
    if (show('service_name')) cols.push({ header: 'Service',    key: 'service_name' });
    if (show('visit_time'))   cols.push({ header: 'Visit Time', value: v => formatInTz(v.visit_time, companyTz) });
    cols.push({ header: 'Status', key: 'status' });
    gridHiddenCols.forEach(c => cols.push({
      header: c.field_label,
      value: v => (v.hidden_fields || []).find(f => f.field_id === c.id)?.value ?? '',
    }));
    exportToExcel(`visits-${filters.date || 'all'}`, 'Visits', cols, filtered);
  }

  const totalHidden = STANDARD_COLS.length + hiddenFields.length;
  const totalVisible = visibleCols.size + (visibleHiddenCols?.size ?? hiddenFields.length);
  const hiddenCount = totalHidden - totalVisible;

  useEffect(() => {
    api.get('/stages').then(({ data }) => setStages(data)).catch(() => {});
  }, []);

  function closeDetail() {
    setSelected(null);
    setEditEmp(false);
    setEmpList([]);
    setNewEmpId('');
    setPhotos([]);
  }

  async function openDetail(v) {
    setSelected(v);
    setEditEmp(false);
    setDetailLoading(true);
    setPhotos([]);
    try {
      const { data } = await api.get(`/visits/${v.id}`);
      setSelected(data);
    } catch { /* use row data */ }
    finally { setDetailLoading(false); }
    // Load photos
    setPhotosLoading(true);
    try {
      const { data } = await api.get(`/visits/${v.id}/photos`);
      setPhotos(data);
    } catch { /* ignore */ }
    finally { setPhotosLoading(false); }
  }

  async function handlePhotoUpload(e) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadingPhotos(true);
    const form = new FormData();
    Array.from(files).forEach(f => form.append('photos', f));
    try {
      const { data } = await api.post(`/visits/${selected.id}/photos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhotos(prev => [...prev, ...data]);
      toast.success(`${data.length} photo${data.length > 1 ? 's' : ''} uploaded`);
    } catch { toast.error('Upload failed'); }
    finally { setUploadingPhotos(false); e.target.value = ''; }
  }

  async function deletePhoto(photoId) {
    try {
      await api.delete(`/visits/${selected.id}/photos/${photoId}`);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch { toast.error('Delete failed'); }
  }

  async function handleAdvanceStage(stageId) {
    if (!selected) return;
    setAdvancingStage(true);
    try {
      const { data } = await api.put(`/visits/${selected.id}/stage`, { stageId });
      setSelected(prev => ({
        ...prev,
        current_stage_id:    data.current_stage_id,
        current_stage_name:  data.current_stage_name,
        current_stage_color: data.current_stage_color,
        stage_logs:          data.logs,
        ...(data.is_final ? { status: 'completed' } : {}),
        ...(data.status_reset ? { status: data.status_reset } : {}),
      }));
      // Reflect status in list
      setVisits(prev => prev.map(v => v.id === selected.id ? {
        ...v,
        current_stage_id:    data.current_stage_id,
        current_stage_name:  data.current_stage_name,
        current_stage_color: data.current_stage_color,
        ...(data.is_final ? { status: 'completed' } : {}),
        ...(data.status_reset ? { status: data.status_reset } : {}),
      } : v));
      toast.success(`Stage: ${data.current_stage_name}`);
    } catch { toast.error('Failed to update stage'); }
    finally { setAdvancingStage(false); }
  }

  async function handleStageWaiting(visitId, stage_status) {
    try {
      const { data } = await api.put(`/visits/${visitId}/stage-waiting`, { stage_status });
      const patch = { stage_status: data.stage_status, stage_waiting_since: data.stage_waiting_since };
      setSelected(prev => prev ? { ...prev, ...patch } : prev);
      setVisits(prev => prev.map(v => v.id === visitId ? { ...v, ...patch } : v));
    } catch { toast.error('Failed to update waiting status'); }
  }

  async function startEditEmp() {
    const params = selected.service_id ? `?service_id=${selected.service_id}` : '';
    const { data } = await api.get(`/visits/employees${params}`);
    setEmpList(data);
    setNewEmpId(String(selected.employee_id || ''));
    setEditEmp(true);
  }

  async function saveEmp() {
    if (!newEmpId || String(newEmpId) === String(selected.employee_id)) { setEditEmp(false); return; }
    setSavingEmp(true);
    try {
      const { data } = await api.put(`/visits/${selected.id}/employee`, { employee_id: Number(newEmpId) });
      toast.success('Associate updated');
      setSelected(s => ({ ...s, employee_id: Number(newEmpId), employee_name: data.employee.name, designation: data.employee.designation }));
      // Also refresh the row in the list
      setVisits(vs => vs.map(v => v.id === selected.id
        ? { ...v, employee_name: data.employee.name, designation: data.employee.designation }
        : v
      ));
      setEditEmp(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update associate');
    } finally {
      setSavingEmp(false);
    }
  }

  async function load(order) {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.statuses.length > 0) params.set('status', filters.statuses.join(','));
    if (filters.date) params.set('date', filters.date);
    params.set('order', order ?? sortOrder);
    const { data } = await api.get(`/visits?${params}`);
    setVisits(data);
    setLoading(false);
  }

  function toggleStatus(s) {
    setFilters(f => {
      const next = f.statuses.includes(s)
        ? f.statuses.filter(x => x !== s)
        : [...f.statuses, s];
      return { ...f, statuses: next };
    });
  }

  useEffect(() => {
    const defaultOrder = filters.statuses.includes('pending') ? 'asc' : 'desc';
    setSortOrder(defaultOrder);
    load(defaultOrder);
  }, [filters]);

  // Auto-refresh every 2 minutes so scheduled visits appear without manual reload
  useEffect(() => {
    const t = setInterval(() => load(sortOrder), 2 * 60 * 1000);
    return () => clearInterval(t);
  }, [filters, sortOrder]);

  async function updateStatus(id, status, force = false) {
    if (status === 'completed' && !window.confirm('Mark this visit as completed?')) return;
    if (status === 'approved'  && !window.confirm('Approve this visit?')) return;
    try {
      const { data } = await api.put(`/visits/${id}/status`, { status, force });
      if (data.queue_warning) {
        setJumpWarning({ visitId: id, status, message: data.message, aheadVisitor: data.ahead_visitor });
        return;
      }
      toast.success('Status updated');
      setVisits(prev => prev.map(v => v.id === id ? { ...v, status, is_ready: 0 } : v));
      if (selected?.id === id) setSelected(prev => ({ ...prev, status, is_ready: 0 }));
      closeDetail();
    } catch { toast.error('Failed'); }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return visits;
    const q = search.toLowerCase();
    return visits.filter(v =>
      (v.visitor_name || '').toLowerCase().includes(q) ||
      (v.mobile || '').includes(q) ||
      (v.ref_number || '').toLowerCase().includes(q) ||
      (v.employee_name || '').toLowerCase().includes(q) ||
      (v.service_name || '').toLowerCase().includes(q)
    );
  }, [visits, search]);

  const colSums = useMemo(() => {
    const sums = {};
    for (const col of gridHiddenCols) {
      const nums = filtered
        .map(v => parseFloat((v.hidden_fields || []).find(f => f.field_id === col.id)?.value))
        .filter(n => !isNaN(n));
      if (nums.length > 0) sums[col.id] = nums.reduce((a, b) => a + b, 0);
    }
    return sums;
  }, [filtered, gridHiddenCols]);

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visits</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-sm text-gray-500">
              {filtered.length}{search.trim() ? ` of ${visits.length}` : ''} records
            </p>
            <button
              onClick={() => {
                const next = sortOrder === 'asc' ? 'desc' : 'asc';
                setSortOrder(next);
                load(next);
              }}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors whitespace-nowrap shadow-sm"
            >
              {sortOrder === 'asc' ? '↑ Oldest First' : '↓ Newest First'}
            </button>
          </div>
        </div>
      </div>

      {/* Filters + Search + Column picker */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <input
          type="search"
          placeholder="Search visitor, mobile, ref, associate…"
          className="input flex-1 min-w-[200px] max-w-xs"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {/* Multi-select status dropdown */}
        <div className="relative" ref={statusDropRef}>
          <button
            type="button"
            onClick={() => setStatusDropOpen(o => !o)}
            className={`input w-44 text-left flex items-center justify-between gap-2 cursor-pointer ${statusDropOpen ? 'ring-2 ring-primary-400' : ''}`}
          >
            <span className="truncate text-sm text-gray-700">
              {filters.statuses.length === 0
                ? 'All Status'
                : filters.statuses.length === 4
                ? 'All Status'
                : filters.statuses.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}
            </span>
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {statusDropOpen && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-3 w-44">
              {[
                { value: 'pending',   label: 'Pending',   color: 'text-yellow-700' },
                { value: 'approved',  label: 'Approved',  color: 'text-green-700' },
                { value: 'completed', label: 'Completed', color: 'text-blue-700' },
                { value: 'rejected',  label: 'Rejected',  color: 'text-red-700' },
              ].map(({ value, label, color }) => (
                <label key={value} className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary-600 rounded"
                    checked={filters.statuses.includes(value)}
                    onChange={() => toggleStatus(value)}
                  />
                  <span className={`text-sm font-medium ${color}`}>{label}</span>
                </label>
              ))}
              <div className="border-t mt-2 pt-2 flex gap-3">
                <button className="text-xs text-primary-600 hover:underline"
                  onClick={() => setFilters(f => ({ ...f, statuses: ['pending','approved','completed','rejected'] }))}>
                  All
                </button>
                <button className="text-xs text-gray-400 hover:underline"
                  onClick={() => setFilters(f => ({ ...f, statuses: [] }))}>
                  None
                </button>
              </div>
            </div>
          )}
        </div>
        <input
          type="date" className="input w-44"
          value={filters.date}
          onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
        />

        <button onClick={exportGrid} className="btn-secondary flex items-center gap-2">
          ⬇ Export
        </button>

        {/* Column picker */}
        <div className="relative" ref={colPickerRef}>
          <button
            onClick={() => setColPickerOpen(o => !o)}
            className={`btn-secondary flex items-center gap-2 ${colPickerOpen ? 'ring-2 ring-primary-400' : ''}`}
          >
            ⚙ Columns
            {hiddenCount > 0 && (
              <span className="bg-primary-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {hiddenCount}
              </span>
            )}
          </button>
          {colPickerOpen && (
            <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-4 w-64 max-h-[28rem] overflow-y-auto">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Standard Columns</p>
              {STANDARD_COLS.map(col => (
                <label key={col.id} className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary-600"
                    checked={show(col.id)}
                    onChange={() => toggleCol(col.id)}
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{col.label}</span>
                </label>
              ))}
              {hiddenFields.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mt-4 mb-2">🔒 Internal Fields</p>
                  {hiddenFields.map(f => (
                    <label key={f.id} className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-amber-500"
                        checked={visibleHiddenCols?.has(f.id) ?? true}
                        onChange={() => toggleHiddenCol(f.id)}
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{f.field_label}</span>
                      {multipleHiddenSvcs && f.service_name
                        ? <span className="text-xs text-gray-400 ml-auto">{f.service_name}</span>
                        : null}
                    </label>
                  ))}
                </>
              )}
              <div className="border-t mt-2 pt-2 flex gap-3">
                <button className="text-xs text-primary-600 hover:underline"
                  onClick={() => {
                    const allStd = new Set(STANDARD_COLS.map(c => c.id));
                    const allHid = new Set(hiddenFields.map(f => f.id));
                    setVisibleCols(allStd);
                    setVisibleHiddenCols(allHid);
                    localStorage.setItem(STD_COLS_KEY, JSON.stringify([...allStd]));
                    localStorage.setItem(HIDDEN_COLS_KEY, JSON.stringify([...allHid]));
                  }}>Show all</button>
                <button className="text-xs text-gray-400 hover:underline"
                  onClick={() => {
                    setVisibleCols(new Set());
                    setVisibleHiddenCols(new Set());
                    localStorage.setItem(STD_COLS_KEY, '[]');
                    localStorage.setItem(HIDDEN_COLS_KEY, '[]');
                  }}>Hide all</button>
              </div>
            </div>
          )}
        </div>

        {(filters.status || filters.date) && (
          <button onClick={() => setFilters({ status:'', date:'' })} className="btn-secondary ml-auto">Clear</button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <>
          {/* Mobile card list */}
          <div className="sm:hidden divide-y divide-gray-100">
            {filtered.map(v => (
              <div key={v.id}
                className={`p-4 cursor-pointer ${v.ref_number?.startsWith('BK-') ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-gray-50'}`}
                onClick={() => openDetail(v)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 truncate">{v.visitor_name}</p>
                      {v.is_ready === 1 && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />READY
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-sm text-gray-500">{v.mobile}</p>
                      {v.status === 'pending' && v.visit_time && (
                        <span className="text-xs text-amber-600 font-medium">
                          ⏱ {fmtElapsed(now - new Date(v.visit_time))}
                        </span>
                      )}
                      {v.status === 'approved' && v.approved_at && (
                        <span className="text-xs text-blue-600 font-medium">
                          ⚡ {fmtElapsed(now - new Date(v.approved_at))}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className={`badge-${v.status}`}>{v.status}</span>
                    {v.current_stage_name && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: v.current_stage_color || '#6366f1' }}>
                        {v.current_stage_name}
                      </span>
                    )}
                  </div>
                </div>
                {v.ref_number && <p className={`text-xs font-mono mt-1 font-semibold ${v.ref_number?.startsWith('BK-') ? 'text-orange-600' : 'text-primary-600'}`}>{v.ref_number}</p>}
                <div className="mt-1.5 text-xs text-gray-500 space-y-0.5">
                  <p>{v.employee_name}{v.designation ? ` — ${v.designation}` : ''}</p>
                  <p>
                    {v.service_name || '—'} · {formatInTz(v.visit_time, companyTz, { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', year: undefined })}
                    {v.photo_count > 0 && <span className="ml-2 text-indigo-500">📷 {v.photo_count}</span>}
                  </p>
                </div>
                <div className="mt-3 flex gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                  {v.status === 'pending' && (<>
                    <button onClick={() => updateStatus(v.id,'approved')}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold shadow-sm transition-colors">
                      ✓ Approve
                    </button>
                    <button onClick={() => updateStatus(v.id,'rejected')}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold shadow-sm transition-colors">
                      ✕ Reject
                    </button>
                  </>)}
                  {v.status === 'approved' && (
                    <button onClick={() => updateStatus(v.id,'completed')} className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium transition-colors">Complete</button>
                  )}
                </div>
              </div>
            ))}
            {!filtered.length && (
              <p className="px-6 py-8 text-center text-gray-400">
                {search.trim() ? `No visits match "${search}"` : 'No visits found'}
              </p>
            )}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {show('ref_number')    && <th className="px-5 py-3 text-left font-medium text-gray-500">Ref #</th>}
                  {show('visitor_name') && <th className="px-5 py-3 text-left font-medium text-gray-500">Visitor</th>}
                  {show('mobile')       && <th className="px-5 py-3 text-left font-medium text-gray-500">Mobile</th>}
                  {show('employee_name') && <th className="px-5 py-3 text-left font-medium text-gray-500">Associate</th>}
                  {show('service_name') && <th className="px-5 py-3 text-left font-medium text-gray-500">Service</th>}
                  {show('visit_time')   && <th className="px-5 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Visit Time</th>}
                  <th className="px-5 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Status</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Actions</th>
                  {gridHiddenCols.map(f => (
                    <th key={f.id} className="px-3 py-3 text-left font-medium text-amber-700 bg-amber-50 border-l border-amber-100 leading-tight w-24">
                      🔒 {f.field_label.replace(/\bRecd\b/gi, 'Received')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id}
                    className={`border-b last:border-0 cursor-pointer ${v.ref_number?.startsWith('BK-') ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-gray-50'}`}
                    onClick={() => openDetail(v)}>
                    {show('ref_number')    && <td className={`px-5 py-3 font-mono text-xs font-semibold whitespace-nowrap ${v.ref_number?.startsWith('BK-') ? 'text-orange-600' : 'text-primary-600'}`}>{v.ref_number || '—'}</td>}
                    {show('visitor_name') && <td className="px-5 py-3 font-medium">
                      <span>{v.visitor_name}</span>
                      {v.photo_count > 0 && (
                        <span className="ml-2 text-xs text-indigo-500 font-normal">📷 {v.photo_count}</span>
                      )}
                    </td>}
                    {show('mobile')       && <td className="px-5 py-3 text-gray-500">{v.mobile}</td>}
                    {show('employee_name') && <td className="px-5 py-3">{v.employee_name}{v.designation ? ` — ${v.designation}` : ''}</td>}
                    {show('service_name') && <td className="px-5 py-3 text-gray-500">{v.service_name || '—'}</td>}
                    {show('visit_time')   && <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                      {formatInTz(v.visit_time, companyTz, { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', year: undefined })}
                    </td>}
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`badge ${statusClass(v.status)}`}>{v.status}</span>
                        {v.current_stage_name && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white w-fit"
                            style={{ backgroundColor: v.current_stage_color || '#6366f1' }}>
                            {v.current_stage_name}
                          </span>
                        )}
                        {v.stage_status === 'waiting' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full w-fit animate-pulse">
                            ⏱ Waiting{v.stage_waiting_since ? ` · ${fmtElapsed(now - new Date(v.stage_waiting_since))}` : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 flex gap-2 flex-wrap items-center" onClick={e => e.stopPropagation()}>
                      {v.status === 'pending' && <>
                        <button onClick={() => updateStatus(v.id,'approved')}
                          className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-semibold shadow-sm transition-colors">
                          ✓ Approve
                        </button>
                        <button onClick={() => updateStatus(v.id,'rejected')}
                          className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold shadow-sm transition-colors">
                          ✕ Reject
                        </button>
                      </>}
                      {v.status === 'approved' && (
                        <button onClick={() => updateStatus(v.id,'completed')} className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium transition-colors">Complete</button>
                      )}
                    </td>
                    {gridHiddenCols.map(col => {
                      const fv = (v.hidden_fields || []).find(f => f.field_id === col.id);
                      return (
                        <td key={col.id} className="px-3 py-3 bg-amber-50 border-l border-amber-100 text-xs w-24 overflow-hidden">
                          <span className="block truncate">
                            {fv?.value
                              ? <span className="text-gray-800">{fv.value}</span>
                              : <span className="text-gray-300 italic">—</span>
                            }
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                    {search.trim() ? `No visits match "${search}"` : 'No visits found'}
                  </td></tr>
                )}
              </tbody>
              {/* Numeric summary row */}
              {filtered.length > 0 && gridHiddenCols.some(c => c.id in colSums) && (
                <tfoot>
                  <tr className="border-t-2 border-amber-300 bg-amber-50 text-xs font-semibold">
                    {show('ref_number')    && <td className="px-5 py-2 text-amber-700">Σ Total</td>}
                    {show('visitor_name') && <td className="px-5 py-2" />}
                    {show('mobile')       && <td className="px-5 py-2" />}
                    {show('employee_name') && <td className="px-5 py-2" />}
                    {show('service_name') && <td className="px-5 py-2" />}
                    {show('visit_time')   && <td className="px-5 py-2" />}
                    <td className="px-5 py-2" />
                    {gridHiddenCols.map(col => (
                      <td key={col.id} className="px-3 py-2 bg-amber-100 border-l border-amber-300 text-amber-900 font-bold text-right w-24">
                        {col.id in colSums
                          ? (colSums[col.id] % 1 === 0
                              ? colSums[col.id].toLocaleString('en-IN')
                              : colSums[col.id].toFixed(2))
                          : ''}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>{/* end hidden sm:block */}
          </>
        )}
      </div>

      {historyVisitorId && (
        <VisitorHistoryModal
          visitorId={historyVisitorId}
          onClose={() => setHistoryVisitorId(null)}
        />
      )}

      {/* Badge print modal */}
      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white text-lg flex items-center justify-center">✕</button>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={closeDetail}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Visit Details</h2>
              <button onClick={closeDetail} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {detailLoading ? (
              <div className="py-8 text-center text-gray-400">Loading…</div>
            ) : (
              <>
                <dl className="space-y-3 text-sm">
                  {/* Visitor row with history link */}
                  <div className="flex gap-2 items-start">
                    <dt className="w-28 font-medium text-gray-500 shrink-0 pt-0.5">Visitor</dt>
                    <dd className="flex-1 flex items-center gap-2 flex-wrap">
                      <span className="text-gray-900">{selected.visitor_name}</span>
                      {selected.visitor_id && (
                        <button
                          onClick={() => setHistoryVisitorId(selected.visitor_id)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-medium whitespace-nowrap">
                          View History →
                        </button>
                      )}
                    </dd>
                  </div>

                  {[
                    ['Mobile',     selected.mobile],
                    ['Email',      selected.visitor_email || '—'],
                    ['Address',    selected.address || '—'],
                    ['Ref #',      selected.ref_number || '—'],
                    ['Service',    selected.service_name || '—'],
                    ['Visit Time', formatInTz(selected.visit_time, companyTz)],
                    ['Status',     selected.status],
                    ['WhatsApp',   selected.whatsapp_sent ? '✓ Sent' : '✗ Not sent'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="w-28 font-medium text-gray-500 shrink-0">{k}</dt>
                      <dd className="text-gray-900">{v}</dd>
                    </div>
                  ))}

                  {/* Associate row — inline editable */}
                  <div className="flex gap-2 items-start">
                    <dt className="w-28 font-medium text-gray-500 shrink-0 pt-0.5">Associate</dt>
                    <dd className="flex-1">
                      {editEmp ? (
                        <div className="flex gap-2 items-center">
                          <select
                            className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            value={newEmpId}
                            onChange={e => setNewEmpId(e.target.value)}
                          >
                            {empList.map(e => (
                              <option key={e.id} value={e.id}>
                                {e.name}{e.designation ? ` — ${e.designation}` : ''}
                              </option>
                            ))}
                          </select>
                          <button onClick={saveEmp} disabled={savingEmp}
                            className="text-xs px-2.5 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap">
                            {savingEmp ? '…' : 'Save'}
                          </button>
                          <button onClick={() => setEditEmp(false)}
                            className="text-xs px-2 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 whitespace-nowrap">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900">
                            {selected.employee_name}{selected.designation ? ` (${selected.designation})` : ''}
                          </span>
                          <button onClick={startEditEmp}
                            className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline whitespace-nowrap">
                            Change
                          </button>
                        </div>
                      )}
                    </dd>
                  </div>
                </dl>

                {selected.custom_fields?.filter(f => !f.is_hidden).length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Additional Info</p>
                    <dl className="space-y-2 text-sm">
                      {selected.custom_fields.filter(f => !f.is_hidden).map((f, i) => (
                        <div key={i} className="flex gap-2">
                          <dt className="w-28 font-medium text-gray-500 shrink-0">{f.field_label}</dt>
                          <dd className="text-gray-900">{f.value || '—'}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {selected.custom_fields?.filter(f => f.is_hidden).length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3">
                      🔒 Internal Fields
                    </p>
                    <dl className="space-y-2 text-sm">
                      {selected.custom_fields.filter(f => f.is_hidden).map((f, i) => (
                        <div key={i} className="flex gap-2">
                          <dt className="w-28 font-medium text-gray-500 shrink-0">{f.field_label}</dt>
                          <dd className={f.value ? 'text-gray-900' : 'text-gray-300 italic'}>{f.value || 'Not filled yet'}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {/* Stage tracker */}
                {stages.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Stage Progress</p>

                    {/* Stepper */}
                    <div className="flex items-center gap-1 flex-wrap mb-3">
                      {stages.map((st, i) => {
                        const isCurrent = selected.current_stage_id === st.id;
                        const logs = selected.stage_logs || [];
                        const isDone = logs.some(l => l.stage_name === st.name);
                        return (
                          <span key={st.id} className="flex items-center gap-1">
                            <button
                              disabled={advancingStage}
                              onClick={() => handleAdvanceStage(isCurrent ? null : st.id)}
                              title={isCurrent ? 'Click to clear' : `Move to "${st.name}"`}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                                isCurrent
                                  ? 'text-white shadow-md scale-105'
                                  : isDone
                                  ? 'opacity-60 text-white'
                                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                              } disabled:cursor-not-allowed`}
                              style={isCurrent || isDone ? { backgroundColor: st.color, borderColor: st.color } : {}}>
                              {isDone && !isCurrent ? '✓ ' : ''}{st.name}
                              {st.is_final && ' 🏁'}
                            </button>
                            {i < stages.length - 1 && <span className="text-gray-300 text-xs">→</span>}
                          </span>
                        );
                      })}
                    </div>

                    {/* Waiting toggle — only shown when a stage is active */}
                    {selected.current_stage_id && (
                      <div className="flex items-center gap-3 mb-3 p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                        {selected.stage_status === 'waiting' ? (
                          <>
                            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                              Waiting
                            </span>
                            {selected.stage_waiting_since && (
                              <span className="text-xs font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                ⏱ {fmtElapsed(now - new Date(selected.stage_waiting_since))}
                              </span>
                            )}
                            <button
                              onClick={() => handleStageWaiting(selected.id, 'in_progress')}
                              className="ml-auto text-xs px-3 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-semibold">
                              Call In ▶
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-gray-400">
                              {selected.stage_status === 'in_progress' ? '▶ In progress' : 'No waiting status'}
                            </span>
                            <button
                              onClick={() => handleStageWaiting(selected.id, 'waiting')}
                              className="ml-auto text-xs px-3 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 font-semibold">
                              Mark Waiting
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Stage history log */}
                    {(selected.stage_logs || []).length > 0 && (
                      <div className="space-y-1">
                        {(selected.stage_logs || []).map((log, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: log.color || '#6366f1' }} />
                            <span className="font-medium text-gray-700">{log.stage_name}</span>
                            <span>·</span>
                            <span>{new Date(log.entered_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                            {log.entered_by_name && <><span>·</span><span>{log.entered_by_name}</span></>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Photos section */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      📷 Photos {photos.length > 0 && <span className="text-gray-500 normal-case font-normal">({photos.length})</span>}
                    </p>
                    <label className={`cursor-pointer text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${uploadingPhotos ? 'bg-gray-100 text-gray-400' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
                      {uploadingPhotos ? 'Uploading…' : '+ Add Photos'}
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhotos} />
                    </label>
                  </div>

                  {photosLoading ? (
                    <p className="text-xs text-gray-400 py-2">Loading…</p>
                  ) : photos.length === 0 ? (
                    <p className="text-xs text-gray-300 italic py-1">No photos yet</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {photos.map(p => (
                        <div key={p.id} className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square">
                          <img
                            src={p.filename}
                            alt={p.original_name}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setLightbox(p.filename)}
                          />
                          <button
                            onClick={() => deletePhoto(p.id)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            title="Delete">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-6 flex-wrap">
                  {selected.status === 'pending' && <>
                    <button onClick={() => updateStatus(selected.id,'approved')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold shadow-sm transition-colors">
                      ✓ Approve
                    </button>
                    <button onClick={() => updateStatus(selected.id,'rejected')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold shadow-sm transition-colors">
                      ✕ Reject
                    </button>
                  </>}
                  {selected.status === 'approved' && (
                    <button onClick={() => updateStatus(selected.id,'completed')} className="btn-primary flex-1">Mark Completed</button>
                  )}
                  <button onClick={closeDetail} className="btn-secondary flex-1">Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Queue-jump confirmation dialog */}
      {jumpWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-3xl mb-3 text-center">⚠️</div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-2">Queue Order Warning</h3>
            <p className="text-sm text-gray-600 text-center mb-1">
              <span className="font-semibold text-amber-700">{jumpWarning.aheadVisitor}</span> is ahead in the queue.
            </p>
            <p className="text-sm text-gray-500 text-center mb-6">
              Approving this visitor will skip them. Are you sure?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setJumpWarning(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => {
                  const { visitId, status } = jumpWarning;
                  setJumpWarning(null);
                  updateStatus(visitId, status, true);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold">
                Skip &amp; Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
