import { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

/* ── Token top-up packages ───────────────────────────────────────────────── */
const TOKEN_PACKS = [
  { tokens: 500,  price: 499,  label: 'Value Pack',    desc: '500 tokens — great for getting started' },
  { tokens: 1000, price: 999,  label: 'Standard Pack', desc: '1,000 tokens — most popular choice',    popular: true },
  { tokens: 2500, price: 2499, label: 'Premium Pack',  desc: '2,500 tokens — best value per token'   },
];

/* ── Subscription plan metadata ──────────────────────────────────────────── */
const PLAN_META = {
  starter: {
    label:    'Starter',
    color:    'gray',
    features: ['200 free tokens on signup', 'Up to 500 visits / month', '1 associate', '1 service'],
  },
  pro: {
    label:    'Pro',
    color:    'indigo',
    price:    999,
    tokens:   300,
    features: ['Unlimited visits', 'Up to 15 associates', 'Up to 15 services', '300 tokens / month included', 'TV display board', 'Advanced analytics'],
  },
  gold: {
    label:    'Gold',
    color:    'amber',
    price:    2499,
    tokens:   1000,
    features: ['Everything in Pro', 'Unlimited associates & services', '1,000 tokens included / month', 'Dedicated account manager'],
  },
};

const MESSAGE_TYPE_LABELS = {
  visit_arrival_notification:   'Visit Arrival',
  visit_approved_notification:  'Visit Approved',
  booking_confirmation:         'Booking Confirmed',
  visitor_checkin_confirmation: 'Check-in Confirmed',
};

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function fmtDate(dt) {
  return new Date(dt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function fmtDateOnly(dt) {
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysLeft(expiresAt) {
  return Math.max(0, Math.ceil((new Date(expiresAt) - Date.now()) / 86400000));
}

function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const range = [];
  const delta = 2;
  const left  = Math.max(2, page - delta);
  const right = Math.min(pages - 1, page + delta);
  range.push(1);
  if (left > 2) range.push('…');
  for (let i = left; i <= right; i++) range.push(i);
  if (right < pages - 1) range.push('…');
  if (pages > 1) range.push(pages);

  return (
    <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-gray-100 bg-gray-50">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1}
        className="px-2.5 py-1.5 rounded-md text-xs font-semibold text-indigo-600 disabled:text-gray-300 disabled:cursor-not-allowed hover:bg-indigo-50 transition-colors">
        ← Prev
      </button>
      <div className="flex items-center gap-1">
        {range.map((p, i) =>
          p === '…'
            ? <span key={`e${i}`} className="px-1 text-xs text-gray-400">…</span>
            : <button key={p} onClick={() => onChange(p)}
                className={`min-w-[30px] px-2 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  p === page ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                {p}
              </button>
        )}
      </div>
      <button onClick={() => onChange(page + 1)} disabled={page >= pages}
        className="px-2.5 py-1.5 rounded-md text-xs font-semibold text-indigo-600 disabled:text-gray-300 disabled:cursor-not-allowed hover:bg-indigo-50 transition-colors">
        Next →
      </button>
    </div>
  );
}

/* ── Plan badge ──────────────────────────────────────────────────────────── */
function PlanBadge({ plan }) {
  const colors = {
    starter: 'bg-gray-100 text-gray-600',
    pro:     'bg-indigo-100 text-indigo-700',
    gold:    'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${colors[plan] || colors.starter}`}>
      {PLAN_META[plan]?.label || plan}
    </span>
  );
}

export default function Billing() {
  const [tab,        setTab]        = useState('overview');
  const [planInfo,   setPlanInfo]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [requesting, setRequesting] = useState(null); // token pack tokens count
  const [planBuying, setPlanBuying] = useState(null); // 'pro' | 'gold'

  const [ledger,        setLedger]        = useState([]);
  const [ledgerPage,    setLedgerPage]    = useState(1);
  const [ledgerTotal,   setLedgerTotal]   = useState(0);
  const [ledgerPages,   setLedgerPages]   = useState(1);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  useEffect(() => {
    api.get('/billing/plan')
      .then(({ data }) => setPlanInfo(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fetchLedger = useCallback((page = 1) => {
    setLedgerLoading(true);
    api.get('/billing/ledger', { params: { page, limit: 20 } })
      .then(({ data }) => {
        setLedger(data.entries);
        setLedgerTotal(data.total);
        setLedgerPages(data.pages);
        setLedgerPage(page);
      })
      .catch(() => {})
      .finally(() => setLedgerLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'ledger') fetchLedger(1);
  }, [tab, fetchLedger]);

  /* ── Token top-up ────────────────────────────────────────────────────── */
  async function handleBuyTokens(pack) {
    setRequesting(pack.tokens);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) { toast.error('Could not load payment gateway.'); setRequesting(null); return; }

      const { data } = await api.post('/billing/create-order', { tokens: pack.tokens });
      const rzp = new window.Razorpay({
        key:         data.key_id,
        amount:      data.amount,
        currency:    data.currency,
        name:        'VisitantHub',
        description: `${pack.label} — ${pack.tokens.toLocaleString()} WhatsApp tokens`,
        order_id:    data.order_id,
        theme:       { color: '#6366f1' },
        handler: async (response) => {
          try {
            const { data: result } = await api.post('/billing/verify', {
              order_id:   response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature:  response.razorpay_signature,
              tokens:     pack.tokens,
            });
            setPlanInfo(p => ({ ...p, whatsapp_tokens: result.whatsapp_tokens }));
            toast.success(`${pack.tokens.toLocaleString()} tokens added to your account!`);
            fetchLedger(1);
          } catch (err) {
            toast.error(err.response?.data?.message || 'Token credit failed. Contact support.');
          } finally {
            setRequesting(null);
          }
        },
        modal: { ondismiss: () => setRequesting(null) },
      });
      rzp.on('payment.failed', () => { toast.error('Payment failed.'); setRequesting(null); });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment.');
      setRequesting(null);
    }
  }

  /* ── Plan upgrade / renew ────────────────────────────────────────────── */
  async function handleUpgradePlan(planKey) {
    setPlanBuying(planKey);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) { toast.error('Could not load payment gateway.'); setPlanBuying(null); return; }

      const meta = PLAN_META[planKey];
      const { data } = await api.post('/billing/plan/create-order', { plan: planKey });
      const rzp = new window.Razorpay({
        key:         data.key_id,
        amount:      data.amount,
        currency:    data.currency,
        name:        'VisitantHub',
        description: `${meta.label} Plan — 30 days${meta.tokens ? ` + ${meta.tokens.toLocaleString()} tokens` : ''}`,
        order_id:    data.order_id,
        theme:       { color: planKey === 'gold' ? '#d97706' : '#6366f1' },
        handler: async (response) => {
          try {
            const { data: result } = await api.post('/billing/plan/verify', {
              order_id:   response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature:  response.razorpay_signature,
              plan:       planKey,
            });
            setPlanInfo(p => ({ ...p, plan: result.plan, plan_expires_at: result.plan_expires_at, whatsapp_tokens: result.whatsapp_tokens }));
            toast.success(`${meta.label} Plan activated! ${meta.tokens ? `${meta.tokens.toLocaleString()} tokens credited.` : ''}`);
            if (tab === 'ledger' && meta.tokens) fetchLedger(1);
          } catch (err) {
            toast.error(err.response?.data?.message || 'Plan activation failed. Contact support.');
          } finally {
            setPlanBuying(null);
          }
        },
        modal: { ondismiss: () => setPlanBuying(null) },
      });
      rzp.on('payment.failed', () => { toast.error('Payment failed.'); setPlanBuying(null); });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment.');
      setPlanBuying(null);
    }
  }

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>;

  const currentPlan = planInfo?.plan || 'starter';
  const tokens      = planInfo?.whatsapp_tokens ?? 0;
  const pct         = Math.min(100, (tokens / 200) * 100);
  const expires     = planInfo?.plan_expires_at;
  const days        = expires ? daysLeft(expires) : 0;

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Billing &amp; Plan</h1>
      <p className="text-gray-500 mb-6">Manage your subscription and WhatsApp message credits</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'overview', label: 'Overview'           },
          { key: 'ledger',   label: 'Transaction Ledger' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {tab === 'overview' && (
        <>
          {/* ── Current Plan Card ── */}
          <div className="card mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Current Plan</p>
                <div className="flex items-center gap-2">
                  <PlanBadge plan={currentPlan} />
                  {expires && days > 0 && (
                    <span className={`text-xs font-medium ${days <= 7 ? 'text-red-500' : 'text-gray-400'}`}>
                      Expires {fmtDateOnly(expires)} ({days} day{days === 1 ? '' : 's'} left)
                    </span>
                  )}
                  {expires && days === 0 && (
                    <span className="text-xs font-medium text-red-500">Expired</span>
                  )}
                </div>
              </div>
              {currentPlan !== 'starter' && (
                <button onClick={() => handleUpgradePlan(currentPlan)} disabled={planBuying !== null}
                  className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 ${
                    currentPlan === 'gold'
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  }`}>
                  {planBuying === currentPlan ? 'Opening…' : 'Renew'}
                </button>
              )}
            </div>

            <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-5">
              {PLAN_META[currentPlan]?.features.map(f => (
                <li key={f} className="flex items-center gap-1.5 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {/* Upgrade options */}
            {currentPlan !== 'gold' && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Upgrade your plan</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentPlan === 'starter' && (
                    <button onClick={() => handleUpgradePlan('pro')} disabled={planBuying !== null}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-60 text-left group">
                      <div>
                        <p className="text-sm font-bold text-indigo-700">Pro</p>
                        <p className="text-xs text-indigo-500 mt-0.5">Unlimited visits · 15 associates · display board</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-base font-extrabold text-indigo-700">₹999</p>
                        <p className="text-[10px] text-indigo-400">/month</p>
                      </div>
                    </button>
                  )}
                  <button onClick={() => handleUpgradePlan('gold')} disabled={planBuying !== null}
                    className="flex items-center justify-between px-4 py-3 rounded-xl border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-60 text-left group">
                    <div>
                      <p className="text-sm font-bold text-amber-800">Gold</p>
                      <p className="text-xs text-amber-600 mt-0.5">1,000 tokens / month · unlimited associates</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-base font-extrabold text-amber-800">₹2,499</p>
                      <p className="text-[10px] text-amber-500">/month</p>
                    </div>
                  </button>
                </div>
                {planBuying && (
                  <p className="text-xs text-gray-400 mt-2 text-center">Opening payment gateway…</p>
                )}
              </div>
            )}
          </div>

          {/* ── Token Balance Card ── */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-500">WhatsApp Token Balance</p>
                <p className="text-4xl font-black text-gray-900 mt-1">{tokens.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">1 token = 1 WhatsApp message sent</p>
              </div>
              <div className="w-20 h-20 relative">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#6366f1" strokeWidth="3"
                    strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-indigo-600">
                  {Math.round(pct)}%
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div className="h-2 rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: tokens < 50 ? '#ef4444' : '#6366f1' }} />
            </div>
            <p className="text-xs text-gray-400">
              {tokens === 0
                ? '⚠️ No tokens remaining — WhatsApp messages are paused. Top up to resume.'
                : tokens < 50
                ? `⚠️ Low balance — only ${tokens} messages remaining.`
                : `${tokens} messages remaining`}
            </p>
          </div>

          {/* ── Referral promo ── */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 flex gap-3">
            <span className="text-2xl shrink-0">🎁</span>
            <div>
              <p className="text-sm font-semibold text-indigo-800">Earn free tokens via referrals</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Share your referral link from the dashboard. Every time someone registers using your link, you get <strong>250 free tokens</strong> instantly.
              </p>
            </div>
          </div>

          {/* ── Top-up Token Packs ── */}
          <h2 className="text-base font-semibold text-gray-900 mb-4">Purchase Extra Tokens</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {TOKEN_PACKS.map(pack => (
              <div key={pack.tokens}
                className={`rounded-2xl border-2 p-5 flex flex-col gap-3 transition-shadow hover:shadow-md ${
                  pack.popular ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-gray-200 bg-white'
                }`}>
                {pack.popular && (
                  <span className="self-start text-[10px] font-bold px-2 py-0.5 bg-indigo-600 text-white rounded-full">Most Popular</span>
                )}
                <div>
                  <p className="text-base font-bold text-gray-900">{pack.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{pack.desc}</p>
                </div>
                <span className="text-3xl font-black text-gray-900">₹{pack.price}</span>
                <div className="text-sm font-semibold text-indigo-600">{pack.tokens.toLocaleString()} tokens</div>
                <button
                  onClick={() => handleBuyTokens(pack)}
                  disabled={requesting !== null}
                  className={`mt-auto py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${
                    pack.popular ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>
                  {requesting === pack.tokens ? 'Opening…' : 'Buy Now'}
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 text-center">
            Payments processed securely via Razorpay. Tokens credited instantly. Contact{' '}
            <a href="mailto:support@visitanthub.com" className="underline text-indigo-500">support@visitanthub.com</a>{' '}
            for bulk pricing.
          </p>
        </>
      )}

      {/* ── Transaction Ledger Tab ── */}
      {tab === 'ledger' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {ledgerTotal > 0 ? `${ledgerTotal} total transactions` : 'All token credits and debits'}
            </p>
            <button onClick={() => fetchLedger(ledgerPage)}
              className="text-xs font-semibold text-indigo-600 hover:underline">
              Refresh
            </button>
          </div>

          <div className="card overflow-hidden p-0">
            {ledgerLoading ? (
              <div className="p-12 text-center text-gray-400 text-sm">Loading…</div>
            ) : ledger.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500 font-medium mb-1">No transactions yet</p>
                <p className="text-gray-400 text-sm">Token purchases and WhatsApp messages will appear here.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date &amp; Time</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Recipient / Ref</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tokens</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ledger.map(entry => (
                        <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(entry.created_at)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              entry.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {entry.type === 'credit' ? '↑ Credit' : '↓ Debit'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700">
                            {entry.message_type
                              ? (MESSAGE_TYPE_LABELS[entry.message_type] || entry.message_type)
                              : entry.description}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                            {entry.recipient
                              ? `+91 ${entry.recipient}`
                              : entry.reference_id
                              ? <span className="text-gray-400" title={entry.reference_id}>{entry.reference_id.slice(0, 20)}…</span>
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                            <span className={entry.type === 'credit' ? 'text-green-600' : 'text-red-500'}>
                              {entry.type === 'credit' ? '+' : '−'}{entry.amount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-500 whitespace-nowrap">
                            {entry.balance_after.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={ledgerPage} pages={ledgerPages} onChange={fetchLedger} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
