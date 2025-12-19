import { Routes, Route } from 'react-router-dom';
import Admin from './pages/Admin';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Admin />} />
    </Routes>
  );
}

export default App;

