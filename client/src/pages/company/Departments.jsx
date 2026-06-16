import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Departments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', data? }
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/departments');
    setItems(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setName(''); setModal({ mode: 'add' }); }
  function openEdit(dept) { setName(dept.name); setModal({ mode: 'edit', data: dept }); }

  async function handleSave() {
    if (!name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      if (modal.mode === 'add') {
        await api.post('/departments', { name });
        toast.success('Department added');
      } else {
        await api.put(`/departments/${modal.data.id}`, { name });
        toast.success('Department updated');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, deptName) {
    if (!confirm(`Delete "${deptName}"? Associates in this department will be unassigned.`)) return;
    try {
      await api.delete(`/departments/${id}`);
      toast.success('Deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-sm text-gray-500 mt-1">Organise your associates by department</p>
        </div>
        <button onClick={openAdd} className="btn-primary self-start sm:self-auto">+ Add Department</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <>
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {items.map(d => (
              <div key={d.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{d.name}</p>
                  <p className="text-sm text-gray-500">{d.employee_count} associate{d.employee_count !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(d)} className="text-xs px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium">Edit</button>
                  <button onClick={() => handleDelete(d.id, d.name)} className="text-xs px-3 py-1 rounded-lg bg-red-50 text-red-700 font-medium">Delete</button>
                </div>
              </div>
            ))}
            {!items.length && <p className="px-6 py-8 text-center text-gray-400">No departments yet.</p>}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Associates</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(d => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="px-6 py-4 font-medium">{d.name}</td>
                  <td className="px-6 py-4 text-gray-500">{d.employee_count}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <button onClick={() => openEdit(d)} className="text-xs px-3 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100">Edit</button>
                    <button onClick={() => handleDelete(d.id, d.name)} className="text-xs px-3 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100">Delete</button>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">No departments yet. Click "Add Department" to create one.</td></tr>
              )}
            </tbody>
          </table>
          </div>{/* end hidden sm:block */}
          </>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{modal.mode === 'add' ? 'Add Department' : 'Edit Department'}</h2>
            <label className="label">Department Name *</label>
            <input
              className="input mb-4" placeholder="e.g. Sales, HR, IT"
              value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
