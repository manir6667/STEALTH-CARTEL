import React from 'react';

export default function FlightDetail({ flight, onClose }) {
  if (!flight) return null;

  const getClassificationColor = (classification) => {
    switch (classification) {
      case 'fighter':
        return 'text-red-600 font-bold';
      case 'high_performance':
        return 'text-orange-600 font-bold';
      case 'airliner':
        return 'text-blue-600';
      case 'civilian_prop':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full m-4">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Flight Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div className="border-b pb-2">
            <p className="text-sm text-gray-600">Transponder ID</p>
            <p className="text-lg font-semibold">
              {flight.transponder_id || '⚠️ UNKNOWN'}
            </p>
          </div>

          <div className="border-b pb-2">
            <p className="text-sm text-gray-600">Classification</p>
            <p className={`text-lg font-semibold ${getClassificationColor(flight.classification)}`}>
              {flight.classification?.toUpperCase().replace('_', ' ')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Speed</p>
              <p className="text-lg font-semibold">{flight.groundspeed.toFixed(0)} kt</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Altitude</p>
              <p className="text-lg font-semibold">{flight.altitude.toFixed(0)} ft</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Track</p>
              <p className="text-lg font-semibold">{flight.track.toFixed(0)}°</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Time</p>
              <p className="text-lg font-semibold">
                {new Date(flight.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Latitude</p>
              <p className="text-sm font-mono">{flight.latitude.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Longitude</p>
              <p className="text-sm font-mono">{flight.longitude.toFixed(4)}</p>
            </div>
          </div>

          {flight.in_restricted_area && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded">
              <p className="text-red-800 font-bold text-center">
                ⚠️ AIRCRAFT IN RESTRICTED AREA
              </p>
            </div>
          )}

          {flight.is_unknown && (
            <div className="mt-2 p-3 bg-yellow-100 border border-yellow-400 rounded">
              <p className="text-yellow-800 font-bold text-center">
                ⚠️ UNKNOWN/UNAUTHORIZED AIRCRAFT
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}
