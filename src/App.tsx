import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { CreateEvent } from './screens/CreateEvent';
import { EventDetails } from './screens/EventDetails';
import { Feed } from './screens/Feed';

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
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
