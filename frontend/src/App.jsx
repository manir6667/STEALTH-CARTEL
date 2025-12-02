import React, { useState } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";

function App() {
  const [token, setToken] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  if (!token) {
    return <Login setToken={setToken} />;
  }

  return (
    <div>
      <h1>Stealth Aircraft Detection Dashboard</h1>
      <Dashboard token={token} setSelectedId={setSelectedId} />
      {selectedId !== null && (
        <AircraftDetail token={token} detectionId={selectedId} />
      )}
    </div>
  );
}

function AircraftDetail({ token, detectionId }) {
  const [detail, setDetail] = React.useState(null);
  React.useEffect(() => {
    fetch(`http://127.0.0.1:8001/predict/${detectionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setDetail);
  }, [detectionId, token]);

  if (!detail) return <div>Loading...</div>;
  if (detail.error) return <div>{detail.error}</div>;
  return (
    <div>
      <h2>Aircraft Detail</h2>
      <p>Predicted Type: {detail.predicted_label}</p>
    </div>
  );
}

export default App;
