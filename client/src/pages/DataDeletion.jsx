import { Link } from 'react-router-dom';

const UPDATED = 'June 18, 2026';

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/VisitantHub_Main_Logo.png" alt="VisitantHub" className="h-14 w-auto" />
          </Link>
          <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">← Back to Home</Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-6 py-16 w-full">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Data Deletion Instructions</h1>
          <p className="text-gray-400 text-sm">Last updated: {UPDATED}</p>
        </div>

        <p className="text-gray-600 leading-relaxed mb-10">
          VisitantHub, a product of <strong>Sonnet Infotech</strong>, respects your right to request
          deletion of your personal data. This page explains what data we hold, how to request its
          deletion, and what happens after your request is submitted.
        </p>

        {/* What data we hold */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">What Data We Hold</h2>
          <div className="space-y-3 text-gray-600 leading-relaxed">
            <p>Depending on how you interacted with VisitantHub, we may hold:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Visitor check-in records</strong> — name, mobile number, email address, purpose of visit, visit timestamp, and any custom fields collected by the host company at check-in.</li>
              <li><strong>Company account data</strong> — company name, admin email, password hash, logo, branding preferences, and WhatsApp configuration.</li>
              <li><strong>Associate profiles</strong> — name, phone, email, designation, and office location.</li>
              <li><strong>Visit history</strong> — visit status, notes, service used, and associated timestamps.</li>
            </ul>
          </div>
        </section>

        {/* How to request deletion */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">How to Request Data Deletion</h2>
          <div className="space-y-4 text-gray-600 leading-relaxed">

            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
              <p className="font-semibold text-indigo-900 mb-1">Option 1 — Email Request (All Users)</p>
              <p className="text-sm text-indigo-700 mb-3">Send a deletion request to our privacy team:</p>
              <a href="mailto:info@visitanthub.com?subject=Data Deletion Request&body=Hello,%0A%0AI would like to request deletion of my personal data from VisitantHub.%0A%0AName:%0AMobile / Email associated with my data:%0A%0AThank you."
                className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
                ✉ Email info@visitanthub.com
              </a>
              <p className="text-xs text-indigo-600 mt-3">
                Please include your full name and the mobile number or email address associated with your
                visit record so we can locate and delete the correct data.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
              <p className="font-semibold text-gray-900 mb-1">Option 2 — Contact the Host Company</p>
              <p className="text-sm text-gray-600">
                If you checked in as a visitor at a specific organisation (e.g., a corporate office, clinic,
                or institution) that uses VisitantHub, you may contact that organisation directly. Company
                admins have the ability to delete individual visitor records from their dashboard immediately.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
              <p className="font-semibold text-gray-900 mb-1">Option 3 — Company Account Closure</p>
              <p className="text-sm text-gray-600">
                If you are a company admin and wish to close your entire account and delete all associated
                data, email us at{' '}
                <a href="mailto:info@visitanthub.com" className="text-indigo-600 hover:underline">
                  info@visitanthub.com
                </a>{' '}
                with the subject line <em>"Account Closure Request"</em>.
              </p>
            </div>
          </div>
        </section>

        {/* What happens next */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">What Happens After Your Request</h2>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-4">
              <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div>
                <p className="font-medium text-gray-900">Acknowledgement</p>
                <p className="text-sm mt-0.5">We will acknowledge your request within <strong>2 business days</strong> of receiving it.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div>
                <p className="font-medium text-gray-900">Verification</p>
                <p className="text-sm mt-0.5">We may ask you to verify your identity to ensure we delete the correct records and protect against unauthorised deletion requests.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">3</span>
              <div>
                <p className="font-medium text-gray-900">Deletion</p>
                <p className="text-sm mt-0.5">Your data will be permanently deleted from our systems within <strong>30 days</strong> of verification. This includes visit records, personal details, and any associated logs.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">4</span>
              <div>
                <p className="font-medium text-gray-900">Confirmation</p>
                <p className="text-sm mt-0.5">We will send you a confirmation email once the deletion is complete.</p>
              </div>
            </li>
          </ol>
        </section>

        {/* Exceptions */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Exceptions</h2>
          <p className="text-gray-600 leading-relaxed">
            In certain circumstances we may be required to retain some data even after a deletion request,
            for example to comply with a legal obligation, resolve a dispute, or enforce our agreements.
            In such cases, we will inform you of the specific data retained and the reason for retention.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Contact</h2>
          <div className="bg-gray-50 rounded-xl p-5 text-sm space-y-1 text-gray-600">
            <p className="font-semibold text-gray-900">Sonnet Infotech — VisitantHub Privacy Team</p>
            <p>Email: <a href="mailto:info@visitanthub.com" className="text-indigo-600 hover:underline">privacy@visitanthub.com</a></p>
            <p className="text-xs text-gray-400 mt-2">We aim to respond to all privacy-related enquiries within 2 business days.</p>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Sonnet Infotech. All rights reserved. ·{' '}
        <Link to="/privacy-policy" className="hover:text-gray-600">Privacy Policy</Link>
        {' · '}
        <Link to="/terms-of-service" className="hover:text-gray-600">Terms of Service</Link>
      </footer>
    </div>
  );
}

