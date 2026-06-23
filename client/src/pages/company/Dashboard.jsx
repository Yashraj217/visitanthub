import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { formatInTz, todayInTz } from '../../utils/tz';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const STATUS_CLASS = s => ({ pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected', completed: 'badge-completed' }[s] || 'badge-inactive');
const PIE_COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#14b8a6','#8b5cf6','#f97316','#06b6d4'];

const PERIODS = [
  { key: 'daily',      label: 'Daily'       },
  { key: 'weekly',     label: 'Weekly'      },
  { key: 'monthly',    label: 'Monthly'     },
  { key: 'quarterly',  label: 'Quarterly'   },
  { key: 'halfYearly', label: 'Half-Yearly' },
  { key: 'yearly',     label: 'Yearly'      },
  { key: 'custom',     label: 'Custom'      },
];

function StatCard({ label, value, color, link }) {
  return (
    <Link to={link} className="card hover:shadow-md transition-shadow flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shrink-0`}>
        <span className="text-white text-xl font-bold">{value ?? 0}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </Link>
  );
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-sm">
      <p className="font-medium text-gray-700">{label}</p>
      <p className="text-indigo-600 font-semibold">{payload[0].value} visits</p>
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-xs">
      <span className="font-medium text-gray-700">{name}</span>
      <span className="ml-2 font-bold text-gray-900">{value} visits</span>
    </div>
  );
}

/* ── Appointments side-drawer ──────────────────────────────────────────────── */
function AppointmentsDrawer({ open, onClose, today, companyTz }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [acting, setActing]             = useState({});

  const load = useCallback(() => {
    if (!open) return;
    setLoading(true);
    api.get('/scheduling/bookings', { params: { status: 'pending' } })
      .then(({ data }) => setAppointments(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => { load(); }, [load]);

  async function act(id, status) {
    setActing(p => ({ ...p, [id]: status }));
    try {
      await api.put(`/scheduling/bookings/${id}`, { status });
      setAppointments(prev => prev.filter(a => a.id !== id));
    } catch {
      // leave in list on failure
    } finally {
      setActing(p => { const n = { ...p }; delete n[id]; return n; });
    }
  }

  if (!open) return null;

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Pending Appointments</h2>
            <p className="text-xs text-gray-500 mt-0.5">All appointments awaiting approval</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading && (
            <p className="text-sm text-gray-400 text-center py-10">Loading…</p>
          )}
          {!loading && appointments.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-sm text-gray-500">No pending appointments for today</p>
            </div>
          )}
          {appointments.map(a => (
            <div key={a.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{a.visitor_name}</p>
                  <p className="text-xs text-gray-500">{a.visitor_mobile}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="block text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                    {a.scheduled_time?.slice(0, 5)}
                  </span>
                  <span className="block text-sm font-semibold text-gray-700 mt-1">
                    {new Date(a.scheduled_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-1">
                <span className="font-medium">Service:</span> {a.service_name}
              </p>
              {a.employee_name && (
                <p className="text-xs text-gray-600 mb-3">
                  <span className="font-medium">Associate:</span> {a.employee_name}
                  {a.designation ? ` · ${a.designation}` : ''}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  disabled={!!acting[a.id]}
                  onClick={() => act(a.id, 'confirmed')}
                  className="flex-1 text-sm font-semibold py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50">
                  {acting[a.id] === 'confirmed' ? 'Approving…' : 'Approve'}
                </button>
                <button
                  disabled={!!acting[a.id]}
                  onClick={() => act(a.id, 'cancelled')}
                  className="flex-1 text-sm font-semibold py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50">
                  {acting[a.id] === 'cancelled' ? 'Rejecting…' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ── Main dashboard ─────────────────────────────────────────────────────────── */
export default function CompanyDashboard() {
  const { user } = useAuth();
  const companyTz = user?.company_timezone || 'UTC';

  const today = todayInTz(companyTz);
  const defaultFrom = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d - 6)).toLocaleDateString('en-CA', { timeZone: companyTz });
  }, [today, companyTz]);

  const [stats, setStats]           = useState(null);
  const [presetCharts, setPreset]   = useState(null);
  const [customCharts, setCustom]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [customLoading, setCustomLoading] = useState(false);
  const [period, setPeriod]         = useState('monthly');
  const [customFrom, setCustomFrom] = useState(defaultFrom);
  const [customTo, setCustomTo]     = useState(today);
  const [pendingApptCount, setPendingApptCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/companies/me/stats'),
      api.get('/companies/me/charts'),
    ]).then(([s, c]) => {
      setStats(s.data);
      setPreset(c.data);
    }).finally(() => setLoading(false));
  }, []);

  // Fetch count of all pending appointments (any date) for the badge
  useEffect(() => {
    api.get('/scheduling/bookings', { params: { status: 'pending' } })
      .then(({ data }) => setPendingApptCount(data.length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (period !== 'custom' || !customFrom || !customTo || customFrom > customTo) return;
    setCustomLoading(true);
    setCustom(null);
    api.get('/companies/me/charts', { params: { from: customFrom, to: customTo } })
      .then(({ data }) => setCustom(data))
      .catch(() => {})
      .finally(() => setCustomLoading(false));
  }, [period, customFrom, customTo]);

  const activeCharts  = period === 'custom' ? customCharts : presetCharts;
  const seriesData    = activeCharts?.[period] ?? [];
  const servicesData  = period === 'custom'
    ? (activeCharts?.services ?? [])
    : (activeCharts?.services?.[period] ?? []);

  const xAxisInterval = period === 'daily' || period === 'custom'
    ? Math.max(0, Math.floor(seriesData.length / 7) - 1)
    : 0;

  const periodLabel = period === 'custom'
    ? (customFrom && customTo ? `${customFrom} – ${customTo}` : 'Custom range')
    : PERIODS.find(p => p.key === period)?.label;

  const isLoading = loading || (period === 'custom' && customLoading);
  const kiosk = `${window.location.origin}/visit/${user?.company_slug}`;

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 rounded-xl border border-gray-200 cursor-pointer" title="Go to Settings for full QR code">
            <Link to="/dashboard/settings"><QRCodeSVG value={kiosk} size={56} level="M" includeMargin={false} /></Link>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-1">Visitor Kiosk URL</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg text-gray-700 max-w-xs truncate">{kiosk}</code>
              <button onClick={() => navigator.clipboard.writeText(kiosk)} className="text-xs btn-secondary py-1.5 px-3">Copy</button>
              <a href={kiosk} target="_blank" rel="noreferrer" className="text-xs btn-primary py-1.5 px-3">Open</a>
            </div>
          </div>
        </div>
      </div>

      {/* Appointments tab — shown below title, above period filter */}
      <button
        onClick={() => setDrawerOpen(true)}
        className={`inline-flex items-center gap-2 mb-6 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
          pendingApptCount > 0
            ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
        }`}>
        <span className="text-base">📅</span>
        <span>Pending Appointments</span>
        {pendingApptCount > 0 && (
          <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {pendingApptCount} pending
          </span>
        )}
        {pendingApptCount === 0 && (
          <span className="text-gray-400 text-xs">none pending</span>
        )}
        <span className="text-gray-400 ml-1">→</span>
      </button>

      {/* Global period filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6">
        <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                period === p.key
                  ? 'bg-white shadow text-indigo-600 font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              max={customTo || today}
              className="input py-1 text-xs" />
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              min={customFrom} max={today}
              className="input py-1 text-xs" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Today's Visits"    value={stats?.today_visits}    color="bg-blue-500"   link="/dashboard/visits" />
            <StatCard label="Pending"           value={stats?.pending_visits}  color="bg-yellow-500" link="/dashboard/visits?status=pending" />
            <StatCard label="Total Visits"      value={stats?.total_visits}    color="bg-indigo-500" link="/dashboard/visits" />
            <StatCard label="Active Associates" value={stats?.total_employees} color="bg-green-500"  link="/dashboard/employees" />
          </div>

          {/* Charts */}
          {isLoading ? (
            <div className="text-gray-400 py-10 text-center">Loading chart data…</div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
              <div className="xl:col-span-2 card">
                <div className="mb-4">
                  <h2 className="text-base font-semibold text-gray-900">Visits Trend</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{periodLabel}</p>
                </div>
                {seriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={seriesData}
                      margin={{ top: 4, right: 8, left: -20, bottom: period === 'weekly' ? 16 : 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false}
                             interval={xAxisInterval}
                             tick={period === 'weekly'
                               ? { fontSize: 10, angle: -40, textAnchor: 'end', dy: 4 }
                               : { fontSize: 11 }}
                             height={period === 'weekly' ? 48 : 30} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<BarTooltip />} />
                      <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 py-10 text-center">No visit data for this period</p>
                )}
              </div>

              <div className="card">
                <h2 className="text-base font-semibold text-gray-900 mb-1">By Service</h2>
                <p className="text-xs text-gray-400 mb-4">{periodLabel}</p>
                {servicesData.length ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={servicesData} dataKey="count" nameKey="name"
                             cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2}>
                          {servicesData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-3">
                      {servicesData.map((s, i) => (
                        <div key={s.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-gray-600 truncate">{s.name}</span>
                          </div>
                          <span className="font-medium text-gray-800 shrink-0 ml-2">
                            {s.count} <span className="text-gray-400">({s.pct}%)</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">No data for this period</p>
                )}
              </div>
            </div>
          )}

          {/* Recent visits */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Visits</h2>
              <Link to="/dashboard/visits" className="text-sm text-primary-600 hover:underline">View all</Link>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-3 font-medium text-gray-500">Visitor</th>
                  <th className="pb-3 font-medium text-gray-500">Mobile</th>
                  <th className="pb-3 font-medium text-gray-500">Associate</th>
                  <th className="pb-3 font-medium text-gray-500">Time</th>
                  <th className="pb-3 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recent_visits?.map(v => (
                  <tr key={v.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{v.visitor_name}</td>
                    <td className="py-3 text-gray-500">{v.mobile}</td>
                    <td className="py-3">{v.employee_name}</td>
                    <td className="py-3 text-gray-500">{formatInTz(v.visit_time, companyTz)}</td>
                    <td className="py-3"><span className={STATUS_CLASS(v.status)}>{v.status}</span></td>
                  </tr>
                ))}
                {!stats?.recent_visits?.length && (
                  <tr><td colSpan={5} className="py-6 text-center text-gray-400">No visits yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Appointments side drawer */}
      <AppointmentsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        today={today}
        companyTz={companyTz}
      />
    </div>
  );
}
