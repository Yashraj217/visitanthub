import { Link } from 'react-router-dom';
import MarketingNav from '../components/marketing/MarketingNav';
import MarketingFooter from '../components/marketing/MarketingFooter';

/* ── Data ─────────────────────────────────────────────────────────────────── */

const CATEGORIES = [
  {
    id: 'checkin',
    label: 'Check-In & Queue',
    color: 'indigo',
    features: [
      {
        icon: '📱',
        title: 'Smart Visitor Kiosk',
        short: 'Self check-in from any device',
        desc: 'Visitors check in from any smartphone, tablet, or wall-mounted kiosk without downloading an app. A clean form captures their name, purpose, and contact — then places them in the queue instantly. Your front desk staff are freed from manual data entry the moment the visitor presses Submit.',
      },
      {
        icon: '📺',
        title: 'Live TV Display Board',
        short: 'Real-time queue on your office TV',
        desc: 'Mount any screen on your waiting-room wall and point it to your VisitantHub display URL. It refreshes in real time — showing who is currently being served and who is next in each service queue. A QR code slide rotates in automatically so walk-ins can register without approaching the desk.',
      },
      {
        icon: '🗂️',
        title: 'Service-Based Queuing',
        short: 'Route visitors to the right person',
        desc: 'Define as many services as you need — Account Opening, Loan Queries, Customer Support, and more. Each service has its own queue, its own assigned associates, and its own set of custom fields. Visitors choose a service at check-in and are routed directly, with zero manual triage.',
      },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications & Display',
    color: 'violet',
    features: [
      {
        icon: '💬',
        title: 'Instant WhatsApp Alerts',
        short: 'Never miss an arrival again',
        desc: 'The moment a visitor checks in, the assigned associate receives a WhatsApp message with the visitor\'s name, purpose, and check-in time. No app to open, no portal to monitor — the notification lands directly in their existing WhatsApp. Response rates are dramatically higher than email or SMS.',
      },
      {
        icon: '🎨',
        title: 'Custom Branding',
        short: 'Your logo, your colours, your URL',
        desc: 'Upload your company logo, pick a sidebar accent colour, and set a memorable kiosk URL like yourbusiness.visitanthub.com. Every visitor touchpoint — the kiosk form, the display board, the confirmation screen — carries your brand identity. White-label feel, zero design work required.',
      },
      {
        icon: '🖨️',
        title: 'Visitor Badges & Export',
        short: 'Professional badges, full audit trail',
        desc: 'Print a branded visitor badge at the desk in one click — useful for security-conscious offices or compliance audits. Export the complete visit log to Excel with a date-range filter. Auditors, HR, and security teams can pull a full record of every person who entered the building.',
      },
    ],
  },
  {
    id: 'management',
    label: 'Management & Analytics',
    color: 'purple',
    features: [
      {
        icon: '📊',
        title: 'Real-Time Analytics',
        short: 'Understand your visitor patterns',
        desc: 'The analytics dashboard shows visit volume by day, week, month, quarter, or any custom range. Charts break down traffic by service so you know exactly where demand peaks. Identify your busiest hours, plan staffing accordingly, and track the impact of process changes over time.',
      },
      {
        icon: '🔒',
        title: 'Role-Based Access',
        short: 'Granular control over who sees what',
        desc: 'Three built-in roles keep data tidy and secure. Super Admins manage the platform. Company Admins manage their own office — staff, services, and analytics. Associates see only their own queue and can update visit status. No role can access data that isn\'t theirs.',
      },
      {
        icon: '📋',
        title: 'Internal Fields & Notes',
        short: 'Capture data visitors never see',
        desc: 'Add hidden internal fields to any service — account numbers, case IDs, loan amounts, document reference codes. These fields appear only in the staff portal, never on the visitor-facing kiosk or confirmation screen. Associates can also leave freeform notes on each visit for future reference.',
      },
    ],
  },
];

const COMPARISON_ROWS = [
  { feature: 'Monthly visits',                starter: 'Up to 500',  pro: 'Unlimited',  enterprise: 'Unlimited' },
  { feature: 'Associates',                     starter: '1',          pro: 'Up to 15',   enterprise: 'Unlimited' },
  { feature: 'Services / queues',              starter: '1',          pro: 'Up to 15',   enterprise: 'Unlimited' },
  { feature: 'Visitor kiosk & QR check-in',   starter: true,         pro: true,          enterprise: true },
  { feature: 'WhatsApp notifications',         starter: true,         pro: true,          enterprise: true },
  { feature: 'Live TV display board',          starter: false,        pro: true,          enterprise: true },
  { feature: 'Custom branding',               starter: false,        pro: true,          enterprise: true },
  { feature: 'Internal fields & notes',       starter: false,        pro: true,          enterprise: true },
  { feature: 'Advanced analytics & export',   starter: false,        pro: true,          enterprise: true },
  { feature: 'Visitor badge printing',        starter: false,        pro: true,          enterprise: true },
  { feature: 'Multi-branch support',          starter: false,        pro: false,         enterprise: true },
  { feature: 'Dedicated onboarding',          starter: false,        pro: false,         enterprise: true },
  { feature: 'SLA-backed support',            starter: false,        pro: false,         enterprise: true },
  { feature: 'Custom integrations',           starter: false,        pro: false,         enterprise: true },
  { feature: 'On-premise option',             starter: false,        pro: false,         enterprise: true },
];

const SPOTLIGHTS = [
  {
    icon: '🏦',
    title: 'Banks & Financial Services',
    story: 'A regional cooperative bank in Punjab replaced their paper token system with VisitantHub in under an hour. Customers scan a QR code at the entrance, pick their service — Account, Loan, or Investment — and see a live queue on the lobby TV. Tellers get a WhatsApp ping the moment their next visitor is ready. Average wait-time perception dropped by 40% in the first week.',
    highlight: 'QR → Queue → WhatsApp → Done.',
  },
  {
    icon: '🏥',
    title: 'Multi-Specialty Clinics',
    story: 'A 12-doctor clinic in Chandigarh uses VisitantHub\'s service-based queuing to route patients to the correct consultation room. The display board in the waiting area shows each doctor\'s queue separately. Reception staff were reduced by one person while patient satisfaction scores improved — because patients always know their position in the queue.',
    highlight: 'Separate queues per doctor. Zero confusion.',
  },
  {
    icon: '🏢',
    title: 'Corporate Offices',
    story: 'An IT park with 30+ tenant companies deployed VisitantHub at their shared reception. Each tenant is a "service" with its own employees. When a visitor arrives for TechCorp India, the relevant host gets a WhatsApp alert immediately. The internal fields capture visitor vehicle numbers and ID proof type — useful for the security log.',
    highlight: 'Multi-tenant reception, single system.',
  },
];

/* ── Helper components ───────────────────────────────────────────────────── */

function Check({ value }) {
  if (value === true)
    return <span className="inline-flex items-center justify-center text-green-500 text-lg">✓</span>;
  if (value === false)
    return <span className="inline-flex items-center justify-center text-gray-300 text-lg">✗</span>;
  return <span className="text-xs text-gray-600 font-medium">{value}</span>;
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function Features() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <MarketingNav />

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 bg-white relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 60% -20%, #e0e7ff 0%, transparent 60%)' }}
        />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-4">Features</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Every feature your{' '}
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }}
            >
              office needs
            </span>
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            VisitantHub covers the full visitor journey — from the first QR scan to the end-of-day
            analytics report — with no IT team required and no complex setup.
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-4 rounded-xl text-base font-semibold text-white shadow-xl hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            Start Free Trial →
          </Link>
        </div>
      </section>

      {/* ── Feature cards by category ── */}
      {CATEGORIES.map((cat, ci) => (
        <section
          key={cat.id}
          id={cat.id}
          className={`py-20 ${ci % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-12">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 mb-3">
                {cat.label}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {cat.features.map(f => (
                <div
                  key={f.title}
                  className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col"
                >
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl mb-5 shrink-0">
                    {f.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{f.title}</h3>
                  <p className="text-indigo-600 text-xs font-semibold mb-3">{f.short}</p>
                  <p className="text-gray-500 text-sm leading-relaxed flex-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* ── Feature comparison table ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-3">Compare Plans</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Feature comparison</h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white">
                  <th className="text-left px-6 py-4 font-semibold text-gray-500 w-1/2">Feature</th>
                  <th className="text-center px-4 py-4 font-bold text-gray-700">Starter</th>
                  <th className="text-center px-4 py-4 font-bold text-indigo-600 bg-indigo-50">Professional</th>
                  <th className="text-center px-4 py-4 font-bold text-gray-700">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {COMPARISON_ROWS.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-indigo-50/30 transition-colors`}
                  >
                    <td className="px-6 py-3.5 text-gray-700 font-medium">{row.feature}</td>
                    <td className="px-4 py-3.5 text-center"><Check value={row.starter} /></td>
                    <td className="px-4 py-3.5 text-center bg-indigo-50/40"><Check value={row.pro} /></td>
                    <td className="px-4 py-3.5 text-center"><Check value={row.enterprise} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-gray-400 text-xs mt-4">
            All prices exclude GST. Annual billing available at 20% discount.
          </p>
        </div>
      </section>

      {/* ── Spotlight: How each feature helps ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-3">Real-world impact</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">How each feature helps you</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {SPOTLIGHTS.map(s => (
              <div
                key={s.title}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-8 flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-4xl mb-5">
                  {s.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-3">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed flex-1 mb-4">{s.story}</p>
                <p
                  className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-4 py-2.5 rounded-xl border border-indigo-100"
                >
                  {s.highlight}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section
        className="py-20"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)' }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to put these features to work?
          </h2>
          <p className="text-indigo-200 text-lg mb-8">
            Start your free account in 2 minutes. No credit card, no IT team, no commitment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-4 rounded-xl text-base font-semibold text-indigo-700 bg-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
            >
              Create Free Account →
            </Link>
            <Link
              to="/pricing"
              className="px-8 py-4 rounded-xl text-base font-semibold text-indigo-200 border-2 border-indigo-400 hover:border-white hover:text-white transition-all"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
