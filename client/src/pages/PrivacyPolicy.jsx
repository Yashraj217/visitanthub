import { Link } from 'react-router-dom';

const UPDATED = 'June 18, 2026';

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-3 text-gray-600 leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/VisitantHub_Main_Logo.png" alt="VisitantHub" className="h-14 w-auto" />
          </Link>
          <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">← Back to Home</Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 w-full">
        <div className="mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Privacy Policy</h1>
          <p className="text-gray-400 text-sm">Last updated: {UPDATED}</p>
        </div>

        <Section title="1. Introduction">
          <p>
            VisitantHub ("we", "our", or "us"), a product of <strong>Sonnet Infotech</strong>, is committed to
            protecting the privacy of all individuals who interact with our visitor management platform. This
            Privacy Policy explains what information we collect, how we use it, and your rights regarding that
            information.
          </p>
          <p>
            By using VisitantHub — whether as a company admin, associate, or a visitor checking in via a kiosk
            — you agree to the practices described in this policy.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p><strong>Visitor data:</strong> When a visitor checks in through a kiosk or QR code, we collect
          their name, mobile number, email address (optional), purpose of visit, and any custom fields defined
          by the host company (e.g., ID number, vehicle number).</p>
          <p><strong>Company & associate data:</strong> When a company registers on VisitantHub, we collect the
          company name, admin email, password (hashed), logo, and branding preferences. Associate profiles
          include name, phone, email, designation, and office location.</p>
          <p><strong>Usage data:</strong> We collect visit timestamps, status changes, and aggregated analytics
          (visit counts by service, period, etc.) to power dashboards and reports.</p>
          <p><strong>Communication data:</strong> WhatsApp or SMS notification content sent through configured
          provider credentials (Twilio, Meta) is processed but not stored beyond what is needed to deliver
          the message.</p>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul className="list-disc pl-5 space-y-2">
            <li>To operate and deliver the visitor management service</li>
            <li>To notify associates when a visitor arrives and notify visitors when their visit is approved</li>
            <li>To generate visit history, analytics, and exportable reports for the host company</li>
            <li>To display live queue information on TV display boards</li>
            <li>To send account-related emails (registration, password reset, invitations)</li>
            <li>To improve platform reliability and troubleshoot issues</li>
          </ul>
          <p>We do <strong>not</strong> sell, rent, or share your personal data with third parties for
          marketing purposes.</p>
        </Section>

        <Section title="4. Data Storage & Security">
          <p>All data is stored on secured servers. Passwords are hashed using bcrypt and are never stored in
          plain text. Database access is restricted to authorised systems only.</p>
          <p>Visitor records are scoped to the company that collected them. No company can access another
          company's visitor data.</p>
          <p>While we take reasonable precautions, no method of electronic transmission or storage is 100%
          secure. We encourage companies to follow good security practices on their end as well.</p>
        </Section>

        <Section title="5. Data Retention">
          <p>Visitor check-in records are retained for as long as the host company's account is active.
          Companies may export or delete records at any time from their dashboard.</p>
          <p>If a company account is closed, all associated data is deleted within 30 days.</p>
        </Section>

        <Section title="6. Third-Party Services">
          <p>VisitantHub integrates with the following third-party services at a company's option:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Twilio</strong> — for WhatsApp notifications (governed by Twilio's Privacy Policy)</li>
            <li><strong>Meta (WhatsApp Cloud API)</strong> — for WhatsApp notifications (governed by Meta's
            Privacy Policy)</li>
          </ul>
          <p>These services receive only the phone number and message text needed to deliver the notification.
          Their use is subject to their respective privacy policies.</p>
        </Section>

        <Section title="7. Cookies">
          <p>VisitantHub uses a minimal session token (stored in localStorage) to keep you logged in. We do
          not use advertising or tracking cookies. The kiosk and TV display pages are session-free and
          require no login.</p>
        </Section>

        <Section title="8. Your Rights">
          <p>Visitors who wish to request deletion of their personal data collected during a visit may contact
          the host company directly or reach us at the address below. We will facilitate deletion within a
          reasonable timeframe.</p>
          <p>Company admins may export or delete visitor records at any time via their dashboard.</p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>VisitantHub is not directed at children under the age of 13. We do not knowingly collect
          personal information from children. If you believe a child's data has been submitted, please
          contact us and we will remove it promptly.</p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. The "Last updated" date at the top of this
          page will reflect the most recent revision. Continued use of the platform after changes constitutes
          acceptance of the updated policy.</p>
        </Section>

        <Section title="11. Contact Us">
          <p>For any questions, concerns, or data requests related to this Privacy Policy, please contact:</p>
          <div className="bg-gray-50 rounded-xl p-5 mt-2 text-sm space-y-1">
            <p className="font-semibold text-gray-900">Sonnet Infotech</p>
            <p>Product: VisitantHub</p>
            <p>Email: <a href="mailto:privacy@visitanthub.com" className="text-indigo-600 hover:underline">privacy@visitanthub.com</a></p>
          </div>
        </Section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Sonnet Infotech. All rights reserved. ·{' '}
        <Link to="/terms-of-service" className="hover:text-gray-600">Terms of Service</Link>
      </footer>
    </div>
  );
}

