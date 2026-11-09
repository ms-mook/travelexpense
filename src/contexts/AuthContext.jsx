import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../config/supabase';
import { authService } from '../services';
import { loginIdToAuthEmail } from '../../shared/username';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = กำลังโหลด
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      setError('');
      setProfile(await authService.me());
    } catch (e) {
      setProfile(null);
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadProfile();
    else if (session === null) setProfile(null);
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => ({
    session,
    user: profile?.user || null,
    scope: profile?.scope || null,
    features: profile?.features || {},
    loading: session === undefined || (session && !profile && !error),
    error,
    signIn: async (username, password) => {
      const { error: err } = await supabase.auth.signInWithPassword({ email: loginIdToAuthEmail(username), password });
      if (err) throw new Error(err.message === 'Invalid login credentials' ? 'Username หรือรหัสผ่านไม่ถูกต้อง' : err.message);
    },
    signOut: () => supabase.auth.signOut(),
    reload: loadProfile
  }), [session, profile, error, loadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
