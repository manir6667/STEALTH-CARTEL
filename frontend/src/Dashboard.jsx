import React, { useEffect, useState } from "react";

function Dashboard({ token, setSelectedId }) {
  const [detections, setDetections] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8001/detections", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setDetections);
  }, [token]);

  return (
    <div>
      <h2>Detected Aircraft</h2>
      <table border="1">
        <thead>
          <tr>
            <th>ID</th>
            <th>Radar Strength</th>
            <th>Acoustic Signature</th>
            <th>Speed</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {detections.map((d) => (
            <tr key={d.id}>
              <td>{d.id}</td>
              <td>{d.radar_strength.toFixed(2)}</td>
              <td>{d.acoustic_signature.toFixed(2)}</td>
              <td>{d.speed.toFixed(2)}</td>
              <td>
                <button onClick={() => setSelectedId(d.id)}>View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Dashboard;
