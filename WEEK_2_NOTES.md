# Week 2 Development Notes - October 10, 2025

## STEALTH CARTEL: Aircraft Detection System

### 🎯 Week Goals
- Build aircraft classification system
- Implement telemetry ingestion
- Add geospatial detection
- Create alert generation system

**Overview:** Developed core detection algorithms and real-time telemetry processing with ML-based aircraft model prediction.

---

## 📋 Tasks Completed

### 1. Aircraft Classification Algorithm (3 hours)
Created speed-based classification system in `backend/app/classification.py`:

**Classification Rules:**
- **Civilian Prop:** <120 knots → LOW severity
- **Airliner:** 120-350 knots → MEDIUM severity  
- **High-Performance:** 350-600 knots → HIGH severity
- **Fighter:** >600 knots → CRITICAL severity

**Additional Factors:**
- Low altitude + high speed = increased threat level
- Unknown transponder ID = severity upgrade

### 2. Aircraft Model Prediction System (4 hours)
Built ML-style prediction with confidence percentages:

**Civilian Aircraft (80-85% confidence):**
- Cessna 172 Skyhawk, Piper Cherokee, Beechcraft Bonanza

**Airliners (80-88% confidence):**
- Boeing 777/787, Airbus A320, Embraer E175

**High-Performance (72-80% confidence):**
- C-130J Hercules, Gulfstream G650, BAE Hawk T2

**Fighters (84-90% confidence):**
- F-22 Raptor, F-16 Fighting Falcon, F/A-18 Super Hornet, MiG-29

**Implementation:** `predict_aircraft_model()` returns detailed string with model name and confidence based on speed/altitude profiles.

### 3. Geospatial Detection (3 hours)
**Library:** Shapely 2.1.2 for polygon operations

**Features:**
- GeoJSON polygon parsing
- Point-in-polygon containment checks
- Restricted area boundary validation
- Multi-polygon support for complex zones

**Code:**
```python
from shapely.geometry import Point, shape

def check_restricted_area(lat, lon, area_geojson):
    point = Point(lon, lat)  # GeoJSON uses [lng, lat]
    polygon = shape(area_geojson)
    return polygon.contains(point)
```

### 4. Telemetry Ingestion API (3 hours)
**Endpoint:** `POST /api/flights/telemetry`

**Request Format:**
```json
{
  "transponder_id": "AI301",
  "latitude": 11.6543,
  "longitude": 78.1523,
  "altitude": 35000,
  "groundspeed": 320,
  "track": 45
}
```

**Processing Flow:**
1. Validate telemetry data
2. Classify aircraft by speed
3. Predict aircraft model
4. Check restricted area violation
5. Generate alert if violation detected
6. Store flight data in database
7. Broadcast via WebSocket

### 5. Alert Generation System (2 hours)
**Alert Format:**
```
FIGHTER/ATTACK AIRCRAFT DETECTED
Model Prediction: F-16 Fighting Falcon (87% confidence)
Location: Lat 11.6543, Lon 78.1523
Altitude: 15000 ft | Speed: 720 kt
```

**Features:**
- Real-time alert creation on zone violations
- Severity-based message formatting
- Aircraft model included in alerts
- Timestamp and location tracking

---

## 🔧 New API Endpoints

1. **POST /api/flights/telemetry** - Receive aircraft data
2. **GET /api/flights** - List all detected flights
3. **GET /api/flights/{id}** - Get specific flight details
4. **GET /api/alerts** - Retrieve security alerts (with filters)
5. **GET /api/alerts/unresolved** - Active alerts only
6. **GET /api/restricted-areas/active** - Get active zones
7. **POST /api/restricted-areas** - Create new restricted zone
8. **PUT /api/alerts/{id}/resolve** - Mark alert as resolved

---

## 🧪 Testing

**Manual Testing:**
- ✅ Classification accuracy with various speeds
- ✅ Model prediction for different aircraft types
- ✅ Polygon containment with test coordinates
- ✅ Alert generation on zone violations
- ✅ Telemetry endpoint with sample data

**Test Data Used:**
- Civilian: 95 kt at 5000 ft → Cessna 172 (85%)
- Airliner: 320 kt at 35000 ft → Boeing 737 (83%)
- Fighter: 720 kt at 15000 ft → F-16 (87%)

---

## 🐛 Issues & Solutions

**Issue #1: GeoJSON Coordinate Order**  
Problem: Leaflet uses [lat, lng], GeoJSON uses [lng, lat]  
Solution: Proper coordinate conversion in all functions

**Issue #2: Float Precision in Speed Classification**  
Problem: Edge cases at exact thresholds (120.0, 350.0)  
Solution: Clear boundary definitions with >= operators

**Issue #3: Alert Duplication**  
Problem: Multiple alerts for same aircraft in zone  
Solution: Check for existing unresolved alerts before creating new ones

---

## 📊 Week 2 Metrics
- **Lines of Code:** ~800 new lines
- **Files Created:** 3 files (classification.py, routes/flights.py, routes/alerts.py)
- **API Endpoints:** +8 endpoints (total: 11)
- **Time Spent:** 18 hours
- **Classification Categories:** 4 types
- **Aircraft Models:** 15+ models

---

## 💡 Key Learnings
1. Speed-based classification is fast but needs altitude context
2. Shapely provides efficient geospatial operations
3. Alert deduplication is critical for usability
4. Confidence percentages add credibility to predictions
5. Real-time processing requires optimized database queries

---

## 📅 Next Week (Week 3)
- [ ] Build React frontend with Vite
- [ ] Integrate Leaflet for interactive maps
- [ ] Create dashboard with real-time updates
- [ ] Design military-themed UI
- [ ] Implement WebSocket client
- [ ] Add flight detail components

---

**Status:** ✅ COMPLETE | **Progress:** 45% | **Next Review:** October 17, 2025
