import type { Session } from '@supabase/supabase-js';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useOutlet } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import { supabase, supabaseConfigured } from './lib/supabase';
import { CreateEvent } from './screens/CreateEvent';
import { EventConfirm } from './screens/EventConfirm';
import { EventDetails } from './screens/EventDetails';
import { Feed } from './screens/Feed';
import { Interested } from './screens/Interested';
import { Login, StatusScreen } from './screens/Login';
import { Profile } from './screens/Profile';
import { ProfileSetup } from './screens/ProfileSetup';
import { useAppStore } from './store/useAppStore';

/** Keeps rendering the screen it mounted with, so the old screen can animate out after navigation. */
function FrozenOutlet() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);
  return frozen;
}

function Layout() {
  const location = useLocation();
  // Detail screens slide in from the right; tab switches fade up.
  const isDrillIn = location.pathname.startsWith('/events/') || location.pathname === '/profile/edit';
  const offset = isDrillIn ? { x: 24, y: 0 } : { x: 0, y: 8 };

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          className="route"
          initial={{ opacity: 0, ...offset }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <FrozenOutlet />
        </motion.div>
      </AnimatePresence>
      <Toast />
      <BottomNav />
    </>
  );
}

/** undefined while Supabase restores any saved session, then a Session or null. */
function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

const REFRESH_AFTER_MS = 60_000;

/** Re-fetch events when the user comes back to the tab, so counts and new events stay current. */
function useRefreshOnReturn() {
  const refresh = useAppStore((s) => s.refresh);
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState !== 'visible') return;
      const { lastLoadedAt } = useAppStore.getState();
      if (lastLoadedAt != null && Date.now() - lastLoadedAt > REFRESH_AFTER_MS) void refresh();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refresh]);
}

function App() {
  const session = useSession();
  const userId = session?.user.id;
  const status = useAppStore((s) => s.status);
  const loadError = useAppStore((s) => s.error);
  const onboarded = useAppStore((s) => s.user?.onboarded ?? false);
  const load = useAppStore((s) => s.load);
  const clear = useAppStore((s) => s.clear);
  useRefreshOnReturn();

  useEffect(() => {
    if (userId) void load();
    else clear();
  }, [userId, load, clear]);

  if (!supabaseConfigured) {
    return (
      <StatusScreen
        title="Setup needed"
        message="Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local, then restart the dev server."
      />
    );
  }
  if (session === undefined) return <StatusScreen title="Campus Events" message="Loading…" />;
  if (session === null) return <Login />;
  if (status === 'error') {
    return (
      <StatusScreen
        title="Something went wrong"
        message="We couldn't load events."
        detail={loadError ?? undefined}
        action={{ label: 'Try again', onClick: () => void load() }}
      />
    );
  }
  if (status !== 'ready') return <StatusScreen title="Campus Events" message="Loading events…" />;
  if (!onboarded) return <ProfileSetup mode="onboarding" />;

  return (
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route element={<Layout />}>
          <Route path="/feed" element={<Feed />} />
          <Route path="/create" element={<CreateEvent />} />
          <Route path="/interested" element={<Interested />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<ProfileSetup mode="edit" />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/events/:id/confirm" element={<EventConfirm />} />
          <Route path="*" element={<Navigate to="/feed" replace />} />
        </Route>
      </Routes>
    </MotionConfig>
  );
}

export default App;
