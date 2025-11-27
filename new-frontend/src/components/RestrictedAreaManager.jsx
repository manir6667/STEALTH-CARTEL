import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

/**
 * RestrictedAreaManager - Manage all restricted areas (view, activate, deactivate, delete)
 */
export default function RestrictedAreaManager({ onUpdate }) {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/restricted-areas/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setAreas(response.data);
    } catch (error) {
      console.error('Error loading restricted areas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (areaId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/restricted-areas/${areaId}`,
        { is_active: !currentStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      await loadAreas();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error toggling area status:', error);
      alert('Failed to update area status');
    }
  };

  const handleDelete = async (areaId, areaName) => {
    if (!confirm(`Are you sure you want to delete "${areaName}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/restricted-areas/${areaId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      await loadAreas();
      if (onUpdate) onUpdate();
      alert(`Restricted area "${areaName}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting area:', error);
      alert('Failed to delete area');
    }
  };

  return (
    <div className="bg-gray-900 p-4 rounded-lg shadow-lg">
      <h3 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
        <span>🗺️</span>
        <span>Restricted Areas</span>
      </h3>

      {loading ? (
        <div className="text-center text-gray-400 py-4">Loading...</div>
      ) : areas.length === 0 ? (
        <div className="text-center text-gray-400 py-4 text-sm">
          No restricted areas defined yet
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {areas.map(area => (
            <div
              key={area.id}
              className={`p-3 rounded border ${
                area.is_active 
                  ? 'bg-red-900 bg-opacity-30 border-red-500' 
                  : 'bg-gray-800 border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    {area.is_active && <span className="text-red-500">●</span>}
                    <span className={area.is_active ? 'text-white' : 'text-gray-400'}>
                      {area.name}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Created: {new Date(area.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className={`text-xs font-semibold px-2 py-1 rounded ${
                  area.is_active 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  {area.is_active ? 'ACTIVE' : 'INACTIVE'}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleActive(area.id, area.is_active)}
                  className={`flex-1 text-xs font-medium py-1.5 px-3 rounded transition ${
                    area.is_active
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {area.is_active ? '⏸ Deactivate' : '▶ Activate'}
                </button>
                <button
                  onClick={() => handleDelete(area.id, area.name)}
                  className="text-xs font-medium py-1.5 px-3 rounded bg-red-600 hover:bg-red-700 text-white transition"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={loadAreas}
        className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded transition"
      >
        🔄 Refresh List
      </button>
    </div>
  );
}
