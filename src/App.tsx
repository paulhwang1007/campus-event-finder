import { Navigate, Route, Routes } from 'react-router-dom';
import { EventDetails } from './screens/EventDetails';
import { Feed } from './screens/Feed';

function App() {
  return (
    <Routes>
      <Route path="/feed" element={<Feed />} />
      <Route path="/events/:id" element={<EventDetails />} />
      <Route path="*" element={<Navigate to="/feed" replace />} />
    </Routes>
  );
}

export default App;
