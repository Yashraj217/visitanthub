import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

const UPDATED = 'June 18, 2026';

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-3 text-gray-600 leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Seo title="Terms of Service" path="/terms-of-service" description="Read VisitantHub's Terms of Service governing the use of our visitor management platform." noIndex />
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
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Terms of Service</h1>
          <p className="text-gray-400 text-sm">Last updated: {UPDATED}</p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>
            By registering for, accessing, or using VisitantHub (the "Service"), a product of{' '}
            <strong>Sonnet Infotech</strong>, you agree to be bound by these Terms of Service ("Terms").
            If you are using the Service on behalf of an organisation, you represent that you have the
            authority to bind that organisation to these Terms.
          </p>
          <p>
            If you do not agree to these Terms, you may not use the Service.
          </p>
        </Section>

        <Section title="2. Description of Service">
          <p>
            VisitantHub is a cloud-based visitor management platform that enables organisations to manage
            visitor check-ins, associate queues, TV display boards, WhatsApp notifications, and visit
            analytics.
          </p>
          <p>
            The Service includes a web dashboard, a public-facing visitor kiosk, a TV display board, a
            mobile application, and related APIs.
          </p>
        </Section>

        <Section title="3. Account Registration">
          <p>To use the Service as a company admin or associate, you must register and create an account.
          You agree to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide accurate and complete registration information</li>
            <li>Keep your login credentials confidential</li>
            <li>Notify us immediately of any unauthorised use of your account</li>
            <li>Be responsible for all activity that occurs under your account</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms or that we
          believe are being used fraudulently.</p>
        </Section>

        <Section title="4. Acceptable Use">
          <p>You agree not to use VisitantHub to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Collect visitor data for purposes beyond legitimate visitor management</li>
            <li>Send unsolicited, deceptive, or harassing notifications to visitors or associates</li>
            <li>Attempt to access another company's data or systems</li>
            <li>Reverse-engineer, decompile, or attempt to extract the source code of the platform</li>
            <li>Upload malicious code, viruses, or any content that disrupts the Service</li>
            <li>Use the Service in violation of any applicable law or regulation</li>
          </ul>
        </Section>

        <Section title="5. Visitor Data & Privacy">
          <p>
            As a company admin, you are responsible for informing your visitors that their personal data
            is being collected and processed through VisitantHub. You must comply with applicable data
            protection laws (including any local privacy regulations) when deploying the kiosk or
            collecting visitor information.
          </p>
          <p>
            VisitantHub acts as a data processor on your behalf for visitor data. Our use of that data is
            governed by our <Link to="/privacy-policy" className="text-indigo-600 hover:underline">Privacy Policy</Link>.
          </p>
        </Section>

        <Section title="6. Subscription & Payments">
          <p>
            VisitantHub offers both free and paid subscription plans. Paid plans are billed monthly or as
            agreed at the time of purchase. All fees are non-refundable except where required by applicable
            law.
          </p>
          <p>
            We reserve the right to change pricing at any time. Existing subscribers will be notified at
            least 30 days before any price change takes effect.
          </p>
          <p>
            Failure to pay for a paid plan may result in downgrade to the free tier or suspension of the
            account.
          </p>
        </Section>

        <Section title="7. WhatsApp Notifications">
          <p>
            VisitantHub supports WhatsApp-based notifications for visitor check-ins, appointment
            confirmations, and visit approvals. However, WhatsApp messaging is <strong>not included</strong> in
            any VisitantHub subscription plan and is <strong>not free</strong>.
          </p>
          <p>
            The setup, configuration, and ongoing costs of WhatsApp Business API access are the sole
            responsibility of the client. This includes, but is not limited to:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Creating and maintaining a Meta (Facebook) Business Manager account</li>
            <li>Registering and verifying a WhatsApp Business API phone number</li>
            <li>Getting message templates approved by Meta</li>
            <li>Paying any charges levied by Meta for WhatsApp message delivery</li>
          </ul>
          <p>
            Sonnet Infotech provides the technical integration within the platform but is not responsible
            for WhatsApp API availability, message delivery failures, template rejections, or any costs
            incurred through Meta's WhatsApp Business Platform.
          </p>
        </Section>

        <Section title="8. Intellectual Property">
          <p>
            All intellectual property rights in VisitantHub — including the software, design, trademarks,
            and content — are owned by Sonnet Infotech. These Terms do not grant you any right to use our
            trademarks, logos, or brand features.
          </p>
          <p>
            You retain ownership of any data you upload or input into the Service (visitor records, company
            content, etc.). By using the Service, you grant Sonnet Infotech a limited licence to store and
            process that data solely to provide the Service.
          </p>
        </Section>

        <Section title="9. Availability & Uptime">
          <p>
            We strive to keep VisitantHub available at all times, but we do not guarantee uninterrupted
            or error-free access. We may take the Service offline for maintenance, upgrades, or reasons
            beyond our control.
          </p>
          <p>
            We are not liable for any loss or damage caused by downtime, data loss, or inability to
            access the Service.
          </p>
        </Section>

        <Section title="10. Limitation of Liability">
          <p>
            To the fullest extent permitted by law, Sonnet Infotech shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages, including loss of profits, data, or
            goodwill, arising from your use of or inability to use the Service.
          </p>
          <p>
            Our total liability to you for any claim arising out of these Terms or the Service shall not
            exceed the amount you paid us in the three months preceding the claim.
          </p>
        </Section>

        <Section title="11. Termination">
          <p>
            You may terminate your account at any time by contacting us. Upon termination, your data will
            be deleted within 30 days as described in our Privacy Policy.
          </p>
          <p>
            We may terminate or suspend your account at any time, with or without notice, for violation of
            these Terms or for any other reason at our sole discretion.
          </p>
        </Section>

        <Section title="12. Governing Law">
          <p>
            These Terms are governed by the laws of India. Any disputes arising from these Terms or your
            use of the Service shall be subject to the exclusive jurisdiction of the courts in India.
          </p>
        </Section>

        <Section title="13. Changes to These Terms">
          <p>
            We may revise these Terms from time to time. The "Last updated" date at the top of this page
            reflects the most recent revision. We will notify registered users of material changes by email.
            Continued use of the Service after changes take effect constitutes your acceptance of the
            revised Terms.
          </p>
        </Section>

        <Section title="14. Contact Us">
          <p>For questions about these Terms, please contact:</p>
          <div className="bg-gray-50 rounded-xl p-5 mt-2 text-sm space-y-1">
            <p className="font-semibold text-gray-900">Sonnet Infotech</p>
            <p>Product: VisitantHub</p>
            <p>Email: <a href="mailto:info@visitanthub.com" className="text-indigo-600 hover:underline">info@visitanthub.com</a></p>
          </div>
        </Section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Sonnet Infotech. All rights reserved. ·{' '}
        <Link to="/privacy-policy" className="hover:text-gray-600">Privacy Policy</Link>
      </footer>
    </div>
  );
}

