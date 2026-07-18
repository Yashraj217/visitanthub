import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import VisitorHistoryModal from '../../components/VisitorHistoryModal';

const WA_ICON = (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

function fmtDate(d) {
  if (!d) return '—';
  return new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtReminded(dt) {
  if (!dt) return null;
  const d = new Date(dt);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function daysDiff(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(String(dateStr).slice(0, 10) + 'T12:00:00'); d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function DateBadge({ dateStr }) {
  const diff = daysDiff(dateStr);
  let cls, label;
  if (diff < 0)       { cls = 'bg-red-100 text-red-700';    label = `${Math.abs(diff)}d overdue`; }
  else if (diff === 0){ cls = 'bg-amber-100 text-amber-700'; label = 'Today'; }
  else if (diff === 1){ cls = 'bg-amber-100 text-amber-700'; label = 'Tomorrow'; }
  else if (diff <= 7) { cls = 'bg-blue-100 text-blue-700';  label = `In ${diff}d`; }
  else                { cls = 'bg-green-100 text-green-700'; label = `In ${diff}d`; }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {fmtDate(dateStr)}
      <span className="opacity-70">· {label}</span>
    </span>
  );
}

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'overdue',  label: 'Overdue' },
  { key: 'today',    label: 'Today' },
  { key: 'week',     label: 'This week' },
  { key: 'upcoming', label: 'Upcoming' },
];

function applyFilter(rows, filter) {
  return rows.filter(r => {
    const diff = daysDiff(r.next_visit_date);
    if (filter === 'overdue')  return diff < 0;
    if (filter === 'today')    return diff === 0;
    if (filter === 'week')     return diff >= 0 && diff <= 7;
    if (filter === 'upcoming') return diff > 7;
    return true;
  });
}

export default function Revisits() {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');
  const [search,  setSearch]  = useState('');
  const [sending, setSending] = useState({});
  const [lastReminded, setLastReminded] = useState({}); // visitor_id → ISO string
  const [historyId, setHistoryId] = useState(null);

  // bulk selection
  const [selected, setSelected] = useState(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null); // { done, total }

  useEffect(() => {
    api.get('/visits/revisits')
      .then(({ data }) => {
        setRows(data);
        const init = {};
        data.forEach(r => { if (r.last_reminded_at) init[r.visitor_id] = r.last_reminded_at; });
        setLastReminded(init);
      })
      .catch(() => toast.error('Failed to load revisits'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = applyFilter(rows, filter).filter(r =>
    !search || r.visitor_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.mobile?.includes(search)
  );

  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(r.visitor_id));
  const someSelected = filtered.some(r => selected.has(r.visitor_id));
  const selectedCount = filtered.filter(r => selected.has(r.visitor_id)).length;

  function toggleAll() {
    if (allSelected) {
      setSelected(s => { const n = new Set(s); filtered.forEach(r => n.delete(r.visitor_id)); return n; });
    } else {
      setSelected(s => { const n = new Set(s); filtered.forEach(r => n.add(r.visitor_id)); return n; });
    }
  }

  function toggleRow(id) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function sendReminder(row) {
    setSending(s => ({ ...s, [row.visitor_id]: true }));
    try {
      const { data } = await api.post(`/visitors/${row.visitor_id}/revisit-reminder`);
      setLastReminded(s => ({ ...s, [row.visitor_id]: data.last_reminded_at || new Date().toISOString() }));
      toast.success(`Reminder sent to ${row.visitor_name}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reminder');
    } finally {
      setSending(s => ({ ...s, [row.visitor_id]: false }));
    }
  }

  async function sendBulkReminders() {
    const targets = filtered.filter(r => selected.has(r.visitor_id));
    if (!targets.length) return;
    setBulkSending(true);
    setBulkProgress({ done: 0, total: targets.length });
    let ok = 0, fail = 0;
    for (const row of targets) {
      try {
        const { data } = await api.post(`/visitors/${row.visitor_id}/revisit-reminder`);
        setLastReminded(s => ({ ...s, [row.visitor_id]: data.last_reminded_at || new Date().toISOString() }));
        ok++;
      } catch {
        fail++;
      }
      setBulkProgress({ done: ok + fail, total: targets.length });
    }
    setBulkSending(false);
    setBulkProgress(null);
    setSelected(new Set());
    if (fail === 0) toast.success(`Reminders sent to ${ok} visitor${ok !== 1 ? 's' : ''}`);
    else toast.success(`Sent ${ok}, failed ${fail}`);
  }

  const counts = {
    all:      rows.length,
    overdue:  rows.filter(r => daysDiff(r.next_visit_date) < 0).length,
    today:    rows.filter(r => daysDiff(r.next_visit_date) === 0).length,
    week:     rows.filter(r => { const d = daysDiff(r.next_visit_date); return d >= 0 && d <= 7; }).length,
    upcoming: rows.filter(r => daysDiff(r.next_visit_date) > 7).length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revisits</h1>
          <p className="text-gray-500 mt-1">Visitors with a scheduled next visit — send WhatsApp reminders</p>
        </div>
        {!loading && rows.length > 0 && (
          <div className="flex gap-3">
            <div className="text-center px-4 py-2 rounded-xl bg-violet-50 border border-violet-200">
              <p className="text-2xl font-extrabold text-violet-700">{rows.length}</p>
              <p className="text-xs text-violet-500 font-medium">Total pending</p>
            </div>
            {counts.overdue > 0 && (
              <div className="text-center px-4 py-2 rounded-xl bg-red-50 border border-red-200">
                <p className="text-2xl font-extrabold text-red-600">{counts.overdue}</p>
                <p className="text-xs text-red-500 font-medium">Overdue</p>
              </div>
            )}
            {counts.today > 0 && (
              <div className="text-center px-4 py-2 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-2xl font-extrabold text-amber-600">{counts.today}</p>
                <p className="text-xs text-amber-500 font-medium">Due today</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {FILTERS.map(f => (
            <button key={f.key}
              onClick={() => { setFilter(f.key); setSelected(new Set()); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {f.label}
              {counts[f.key] > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  f.key === 'overdue' && counts[f.key] > 0
                    ? 'bg-red-100 text-red-700'
                    : 'bg-indigo-100 text-indigo-700'
                }`}>{counts[f.key]}</span>
              )}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by name or mobile…"
          value={search}
          onChange={e => { setSearch(e.target.value); setSelected(new Set()); }}
          className="input flex-1 min-w-48"
        />
      </div>

      {/* Bulk action bar — appears when rows are selected */}
      {someSelected && (
        <div className="flex items-center gap-3 mb-3 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200">
          <span className="text-sm font-semibold text-indigo-700">
            {selectedCount} visitor{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={sendBulkReminders}
            disabled={bulkSending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm">
            {bulkSending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Sending {bulkProgress?.done}/{bulkProgress?.total}…
              </>
            ) : (
              <>{WA_ICON} Send Reminder to {selectedCount}</>
            )}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            disabled={bulkSending}
            className="text-sm text-indigo-500 hover:text-indigo-700 font-medium disabled:opacity-50">
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-3xl mb-3">📅</p>
            <p className="text-gray-500 font-medium">No revisits found</p>
            <p className="text-gray-400 text-sm mt-1">
              {filter !== 'all' ? 'Try a different filter' : 'Set a next visit date from the Visits page to see entries here'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleAll}
                    disabled={bulkSending}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 cursor-pointer"
                  />
                </th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Visitor</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Next Visit</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Service</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Associate</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Last Visit</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => {
                const isSelected = selected.has(r.visitor_id);
                return (
                  <tr key={r.visitor_id}
                    className={`transition-colors ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(r.visitor_id)}
                        disabled={bulkSending}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => setHistoryId(r.visitor_id)} className="text-left group">
                        <p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{r.visitor_name}</p>
                        <p className="text-xs text-gray-400">{r.mobile}</p>
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <DateBadge dateStr={r.next_visit_date} />
                    </td>
                    <td className="px-5 py-4 text-gray-600">{r.service_name || '—'}</td>
                    <td className="px-5 py-4 text-gray-600">
                      {r.employee_name
                        ? <>{r.employee_name}{r.designation ? <span className="text-gray-400 text-xs"> — {r.designation}</span> : null}</>
                        : '—'}
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs">{fmtDate(r.last_visit_time)}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => sendReminder(r)}
                          disabled={!!sending[r.visitor_id] || bulkSending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                          {sending[r.visitor_id] ? '…' : <>{WA_ICON} {lastReminded[r.visitor_id] ? 'Resend' : 'Remind'}</>}
                        </button>
                        {lastReminded[r.visitor_id] && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            ✓ Sent {fmtReminded(lastReminded[r.visitor_id])}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {historyId && <VisitorHistoryModal visitorId={historyId} onClose={() => setHistoryId(null)} />}
    </div>
  );
}
