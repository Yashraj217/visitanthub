import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function VisitorForm() {
  const { slug } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [officeData, setOfficeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [fieldValues, setFieldValues] = useState({});

  const isReturning = !!state?.visitor;

  const [form, setForm] = useState({
    name:        state?.visitor?.name    || '',
    mobile:      state?.mobile           || '',
    email:       state?.visitor?.email   || '',
    address:     state?.visitor?.address || '',
    employee_id: '',
    purpose:     '',
    _hp:         '',
  });

  useEffect(() => {
    if (!state?.mobile) { navigate(`/visit/${slug}`, { replace: true }); return; }
    api.get(`/visitors/office/${slug}`)
      .then(({ data }) => setOfficeData(data))
      .catch(() => toast.error('Failed to load office data'));
  }, [slug]);

  function setF(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  function handleServiceSelect(svc) {
    setSelectedService(svc);
    setFieldValues({});
    setForm(f => ({ ...f, employee_id: '' })); // reset employee when service changes
  }

  function setFieldValue(fieldId, value) {
    setFieldValues(v => ({ ...v, [fieldId]: value }));
  }

  const hasServices = officeData?.services?.length > 0;

  // Employees for the current selection: filtered by service, or global fallback
  const availableEmployees = selectedService
    ? (selectedService.employees || [])
    : (hasServices ? [] : (officeData?.employees || []));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.mobile) {
      return toast.error('Please fill all required fields');
    }
    if (hasServices && !selectedService) {
      return toast.error('Please select a service / purpose');
    }
    if (!form.employee_id) {
      return toast.error('Please select an associate to meet');
    }

    // Validate required custom fields (skip hidden fields — filled by staff)
    if (selectedService) {
      for (const f of selectedService.fields) {
        if (!f.is_hidden && f.is_required && !fieldValues[f.id]?.toString().trim()) {
          return toast.error(`"${f.field_label}" is required`);
        }
      }
    }

    setLoading(true);
    try {
      const { data } = await api.post(`/visitors/office/${slug}/visit`, {
        name: form.name, mobile: form.mobile, email: form.email, address: form.address,
        employee_id: form.employee_id, purpose: selectedService?.name || form.purpose,
        service_id:   selectedService?.id || null,
        field_values: fieldValues,
        _hp:          form._hp,
      });
      navigate(`/visit/${slug}/confirmation`, {
        state: { result: { ...data, visitor_name: form.name }, company: officeData?.company },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register visit');
    } finally {
      setLoading(false);
    }
  }

  if (!officeData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          {officeData.company.logo_url ? (
            <img src={officeData.company.logo_url} alt={officeData.company.name}
              className="h-14 w-auto max-w-[160px] object-contain mx-auto mb-3 rounded-xl" />
          ) : null}
          <h1 className="text-xl font-bold text-gray-900">{officeData.company.name}</h1>
          <p className="text-gray-500 text-sm mt-1">Visitor Check-in</p>
        </div>

        {isReturning && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5 text-sm text-green-700 text-center">
            Welcome back, <strong>{form.name}</strong>! Your details have been pre-filled.
          </div>
        )}

        <div className="card space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Honeypot — bots fill this, humans never see it */}
            <input type="text" name="website" value={form._hp} onChange={e => setForm(f => ({ ...f, _hp: e.target.value }))}
              tabIndex={-1} autoComplete="off"
              style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }} />

            {/* Personal info */}
            <div>
              <label className="label">Full Name *</label>
              <input className="input" required placeholder="Your full name" value={form.name} onChange={setF('name')} />
            </div>
            <div>
              <label className="label">Mobile Number *</label>
              <input className="input bg-gray-50" readOnly value={form.mobile} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="your@email.com" value={form.email} onChange={setF('email')} />
            </div>
            <div>
              <label className="label">Address</label>
              <input className="input" placeholder="Your address" value={form.address} onChange={setF('address')} />
            </div>

            <hr />

            {/* Service / Purpose selection — FIRST */}
            {hasServices ? (
              <div>
                <label className="label">Purpose of Visit *</label>
                <div className="grid grid-cols-2 gap-2">
                  {officeData.services.map(svc => (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => handleServiceSelect(svc)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        selectedService?.id === svc.id
                          ? 'border-primary-500 bg-primary-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {svc.logo_url ? (
                        <img src={svc.logo_url} alt={svc.name}
                          className="w-10 h-10 rounded-lg object-contain bg-gray-50 p-0.5 shrink-0" />
                      ) : (
                        <span className="text-2xl shrink-0">{svc.icon}</span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{svc.name}</p>
                        {svc.description && (
                          <p className="text-xs text-gray-400 truncate">{svc.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="label">Purpose of Visit</label>
                <input className="input" placeholder="e.g. Meeting, Interview, Delivery…"
                  value={form.purpose} onChange={setF('purpose')} />
              </div>
            )}

            {/* Employee selection — AFTER service, filtered by service */}
            <div>
              <label className="label">Associate to Meet *</label>
              {hasServices && !selectedService ? (
                <div className="input bg-gray-50 text-gray-400 cursor-not-allowed select-none">
                  Select a purpose first…
                </div>
              ) : availableEmployees.length === 0 ? (
                <div className="input bg-amber-50 text-amber-700 text-sm cursor-default select-none">
                  No associates assigned to this service yet
                </div>
              ) : (
                <select className="input" required value={form.employee_id} onChange={setF('employee_id')}>
                  <option value="">Select associate…</option>
                  {availableEmployees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name}{e.designation ? ` — ${e.designation}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Dynamic custom fields for selected service (hidden fields not shown to visitors) */}
            {selectedService?.fields?.filter(f => !f.is_hidden).length > 0 && (
              <div className="space-y-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <span>{selectedService.icon}</span>
                  {selectedService.name} — Additional Details
                </p>
                {selectedService.fields.filter(f => !f.is_hidden).map(field => (
                  <DynamicField
                    key={field.id}
                    field={field}
                    value={fieldValues[field.id] || ''}
                    onChange={v => setFieldValue(field.id, v)}
                  />
                ))}
              </div>
            )}

            {/* Visit time */}
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600">
              <span className="font-medium">Visit Time:</span>{' '}
              {new Date().toLocaleString('en-IN', {
                timeZone: officeData.company.timezone || 'Asia/Kolkata',
                hour12: true, day: '2-digit', month: 'short',
                year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => navigate(`/visit/${slug}`)} className="btn-secondary flex-1">
                ← Back
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
                {loading ? 'Registering…' : 'Check In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function DynamicField({ field, value, onChange }) {
  const label = (
    <label className="label text-sm">
      {field.field_label}
      {!!field.is_required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const common = {
    className: 'input',
    placeholder: field.placeholder || '',
    required: !!field.is_required,
    value,
    onChange: e => onChange(e.target.value),
  };

  return (
    <div>
      {label}
      {field.field_type === 'textarea' ? (
        <textarea {...common} rows={3} className="input resize-none" />
      ) : field.field_type === 'select' ? (
        <select {...common}>
          <option value="">Select…</option>
          {(field.field_options || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input type={field.field_type === 'phone' ? 'tel' : field.field_type} {...common} />
      )}
    </div>
  );
}
