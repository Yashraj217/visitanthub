import { useEffect, useState, useMemo } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import WelcomeModal from '../../components/WelcomeModal';
import { todayInTz } from '../../utils/tz';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';

const STATUS_COLORS = {
  pending:   '#f59e0b',
  approved:  '#22c55e',
  completed: '#6366f1',
  rejected:  '#ef4444',
};

const PERIODS = [
  { key: 'daily',      label: 'Daily'       },
  { key: 'weekly',     label: 'Weekly'      },
  { key: 'monthly',    label: 'Monthly'     },
  { key: 'quarterly',  label: 'Quarterly'   },
  { key: 'halfYearly', label: 'Half-Yearly' },
  { key: 'yearly',     label: 'Yearly'      },
  { key: 'custom',     label: 'Custom'      },
];

function StatBadge({ label, value, color }) {
  return (
    <div className="card flex items-center gap-3 py-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + '20' }}>
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 capitalize">{label}</p>
      </div>
    </div>
  );
}

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-xs space-y-1">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.fill }} />
          <span className="capitalize text-gray-600">{p.dataKey}</span>
          <span className="font-semibold text-gray-800 ml-auto pl-4">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-xs">
      <span className="capitalize font-medium text-gray-700">{name}</span>
      <span className="ml-2 font-bold text-gray-900">{value}</span>
    </div>
  );
}

function PieLegend({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      {data.map(d => (
        <div key={d.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[d.name] }} />
          <span className="text-xs text-gray-600 capitalize truncate">{d.name}</span>
          <span className="ml-auto text-xs font-semibold text-gray-800 shrink-0">
            {d.value} <span className="text-gray-400">({Math.round(d.value / total * 100)}%)</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Appointments drawer for associates (with approve/reject) ───────────────── */
function TodayApptDrawer({ open, onClose, appointments, onAction }) {
  const [acting, setActing] = useState({});

  async function act(id, status) {
    setActing(p => ({ ...p, [id]: status }));
    try {
      await api.put(`/scheduling/bookings/${id}`, { status });
      onAction(id, status);
    } catch {
      // leave card on failure
    } finally {
      setActing(p => { const n = { ...p }; delete n[id]; return n; });
    }
  }

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">My Scheduled Appointments</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {appointments.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-sm text-gray-500">No pending appointments</p>
            </div>
          )}
          {appointments.map(a => (
            <div key={a.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-semibold text-gray-900">{a.visitor_name}</p>
                <div className="text-right shrink-0">
                  <span className="block text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                    {a.scheduled_time?.slice(0, 5)}
                  </span>
                  <span className="block text-sm font-semibold text-gray-700 mt-1">
                    {new Date(a.scheduled_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-1">{a.visitor_mobile}</p>
              <p className="text-xs text-gray-600 mb-1">
                <span className="font-medium">Service:</span> {a.service_name}
              </p>
              {a.purpose && (
                <p className="text-xs text-gray-500 italic mb-2">{a.purpose}</p>
              )}
              {a.status === 'pending' ? (
                <div className="flex gap-2 mt-3">
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
              ) : (
                <span className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  Confirmed
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ── Main dashboard ─────────────────────────────────────────────────────────── */
export default function UserDashboard() {
  const { user } = useAuth();
  const companyTz = user?.company_timezone || 'UTC';

  const today = todayInTz(companyTz);
  const defaultFrom = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d - 6)).toLocaleDateString('en-CA', { timeZone: companyTz });
  }, [today, companyTz]);

  const [presetData, setPresetData]       = useState(null);
  const [customData, setCustomData]       = useState(null);
  const [loading, setLoading]             = useState(true);
  const [customLoading, setCustomLoading] = useState(false);
  const [period, setPeriod]               = useState('monthly');
  const [customFrom, setCustomFrom]       = useState(defaultFrom);
  const [customTo, setCustomTo]           = useState(today);
  const [todayAppts, setTodayAppts]       = useState([]);
  const [apptOpen, setApptOpen]           = useState(false);

  // Fetch all preset period data once
  useEffect(() => {
    api.get('/visits/my-charts')
      .then(({ data }) => setPresetData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch all pending/confirmed appointments for this associate (any date)
  useEffect(() => {
    if (!user?.employee_id) return;
    api.get('/scheduling/bookings', {
      params: { employee_id: user.employee_id },
    })
      .then(({ data }) => setTodayAppts(data.filter(a => ['pending', 'confirmed'].includes(a.status))))
      .catch(() => {});
  }, [user?.employee_id]);

  // Fetch custom range data whenever period=custom and valid dates are set
  useEffect(() => {
    if (period !== 'custom' || !customFrom || !customTo || customFrom > customTo) return;
    setCustomLoading(true);
    setCustomData(null);
    api.get('/visits/my-charts', { params: { from: customFrom, to: customTo } })
      .then(({ data }) => setCustomData(data))
      .catch(() => {})
      .finally(() => setCustomLoading(false));
  }, [period, customFrom, customTo]);

  const activeData  = period === 'custom' ? customData : presetData;
  const seriesData  = activeData?.[period] ?? [];

  const periodStatus = ['pending', 'approved', 'completed', 'rejected'].map(name => ({
    name,
    value: seriesData.reduce((sum, row) => sum + (row[name] || 0), 0),
  }));
  const total = periodStatus.reduce((s, d) => s + d.value, 0);

  const isLoading = loading || (period === 'custom' && customLoading);

  const xAxisInterval = period === 'daily' ? 4
    : period === 'custom' ? Math.max(0, Math.floor(seriesData.length / 7) - 1)
    : 0;

  const periodLabel = period === 'custom'
    ? (customFrom && customTo ? `${customFrom} – ${customTo}` : 'Custom range')
    : PERIODS.find(p => p.key === period)?.label;

  const pendingCount   = todayAppts.filter(a => a.status === 'pending').length;
  const confirmedCount = todayAppts.filter(a => a.status === 'confirmed').length;

  return (
    <div className="p-4 sm:p-8">
      <WelcomeModal role="associate" userId={user?.id} companyName={user?.company_name} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your visitor appointments</p>
        </div>

        {/* Global period selector + custom date inputs */}
        <div className="flex flex-col gap-2 items-end">
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
      </div>

      {/* Today's appointments banner */}
      {todayAppts.length > 0 && (
        <button
          onClick={() => setApptOpen(true)}
          className="w-full text-left mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors">
          <span className="text-2xl">📅</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-900">
              You have {todayAppts.length} scheduled appointment{todayAppts.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">
              {confirmedCount > 0 && `${confirmedCount} confirmed`}
              {confirmedCount > 0 && pendingCount > 0 && ' · '}
              {pendingCount > 0 && `${pendingCount} awaiting approval`}
            </p>
          </div>
          <span className="text-indigo-400 text-sm shrink-0">View →</span>
        </button>
      )}

      {isLoading ? (
        <div className="text-gray-400 py-12 text-center">Loading…</div>
      ) : (
        <>
          {/* Status summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {periodStatus.map(s => (
              <StatBadge key={s.name} label={s.name} value={s.value} color={STATUS_COLORS[s.name]} />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            {/* Status pie chart */}
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-2">Status Breakdown</h2>
              <p className="text-xs text-gray-400 mb-4">
                {total} total · {periodLabel}
              </p>
              {total > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={periodStatus} dataKey="value" nameKey="name"
                           cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={2}>
                        {periodStatus.map((d) => (
                          <Cell key={d.name} fill={STATUS_COLORS[d.name]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <PieLegend data={periodStatus} />
                </>
              ) : (
                <p className="text-sm text-gray-400 py-10 text-center">No visits for this period</p>
              )}
            </div>

            {/* Bar chart (2 cols) */}
            <div className="xl:col-span-2 card">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-900">Visitors by Period</h2>
                <p className="text-xs text-gray-400 mt-0.5">{periodLabel}</p>
              </div>

              {seriesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={seriesData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                           interval={xAxisInterval} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={v => <span className="capitalize">{v}</span>} />
                    {['pending','approved','completed','rejected'].map(s => (
                      <Bar key={s} dataKey={s} stackId="a" fill={STATUS_COLORS[s]}
                           radius={s === 'rejected' ? [4,4,0,0] : [0,0,0,0]}
                           maxBarSize={36} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 py-10 text-center">No visit data for this period</p>
              )}
            </div>
          </div>
        </>
      )}

      <TodayApptDrawer
        open={apptOpen}
        onClose={() => setApptOpen(false)}
        appointments={todayAppts}
        onAction={(id, status) => {
          if (status === 'cancelled') {
            setTodayAppts(prev => prev.filter(a => a.id !== id));
          } else {
            setTodayAppts(prev => prev.map(a => a.id === id ? { ...a, status: 'confirmed' } : a));
          }
        }}
      />
    </div>
  );
}
