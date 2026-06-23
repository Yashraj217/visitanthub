import { Link } from 'react-router-dom';
import MarketingNav from '../components/marketing/MarketingNav';
import MarketingFooter from '../components/marketing/MarketingFooter';

const FEATURES = [
  {
    icon: '📱',
    title: 'Smart Visitor Kiosk',
    desc: 'Visitors self-check in from any device — phone, tablet, or kiosk. No app download, no paper forms.',
  },
  {
    icon: '📺',
    title: 'Live TV Display Board',
    desc: 'Show a real-time queue on your office TV screen, grouped by service. Includes a QR code slide so walk-ins can register on the spot.',
  },
  {
    icon: '💬',
    title: 'Instant WhatsApp Alerts',
    desc: 'Associates get a WhatsApp notification the moment a visitor checks in — no more missed arrivals.',
  },
  {
    icon: '🗂️',
    title: 'Service-Based Queuing',
    desc: 'Route visitors to the right associate by service. Each service has its own queue, custom fields, and branding.',
  },
  {
    icon: '📊',
    title: 'Real-Time Analytics',
    desc: 'Track visit trends by day, week, month, quarter, or custom range. Drill down by service with interactive charts.',
  },
  {
    icon: '🎨',
    title: 'Custom Branding',
    desc: 'Upload your logo, choose your sidebar colour, and set a unique kiosk URL. Visitors see your brand at every touchpoint.',
  },
  {
    icon: '🔒',
    title: 'Role-Based Access',
    desc: 'Super Admin, Company Admin, and Associate roles. Each sees only what they need — nothing more.',
  },
  {
    icon: '📋',
    title: 'Internal Fields & Notes',
    desc: 'Staff can capture hidden internal fields per visit — account numbers, case IDs, amounts — invisible to visitors.',
  },
  {
    icon: '🖨️',
    title: 'Visitor Badges & Export',
    desc: 'Print a visitor badge on the spot and export visit logs to Excel for audits, payroll, or compliance.',
  },
];

const INDUSTRIES = [
  {
    icon: '🏦',
    photo: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80',
    title: 'Banks & Financial Services',
    desc: 'Manage account-opening, loan, and advisory queues across multiple counters — with token numbers on the display board.',
    tags: ['Banks', 'NBFCs', 'Insurance', 'Mutual Funds'],
  },
  {
    icon: '🏥',
    photo: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80',
    title: 'Hospitals & Clinics',
    desc: 'Route patients to the right doctor or department. Reduce waiting-room confusion with a live TV queue.',
    tags: ['Hospitals', 'Clinics', 'Diagnostic Labs', 'Physiotherapy'],
  },
  {
    icon: '🏛️',
    photo: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80',
    title: 'Government & Municipal Offices',
    desc: 'Replace paper token systems with a digital queue. Track visit logs for compliance and audit trails.',
    tags: ['Tehsil Offices', 'Municipal Corporations', 'RTO', 'Passport Offices'],
  },
  {
    icon: '🏢',
    photo: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=600&q=80',
    title: 'Corporate Offices',
    desc: 'Welcome guests with a branded self-check-in kiosk. Notify hosts instantly via WhatsApp when their visitor arrives.',
    tags: ['MNCs', 'Startups', 'IT Parks', 'Co-working Spaces'],
  },
  {
    icon: '🎓',
    photo: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=80',
    title: 'Schools & Colleges',
    desc: 'Log parent and vendor visits securely. Know who is on campus at any time with timestamped visitor records.',
    tags: ['Schools', 'Colleges', 'Coaching Institutes', 'Universities'],
  },
  {
    icon: '⚖️',
    photo: 'https://images.unsplash.com/photo-1589391886645-d51941baf7fb?auto=format&fit=crop&w=600&q=80',
    title: 'Law Firms & CA Offices',
    desc: 'Assign clients to specific partners or staff. Capture case or file references using internal hidden fields.',
    tags: ['Law Firms', 'CA / CS Offices', 'Tax Consultants', 'Auditors'],
  },
  {
    icon: '🏠',
    photo: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80',
    title: 'Real Estate & Property',
    desc: 'Register walk-in site visitors, assign them to a sales executive, and track follow-up data with custom fields.',
    tags: ['Builders', 'Property Agencies', 'Site Offices', 'Housing Societies'],
  },
  {
    icon: '🔧',
    photo: 'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&w=600&q=80',
    title: 'Service & Repair Centres',
    desc: 'Queue customers by service type — warranty, repair, or upgrade. Show estimated wait times on a wall-mounted TV.',
    tags: ['Mobile Repair', 'Car Service', 'Electronics', 'Appliance Centres'],
  },
  {
    icon: '💊',
    photo: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=600&q=80',
    title: 'Pharmacies & Wellness',
    desc: 'Manage prescription pick-ups, consultations, and wellness appointments with a paperless check-in flow.',
    tags: ['Pharmacies', 'Ayurvedic Centres', 'Gyms', 'Wellness Clinics'],
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Set Up Your Office',
    desc: 'Register, add your services, assign associates, and configure your kiosk URL in minutes.',
  },
  {
    num: '02',
    title: 'Visitor Scans & Checks In',
    desc: 'Display the QR code at reception. Visitors scan, fill a short form, and are queued instantly.',
  },
  {
    num: '03',
    title: 'Associate Gets Notified',
    desc: 'The right associate sees the arrival on their portal and via WhatsApp — and marks it approved or completed.',
  },
  {
    num: '04',
    title: 'Track & Improve',
    desc: 'Use the dashboard analytics to understand peak times, service demand, and associate workload.',
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: '₹0',
    period: '/month',
    desc: 'Perfect for small offices getting started.',
    highlight: false,
    features: [
      'Up to 500 visits / month',
      '1 associates',
      '1 service',
      'Visitor kiosk & QR check-in',
      'WhatsApp notifications',
      'Basic analytics',
      'Email support',
    ],
  },
  {
    name: 'Professional',
    price: '₹999',
    period: '/month',
    desc: 'For growing teams that need more power.',
    highlight: true,
    badge: 'Most Popular',
    features: [
      'Unlimited visits',
      '15 associates',
      '15 services',
      'TV display board',
      'Internal fields & notes',
      'Advanced analytics & export',
      'Custom branding',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'Large organisations with unique needs.',
    highlight: false,
    features: [
      'Everything in Professional',
      'Unlimited associates',
      'Multi-branch support',
      'Dedicated onboarding',
      'SLA-backed support',
      'Custom integrations',
      'On-premise option',
    ],
  },
];

const TESTIMONIALS = [
  {
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80',
    quote: 'VisitantHub cut our front-desk chaos in half. Visitors check in themselves and our team just handles the work.',
    name: 'Priya Sharma',
    role: 'Admin Manager, TechCorp India',
  },
  {
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80',
    quote: 'The TV display board is a game-changer. Visitors can see the queue and scan the QR from their seat.',
    name: 'Rajesh Mehta',
    role: 'Operations Head, FinServ Ltd',
  },
  {
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=80&h=80&q=80',
    quote: 'Setup took under 30 minutes. The WhatsApp notification fired on the very first test visit.',
    name: 'Anita Bose',
    role: 'Office Manager, MediCare Clinic',
  },
];

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

/* ── TV + Reception Illustration ─────────────────────────────────────────── */
function TvMockup() {
  return (
    <div className="relative w-full max-w-lg mx-auto select-none" aria-hidden="true">

      {/* Glow behind the TV */}
      <div className="absolute inset-0 rounded-3xl opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(ellipse, #818cf8 0%, transparent 70%)' }} />

      {/* ── TV Frame ── */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-700"
        style={{ background: '#111827' }}>

        {/* Bezel top-bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-white/60 text-xs font-mono">VisitantHub Live</span>
          </div>
          <span className="text-white/40 text-xs font-mono">
            {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </span>
        </div>

        {/* Screen content — 3 service columns */}
        <div className="grid grid-cols-3 gap-0 text-white" style={{ minHeight: 220 }}>

          {/* Column 1 — Account Opening */}
          <ServiceCol
            title="Account Opening"
            color="#6366f1"
            serving={{ ref: 'ACC-007', name: 'Rajan Mehta' }}
            waiting={['Priya Sharma', 'Arjun Nair', 'Sneha Patil']}
          />

          {/* Column 2 — Loan Services */}
          <ServiceCol
            title="Loan Services"
            color="#22c55e"
            serving={{ ref: 'LON-003', name: 'Deepak Verma' }}
            waiting={['Kavya Rao', 'Manish Tiwari']}
          />

          {/* Column 3 — Customer Support */}
          <ServiceCol
            title="Customer Support"
            color="#f59e0b"
            serving={null}
            waiting={['Sunita Joshi', 'Amit Kumar', 'Pooja Singh', 'Rahul Das']}
          />
        </div>

        {/* Bottom ticker */}
        <div className="bg-indigo-600/90 px-4 py-1.5 flex items-center gap-3 overflow-hidden">
          <span className="text-white text-xs font-semibold shrink-0">📢 NOTICE</span>
          <p className="text-indigo-100 text-xs truncate">
            Scan the QR code to check in instantly • Token numbers are called in order • Please keep your reference number ready
          </p>
        </div>
      </div>

      {/* ── TV Stand ── */}
      <div className="flex flex-col items-center mt-0.5">
        <div className="w-6 h-5 bg-gray-600 rounded-b-sm" />
        <div className="w-28 h-2.5 bg-gray-600 rounded-full" />
      </div>

      {/* ── Reception Desk ── */}
      <div className="mt-4 mx-4">
        {/* Desk surface */}
        <div className="h-6 rounded-t-xl bg-gradient-to-b from-amber-200 to-amber-300 shadow-md" />
        <div className="h-3 rounded-b-xl bg-amber-400" />
        {/* Desk legs */}
        <div className="flex justify-between px-8 mt-0.5">
          <div className="w-3 h-8 bg-amber-500 rounded-b-sm" />
          <div className="w-3 h-8 bg-amber-500 rounded-b-sm" />
        </div>
      </div>

      {/* ── People (visitors) sitting ── */}
      <div className="absolute -bottom-1 left-4 flex gap-2">
        {['#6366f1','#22c55e','#f59e0b'].map((c, i) => <Stick key={i} color={c} />)}
      </div>

      {/* ── Badge: "Live Queue" ── */}
      <div className="absolute -top-3 -right-3 bg-green-400 text-green-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg border-2 border-white">
        🔴 LIVE
      </div>
    </div>
  );
}

function ServiceCol({ title, color, serving, waiting }) {
  return (
    <div className="border-r border-gray-700 last:border-r-0 flex flex-col">
      {/* Column header */}
      <div className="px-2 py-2 text-center" style={{ borderBottom: `2px solid ${color}`, background: `${color}22` }}>
        <p className="text-white font-bold text-xs leading-tight truncate">{title}</p>
      </div>

      {/* Now Serving */}
      <div className="px-2 pt-2 pb-1">
        <p className="text-white/40 text-[9px] uppercase tracking-widest mb-1">Now Serving</p>
        {serving ? (
          <div className="rounded-lg px-2 py-1.5 text-center" style={{ background: `${color}33`, border: `1px solid ${color}66` }}>
            <p className="font-bold text-[10px] font-mono" style={{ color }}>{serving.ref}</p>
            <p className="text-white text-[9px] mt-0.5 truncate">{serving.name}</p>
          </div>
        ) : (
          <div className="rounded-lg px-2 py-1.5 text-center bg-white/5 border border-white/10">
            <p className="text-white/30 text-[9px]">— Available —</p>
          </div>
        )}
      </div>

      {/* Waiting */}
      <div className="px-2 pb-2 flex-1">
        <p className="text-white/40 text-[9px] uppercase tracking-widest mb-1">Waiting ({waiting.length})</p>
        <div className="space-y-1">
          {waiting.map((name, i) => (
            <div key={name} className="flex items-center gap-1.5 bg-white/5 rounded px-1.5 py-1">
              <span className="text-white/30 text-[8px] font-mono w-3">{i + 1}</span>
              <span className="text-white/70 text-[9px] truncate">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stick({ color }) {
  return (
    <svg width="24" height="48" viewBox="0 0 24 48" fill="none">
      {/* Head */}
      <circle cx="12" cy="7" r="5" fill={color} opacity="0.85" />
      {/* Body */}
      <line x1="12" y1="12" x2="12" y2="30" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      {/* Arms */}
      <line x1="4" y1="20" x2="20" y2="20" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      {/* Legs (sitting — bent) */}
      <line x1="12" y1="30" x2="4" y2="38" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="12" y1="30" x2="20" y2="38" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="4" y1="38" x2="4" y2="46" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="20" y1="38" x2="20" y2="46" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <MarketingNav />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-white">

        {/* Decorative blobs */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, #c7d2fe 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, #ddd6fe 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-28 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* ── Left: text + CTAs ── */}
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-indigo-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Trusted by offices across India
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
                Visitor Management<br />
                <span className="text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }}>
                  Made Effortless
                </span>
              </h1>

              <p className="text-gray-500 text-lg max-w-xl mb-10 leading-relaxed">
                VisitantHub streamlines every visitor touchpoint — from self-check-in kiosks and live queue boards
                to instant WhatsApp alerts and deep analytics.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link to="/register"
                  className="px-8 py-4 rounded-xl text-base font-semibold text-white shadow-xl transition-transform hover:scale-105 text-center"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                  Start for Free →
                </Link>
                <a href="#features"
                  onClick={e => { e.preventDefault(); scrollTo('features'); }}
                  className="px-8 py-4 rounded-xl text-base font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors text-center">
                  See Features
                </a>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { val: '10,000+', label: 'Visits managed' },
                  { val: '99.9%',   label: 'Uptime SLA' },
                  { val: '< 60s',   label: 'Check-in time' },
                  { val: '5 min',   label: 'Setup time' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl px-4 py-4 border border-gray-200 shadow-sm text-center">
                    <p className="text-2xl font-extrabold text-gray-900">{s.val}</p>
                    <p className="text-gray-500 text-xs mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: TV + reception illustration ── */}
            <div className="flex items-end justify-center lg:justify-end pb-4">
              <TvMockup />
            </div>

          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Everything your office needs</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              From the first visitor scan to the end-of-day report — VisitantHub handles it all.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title}
                className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-2xl mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who Uses VisitantHub ────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-3">Who Uses VisitantHub</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Built for every kind of office</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              From a single-desk clinic to a multi-counter government office — if people walk in and wait, VisitantHub is for you.
            </p>
          </div>

          {/* Photo bento strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-14 rounded-2xl overflow-hidden">
            {[
              { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=85', label: 'Corporate Reception', span: 'md:col-span-2 md:row-span-2' },
              { url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=500&q=85', label: 'Hospital & Clinics', span: '' },
              { url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=500&q=85', label: 'Banks & Finance', span: '' },
              { url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=500&q=85', label: 'Office Lobbies', span: '' },
              { url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=500&q=85', label: 'Educational Institutes', span: '' },
            ].map(p => (
              <div key={p.label} className={`relative overflow-hidden rounded-xl group h-44 ${p.span}`}>
                <img
                  src={p.url}
                  alt={p.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <p className="absolute bottom-3 left-3 text-white text-xs font-semibold drop-shadow">{p.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {INDUSTRIES.map(ind => (
              <div key={ind.title}
                className="group rounded-2xl overflow-hidden border border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:-translate-y-1 transition-all bg-white">
                {/* Card photo */}
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={ind.photo}
                    alt={ind.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                  {/* Fallback gradient */}
                  <div className="absolute inset-0 hidden items-center justify-center text-5xl"
                    style={{ background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)' }}>
                    {ind.icon}
                  </div>
                  {/* Overlay with icon */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute bottom-3 left-3 text-2xl">{ind.icon}</span>
                </div>
                {/* Card body */}
                <div className="p-6">
                  <h3 className="font-bold text-gray-900 text-base mb-2">{ind.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4">{ind.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ind.tags.map(tag => (
                      <span key={tag}
                        className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 font-medium border border-indigo-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom CTA nudge */}
          <div className="mt-14 text-center">
            <p className="text-gray-500 text-base mb-4">Don't see your industry? VisitantHub works for any walk-in scenario.</p>
            <Link to="/register"
              className="inline-block px-8 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              Try it free — no credit card needed
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Up and running in minutes</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              No IT team required. Four simple steps from sign-up to your first managed visit.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.num} className="relative text-center">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(50%+2.5rem)] right-0 h-0.5 bg-indigo-100" />
                )}
                <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-5 text-2xl font-extrabold text-indigo-600 border-2 border-indigo-100 bg-indigo-50">
                  {s.num}
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-3">Testimonials</p>
            <h2 className="text-4xl font-extrabold text-gray-900">Loved by office teams</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                    loading="lazy"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              No hidden fees. Cancel any time. All plans include a 14-day free trial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {PLANS.map(plan => (
              <div key={plan.name}
                className={`relative rounded-2xl p-8 flex flex-col ${
                  plan.highlight
                    ? 'text-white shadow-2xl shadow-indigo-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
                style={plan.highlight ? { background: 'linear-gradient(145deg, #4f46e5, #7c3aed)' } : {}}>

                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1 rounded-full shadow">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-6">
                  <h3 className={`text-lg font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                  <p className={`text-sm mb-4 ${plan.highlight ? 'text-indigo-200' : 'text-gray-500'}`}>{plan.desc}</p>
                  <div className="flex items-end gap-1">
                    <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                    {plan.period && <span className={`text-sm mb-1.5 ${plan.highlight ? 'text-indigo-200' : 'text-gray-400'}`}>{plan.period}</span>}
                  </div>
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <svg className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlight ? 'text-indigo-200' : 'text-green-500'}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={plan.highlight ? 'text-indigo-100' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.name === 'Enterprise' ? (
                  <a href="#contact" onClick={e => { e.preventDefault(); scrollTo('contact'); }}
                    className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all border-2 ${
                      plan.highlight
                        ? 'bg-white text-indigo-700 hover:bg-indigo-50 border-white'
                        : 'border-indigo-600 text-indigo-600 hover:bg-indigo-50'
                    }`}>
                    Contact Sales
                  </a>
                ) : (
                  <Link to="/register"
                    className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                      plan.highlight
                        ? 'bg-white text-indigo-700 hover:bg-indigo-50'
                        : 'text-white hover:opacity-90'
                    }`}
                    style={!plan.highlight ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' } : {}}>
                    Start Free Trial
                  </Link>
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-gray-400 text-sm mt-8">
            All prices exclude GST. Annual billing available at 20% discount.{' '}
            <a href="#contact" onClick={e => { e.preventDefault(); scrollTo('contact'); }}
              className="text-indigo-600 hover:underline">
              Contact us
            </a>{' '}for volume pricing.
          </p>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────────────────── */}
      <section className="py-20"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)' }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-extrabold text-white mb-4">Ready to upgrade your reception?</h2>
          <p className="text-indigo-200 text-lg mb-8">
            Join hundreds of offices that replaced paper sign-in books with VisitantHub.
          </p>
          <Link to="/register"
            className="inline-block px-10 py-4 rounded-xl text-base font-semibold text-indigo-700 bg-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5">
            Create Your Free Account →
          </Link>
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────────────────────── */}
      <section id="contact" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-3">Contact</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Get in touch</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Have questions about pricing, features, or onboarding? Our team is here to help.
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '📧',
                label: 'Email',
                value: 'info@sonnetinfotech.com',
                href: 'mailto:info@sonnetinfotech.com',
              },
              {
                icon: '📞',
                label: 'Phone',
                value: '+91 98140 06629',
                href: 'tel:+919814006629',
              },
              {
                icon: '🏢',
                label: 'Company',
                value: 'Sonnet Infotech',
                href: null,
              },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 text-center">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                  {c.icon}
                </div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{c.label}</p>
                {c.href ? (
                  <a href={c.href} className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors text-sm">{c.value}</a>
                ) : (
                  <p className="font-semibold text-gray-900 text-sm">{c.value}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <MarketingFooter />

    </div>
  );
}
