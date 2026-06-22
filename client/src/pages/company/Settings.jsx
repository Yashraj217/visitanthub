import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('profile');

  useEffect(() => {
    api.get('/companies/me/profile').then(({ data }) => setProfile(data));
  }, []);

  function set(field) { return e => setProfile(p => ({ ...p, [field]: e.target.value })); }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/companies/me/profile', profile);
      toast.success('Profile updated');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  async function saveWhatsApp(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/companies/me/settings', {
        whatsapp_provider: profile.whatsapp_provider,
        whatsapp_api_key: profile.whatsapp_api_key,
        whatsapp_from: profile.whatsapp_from,
      });
      toast.success('WhatsApp settings saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  if (!profile) return <div className="p-8 text-gray-400">Loading…</div>;

  const kioskUrl = `${window.location.origin}/visit/${profile.slug}`;

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-gray-500 mb-8">Configure your office profile and integrations</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {[
          { key: 'profile',      label: 'Profile' },
          { key: 'designations', label: 'Designations' },
          { key: 'reference',    label: '🔢 Reference No.' },
          { key: 'whatsapp',     label: 'WhatsApp' },
          { key: 'kiosk',        label: 'Kiosk' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="space-y-4">
          {/* Logo upload */}
          <LogoUploader
            currentUrl={profile.logo_url}
            label="Company Logo"
            uploadUrl="/companies/me/logo"
            onUploaded={url => setProfile(p => ({ ...p, logo_url: url }))}
          />
          <form onSubmit={saveProfile} className="card space-y-5">
            <h2 className="text-base font-semibold mb-2">Company Profile</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Company Name</label><input className="input" value={profile.name||''} onChange={set('name')} /></div>
              <div><label className="label">Phone</label><input className="input" value={profile.phone||''} onChange={set('phone')} /></div>
              <div className="col-span-2"><label className="label">Address</label><textarea className="input" rows={2} value={profile.address||''} onChange={set('address')} /></div>
              <div><label className="label">City</label><input className="input" value={profile.city||''} onChange={set('city')} /></div>
              <div><label className="label">State</label><input className="input" value={profile.state||''} onChange={set('state')} /></div>
              <div><label className="label">Country</label><input className="input" value={profile.country||''} onChange={set('country')} /></div>
              <div className="col-span-2">
                <label className="label">Timezone</label>
                <select className="input" value={profile.timezone||'UTC'} onChange={set('timezone')}>
                  {[
                    ['Pacific/Midway',      'UTC-11:00 Midway Island'],
                    ['Pacific/Honolulu',    'UTC-10:00 Hawaii'],
                    ['America/Anchorage',   'UTC-09:00 Alaska'],
                    ['America/Los_Angeles', 'UTC-08:00 Pacific Time (US & Canada)'],
                    ['America/Denver',      'UTC-07:00 Mountain Time (US & Canada)'],
                    ['America/Chicago',     'UTC-06:00 Central Time (US & Canada)'],
                    ['America/New_York',    'UTC-05:00 Eastern Time (US & Canada)'],
                    ['America/Halifax',     'UTC-04:00 Atlantic Time (Canada)'],
                    ['America/Sao_Paulo',   'UTC-03:00 Brasilia'],
                    ['Atlantic/Azores',     'UTC-01:00 Azores'],
                    ['UTC',                 'UTC+00:00 UTC'],
                    ['Europe/London',       'UTC+00:00 London'],
                    ['Europe/Paris',        'UTC+01:00 Paris / Berlin / Rome'],
                    ['Europe/Helsinki',     'UTC+02:00 Helsinki / Athens'],
                    ['Europe/Moscow',       'UTC+03:00 Moscow'],
                    ['Asia/Tehran',         'UTC+03:30 Tehran'],
                    ['Asia/Dubai',          'UTC+04:00 Dubai / Abu Dhabi'],
                    ['Asia/Kabul',          'UTC+04:30 Kabul'],
                    ['Asia/Karachi',        'UTC+05:00 Karachi / Islamabad'],
                    ['Asia/Kolkata',        'UTC+05:30 Mumbai / New Delhi / Kolkata'],
                    ['Asia/Kathmandu',      'UTC+05:45 Kathmandu'],
                    ['Asia/Dhaka',          'UTC+06:00 Dhaka'],
                    ['Asia/Rangoon',        'UTC+06:30 Yangon'],
                    ['Asia/Bangkok',        'UTC+07:00 Bangkok / Jakarta'],
                    ['Asia/Singapore',      'UTC+08:00 Singapore / Kuala Lumpur'],
                    ['Asia/Shanghai',       'UTC+08:00 Beijing / Shanghai'],
                    ['Asia/Tokyo',          'UTC+09:00 Tokyo / Seoul'],
                    ['Australia/Adelaide',  'UTC+09:30 Adelaide'],
                    ['Australia/Sydney',    'UTC+10:00 Sydney / Melbourne'],
                    ['Pacific/Auckland',    'UTC+12:00 Auckland'],
                  ].map(([tz, label]) => (
                    <option key={tz} value={tz}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sidebar color */}
            <div className="border-t pt-4">
              <label className="label mb-2">Sidebar Color</label>
              <div className="flex items-center gap-4 flex-wrap">
                {/* Preset swatches */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { color: '#111827', label: 'Charcoal' },
                    { color: '#1e1b4b', label: 'Indigo' },
                    { color: '#1e3a5f', label: 'Navy' },
                    { color: '#14532d', label: 'Forest' },
                    { color: '#7c2d12', label: 'Brick' },
                    { color: '#1a1a2e', label: 'Midnight' },
                    { color: '#0f172a', label: 'Slate' },
                    { color: '#312e81', label: 'Purple' },
                  ].map(({ color, label }) => (
                    <button
                      key={color}
                      type="button"
                      title={label}
                      onClick={() => setProfile(p => ({ ...p, sidebar_color: color }))}
                      className="w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 shrink-0"
                      style={{
                        backgroundColor: color,
                        borderColor: profile.sidebar_color === color ? '#6366f1' : 'transparent',
                        outline: profile.sidebar_color === color ? '2px solid #6366f1' : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
                {/* Free color picker */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="color"
                    value={profile.sidebar_color || '#111827'}
                    onChange={e => setProfile(p => ({ ...p, sidebar_color: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5"
                  />
                  <span className="text-sm text-gray-500">Custom</span>
                </label>
                {/* Live preview chip */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-xs font-medium" style={{ backgroundColor: profile.sidebar_color || '#111827' }}>
                  <span className="w-2 h-2 rounded-full bg-white/40 inline-block" />
                  Preview
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Profile'}</button>
            </div>
          </form>
        </div>
      )}

      {tab === 'whatsapp' && (
        <form onSubmit={saveWhatsApp} className="card space-y-4">
          <h2 className="text-base font-semibold mb-2">WhatsApp Notifications</h2>
          <p className="text-sm text-gray-500">When a visitor checks in, a WhatsApp message will be sent to the selected associate.</p>
          <div>
            <label className="label">Provider</label>
            <select className="input" value={profile.whatsapp_provider||'none'} onChange={set('whatsapp_provider')}>
              <option value="none">None (disabled)</option>
              <option value="twilio">Twilio</option>
              <option value="meta">Meta Cloud API</option>
              <option value="wati">WATI / Interakt</option>
            </select>
          </div>
          {profile.whatsapp_provider !== 'none' && <>
            <div>
              <label className="label">
                {profile.whatsapp_provider === 'twilio' ? 'API Key (format: ACCOUNT_SID|AUTH_TOKEN)' :
                 profile.whatsapp_provider === 'meta'   ? 'API Key (format: ACCESS_TOKEN|PHONE_NUMBER_ID)' :
                 'API Key'}
              </label>
              <input type="password" className="input" placeholder="Paste your API key" value={profile.whatsapp_api_key||''} onChange={set('whatsapp_api_key')} />
            </div>
            <div>
              <label className="label">From Number</label>
              <input className="input" placeholder="e.g. +14155238886" value={profile.whatsapp_from||''} onChange={set('whatsapp_from')} />
            </div>
          </>}
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      )}

      {tab === 'designations' && <DesignationsTab />}

      {tab === 'reference' && (
        <RefTab profile={profile} onSaved={() => api.get('/companies/me/profile').then(({ data }) => setProfile(data))} />
      )}

      {tab === 'kiosk' && (
        <KioskTab profile={profile} kioskUrl={kioskUrl} />
      )}
    </div>
  );
}

function DesignationsTab() {
  const [designations, setDesignations] = useState([]);
  const [newName, setNewName]           = useState('');
  const [saving, setSaving]             = useState(false);
  const [removing, setRemoving]         = useState(null);

  async function load() {
    try {
      const { data } = await api.get('/designations');
      setDesignations(data);
    } catch { toast.error('Failed to load designations'); }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await api.post('/designations', { name: newName.trim() });
      setNewName('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id) {
    setRemoving(id);
    try {
      await api.delete(`/designations/${id}`);
      load();
    } catch { toast.error('Failed to delete'); }
    finally { setRemoving(null); }
  }

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-base font-semibold">Designations</h2>
        <p className="text-sm text-gray-500 mt-1">Define job titles for your associates. These appear as a dropdown when adding or editing an associate.</p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="e.g. Sales Manager, HR Executive…"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <button type="submit" disabled={saving || !newName.trim()} className="btn-primary px-5">
          {saving ? '…' : '+ Add'}
        </button>
      </form>

      {designations.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No designations yet. Add one above.</p>
      ) : (
        <ul className="divide-y border rounded-xl overflow-hidden">
          {designations.map(d => (
            <li key={d.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
              <span className="text-sm font-medium text-gray-800">{d.name}</span>
              <button
                onClick={() => handleRemove(d.id)}
                disabled={removing === d.id}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
              >
                {removing === d.id ? '…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RefTab({ profile, onSaved }) {
  const [form, setForm] = useState({
    ref_type:    profile.ref_type    || 'serial',
    ref_prefix:  profile.ref_prefix  || 'VIS',
    ref_padding: profile.ref_padding || 4,
  });
  const [services, setServices] = useState([]);
  const [svcPrefixes, setSvcPrefixes] = useState({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(null);

  useEffect(() => {
    api.get('/services').then(({ data }) => {
      setServices(data);
      const map = {};
      data.forEach(s => { map[s.id] = s.ref_prefix || ''; });
      setSvcPrefixes(map);
    });
  }, []);

  const preview = `${(form.ref_prefix || 'VIS').toUpperCase()}-${'1'.padStart(form.ref_padding, '0')}`;

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/companies/me/ref-settings', form);
      // Save service prefixes too
      await Promise.all(
        services.map(s =>
          api.put(`/companies/me/services/${s.id}/ref`, { ref_prefix: svcPrefixes[s.id] || '' })
        )
      );
      toast.success('Reference settings saved');
      onSaved();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  async function resetCounter(target, serviceId, label) {
    if (!confirm(`Reset counter for "${label}" to 0? Next visit will start from 0001.`)) return;
    setResetting(serviceId || 'company');
    try {
      await api.post('/companies/me/ref-reset', { target, service_id: serviceId });
      toast.success('Counter reset');
      onSaved();
    } catch { toast.error('Failed'); }
    finally { setResetting(null); }
  }

  return (
    <form onSubmit={save} className="card space-y-6">
      <div>
        <h2 className="text-base font-semibold">Reference Number</h2>
        <p className="text-sm text-gray-500 mt-1">Every visit gets a unique reference number for tracking.</p>
      </div>

      {/* Mode toggle */}
      <div>
        <label className="label">Numbering Mode</label>
        <div className="grid grid-cols-2 gap-3 mt-1">
          {[
            { value: 'serial',  label: 'Serial',       desc: 'One global sequence for all visits', eg: 'VIS-0001, VIS-0002 …' },
            { value: 'service', label: 'Service-wise', desc: 'Each service has its own sequence',   eg: 'INT-0001, DEL-0003 …' },
          ].map(opt => (
            <label key={opt.value}
              className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                form.ref_type === opt.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
              <input type="radio" name="ref_type" value={opt.value} checked={form.ref_type === opt.value}
                onChange={e => setForm(f => ({ ...f, ref_type: e.target.value }))}
                className="sr-only" />
              <p className="font-semibold text-sm text-gray-900">{opt.label}</p>
              <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
              <p className="text-xs text-primary-600 font-mono mt-1">{opt.eg}</p>
            </label>
          ))}
        </div>
      </div>

      {/* Serial config */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">
            {form.ref_type === 'serial' ? 'Prefix' : 'Default Prefix (fallback)'}
          </label>
          <input
            className="input font-mono uppercase"
            maxLength={8}
            placeholder="VIS"
            value={form.ref_prefix}
            onChange={e => setForm(f => ({ ...f, ref_prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'') }))}
          />
        </div>
        <div>
          <label className="label">Number Digits</label>
          <select className="input" value={form.ref_padding}
            onChange={e => setForm(f => ({ ...f, ref_padding: parseInt(e.target.value) }))}>
            {[3,4,5,6].map(n => (
              <option key={n} value={n}>{n} digits — {String('1').padStart(n,'0')} to {'9'.repeat(n)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
        <span className="text-gray-400 text-sm">Preview:</span>
        <code className="text-lg font-bold text-primary-600 tracking-wider">{preview}</code>
        <span className="text-gray-300 text-sm">→</span>
        <code className="text-lg font-bold text-primary-600 tracking-wider">
          {`${(form.ref_prefix||'VIS').toUpperCase()}-${'2'.padStart(form.ref_padding,'0')}`}
        </code>
      </div>

      {/* Serial counter reset */}
      {form.ref_type === 'serial' && (
        <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div>
            <p className="text-sm font-medium text-yellow-800">Current Counter: {profile.ref_counter || 0}</p>
            <p className="text-xs text-yellow-600 mt-0.5">Last generated: {
              profile.ref_counter > 0
                ? `${(profile.ref_prefix||'VIS').toUpperCase()}-${String(profile.ref_counter).padStart(profile.ref_padding||4,'0')}`
                : 'None yet'
            }</p>
          </div>
          <button type="button"
            onClick={() => resetCounter('company', null, 'Global Counter')}
            disabled={resetting === 'company'}
            className="text-xs px-3 py-1.5 rounded-lg bg-yellow-200 text-yellow-800 hover:bg-yellow-300 disabled:opacity-50">
            {resetting === 'company' ? 'Resetting…' : 'Reset to 0'}
          </button>
        </div>
      )}

      {/* Service-wise prefixes */}
      {form.ref_type === 'service' && services.length > 0 && (
        <div>
          <label className="label mb-2">Service Prefixes</label>
          <div className="space-y-2">
            {services.map(s => (
              <div key={s.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-xl shrink-0">{s.icon}</span>
                <span className="flex-1 text-sm font-medium text-gray-700">{s.name}</span>
                <input
                  className="input w-28 font-mono uppercase text-sm"
                  maxLength={8}
                  placeholder={form.ref_prefix || 'VIS'}
                  value={svcPrefixes[s.id] || ''}
                  onChange={e => setSvcPrefixes(p => ({
                    ...p,
                    [s.id]: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')
                  }))}
                />
                <code className="text-xs text-primary-600 font-mono w-24 text-right">
                  {(svcPrefixes[s.id] || form.ref_prefix || 'VIS').toUpperCase()}-{'1'.padStart(form.ref_padding,'0')}
                </code>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">#{s.ref_counter || 0}</p>
                  <button type="button"
                    onClick={() => resetCounter('service', s.id, s.name)}
                    disabled={resetting === s.id}
                    className="text-[10px] text-yellow-700 hover:text-yellow-900 underline">
                    {resetting === s.id ? 'Resetting…' : 'Reset'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {services.length === 0 && (
            <p className="text-sm text-gray-400">No services yet. Go to the Services page to create some.</p>
          )}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save Reference Settings'}
        </button>
      </div>
    </form>
  );
}

function copyText(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied!'));
  } else {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    toast.success('Copied!');
  }
}

function KioskTab({ profile, kioskUrl }) {
  const baseDisplayUrl = `${window.location.origin}/display/${profile.slug}`;

  const SCREENS_KEY = `tv_screens_${profile.slug}`;
  // screens: [{ name: string, services: string[] }]
  const [screens, setScreens] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(SCREENS_KEY) || '[]');
      // migrate old format (plain strings) to objects
      return raw.map(s => typeof s === 'string' ? { name: s, services: [] } : s);
    } catch { return []; }
  });
  const [newScreen, setNewScreen]   = useState('');
  const [editingIdx, setEditingIdx] = useState(null); // which screen is expanded for editing
  const [services, setServices]     = useState([]);   // all company services

  useEffect(() => {
    api.get('/services').then(({ data }) => setServices(data.map(s => s.name))).catch(() => {});
  }, []);

  function saveScreens(updated) {
    setScreens(updated);
    localStorage.setItem(SCREENS_KEY, JSON.stringify(updated));
  }

  function addScreen() {
    const name = newScreen.trim();
    if (!name || screens.some(s => s.name === name)) return;
    saveScreens([...screens, { name, services: [] }]);
    setNewScreen('');
  }

  function removeScreen(idx) {
    const updated = screens.filter((_, i) => i !== idx);
    saveScreens(updated);
    if (editingIdx === idx) setEditingIdx(null);
  }

  function toggleService(idx, svc) {
    const screen = screens[idx];
    const has = screen.services.includes(svc);
    const updated = screens.map((s, i) => i !== idx ? s : {
      ...s, services: has ? s.services.filter(x => x !== svc) : [...s.services, svc],
    });
    saveScreens(updated);
  }

  function screenUrl(sc) {
    let url = `${baseDisplayUrl}?screen=${encodeURIComponent(sc.name)}`;
    if (sc.services.length > 0) url += `&services=${encodeURIComponent(sc.services.join(','))}`;
    return url;
  }

  function downloadPNG() {
    // Use the hidden high-res canvas (600px) for PNG export
    const canvas = document.getElementById('qr-canvas-hires');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitor-qr-${profile.slug}.png`;
    a.click();
    toast.success('QR code downloaded as PNG');
  }

  function printQR() {
    const canvas = document.getElementById('qr-canvas-hires');
    const imgSrc = canvas.toDataURL('image/png');
    const win = window.open('', '_blank', 'width=600,height=700');
    win.document.write(`
      <!DOCTYPE html><html>
      <head>
        <title>Visitor QR Code — ${profile.name}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; display: flex; align-items: center;
                 justify-content: center; min-height: 100vh; background: #fff; }
          .card { border: 2px solid #e5e7eb; border-radius: 20px; padding: 40px 48px;
                  display: flex; flex-direction: column; align-items: center; gap: 16px;
                  max-width: 420px; text-align: center; }
          img  { width: 260px; height: 260px; display: block; }
          h1   { font-size: 24px; font-weight: 700; color: #111827; }
          p    { font-size: 14px; color: #6b7280; line-height: 1.5; }
          .url { font-size: 11px; color: #9ca3af; word-break: break-all; margin-top: 4px; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <img src="${imgSrc}" alt="Visitor QR Code" />
          <h1>${profile.name}</h1>
          <p>Scan this QR code to register your visit</p>
          <p class="url">${kioskUrl}</p>
        </div>
        <script>window.onload = () => { window.focus(); window.print(); }<\/script>
      </body></html>`);
    win.document.close();
  }

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-base font-semibold">Visitor Kiosk &amp; QR Code</h2>
        <p className="text-sm text-gray-500 mt-1">Download or print your QR code to place at reception.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-8 items-start">
        {/* Visible QR preview */}
        <div className="flex flex-col items-center gap-3 bg-white border-2 border-gray-200 rounded-2xl p-6 shrink-0">
          <QRCodeSVG value={kioskUrl} size={180} level="H" includeMargin={false}
            {...(profile.logo_url ? { imageSettings: { src: profile.logo_url, height: 36, width: 36, excavate: true } } : {})} />
          <p className="text-xs font-semibold text-gray-700 text-center max-w-[180px]">{profile.name}</p>
          <p className="text-[10px] text-gray-400">Scan to check in</p>
        </div>

        {/* Hidden high-res canvas for PNG export (600×600) */}
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <QRCodeCanvas
            id="qr-canvas-hires"
            value={kioskUrl}
            size={600}
            level="H"
            includeMargin={true}
            {...(profile.logo_url ? { imageSettings: { src: profile.logo_url, height: 120, width: 120, excavate: true } } : {})}
          />
        </div>

        <div className="flex-1 space-y-4">
          {/* Kiosk URL */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Kiosk URL <span className="text-gray-400 font-normal">(tablet at reception)</span></p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-50 border rounded-lg px-3 py-2 text-gray-700 break-all">{kioskUrl}</code>
              <button type="button" onClick={() => copyText(kioskUrl)} className="btn-secondary text-xs py-2 px-3 shrink-0">Copy</button>
            </div>
            <div className="flex gap-2 mt-2">
              <a href={kioskUrl} target="_blank" rel="noreferrer" className="btn-primary text-xs py-1.5 px-3">Open Kiosk ↗</a>
              <button type="button" onClick={downloadPNG} className="btn-secondary text-xs py-1.5 px-3">⬇ Download PNG</button>
              <button type="button" onClick={printQR} className="btn-secondary text-xs py-1.5 px-3">🖨 Print</button>
            </div>
          </div>

          {/* TV Screens */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-500">
                TV Screens <span className="text-gray-400 font-normal">(each screen can show different services)</span>
              </p>
            </div>

            {/* Default screen */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">📺 Default <span className="text-gray-400 font-normal">(shows all services)</span></span>
                <div className="flex-1" />
                <button type="button" onClick={() => copyText(baseDisplayUrl)} className="btn-secondary text-xs py-1 px-2">Copy</button>
                <a href={baseDisplayUrl} target="_blank" rel="noreferrer" className="btn-primary text-xs py-1 px-2">Open ↗</a>
              </div>
              <code className="mt-2 block text-[10px] text-gray-400 break-all">{baseDisplayUrl}</code>
            </div>

            {/* Named screens */}
            {screens.map((sc, idx) => (
              <div key={sc.name} className="rounded-xl border border-indigo-100 bg-white p-3 mb-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-800 flex-1 truncate">📺 {sc.name}</span>
                  <button type="button" onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50">
                    {editingIdx === idx ? 'Done' : 'Select Services'}
                  </button>
                  <button type="button" onClick={() => copyText(screenUrl(sc))} className="btn-secondary text-xs py-1 px-2">Copy</button>
                  <a href={screenUrl(sc)} target="_blank" rel="noreferrer" className="btn-primary text-xs py-1 px-2">Open ↗</a>
                  <button type="button" onClick={() => removeScreen(idx)} className="text-red-400 hover:text-red-600 text-xs p-1" title="Remove">✕</button>
                </div>

                {/* Service filter chips */}
                {editingIdx === idx && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {services.length === 0
                      ? <p className="text-xs text-gray-400">No services found. Add services in the Services section first.</p>
                      : <>
                          <p className="text-[11px] text-gray-500 mb-2">Select which services appear on this TV. Leave all unchecked to show everything.</p>
                          <div className="flex flex-wrap gap-2">
                            {services.map(svc => {
                              const active = sc.services.includes(svc);
                              return (
                                <button key={svc} type="button"
                                  onClick={() => toggleService(idx, svc)}
                                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                                    active ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-400'
                                  }`}>
                                  {svc}
                                </button>
                              );
                            })}
                          </div>
                        </>
                    }
                  </div>
                )}

                <div className="mt-2">
                  {sc.services.length > 0
                    ? <div className="flex flex-wrap gap-1 mb-1">
                        {sc.services.map(s => <span key={s} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{s}</span>)}
                      </div>
                    : <p className="text-[10px] text-gray-400 mb-1">All services</p>
                  }
                  <code className="text-[10px] text-gray-400 break-all">{screenUrl(sc)}</code>
                </div>
              </div>
            ))}

            {/* Add new screen */}
            <div className="flex gap-2 mt-3">
              <input
                className="input text-xs py-2 flex-1"
                placeholder="Screen name, e.g. Floor 1, Reception…"
                value={newScreen}
                onChange={e => setNewScreen(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addScreen()}
              />
              <button type="button" onClick={addScreen} className="btn-secondary text-xs py-2 px-3 whitespace-nowrap">+ Add Screen</button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            <strong>How to use:</strong>
            <ul className="mt-1.5 space-y-1 list-disc list-inside text-xs">
              <li><strong>Kiosk URL</strong> — open on a tablet at reception for visitor self check-in</li>
              <li><strong>TV Screens</strong> — create one per TV, select services, copy URL to that TV</li>
              <li><strong>Download / Print</strong> — high-res QR code for printing and placing at reception</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable logo upload component.
 * uploadUrl: API path (relative), e.g. "/companies/me/logo"
 */
function LogoUploader({ currentUrl, label, uploadUrl, onUploaded }) {
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
      const res = await fetch(`/api${uploadUrl}`, {
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
    <div className="card flex items-center gap-5">
      {/* Preview */}
      <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden shrink-0 bg-gray-50">
        {currentUrl
          ? <img src={currentUrl} alt="Logo" className="w-full h-full object-contain p-1" />
          : <span className="text-3xl">🏢</span>
        }
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, SVG — max 2 MB</p>
        <div className="flex gap-2 mt-2">
          <button type="button" onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary text-xs py-1.5 px-3">
            {uploading ? 'Uploading…' : currentUrl ? 'Change Logo' : 'Upload Logo'}
          </button>
          {currentUrl && (
            <a href={currentUrl} target="_blank" rel="noreferrer"
              className="btn-secondary text-xs py-1.5 px-3">View</a>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}
