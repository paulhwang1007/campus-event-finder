import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { CreateEvent } from './screens/CreateEvent';
import { EventConfirm } from './screens/EventConfirm';
import { EventDetails } from './screens/EventDetails';
import { Feed } from './screens/Feed';
import { Interested } from './screens/Interested';

function Layout() {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/feed" element={<Feed />} />
        <Route path="/create" element={<CreateEvent />} />
        <Route path="/interested" element={<Interested />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/events/:id/confirm" element={<EventConfirm />} />
        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
