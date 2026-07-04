import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const POLL_MS = 30_000;

export function useVisitNotifications() {
  const [permission, setPermission] = useState(() =>
    'Notification' in window ? Notification.permission : 'denied'
  );
  const [pendingCount, setPendingCount] = useState(0);
  const seenIds     = useRef(new Set());
  const isFirstLoad = useRef(true);

  async function requestPermission() {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  useEffect(() => {
    // Prompt for permission on mount if not yet decided
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(setPermission);
    }

    async function poll() {
      try {
        const { data } = await api.get('/visits', {
          params: { status: 'pending', limit: 100 },
        });
        const visits = Array.isArray(data) ? data : (data.visits || data.data || []);
        setPendingCount(visits.length);

        if (isFirstLoad.current) {
          visits.forEach(v => seenIds.current.add(v.id));
          isFirstLoad.current = false;
          return;
        }

        const newVisits = visits.filter(v => !seenIds.current.has(v.id));
        newVisits.forEach(v => {
          seenIds.current.add(v.id);

          if ('Notification' in window && Notification.permission === 'granted') {
            const n = new Notification('New Visitor', {
              body:  `${v.visitor_name} is waiting to see you`,
              icon:  '/favicon.png',
              badge: '/favicon.png',
              tag:   `visit-${v.id}`,
            });
            n.onclick = () => { window.focus(); n.close(); };
            setTimeout(() => n.close(), 8000);
          }

          toast(`🔔 New visitor: ${v.visitor_name}`, { duration: 6000 });
        });
      } catch {
        // Silently ignore — network errors shouldn't break the app
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, []);

  return { permission, pendingCount, requestPermission };
}
