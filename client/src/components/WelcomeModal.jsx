import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ADMIN_STEPS = [
  {
    icon: '👥',
    title: 'Add Associates',
    desc: 'Go to the Employees page to add your team members, assign services, and set their roles.',
    link: '/company/employees',
    linkLabel: 'Go to Employees →',
  },
  {
    icon: '🕐',
    title: 'Set Availability',
    desc: 'Open Scheduling → Availability to define each associate\'s working days, hours, and appointment slot duration.',
    link: '/company/scheduling',
    linkLabel: 'Set Availability →',
  },
  {
    icon: '🔗',
    title: 'Share Your Booking Link',
    desc: 'Visitors can book appointments through your unique booking page. Find the link in Scheduling → Bookings.',
    link: '/company/scheduling',
    linkLabel: 'View Booking Link →',
  },
  {
    icon: '✅',
    title: 'Manage Visits',
    desc: 'Approve or reject walk-in visitors and scheduled appointments from the Visits page in real time.',
    link: '/company/visits',
    linkLabel: 'Go to Visits →',
  },
];

const ASSOCIATE_STEPS = [
  {
    icon: '📅',
    title: 'Your Appointments',
    desc: 'Check your scheduled appointments from the banner on your Dashboard. Approve or reject them before the visit day.',
    link: null,
  },
  {
    icon: '✅',
    title: 'Manage Your Visits',
    desc: 'Visitors assigned to you appear in My Visits. Approve them when they arrive and mark as Done when finished.',
    link: '/user/visits',
    linkLabel: 'Go to My Visits →',
  },
  {
    icon: '🔔',
    title: 'Live Notifications',
    desc: 'You\'ll get a WhatsApp message each time a new visitor checks in for you. Keep your phone handy.',
    link: null,
  },
  {
    icon: '📊',
    title: 'Track Your Day',
    desc: 'Your Dashboard shows today\'s visit count, pending approvals, and completed visits at a glance.',
    link: null,
  },
];

export default function WelcomeModal({ role, userId, companyName }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const key = `welcome_shown_${userId}`;
    if (!localStorage.getItem(key)) setOpen(true);
  }, [userId]);

  function dismiss() {
    localStorage.setItem(`welcome_shown_${userId}`, '1');
    setOpen(false);
  }

  if (!open) return null;

  const isAdmin = role === 'company_admin';
  const steps   = isAdmin ? ADMIN_STEPS : ASSOCIATE_STEPS;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,35,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-gray-100"
          style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-md"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            👋
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
            Welcome to {companyName || 'VisitantHub'}!
          </h2>
          <p className="text-gray-500 text-sm">
            {isAdmin
              ? "Here's a quick guide to get your visitor management system up and running."
              : "Here's what you can do from your associate portal."}
          </p>
        </div>

        {/* Steps */}
        <div className="p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {steps.map((step, i) => (
              <div key={i}
                className="rounded-xl border border-gray-100 p-5 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xl shrink-0">
                    {step.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Step {i + 1}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm mb-1">{step.title}</h3>
                    <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
                    {step.link && (
                      <Link to={step.link} onClick={dismiss}
                        className="inline-block mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline">
                        {step.linkLabel}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center sm:text-left">
              You can always find help by revisiting this guide from your profile menu.
            </p>
            <button
              onClick={dismiss}
              className="px-8 py-2.5 rounded-xl font-bold text-sm text-white shadow-md hover:opacity-90 transition-all whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              Get Started →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
