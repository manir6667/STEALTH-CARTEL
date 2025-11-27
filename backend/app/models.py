"""
SQLAlchemy models for aircraft detection system
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    """User model for authentication and authorization"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="analyst")  # analyst or admin
    created_at = Column(DateTime, default=datetime.utcnow)
    
    alerts = relationship("Alert", back_populates="user")


class Flight(Base):
    """Flight telemetry model"""
    __tablename__ = "flights"
    
    id = Column(Integer, primary_key=True, index=True)
    transponder_id = Column(String, index=True)  # Can be None for unknown
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float)  # feet
    groundspeed = Column(Float)  # knots
    track = Column(Float)  # degrees
    is_unknown = Column(Boolean, default=False)
    classification = Column(String)  # civilian_prop, airliner, drone, fighter, unknown
    in_restricted_area = Column(Boolean, default=False)
    
    # Enhanced fields for AI modules
    aircraft_model = Column(String)  # Specific model name (e.g., "Su-30MKI", "Boeing 737")
    threat_level = Column(String, default="Low")  # Low, Medium, High, Critical
    threat_score = Column(Float, default=0.0)
    predicted_trajectory = Column(Text)  # JSON string of predicted path
    detection_confidence = Column(Float, default=100.0)  # 0-100
    signal_strength = Column(Float, default=1.0)  # 0-1
    weather_condition = Column(String)  # Current weather affecting detection
    

class RestrictedArea(Base):
    """Restricted airspace polygon"""
    __tablename__ = "restricted_areas"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    polygon_json = Column(Text, nullable=False)  # GeoJSON polygon
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)


class Alert(Base):
    """Alert model for unknown aircraft in restricted area"""
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    flight_id = Column(Integer, ForeignKey("flights.id"))
    transponder_id = Column(String)
    severity = Column(String)  # LOW, MEDIUM, HIGH, CRITICAL
    message = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(Integer, ForeignKey("users.id"))
    acknowledged_at = Column(DateTime)
    
    # Enhanced fields
    threat_reasons = Column(Text)  # JSON array of threat reasons
    recommended_action = Column(String)  # e.g., "Monitor", "Intercept", "Alert Command"
    
    user = relationship("User", back_populates="alerts")


class Allowlist(Base):
    """Known/authorized transponder IDs"""
    __tablename__ = "allowlist"
    
    id = Column(Integer, primary_key=True, index=True)
    transponder_id = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)
    added_at = Column(DateTime, default=datetime.utcnow)
