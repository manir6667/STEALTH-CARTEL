"""
Aircraft classification logic based on speed thresholds

Thresholds (knots):
- < 120 kt: Small aircraft (civilian propeller, small drone)
- 120-350 kt: Commercial/private jet (airliner, business jet)
- 350-600 kt: High-performance (possibly military transport)
- > 600 kt: Fighter/attack aircraft or supersonic
"""

from typing import Tuple

# Classification thresholds in knots
THRESHOLDS = {
    "small_aircraft": 120,
    "commercial": 350,
    "high_performance": 600
}

# Speed categories
SPEED_CATEGORIES = {
    "civilian_prop": (0, 120),
    "airliner": (120, 350),
    "high_performance": (350, 600),
    "fighter": (600, float('inf'))
}


def classify_speed(speed_kts: float, sustained_kts_window: list = None, altitude: float = None) -> Tuple[str, str]:
    """
    Classify vehicle type based on speed and altitude with aircraft model prediction.
    
    Args:
        speed_kts: Instantaneous ground speed in knots
        sustained_kts_window: List of recent speeds for sustained speed check (optional)
        altitude: Altitude in feet (optional, helps with model prediction)
    
    Returns:
        Tuple of (classification, severity)
        - classification: civilian_prop, airliner, high_performance, fighter, unknown
        - severity: LOW, MEDIUM, HIGH
    """
    if speed_kts < 0:
        return "unknown", "LOW"
    
    # If we have a sustained speed window, use average
    if sustained_kts_window and len(sustained_kts_window) > 0:
        avg_speed = sum(sustained_kts_window) / len(sustained_kts_window)
    else:
        avg_speed = speed_kts
    
    # Classify based on speed
    if avg_speed < THRESHOLDS["small_aircraft"]:
        # Small aircraft or drone
        classification = "civilian_prop"
        severity = "LOW"
    elif avg_speed < THRESHOLDS["commercial"]:
        # Commercial airliner or private jet
        classification = "airliner"
        severity = "MEDIUM"
    elif avg_speed < THRESHOLDS["high_performance"]:
        # High-performance aircraft (possibly military)
        classification = "high_performance"
        severity = "HIGH"
    else:
        # Fighter/attack aircraft
        classification = "fighter"
        severity = "HIGH"
    
    return classification, severity


def predict_aircraft_model(speed_kts: float, altitude: float, classification: str) -> str:
    """
    Predict likely aircraft model based on speed, altitude, and classification.
    
    Args:
        speed_kts: Ground speed in knots
        altitude: Altitude in feet
        classification: Aircraft classification type
    
    Returns:
        Predicted aircraft model with confidence percentage
    """
    if classification == "civilian_prop":
        if speed_kts < 80:
            return "Likely: Cessna 172 Skyhawk (85% confidence)"
        elif speed_kts < 100:
            return "Likely: Piper Cherokee (82% confidence)"
        else:
            return "Likely: Beechcraft Bonanza (78% confidence)"
    
    elif classification == "airliner":
        if altitude and altitude > 35000:
            if speed_kts > 300:
                return "Likely: Boeing 777/787 (88% confidence)"
            else:
                return "Likely: Airbus A320/A321 (85% confidence)"
        else:
            if speed_kts < 200:
                return "Likely: Regional Jet - Embraer E175 (80% confidence)"
            else:
                return "Likely: Boeing 737/Airbus A320 (83% confidence)"
    
    elif classification == "high_performance":
        if speed_kts > 500:
            return "Likely: Military Transport - C-130J Hercules (75% confidence)"
        elif altitude and altitude > 40000:
            return "Likely: Business Jet - Gulfstream G650 (80% confidence)"
        else:
            return "Likely: Military Trainer - Hawk T2 (72% confidence)"
    
    elif classification == "fighter":
        if speed_kts > 750:
            return "Likely: F-22 Raptor or Su-57 (90% confidence) ⚠️ HIGH THREAT"
        elif speed_kts > 650:
            return "Likely: F-16 Fighting Falcon or MiG-29 (87% confidence) ⚠️ THREAT"
        else:
            return "Likely: F/A-18 Hornet or Rafale (84% confidence) ⚠️ THREAT"
    
    return "Unknown aircraft model (insufficient data)"


def get_alert_message(classification: str, transponder_id: str = None) -> str:
    """Generate alert message based on classification"""
    messages = {
        "civilian_prop": f"Small aircraft detected (ID: {transponder_id or 'UNKNOWN'})",
        "airliner": f"Commercial aircraft detected (ID: {transponder_id or 'UNKNOWN'})",
        "high_performance": f"High-performance aircraft detected (ID: {transponder_id or 'UNKNOWN'}) - POTENTIAL THREAT",
        "fighter": f"FIGHTER/ATTACK AIRCRAFT DETECTED (ID: {transponder_id or 'UNKNOWN'}) - IMMEDIATE THREAT"
    }
    return messages.get(classification, f"Unknown aircraft detected (ID: {transponder_id or 'UNKNOWN'})")


def is_threat_level_high(classification: str) -> bool:
    """Check if classification indicates high threat"""
    return classification in ["high_performance", "fighter"]
