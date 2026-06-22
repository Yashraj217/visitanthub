import { useState, useEffect, useRef, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import VisitorHistoryModal from '../../components/VisitorHistoryModal';
import { useAuth } from '../../context/AuthContext';
import { todayInTz, formatInTz } from '../../utils/tz';
import { exportToExcel } from '../../utils/exportExcel';

const POLL_INTERVAL = 15_000;

const STATUS_COLORS = {
  pending:   'bg-yellow-100 text-yellow-700',
  approved:  'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  rejected:  'bg-red-100 text-red-700',
};

const STANDARD_COLS = [
  { id: 'ref_number',    label: 'Ref #' },
  { id: 'visitor_name', label: 'Visitor' },
  { id: 'mobile',       label: 'Mobile' },
  { id: 'employee_name', label: 'Associate' },
  { id: 'service_name', label: 'Service' },
  { id: 'visit_time',   label: 'Visit Time' },
];

const STD_COLS_KEY    = 'user_visits_std_cols';
const HIDDEN_COLS_KEY = 'user_visits_hidden_cols';

function loadSet(key, defaults) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return saved ? new Set(saved) : new Set(defaults);
  } catch { return new Set(defaults); }
}

export default function MyVisits() {
  const { user } = useAuth();
  const companyTz = user?.company_timezone || 'UTC';

  const [visits, setVisits]       = useState([]);
  const [services, setServices]   = useState([]);   // assigned services for this associate
  const [hiddenFields, setHiddenFields] = useState([]); // fetched once for column metadata
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [detail, setDetail]       = useState(null);
  const [detailLoading, setDL]    = useState(false);
  const [hiddenEdits, setHiddenEdits] = useState({});
  const [modalSaving, setModalSaving] = useState(false);
  const [historyVisitorId, setHistoryVisitorId] = useState(null);

  // Photos
  const [photos,         setPhotos]         = useState([]);
  const [photosLoading,  setPhotosLoading]  = useState(false);
  const [uploadingPhotos,setUploadingPhotos]= useState(false);
  const [lightbox,       setLightbox]       = useState(null);

  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [visibleStdCols, setVisibleStdCols]       = useState(() => loadSet(STD_COLS_KEY, STANDARD_COLS.map(c => c.id)));
  const [visibleHiddenCols, setVisibleHiddenCols] = useState(null); // null until services load
  const colPickerRef = useRef(null);

  const [search, setSearch] = useState('');

  // Reassign associate
  const [reassignId,     setReassignId]     = useState(null);
  const [reassignList,   setReassignList]   = useState([]);
  const [reassignEmpId,  setReassignEmpId]  = useState('');
  const [reassignSaving, setReassignSaving] = useState(false);

  // Auto-refresh refs
  const knownIdsRef = useRef(new Set());
  const doPollRef   = useRef(null);

  const today = todayInTz(companyTz);
  const [filterFrom, setFilterFrom]       = useState(today);
  const [filterTo,   setFilterTo]         = useState(today);
  const [filterStatus, setFilterStatus]   = useState('pending');
  const [filterService, setFilterService] = useState('');

  // Load assigned services + hidden-field metadata once on mount
  useEffect(() => {
    api.get('/services/hidden-fields').then(({ data }) => setHiddenFields(data)).catch(() => {});

    api.get('/services/my-services').then(({ data }) => {
      setServices(data);
      if (data.length === 1) {
        // Only one service assigned — pre-select it so custom fields show immediately
        setFilterService(String(data[0].id));
      }
    }).catch(() => {});
  }, []);

  const allHiddenFields = hiddenFields;

  useEffect(() => {
    function handler(e) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target)) setColPickerOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (allHiddenFields.length && visibleHiddenCols === null) {
      setVisibleHiddenCols(loadSet(HIDDEN_COLS_KEY, allHiddenFields.map(f => f.id)));
    }
  }, [allHiddenFields]);

  function buildParams() {
    const params = {};
    if (filterFrom)    params.date_from  = filterFrom;
    if (filterTo)      params.date_to    = filterTo;
    if (filterStatus)  params.status     = filterStatus;
    if (filterService) params.service_id = filterService;
    return params;
  }

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/visits', { params: buildParams() });
      setVisits(data);
      knownIdsRef.current = new Set(data.map(v => v.id));
    } catch {
      toast.error('Failed to load visits');
    } finally {
      setLoading(false);
    }
  }

  // Silent background poll
  async function silentLoad() {
    try {
      const params = buildParams();
      const { data } = await api.get('/visits', { params });
      const incoming = data.filter(v => !knownIdsRef.current.has(v.id));
      if (incoming.length > 0) {
        toast(`${incoming.length} new visitor${incoming.length > 1 ? 's' : ''} arrived`, {
          icon: '🔔', duration: 4000,
        });
      }
      knownIdsRef.current = new Set(data.map(v => v.id));
      setVisits(data);
    } catch { /* silent — don't interrupt the user */ }
  }
  doPollRef.current = silentLoad;

  useEffect(() => { load(); }, [filterFrom, filterTo, filterStatus, filterService]);

  // Single long-lived interval; always calls latest silentLoad via ref
  useEffect(() => {
    const id = setInterval(() => doPollRef.current?.(), POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

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

  function toggleStdCol(id) {
    setVisibleStdCols(prev => {
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

  const showStd = id => visibleStdCols.has(id);

  // Custom field columns are scoped to the currently filtered service only.
  // Services do not share custom fields — showing all fields from all services
  // alongside each other creates empty cells and cross-service confusion.
  const scopedHiddenFields = filterService
    ? allHiddenFields.filter(f => f.service_id === Number(filterService))
    : [];
  const gridHiddenCols = scopedHiddenFields.filter(f => visibleHiddenCols?.has(f.id));

  const totalHidden = STANDARD_COLS.length + scopedHiddenFields.length;
  const totalVisible = visibleStdCols.size + gridHiddenCols.length;
  const hiddenCount = totalHidden - totalVisible;

  // Sum numeric hidden-field columns across filtered rows
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

  // ── Status update ─────────────────────────────────────────────────────────
  async function updateStatus(visitId, status, e) {
    e?.stopPropagation();
    try {
      await api.put(`/visits/${visitId}/status`, { status });
      toast.success(`Marked as ${status}`);
      setVisits(vs => vs.map(v => v.id === visitId ? { ...v, status } : v));
      if (detail?.id === visitId) setDetail(d => ({ ...d, status }));
    } catch {
      toast.error('Failed to update status');
    }
  }

  // ── Detail modal ──────────────────────────────────────────────────────────
  function closeDetail() {
    setSelected(null);
    setDetail(null);
    setPhotos([]);
    setLightbox(null);
  }

  async function openDetail(visit) {
    setSelected(visit);
    setDetail(null);
    setHiddenEdits({});
    setPhotos([]);
    setDL(true);
    setPhotosLoading(true);
    try {
      const [{ data: visitData }, { data: photoData }] = await Promise.all([
        api.get(`/visits/${visit.id}`),
        api.get(`/visits/${visit.id}/photos`),
      ]);
      setDetail(visitData);
      setPhotos(photoData);
      const edits = {};
      (visitData.custom_fields || []).filter(f => f.is_hidden).forEach(f => { edits[f.field_id] = f.value || ''; });
      setHiddenEdits(edits);
    } catch {
      toast.error('Failed to load detail');
      setSelected(null);
    } finally {
      setDL(false);
      setPhotosLoading(false);
    }
  }

  async function handlePhotoUpload(e) {
    const files = e.target.files;
    if (!files?.length || !detail) return;
    setUploadingPhotos(true);
    const form = new FormData();
    Array.from(files).forEach(f => form.append('photos', f));
    try {
      const { data } = await api.post(`/visits/${detail.id}/photos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhotos(prev => [...prev, ...data]);
      toast.success(`${data.length} photo${data.length > 1 ? 's' : ''} uploaded`);
    } catch { toast.error('Upload failed'); }
    finally { setUploadingPhotos(false); e.target.value = ''; }
  }

  async function deletePhoto(photoId) {
    if (!detail) return;
    try {
      await api.delete(`/visits/${detail.id}/photos/${photoId}`);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      setLightbox(null);
    } catch { toast.error('Delete failed'); }
  }

  async function startReassign(visit, e) {
    e?.stopPropagation();
    try {
      const { data } = await api.get('/visits/employees');
      setReassignList(data);
      setReassignEmpId(visit.employee_id ? String(visit.employee_id) : '');
      setReassignId(visit.id);
    } catch {
      toast.error('Failed to load associates');
    }
  }

  async function saveReassign(visitId) {
    if (!reassignEmpId) return toast.error('Please select an associate');
    setReassignSaving(true);
    try {
      const { data } = await api.put(`/visits/${visitId}/employee`, { employee_id: Number(reassignEmpId) });
      toast.success('Associate updated');
      setReassignId(null);
      setVisits(vs => vs.map(v => v.id !== visitId ? v : {
        ...v,
        employee_id: Number(reassignEmpId),
        employee_name: data.employee.name,
        designation: data.employee.designation,
      }));
      if (detail?.id === visitId) {
        setDetail(d => ({
          ...d,
          employee_id: Number(reassignEmpId),
          employee_name: data.employee.name,
          designation: data.employee.designation,
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update associate');
    } finally {
      setReassignSaving(false);
    }
  }

  async function saveHiddenFields() {
    if (!detail) return;
    setModalSaving(true);
    try {
      await api.put(`/visits/${detail.id}/field-values`, { field_values: hiddenEdits });
      toast.success('Saved');
      setSelected(null);
      setDetail(null);
      load();
    } catch {
      toast.error('Failed to save');
    } finally {
      setModalSaving(false);
    }
  }

  function fmt(dt) {
    return formatInTz(dt, companyTz);
  }

  function exportGrid() {
    const cols = [];
    if (showStd('ref_number'))    cols.push({ header: 'Ref #',        key: 'ref_number' });
    if (showStd('visitor_name'))  cols.push({ header: 'Visitor',      key: 'visitor_name' });
    if (showStd('mobile'))        cols.push({ header: 'Mobile',       key: 'mobile' });
    if (showStd('employee_name')) cols.push({ header: 'Associate',    key: 'employee_name' });
    if (showStd('service_name'))  cols.push({ header: 'Service',      key: 'service_name' });
    if (showStd('visit_time'))    cols.push({ header: 'Visit Time',   value: r => fmt(r.visit_time) });
    cols.push({ header: 'Status', key: 'status' });
    gridHiddenCols.forEach(c => cols.push({
      header: c.field_label,
      value: r => (r.hidden_fields || []).find(f => f.field_id === c.id)?.value ?? '',
    }));
    exportToExcel(`my-visits-${filterFrom}-${filterTo}`, 'My Visits', cols, filtered);
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">My Visits</h1>
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Live
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {filtered.length}{search.trim() ? ` of ${visits.length}` : ''} visits · refreshes every {POLL_INTERVAL / 1000}s
          </p>
        </div>
      </div>

      {/* Filters + Search + Column picker */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="search"
          placeholder="Search visitor, mobile, ref, associate…"
          className="input flex-1 min-w-[200px] max-w-xs"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-1">
          <input type="date" className="input w-36" value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)} />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" className="input w-36" value={filterTo}
            onChange={e => setFilterTo(e.target.value)} />
        </div>
        <select className="input w-full sm:w-36" value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
        {services.length > 1 && (
          <select className="input w-full sm:w-44" value={filterService}
            onChange={e => setFilterService(e.target.value)}>
            <option value="">All My Services</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>
        )}
        <button onClick={load} className="btn-secondary flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.13-3.87L20 7M4 17l1.87 1.87A9 9 0 0020 15" />
          </svg>
          Refresh
        </button>

        <button onClick={exportGrid} className="btn-secondary flex items-center gap-2">
          ⬇ Export
        </button>

        {/* Column picker */}
        <div className="relative ml-auto" ref={colPickerRef}>
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
                    checked={showStd(col.id)}
                    onChange={() => toggleStdCol(col.id)}
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{col.label}</span>
                </label>
              ))}
              {allHiddenFields.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mt-4 mb-2">🔒 Internal Fields</p>
                  {!filterService ? (
                    <p className="text-xs text-gray-400 italic py-1">Select a service filter to see its internal fields</p>
                  ) : scopedHiddenFields.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-1">No internal fields for this service</p>
                  ) : (
                    scopedHiddenFields.map(f => (
                      <label key={f.id} className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-amber-500"
                          checked={visibleHiddenCols?.has(f.id) ?? true}
                          onChange={() => toggleHiddenCol(f.id)}
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">{f.field_label}</span>
                      </label>
                    ))
                  )}
                </>
              )}
              <div className="border-t mt-3 pt-2 flex gap-3">
                <button className="text-xs text-primary-600 hover:underline"
                  onClick={() => {
                    const allStd = new Set(STANDARD_COLS.map(c => c.id));
                    const allHid = new Set(allHiddenFields.map(f => f.id));
                    setVisibleStdCols(allStd);
                    setVisibleHiddenCols(allHid);
                    localStorage.setItem(STD_COLS_KEY, JSON.stringify([...allStd]));
                    localStorage.setItem(HIDDEN_COLS_KEY, JSON.stringify([...allHid]));
                  }}>Show all</button>
                <button className="text-xs text-gray-400 hover:underline"
                  onClick={() => {
                    setVisibleStdCols(new Set());
                    setVisibleHiddenCols(new Set());
                    localStorage.setItem(STD_COLS_KEY, '[]');
                    localStorage.setItem(HIDDEN_COLS_KEY, '[]');
                  }}>Hide all</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : visits.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No visits found</p>
          <p className="text-sm mt-1">Visits for your assigned services will appear here</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          {/* Mobile card list */}
          <div className="sm:hidden divide-y divide-gray-100">
            {filtered.map(v => (
              <div key={v.id} className="p-4 hover:bg-gray-50 active:bg-gray-50 cursor-pointer"
                onClick={() => openDetail(v)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{v.visitor_name}</p>
                    <p className="text-sm text-gray-500">{v.mobile}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[v.status] || ''}`}>
                    {v.status}
                  </span>
                </div>
                {v.ref_number && <p className="text-xs text-gray-400 font-mono mt-1">{v.ref_number}</p>}
                <div className="mt-1.5 text-xs text-gray-500 space-y-0.5">
                  <p>{v.employee_name}{v.designation ? ` — ${v.designation}` : ''}</p>
                  <p>
                    {v.service_name || v.purpose || '—'} · {fmt(v.visit_time)}
                    {v.photo_count > 0 && <span className="ml-2 text-indigo-500">📷 {v.photo_count}</span>}
                  </p>
                </div>
                <div className="mt-3 flex gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
                  {v.status === 'pending' && (<>
                    <button onClick={e => updateStatus(v.id, 'approved', e)}
                      className="text-xs px-3 py-1 rounded-lg bg-green-100 text-green-700 font-medium">Approve</button>
                    <button onClick={e => updateStatus(v.id, 'rejected', e)}
                      className="text-xs px-3 py-1 rounded-lg bg-red-100 text-red-700 font-medium">Reject</button>
                  </>)}
                  {v.status === 'approved' && (
                    <button onClick={e => updateStatus(v.id, 'completed', e)}
                      className="text-xs px-3 py-1 rounded-lg bg-blue-100 text-blue-700 font-medium">Complete</button>
                  )}
                  {(v.status === 'pending' || v.status === 'approved') && (
                    <button onClick={e => startReassign(v, e)}
                      className="text-xs px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-medium">Reassign</button>
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
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {showStd('ref_number')    && <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Ref #</th>}
                  {showStd('visitor_name') && <th className="text-left px-4 py-3 font-semibold text-gray-600">Visitor</th>}
                  {showStd('mobile')       && <th className="text-left px-4 py-3 font-semibold text-gray-600">Mobile</th>}
                  {showStd('employee_name') && <th className="text-left px-4 py-3 font-semibold text-gray-600">Associate</th>}
                  {showStd('service_name') && <th className="text-left px-4 py-3 font-semibold text-gray-600">Service</th>}
                  {showStd('visit_time')   && <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Visit Time</th>}
                  <th className="px-4 py-3 font-semibold text-gray-600">Actions</th>
                  {gridHiddenCols.map(f => (
                    <th key={f.id}
                      className="text-left px-4 py-3 font-semibold text-amber-700 whitespace-nowrap bg-amber-50 border-l border-amber-100">
                      🔒 {f.field_label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => openDetail(v)}>
                    {showStd('ref_number')    && <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{v.ref_number || '—'}</td>}
                    {showStd('visitor_name') && <td className="px-4 py-3 font-medium text-gray-900">
                      {v.visitor_name}
                      {v.photo_count > 0 && <span className="ml-2 text-xs text-indigo-500 font-normal">📷 {v.photo_count}</span>}
                    </td>}
                    {showStd('mobile')       && <td className="px-4 py-3 text-gray-500">{v.mobile}</td>}
                    {showStd('employee_name') && (
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        {reassignId === v.id ? (
                          <div className="flex items-center gap-1.5">
                            <select autoFocus
                              className="input text-xs py-1 w-44 min-w-0"
                              value={reassignEmpId}
                              onChange={e => setReassignEmpId(e.target.value)}>
                              <option value="">Select…</option>
                              {reassignList.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.name}{emp.designation ? ` — ${emp.designation}` : ''}
                                </option>
                              ))}
                            </select>
                            <button onClick={() => saveReassign(v.id)} disabled={reassignSaving}
                              className="text-xs px-1.5 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 font-medium shrink-0">
                              {reassignSaving ? '…' : '✓'}
                            </button>
                            <button onClick={() => setReassignId(null)}
                              className="text-xs px-1.5 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 shrink-0">
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>{v.employee_name}{v.designation ? ` — ${v.designation}` : ''}</>
                        )}
                      </td>
                    )}
                    {showStd('service_name') && <td className="px-4 py-3 text-gray-500">{v.service_name || v.purpose || '—'}</td>}
                    {showStd('visit_time')   && <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(v.visit_time)}</td>}
                    <td className="px-3 py-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1">
                        {v.status === 'pending' && (
                          <>
                            <button onClick={e => updateStatus(v.id, 'approved', e)}
                              className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200">Approve</button>
                            <button onClick={e => updateStatus(v.id, 'rejected', e)}
                              className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 hover:bg-red-200">Reject</button>
                          </>
                        )}
                        {v.status === 'approved' && (
                          <button onClick={e => updateStatus(v.id, 'completed', e)}
                            className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">Complete</button>
                        )}
                        {(v.status === 'pending' || v.status === 'approved') && (
                          <button onClick={e => startReassign(v, e)}
                            className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                            Reassign
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Hidden field value cells — click opens detail popup for editing */}
                    {gridHiddenCols.map(col => {
                      const fv = (v.hidden_fields || []).find(f => f.field_id === col.id);
                      const currentVal = fv?.value ?? '';
                      return (
                        <td key={col.id}
                          className="px-3 py-2 bg-amber-50 border-l border-amber-100">
                          <span className={`text-xs block min-w-[60px] ${currentVal ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                            {currentVal || '—'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={99} className="px-6 py-8 text-center text-gray-400">
                      {search.trim() ? `No visits match "${search}"` : 'No visits found'}
                    </td>
                  </tr>
                )}
              </tbody>
              {/* Numeric summary row */}
              {filtered.length > 0 && gridHiddenCols.some(c => c.id in colSums) && (
                <tfoot>
                  <tr className="border-t-2 border-amber-300 bg-amber-50 text-xs font-semibold">
                    {showStd('ref_number')    && <td className="px-4 py-2 text-amber-700">Σ Total</td>}
                    {showStd('visitor_name') && <td className="px-4 py-2" />}
                    {showStd('mobile')       && <td className="px-4 py-2" />}
                    {showStd('employee_name') && <td className="px-4 py-2" />}
                    {showStd('service_name') && <td className="px-4 py-2" />}
                    {showStd('visit_time')   && <td className="px-4 py-2" />}
                    <td className="px-4 py-2" />
                    {gridHiddenCols.map(col => (
                      <td key={col.id} className="px-4 py-2 bg-amber-100 border-l border-amber-300 text-amber-900 font-bold text-right">
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
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeDetail}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Visit Detail</h2>
              <button onClick={closeDetail}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            {detailLoading || !detail ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="px-6 py-5 space-y-4 text-sm">
                {detail.ref_number && (
                  <div className="bg-indigo-50 rounded-xl px-4 py-3 text-center">
                    <p className="text-xs text-indigo-500 font-medium uppercase tracking-wider">Reference No.</p>
                    <p className="text-2xl font-mono font-bold text-indigo-700 mt-1">{detail.ref_number}</p>
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <span className="text-gray-500 w-28 shrink-0">Visitor</span>
                  <span className="text-gray-900 font-medium flex-1">{detail.visitor_name}</span>
                  {detail.visitor_id && (
                    <button onClick={() => setHistoryVisitorId(detail.visitor_id)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-medium whitespace-nowrap shrink-0">
                      View History →
                    </button>
                  )}
                </div>
                <Row label="Mobile"     value={detail.mobile} />
                {detail.visitor_email && <Row label="Email"   value={detail.visitor_email} />}
                {detail.address       && <Row label="Address" value={detail.address} />}
                <div className="flex gap-2">
                  <span className="text-gray-500 w-28 shrink-0">Associate</span>
                  <div className="flex-1">
                    {reassignId === detail.id ? (
                      <div className="flex flex-wrap gap-2 items-center">
                        <select className="input text-sm py-1 flex-1 min-w-[140px]"
                          value={reassignEmpId}
                          onChange={e => setReassignEmpId(e.target.value)}>
                          <option value="">Select associate…</option>
                          {reassignList.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name}{emp.designation ? ` — ${emp.designation}` : ''}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => saveReassign(detail.id)} disabled={reassignSaving}
                          className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium">
                          {reassignSaving ? '…' : 'Save'}
                        </button>
                        <button onClick={() => setReassignId(null)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 font-medium">
                          {detail.employee_name}{detail.designation ? ` — ${detail.designation}` : ''}
                        </span>
                        <button onClick={e => startReassign(detail, e)}
                          className="text-xs text-indigo-600 hover:underline font-medium shrink-0">
                          Change
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <Row label="Service"   value={detail.service_name || detail.purpose || '—'} />
                <Row label="Visit Time" value={fmt(detail.visit_time)} />
                <Row label="Status"
                  value={
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[detail.status] || ''}`}>
                      {detail.status}
                    </span>
                  }
                />
                {detail.notes && <Row label="Notes" value={detail.notes} />}

                {(detail.status === 'pending' || detail.status === 'approved') && (
                  <div className="flex gap-2 border-t pt-4">
                    {detail.status === 'pending' && (
                      <>
                        <button onClick={e => updateStatus(detail.id, 'approved', e)}
                          className="btn-primary flex-1 text-sm">Approve</button>
                        <button onClick={e => updateStatus(detail.id, 'rejected', e)}
                          className="flex-1 text-sm px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium transition-colors">Reject</button>
                      </>
                    )}
                    {detail.status === 'approved' && (
                      <button onClick={e => updateStatus(detail.id, 'completed', e)}
                        className="btn-primary flex-1 text-sm">Mark Completed</button>
                    )}
                  </div>
                )}

                {detail.custom_fields?.filter(f => !f.is_hidden).length > 0 && (
                  <div className="border-t pt-4">
                    <p className="font-semibold text-gray-700 mb-2">Additional Details</p>
                    {detail.custom_fields.filter(f => !f.is_hidden).map((f, i) => (
                      <Row key={i} label={f.field_label} value={f.value || '—'} />
                    ))}
                  </div>
                )}

                {detail.custom_fields?.filter(f => f.is_hidden).length > 0 && (
                  <div className="border-t pt-4">
                    <p className="font-semibold text-amber-700 mb-1">🔒 Internal Fields</p>
                    <p className="text-xs text-gray-400 mb-3">Only visible to staff.</p>
                    <div className="space-y-3">
                      {detail.custom_fields.filter(f => f.is_hidden).map(f => (
                        <div key={f.field_id}>
                          <label className="label text-xs">{f.field_label}</label>
                          {f.field_type === 'select' ? (
                            <select className="input text-sm"
                              value={hiddenEdits[f.field_id] ?? ''}
                              onChange={e => setHiddenEdits(h => ({ ...h, [f.field_id]: e.target.value }))}>
                              <option value="">Select…</option>
                              {(f.field_options || []).map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : f.field_type === 'textarea' ? (
                            <textarea className="input text-sm resize-none" rows={3}
                              value={hiddenEdits[f.field_id] ?? ''}
                              onChange={e => setHiddenEdits(h => ({ ...h, [f.field_id]: e.target.value }))}
                              placeholder={`Enter ${f.field_label.toLowerCase()}…`}
                            />
                          ) : (
                            <input className="input text-sm"
                              type={f.field_type === 'phone' ? 'tel' : f.field_type || 'text'}
                              value={hiddenEdits[f.field_id] ?? ''}
                              onChange={e => setHiddenEdits(h => ({ ...h, [f.field_id]: e.target.value }))}
                              placeholder={`Enter ${f.field_label.toLowerCase()}…`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <button onClick={saveHiddenFields} disabled={modalSaving}
                      className="btn-primary text-sm mt-3 w-full">
                      {modalSaving ? 'Saving…' : '💾 Save Internal Fields'}
                    </button>
                  </div>
                )}

                {/* Photos */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-gray-700">
                      📷 Photos{photos.length > 0 ? ` (${photos.length})` : ''}
                    </p>
                    <label className={`cursor-pointer text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${uploadingPhotos ? 'bg-gray-100 text-gray-400' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
                      {uploadingPhotos ? 'Uploading…' : '+ Add Photos'}
                      <input type="file" accept="image/*" multiple className="hidden"
                        onChange={handlePhotoUpload} disabled={uploadingPhotos} />
                    </label>
                  </div>
                  {photosLoading ? (
                    <p className="text-xs text-gray-400 py-2">Loading…</p>
                  ) : photos.length === 0 ? (
                    <p className="text-xs text-gray-300 italic">No photos yet</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map(p => (
                        <div key={p.id} className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square">
                          <img src={p.filename} alt={p.original_name}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setLightbox(p)} />
                          <button onClick={() => deletePhoto(p.id)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)}
              className="absolute -top-8 right-0 text-white text-2xl leading-none hover:text-gray-300">✕</button>
            <img src={lightbox.filename} alt={lightbox.original_name}
              className="w-full max-h-[80vh] object-contain rounded-xl" />
            {lightbox.uploaded_by_name && (
              <p className="text-center text-gray-300 text-sm mt-2">By {lightbox.uploaded_by_name}</p>
            )}
          </div>
        </div>
      )}

      {historyVisitorId && (
        <VisitorHistoryModal
          visitorId={historyVisitorId}
          onClose={() => setHistoryVisitorId(null)}
        />
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 w-28 shrink-0">{label}</span>
      <span className="text-gray-900 font-medium flex-1">{value}</span>
    </div>
  );
}
