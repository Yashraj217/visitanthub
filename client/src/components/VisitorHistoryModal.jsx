import { useEffect, useState } from 'react';
import api from '../services/api';

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

function VisitDetailPanel({ visitId, onBack }) {
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [photos, setPhotos]   = useState([]);
  const [lightbox, setLightbox] = useState(null);

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

  return (
    <div>
      <button onClick={onBack}
        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-4">
        ← Back to History
      </button>

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

export default function VisitorHistoryModal({ visitorId, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [detailVisitId, setDetailVisitId] = useState(null);

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
