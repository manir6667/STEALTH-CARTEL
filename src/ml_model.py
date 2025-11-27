"""
ml_model.py - Simulate radar/acoustic data and ML model
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

np.random.seed(42)
N = 100
X = np.random.rand(N, 3)
y = np.random.choice([0, 1, 2], N)

clf = RandomForestClassifier()
clf.fit(X, y)

DETECTIONS = pd.DataFrame(X, columns=["radar_strength", "acoustic_signature", "speed"])
DETECTIONS["id"] = DETECTIONS.index
DETECTIONS["label"] = y

LABELS = {0: "Stealth Aircraft", 1: "Commercial Aircraft", 2: "Military Aircraft"}

def get_detection_results():
    """Return all simulated detections."""
    results = []
    for _, row in DETECTIONS.iterrows():
        results.append({
            "id": int(row["id"]),
            "radar_strength": float(row["radar_strength"]),
            "acoustic_signature": float(row["acoustic_signature"]),
            "speed": float(row["speed"]),
        })
    return results

def predict_aircraft(detection_id):
    """Predict aircraft type for a given detection."""
    row = DETECTIONS.loc[DETECTIONS["id"] == detection_id]
    if row.empty:
        return {"error": "Detection not found"}
    features = row[["radar_strength", "acoustic_signature", "speed"]].values
    pred = clf.predict(features)[0]
    return {
        "id": int(detection_id),
        "predicted_label": LABELS.get(pred, "Unknown")
    }
