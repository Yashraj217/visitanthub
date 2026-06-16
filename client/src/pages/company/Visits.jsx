import { useEffect, useState, useRef, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import BadgeModal from '../../components/BadgeModal';
import { useAuth } from '../../context/AuthContext';
import { exportToExcel } from '../../utils/exportExcel';
import { formatInTz } from '../../utils/tz';

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
  const [badgeVisit, setBadgeVisit] = useState(null);
  const [filters, setFilters] = useState({ status: '', date: '' });
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editEmp, setEditEmp] = useState(false);
  const [empList, setEmpList] = useState([]);
  const [newEmpId, setNewEmpId] = useState('');
  const [savingEmp, setSavingEmp] = useState(false);

  const [hiddenFields, setHiddenFields] = useState([]);

  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [visibleCols, setVisibleCols]           = useState(loadCols);
  const [visibleHiddenCols, setVisibleHiddenCols] = useState(null);
  const colPickerRef = useRef(null);

  const [search, setSearch] = useState('');

  useEffect(() => {
    function handler(e) {
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

  function closeDetail() {
    setSelected(null);
    setEditEmp(false);
    setEmpList([]);
    setNewEmpId('');
  }

  async function openDetail(v) {
    setSelected(v);
    setEditEmp(false);
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/visits/${v.id}`);
      setSelected(data);
    } catch { /* use row data */ }
    finally { setDetailLoading(false); }
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

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.date)   params.set('date', filters.date);
    const { data } = await api.get(`/visits?${params}`);
    setVisits(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filters]);

  async function updateStatus(id, status) {
    try {
      await api.put(`/visits/${id}/status`, { status });
      toast.success('Status updated');
      load();
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
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length}{search.trim() ? ` of ${visits.length}` : ''} records
          </p>
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
        <select className="input w-40" value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Status</option>
          {['pending','approved','rejected','completed'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
        <input
          type="date" className="input w-44"
          value={filters.date}
          onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
        />
        {(filters.status || filters.date) && (
          <button onClick={() => setFilters({ status:'', date:'' })} className="btn-secondary text-sm">Clear</button>
        )}

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
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <>
          {/* Mobile card list */}
          <div className="sm:hidden divide-y divide-gray-100">
            {filtered.map(v => (
              <div key={v.id} className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => openDetail(v)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{v.visitor_name}</p>
                    <p className="text-sm text-gray-500">{v.mobile}</p>
                  </div>
                  <span className={`shrink-0 badge-${v.status}`}>{v.status}</span>
                </div>
                {v.ref_number && <p className="text-xs text-gray-400 font-mono mt-1">{v.ref_number}</p>}
                <div className="mt-1.5 text-xs text-gray-500 space-y-0.5">
                  <p>{v.employee_name}{v.designation ? ` — ${v.designation}` : ''}</p>
                  <p>{v.service_name || '—'} · {new Date(v.visit_time).toLocaleString('en-IN', { hour12:true, day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</p>
                </div>
                <div className="mt-3 flex gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
                  {v.status === 'pending' && (<>
                    <button onClick={() => updateStatus(v.id,'approved')} className="text-xs px-3 py-1 rounded-lg bg-green-100 text-green-700 font-medium">Approve</button>
                    <button onClick={() => updateStatus(v.id,'rejected')} className="text-xs px-3 py-1 rounded-lg bg-red-100 text-red-700 font-medium">Reject</button>
                  </>)}
                  {v.status === 'approved' && (
                    <button onClick={() => updateStatus(v.id,'completed')} className="text-xs px-3 py-1 rounded-lg bg-blue-100 text-blue-700 font-medium">Complete</button>
                  )}
                  <button onClick={e => { e.stopPropagation(); setBadgeVisit(v); }}
                    className="text-xs px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-medium">🖨 Badge</button>
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
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Actions</th>
                  {gridHiddenCols.map(f => (
                    <th key={f.id} className="px-5 py-3 text-left font-medium text-amber-700 whitespace-nowrap bg-amber-50 border-l border-amber-100">
                      🔒 {f.field_label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => openDetail(v)}>
                    {show('ref_number')    && <td className="px-5 py-3 font-mono text-xs text-primary-600 font-semibold whitespace-nowrap">{v.ref_number || '—'}</td>}
                    {show('visitor_name') && <td className="px-5 py-3 font-medium">{v.visitor_name}</td>}
                    {show('mobile')       && <td className="px-5 py-3 text-gray-500">{v.mobile}</td>}
                    {show('employee_name') && <td className="px-5 py-3">{v.employee_name}{v.designation ? ` — ${v.designation}` : ''}</td>}
                    {show('service_name') && <td className="px-5 py-3 text-gray-500">{v.service_name || '—'}</td>}
                    {show('visit_time')   && <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(v.visit_time).toLocaleString('en-IN', { hour12:true, day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </td>}
                    <td className="px-5 py-3 flex gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
                      {v.status === 'pending' && <>
                        <button onClick={() => updateStatus(v.id,'approved')} className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200">Approve</button>
                        <button onClick={() => updateStatus(v.id,'rejected')} className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 hover:bg-red-200">Reject</button>
                      </>}
                      {v.status === 'approved' && (
                        <button onClick={() => updateStatus(v.id,'completed')} className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">Complete</button>
                      )}
                      <button onClick={() => setBadgeVisit(v)} className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center gap-1">
                        🖨 Badge
                      </button>
                    </td>
                    {gridHiddenCols.map(col => {
                      const fv = (v.hidden_fields || []).find(f => f.field_id === col.id);
                      return (
                        <td key={col.id} className="px-5 py-3 bg-amber-50 border-l border-amber-100 text-xs">
                          {fv?.value
                            ? <span className="text-gray-800">{fv.value}</span>
                            : <span className="text-gray-300 italic">—</span>
                          }
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
                      <td key={col.id} className="px-5 py-2 bg-amber-100 border-l border-amber-300 text-amber-900 font-bold text-right">
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

      {/* Badge print modal */}
      {badgeVisit && (
        <BadgeModal
          visit={badgeVisit}
          companyName={user?.company_name || ''}
          onClose={() => setBadgeVisit(null)}
        />
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
                  {[
                    ['Ref #',      selected.ref_number || '—'],
                    ['Visitor',    selected.visitor_name],
                    ['Mobile',     selected.mobile],
                    ['Email',      selected.visitor_email || '—'],
                    ['Address',    selected.address || '—'],
                    ['Service',    selected.service_name || '—'],
                    ['Visit Time', new Date(selected.visit_time).toLocaleString('en-IN')],
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

                <div className="flex gap-2 mt-6 flex-wrap">
                  {selected.status === 'pending' && <>
                    <button onClick={() => updateStatus(selected.id,'approved')} className="btn-primary flex-1">Approve</button>
                    <button onClick={() => updateStatus(selected.id,'rejected')}
                      className="flex-1 px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium transition-colors">Reject</button>
                  </>}
                  {selected.status === 'approved' && (
                    <button onClick={() => updateStatus(selected.id,'completed')} className="btn-primary flex-1">Mark Completed</button>
                  )}
                  <button onClick={() => setBadgeVisit(selected)}
                    className="flex-1 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium transition-colors flex items-center justify-center gap-1.5">
                    🖨 Print Badge
                  </button>
                  <button onClick={closeDetail} className="btn-secondary flex-1">Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
