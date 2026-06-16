import { useEffect, useState, useMemo } from 'react';
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

  // Fetch stats + preset chart data once
  useEffect(() => {
    Promise.all([
      api.get('/companies/me/stats'),
      api.get('/companies/me/charts'),
    ]).then(([s, c]) => {
      setStats(s.data);
      setPreset(c.data);
    }).finally(() => setLoading(false));
  }, []);

  // Fetch custom chart data when custom period + valid dates
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
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
          {/* Stat cards — always current, not period-filtered */}
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
              {/* Trend bar chart (2 cols) */}
              <div className="xl:col-span-2 card">
                <div className="mb-4">
                  <h2 className="text-base font-semibold text-gray-900">Visits Trend</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{periodLabel}</p>
                </div>
                {seriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={seriesData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                             interval={xAxisInterval} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<BarTooltip />} />
                      <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 py-10 text-center">No visit data for this period</p>
                )}
              </div>

              {/* Service pie chart */}
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
    </div>
  );
}
