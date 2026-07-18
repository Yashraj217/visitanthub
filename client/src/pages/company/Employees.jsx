import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../utils/exportExcel';

const emptyForm = { name: '', phone: '', email: '', designation: '', location: '', status: 'active', service_ids: [] };
const emptyCred = { email: '', password: '' };

export default function Employees() {
  const [employees, setEmployees]       = useState([]);
  const [services, setServices]         = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]         = useState(null);     // null | 'add' | employee_id (number)
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);

  // Credential sub-form inside modal
  const [credForm, setCredForm]       = useState(emptyCred);
  const [showCredForm, setShowCredForm] = useState(false);
  const [savingCred, setSavingCred]   = useState(false);
  const [removingCred, setRemovingCred] = useState(false);

  // The employee currently being edited (full object with login info)
  const [currentEmp, setCurrentEmp] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [empRes, svcRes, dsgRes] = await Promise.all([
        api.get('/employees'),
        api.get('/services'),
        api.get('/designations'),
      ]);
      setEmployees(empRes.data);
      setServices(svcRes.data);
      setDesignations(dsgRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  function toggleService(id) {
    setForm(f => ({
      ...f,
      service_ids: f.service_ids.includes(id)
        ? f.service_ids.filter(s => s !== id)
        : [...f.service_ids, id],
    }));
  }

  function openAdd() {
    setForm(emptyForm);
    setCurrentEmp(null);
    setCredForm(emptyCred);
    setShowCredForm(false);
    setModal('add');
  }

  function openEdit(emp) {
    setForm({
      name:        emp.name,
      phone:       emp.phone || '',
      email:       emp.email || '',
      designation: emp.designation || '',
      location:    emp.location || '',
      status:      emp.status,
      service_ids: emp.service_ids || [],
    });
    setCurrentEmp(emp);
    setCredForm({ email: emp.login_email || emp.email || '', password: '' });
    setShowCredForm(false);
    setModal(emp.id);
  }

  function closeModal() {
    setModal(null);
    setCurrentEmp(null);
    setShowCredForm(false);
  }

  async function handleSave() {
    if (!form.name || !form.phone) return toast.error('Name and phone are required');
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.post('/employees', form);
        toast.success('Associate added');
      } else {
        await api.put(`/employees/${modal}`, form);
        toast.success('Associate updated');
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCred(e) {
    e.preventDefault();
    if (!credForm.email || !credForm.password) return toast.error('Email and password are required');
    setSavingCred(true);
    try {
      await api.put(`/employees/${modal}/credentials`, credForm);
      toast.success(currentEmp?.user_id ? 'Credentials updated' : 'Login access granted');
      setShowCredForm(false);
      load();
      // Update currentEmp in place so the modal reflects new status without closing
      setCurrentEmp(prev => ({
        ...prev,
        user_id: prev?.user_id || true,
        login_email: credForm.email,
        login_status: 'active',
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSavingCred(false);
    }
  }

  async function handleRemoveCred() {
    if (!confirm('Remove login access for this associate?')) return;
    setRemovingCred(true);
    try {
      await api.delete(`/employees/${modal}/credentials`);
      toast.success('Login access removed');
      setCurrentEmp(prev => ({ ...prev, user_id: null, login_email: null, login_status: null }));
      setShowCredForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setRemovingCred(false);
    }
  }

  async function handleDeactivate(id, name) {
    if (!confirm(`Deactivate "${name}"?`)) return;
    try {
      await api.delete(`/employees/${id}`);
      toast.success('Associate deactivated');
      load();
    } catch { toast.error('Failed'); }
  }

  const hasLogin = !!currentEmp?.user_id;
  const loginActive = currentEmp?.login_status === 'active';

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Associates</h1>
          <p className="text-sm text-gray-500 mt-1">{employees.filter(e => e.status === 'active').length} active · Associates can log in to view their visitor queue</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button onClick={() => exportToExcel('associates', 'Associates', [
            { header: 'Name',        key: 'name' },
            { header: 'Phone',       key: 'phone' },
            { header: 'Designation', key: 'designation' },
            { header: 'Services',    key: 'service_names' },
            { header: 'Status',      key: 'status' },
          ], employees)} className="btn-secondary flex items-center gap-1">
            ⬇ Export
          </button>
          <button onClick={openAdd} className="btn-primary">+ Add Associate</button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <>
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {employees.map(e => (
              <div key={e.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{e.name}</p>
                    <p className="text-sm text-gray-500">{e.phone}</p>
                    {e.designation && <p className="text-xs text-gray-400">{e.designation}</p>}
                    {e.location && <p className="text-xs text-indigo-500">📍 {e.location}</p>}
                  </div>
                  <span className={`badge-${e.status} shrink-0`}>{e.status}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                  {e.service_names
                    ? <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5">{e.service_names}</span>
                    : <span className="text-xs text-gray-400 italic">No services</span>}
                  {e.user_id ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.login_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {e.login_status === 'active' ? '● Login on' : '○ Login off'}
                    </span>
                  ) : <span className="text-xs text-gray-300 italic">No login</span>}
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => openEdit(e)} className="text-xs px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium">Edit</button>
                  {e.status === 'active' && (
                    <button onClick={() => handleDeactivate(e.id, e.name)} className="text-xs px-3 py-1 rounded-lg bg-red-50 text-red-700 font-medium">Deactivate</button>
                  )}
                </div>
              </div>
            ))}
            {!employees.length && <p className="px-6 py-8 text-center text-gray-400">No associates found</p>}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Name', 'Phone', 'Designation', 'Location', 'Services', 'Login', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{e.name}</td>
                  <td className="px-6 py-4 text-gray-600">{e.phone}</td>
                  <td className="px-6 py-4 text-gray-600">{e.designation || '—'}</td>
                  <td className="px-6 py-4 text-gray-600">{e.location || '—'}</td>
                  <td className="px-6 py-4">
                    {e.service_names ? (() => {
                      const svcs = e.service_names.split(',').map(s => s.trim()).filter(Boolean);
                      const visible = svcs.slice(0, 2);
                      const extra = svcs.length - visible.length;
                      return (
                        <div className="flex flex-wrap gap-1">
                          {visible.map(s => (
                            <span key={s} className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5 whitespace-nowrap">{s}</span>
                          ))}
                          {extra > 0 && (
                            <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 whitespace-nowrap" title={svcs.slice(2).join(', ')}>+{extra} more</span>
                          )}
                        </div>
                      );
                    })() : <span className="text-gray-300 text-xs italic">None</span>}
                  </td>
                  <td className="px-6 py-4">
                    {e.user_id ? (
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                        e.login_status === 'active'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${e.login_status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {e.login_status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs italic">No login</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge-${e.status}`}>{e.status}</span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button onClick={() => openEdit(e)} className="text-xs px-3 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100">Edit</button>
                    {e.status === 'active' && (
                      <button onClick={() => handleDeactivate(e.id, e.name)} className="text-xs px-3 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100">Deactivate</button>
                    )}
                  </td>
                </tr>
              ))}
              {!employees.length && (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">No associates found</td></tr>
              )}
            </tbody>
          </table>
          </div>{/* end hidden sm:block */}
          </>
        )}
      </div>

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-auto">

            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">{modal === 'add' ? 'Add Associate' : 'Edit Associate'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Profile fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">Name *</label><input className="input" value={form.name} onChange={set('name')} placeholder="Full name" /></div>
                <div><label className="label">Phone *</label><input className="input" value={form.phone} onChange={set('phone')} placeholder="Mobile number" /></div>
                <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={set('email')} placeholder="work@company.com" /></div>
                <div><label className="label">Location</label><input className="input" value={form.location} onChange={set('location')} placeholder="e.g. Room 101, Floor 2" /></div>
                <div>
                  <label className="label">Designation</label>
                  {designations.length > 0 ? (
                    <select className="input" value={form.designation} onChange={set('designation')}>
                      <option value="">Select designation…</option>
                      {designations.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  ) : (
                    <input className="input" value={form.designation} onChange={set('designation')} placeholder="e.g. Manager (add options in Settings → Designations)" />
                  )}
                </div>
                {modal !== 'add' && (
                  <div>
                    <label className="label">Status</label>
                    <select className="input" value={form.status} onChange={set('status')}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Service assignment */}
              {services.length > 0 && (
                <div>
                  <label className="label">Assigned Services</label>
                  <p className="text-xs text-gray-400 mb-2">Associate appears in the kiosk only for selected services.</p>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {services.map(s => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-primary-600"
                          checked={form.service_ids.includes(s.id)}
                          onChange={() => toggleService(s.id)}
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate">
                          {s.icon} {s.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Save profile button */}
              <div className="flex gap-3 pt-1">
                <button onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : modal === 'add' ? 'Add Associate' : 'Save Changes'}
                </button>
              </div>

              {/* ── Login Access section (edit mode only) ─────────────────── */}
              {modal !== 'add' && (
                <div className="border-t pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Login Access</p>
                      <p className="text-xs text-gray-400 mt-0.5">Allow this associate to log in and view their visitor queue</p>
                    </div>
                    {hasLogin && loginActive && (
                      <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Active</span>
                    )}
                    {hasLogin && !loginActive && (
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                  </div>

                  {hasLogin && !showCredForm ? (
                    /* Has credentials — show summary + actions */
                    <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Login email</p>
                        <p className="text-sm font-medium text-gray-900">{currentEmp?.login_email}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => { setCredForm({ email: currentEmp?.login_email || '', password: '' }); setShowCredForm(true); }}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium">
                          Change Password
                        </button>
                        <button
                          onClick={handleRemoveCred} disabled={removingCred}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium disabled:opacity-50">
                          {removingCred ? '…' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  ) : !hasLogin && !showCredForm ? (
                    /* No credentials yet */
                    <button
                      onClick={() => { setCredForm({ email: currentEmp?.email || '', password: '' }); setShowCredForm(true); }}
                      className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                      + Grant Login Access
                    </button>
                  ) : null}

                  {showCredForm && (
                    <form onSubmit={handleSaveCred} className="space-y-3 mt-2">
                      <div>
                        <label className="label">Login Email *</label>
                        <input type="email" required className="input"
                          value={credForm.email}
                          onChange={e => setCredForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="associate@company.com" />
                      </div>
                      <div>
                        <label className="label">Password *</label>
                        <input type="password" required className="input"
                          value={credForm.password}
                          onChange={e => setCredForm(f => ({ ...f, password: e.target.value }))}
                          placeholder="Min 6 characters" />
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setShowCredForm(false)}
                          className="btn-secondary flex-1 text-sm">Cancel</button>
                        <button type="submit" disabled={savingCred}
                          className="btn-primary flex-1 text-sm">
                          {savingCred ? 'Saving…' : hasLogin ? 'Update Credentials' : 'Grant Access'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
