import { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { exportToExcel, exportToCSV } from '../../utils/exportExcel';
import VisitorHistoryModal from '../../components/VisitorHistoryModal';

function fmtDate(d) {
  if (!d) return null;
  return new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function NextVisitBadge({ dateStr }) {
  if (!dateStr) return <span className="text-gray-300 text-xs">—</span>;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(String(dateStr).slice(0, 10) + 'T12:00:00'); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  let cls;
  if (diff < 0)       cls = 'bg-red-100 text-red-700';
  else if (diff <= 1) cls = 'bg-amber-100 text-amber-700';
  else if (diff <= 7) cls = 'bg-blue-100 text-blue-700';
  else                cls = 'bg-green-100 text-green-700';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      🔁 {fmtDate(dateStr)}
    </span>
  );
}

const PRESETS = [
  { label: '1 Wk',  days: 7 },
  { label: '2 Wks', days: 14 },
  { label: '3 Wks', days: 21 },
  { label: '1 Mo',  days: 30 },
  { label: '3 Mo',  days: 90 },
];

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function SetRevisitPanel({ visitor, onSave, onCancel, saving }) {
  const [custom, setCustom] = useState('');
  const inputRef = useRef();

  return (
    <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map(p => (
          <button
            key={p.days}
            onClick={() => !saving && onSave(addDays(p.days))}
            disabled={saving}
            className="text-xs px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50 whitespace-nowrap transition-colors">
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="date"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
          className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <button
          onClick={() => !saving && custom && onSave(custom)}
          disabled={saving || !custom}
          className="text-xs px-2 py-1 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors whitespace-nowrap">
          {saving ? '…' : 'Set'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-500 font-semibold hover:bg-gray-200 transition-colors">
          ✕
        </button>
      </div>
    </div>
  );
}

export default function Visitors() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [historyVisitorId, setHistoryVisitorId] = useState(null);
  const [sending, setSending] = useState({});
  const [settingRevisit, setSettingRevisit] = useState(null);
  const [savingRevisit, setSavingRevisit] = useState({});

  useEffect(() => {
    api.get('/visitors')
      .then(({ data }) => setVisitors(data))
      .finally(() => setLoading(false));
  }, []);

  async function sendReminder(e, visitor) {
    e.stopPropagation();
    setSending(s => ({ ...s, [visitor.id]: true }));
    try {
      await api.post(`/visitors/${visitor.id}/revisit-reminder`);
      toast.success(`Reminder sent to ${visitor.name}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reminder');
    } finally {
      setSending(s => ({ ...s, [visitor.id]: false }));
    }
  }

  async function saveRevisitDate(visitor, dateStr) {
    setSavingRevisit(s => ({ ...s, [visitor.id]: true }));
    try {
      await api.put(`/visitors/${visitor.id}/next-visit`, { next_visit_date: dateStr });
      setVisitors(vs => vs.map(v => v.id === visitor.id ? { ...v, next_visit_date: dateStr } : v));
      setSettingRevisit(null);
      toast.success(`Next visit set for ${visitor.name}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set date');
    } finally {
      setSavingRevisit(s => ({ ...s, [visitor.id]: false }));
    }
  }

  const filtered = visitors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.mobile.includes(search)
  );

  const revisitCount = visitors.filter(v => v.next_visit_date).length;

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visitors</h1>
          <p className="text-sm text-gray-500 mt-1">
            {visitors.length} registered visitors
            {revisitCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                🔁 {revisitCount} revisit{revisitCount !== 1 ? 's' : ''} pending
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            className="input w-full sm:w-64"
            placeholder="Search by name or mobile…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <button onClick={() => exportToCSV('visitors', [
            { header: 'Name',         key: 'name' },
            { header: 'Mobile',       key: 'mobile' },
            { header: 'Email',        key: 'email' },
            { header: 'Address',      key: 'address' },
            { header: 'Total Visits', key: 'total_visits' },
            { header: 'Next Visit',   value: v => v.next_visit_date ? fmtDate(v.next_visit_date) : '' },
            { header: 'First Seen',   value: v => v.created_at ? new Date(v.created_at).toLocaleDateString('en-IN') : '' },
          ], filtered)} className="btn-secondary whitespace-nowrap flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <>
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {filtered.map(v => (
              <div key={v.id} className="p-4 hover:bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors"
                onClick={() => settingRevisit !== v.id && setHistoryVisitorId(v.id)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{v.name}</p>
                    <p className="text-sm text-gray-500">{v.mobile}</p>
                    {v.email && <p className="text-xs text-gray-400">{v.email}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      {v.total_visits} visit{v.total_visits !== 1 ? 's' : ''}
                    </span>
                    <span className="text-gray-400 text-sm">›</span>
                  </div>
                </div>

                {settingRevisit === v.id ? (
                  <div className="mt-2" onClick={e => e.stopPropagation()}>
                    <SetRevisitPanel
                      visitor={v}
                      saving={!!savingRevisit[v.id]}
                      onSave={dateStr => saveRevisitDate(v, dateStr)}
                      onCancel={() => setSettingRevisit(null)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
                    {v.next_visit_date ? (
                      <>
                        <NextVisitBadge dateStr={v.next_visit_date} />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); setSettingRevisit(v.id); }}
                            className="text-xs px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 font-semibold border border-indigo-200">
                            ✏️ Change
                          </button>
                          <button
                            onClick={e => sendReminder(e, v)}
                            disabled={!!sending[v.id]}
                            className="text-xs px-2.5 py-1 rounded-lg bg-green-50 text-green-700 font-semibold border border-green-200 disabled:opacity-50">
                            {sending[v.id] ? '…' : '📲 Remind'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); setSettingRevisit(v.id); }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 font-semibold border border-indigo-200 hover:bg-indigo-100">
                        📅 Set Revisit
                      </button>
                    )}
                  </div>
                )}

                {v.address && <p className="text-xs text-gray-400 mt-1 truncate">{v.address}</p>}
                <p className="text-xs text-gray-400 mt-0.5">
                  Since {new Date(v.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                </p>
              </div>
            ))}
            {!filtered.length && <p className="px-6 py-8 text-center text-gray-400">No visitors found</p>}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-36">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-32 whitespace-nowrap">Mobile</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-44">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Address</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-20 whitespace-nowrap">Visits</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-56 whitespace-nowrap">Next Visit</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-28 whitespace-nowrap">First Seen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => settingRevisit !== v.id && setHistoryVisitorId(v.id)}>
                  <td className="px-4 py-3 font-medium text-gray-900 truncate">{v.name}</td>
                  <td className="px-4 py-3 text-gray-700 truncate">{v.mobile}</td>
                  <td className="px-4 py-3 text-gray-500 truncate">{v.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 truncate">{v.address || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                      {v.total_visits} visit{v.total_visits !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top" onClick={e => e.stopPropagation()}>
                    {settingRevisit === v.id ? (
                      <SetRevisitPanel
                        visitor={v}
                        saving={!!savingRevisit[v.id]}
                        onSave={dateStr => saveRevisitDate(v, dateStr)}
                        onCancel={() => setSettingRevisit(null)}
                      />
                    ) : v.next_visit_date ? (
                      <div className="flex flex-col gap-1.5">
                        <NextVisitBadge dateStr={v.next_visit_date} />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSettingRevisit(v.id)}
                            className="text-xs px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 font-semibold border border-indigo-200 hover:bg-indigo-100 transition-colors">
                            ✏️ Change
                          </button>
                          <button
                            onClick={e => sendReminder(e, v)}
                            disabled={!!sending[v.id]}
                            className="text-xs px-2 py-0.5 rounded-lg bg-green-50 text-green-700 font-semibold border border-green-200 hover:bg-green-100 disabled:opacity-50 transition-colors whitespace-nowrap">
                            {sending[v.id] ? '…' : '📲 Remind'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSettingRevisit(v.id)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 font-semibold border border-indigo-200 hover:bg-indigo-100 transition-colors whitespace-nowrap">
                        📅 Set Revisit
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {new Date(v.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No visitors found</td></tr>
              )}
            </tbody>
          </table>
          </div>
          </>
        )}
      </div>

      {historyVisitorId && (
        <VisitorHistoryModal
          visitorId={historyVisitorId}
          onClose={() => setHistoryVisitorId(null)}
          onRevisitUpdated={(vid, dateStr) =>
            setVisitors(vs => vs.map(v => v.id === vid ? { ...v, next_visit_date: dateStr } : v))
          }
        />
      )}
    </div>
  );
}
