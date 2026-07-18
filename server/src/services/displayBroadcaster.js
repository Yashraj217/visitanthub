// In-memory SSE client registry for the TV display board.
// Keyed by company_id; each value is a Set of active response objects.
// Works correctly with nodeProcessCountPerApplication=1.
const clients = new Map(); // companyId → Set<res>

function subscribe(companyId, res) {
  if (!clients.has(companyId)) clients.set(companyId, new Set());
  clients.get(companyId).add(res);
  return function unsubscribe() {
    const set = clients.get(companyId);
    if (set) {
      set.delete(res);
      if (set.size === 0) clients.delete(companyId);
    }
  };
}

function broadcast(companyId) {
  const set = clients.get(companyId);
  if (!set || set.size === 0) return;
  const payload = 'data: update\n\n';
  set.forEach(res => {
    try { res.write(payload); } catch (_) { /* client disconnected */ }
  });
}

module.exports = { subscribe, broadcast };
