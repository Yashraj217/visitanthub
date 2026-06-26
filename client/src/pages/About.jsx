import { Link } from 'react-router-dom';
import MarketingNav from '../components/marketing/MarketingNav';
import MarketingFooter from '../components/marketing/MarketingFooter';
import Seo from '../components/Seo';

/* ── Data ─────────────────────────────────────────────────────────────────── */

const VALUES = [
  {
    icon: '⚡',
    title: 'Speed first',
    desc: 'A visitor should be queued in under 60 seconds. That\'s the bar we set for every feature. If it\'s not fast in real office conditions — noisy, distracted, on a cheap Android — it goes back to the drawing board.',
  },
  {
    icon: '🔌',
    title: 'No IT team needed',
    desc: 'We built VisitantHub for the office manager who has never deployed software in her life. Setup is a form, not a server. The kiosk is a URL, not an app. Every setting has a plain-English label and a save button that works.',
  },
  {
    icon: '🔒',
    title: 'Privacy by design',
    desc: 'Visitor data belongs to the office that collected it — not to us. We don\'t sell it, we don\'t profile it, and we delete it on request. Role-based access means each employee sees only what their job requires.',
  },
];

const STATS = [
  { val: '10,000+', label: 'Visits managed' },
  { val: '99.9%',   label: 'Uptime' },
  { val: '< 60s',   label: 'Average check-in' },
  { val: '5 min',   label: 'Setup time' },
];

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function About() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <Seo
        title="About Us"
        path="/about"
        description="Learn about VisitantHub and Sonnet Infotech — the team building smarter visitor management for clinics, enterprises, and offices across India."
      />
      <MarketingNav />

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 bg-white relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 30% -10%, #e0e7ff 0%, transparent 55%)' }}
        />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-4">About VisitantHub</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Built for every office,{' '}
            <span
              className="text-transparent bg-clip-text block sm:inline"
              style={{ backgroundImage: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }}
            >
              by people who've sat in waiting rooms
            </span>
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
            VisitantHub was born from frustration: paper sign-in sheets, missed arrivals, and
            the front desk trying to be a receptionist, security guard, and notification system
            all at once. We built the software we wished existed.
          </p>
        </div>
      </section>

      {/* ── Mission statement ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <blockquote className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug mb-6">
            "Our mission is to make every office's reception as smooth as the best hotel lobby —
            without the budget of a hotel."
          </blockquote>
          <p className="text-gray-500 text-base leading-relaxed">
            We believe that visitor management shouldn't be an enterprise luxury. A single-chair
            physiotherapy clinic should have the same professional check-in experience as a Fortune
            500 lobby. VisitantHub is how we make that happen — affordably, quickly, and without
            requiring any technical expertise.
          </p>
        </div>
      </section>

      {/* ── Value cards ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-3">What we stand for</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Our core values</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {VALUES.map(v => (
              <div
                key={v.title}
                className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-3xl mb-5">
                  {v.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-3">{v.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our story ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Text side */}
            <div>
              <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-4">Our story</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">
                From a Chandigarh office to offices across India
              </h2>
              <div className="space-y-4 text-gray-500 text-base leading-relaxed">
                <p>
                  Sonnet Infotech is a software development company based in Chandigarh, India. We
                  build practical, no-nonsense SaaS products for Indian businesses — the kind that
                  work on a 4G connection, look good on a cheap Android, and can be set up by
                  someone who has never deployed software before.
                </p>
                <p>
                  VisitantHub started as a project for a regional cooperative bank that was still
                  using a handwritten token book at reception. The bank manager wanted something
                  digital but couldn't afford an enterprise system. We built a simple web app over
                  a weekend — and within two weeks, four more offices asked for the same thing.
                </p>
                <p>
                  That was the signal. We turned the prototype into a proper product, added
                  WhatsApp notifications, the TV display board, analytics, and custom branding —
                  and launched VisitantHub as a standalone SaaS. Today it's used by clinics,
                  banks, law firms, schools, and corporate lobbies across India.
                </p>
                <p>
                  We're a small team with a big focus: make visitor management invisible. When it
                  works well, nobody notices the software. They just notice that the office runs
                  smoothly.
                </p>
              </div>
            </div>

            {/* Decorative element */}
            <div className="flex items-center justify-center">
              <div className="relative w-full max-w-sm">
                {/* Background blob */}
                <div
                  className="absolute inset-0 rounded-3xl blur-2xl opacity-30"
                  style={{ background: 'radial-gradient(ellipse, #818cf8 0%, transparent 70%)' }}
                />
                {/* Card stack visual */}
                <div className="relative space-y-4">
                  {[
                    { label: 'Founded', value: '2023', color: '#4f46e5' },
                    { label: 'Headquarters', value: 'Chandigarh, India', color: '#7c3aed' },
                    { label: 'Product', value: 'VisitantHub SaaS', color: '#6366f1' },
                    { label: 'Built by', value: 'Sonnet Infotech', color: '#8b5cf6' },
                  ].map((item, i) => (
                    <div
                      key={item.label}
                      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4"
                      style={{ transform: `translateX(${i % 2 === 0 ? '0' : '24px'})` }}
                    >
                      <div
                        className="w-2 h-10 rounded-full shrink-0"
                        style={{ background: item.color }}
                      />
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">{item.label}</p>
                        <p className="text-gray-900 font-bold text-base mt-0.5">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section
        className="py-16"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map(s => (
              <div key={s.label}>
                <p className="text-4xl font-extrabold text-white mb-1">{s.val}</p>
                <p className="text-indigo-200 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team / company ── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-4">The team</p>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-6">Small team. Focused product.</h2>
          <p className="text-gray-500 text-base leading-relaxed mb-6">
            VisitantHub is built and maintained by Sonnet Infotech — a small, hands-on development
            studio based in Chandigarh. We don't have a hundred product managers or a slide deck
            full of roadmap promises. We have a working product, real users, and a direct phone
            number you can call.
          </p>
          <p className="text-gray-500 text-base leading-relaxed mb-10">
            When you write to us, a developer reads it. When you report a bug, it gets fixed — not
            triaged into a backlog for six months. That's the advantage of being small and focused.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className="px-8 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              Get in touch
            </Link>
            <Link
              to="/features"
              className="px-8 py-3.5 rounded-xl font-semibold text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors"
            >
              See the product
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="py-20"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)' }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to modernise your reception?
          </h2>
          <p className="text-indigo-200 text-lg mb-8">
            Join offices across India that have switched from paper sign-in books to VisitantHub.
            Setup takes 5 minutes.
          </p>
          <Link
            to="/register"
            className="inline-block px-10 py-4 rounded-xl text-base font-semibold text-indigo-700 bg-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
          >
            Create Free Account →
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
