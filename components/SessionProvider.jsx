'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as api from '../lib/api';
import { DEFAULT_CHARACTER_SLUG, getCharacterBySlug } from '../lib/game/characters';

const STORAGE_KEY = 'f1crazy.character';

const SessionContext = createContext(null);

function readStoredCharacter() {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value && typeof value === 'string' ? value : null;
  } catch (err) {
    return null;
  }
}

function writeStoredCharacter(slug) {
  if (typeof window === 'undefined') return;
  try {
    if (slug) {
      window.localStorage.setItem(STORAGE_KEY, slug);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    /* storage unavailable (private mode) — guest choice simply is not persisted */
  }
}

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [guestCharacterSlug, setGuestCharacterSlug] = useState(DEFAULT_CHARACTER_SLUG);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const data = await api.getMe();
      if (!mountedRef.current) return null;
      const nextUser = data && data.user ? data.user : null;
      setUser(nextUser);
      setError(null);
      setStatus(nextUser ? 'authenticated' : 'guest');
      return nextUser;
    } catch (err) {
      if (!mountedRef.current) return null;
      setUser(null);
      setError(err && err.message ? err.message : 'Unable to reach the F1 Crazy API.');
      setStatus('error');
      return null;
    }
  }, []);

  useEffect(() => {
    const stored = readStoredCharacter();
    if (stored) setGuestCharacterSlug(stored);
    loadSession();
  }, [loadSession]);

  const refresh = useCallback(async () => {
    setStatus('loading');
    return loadSession();
  }, [loadSession]);

  const login = useCallback(async (username, password) => {
    const data = await api.login({ username, password });
    const nextUser = data && data.user ? data.user : null;
    if (mountedRef.current) {
      setUser(nextUser);
      setError(null);
      setStatus(nextUser ? 'authenticated' : 'guest');
    }
    return nextUser;
  }, []);

  const signup = useCallback(async (payload) => {
    const data = await api.signup(payload);
    const nextUser = data && data.user ? data.user : null;
    if (mountedRef.current) {
      setUser(nextUser);
      setError(null);
      setStatus(nextUser ? 'authenticated' : 'guest');
    }
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (err) {
      /* even if the API call fails we drop the local session */
    }
    if (mountedRef.current) {
      setUser(null);
      setError(null);
      setStatus('guest');
    }
  }, []);

  const setSelectedCharacter = useCallback(
    async (slug) => {
      if (!slug) return false;
      setGuestCharacterSlug(slug);
      writeStoredCharacter(slug);
      setUser((current) =>
        current ? { ...current, selected_character_slug: slug } : current
      );

      if (!user) return true;

      try {
        await api.selectCharacter(slug);
        return true;
      } catch (err) {
        return false;
      }
    },
    [user]
  );

  const selectedSlug =
    (user && user.selected_character_slug) || guestCharacterSlug || DEFAULT_CHARACTER_SLUG;

  const selectedCharacter = useMemo(
    () => getCharacterBySlug(selectedSlug) || getCharacterBySlug(DEFAULT_CHARACTER_SLUG),
    [selectedSlug]
  );

  const value = useMemo(
    () => ({
      user,
      status,
      error,
      isAuthenticated: status === 'authenticated' && Boolean(user),
      selectedCharacterSlug: selectedSlug,
      selectedCharacter,
      login,
      signup,
      logout,
      setSelectedCharacter,
      refresh,
    }),
    [
      user,
      status,
      error,
      selectedSlug,
      selectedCharacter,
      login,
      signup,
      logout,
      setSelectedCharacter,
      refresh,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used inside a <SessionProvider>.');
  }
  return ctx;
}

export default SessionProvider;