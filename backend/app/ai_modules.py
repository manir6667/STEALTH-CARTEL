"""
AI Modules for Aircraft Detection and Threat Analysis
Provides trajectory prediction, threat assessment, and environmental simulation
"""

import math
import random
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta


class TrajectoryPredictor:
    """Predicts future aircraft positions based on current velocity and heading"""
    
    @staticmethod
    def predict_path(
        latitude: float,
        longitude: float,
        groundspeed: float,  # knots
        track: float,  # degrees
        time_horizon: int = 300  # seconds
    ) -> List[Dict]:
        """
        Predict aircraft path for next N seconds
        Returns list of (lat, lon, time_offset) tuples
        """
        predictions = []
        
        # Convert speed from knots to degrees per second
        speed_deg_per_sec = groundspeed / 216000.0
        
        for t in range(0, time_horizon, 30):  # predict every 30 seconds
            delta_lat = speed_deg_per_sec * math.cos(math.radians(track)) * t
            delta_lon = speed_deg_per_sec * math.sin(math.radians(track)) * t / max(0.000001, math.cos(math.radians(latitude)))
            
            predictions.append({
                "latitude": latitude + delta_lat,
                "longitude": longitude + delta_lon,
                "time_offset": t,
                "timestamp": (datetime.utcnow() + timedelta(seconds=t)).isoformat()
            })
        
        return predictions
    
    @staticmethod
    def estimate_eta_to_point(
        current_lat: float,
        current_lon: float,
        target_lat: float,
        target_lon: float,
        groundspeed: float
    ) -> Optional[float]:
        """Estimate time (seconds) to reach a target point"""
        if groundspeed <= 0:
            return None
        
        # Approximate distance in degrees
        dlat = target_lat - current_lat
        dlon = target_lon - current_lon
        dist_deg = math.hypot(dlat, dlon)
        
        # Convert to nautical miles (1 deg ≈ 60 NM)
        dist_nm = dist_deg * 60
        
        # Time = distance / speed
        return (dist_nm / groundspeed) * 3600  # convert hours to seconds


class ThreatAnalyzer:
    """Analyzes aircraft threat levels based on multiple factors"""
    
    # Threat weights
    WEIGHTS = {
        "in_restricted_zone": 40,
        "no_transponder": 25,
        "high_speed": 15,
        "military_classification": 10,
        "low_altitude": 10
    }
    
    @staticmethod
    def assess_threat(
        in_restricted_area: bool,
        transponder_id: Optional[str],
        classification: str,
        groundspeed: float,
        altitude: float,
        track_changes: int = 0  # number of recent heading changes
    ) -> Dict:
        """
        Calculate threat level: Low, Medium, High, Critical
        Returns dict with level, score, and reasoning
        """
        score = 0
        reasons = []
        
        # In restricted zone
        if in_restricted_area:
            score += ThreatAnalyzer.WEIGHTS["in_restricted_zone"]
            reasons.append("Inside restricted airspace")
        
        # No transponder
        if not transponder_id or transponder_id == "UNKNOWN":
            score += ThreatAnalyzer.WEIGHTS["no_transponder"]
            reasons.append("No transponder signal")
        
        # High speed (> 400 knots = potential military)
        if groundspeed > 400:
            score += ThreatAnalyzer.WEIGHTS["high_speed"]
            reasons.append(f"High speed: {groundspeed:.0f} kt")
        
        # Military classification
        if classification in ["fighter", "bomber", "military_drone", "military_heli", "stealth"]:
            score += ThreatAnalyzer.WEIGHTS["military_classification"]
            reasons.append(f"Military classification: {classification}")
        
        # Low altitude in restricted zone
        if in_restricted_area and altitude < 5000:
            score += ThreatAnalyzer.WEIGHTS["low_altitude"]
            reasons.append(f"Low altitude: {altitude:.0f} ft")
        
        # Erratic movement
        if track_changes > 3:
            score += 5
            reasons.append("Erratic flight pattern")
        
        # Determine level
        if score >= 70:
            level = "Critical"
        elif score >= 50:
            level = "High"
        elif score >= 25:
            level = "Medium"
        else:
            level = "Low"
        
        return {
            "level": level,
            "score": score,
            "max_score": 100,
            "reasons": reasons,
            "confidence": min(100, score + 20)  # confidence percentage
        }


class EnvironmentalSimulator:
    """Simulates environmental conditions affecting detection"""
    
    @staticmethod
    def get_weather_conditions() -> Dict:
        """Generate random weather conditions"""
        conditions = ["Clear", "Partly Cloudy", "Cloudy", "Rain", "Storm", "Fog"]
        visibility_km = {
            "Clear": random.uniform(10, 20),
            "Partly Cloudy": random.uniform(8, 12),
            "Cloudy": random.uniform(5, 10),
            "Rain": random.uniform(2, 6),
            "Storm": random.uniform(0.5, 3),
            "Fog": random.uniform(0.2, 2)
        }
        
        condition = random.choice(conditions)
        
        return {
            "condition": condition,
            "visibility_km": visibility_km[condition],
            "temperature_c": random.uniform(15, 35),
            "wind_speed_kt": random.uniform(0, 40),
            "wind_direction": random.uniform(0, 360),
            "cloud_cover_percent": random.uniform(0, 100) if condition != "Clear" else 0
        }
    
    @staticmethod
    def apply_detection_interference(
        signal_strength: float,
        weather: Dict,
        altitude: float
    ) -> Dict:
        """
        Calculate detection probability based on environmental factors
        Returns modified signal strength and detection confidence
        """
        interference = 0
        
        # Weather impact
        if weather["condition"] == "Storm":
            interference += 0.3
        elif weather["condition"] == "Rain":
            interference += 0.15
        elif weather["condition"] == "Fog":
            interference += 0.25
        
        # Low visibility impact
        if weather["visibility_km"] < 5:
            interference += 0.1
        
        # Altitude impact (very high or very low)
        if altitude > 50000:
            interference += 0.1
        elif altitude < 500:
            interference += 0.15
        
        modified_strength = max(0, signal_strength * (1 - interference))
        detection_confidence = min(100, modified_strength * 100)
        
        return {
            "original_strength": signal_strength,
            "modified_strength": modified_strength,
            "interference_factor": interference,
            "detection_confidence": detection_confidence,
            "weather_impact": weather["condition"]
        }
    
    @staticmethod
    def get_time_of_day() -> Dict:
        """Get simulated time of day for day/night effects"""
        hour = datetime.now().hour
        
        if 6 <= hour < 18:
            period = "Day"
            visibility_modifier = 1.0
        elif 18 <= hour < 20 or 5 <= hour < 6:
            period = "Twilight"
            visibility_modifier = 0.7
        else:
            period = "Night"
            visibility_modifier = 0.5
        
        return {
            "period": period,
            "hour": hour,
            "visibility_modifier": visibility_modifier,
            "is_dark": period == "Night"
        }


class DetectionModel:
    """Simulates radar-based aircraft detection and classification"""
    
    @staticmethod
    def detect_aircraft(
        latitude: float,
        longitude: float,
        altitude: float,
        groundspeed: float,
        radar_center_lat: float = 11.65,
        radar_center_lon: float = 78.15,
        max_range_km: float = 250
    ) -> Dict:
        """
        Simulate radar detection
        Returns detection result with confidence and signal strength
        """
        # Calculate distance from radar
        dlat = (latitude - radar_center_lat) * 111  # degrees to km
        dlon = (longitude - radar_center_lon) * 111 * math.cos(math.radians(latitude))
        distance_km = math.hypot(dlat, dlon)
        
        # Out of range
        if distance_km > max_range_km:
            return {
                "detected": False,
                "reason": "Out of range",
                "distance_km": distance_km
            }
        
        # Signal strength decreases with distance and altitude
        base_strength = 1.0 - (distance_km / max_range_km)
        altitude_factor = 1.0 if altitude > 1000 else 0.5 + (altitude / 2000)
        signal_strength = base_strength * altitude_factor
        
        # Add some noise
        signal_strength *= random.uniform(0.85, 1.0)
        
        # Detection threshold
        detected = signal_strength > 0.2
        
        return {
            "detected": detected,
            "signal_strength": signal_strength,
            "distance_km": distance_km,
            "confidence": min(100, signal_strength * 120),
            "radar_cross_section": "normal"  # could be "small" for stealth
        }
    
    @staticmethod
    def classify_aircraft_type(
        altitude: float,
        groundspeed: float,
        transponder_id: Optional[str]
    ) -> str:
        """
        Classify aircraft based on flight characteristics
        """
        if not transponder_id:
            if groundspeed > 400:
                return "stealth" if random.random() > 0.5 else "unknown"
            elif groundspeed < 100:
                return "military_drone" if altitude < 5000 else "unknown"
            else:
                return "unknown"
        
        # Based on speed and altitude profiles
        if groundspeed > 500:
            return "fighter"
        elif 200 < groundspeed < 400 and 25000 < altitude < 45000:
            return "airliner"
        elif groundspeed < 150 and altitude < 10000:
            return "civilian_prop"
        elif 150 < groundspeed < 250:
            return "private_jet"
        else:
            return "airliner"  # default
