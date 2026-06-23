import { Link } from 'react-router-dom';

export default function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400">
      {/* Main footer grid */}
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

        {/* Col 1: Brand */}
        <div>
          <Link to="/" className="inline-block mb-4">
            <img src="/VisitantHub_Main_Logo.png" alt="VisitantHub" className="h-14 w-auto" />
          </Link>
          <p className="text-gray-400 text-sm leading-relaxed mb-2">
            Visitor Management Made Effortless
          </p>
          <p className="text-gray-600 text-xs">by Sonnet Infotech</p>
        </div>

        {/* Col 2: Product */}
        <div>
          <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-widest">Product</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/features" className="hover:text-white transition-colors">Features</Link></li>
            <li><Link to="/pricing"  className="hover:text-white transition-colors">Pricing</Link></li>
            <li><Link to="/#how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
            <li><Link to="/register" className="hover:text-white transition-colors">Register</Link></li>
          </ul>
        </div>

        {/* Col 3: Company */}
        <div>
          <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-widest">Company</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/about"           className="hover:text-white transition-colors">About</Link></li>
            <li><Link to="/contact"          className="hover:text-white transition-colors">Contact</Link></li>
            <li><Link to="/privacy-policy"   className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
          </ul>
        </div>

        {/* Col 4: Contact */}
        <div>
          <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-widest">Contact</h4>
          <ul className="space-y-3 text-sm">
            <li>
              <a href="mailto:info@sonnetinfotech.com" className="hover:text-white transition-colors flex items-start gap-2">
                <span className="shrink-0 mt-0.5">📧</span>
                <span>info@sonnetinfotech.com</span>
              </a>
            </li>
            <li>
              <a href="tel:+919814006629" className="hover:text-white transition-colors flex items-start gap-2">
                <span className="shrink-0 mt-0.5">📞</span>
                <span>+91 98140 06629</span>
              </a>
            </li>
            <li>
              <a
                href="https://wa.me/919814006629"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors flex items-start gap-2"
              >
                <span className="shrink-0 mt-0.5">💬</span>
                <span>WhatsApp Chat</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {year} Sonnet Infotech. All rights reserved.
          </p>

          {/* Social placeholders */}
          <div className="flex items-center gap-4">
            {[
              {
                label: 'LinkedIn',
                href: '#',
                icon: (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                ),
              },
              {
                label: 'Twitter / X',
                href: '#',
                icon: (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                ),
              },
            ].map(s => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
