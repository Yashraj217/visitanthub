import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ── Help content ─────────────────────────────────────────────────────────── */

const ARTICLES = [
  // ── Getting Started ──────────────────────────────────────────────────────
  {
    id: 'gs-1',
    category: 'Getting Started',
    icon: '🚀',
    roles: ['company_admin'],
    title: 'How to set up your account',
    body: `Follow these steps to get your visitor management system running:

1. **Add Associates** — Go to Employees and add each team member. Assign them a service (e.g. ENT, Gynaecologist).
2. **Set Availability** — Go to Scheduling → Availability. Select each associate and set their working days, hours, and appointment slot duration (e.g. 15 min).
3. **Customise Services** — Go to Services to add or edit the services your company offers.
4. **Share Your Booking Link** — Find your unique booking URL in Scheduling → Bookings. Share it with visitors so they can book appointments online.
5. **Set Up Visitor Kiosk** — Share the Display Board URL (from Dashboard) on a TV or tablet at your reception.`,
  },
  {
    id: 'gs-2',
    category: 'Getting Started',
    icon: '🔗',
    roles: ['company_admin'],
    title: 'Finding and sharing your booking link',
    body: `Your visitors can book appointments through a dedicated URL unique to your company.

**Where to find it:**
Go to **Scheduling → Bookings tab**. Your public booking link is shown at the top of the page.

**What visitors see:**
They can choose a service, pick an associate, select a date and available time slot, and enter their details. After submitting, they receive a booking reference (BK-***) and a WhatsApp confirmation.

**Tip:** Add the booking link to your website, Google Business profile, or share it via WhatsApp.`,
  },
  {
    id: 'gs-3',
    category: 'Getting Started',
    icon: '📺',
    roles: ['company_admin'],
    title: 'Setting up the Display Board',
    body: `The Display Board is a live screen meant for your reception TV or waiting area tablet.

**How to access:**
The Display Board URL is shown on your Dashboard. Open it on any browser and keep it running full-screen.

**What it shows:**
- Currently being attended visitors
- Pending visitors waiting to be called
- Completed visits for the day

**Auto check-in:**
When a scheduled appointment's time arrives, it is automatically converted into a visit and appears on the Display Board — no manual action needed.`,
  },

  // ── Visits ───────────────────────────────────────────────────────────────
  {
    id: 'v-1',
    category: 'Managing Visits',
    icon: '✅',
    roles: ['company_admin', 'company_user'],
    title: 'Approving and rejecting visits',
    body: `When a visitor checks in, their visit appears as **Pending** in the Visits page.

**To approve:** Click the green ✓ Approve button. The visitor is notified via WhatsApp that they can proceed.
**To reject:** Click the red ✕ Reject button. The visit is marked as cancelled.
**To complete:** Once the visit is done, click Complete (or Mark Completed in the detail panel).

**Tip:** Use the status filter to show only Pending visits sorted oldest-first — this ensures you serve visitors in the order they arrived (queue order).`,
  },
  {
    id: 'v-2',
    category: 'Managing Visits',
    icon: '🟠',
    roles: ['company_admin', 'company_user'],
    title: 'Understanding BK-*** vs VIS-*** references',
    body: `Every visit has a reference number that tells you how the visitor arrived:

- **VIS-*** (blue)** — Walk-in visitor. They used the physical kiosk or QR code at reception.
- **BK-*** (orange)** — Scheduled appointment. The visitor booked in advance through your booking link.

BK-*** visits are highlighted in orange throughout the Visits page and mobile app to help you distinguish them at a glance.`,
  },
  {
    id: 'v-3',
    category: 'Managing Visits',
    icon: '🔄',
    roles: ['company_admin', 'company_user'],
    title: 'Auto-refresh and live updates',
    body: `The Visits page refreshes automatically every 2 minutes so new visitors appear without you having to reload.

You can also:
- Click **Refresh** at any time for an immediate update.
- Pull down on the mobile app to refresh.
- Enable push notifications on the mobile app to get an instant alert when a new visitor checks in.`,
  },
  {
    id: 'v-4',
    category: 'Managing Visits',
    icon: '↕️',
    roles: ['company_admin', 'company_user'],
    title: 'Sorting visits',
    body: `You can control the order visits are shown:

- **Pending visits** default to **Oldest First** — so you serve visitors in the order they arrived (first come, first served).
- **All other filters** default to **Newest First** — most recent visits at the top.

Use the **↑ Oldest First / ↓ Newest First** button below the page title to toggle the order at any time.`,
  },

  // ── Scheduling ───────────────────────────────────────────────────────────
  {
    id: 's-1',
    category: 'Scheduling & Appointments',
    icon: '📅',
    roles: ['company_admin'],
    title: 'How scheduled appointments work',
    body: `**Full flow:**
1. Visitor books through your booking link → status: **Pending**
2. Admin or associate approves → status: **Confirmed**
3. On the appointment day at the scheduled time → system automatically creates a visit → status: **Checked In**
4. Associate approves the visit → status: **Approved** → visitor receives WhatsApp notification
5. Visit is completed → status: **Completed**

**Automatic check-in:**
The server checks every 5 minutes for confirmed appointments whose time has arrived and converts them into visits automatically — even if nobody is watching the display board.`,
  },
  {
    id: 's-2',
    category: 'Scheduling & Appointments',
    icon: '🕐',
    roles: ['company_admin'],
    title: 'Setting associate availability',
    body: `Availability controls which time slots visitors can book for each associate.

**Steps:**
1. Go to **Scheduling → Availability tab**
2. Select an associate from the dropdown
3. Toggle the days they work (Mon–Sun)
4. Set start time and end time for each active day
5. Set the **slot duration** (e.g. 15 min = slots at 9:00, 9:15, 9:30…)
6. Click **Save Availability**

**Multiple time windows:**
You can add a second window per day (e.g. 9am–1pm and 2pm–5pm) for lunch breaks.

**Tip:** If an associate has no availability set, no time slots will appear on the booking page for them.`,
  },
  {
    id: 's-3',
    category: 'Scheduling & Appointments',
    icon: '🚫',
    roles: ['company_admin'],
    title: 'Preventing duplicate bookings',
    body: `The system automatically prevents a visitor from booking the same date twice for the same company.

If a visitor tries to submit a booking with the same mobile number and date as an existing pending or confirmed booking, they will see:

> **"Booking already exists!"**
> You already have a booking for this date (Ref: BK-XXXXXX). Please check your existing appointment or choose a different date.

This applies regardless of which associate or service they select.`,
  },
  {
    id: 's-4',
    category: 'Scheduling & Appointments',
    icon: '📱',
    roles: ['company_user'],
    title: 'Managing your appointments as an associate',
    body: `When a visitor books an appointment for you, it appears as a banner on your Dashboard.

**Pending appointments:** Need your approval before the visitor's date.
- Click **Approve** to confirm the slot.
- Click **Reject** to decline — the visitor should be notified separately.

**Confirmed appointments:** You have approved them. They will auto-convert to visits on the appointment day.

**On the mobile app:** Tap the appointments banner on your Dashboard to see the full list and take action.`,
  },

  // ── WhatsApp ─────────────────────────────────────────────────────────────
  {
    id: 'w-1',
    category: 'WhatsApp Notifications',
    icon: '💬',
    roles: ['company_admin'],
    title: 'What WhatsApp messages are sent',
    body: `The system can send three types of WhatsApp messages:

1. **Booking Confirmation** → sent to visitor when they book an appointment (BK-***)
   - Contains: Ref, date, time, associate name, service, pending status

2. **Check-in Confirmation** → sent to visitor when they walk in (VIS-***)
   - Contains: Ref, associate, service, number of visitors ahead in queue

3. **Visit Approval** → sent to visitor when their visit is approved
   - Contains: Associate name, location, service, ref

Associates also receive a WhatsApp when a new visitor checks in for them (message goes to the associate, not the visitor).`,
  },
  {
    id: 'w-2',
    category: 'WhatsApp Notifications',
    icon: '⚙️',
    roles: ['company_admin'],
    title: 'Setting up WhatsApp (Twilio or Meta)',
    body: `Go to **Settings → WhatsApp** to configure notifications.

**Option 1 — Twilio (easier, good for testing):**
1. Sign up at twilio.com → activate WhatsApp Sandbox
2. Get Account SID and Auth Token
3. API Key format: \`ACCOUNT_SID|AUTH_TOKEN\`
4. From number: \`whatsapp:+14155238886\`

**Option 2 — Meta (WhatsApp Business API, production):**
1. Create a Meta Business account + WhatsApp Business App
2. Generate a permanent System User token (never expires)
3. Get your Phone Number ID from Meta → WhatsApp → API Setup
4. API Key format: \`ACCESS_TOKEN|PHONE_NUMBER_ID\`
5. Pre-approve message templates in Meta Business Manager

**Note:** If using Meta, the access token expires after 60 days unless you use a System User permanent token.`,
  },

  // ── Employees ────────────────────────────────────────────────────────────
  {
    id: 'e-1',
    category: 'Employees & Associates',
    icon: '👥',
    roles: ['company_admin'],
    title: 'Adding and managing associates',
    body: `Go to **Employees** to manage your team.

**Adding an associate:**
1. Click **+ Add Employee**
2. Enter name, designation, phone, and assign services
3. Set their login credentials (email + password) — they can log in to the Associate Portal
4. Click Save

**Assigning services:**
Each associate can handle one or more services. This determines which time slots appear on the booking page for them.

**Deactivating:**
Use the status toggle to deactivate an associate without deleting them. Their historical visits are preserved.`,
  },

  // ── Export & Data ─────────────────────────────────────────────────────────
  {
    id: 'd-1',
    category: 'Data & Export',
    icon: '📊',
    roles: ['company_admin', 'company_user'],
    title: 'Exporting visit data',
    body: `You can export visits to an Excel file at any time.

**Steps:**
1. Apply any filters you need (status, date, service)
2. Use the search bar to narrow down if needed
3. Click **⬇ Export**
4. An Excel file downloads with all visible columns including internal fields

**What's included:**
Ref #, Visitor, Mobile, Associate, Service, Visit Time, Status, and any internal/hidden fields your company uses.

**Tip:** Filter by date range and status before exporting for cleaner reports.`,
  },
];

const CATEGORIES = [...new Set(ARTICLES.map(a => a.category))];

/* ── Sub-components ──────────────────────────────────────────────────────── */

function ArticleCard({ article }) {
  const [open, setOpen] = useState(false);

  const lines = article.body.split('\n').filter(Boolean);

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${open ? 'border-indigo-200 shadow-md' : 'border-gray-200 hover:border-indigo-200'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="text-xl shrink-0">{article.icon}</span>
        <span className="flex-1 font-semibold text-gray-900 text-sm">{article.title}</span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 bg-white border-t border-gray-100">
          <div className="prose prose-sm max-w-none text-gray-600 space-y-2 text-sm leading-relaxed">
            {lines.map((line, i) => {
              if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={i} className="font-bold text-gray-900 mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>;
              }
              if (line.match(/^\d+\./)) {
                return (
                  <p key={i} className="flex gap-2">
                    <span className="shrink-0 font-semibold text-indigo-600">{line.match(/^\d+/)[0]}.</span>
                    <span dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s*/, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                  </p>
                );
              }
              if (line.startsWith('-')) {
                return (
                  <p key={i} className="flex gap-2 pl-2">
                    <span className="text-indigo-400 shrink-0">•</span>
                    <span dangerouslySetInnerHTML={{ __html: line.replace(/^-\s*/, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                  </p>
                );
              }
              if (line.startsWith('>')) {
                return (
                  <blockquote key={i} className="border-l-4 border-indigo-300 pl-4 italic text-gray-500 bg-indigo-50 py-2 pr-3 rounded-r-lg">
                    {line.replace(/^>\s*/, '')}
                  </blockquote>
                );
              }
              return (
                <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-indigo-700">$1</code>') }} />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function HelpPage() {
  const { user } = useAuth();
  const [search, setSearch]     = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const role = user?.role;

  const visible = useMemo(() => {
    return ARTICLES.filter(a => {
      if (!a.roles.includes(role)) return false;
      if (activeTab !== 'all' && a.category !== activeTab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q) || a.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [role, activeTab, search]);

  const categories = CATEGORIES.filter(cat =>
    ARTICLES.some(a => a.roles.includes(role) && a.category === cat)
  );

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Help & Documentation</h1>
        <p className="text-gray-500 text-sm">Everything you need to know about using {user?.company_name || 'VisitantHub'}.</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="search"
          placeholder="Search help articles…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input w-full pl-11 py-3 text-sm"
        />
      </div>

      {/* Category tabs */}
      {!search.trim() && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${activeTab === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
            All Topics
          </button>
          {categories.map(cat => (
            <button key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${activeTab === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Articles grouped by category */}
      {search.trim() ? (
        <div className="space-y-3">
          {visible.length === 0
            ? <p className="text-center text-gray-400 py-12">No articles match "{search}"</p>
            : visible.map(a => <ArticleCard key={a.id} article={a} />)
          }
        </div>
      ) : (
        categories
          .filter(cat => activeTab === 'all' || cat === activeTab)
          .map(cat => {
            const arts = visible.filter(a => a.category === cat);
            if (!arts.length) return null;
            return (
              <div key={cat} className="mb-8">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{cat}</h2>
                <div className="space-y-2">
                  {arts.map(a => <ArticleCard key={a.id} article={a} />)}
                </div>
              </div>
            );
          })
      )}

      {/* Footer CTA */}
      <div className="mt-12 rounded-2xl p-6 text-center"
        style={{ background: 'linear-gradient(135deg, #f0f4ff, #faf5ff)' }}>
        <p className="font-semibold text-gray-800 mb-1">Still need help?</p>
        <p className="text-sm text-gray-500 mb-4">Reach out to us and we'll get back to you as soon as possible.</p>
        <a href="mailto:info@sonnetinfotech.com"
          className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          Contact Support →
        </a>
      </div>
    </div>
  );
}
