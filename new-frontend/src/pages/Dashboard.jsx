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
    <div className="min-h-screen bg-gray-950">
      {/* Logout button overlay */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded shadow-lg transition"
        >
          Logout
        </button>
      </div>

      {/* Main simulation dashboard */}
      <SimulationDashboard />
    </div>
  );
}
