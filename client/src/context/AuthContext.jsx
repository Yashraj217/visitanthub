import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(() => !!localStorage.getItem('originalToken'));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(({ data }) => setUser(data))
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('originalToken');
          localStorage.removeItem('originalUser');
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
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('originalToken');
    localStorage.removeItem('originalUser');
    setUser(null);
    setImpersonating(false);
  }

  function startImpersonation(token, impersonatedUser) {
    const currentToken = localStorage.getItem('token');
    const currentUser  = localStorage.getItem('user');
    localStorage.setItem('originalToken', currentToken || '');
    localStorage.setItem('originalUser',  currentUser  || '');
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(impersonatedUser));
    setUser(impersonatedUser);
    setImpersonating(true);
  }

  function stopImpersonation() {
    const origToken   = localStorage.getItem('originalToken');
    const origUserStr = localStorage.getItem('originalUser');
    if (origToken) localStorage.setItem('token', origToken);
    if (origUserStr) localStorage.setItem('user', origUserStr);
    localStorage.removeItem('originalToken');
    localStorage.removeItem('originalUser');
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
