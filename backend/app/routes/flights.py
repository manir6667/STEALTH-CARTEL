"""
Flight and telemetry routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models import Flight, RestrictedArea, Alert, Allowlist
from app.auth import get_current_user
from app.classification import classify_speed, get_alert_message, predict_aircraft_model
from app.ai_modules import TrajectoryPredictor, ThreatAnalyzer, EnvironmentalSimulator, DetectionModel
from shapely.geometry import Point, shape
import json

router = APIRouter(prefix="/api/flights", tags=["flights"])


class FlightTelemetry(BaseModel):
    transponder_id: Optional[str] = None
    latitude: float
    longitude: float
    altitude: float
    groundspeed: float
    track: float


class FlightResponse(BaseModel):
    id: int
    transponder_id: Optional[str]
    timestamp: datetime
    latitude: float
    longitude: float
    altitude: float
    groundspeed: float
    track: float
    is_unknown: bool
    classification: Optional[str]
    in_restricted_area: bool
    aircraft_model: Optional[str] = None
    threat_level: Optional[str] = "Low"
    threat_score: Optional[float] = 0.0
    detection_confidence: Optional[float] = 100.0
    signal_strength: Optional[float] = 1.0
    weather_condition: Optional[str] = None
    
    class Config:
        from_attributes = True


@router.post("/telemetry", status_code=201)
async def ingest_telemetry(telemetry: FlightTelemetry, db: Session = Depends(get_db)):
    """Ingest flight telemetry data with AI-based analysis"""
    
    # Check if transponder is on allowlist
    is_unknown = False
    if not telemetry.transponder_id:
        is_unknown = True
    else:
        allowlist_entry = db.query(Allowlist).filter(
            Allowlist.transponder_id == telemetry.transponder_id
        ).first()
        if not allowlist_entry:
            is_unknown = True
    
    # Classify based on speed and altitude
    classification, severity = classify_speed(
        telemetry.groundspeed, 
        altitude=telemetry.altitude
    )
    
    # Predict aircraft model
    predicted_model = predict_aircraft_model(
        telemetry.groundspeed,
        telemetry.altitude,
        classification
    )
    
    # AI Module: Detection simulation
    detection_result = DetectionModel.detect_aircraft(
        telemetry.latitude,
        telemetry.longitude,
        telemetry.altitude,
        telemetry.groundspeed
    )
    
    # AI Module: Environmental conditions
    weather = EnvironmentalSimulator.get_weather_conditions()
    detection_with_weather = EnvironmentalSimulator.apply_detection_interference(
        detection_result.get('signal_strength', 1.0),
        weather,
        telemetry.altitude
    )
    
    # Check if in restricted area
    in_restricted_area = False
    restricted_area = db.query(RestrictedArea).filter(
        RestrictedArea.is_active == True
    ).first()
    
    if restricted_area:
        polygon_data = json.loads(restricted_area.polygon_json)
        polygon = shape(polygon_data)
        point = Point(telemetry.longitude, telemetry.latitude)
        in_restricted_area = polygon.contains(point)
    
    # AI Module: Threat analysis
    threat_assessment = ThreatAnalyzer.assess_threat(
        in_restricted_area,
        telemetry.transponder_id,
        classification,
        telemetry.groundspeed,
        telemetry.altitude
    )
    
    # AI Module: Trajectory prediction
    predicted_path = TrajectoryPredictor.predict_path(
        telemetry.latitude,
        telemetry.longitude,
        telemetry.groundspeed,
        telemetry.track,
        time_horizon=180  # 3 minutes ahead
    )
    
    # Create flight record with AI enhancements
    flight = Flight(
        transponder_id=telemetry.transponder_id,
        latitude=telemetry.latitude,
        longitude=telemetry.longitude,
        altitude=telemetry.altitude,
        groundspeed=telemetry.groundspeed,
        track=telemetry.track,
        is_unknown=is_unknown,
        classification=classification,
        in_restricted_area=in_restricted_area,
        aircraft_model=predicted_model,
        threat_level=threat_assessment['level'],
        threat_score=threat_assessment['score'],
        predicted_trajectory=json.dumps(predicted_path),
        detection_confidence=detection_with_weather['detection_confidence'],
        signal_strength=detection_with_weather['modified_strength'],
        weather_condition=weather['condition']
    )
    db.add(flight)
    db.commit()
    db.refresh(flight)
    
    # Create alert if threat level is High or Critical
    if threat_assessment['level'] in ['High', 'Critical']:
        alert_message = f"{get_alert_message(classification, telemetry.transponder_id)}\n" \
                       f"Threat Level: {threat_assessment['level']} ({threat_assessment['score']}/100)\n" \
                       f"Model Prediction: {predicted_model}\n" \
                       f"Location: Lat {telemetry.latitude:.4f}, Lon {telemetry.longitude:.4f}\n" \
                       f"Altitude: {telemetry.altitude:.0f} ft | Speed: {telemetry.groundspeed:.0f} kt"
        
        alert = Alert(
            flight_id=flight.id,
            transponder_id=telemetry.transponder_id,
            severity=threat_assessment['level'].upper(),
            message=alert_message,
            threat_reasons=json.dumps(threat_assessment['reasons']),
            recommended_action="Monitor" if threat_assessment['level'] == 'High' else "Immediate Response"
        )
        db.add(alert)
        db.commit()
        print(f"🚨 ALERT: {alert_message}")
    
    return {"status": "success", "flight_id": flight.id, "threat_level": threat_assessment['level']}


@router.get("/", response_model=List[FlightResponse])
async def list_flights(
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List recent flights"""
    flights = db.query(Flight).order_by(Flight.timestamp.desc()).limit(limit).all()
    return flights


@router.get("/{flight_id}", response_model=FlightResponse)
async def get_flight(
    flight_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific flight details"""
    flight = db.query(Flight).filter(Flight.id == flight_id).first()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    return flight
