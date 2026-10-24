import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ensureProfile } from '@/lib/engine';

export default function useCurrentUser() {
  const [state, setState] = useState({ loading: true, user: null, profile: null });

  const load = useCallback(async ({ createProfile = false } = {}) => {
    try {
      const user = await base44.auth.me();
      let profile = null;
      try {
        const res = await base44.entities.UserProfile.filter({ user_id: user.id }, { limit: 1 });
        profile = res?.items?.[0] || null;
        if (!profile && createProfile) profile = await ensureProfile(user);
      } catch {
        profile = null;
      }
      setState({ loading: false, user, profile });
    } catch {
      setState({ loading: false, user: null, profile: null });
    }
  }, []);

  useEffect(() => {
    load({ createProfile: true });
  }, [load]);

  const signIn = () => base44.auth.redirectToLogin(window.location.pathname + window.location.search);

  return {
    ...state,
    isAuthed: !!state.user,
    isAdmin: state.user?.role === 'admin',
    displayName: state.profile?.display_name || state.user?.full_name || '',
    signIn,
    refresh: load
  };
}