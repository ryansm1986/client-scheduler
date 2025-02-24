import { Routes, Route, Link } from 'react-router-dom';
import Home from './components/Home';
import Clients from './components/Clients';
import Schedule from './components/Schedule';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-indigo-600 p-4 shadow-md">
        <div className="container mx-auto flex space-x-6">
          <Link to="/" className="text-white hover:text-indigo-200 font-medium">Home</Link>
          <Link to="/clients" className="text-white hover:text-indigo-200 font-medium">Clients</Link>
          <Link to="/schedule" className="text-white hover:text-indigo-200 font-medium">Schedule</Link>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/schedule" element={<Schedule />} />
      </Routes>
    </div>
  );
}

export default App;