import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Documents from './pages/Documents';

function App() {
  return (
    <Routes>
      <Route path="/documents" element={<Documents />} />
      <Route path="/" element={<Home />} />
    </Routes>
  );
}

export default App;

