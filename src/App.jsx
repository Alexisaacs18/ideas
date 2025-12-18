import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Documents from './pages/Documents';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/documents" element={<Documents />} />
    </Routes>
  );
}

export default App;
