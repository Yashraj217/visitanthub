import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const emptyForm = { name: '', email: '', password: '', status: 'active', service_ids: [] };

export default function CompanyUsers() {
  const [users, setUsers]       = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // null | { mode:'create'|'edit', data }
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [usersRes, svcRes] = await Promise.all([
        api.get('/company-users'),
        api.get('/services'),
      ]);
      setUsers(usersRes.data);
      setServices(svcRes.data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm(emptyForm);
    setModal({ mode: 'create' });
  }

  function openEdit(u) {
    setForm({
      name:        u.name,
      email:       u.email,
      password:    '',
      status:      u.status,
      service_ids: u.service_ids || [],
    });
    setModal({ mode: 'edit', id: u.id });
  }

  function toggleService(sid) {
    setForm(f => ({
      ...f,
      service_ids: f.service_ids.includes(sid)
        ? f.service_ids.filter(x => x !== sid)
        : [...f.service_ids, sid],
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return toast.error('Name and email are required');
    if (modal.mode === 'create' && !form.password) return toast.error('Password is required');
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await api.post('/company-users', form);
        toast.success('User created');
      } else {
        await api.put(`/company-users/${modal.id}`, form);
        toast.success('User updated');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id) {
    if (!confirm('Deactivate this user?')) return;
    try {
      await api.delete(`/company-users/${id}`);
      toast.success('User deactivated');
      load();
    } catch {
      toast.error('Failed');
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Users</h1>
          <p className="text-gray-500 text-sm mt-1">Manage staff who can log in to view visits for their services</p>
        </div>
        <button onClick={openCreate} className="btn-primary self-start sm:self-auto">+ Add User</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : users.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">👤</p>
          <p className="font-medium">No users yet</p>
          <p className="text-sm mt-1">Add staff users who need access to visit records</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Services</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {u.service_names || <span className="text-gray-300 italic">None</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(u)} className="text-primary-600 hover:text-primary-800 text-xs font-medium mr-3">Edit</button>
                    {u.status === 'active' && (
                      <button onClick={() => handleDeactivate(u.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Deactivate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 pt-6 pb-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                {modal.mode === 'create' ? 'Add User' : 'Edit User'}
              </h2>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" required className="input" value={form.email}
                  placeholder="user@company.com"
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">
                  Password {modal.mode === 'edit' && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
                  {modal.mode === 'create' && ' *'}
                </label>
                <input type="password" className="input" value={form.password}
                  placeholder={modal.mode === 'edit' ? 'New password…' : 'Min 6 characters'}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>

              {modal.mode === 'edit' && (
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}

              <div>
                <label className="label">Assigned Services</label>
                {services.length === 0 ? (
                  <p className="text-sm text-gray-400">No services configured yet</p>
                ) : (
                  <div className="space-y-2 mt-1">
                    {services.map(s => (
                      <label key={s.id} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-primary-600"
                          checked={form.service_ids.includes(s.id)}
                          onChange={() => toggleService(s.id)}
                        />
                        <span className="text-sm">{s.icon} {s.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
