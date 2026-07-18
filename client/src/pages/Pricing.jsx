import { useState } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from '../components/marketing/MarketingNav';
import MarketingFooter from '../components/marketing/MarketingFooter';
import Seo from '../components/Seo';

/* ── Data ─────────────────────────────────────────────────────────────────── */

const PLANS = [
  {
    name: 'Starter',
    price: '₹0',
    period: '/month',
    desc: 'Free forever. Try it with real WhatsApp notifications from day one.',
    highlight: false,
    cta: 'Start for Free',
    ctaLink: '/register',
    tokenNote: '200 free WhatsApp tokens included · Top-up from ₹499',
    features: [
      'Up to 500 visits / month',
      '1 associate',
      '1 service',
      'Visitor kiosk & QR check-in',
      '200 free WhatsApp tokens',
      'Basic analytics',
      'Email support',
    ],
    missing: [
      'TV display board',
      'Custom branding',
      'Internal fields & notes',
      'Advanced analytics & export',
      'Visitor badge printing',
    ],
  },
  {
    name: 'Pro',
    price: '₹999',
    period: '/month',
    desc: 'For growing teams that need more power.',
    highlight: true,
    badge: 'Most Popular',
    cta: 'Start Free Trial',
    ctaLink: '/register',
    tokenNote: '300 WhatsApp tokens included every month · Top-up anytime',
    features: [
      'Unlimited visits',
      'Up to 15 associates',
      'Up to 15 services',
      '300 WhatsApp tokens / month',
      'TV display board',
      'Internal fields & notes',
      'Advanced analytics & export',
      'Custom branding',
      'Visitor badge printing',
      'Priority support',
    ],
    missing: [],
  },
  {
    name: 'Gold',
    price: '₹2,499',
    period: '/month',
    desc: 'Premium plan with WhatsApp tokens included every month.',
    highlight: false,
    gold: true,
    badge: 'WhatsApp Included',
    cta: 'Get Gold',
    ctaLink: '/register',
    tokenNote: '1,000 WhatsApp tokens included every month',
    features: [
      'Everything in Pro',
      'Unlimited associates & services',
      '1,000 WhatsApp tokens / month',
      'Tokens auto-renewed monthly',
      'Multi-branch support',
      'Dedicated account manager',
      'SLA-backed support',
      'Custom integrations',
      'On-premise option',
    ],
    missing: [],
  },
];

const FAQS = [
  {
    q: 'Is there a free trial?',
    a: 'Yes — the Starter plan is free forever with no credit card required and includes 200 WhatsApp tokens to get you started. The Pro plan also comes with a 14-day free trial so you can test every feature before committing.',
  },
  {
    q: 'How do WhatsApp tokens work?',
    a: 'Each WhatsApp message sent (check-in confirmation, visit approval, booking confirmation) deducts 1 token. Starter users get 200 free tokens and can top-up from ₹499 anytime. Pro users top-up as needed. Gold users get 1,000 tokens included every month — automatically renewed.',
  },
  {
    q: 'Can I upgrade or downgrade at any time?',
    a: 'Absolutely. You can upgrade from Starter to Pro or Gold at any point from your dashboard. Downgrades take effect at the end of your current billing cycle. No penalties, no lock-in.',
  },
  {
    q: 'Do you charge per visitor?',
    a: 'No. The Starter plan has a monthly visit cap of 500. Pro and Gold plans have unlimited visits — you pay a flat monthly fee regardless of how many visitors walk in.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. All data is encrypted in transit (TLS) and at rest. We follow a strict role-based access model so that each user can only see data relevant to their role. We do not sell or share visitor data with third parties.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit and debit cards, UPI, and bank transfers for annual plans. Invoices with GST are available for business accounts. Contact us at info@sonnetinfotech.com to arrange payment.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. There are no long-term contracts on monthly billing. Cancel from your dashboard and your plan stays active until the end of the paid period. Annual plans can be cancelled but are non-refundable after 30 days.',
  },
];

/* ── Sub-component ───────────────────────────────────────────────────────── */

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 text-sm pr-4">{q}</span>
        <span className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${open ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 text-gray-400'}`}>
          <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="px-6 pb-5 text-gray-500 text-sm leading-relaxed border-t border-gray-100 pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function Pricing() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <Seo
        title="Pricing"
        path="/pricing"
        description="Simple, transparent pricing for VisitantHub visitor management. Choose a plan that fits your clinic or office size. No hidden fees. Start free and scale as you grow."
      />
      <MarketingNav />

      {/* ── Hero ── */}
      <section className="pt-32 pb-16 bg-white relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% -20%, #e0e7ff 0%, transparent 60%)' }}
        />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-4">Pricing</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-5 leading-tight">
            Simple,{' '}
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }}
            >
              transparent pricing
            </span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            No hidden fees. Cancel any time. All paid plans include a 14-day free trial.
          </p>
        </div>
      </section>

      {/* ── Plans ── */}
      <section className="pb-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 flex flex-col ${
                  plan.highlight
                    ? 'text-white shadow-2xl shadow-indigo-200'
                    : plan.gold
                    ? 'text-white shadow-2xl shadow-amber-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
                style={
                  plan.highlight ? { background: 'linear-gradient(145deg, #4f46e5, #7c3aed)' }
                  : plan.gold    ? { background: 'linear-gradient(145deg, #92400e, #b45309)' }
                  : {}
                }
              >
                {plan.badge && (
                  <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1 rounded-full shadow ${
                    plan.gold ? 'bg-amber-400 text-amber-900' : 'bg-amber-400 text-amber-900'
                  }`}>
                    {plan.badge}
                  </div>
                )}

                <div className="mb-5">
                  <h3 className={`text-lg font-bold mb-1 ${plan.highlight || plan.gold ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm mb-4 ${plan.highlight ? 'text-indigo-200' : plan.gold ? 'text-amber-200' : 'text-gray-500'}`}>
                    {plan.desc}
                  </p>
                  <div className="flex items-end gap-1">
                    <span className={`text-4xl font-extrabold ${plan.highlight || plan.gold ? 'text-white' : 'text-gray-900'}`}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className={`text-sm mb-1.5 ${plan.highlight ? 'text-indigo-200' : plan.gold ? 'text-amber-200' : 'text-gray-400'}`}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                </div>

                {/* WhatsApp token note */}
                {plan.tokenNote && (
                  <div className={`text-xs font-medium px-3 py-2 rounded-lg mb-5 flex items-center gap-1.5 ${
                    plan.highlight ? 'bg-indigo-800/50 text-indigo-200'
                    : plan.gold    ? 'bg-amber-900/40 text-amber-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    <span>💬</span>
                    {plan.tokenNote}
                  </div>
                )}

                <ul className="space-y-2.5 flex-1 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <svg
                        className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlight ? 'text-indigo-200' : plan.gold ? 'text-amber-300' : 'text-green-500'}`}
                        fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={plan.highlight ? 'text-indigo-100' : plan.gold ? 'text-amber-100' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                  {plan.missing.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm opacity-50">
                      <svg
                        className="w-4 h-4 mt-0.5 shrink-0 text-gray-300"
                        fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-gray-400 line-through">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={plan.ctaLink}
                  className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.highlight
                      ? 'bg-white text-indigo-700 hover:bg-indigo-50'
                      : plan.gold
                      ? 'bg-amber-400 text-amber-900 hover:bg-amber-300'
                      : 'text-white hover:opacity-90'
                  }`}
                  style={!plan.highlight && !plan.gold ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' } : {}}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-400 text-sm mt-8">
            All prices exclude GST. Annual billing available at 20% discount.{' '}
            <Link to="/contact" className="text-indigo-600 hover:underline">
              Contact us
            </Link>{' '}
            for volume pricing.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Common questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(item => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── "Still unsure?" strip ── */}
      <section className="py-14 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Still unsure which plan fits you?</h3>
          <p className="text-gray-500 mb-6">
            Our team is happy to walk you through the options and recommend the right plan for your
            office size and visit volume.
          </p>
          <Link
            to="/contact"
            className="inline-block px-8 py-3.5 rounded-xl font-semibold text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors"
          >
            Talk to us →
          </Link>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section
        className="py-20"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)' }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Start managing visitors today
          </h2>
          <p className="text-indigo-200 text-lg mb-8">
            Free forever on the Starter plan. Upgrade when you're ready.
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
