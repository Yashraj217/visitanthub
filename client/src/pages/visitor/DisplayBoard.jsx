import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../services/api';

const REFRESH_INTERVAL = 10_000;
const PAGE_INTERVAL    = 15_000;
const PAGE_SIZE        = 3;
const STORAGE_KEY = slug => `display_services_${slug}`;

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-right shrink-0">
      <p className="text-base font-mono font-bold leading-none tracking-tight">
        {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
      </p>
      <p className="text-xs opacity-60 mt-0.5">
        {now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
      </p>
    </div>
  );
}

function ServiceSetup({ services, selected, onSave, onCancel }) {
  const [picked, setPicked] = useState(new Set(selected));
  function toggle(name) {
    setPicked(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
  }
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-white text-lg font-bold mb-1">Configure Display</h2>
        <p className="text-gray-400 text-sm mb-4">Choose which services appear on this board</p>
        <div className="space-y-2 mb-5 max-h-64 overflow-y-auto pr-1">
          {services.length === 0 && <p className="text-gray-600 text-sm text-center py-4">No services in today's visits yet</p>}
          {services.map(name => (
            <label key={name} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800 cursor-pointer">
              <input type="checkbox" checked={picked.has(name)} onChange={() => toggle(name)} className="w-4 h-4 accent-green-500" />
              <span className="text-white text-sm">{name}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => onSave([...picked])}
            className="flex-1 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold">
            {picked.size === 0 ? 'Show All Services' : `Show ${picked.size} service${picked.size !== 1 ? 's' : ''}`}
          </button>
          {onCancel && (
            <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-sm">Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}

function ServiceColumn({ name, serving, waiting, accent }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-gray-900/50 border border-gray-800">
      <div className="px-3 py-2 shrink-0 border-b border-gray-800" style={{ backgroundColor: accent + '33' }}>
        <h3 className="text-sm font-bold text-white tracking-wide truncate">{name}</h3>
      </div>
      <div className="px-3 pt-2 pb-1 shrink-0">
        <p className="text-green-500 text-xs font-semibold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />Now Serving
        </p>
        {serving.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-800 py-2 text-center text-gray-700 text-xs">—</div>
        ) : (
          <div className="space-y-1">
            {serving.map(v => (
              <div key={v.id} className="rounded-lg border border-green-700/60 bg-green-950/50 px-2.5 py-2">
                <p className="text-sm font-bold text-white truncate leading-tight">{v.visitor_name}</p>
                <p className="text-green-400 text-xs truncate mt-0.5">{v.employee_name}
                  {v.designation ? <span className="text-green-700"> · {v.designation}</span> : null}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mx-3 border-t border-gray-800 my-1.5 shrink-0" />
      <div className="px-3 mb-1 shrink-0">
        <p className="text-yellow-500 text-xs font-semibold uppercase tracking-widest flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />Waiting
          </span>
          {waiting.length > 0 && <span className="text-gray-600 font-normal normal-case">{waiting.length} in queue</span>}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-2 scrollbar-hide">
        {waiting.length === 0 ? (
          <div className="py-3 text-center text-gray-800 text-xs">Queue empty</div>
        ) : (
          <div className="space-y-1">
            {waiting.map((v, i) => (
              <div key={v.id} className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-2 py-1.5">
                <span className="text-xl font-black text-yellow-400 w-7 text-center shrink-0 leading-none">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-200 truncate">{v.visitor_name}</p>
                  {v.ref_number && <p className="text-xs text-gray-500 font-mono">#{v.ref_number}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QRSlide({ url, accent, timerKey }) {
  return (
    <div className="absolute inset-2 flex flex-col items-center justify-center gap-5">
      <div className="text-center">
        <p className="text-4xl font-extrabold text-white tracking-wide">Scan to Check In</p>
        <p className="text-lg text-gray-400 mt-2">Point your phone camera at the QR code below</p>
      </div>
      <div className="relative">
        <div className="absolute -inset-4 rounded-3xl opacity-20 animate-ping" style={{ backgroundColor: accent }} />
        <div className="relative bg-white p-6 rounded-3xl shadow-2xl"
          style={{ boxShadow: `0 0 60px ${accent}66, 0 0 120px ${accent}33` }}>
          <QRCodeSVG value={url} size={300} level="H" includeMargin={false} />
        </div>
      </div>
      <p className="text-sm text-gray-500 font-mono tracking-wide">{url}</p>
      <div className="w-64 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div key={timerKey} className="h-full rounded-full"
          style={{ backgroundColor: accent, animation: `qr-drain ${PAGE_INTERVAL}ms linear both` }} />
      </div>
      <p className="text-xs text-gray-600 -mt-3">Returning to queue display shortly…</p>
    </div>
  );
}

const SLIDE_STYLES = `
  @keyframes tv-slide-in {
    from { transform: translateX(100%); filter: blur(10px) brightness(0.5); opacity: 0.6; }
    60%  { filter: blur(2px) brightness(0.9); opacity: 1; }
    to   { transform: translateX(0); filter: blur(0px) brightness(1); opacity: 1; }
  }
  @keyframes tv-slide-out {
    from { transform: translateX(0); filter: blur(0px) brightness(1); opacity: 1; }
    40%  { filter: blur(2px) brightness(0.9); opacity: 1; }
    to   { transform: translateX(-100%); filter: blur(10px) brightness(0.5); opacity: 0.6; }
  }
  @keyframes qr-drain { from { width: 100%; } to { width: 0%; } }
  .tv-enter { animation: tv-slide-in  500ms cubic-bezier(0.4,0,0.2,1) both; }
  .tv-exit  { animation: tv-slide-out 500ms cubic-bezier(0.4,0,0.2,1) both; }
`;

export default function DisplayBoard() {
  const { slug } = useParams();
  const [board, setBoard]         = useState(null);
  const [error, setError]         = useState(null);
  const [pulse, setPulse]         = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [filter, setFilter]       = useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEY(slug)); return s ? new Set(JSON.parse(s)) : null; }
    catch { return null; }
  });

  // Rotation state — showingQR is an explicit flag, cur is the service page index
  const [showingQR, setShowingQR] = useState(false);
  const [curPage, setCurPage]     = useState(0);
  // prevSlide: null | number (service page) | 'qr'
  const [prevSlide, setPrevSlide] = useState(null);
  const [qrTimerKey, setQrTimerKey] = useState(0); // restarts countdown bar on each QR appearance

  // Refs accessible inside the setInterval closure (no stale closures)
  const showingQRRef    = useRef(false);
  const curPageRef      = useRef(0);
  const totalSvcRef     = useRef(0);

  showingQRRef.current = showingQR;
  curPageRef.current   = curPage;

  function clearPrevAfterAnim() { setTimeout(() => setPrevSlide(null), 520); }

  const fetchBoard = useCallback(async () => {
    try {
      const { data } = await api.get(`/display/${slug}`);
      setBoard(data);
      setError(null);
      setPulse(p => !p);
    } catch (err) {
      setError(err.response?.status === 404 ? 'Company not found' : 'Connection error — retrying…');
    }
  }, [slug]);

  useEffect(() => {
    fetchBoard();
    const id = setInterval(fetchBoard, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchBoard]);

  // Single interval — reads latest values via refs, never recreated
  useEffect(() => {
    const id = setInterval(() => {
      const totalSvc = totalSvcRef.current;

      if (showingQRRef.current) {
        // ── Leaving QR → go back to first service page ──────────────
        if (totalSvc > 0) {
          setPrevSlide('qr');
          curPageRef.current = 0;
          setCurPage(0);
          setShowingQR(false);
          showingQRRef.current = false;
          clearPrevAfterAnim();
        }
        // else: no services, stay on QR silently
      } else {
        // ── On a service page → advance or switch to QR ─────────────
        const cur   = curPageRef.current;
        const isLast = totalSvc === 0 || cur >= totalSvc - 1;

        if (isLast) {
          // Show QR after the last service page
          setPrevSlide(totalSvc > 0 ? cur : null);
          setShowingQR(true);
          showingQRRef.current = true;
          setQrTimerKey(k => k + 1);
          clearPrevAfterAnim();
        } else {
          // Advance to next service page
          const next = cur + 1;
          setPrevSlide(cur);
          curPageRef.current = next;
          setCurPage(next);
          clearPrevAfterAnim();
        }
      }
    }, PAGE_INTERVAL);
    return () => clearInterval(id);
  }, []); // runs once — reads state via refs

  function saveFilter(names) {
    if (names.length === 0) { localStorage.removeItem(STORAGE_KEY(slug)); setFilter(null); }
    else { localStorage.setItem(STORAGE_KEY(slug), JSON.stringify(names)); setFilter(new Set(names)); }
    setShowSetup(false);
  }

  if (error && !board) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-3 text-white">
      <p className="text-4xl">📺</p><p className="text-lg text-gray-400">{error}</p>
      <p className="text-gray-600 text-xs">Will retry automatically</p>
    </div>
  );
  if (!board) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin h-10 w-10 border-4 border-white border-t-transparent rounded-full" />
    </div>
  );

  const { company, visits } = board;
  const accent   = company.sidebar_color || '#1e40af';
  const kioskUrl = `${window.location.origin}/visit/${company.slug}`;

  const allServices = [...new Set(visits.map(v => v.service_name || v.purpose).filter(Boolean))].sort();
  const visible = filter && filter.size > 0
    ? visits.filter(v => filter.has(v.service_name) || filter.has(v.purpose))
    : visits;

  const serviceMap = new Map();
  visible.forEach(v => {
    const key = v.service_name || v.purpose || 'General';
    if (!serviceMap.has(key)) serviceMap.set(key, { serving: [], waiting: [] });
    const g = serviceMap.get(key);
    if (v.status === 'approved') g.serving.push(v); else g.waiting.push(v);
  });

  const allServiceEntries = [...serviceMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  const totalServicePages = Math.ceil(allServiceEntries.length / PAGE_SIZE);
  totalSvcRef.current = totalServicePages; // keep ref in sync each render

  // Clamp curPage to valid range (in case services disappear mid-cycle)
  const safeCurPage = totalServicePages > 0 ? Math.min(curPage, totalServicePages - 1) : 0;

  function getPageServices(pg) {
    return allServiceEntries.slice(pg * PAGE_SIZE, pg * PAGE_SIZE + PAGE_SIZE);
  }

  function renderServiceSlide(pg, animClass) {
    const svcs = getPageServices(pg);
    return (
      <div key={`svc-${pg}`} className={`${animClass} absolute inset-2 grid grid-cols-3 gap-2`}>
        {svcs.map(([name, { serving, waiting }]) => (
          <ServiceColumn key={name} name={name} serving={serving} waiting={waiting} accent={accent} />
        ))}
        {Array.from({ length: PAGE_SIZE - svcs.length }).map((_, i) => (
          <div key={i} className="rounded-xl border border-dashed border-gray-900 opacity-20" />
        ))}
      </div>
    );
  }

  function renderQRSlide(animClass) {
    return (
      <div key="qr-slide" className={`${animClass} absolute inset-2`}>
        <QRSlide url={kioskUrl} accent={accent} timerKey={qrTimerKey} />
      </div>
    );
  }

  // Total "logical pages" for footer dots: service pages + 1 QR page
  const totalDots = totalServicePages + 1;

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-950 text-white flex flex-col select-none">
      <style>{SLIDE_STYLES}</style>

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 shrink-0" style={{ backgroundColor: accent }}>
        <div className="flex items-center gap-2 min-w-0">
          {company.logo_url && (
            <img src={company.logo_url} alt="" className="h-8 w-auto max-w-[100px] object-contain rounded-lg shrink-0" />
          )}
          <h1 className="text-base font-bold tracking-wide truncate">{company.name}</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Clock />
          <button onClick={() => setShowSetup(true)} title="Configure services"
            className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors text-xs">
            ⚙
          </button>
        </div>
      </header>

      {/* Slide area */}
      <div className="flex-1 relative overflow-hidden p-2">
        {/* Exit slide */}
        {prevSlide !== null && (
          prevSlide === 'qr'
            ? renderQRSlide('tv-exit')
            : renderServiceSlide(prevSlide, 'tv-exit')
        )}
        {/* Enter slide */}
        {(showingQR || totalServicePages === 0)
          ? renderQRSlide('tv-enter')
          : renderServiceSlide(safeCurPage, 'tv-enter')
        }
      </div>

      {/* Footer */}
      <footer className="shrink-0 flex items-center justify-center gap-3 py-1.5 border-t border-gray-900 text-gray-700 text-xs">
        {totalDots > 1 && (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalServicePages }).map((_, i) => (
              <span key={i}
                className={`rounded-full transition-all duration-500 ${
                  !showingQR && i === safeCurPage ? 'w-4 h-1.5 bg-gray-500' : 'w-1.5 h-1.5 bg-gray-800'
                }`} />
            ))}
            {/* QR dot */}
            <span className={`transition-all duration-500 text-sm leading-none ${showingQR ? 'opacity-100' : 'opacity-20'}`}>▣</span>
          </div>
        )}
        <span className={`w-1 h-1 rounded-full transition-colors duration-500 ${pulse ? 'bg-green-700' : 'bg-gray-800'}`} />
        <span>Live · {REFRESH_INTERVAL / 1000}s</span>
        {totalDots > 1 && (
          <span className="text-gray-800">
            · {showingQR ? 'Check-in QR' : `page ${safeCurPage + 1}/${totalServicePages}`}
          </span>
        )}
        {error && <span className="ml-2 text-red-800">{error}</span>}
      </footer>

      {showSetup && (
        <ServiceSetup
          services={allServices}
          selected={filter ? [...filter] : []}
          onSave={saveFilter}
          onCancel={() => setShowSetup(false)}
        />
      )}
    </div>
  );
}
