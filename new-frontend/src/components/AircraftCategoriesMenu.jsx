import React, { useState } from 'react';

/**
 * AircraftCategoriesMenu - Sidebar menu for filtering aircraft by category
 */
export default function AircraftCategoriesMenu({ onFilterChange, flights }) {
  const [expanded, setExpanded] = useState({
    military: true,
    civilian: true,
    helicopters: true,
    unidentified: true
  });

  const [selectedFilters, setSelectedFilters] = useState({
    // Military
    fighter: true,
    bomber: true,
    military_drone: true,
    // Civilian
    airliner: true,
    private_jet: true,
    cargo: true,
    civilian_prop: true,
    // Helicopters
    military_heli: true,
    civilian_heli: true,
    // Unidentified
    unknown: true,
    stealth: true
  });

  const handleFilterToggle = (key) => {
    const newFilters = { ...selectedFilters, [key]: !selectedFilters[key] };
    setSelectedFilters(newFilters);
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };

  const toggleCategory = (category) => {
    setExpanded(prev => ({ ...prev, [category]: !prev[category] }));
  };

  // Count aircraft by classification
  const counts = {};
  if (Array.isArray(flights)) {
    flights.forEach(f => {
      const cls = f.classification || 'unknown';
      counts[cls] = (counts[cls] || 0) + 1;
    });
  }

  const categories = [
    {
      key: 'military',
      icon: '✈️',
      title: 'Military Aircraft',
      types: [
        { key: 'fighter', label: 'Fighters', examples: 'Su-30MKI, Rafale, F-16' },
        { key: 'bomber', label: 'Bombers', examples: 'B-2 Spirit, Tu-160' },
        { key: 'military_drone', label: 'Military Drones', examples: 'MQ-9 Reaper, RQ-170' }
      ]
    },
    {
      key: 'civilian',
      icon: '🛫',
      title: 'Civilian Aircraft',
      types: [
        { key: 'airliner', label: 'Passenger Jets', examples: 'A320, Boeing 737' },
        { key: 'private_jet', label: 'Private Jets', examples: 'Gulfstream G650' },
        { key: 'cargo', label: 'Cargo Planes', examples: 'C-130 Hercules' },
        { key: 'civilian_prop', label: 'Small Aircraft', examples: 'Cessna 172' }
      ]
    },
    {
      key: 'helicopters',
      icon: '🚁',
      title: 'Helicopters',
      types: [
        { key: 'military_heli', label: 'Military Heli', examples: 'Apache, Chinook' },
        { key: 'civilian_heli', label: 'Civilian Heli', examples: 'Bell 412' }
      ]
    },
    {
      key: 'unidentified',
      icon: '🛸',
      title: 'Unidentified / Stealth',
      types: [
        { key: 'unknown', label: 'Unknown Signals', examples: 'No transponder' },
        { key: 'stealth', label: 'Stealth Objects', examples: 'Low RCS targets' }
      ]
    }
  ];

  return (
    <div className="aircraft-categories-menu bg-gray-900 text-white p-4 rounded-lg shadow-lg overflow-y-auto" style={{ maxHeight: '600px' }}>
      <h2 className="text-lg font-bold mb-4 text-green-400 flex items-center gap-2">
        <span>🎯</span>
        <span>Aircraft Categories</span>
      </h2>

      {categories.map(category => (
        <div key={category.key} className="mb-4 border-b border-gray-700 pb-3">
          <button
            onClick={() => toggleCategory(category.key)}
            className="w-full flex items-center justify-between text-left font-semibold text-sm hover:bg-gray-800 p-2 rounded transition"
          >
            <span className="flex items-center gap-2">
              <span>{category.icon}</span>
              <span>{category.title}</span>
            </span>
            <span className="text-xs text-gray-400">
              {expanded[category.key] ? '▼' : '▶'}
            </span>
          </button>

          {expanded[category.key] && (
            <div className="mt-2 ml-4 space-y-2">
              {category.types.map(type => (
                <label key={type.key} className="flex items-start gap-2 cursor-pointer hover:bg-gray-800 p-2 rounded transition">
                  <input
                    type="checkbox"
                    checked={selectedFilters[type.key]}
                    onChange={() => handleFilterToggle(type.key)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {type.label}
                      <span className="ml-2 text-xs text-green-400">({counts[type.key] || 0})</span>
                    </div>
                    <div className="text-xs text-gray-400 italic">{type.examples}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="mt-4 pt-3 border-t border-gray-700">
        <button
          onClick={() => {
            const allOn = Object.fromEntries(Object.keys(selectedFilters).map(k => [k, true]));
            setSelectedFilters(allOn);
            if (onFilterChange) onFilterChange(allOn);
          }}
          className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded mb-2 transition"
        >
          Select All
        </button>
        <button
          onClick={() => {
            const allOff = Object.fromEntries(Object.keys(selectedFilters).map(k => [k, false]));
            setSelectedFilters(allOff);
            if (onFilterChange) onFilterChange(allOff);
          }}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded transition"
        >
          Deselect All
        </button>
      </div>
    </div>
  );
}
