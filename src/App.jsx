import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Documents from './pages/Documents';
import Admin from './pages/Admin';

function App() {
  return (
    <Routes>
      <Route path="/admin" element={<Admin />} />
      <Route path="/documents" element={<Documents />} />
      <Route path="/" element={<Home />} />
    </Routes>
  );
}

export default App;
