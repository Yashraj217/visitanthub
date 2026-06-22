import { useEffect, useState } from 'react';
import api from '../../services/api';
import { exportToExcel } from '../../utils/exportExcel';
import VisitorHistoryModal from '../../components/VisitorHistoryModal';

export default function Visitors() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [historyVisitorId, setHistoryVisitorId] = useState(null);

  useEffect(() => {
    api.get('/visitors')
      .then(({ data }) => setVisitors(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = visitors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.mobile.includes(search)
  );

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visitors</h1>
          <p className="text-sm text-gray-500 mt-1">{visitors.length} registered visitors</p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            className="input w-full sm:w-64"
            placeholder="Search by name or mobile…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <button onClick={() => exportToExcel('visitors', 'Visitors', [
            { header: 'Name',         key: 'name' },
            { header: 'Mobile',       key: 'mobile' },
            { header: 'Email',        key: 'email' },
            { header: 'Address',      key: 'address' },
            { header: 'Total Visits', key: 'total_visits' },
            { header: 'First Seen',   value: v => v.created_at ? new Date(v.created_at).toLocaleDateString() : '' },
          ], filtered)} className="btn-secondary whitespace-nowrap flex items-center gap-1">
            ⬇ Export
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
                onClick={() => setHistoryVisitorId(v.id)}>
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
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-48">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Address</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-24 whitespace-nowrap">Visits</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-28 whitespace-nowrap">First Seen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setHistoryVisitorId(v.id)}>
                  <td className="px-4 py-3 font-medium text-gray-900 truncate">{v.name}</td>
                  <td className="px-4 py-3 text-gray-700 truncate">{v.mobile}</td>
                  <td className="px-4 py-3 text-gray-500 truncate">{v.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 truncate">{v.address || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                      {v.total_visits} visit{v.total_visits !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {new Date(v.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No visitors found</td></tr>
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
        />
      )}
    </div>
  );
}
