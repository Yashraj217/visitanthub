import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function SuperDashboard() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/companies')
      .then(({ data }) => setCompanies(data))
      .finally(() => setLoading(false));
  }, []);

  const total    = companies.length;
  const active   = companies.filter(c => c.status === 'active').length;
  const pending  = companies.filter(c => c.status === 'pending').length;
  const inactive = companies.filter(c => c.status === 'inactive').length;

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Super Admin Dashboard</h1>
      <p className="text-gray-500 mb-8">Overview of all registered offices</p>

      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Companies', value: total,    color: 'bg-blue-500' },
              { label: 'Active',          value: active,   color: 'bg-green-500' },
              { label: 'Pending',         value: pending,  color: 'bg-yellow-500' },
              { label: 'Inactive',        value: inactive, color: 'bg-gray-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
                  <span className="text-white text-xl font-bold">{value}</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-sm text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden p-0">
            <h2 className="text-lg font-semibold p-5 pb-0">Recent Companies</h2>
            <div className="overflow-x-auto p-5 pt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium">Company</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Associates</th>
                  <th className="pb-3 font-medium">Visits</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {companies.slice(0, 10).map(c => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{c.name}</td>
                    <td className="py-3 text-gray-500">{c.email}</td>
                    <td className="py-3">{c.employee_count}</td>
                    <td className="py-3">{c.visit_count}</td>
                    <td className="py-3">
                      <span className={`badge-${c.status}`}>{c.status}</span>
                    </td>
                  </tr>
                ))}
                {!companies.length && (
                  <tr><td colSpan={5} className="py-6 text-center text-gray-400">No companies yet</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
