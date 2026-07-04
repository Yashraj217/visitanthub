import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

const STATUS_STYLE = {
  pending:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  confirmed: 'bg-green-100  text-green-700  border-green-200',
  cancelled: 'bg-red-100    text-red-700    border-red-200',
  checked_in:'bg-blue-100   text-blue-700   border-blue-200',
  no_show:   'bg-gray-100   text-gray-500   border-gray-200',
};

const DOT_COLOR = {
  pending:   'bg-yellow-400',
  confirmed: 'bg-green-500',
  cancelled: 'bg-red-400',
  checked_in:'bg-blue-500',
  no_show:   'bg-gray-400',
};

function fmt12(time24) {
  if (!time24) return '—';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d} ${MONTHS[parseInt(m) - 1]} ${y}`;
}

export default function MySchedule() {
  const { user } = useAuth();
  const now = new Date();

  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null); // 'YYYY-MM-DD'
  const [view,     setView]     = useState('calendar'); // 'calendar' | 'list'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/scheduling/my-schedule', { params: { year, month } });
      setBookings(data);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  // Group by date string 'YYYY-MM-DD'
  const byDate = bookings.reduce((acc, b) => {
    const d = b.scheduled_date?.slice(0, 10);
    if (!acc[d]) acc[d] = [];
    acc[d].push(b);
    return acc;
  }, {});

  // Build calendar grid
  const firstDay  = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelected(null);
  }

  function dayKey(d) {
    return `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const selectedBookings = selected ? (byDate[selected] || []) : [];

  const sidebarColor = user?.company_sidebar_color || '#4f46e5';

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Schedule</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your upcoming appointments</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('calendar')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'calendar' ? 'text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
            style={view === 'calendar' ? { backgroundColor: sidebarColor } : {}}>
            Calendar
          </button>
          <button onClick={() => setView('list')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'list' ? 'text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
            style={view === 'list' ? { backgroundColor: sidebarColor } : {}}>
            List
          </button>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-gray-800">
          {MONTHS[month - 1]} {year}
        </h2>
        <button onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : view === 'calendar' ? (
        <>
          {/* Calendar grid */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAYS.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {d}
                </div>
              ))}
            </div>

            {/* Date cells */}
            <div className="grid grid-cols-7">
              {cells.map((d, i) => {
                if (!d) return <div key={`empty-${i}`} className="min-h-[72px] border-b border-r border-gray-50 bg-gray-50/50" />;
                const key = dayKey(d);
                const dayBookings = byDate[key] || [];
                const isToday     = key === todayKey;
                const isSelected  = key === selected;

                return (
                  <button key={key}
                    onClick={() => setSelected(isSelected ? null : key)}
                    className={`min-h-[72px] p-1.5 text-left border-b border-r border-gray-100 transition-colors hover:bg-indigo-50/50 ${
                      isSelected ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-400' : ''
                    }`}>
                    <span className={`inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full mb-1 ${
                      isToday ? 'text-white' : 'text-gray-700'
                    }`}
                      style={isToday ? { backgroundColor: sidebarColor } : {}}>
                      {d}
                    </span>
                    {/* Status dots */}
                    <div className="flex flex-wrap gap-0.5">
                      {dayBookings.slice(0, 4).map(b => (
                        <span key={b.id} className={`w-2 h-2 rounded-full ${DOT_COLOR[b.status] || 'bg-gray-400'}`} />
                      ))}
                      {dayBookings.length > 4 && (
                        <span className="text-[10px] text-gray-400 leading-none">+{dayBookings.length - 4}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected day appointments */}
          {selected && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {fmtDate(selected)} — {selectedBookings.length} appointment{selectedBookings.length !== 1 ? 's' : ''}
              </h3>
              {selectedBookings.length === 0 ? (
                <p className="text-sm text-gray-400 bg-white rounded-xl p-4 border border-gray-100">No appointments on this day.</p>
              ) : (
                <div className="space-y-2">
                  {selectedBookings.map(b => <AppointmentCard key={b.id} b={b} />)}
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
            {Object.entries(DOT_COLOR).map(([status, cls]) => (
              <span key={status} className="flex items-center gap-1.5 capitalize">
                <span className={`w-2.5 h-2.5 rounded-full ${cls}`} />
                {status.replace('_', ' ')}
              </span>
            ))}
          </div>
        </>
      ) : (
        /* List view */
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-gray-500 text-sm">No appointments in {MONTHS[month - 1]} {year}.</p>
            </div>
          ) : (
            bookings.map(b => <AppointmentCard key={b.id} b={b} showDate />)
          )}
        </div>
      )}
    </div>
  );
}

function AppointmentCard({ b, showDate }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Time block */}
      <div className="shrink-0 w-20 text-center">
        <p className="text-lg font-bold text-gray-800">{fmt12(b.scheduled_time?.slice(0,5))}</p>
        {showDate && <p className="text-xs text-gray-400 mt-0.5">{fmtDate(b.scheduled_date?.slice(0,10))}</p>}
      </div>

      <div className="w-px bg-gray-100 self-stretch hidden sm:block" />

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-800 truncate">{b.visitor_name}</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLE[b.status] || 'bg-gray-100 text-gray-500'}`}>
            {b.status?.replace('_', ' ')}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-0.5 truncate">
          {b.visitor_mobile}
          {b.service_name ? ` · ${b.service_name}` : ''}
        </p>
        {b.purpose && <p className="text-xs text-gray-400 mt-1 truncate">{b.purpose}</p>}
        {b.admin_notes && (
          <p className="text-xs text-indigo-600 mt-1 truncate">Note: {b.admin_notes}</p>
        )}
      </div>

      {/* Ref */}
      <div className="shrink-0 text-right">
        <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{b.booking_ref}</span>
      </div>
    </div>
  );
}
