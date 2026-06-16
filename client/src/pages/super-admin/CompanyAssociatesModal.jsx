import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const emptyForm = { name: '', phone: '', email: '', designation: '', status: 'active', service_ids: [] };
const emptyCred = { email: '', password: '' };

export default function CompanyAssociatesModal({ company, onClose }) {
  const [employees, setEmployees]       = useState([]);
  const [services, setServices]         = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [currentEmp, setCurrentEmp]     = useState(null);
  const [credForm, setCredForm]         = useState(emptyCred);
  const [showCredForm, setShowCredForm] = useState(false);
  const [savingCred, setSavingCred]     = useState(false);
  const [removingCred, setRemovingCred] = useState(false);
  const { startImpersonation } = useAuth();
  const navigate = useNavigate();

  const q = `?company_id=${company.id}`;

  async function load() {
    setLoading(true);
    try {
      const [empRes, svcRes, dsgRes] = await Promise.all([
        api.get(`/employees${q}`),
        api.get(`/services${q}`),
        api.get(`/designations${q}`),
      ]);
      setEmployees(empRes.data);
      setServices(svcRes.data);
      setDesignations(dsgRes.data);
    } catch {
      toast.error('Failed to load associates');
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
    setForm(emptyForm); setCurrentEmp(null);
    setCredForm(emptyCred); setShowCredForm(false);
    setModal('add');
  }

  function openEdit(emp) {
    setForm({ name: emp.name, phone: emp.phone || '', email: emp.email || '',
      designation: emp.designation || '', status: emp.status, service_ids: emp.service_ids || [] });
    setCurrentEmp(emp);
    setCredForm({ email: emp.login_email || emp.email || '', password: '' });
    setShowCredForm(false);
    setModal(emp.id);
  }

  function closeInner() { setModal(null); setCurrentEmp(null); setShowCredForm(false); }

  async function handleSave() {
    if (!form.name || !form.phone) return toast.error('Name and phone are required');
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.post(`/employees${q}`, { ...form, company_id: company.id });
        toast.success('Associate added');
      } else {
        await api.put(`/employees/${modal}${q}`, { ...form, company_id: company.id });
        toast.success('Associate updated');
      }
      closeInner(); load();
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
      await api.put(`/employees/${modal}/credentials${q}`, { ...credForm, company_id: company.id });
      toast.success(currentEmp?.user_id ? 'Credentials updated' : 'Login access granted');
      setShowCredForm(false);
      setCurrentEmp(p => ({ ...p, user_id: p?.user_id || true, login_email: credForm.email, login_status: 'active' }));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSavingCred(false);
    }
  }

  async function handleRemoveCred() {
    if (!confirm('Remove login access?')) return;
    setRemovingCred(true);
    try {
      await api.delete(`/employees/${modal}/credentials${q}`);
      toast.success('Login access removed');
      setCurrentEmp(p => ({ ...p, user_id: null, login_email: null, login_status: null }));
      setShowCredForm(false); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setRemovingCred(false);
    }
  }

  async function loginAsEmployee(emp) {
    if (!emp.user_id) return toast.error('This associate has no login account yet');
    try {
      const { data } = await api.post('/auth/impersonate', { type: 'employee', employee_id: emp.id });
      startImpersonation(data.token, data.user);
      onClose();
      navigate('/user-portal', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to impersonate');
    }
  }

  async function handleDeactivate(id, name) {
    if (!confirm(`Deactivate "${name}"?`)) return;
    try {
      await api.delete(`/employees/${id}${q}`);
      toast.success('Deactivated'); load();
    } catch { toast.error('Failed'); }
  }

  const hasLogin = !!currentEmp?.user_id;
  const loginActive = currentEmp?.login_status === 'active';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-end z-50">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative bg-white h-full w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Associates — {company.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{employees.filter(e => e.status === 'active').length} active</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={openAdd} className="btn-primary text-sm">+ Add Associate</button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200">✕</button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>
          ) : employees.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-3xl mb-3">👤</p>
              <p className="font-medium">No associates yet</p>
              <p className="text-sm mt-1">Click "+ Add Associate" to create one</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  {['Name', 'Phone', 'Designation', 'Services', 'Login', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(e => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{e.name}</td>
                    <td className="px-4 py-3 text-gray-600">{e.phone}</td>
                    <td className="px-4 py-3 text-gray-600">{e.designation || '—'}</td>
                    <td className="px-4 py-3">
                      {e.service_names
                        ? <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5">{e.service_names}</span>
                        : <span className="text-gray-300 text-xs italic">None</span>}
                    </td>
                    <td className="px-4 py-3">
                      {e.user_id
                        ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${e.login_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {e.login_status === 'active' ? '● Active' : '○ Inactive'}
                          </span>
                        : <span className="text-gray-300 text-xs italic">No login</span>}
                    </td>
                    <td className="px-4 py-3 flex gap-1.5 flex-wrap">
                      {e.user_id && (
                        <button onClick={() => loginAsEmployee(e)} className="text-xs px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium" title="Impersonate this associate">
                          👁 Login as
                        </button>
                      )}
                      <button onClick={() => openEdit(e)} className="text-xs px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100">Edit</button>
                      {e.status === 'active' && (
                        <button onClick={() => handleDeactivate(e.id, e.name)} className="text-xs px-2.5 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100">Deactivate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Inner edit modal */}
      {modal !== null && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 pt-5 pb-4 border-b flex items-center justify-between">
              <h3 className="text-base font-semibold">{modal === 'add' ? 'Add Associate' : 'Edit Associate'}</h3>
              <button onClick={closeInner} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Name *</label><input className="input" value={form.name} onChange={set('name')} placeholder="Full name" /></div>
                <div><label className="label">Phone *</label><input className="input" value={form.phone} onChange={set('phone')} placeholder="Mobile number" /></div>
                <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={set('email')} placeholder="work@company.com" /></div>
                <div>
                  <label className="label">Designation</label>
                  {designations.length > 0 ? (
                    <select className="input" value={form.designation} onChange={set('designation')}>
                      <option value="">Select designation…</option>
                      {designations.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  ) : (
                    <input className="input" value={form.designation} onChange={set('designation')} placeholder="e.g. Manager" />
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

              {services.length > 0 && (
                <div>
                  <label className="label">Assigned Services</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {services.map(s => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 accent-primary-600"
                          checked={form.service_ids.includes(s.id)} onChange={() => toggleService(s.id)} />
                        <span className="text-sm text-gray-700 truncate">{s.icon} {s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={closeInner} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : modal === 'add' ? 'Add Associate' : 'Save Changes'}
                </button>
              </div>

              {/* Login credentials section — edit mode only */}
              {modal !== 'add' && (
                <div className="border-t pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Login Access</p>
                      <p className="text-xs text-gray-400 mt-0.5">Allow associate to log in and view their visitor queue</p>
                    </div>
                    {hasLogin && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${loginActive ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500'}`}>
                        {loginActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>

                  {hasLogin && !showCredForm ? (
                    <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Login email</p>
                        <p className="text-sm font-medium text-gray-900">{currentEmp?.login_email}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => { setCredForm({ email: currentEmp?.login_email || '', password: '' }); setShowCredForm(true); }}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium">
                          Change Password
                        </button>
                        <button onClick={handleRemoveCred} disabled={removingCred}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium disabled:opacity-50">
                          {removingCred ? '…' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  ) : !hasLogin && !showCredForm ? (
                    <button onClick={() => { setCredForm({ email: currentEmp?.email || '', password: '' }); setShowCredForm(true); }}
                      className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                      + Grant Login Access
                    </button>
                  ) : null}

                  {showCredForm && (
                    <form onSubmit={handleSaveCred} className="space-y-3 mt-2">
                      <div>
                        <label className="label">Login Email *</label>
                        <input type="email" required className="input" value={credForm.email}
                          onChange={e => setCredForm(f => ({ ...f, email: e.target.value }))} placeholder="associate@company.com" />
                      </div>
                      <div>
                        <label className="label">Password *</label>
                        <input type="password" required className="input" value={credForm.password}
                          onChange={e => setCredForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" />
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setShowCredForm(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
                        <button type="submit" disabled={savingCred} className="btn-primary flex-1 text-sm">
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
