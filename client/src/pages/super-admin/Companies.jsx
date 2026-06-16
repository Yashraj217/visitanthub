import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import CompanyAssociatesModal from './CompanyAssociatesModal';

export default function SuperCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [associatesCompany, setAssociatesCompany] = useState(null);
  const { startImpersonation } = useAuth();
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/companies');
      setCompanies(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id, status) {
    try {
      await api.put(`/companies/${id}/status`, { status });
      toast.success('Status updated');
      load();
    } catch {
      toast.error('Failed to update status');
    }
  }

  async function deleteCompany(id, name) {
    if (!confirm(`Delete "${name}"? This will remove all data.`)) return;
    try {
      await api.delete(`/companies/${id}`);
      toast.success('Company deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  }

  async function loginAsCompany(company) {
    try {
      const { data } = await api.post('/auth/impersonate', { type: 'company', company_id: company.id });
      startImpersonation(data.token, data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'No active admin found for this company');
    }
  }

  const filtered = filter === 'all' ? companies : companies.filter(c => c.status === filter);

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-500 text-sm mt-1">Manage registered offices</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'active', 'inactive'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === s ? 'bg-primary-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== 'all' && (
              <span className="ml-1.5 text-xs opacity-75">
                ({companies.filter(c => c.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <>
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {filtered.map(c => (
              <div key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.slug}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{c.email}</p>
                    {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                  </div>
                  <span className={`badge-${c.status} shrink-0`}>{c.status}</span>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                  <span>{c.employee_count} associates</span>
                  <span>{c.visit_count} visits</span>
                </div>
                <div className="mt-3 flex gap-1.5 flex-wrap">
                  <button onClick={() => loginAsCompany(c)} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-medium">👁 Login as</button>
                  <button onClick={() => setAssociatesCompany(c)} className="text-xs px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-medium">Associates</button>
                  {c.status !== 'active' && (
                    <button onClick={() => updateStatus(c.id,'active')} className="text-xs px-2.5 py-1 rounded-lg bg-green-100 text-green-700 font-medium">Approve</button>
                  )}
                  {c.status === 'active' && (
                    <button onClick={() => updateStatus(c.id,'inactive')} className="text-xs px-2.5 py-1 rounded-lg bg-yellow-100 text-yellow-700 font-medium">Deactivate</button>
                  )}
                  {c.status === 'inactive' && (
                    <button onClick={() => updateStatus(c.id,'active')} className="text-xs px-2.5 py-1 rounded-lg bg-green-100 text-green-700 font-medium">Activate</button>
                  )}
                  <button onClick={() => deleteCompany(c.id, c.name)} className="text-xs px-2.5 py-1 rounded-lg bg-red-100 text-red-700 font-medium">Delete</button>
                </div>
              </div>
            ))}
            {!filtered.length && <p className="px-6 py-8 text-center text-gray-400">No companies found</p>}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left">
                <th className="px-6 py-3 font-medium text-gray-500">Company</th>
                <th className="px-6 py-3 font-medium text-gray-500">Contact</th>
                <th className="px-6 py-3 font-medium text-gray-500">Associates</th>
                <th className="px-6 py-3 font-medium text-gray-500">Total Visits</th>
                <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <p className="text-gray-400 text-xs">{c.slug}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p>{c.email}</p>
                    <p className="text-gray-400">{c.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setAssociatesCompany(c)}
                      className="text-indigo-600 hover:underline font-medium"
                      title="Manage associates"
                    >
                      {c.employee_count} associates
                    </button>
                  </td>
                  <td className="px-6 py-4">{c.visit_count}</td>
                  <td className="px-6 py-4">
                    <span className={`badge-${c.status}`}>{c.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        onClick={() => loginAsCompany(c)}
                        title="Login as company admin"
                        className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium"
                      >
                        👁 Login as
                      </button>
                      {c.status !== 'active' && (
                        <button onClick={() => updateStatus(c.id, 'active')}
                          className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200">
                          Approve
                        </button>
                      )}
                      {c.status === 'active' && (
                        <button onClick={() => updateStatus(c.id, 'inactive')}
                          className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200">
                          Deactivate
                        </button>
                      )}
                      {c.status === 'inactive' && (
                        <button onClick={() => updateStatus(c.id, 'active')}
                          className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200">
                          Activate
                        </button>
                      )}
                      <button onClick={() => deleteCompany(c.id, c.name)}
                        className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No companies found</td></tr>
              )}
            </tbody>
          </table>
          </div>{/* end hidden sm:block */}
          </>
        )}
      </div>

      {associatesCompany && (
        <CompanyAssociatesModal
          company={associatesCompany}
          onClose={() => setAssociatesCompany(null)}
        />
      )}
    </div>
  );
}
