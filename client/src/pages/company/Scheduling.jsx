import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_STYLE = {
  pending:    'bg-yellow-100 text-yellow-700',
  confirmed:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
  no_show:    'bg-gray-100 text-gray-500',
  checked_in: 'bg-blue-100 text-blue-700',
};
const STATUS_LABEL = {
  pending:    'Pending',
  confirmed:  'Confirmed',
  cancelled:  'Cancelled',
  no_show:    'No Show',
  checked_in: 'Checked In',
};

function fmt12(t) {
  if (!t) return '';
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function fmtDate(d) {
  if (!d) return '';
  // Handles both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss.sssZ" (mysql2 DATE serialization)
  const dateStr = String(d).slice(0, 10);
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Booking detail modal ──────────────────────────────────────────────────────
function BookingModal({ booking, onClose, onUpdate }) {
  const [status, setStatus]   = useState(booking.status);
  const [notes, setNotes]     = useState(booking.admin_notes || '');
  const [saving, setSaving]   = useState(false);

  async function save() {
    if (status === booking.status && notes === (booking.admin_notes || '')) { onClose(); return; }
    setSaving(true);
    try {
      await api.put(`/scheduling/bookings/${booking.id}`, { status, admin_notes: notes });
      toast.success('Booking updated');
      onUpdate();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 pt-5 pb-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Booking Detail</h2>
            <p className="text-xs font-mono text-indigo-600 mt-0.5">{booking.booking_ref}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Visitor info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
            <p><span className="text-gray-400 w-24 inline-block">Visitor</span><span className="font-semibold text-gray-900">{booking.visitor_name}</span></p>
            <p><span className="text-gray-400 w-24 inline-block">Mobile</span>{booking.visitor_mobile}</p>
            {booking.visitor_email && <p><span className="text-gray-400 w-24 inline-block">Email</span>{booking.visitor_email}</p>}
            <p><span className="text-gray-400 w-24 inline-block">Date</span>{fmtDate(booking.scheduled_date)}</p>
            <p><span className="text-gray-400 w-24 inline-block">Time</span>{fmt12(booking.scheduled_time)}</p>
            {booking.service_name && <p><span className="text-gray-400 w-24 inline-block">Service</span>{booking.service_name}</p>}
            {booking.employee_name && <p><span className="text-gray-400 w-24 inline-block">Associate</span>{booking.employee_name}{booking.designation ? ` — ${booking.designation}` : ''}</p>}
            {booking.purpose && <p><span className="text-gray-400 w-24 inline-block">Purpose</span>{booking.purpose}</p>}
          </div>

          {/* Custom fields filled by visitor */}
          {Array.isArray(booking.custom_fields) && booking.custom_fields.length > 0 && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 text-sm space-y-1.5">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">Visitor Responses</p>
              {booking.custom_fields.map((item, i) => (
                <p key={i}>
                  <span className="text-gray-400 w-28 inline-block shrink-0">{item.label}</span>
                  <span className="font-medium text-gray-900">{item.value}</span>
                </p>
              ))}
            </div>
          )}

          {/* Status update */}
          <div>
            <label className="label">Update Status</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {['confirmed', 'cancelled', 'no_show'].map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    status === s ? 'border-transparent text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                  style={status === s ? {
                    background: s === 'confirmed' ? '#16a34a' : s === 'cancelled' ? '#dc2626' : '#6b7280'
                  } : {}}>
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Note to Visitor <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea className="input resize-none" rows={2}
              placeholder="e.g. Bring your ID card. Parking available at Gate 2."
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Availability editor ───────────────────────────────────────────────────────
function AvailabilityTab() {
  const [employees, setEmployees]     = useState([]);
  const [selEmp, setSelEmp]           = useState(null);
  const [slotDuration, setDuration]   = useState(30);
  const [windows, setWindows]         = useState([]); // [{ day_of_week, start_time, end_time }]
  const [saving, setSaving]           = useState(false);
  const [loading, setLoading]         = useState(true);
  const [switching, setSwitching]     = useState(false);

  useEffect(() => {
    // Load employees and availability independently so employees still show if availability API fails
    api.get('/employees')
      .then(({ data }) => {
        const active = data.filter(e => e.status === 'active');
        setEmployees(active);
        if (!active.length) { setLoading(false); return; }
        // Now load availability and pre-select first employee
        api.get('/scheduling/availability')
          .then(({ data: avData }) => { loadEmployee(active[0], avData); })
          .catch(() => { setSelEmp(active[0]); setWindows([]); setDuration(30); })
          .finally(() => setLoading(false));
      })
      .catch(() => { toast.error('Failed to load associates'); setLoading(false); });
  }, []);

  function loadEmployee(emp, avData) {
    setSelEmp(emp);
    const rows = avData.filter(r => Number(r.employee_id) === Number(emp.id));
    if (rows.length) {
      setDuration(rows[0].slot_duration || 30);
      setWindows(rows.map(r => ({ day_of_week: Number(r.day_of_week), start_time: r.start_time.slice(0,5), end_time: r.end_time.slice(0,5) })));
    } else {
      setDuration(30);
      setWindows([]);
    }
  }

  async function switchEmployee(emp) {
    setSwitching(true);
    try {
      const { data } = await api.get('/scheduling/availability');
      loadEmployee(emp, data);
    } catch {
      setSelEmp(emp);
      setWindows([]);
      setDuration(30);
    } finally { setSwitching(false); }
  }

  function toggleDay(day) {
    setWindows(ws => {
      const exists = ws.find(w => w.day_of_week === day);
      if (exists) return ws.filter(w => w.day_of_week !== day);
      return [...ws, { day_of_week: day, start_time: '09:00', end_time: '17:00' }];
    });
  }

  function updateWindow(globalIdx, field, val) {
    setWindows(ws => ws.map((w, i) => i === globalIdx ? { ...w, [field]: val } : w));
  }

  function addWindow(day) {
    setWindows(ws => [...ws, { day_of_week: day, start_time: '09:00', end_time: '13:00' }]);
  }

  function removeWindow(globalIdx) {
    setWindows(ws => ws.filter((_, i) => i !== globalIdx));
  }

  async function save() {
    if (!selEmp) return;
    setSaving(true);
    try {
      await api.put('/scheduling/availability', { employee_id: selEmp.id, slot_duration: slotDuration, windows });
      toast.success('Availability saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  }

  if (loading) return <div className="py-12 text-center text-gray-400">Loading…</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Associate list */}
      <div className="lg:col-span-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Associates</p>
        <div className="space-y-1">
          {employees.map(e => (
            <button key={e.id} onClick={() => !switching && switchEmployee(e)}
              disabled={switching}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                selEmp?.id === e.id
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              } ${switching ? 'opacity-60 cursor-wait' : ''}`}>
              <p className="font-medium truncate flex items-center gap-1.5">
                {e.name}
                {switching && selEmp?.id === e.id && (
                  <span className="inline-block w-3 h-3 border-2 border-white/60 border-t-transparent rounded-full animate-spin shrink-0" />
                )}
              </p>
              {e.designation && <p className={`text-xs truncate ${selEmp?.id === e.id ? 'text-indigo-200' : 'text-gray-400'}`}>{e.designation}</p>}
            </button>
          ))}
        </div>
      </div>

      {/* Availability editor */}
      <div className="lg:col-span-3">
        {!selEmp ? (
          <p className="text-gray-400 text-sm">Select an associate to set their availability.</p>
        ) : (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-gray-900 text-base">{selEmp.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selEmp.designation || 'Associate'}</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 font-medium">Slot duration</label>
                <select className="input py-1.5 text-sm w-28" value={slotDuration}
                  onChange={e => setDuration(Number(e.target.value))}>
                  {[15,20,30,45,60].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
            </div>

            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Working Days & Hours</p>
            <div className="space-y-3">
              {[1,2,3,4,5,6,0].map(day => {
                const dayWins = windows.reduce((acc, w, gi) => {
                  if (w.day_of_week === day) acc.push({ ...w, gi });
                  return acc;
                }, []);
                const active = dayWins.length > 0;
                return (
                  <div key={day} className={`p-3 rounded-xl border transition-all ${active ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button onClick={() => toggleDay(day)}
                        className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${active ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 bg-white'}`}>
                        {active && <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                      </button>
                      <span className={`w-10 text-sm font-semibold shrink-0 mt-1 ${active ? 'text-indigo-700' : 'text-gray-400'}`}>{DAYS_SHORT[day]}</span>

                      {active ? (
                        <div className="flex-1 space-y-2">
                          {dayWins.map(({ gi, start_time, end_time }, localIdx) => (
                            <div key={gi} className="flex items-center gap-2 flex-wrap">
                              <input type="time" value={start_time}
                                onChange={e => updateWindow(gi, 'start_time', e.target.value)}
                                className="border border-indigo-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
                              <span className="text-gray-400 text-sm">to</span>
                              <input type="time" value={end_time}
                                onChange={e => updateWindow(gi, 'end_time', e.target.value)}
                                className="border border-indigo-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
                              {localIdx > 0 && (
                                <button onClick={() => removeWindow(gi)}
                                  className="text-gray-400 hover:text-red-500 text-lg leading-none px-1 transition-colors" title="Remove">×</button>
                              )}
                            </div>
                          ))}
                          <button onClick={() => addWindow(day)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors">
                            + Add slot
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 flex-1 mt-1">Not available</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={save} disabled={saving} className="btn-primary px-8">
                {saving ? 'Saving…' : 'Save Availability'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bookings tab ──────────────────────────────────────────────────────────────
function BookingsTab({ slug }) {
  const [bookings, setBookings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('pending');
  const [selected, setSelected]   = useState(null);

  async function load() {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const { data } = await api.get(`/scheduling/bookings${params}`);
      setBookings(data);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filter]);

  const FILTERS = ['pending', 'confirmed', 'cancelled', 'no_show', 'all'];

  return (
    <div>
      {/* Booking link */}
      {slug && (
        <div className="mb-4 flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
          <span className="text-xs text-indigo-600 font-medium">Public Booking URL:</span>
          <code className="text-xs text-indigo-800 font-mono flex-1 truncate">
            {window.location.origin}/book/{slug}
          </code>
          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/book/${slug}`); toast.success('Copied!'); }}
            className="text-xs px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shrink-0">
            Copy
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
              filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {f === 'no_show' ? 'No Show' : f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-gray-400">Loading…</div>
        ) : bookings.length === 0 ? (
          <div className="py-10 text-center text-gray-400">No bookings found.</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y">
              {bookings.map(b => (
                <div key={b.id} className="p-4" onClick={() => setSelected(b)}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{b.visitor_name}</p>
                      <p className="text-xs text-gray-500">{b.visitor_mobile}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_STYLE[b.status]}`}>
                      {STATUS_LABEL[b.status]}
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs text-gray-500 space-y-0.5">
                    <p>📅 {fmtDate(b.scheduled_date)} · {fmt12(b.scheduled_time)}</p>
                    {b.service_name && <p>📋 {b.service_name}</p>}
                    {b.employee_name && <p>👤 {b.employee_name}</p>}
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Ref', 'Visitor', 'Date & Time', 'Service', 'Associate', 'Status', 'Action'].map(h => (
                      <th key={h} className="px-5 py-3 text-left font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 font-mono text-xs text-indigo-600 font-semibold">{b.booking_ref}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{b.visitor_name}</p>
                        <p className="text-xs text-gray-400">{b.visitor_mobile}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium">{fmtDate(b.scheduled_date)}</p>
                        <p className="text-xs text-gray-400">{fmt12(b.scheduled_time)}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{b.service_name || '—'}</td>
                      <td className="px-5 py-3 text-gray-600">{b.employee_name || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[b.status]}`}>
                          {STATUS_LABEL[b.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => setSelected(b)}
                          className="text-xs px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium">
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {selected && (
        <BookingModal booking={selected} onClose={() => setSelected(null)} onUpdate={load} />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Scheduling() {
  const [tab, setTab] = useState('bookings');
  const [slug, setSlug] = useState('');

  useEffect(() => {
    api.get('/companies/me/profile').then(({ data }) => setSlug(data.slug)).catch(() => {});
  }, []);

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Scheduling</h1>
        <p className="text-sm text-gray-500 mt-1">Manage advance visit bookings and associate availability</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {[['bookings', '📅 Bookings'], ['availability', '🕐 Availability']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'bookings'     && <BookingsTab slug={slug} />}
      {tab === 'availability' && <AvailabilityTab />}
    </div>
  );
}
