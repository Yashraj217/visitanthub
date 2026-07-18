import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending:   'bg-yellow-100 text-yellow-700',
  approved:  'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  rejected:  'bg-red-100 text-red-700',
};
const STATUS_LABELS = { approved: 'In Progress', completed: 'Done', rejected: 'No Show' };

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}
function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function DL({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-28 font-medium text-gray-500 shrink-0">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  );
}

function VisitDetailPanel({ visitId, onBack, onRevisitSet }) {
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [photos, setPhotos]   = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [showRevisit, setShowRevisit] = useState(false);
  const [savingRevisit, setSavingRevisit] = useState(false);
  const [customDate, setCustomDate] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/visits/${visitId}`),
      api.get(`/visits/${visitId}/photos`),
    ])
      .then(([{ data: d }, { data: p }]) => { setDetail(d); setPhotos(p); })
      .catch(() => setError('Failed to load visit detail.'))
      .finally(() => setLoading(false));
  }, [visitId]);

  async function saveRevisitDate(dateStr) {
    setSavingRevisit(true);
    try {
      await api.put(`/visits/${visitId}/next-visit`, { next_visit_date: dateStr });
      setDetail(d => ({ ...d, next_visit_date: dateStr }));
      setShowRevisit(false);
      setCustomDate('');
      toast.success('Next visit date saved');
      if (onRevisitSet) onRevisitSet(dateStr);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save date');
    } finally { setSavingRevisit(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          ← Back to History
        </button>
        <button
          onClick={() => { setShowRevisit(v => !v); setCustomDate(''); }}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors">
          📅 {showRevisit ? 'Cancel' : 'Set Revisit'}
        </button>
      </div>

      {showRevisit && (
        <div className="mb-4 p-3 rounded-xl border border-indigo-200 bg-indigo-50/60 flex flex-col gap-2">
          <p className="text-xs font-semibold text-indigo-700">Schedule next revisit for this visit</p>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map(p => (
              <button key={p.days}
                onClick={() => !savingRevisit && saveRevisitDate(addDays(p.days))}
                disabled={savingRevisit}
                className="text-xs px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 font-semibold hover:bg-indigo-100 disabled:opacity-50 transition-colors">
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
            <button onClick={() => !savingRevisit && customDate && saveRevisitDate(customDate)}
              disabled={savingRevisit || !customDate}
              className="text-xs px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-40">
              {savingRevisit ? '…' : 'Set'}
            </button>
          </div>
          {detail?.next_visit_date && (
            <p className="text-xs text-green-700 font-medium">
              ✓ Currently set: {fmtDate(detail.next_visit_date)}
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-gray-400">Loading…</div>
      ) : error ? (
        <div className="py-10 text-center text-red-500">{error}</div>
      ) : detail ? (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-mono text-indigo-600 font-semibold">{detail.ref_number || `#${detail.id}`}</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{detail.visitor_name}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[detail.status] || 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABELS[detail.status] || detail.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{fmt(detail.visit_time)}</p>
          </div>

          {/* Visitor info */}
          <div className="border rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Visitor Info</p>
            <DL label="Phone"   value={detail.mobile} />
            <DL label="Email"   value={detail.visitor_email} />
            <DL label="Address" value={detail.address} />
          </div>

          {/* Visit details */}
          <div className="border rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Visit Details</p>
            <DL label="Service"   value={detail.service_name} />
            <DL label="Purpose"   value={detail.purpose} />
            <DL label="Associate" value={detail.employee_name + (detail.designation ? ` — ${detail.designation}` : '')} />
            <DL label="Notes"     value={detail.notes} />
          </div>

          {/* Non-hidden custom fields */}
          {detail.custom_fields?.filter(f => !f.is_hidden).length > 0 && (
            <div className="border rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Additional Info</p>
              {detail.custom_fields.filter(f => !f.is_hidden).map((f, i) => (
                <DL key={i} label={f.field_label} value={f.value || '—'} />
              ))}
            </div>
          )}

          {/* Hidden / staff fields */}
          {detail.custom_fields?.filter(f => f.is_hidden).length > 0 && (
            <div className="border border-amber-200 rounded-xl p-4 space-y-2 bg-amber-50/50">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">🔒 Internal Fields</p>
              {detail.custom_fields.filter(f => f.is_hidden).map((f, i) => (
                <DL key={i} label={f.field_label} value={f.value || '—'} />
              ))}
            </div>
          )}

          {/* Photos */}
          {photos.length > 0 && (
            <div className="border rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Photos ({photos.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {photos.map(ph => (
                  <button key={ph.id}
                    onClick={() => setLightbox(ph)}
                    className="aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-400 transition-colors focus:outline-none">
                    <img src={ph.filename} alt={ph.original_name}
                      className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)}
              className="absolute -top-8 right-0 text-white text-2xl leading-none hover:text-gray-300">✕</button>
            <img src={lightbox.filename} alt={lightbox.original_name}
              className="w-full max-h-[80vh] object-contain rounded-xl" />
            {lightbox.uploaded_by_name && (
              <p className="text-center text-gray-300 text-sm mt-2">
                Uploaded by {lightbox.uploaded_by_name}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
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
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function VisitorHistoryModal({ visitorId, onClose, onRevisitUpdated }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [detailVisitId, setDetailVisitId] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [settingDate, setSettingDate] = useState(false);
  const [savingDate,  setSavingDate]  = useState(false);
  const [customDate,  setCustomDate]  = useState('');

  async function sendReminder() {
    setSendingReminder(true);
    try {
      await api.post(`/visitors/${visitorId}/revisit-reminder`);
      toast.success('Revisit reminder sent via WhatsApp');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reminder');
    } finally { setSendingReminder(false); }
  }

  async function saveRevisitDate(dateStr) {
    setSavingDate(true);
    try {
      await api.put(`/visitors/${visitorId}/next-visit`, { next_visit_date: dateStr });
      // Update local data so banner reflects new date immediately
      setData(d => ({
        ...d,
        visits: d.visits.map((v, i) => i === 0 ? { ...v, next_visit_date: dateStr } : v),
      }));
      setSettingDate(false);
      setCustomDate('');
      toast.success('Next visit date saved');
      if (onRevisitUpdated) onRevisitUpdated(visitorId, dateStr);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save date');
    } finally { setSavingDate(false); }
  }

  useEffect(() => {
    setLoading(true);
    api.get(`/visitors/${visitorId}/visits`)
      .then(({ data }) => setData(data))
      .catch(() => setError('Failed to load visitor history.'))
      .finally(() => setLoading(false));
  }, [visitorId]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] px-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {detailVisitId ? 'Visit Detail' : 'Visitor History'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {detailVisitId ? (
            <VisitDetailPanel
              visitId={detailVisitId}
              onBack={() => setDetailVisitId(null)}
              onRevisitSet={dateStr => {
                setData(d => ({
                  ...d,
                  visits: d.visits.map(v => v.id === detailVisitId ? { ...v, next_visit_date: dateStr } : v),
                }));
                if (onRevisitUpdated) onRevisitUpdated(visitorId, dateStr);
              }}
            />
          ) : loading ? (
            <div className="py-12 text-center text-gray-400">Loading…</div>
          ) : error ? (
            <div className="py-12 text-center text-red-500">{error}</div>
          ) : !data?.visitor ? (
            <div className="py-12 text-center text-gray-400">No data available.</div>
          ) : (
            <>
              {/* Visitor profile */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-indigo-600">
                    {data.visitor.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-gray-900 truncate">{data.visitor.name}</p>
                  <p className="text-sm text-gray-500">{data.visitor.mobile}</p>
                  {data.visitor.email && <p className="text-xs text-gray-400">{data.visitor.email}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-extrabold text-indigo-600">{data.visitor.total_visits}</p>
                  <p className="text-xs text-gray-400">total visits</p>
                </div>
              </div>

              {/* Next visit section — set or change date + send reminder */}
              {(() => {
                const nv = data.visits.filter(v => v.next_visit_date).map(v => v.next_visit_date).sort().reverse()[0];
                if (nv) {
                  const diff = Math.round((new Date(String(nv).slice(0, 10) + 'T12:00:00') - new Date().setHours(0,0,0,0)) / 86400000);
                  const overdue = diff < 0;
                  return (
                    <div className={`mb-4 px-3 py-2.5 rounded-xl border ${overdue ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className={`text-xs font-semibold ${overdue ? 'text-red-700' : 'text-green-700'}`}>
                            {overdue ? '⚠️ Overdue revisit' : '📅 Next visit scheduled'}
                          </p>
                          <p className={`text-sm font-bold mt-0.5 ${overdue ? 'text-red-900' : 'text-green-900'}`}>{fmtDate(nv)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => { setSettingDate(true); setCustomDate(''); }}
                            className="text-xs px-2.5 py-1.5 rounded-lg font-semibold bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors">
                            ✏️ Change
                          </button>
                          <button
                            onClick={sendReminder}
                            disabled={sendingReminder}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-green-300 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors shadow-sm">
                            {sendingReminder ? '…' : (
                              <>
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                                Send Reminder
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      {settingDate && (
                        <div className="mt-3 pt-3 border-t border-current/10 flex flex-col gap-2">
                          <div className="flex flex-wrap gap-1">
                            {PRESETS.map(p => (
                              <button key={p.days}
                                onClick={() => !savingDate && saveRevisitDate(addDays(p.days))}
                                disabled={savingDate}
                                className="text-xs px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 font-semibold hover:bg-indigo-50 disabled:opacity-50 transition-colors">
                                {p.label}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
                              min={new Date().toISOString().slice(0, 10)}
                              className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                            <button onClick={() => !savingDate && customDate && saveRevisitDate(customDate)}
                              disabled={savingDate || !customDate}
                              className="text-xs px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-40">
                              {savingDate ? '…' : 'Set'}
                            </button>
                            <button onClick={() => setSettingDate(false)}
                              className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-500 font-semibold hover:bg-gray-200">✕</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                // No date set — show a "Schedule Revisit" panel
                return (
                  <div className="mb-4 px-3 py-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50">
                    {settingDate ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold text-indigo-700">📅 Schedule next revisit</p>
                        <div className="flex flex-wrap gap-1">
                          {PRESETS.map(p => (
                            <button key={p.days}
                              onClick={() => !savingDate && saveRevisitDate(addDays(p.days))}
                              disabled={savingDate}
                              className="text-xs px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 font-semibold hover:bg-indigo-100 disabled:opacity-50 transition-colors">
                              {p.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
                            min={new Date().toISOString().slice(0, 10)}
                            className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                          <button onClick={() => !savingDate && customDate && saveRevisitDate(customDate)}
                            disabled={savingDate || !customDate}
                            className="text-xs px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-40">
                            {savingDate ? '…' : 'Set Date'}
                          </button>
                          <button onClick={() => setSettingDate(false)}
                            className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-500 font-semibold hover:bg-gray-200">✕</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setSettingDate(true); setCustomDate(''); }}
                        className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors py-1">
                        <span>📅</span> Schedule Next Revisit
                      </button>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-6 text-xs text-gray-500 mb-6 border-t border-b py-3">
                <div>
                  <span className="font-medium text-gray-700">First visit: </span>
                  {fmtDate(data.visitor.created_at)}
                </div>
                {data.visitor.last_visit && (
                  <div>
                    <span className="font-medium text-gray-700">Last visit: </span>
                    {fmtDate(data.visitor.last_visit)}
                  </div>
                )}
                {data.visitor.address && (
                  <div className="truncate">
                    <span className="font-medium text-gray-700">Address: </span>
                    {data.visitor.address}
                  </div>
                )}
              </div>

              {/* Visit timeline */}
              {data.visits.length === 0 ? (
                <p className="text-center text-gray-400 py-6">No visits on record.</p>
              ) : (
                <div className="space-y-2">
                  {data.visits.map((v, i) => (
                    <button key={v.id}
                      onClick={() => setDetailVisitId(v.id)}
                      className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-indigo-50 hover:border-indigo-200 transition-colors cursor-pointer group">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center mt-1 shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                        {i < data.visits.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1 min-h-[20px]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono text-indigo-600 font-semibold">
                            {v.ref_number || `#${v.id}`}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[v.status] || 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABELS[v.status] || v.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{fmt(v.visit_time)}</p>
                        <div className="mt-1 flex gap-3 text-xs text-gray-600 flex-wrap">
                          {v.service_name && <span>📋 {v.service_name}</span>}
                          {v.employee_name && <span>👤 {v.employee_name}{v.designation ? ` — ${v.designation}` : ''}</span>}
                          {v.photo_count > 0 && <span className="text-indigo-500 font-medium">📷 {v.photo_count}</span>}
                          {v.next_visit_date && (
                            <span className="text-green-600 font-medium">
                              🔁 Next: {fmtDate(v.next_visit_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-gray-300 group-hover:text-indigo-400 text-lg self-center shrink-0">›</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
