import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function BadgeModal({ visit, companyName, onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const time = new Date(visit.visit_time || Date.now()).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  const qrValue = visit.ref_number || String(visit.id || visit.visit_id || 'N/A');

  return (
    <>
      {/* Hidden div shown only during print (see index.css @media print rules) */}
      <div id="badge-print-target">
        <BadgeContent visit={visit} companyName={companyName} time={time} qrValue={qrValue} />
      </div>

      {/* Screen preview modal */}
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm"
          onClick={e => e.stopPropagation()}>

          <div className="flex items-center justify-between px-5 py-3.5 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">Visitor Badge Preview</h2>
            <button onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200">
              ✕
            </button>
          </div>

          <div className="p-5 flex justify-center bg-gray-50">
            <BadgeContent visit={visit} companyName={companyName} time={time} qrValue={qrValue} />
          </div>

          <div className="px-5 pb-5 pt-3 flex gap-3">
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              Cancel
            </button>
            <button onClick={() => window.print()}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a1 1 0 001-1v-4H9v4a1 1 0 001 1zm1-4h4m-4-8V4a1 1 0 00-1-1H9a1 1 0 00-1 1v4h8z" />
              </svg>
              Print Badge
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function BadgeContent({ visit, companyName, time, qrValue }) {
  return (
    <div style={{
      width: '320px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
      background: 'white',
    }}>
      {/* Header band */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.2px' }}>
          {companyName || 'VisitorApp'}
        </span>
        <span style={{
          background: 'rgba(255,255,255,0.22)',
          color: 'white',
          fontSize: '9px',
          fontWeight: 800,
          letterSpacing: '2px',
          padding: '3px 9px',
          borderRadius: '20px',
        }}>
          VISITOR PASS
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '16px' }}>
        {/* Photo + Name row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
          {/* Avatar placeholder */}
          <div style={{
            width: '66px', height: '66px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
            border: '2px solid #a5b4fc',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" fill="#818cf8" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#c7d2fe" />
            </svg>
            <span style={{ fontSize: '8px', color: '#818cf8', marginTop: '2px', fontWeight: 700, letterSpacing: '0.5px' }}>PHOTO</span>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: '18px', fontWeight: 800, color: '#111827',
              lineHeight: 1.2, marginBottom: '4px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {visit.visitor_name || 'Visitor'}
            </p>
            {visit.mobile && (
              <p style={{ fontSize: '11px', color: '#6b7280' }}>
                📱 {visit.mobile}
              </p>
            )}
          </div>
        </div>

        <div style={{ height: '1px', background: '#f3f4f6', margin: '0 0 13px 0' }} />

        {/* Visiting */}
        <div style={{ marginBottom: '9px' }}>
          <p style={{ fontSize: '9px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '2px' }}>
            Visiting
          </p>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
            {visit.employee_name || '—'}
          </p>
          {visit.designation && (
            <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>{visit.designation}</p>
          )}
        </div>

        {/* Purpose */}
        {(visit.service_name || visit.purpose) && (
          <div style={{ marginBottom: '9px' }}>
            <p style={{ fontSize: '9px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '2px' }}>
              Purpose
            </p>
            <p style={{ fontSize: '12px', color: '#374151' }}>{visit.service_name || visit.purpose}</p>
          </div>
        )}

        {/* Date/Time */}
        <div style={{ marginBottom: '13px' }}>
          <p style={{ fontSize: '9px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '2px' }}>
            Date & Time
          </p>
          <p style={{ fontSize: '12px', color: '#374151' }}>{time}</p>
        </div>

        {/* QR + Ref bar */}
        <div style={{
          background: '#f9fafb', borderRadius: '10px', padding: '11px 13px',
          display: 'flex', alignItems: 'center', gap: '13px',
          border: '1px solid #e5e7eb',
        }}>
          <QRCodeSVG value={qrValue} size={58} level="M" />
          <div>
            <p style={{ fontSize: '9px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '3px' }}>
              Reference
            </p>
            <p style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'monospace', color: '#4f46e5', letterSpacing: '0.3px' }}>
              {visit.ref_number || `#${visit.id || visit.visit_id}`}
            </p>
            <p style={{ fontSize: '9px', color: '#9ca3af', marginTop: '3px' }}>Valid for today only</p>
          </div>
        </div>
      </div>
    </div>
  );
}
