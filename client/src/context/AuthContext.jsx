import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

// sessionStorage = per-tab (isolated). localStorage = shared across tabs (seed for new tabs).
// On first load of a new tab: copy localStorage token → sessionStorage so the tab auto-authenticates.
// On logout: clear sessionStorage only — other open tabs keep their own sessionStorage intact.
function seedSession() {
  if (!sessionStorage.getItem('token')) {
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    if (t) sessionStorage.setItem('token', t);
    if (u) sessionStorage.setItem('user', u);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    seedSession();
    try { return JSON.parse(sessionStorage.getItem('user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(() => !!sessionStorage.getItem('originalToken'));

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(({ data }) => {
          setUser(data);
          sessionStorage.setItem('user', JSON.stringify(data));
          localStorage.setItem('user', JSON.stringify(data));
        })
        .catch(() => {
          // Token is invalid/expired — clear both storages so it doesn't re-seed on next visit
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('originalToken');
          sessionStorage.removeItem('originalUser');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setImpersonating(false);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    // Save to both so new tabs can auto-authenticate from localStorage seed
    sessionStorage.setItem('token', data.token);
    sessionStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    // Clear this tab's sessionStorage only — other tabs are unaffected
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('originalToken');
    sessionStorage.removeItem('originalUser');
    setUser(null);
    setImpersonating(false);
  }

  function startImpersonation(token, impersonatedUser) {
    const currentToken = sessionStorage.getItem('token');
    const currentUser  = sessionStorage.getItem('user');
    sessionStorage.setItem('originalToken', currentToken || '');
    sessionStorage.setItem('originalUser',  currentUser  || '');
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(impersonatedUser));
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(impersonatedUser));
    setUser(impersonatedUser);
    setImpersonating(true);
  }

  function stopImpersonation() {
    const origToken   = sessionStorage.getItem('originalToken');
    const origUserStr = sessionStorage.getItem('originalUser');
    if (origToken) {
      sessionStorage.setItem('token', origToken);
      localStorage.setItem('token', origToken);
    }
    if (origUserStr) {
      sessionStorage.setItem('user', origUserStr);
      localStorage.setItem('user', origUserStr);
    }
    sessionStorage.removeItem('originalToken');
    sessionStorage.removeItem('originalUser');
    try { setUser(origUserStr ? JSON.parse(origUserStr) : null); } catch { setUser(null); }
    setImpersonating(false);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, impersonating, startImpersonation, stopImpersonation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
