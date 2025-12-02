import React from 'react';
import { useNavigate } from 'react-router-dom';
import SimulationDashboard from '../components/SimulationDashboard';

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-950 relative">
      {/* Logout button - fixed position */}
      <button
        onClick={handleLogout}
        className="fixed top-5 right-5 z-50 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded shadow-lg transition text-sm"
      >
        Logout
      </button>

      {/* Main simulation dashboard */}
      <SimulationDashboard />
    </div>
  );
}
