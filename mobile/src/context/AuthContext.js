import { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

const AuthContext = createContext(null);

const TOKEN_KEY = 'visitanthub_token';
const USER_KEY  = 'visitanthub_user';

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (_) {
        // corrupt store — start fresh
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(tokenValue, userData) {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, tokenValue),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData)),
    ]);
    setToken(tokenValue);
    setUser(userData);
  }

  async function logout() {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
