import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function DynamicField({ field, value, onChange, accent }) {
  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300";
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
        {field.field_label}
        {field.is_required ? <span className="text-red-400 ml-0.5">*</span> : <span className="text-gray-300 font-normal normal-case ml-1">(optional)</span>}
      </label>
      {field.field_type === 'textarea' ? (
        <textarea className={inputCls + ' resize-none'} rows={2}
          placeholder={field.placeholder || ''}
          value={value} onChange={e => onChange(e.target.value)} />
      ) : field.field_type === 'select' ? (
        <select className={inputCls} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">Select…</option>
          {(field.field_options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input
          type={field.field_type === 'phone' ? 'tel' : (field.field_type || 'text')}
          className={inputCls}
          placeholder={field.placeholder || ''}
          value={value} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  );
}

function fmt12(time) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Generate next 30 days as YYYY-MM-DD strings
function nextDays(n = 30) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push(d.toLocaleDateString('en-CA'));
  }
  return out;
}

// ── Confirmation screen ───────────────────────────────────────────────────────
function ConfirmationScreen({ bookingRef, company, details }) {
  const accent = company?.sidebar_color || '#4f46e5';
  const { service, employee, date, time, form, customFields } = details || {};

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)' }}>
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Success banner */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
          <h1 className="text-xl font-extrabold text-gray-900 mb-1">Visit Registered Successfully!</h1>
          <p className="text-gray-500 text-sm">
            Your request has been sent to <strong>{company?.name}</strong>.<br />
            You will be notified once it is confirmed.
          </p>
        </div>

        {/* Booking reference */}
        <div className="px-8 py-5 text-center border-b border-gray-100" style={{ background: `${accent}10` }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: accent }}>Booking Reference</p>
          <p className="text-3xl font-extrabold font-mono tracking-widest" style={{ color: accent }}>{bookingRef}</p>
          <p className="text-xs text-gray-400 mt-1">Save this number to track your booking status</p>
        </div>

        {/* Booking summary */}
        <div className="px-8 py-5 space-y-2.5 text-sm border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Booking Details</p>

          {service && (
            <div className="flex gap-3">
              <span className="text-gray-400 w-20 shrink-0">Service</span>
              <span className="font-semibold text-gray-900">{service.icon} {service.name}</span>
            </div>
          )}
          <div className="flex gap-3">
            <span className="text-gray-400 w-20 shrink-0">Associate</span>
            <span className="font-medium text-gray-900">{employee?.name || 'Any Available'}</span>
          </div>
          {date && (
            <div className="flex gap-3">
              <span className="text-gray-400 w-20 shrink-0">Date</span>
              <span className="font-medium text-gray-900">{fmtDate(date)}</span>
            </div>
          )}
          {time && (
            <div className="flex gap-3">
              <span className="text-gray-400 w-20 shrink-0">Time</span>
              <span className="font-medium text-gray-900">{fmt12(time)}</span>
            </div>
          )}
        </div>

        {/* Visitor details */}
        <div className="px-8 py-5 space-y-2.5 text-sm border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Your Details</p>
          {form?.name && (
            <div className="flex gap-3">
              <span className="text-gray-400 w-20 shrink-0">Name</span>
              <span className="font-medium text-gray-900">{form.name}</span>
            </div>
          )}
          {form?.mobile && (
            <div className="flex gap-3">
              <span className="text-gray-400 w-20 shrink-0">Mobile</span>
              <span className="font-medium text-gray-900">{form.mobile}</span>
            </div>
          )}
          {form?.email && (
            <div className="flex gap-3">
              <span className="text-gray-400 w-20 shrink-0">Email</span>
              <span className="font-medium text-gray-900">{form.email}</span>
            </div>
          )}
          {form?.purpose && (
            <div className="flex gap-3">
              <span className="text-gray-400 w-20 shrink-0">Purpose</span>
              <span className="font-medium text-gray-900">{form.purpose}</span>
            </div>
          )}

          {/* Custom field responses */}
          {customFields?.length > 0 && customFields.map((cf, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-gray-400 w-20 shrink-0 truncate">{cf.label}</span>
              <span className="font-medium text-gray-900">{cf.value}</span>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="px-8 py-6 space-y-3">
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
            <span>⏳</span>
            <span>Your booking is <strong>pending confirmation</strong> by the admin. You'll be notified via WhatsApp.</span>
          </div>
          <a href={`/book/${company?.slug}/status`}
            className="block w-full text-center py-3 rounded-2xl text-white font-semibold text-sm transition-all hover:opacity-90"
            style={{ background: accent }}>
            Check Booking Status
          </a>
          <a href={`/book/${company?.slug}`}
            className="block w-full text-center py-2.5 rounded-2xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
            ← Book Another Visit
          </a>
        </div>

      </div>
    </div>
  );
}

// ── Status check screen ───────────────────────────────────────────────────────
function StatusScreen({ company }) {
  const [ref, setRef]       = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function check() {
    if (!ref.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await api.get(`/scheduling/public/booking/${ref.trim().toUpperCase()}`);
      setResult(data);
    } catch {
      setError('Booking not found. Please check your reference number.');
    } finally { setLoading(false); }
  }

  const STATUS_STYLE = {
    pending:    'bg-yellow-100 text-yellow-700',
    confirmed:  'bg-green-100 text-green-700',
    cancelled:  'bg-red-100 text-red-700',
    no_show:    'bg-gray-100 text-gray-500',
    checked_in: 'bg-blue-100 text-blue-700',
  };
  const STATUS_LABEL = {
    pending:    'Pending Confirmation',
    confirmed:  'Confirmed ✓',
    cancelled:  'Cancelled',
    no_show:    'No Show',
    checked_in: 'Checked In',
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)' }}>
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          {company?.logo_url
            ? <img src={company.logo_url} alt="" className="h-9 w-auto max-w-[100px] object-contain rounded-lg" />
            : <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                style={{ background: company?.sidebar_color || '#4f46e5' }}>
                {company?.name?.charAt(0)}
              </div>}
          <div>
            <p className="text-xs text-gray-400 font-medium">Check Booking Status</p>
            <p className="font-bold text-gray-900">{company?.name}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <input className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="BK-XXXXXX" value={ref}
            onChange={e => setRef(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && check()} />
          <button onClick={check} disabled={loading}
            className="px-4 py-2.5 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50"
            style={{ background: company?.sidebar_color || '#4f46e5' }}>
            {loading ? '…' : 'Check'}
          </button>
        </div>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        {result && (
          <div className="border rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-indigo-600">{result.booking_ref}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_STYLE[result.status] || 'bg-gray-100'}`}>
                {STATUS_LABEL[result.status] || result.status}
              </span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium text-gray-900">Name: </span>{result.visitor_name}</p>
              <p><span className="font-medium text-gray-900">Date: </span>{fmtDate(result.scheduled_date)}</p>
              <p><span className="font-medium text-gray-900">Time: </span>{fmt12(result.scheduled_time?.slice(0, 5))}</p>
              {result.service_name && <p><span className="font-medium text-gray-900">Service: </span>{result.service_name}</p>}
              {result.employee_name && <p><span className="font-medium text-gray-900">Associate: </span>{result.employee_name}{result.designation ? ` — ${result.designation}` : ''}</p>}
              {result.employee_name && result.location && <p><span className="font-medium text-gray-900">Location: </span>📍 {result.location}</p>}
              {result.admin_notes && <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">Note: {result.admin_notes}</p>}
            </div>
          </div>
        )}

        <p className="mt-6 text-xs text-center">
          <a href={`/book/${company?.slug}`} className="text-indigo-600 hover:underline">← Book a new visit</a>
        </p>
      </div>
    </div>
  );
}

// ── Main booking form ─────────────────────────────────────────────────────────
export default function BookingPage() {
  const { slug, action } = useParams();

  const [info, setInfo]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Step state
  const [step, setStep]               = useState(1); // 1=service, 2=associate, 3=datetime, 4=details
  const [selectedService, setService] = useState(null);
  const [selectedEmp, setEmp]         = useState(null); // null = any
  const [selectedDate, setDate]       = useState('');
  const [selectedTime, setTime]       = useState('');
  const [slots, setSlots]             = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [form, setForm]               = useState({ name: '', mobile: '', email: '', purpose: '', _hp: '' });
  const [fieldValues, setFieldValues] = useState({});
  const [submitting, setSubmitting]   = useState(false);
  const [bookingRef, setBookingRef]   = useState(null);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const accentColor = info?.company?.sidebar_color || '#4f46e5';

  useEffect(() => {
    api.get(`/scheduling/public/${slug}/info`)
      .then(({ data }) => setInfo(data))
      .catch(() => setError('This booking page is not available.'))
      .finally(() => setLoading(false));
  }, [slug]);

  // Load slots when date or associate changes
  useEffect(() => {
    if (!selectedDate || step !== 3) return;
    setSlotsLoading(true);
    setSlots([]);
    setTime('');
    const params = new URLSearchParams({ date: selectedDate });
    if (selectedEmp) params.set('employee_id', selectedEmp.id);
    api.get(`/scheduling/public/${slug}/slots?${params}`)
      .then(({ data }) => setSlots(data.slots || []))
      .catch(() => {})
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, selectedEmp, step]);

  async function handleSubmit() {
    if (!form.name.trim() || !form.mobile.trim() || !form.email.trim()) return;
    setSubmitError(null);

    // Validate required custom fields
    const visitorFields = selectedService?.fields?.filter(f => !f.is_hidden) || [];
    for (const f of visitorFields) {
      if (f.is_required && !String(fieldValues[f.id] ?? '').trim()) {
        alert(`"${f.field_label}" is required`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const { data } = await api.post(`/scheduling/public/${slug}/book`, {
        visitor_name:    form.name.trim(),
        visitor_mobile:  form.mobile.trim(),
        visitor_email:   form.email.trim() || null,
        employee_id:     selectedEmp?.id || null,
        service_id:      selectedService?.id || null,
        service_name:    selectedService?.name || null,
        scheduled_date:  selectedDate,
        scheduled_time:  selectedTime,
        purpose:         form.purpose.trim() || null,
        _hp:             form._hp,
        field_values:    visitorFields.length
          ? visitorFields
              .filter(f => fieldValues[f.id] !== undefined && String(fieldValues[f.id]).trim() !== '')
              .map(f => ({ label: f.field_label, value: String(fieldValues[f.id]) }))
          : undefined,
      });
      const filledFields = visitorFields
        .filter(f => fieldValues[f.id] !== undefined && String(fieldValues[f.id]).trim() !== '')
        .map(f => ({ label: f.field_label, value: String(fieldValues[f.id]) }));
      setBookingDetails({
        service:      selectedService,
        employee:     selectedEmp,
        date:         selectedDate,
        time:         selectedTime,
        form:         { name: form.name.trim(), mobile: form.mobile.trim(), email: form.email.trim(), purpose: form.purpose.trim() },
        customFields: filledFields,
      });
      setBookingRef(data.booking_ref);
    } catch (err) {
      const errData = err.response?.data;
      setSubmitError({
        duplicate: errData?.duplicate === true,
        ref: errData?.booking_ref || null,
        message: errData?.message || 'Failed to submit booking. Please try again.',
      });
    } finally { setSubmitting(false); }
  }

  if (action === 'status') return <StatusScreen company={info?.company} />;
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)' }}>
      <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );
  if (error) return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)' }}>
      <p className="text-gray-500 text-center">{error}</p>
    </div>
  );
  if (bookingRef) return <ConfirmationScreen bookingRef={bookingRef} company={info.company} details={bookingDetails} />;

  const { company, services, employees } = info;
  const availableEmps = selectedService
    ? employees.filter(e => e.service_ids.includes(selectedService.id))
    : employees;
  const allDays = nextDays(30);

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)' }}>

      {/* Header */}
      <header className="py-5 px-6 flex items-center justify-between max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-3">
          {company.logo_url
            ? <img src={company.logo_url} alt="" className="h-10 w-auto max-w-[120px] object-contain rounded-xl" />
            : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                style={{ background: accentColor }}>{company.name.charAt(0)}</div>}
          <div>
            <p className="font-bold text-gray-900 text-lg leading-tight">{company.name}</p>
            <p className="text-xs text-gray-400">Schedule a Visit</p>
          </div>
        </div>
        <a href={`/book/${slug}/status`}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors">
          Check Status
        </a>
      </header>

      {/* Progress bar */}
      <div className="max-w-2xl mx-auto w-full px-6 mb-6">
        <div className="flex items-center gap-1">
          {['Service', 'Associate', 'Date & Time', 'Your Details'].map((label, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  step > i + 1 ? 'border-transparent text-white' :
                  step === i + 1 ? 'border-transparent text-white' :
                  'border-gray-200 text-gray-400 bg-white'
                }`}
                style={step >= i + 1 ? { background: accentColor } : {}}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${step === i + 1 ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
              </div>
              {i < 3 && <div className={`flex-1 h-0.5 mx-1 mb-4 transition-all ${step > i + 1 ? '' : 'bg-gray-200'}`}
                style={step > i + 1 ? { background: accentColor } : {}} />}
            </div>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 pb-12">
        <div className="bg-white rounded-3xl shadow-lg p-6 sm:p-8">

          {/* Step 1 — Service */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Select a Service</h2>
              <p className="text-sm text-gray-400 mb-6">What would you like assistance with?</p>
              {services.length === 0 ? (
                <p className="text-gray-400 text-sm">No services available.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {services.map(s => (
                    <button key={s.id} onClick={() => { setService(s); setFieldValues({}); setStep(2); }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center hover:shadow-md ${
                        selectedService?.id === s.id
                          ? 'border-transparent text-white shadow-md'
                          : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                      }`}
                      style={selectedService?.id === s.id ? { background: accentColor } : {}}>
                      <span className="text-2xl">{s.icon || '📋'}</span>
                      <span className="text-sm font-semibold leading-tight">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Associate */}
          {step === 2 && (
            <div>
              <button onClick={() => setStep(1)} className="text-xs text-indigo-500 hover:text-indigo-700 mb-4 flex items-center gap-1">← Back</button>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Select an Associate</h2>
              <p className="text-sm text-gray-400 mb-6">Choose who you'd like to meet, or pick "Any Available".</p>
              <div className="space-y-2.5">
                {/* Any available */}
                <button onClick={() => { setEmp(null); setStep(3); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                    selectedEmp === null ? 'border-transparent text-white' : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                  }`}
                  style={selectedEmp === null ? { background: accentColor } : {}}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${selectedEmp === null ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>?</div>
                  <div>
                    <p className="font-semibold text-sm">Any Available</p>
                    <p className={`text-xs ${selectedEmp === null ? 'text-white/70' : 'text-gray-400'}`}>First available associate for {selectedService?.name}</p>
                  </div>
                </button>
                {availableEmps.map(e => (
                  <button key={e.id} onClick={() => { setEmp(e); setStep(3); }}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                      selectedEmp?.id === e.id ? 'border-transparent text-white' : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                    }`}
                    style={selectedEmp?.id === e.id ? { background: accentColor } : {}}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${selectedEmp?.id === e.id ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                      {e.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{e.name}</p>
                      <p className={`text-xs ${selectedEmp?.id === e.id ? 'text-white/70' : 'text-gray-400'}`}>
                        {e.designation}{e.location ? ` · 📍 ${e.location}` : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Date & Time */}
          {step === 3 && (
            <div>
              <button onClick={() => setStep(2)} className="text-xs text-indigo-500 hover:text-indigo-700 mb-4 flex items-center gap-1">← Back</button>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Pick a Date & Time</h2>
              <p className="text-sm text-gray-400 mb-5">Select an available slot for your visit.</p>

              {/* Date picker */}
              <div className="mb-5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Date</label>
                <div className="flex flex-wrap gap-2">
                  {allDays.map(d => {
                    const day = new Date(d + 'T12:00:00').getDay();
                    return (
                      <button key={d} onClick={() => setDate(d)}
                        className={`flex flex-col items-center px-3 py-2.5 rounded-xl border-2 transition-all w-[52px] ${
                          selectedDate === d ? 'border-transparent text-white' : 'border-gray-100 hover:border-gray-200 bg-gray-50 text-gray-700'
                        }`}
                        style={selectedDate === d ? { background: accentColor } : {}}>
                        <span className="text-[10px] font-semibold">{DAYS[day]}</span>
                        <span className="text-base font-bold">{new Date(d + 'T12:00:00').getDate()}</span>
                        <span className="text-[9px]">{new Date(d + 'T12:00:00').toLocaleString('en-IN', { month: 'short' })}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time slots */}
              {selectedDate && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Available Slots</label>
                  {slotsLoading ? (
                    <div className="py-6 text-center text-gray-400 text-sm">Loading slots…</div>
                  ) : slots.filter(s => !s.booked).length === 0 ? (
                    <div className="py-6 text-center text-gray-400 text-sm">No slots available on this date.<br />Try another date.</div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slots.filter(s => !s.booked).map(s => (
                        <button key={s.time} onClick={() => setTime(s.time)}
                          className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                            selectedTime === s.time ? 'border-transparent text-white' : 'border-gray-100 hover:border-gray-200 bg-gray-50 text-gray-700'
                          }`}
                          style={selectedTime === s.time ? { background: accentColor } : {}}>
                          {fmt12(s.time)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedDate && selectedTime && (
                <button onClick={() => setStep(4)}
                  className="w-full mt-6 py-3 rounded-2xl text-white font-semibold transition-all hover:opacity-90"
                  style={{ background: accentColor }}>
                  Continue →
                </button>
              )}
            </div>
          )}

          {/* Step 4 — Visitor details */}
          {step === 4 && (
            <div>
              <button onClick={() => setStep(3)} className="text-xs text-indigo-500 hover:text-indigo-700 mb-4 flex items-center gap-1">← Back</button>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Your Details</h2>
              <p className="text-sm text-gray-400 mb-5">Almost done — just a few details.</p>

              {/* Booking summary */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-5 text-sm space-y-1.5">
                {selectedService && <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Service</span><span className="font-medium text-gray-900">{selectedService.icon} {selectedService.name}</span></div>}
                <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Associate</span><span className="font-medium text-gray-900">{selectedEmp?.name || 'Any Available'}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Date</span><span className="font-medium text-gray-900">{fmtDate(selectedDate)}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Time</span><span className="font-medium text-gray-900">{fmt12(selectedTime)}</span></div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Full Name *</label>
                  <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="Your full name" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Mobile Number *</label>
                  <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="10-digit mobile" type="tel" value={form.mobile}
                    onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Email *</label>
                  <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="your@email.com" type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Purpose <span className="text-gray-300 font-normal normal-case">(optional)</span></label>
                  <textarea className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                    rows={2} placeholder="Briefly describe your purpose of visit"
                    value={form.purpose}
                    onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
                </div>

                {/* Custom fields for the selected service */}
                {selectedService?.fields?.filter(f => !f.is_hidden).length > 0 && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-4">
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                      {selectedService.icon} {selectedService.name} — Additional Details
                    </p>
                    {selectedService.fields.filter(f => !f.is_hidden).map(field => (
                      <DynamicField
                        key={field.id}
                        field={field}
                        value={fieldValues[field.id] ?? ''}
                        onChange={v => setFieldValues(fv => ({ ...fv, [field.id]: v }))}
                        accent={accentColor}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Honeypot — bots fill this, humans never see it */}
              <input type="text" name="website" value={form._hp} onChange={e => setForm(f => ({ ...f, _hp: e.target.value }))}
                tabIndex={-1} autoComplete="off"
                style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }} />

              {submitError && (
                <div className={`mt-5 rounded-2xl p-4 text-sm ${submitError.duplicate ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  {submitError.duplicate ? (
                    <>
                      <p className="font-bold mb-1">Booking already exists!</p>
                      <p>{submitError.message}</p>
                      {submitError.ref && (
                        <p className="mt-2 font-mono font-semibold">{submitError.ref}</p>
                      )}
                    </>
                  ) : (
                    <p>{submitError.message}</p>
                  )}
                </div>
              )}

              <button onClick={handleSubmit}
                disabled={submitting || !form.name.trim() || !form.mobile.trim() || !form.email.trim()}
                className="w-full mt-6 py-3.5 rounded-2xl text-white font-bold text-base transition-all disabled:opacity-50 hover:opacity-90"
                style={{ background: accentColor }}>
                {submitting ? 'Submitting…' : 'Submit Booking Request'}
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">Your booking will be confirmed by the admin. A confirmation email will be sent to you.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
