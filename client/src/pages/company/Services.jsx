import { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const FIELD_TYPES = [
  { value: 'text',     label: 'Text' },
  { value: 'number',   label: 'Number' },
  { value: 'email',    label: 'Email' },
  { value: 'phone',    label: 'Phone' },
  { value: 'date',     label: 'Date' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'select',   label: 'Dropdown' },
];

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];
const ICONS  = ['🏢','💼','📦','🩺','🎓','🤝','🚗','🔧','📋','💡','🎯','🏭'];

const emptyField = { field_label: '', field_type: 'text', placeholder: '', is_required: false, is_hidden: false, field_options: [] };

export default function Services() {
  const [services, setServices] = useState([]);
  const [selected, setSelected]   = useState(null); // currently open service
  const [fields, setFields]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  // service create/edit modal
  const [svcModal, setSvcModal] = useState(null);
  const [svcForm, setSvcForm]   = useState({ name:'', description:'', color:'#6366f1', icon:'🏢' });

  async function loadServices() {
    setLoading(true);
    const { data } = await api.get('/services');
    setServices(data);
    setLoading(false);
  }

  async function loadFields(serviceId) {
    const { data } = await api.get(`/services/${serviceId}/fields`);
    setFields(data.map(f => ({
      ...f,
      field_options: f.field_options
        ? (Array.isArray(f.field_options) ? f.field_options : JSON.parse(f.field_options))
        : [],
    })));
  }

  useEffect(() => { loadServices(); }, []);

  function selectService(svc) {
    setSelected(svc);
    loadFields(svc.id);
  }

  // ── Service CRUD ───────────────────────────────────────────────────────
  function openAdd()  { setSvcForm({ name:'', description:'', color:'#6366f1', icon:'🏢' }); setSvcModal('add'); }
  function openEdit(s) { setSvcForm({ name:s.name, description:s.description||'', color:s.color||'#6366f1', icon:s.icon||'🏢', is_active: s.is_active ?? 1, sort_order: s.sort_order ?? 0 }); setSvcModal(s.id); }

  async function saveSvc() {
    if (!svcForm.name.trim()) return toast.error('Service name is required');
    setSaving(true);
    try {
      if (svcModal === 'add') {
        await api.post('/services', svcForm);
        toast.success('Service created');
      } else {
        await api.put(`/services/${svcModal}`, svcForm);
        toast.success('Service updated');
      }
      setSvcModal(null);
      loadServices();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  }

  async function deleteSvc(id, name) {
    if (!confirm(`Delete service "${name}"? All associated field configurations will be removed.`)) return;
    try {
      await api.delete(`/services/${id}`);
      toast.success('Service deleted');
      if (selected?.id === id) setSelected(null);
      loadServices();
    } catch { toast.error('Failed to delete'); }
  }

  // ── Field builder ──────────────────────────────────────────────────────
  function addField() {
    setFields(f => [...f, { ...emptyField, _id: Date.now() }]);
  }

  function updateField(idx, key, value) {
    setFields(f => f.map((field, i) => i === idx ? { ...field, [key]: value } : field));
  }

  function removeField(idx) {
    setFields(f => f.filter((_, i) => i !== idx));
  }

  function moveField(idx, dir) {
    setFields(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function saveFields() {
    if (!selected) return;
    setSaving(true);
    try {
      await api.post(`/services/${selected.id}/fields`, { fields });
      toast.success('Fields saved');
      loadFields(selected.id);
    } catch { toast.error('Failed to save fields'); }
    finally { setSaving(false); }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-sm text-gray-500 mt-1">Define visit types and configure custom fields for each</p>
        </div>
        <button onClick={openAdd} className="btn-primary self-start sm:self-auto">+ Add Service</button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left — Service list */}
        <div className="lg:w-72 lg:shrink-0 flex flex-col gap-2 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
          {loading ? (
            <div className="text-gray-400 text-sm p-4">Loading…</div>
          ) : services.length === 0 ? (
            <div className="card text-center text-gray-400 text-sm py-8">
              <p className="text-3xl mb-2">🏢</p>
              No services yet.<br />Click "+ Add Service" to create one.
            </div>
          ) : (
            services.map(s => (
              <button
                key={s.id}
                onClick={() => selectService(s)}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  selected?.id === s.id
                    ? 'border-primary-500 bg-primary-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{s.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.field_count} field{s.field_count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div
                    className="w-3 h-3 rounded-full mt-0.5 shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                </div>
                {s.description && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{s.description}</p>
                )}
                <div className="flex gap-1.5 mt-3" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(s)}
                    className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100">Edit</button>
                  <button onClick={() => deleteSvc(s.id, s.name)}
                    className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-700 hover:bg-red-100">Delete</button>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right — Field builder */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-5xl mb-3">👈</p>
                <p className="text-base">Select a service to configure its fields</p>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selected.icon}</span>
                  <div>
                    <h2 className="text-lg font-semibold">{selected.name}</h2>
                    <p className="text-sm text-gray-500">Configure what visitors must fill in when selecting this service</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addField} className="btn-secondary text-sm">+ Add Field</button>
                  <button onClick={saveFields} disabled={saving} className="btn-primary text-sm">
                    {saving ? 'Saving…' : 'Save Fields'}
                  </button>
                </div>
              </div>

              {fields.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center text-gray-400">
                  <p className="text-3xl mb-2">📋</p>
                  <p>No custom fields yet.</p>
                  <p className="text-sm mt-1">Click "Add Field" to add visitor input fields for this service.</p>
                  <button onClick={addField} className="btn-primary text-sm mt-4">+ Add First Field</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, idx) => (
                    <FieldRow
                      key={field.id || field._id || idx}
                      field={field}
                      idx={idx}
                      total={fields.length}
                      onChange={(key, val) => updateField(idx, key, val)}
                      onRemove={() => removeField(idx)}
                      onMove={(dir) => moveField(idx, dir)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Service create/edit modal */}
      {svcModal !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-5">
              {svcModal === 'add' ? 'Add Service' : 'Edit Service'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Service Name *</label>
                <input className="input" placeholder="e.g. Job Interview, Delivery, Meeting"
                  value={svcForm.name} onChange={e => setSvcForm(f=>({...f,name:e.target.value}))} autoFocus />
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" placeholder="Short description (optional)"
                  value={svcForm.description} onChange={e => setSvcForm(f=>({...f,description:e.target.value}))} />
              </div>

              {/* Logo upload (only available when editing an existing service) */}
              {svcModal !== 'add' && (
                <ServiceLogoUploader
                  serviceId={svcModal}
                  currentUrl={services.find(s => s.id === svcModal)?.logo_url}
                  onUploaded={url => {
                    setServices(prev => prev.map(s => s.id === svcModal ? { ...s, logo_url: url } : s));
                  }}
                />
              )}
              {svcModal === 'add' && (
                <p className="text-xs text-gray-400 italic">Save the service first, then upload a logo from the edit screen.</p>
              )}

              <div>
                <label className="label">Icon (emoji)</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {ICONS.map(ic => (
                    <button key={ic} type="button"
                      onClick={() => setSvcForm(f=>({...f,icon:ic}))}
                      className={`text-xl p-1.5 rounded-lg border-2 transition-colors ${svcForm.icon===ic ? 'border-primary-500 bg-primary-50':'border-transparent hover:border-gray-200'}`}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2 mt-1">
                  {COLORS.map(c => (
                    <button key={c} type="button"
                      onClick={() => setSvcForm(f=>({...f,color:c}))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${svcForm.color===c?'border-gray-900 scale-110':'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={()=>setSvcModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={saveSvc} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldRow({ field, idx, total, onChange, onRemove, onMove }) {
  const [optionInput, setOptionInput] = useState('');

  function addOption() {
    const v = optionInput.trim();
    if (!v) return;
    onChange('field_options', [...(field.field_options || []), v]);
    setOptionInput('');
  }

  function removeOption(i) {
    onChange('field_options', field.field_options.filter((_, j) => j !== i));
  }

  return (
    <div className={`border rounded-xl p-4 ${field.is_hidden ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
      {!!field.is_hidden && (
        <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium mb-2 pb-2 border-b border-amber-200">
          <span>🔒</span> Hidden field — only visible to staff users, not shown to visitors
        </div>
      )}
      <div className="flex items-start gap-3">
        {/* Order controls */}
        <div className="flex flex-col gap-1 pt-1">
          <button onClick={()=>onMove(-1)} disabled={idx===0}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▲</button>
          <span className="text-xs text-gray-300 text-center">{idx+1}</span>
          <button onClick={()=>onMove(1)} disabled={idx===total-1}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▼</button>
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="label text-xs">Field Label *</label>
            <input className="input text-sm" placeholder="e.g. Amount Received"
              value={field.field_label}
              onChange={e => onChange('field_label', e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">Type</label>
            <select className="input text-sm" value={field.field_type}
              onChange={e => onChange('field_type', e.target.value)}>
              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Placeholder</label>
            <input className="input text-sm" placeholder="Optional hint text"
              value={field.placeholder||''}
              onChange={e => onChange('placeholder', e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 pt-6 shrink-0">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={!!field.is_required}
                onChange={e => onChange('is_required', e.target.checked)}
                className="rounded" />
              Required
            </label>
            <label className={`flex items-center gap-1.5 text-xs cursor-pointer whitespace-nowrap ${field.is_hidden ? 'text-amber-700 font-medium' : 'text-gray-600'}`}>
              <input type="checkbox" checked={!!field.is_hidden}
                onChange={e => onChange('is_hidden', e.target.checked)}
                className="rounded accent-amber-500" />
              🔒 Hidden
            </label>
            <button onClick={onRemove} className="text-red-400 hover:text-red-600 text-sm">✕</button>
          </div>
        </div>
      </div>

      {/* Dropdown options */}
      {field.field_type === 'select' && (
        <div className="mt-3 pl-8">
          <label className="label text-xs">Dropdown Options</label>
          <div className="flex gap-2 mb-2">
            <input className="input text-sm flex-1" placeholder="Add option and press Enter"
              value={optionInput} onChange={e => setOptionInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())} />
            <button type="button" onClick={addOption} className="btn-secondary text-xs px-3">Add</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(field.field_options || []).map((opt, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-white border rounded-full px-2.5 py-0.5 text-xs text-gray-700">
                {opt}
                <button onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500">×</button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceLogoUploader({ serviceId, currentUrl, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/companies/me/services/${serviceId}/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onUploaded(data.logo_url);
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div>
      <label className="label">Service Logo</label>
      <div className="flex items-center gap-4 mt-1 p-3 bg-gray-50 rounded-xl border border-gray-200">
        <div className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-white shrink-0">
          {currentUrl
            ? <img src={currentUrl} alt="logo" className="w-full h-full object-contain p-1" />
            : <span className="text-2xl">🖼</span>
          }
        </div>
        <div>
          <p className="text-xs text-gray-500">PNG, JPG, SVG — max 2 MB</p>
          <button type="button" onClick={() => inputRef.current?.click()}
            disabled={uploading} className="btn-secondary text-xs py-1.5 px-3 mt-1.5">
            {uploading ? 'Uploading…' : currentUrl ? 'Change Logo' : 'Upload Logo'}
          </button>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}
