import { useState } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from '../components/marketing/MarketingNav';
import MarketingFooter from '../components/marketing/MarketingFooter';
import Seo from '../components/Seo';

/* ── Data ─────────────────────────────────────────────────────────────────── */

const CONTACT_CARDS = [
  {
    icon: '📧',
    label: 'Email us',
    value: 'info@sonnetinfotech.com',
    sub: 'We reply within one business day.',
    href: 'mailto:info@sonnetinfotech.com',
  },
  {
    icon: '📞',
    label: 'Call us',
    value: '+91 81950 11181',
    sub: 'Mon – Sat, 9 am – 6 pm IST',
    href: 'tel:+9181950 11181',
  },
  {
    icon: '💬',
    label: 'WhatsApp',
    value: 'Chat with us',
    sub: 'Quickest way to get a response.',
    href: 'https://wa.me/918195011181',
    external: true,
  },
];

const INITIAL = { name: '', email: '', phone: '', company: '', message: '' };

function validate(fields) {
  const errors = {};
  if (!fields.name.trim())    errors.name    = 'Name is required.';
  if (!fields.email.trim())   errors.email   = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))
                               errors.email   = 'Enter a valid email address.';
  if (!fields.message.trim()) errors.message = 'Please describe how we can help.';
  return errors;
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function Contact() {
  const [fields, setFields]   = useState(INITIAL);
  const [errors, setErrors]   = useState({});
  const [sent, setSent]       = useState(false);
  const [sending, setSending] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(fields);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSending(true);

    // Try API first; fall back to mailto
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        setSent(true);
        setFields(INITIAL);
        return;
      }
    } catch {
      // API not available — open mailto as fallback
    }

    // Mailto fallback
    const subject = encodeURIComponent(`VisitantHub enquiry from ${fields.name}`);
    const body = encodeURIComponent(
      `Name: ${fields.name}\nEmail: ${fields.email}\nPhone: ${fields.phone}\nCompany: ${fields.company}\n\nMessage:\n${fields.message}`
    );
    window.location.href = `mailto:info@sonnetinfotech.com?subject=${subject}&body=${body}`;
    setSent(true);
    setFields(INITIAL);
    setSending(false);
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <Seo
        title="Contact Us"
        path="/contact"
        description="Get in touch with the VisitantHub team. Call, email, or WhatsApp us. We reply within one business day. Book a free live demo to see our visitor management system in action."
      />
      <MarketingNav />

      {/* ── Hero ── */}
      <section className="pt-32 pb-16 bg-white relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% -20%, #e0e7ff 0%, transparent 60%)' }}
        />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-4">Contact</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-5 leading-tight">
            Let's{' '}
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }}
            >
              talk
            </span>
          </h1>
          <p className="text-gray-500 text-lg">
            Have questions about pricing, features, or onboarding? Our team is happy to help.
          </p>
        </div>
      </section>

      {/* ── Main content ── */}
      <section className="pb-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

            {/* ── Left column: contact cards + demo callout ── */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {CONTACT_CARDS.map(card => (
                <a
                  key={card.label}
                  href={card.href}
                  target={card.external ? '_blank' : undefined}
                  rel={card.external ? 'noopener noreferrer' : undefined}
                  className="group flex items-start gap-4 bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all"
                >
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl shrink-0 group-hover:shadow-md transition-shadow">
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">{card.label}</p>
                    <p className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">{card.value}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{card.sub}</p>
                  </div>
                </a>
              ))}

              {/* Book a demo callout */}
              <div
                className="rounded-2xl p-6 text-white mt-2"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
              >
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl mb-4">
                  🗓️
                </div>
                <h3 className="font-bold text-lg mb-2">Book a live demo</h3>
                <p className="text-indigo-200 text-sm leading-relaxed mb-4">
                  Want to see VisitantHub in action before you sign up? We'll walk you through the
                  full setup — kiosk, display board, analytics, and all — in 20 minutes.
                </p>
                <a
                  href="https://wa.me/918195011181?text=Hi%2C%20I%27d%20like%20to%20book%20a%20demo%20of%20VisitantHub"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-white text-indigo-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors"
                >
                  Book via WhatsApp
                </a>
              </div>
            </div>

            {/* ── Right column: form ── */}
            <div className="lg:col-span-3">
              {sent ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-4xl">
                    ✅
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Message sent!</h3>
                  <p className="text-gray-500 text-sm max-w-sm">
                    Thanks for reaching out. We'll get back to you within one business day.
                    In the meantime, feel free to{' '}
                    <Link to="/features" className="text-indigo-600 hover:underline">explore the features</Link>.
                  </p>
                  <button
                    onClick={() => setSent(false)}
                    className="mt-2 text-sm text-indigo-600 hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Send us a message</h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={fields.name}
                        onChange={handleChange}
                        placeholder="Priya Sharma"
                        className={`w-full px-4 py-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow ${
                          errors.name ? 'border-red-400' : 'border-gray-200'
                        }`}
                      />
                      {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={fields.email}
                        onChange={handleChange}
                        placeholder="priya@example.com"
                        className={`w-full px-4 py-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow ${
                          errors.email ? 'border-red-400' : 'border-gray-200'
                        }`}
                      />
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={fields.phone}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                      />
                    </div>

                    {/* Company */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                        Company
                      </label>
                      <input
                        type="text"
                        name="company"
                        value={fields.company}
                        onChange={handleChange}
                        placeholder="Acme Corp"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div className="mb-6">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      rows={5}
                      value={fields.message}
                      onChange={handleChange}
                      placeholder="Tell us about your office, how many visitors you get per day, and what you're looking for..."
                      className={`w-full px-4 py-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow resize-none ${
                        errors.message ? 'border-red-400' : 'border-gray-200'
                      }`}
                    />
                    {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
                  >
                    {sending ? 'Sending…' : 'Send Message →'}
                  </button>

                  <p className="text-gray-400 text-xs text-center mt-4">
                    We'll reply within one business day. Fields marked{' '}
                    <span className="text-red-400">*</span> are required.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
