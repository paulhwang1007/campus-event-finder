import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { supabase, supabaseConfigured } from './lib/supabase';
import { CreateEvent } from './screens/CreateEvent';
import { EventConfirm } from './screens/EventConfirm';
import { EventDetails } from './screens/EventDetails';
import { Feed } from './screens/Feed';
import { Interested } from './screens/Interested';
import { Login, StatusScreen } from './screens/Login';
import { Profile } from './screens/Profile';
import { useAppStore } from './store/useAppStore';

function Layout() {
  return (
    <>
      <Outlet />
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

function App() {
  const session = useSession();
  const userId = session?.user.id;
  const status = useAppStore((s) => s.status);
  const load = useAppStore((s) => s.load);
  const clear = useAppStore((s) => s.clear);

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
        action={{ label: 'Try again', onClick: () => void load() }}
      />
    );
  }
  if (status !== 'ready') return <StatusScreen title="Campus Events" message="Loading events…" />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/feed" element={<Feed />} />
        <Route path="/create" element={<CreateEvent />} />
        <Route path="/interested" element={<Interested />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/events/:id/confirm" element={<EventConfirm />} />
        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
