# Week 4 Development Notes - October 24, 2025

## STEALTH CARTEL: Aircraft Detection System

### 🎯 Week Goals
- Configure Salem restricted area
- Build flight simulator
- Create diverse aircraft scenarios
- Reset database with new location
- Test full system integration

**Overview:** Shifted focus to Salem, Tamil Nadu and created realistic flight simulation with 8 aircraft crossing restricted zone.

---

## 📋 Tasks Completed

### 1. Location Change to Salem (2 hours)
**Previous Location:** San Francisco → New Delhi  
**Final Location:** Salem, Tamil Nadu, India

**Salem Restricted Area Coordinates:**
- Northwest: [78.10°E, 11.70°N]
- Northeast: [78.20°E, 11.70°N]
- Southeast: [78.20°E, 11.60°N]
- Southwest: [78.10°E, 11.60°N]

**Map Center:** [11.6643, 78.1460]

**Rationale:**
- Strategic military location
- Moderate air traffic
- Clear geospatial boundaries
- Suitable for demonstration

### 2. Database Reset Script (1 hour)
Created `backend/reset_database.py`:

**Actions:**
1. Delete old `aircraft_detection.db`
2. Reinitialize database schema
3. Seed admin user (admin/admin123)
4. Create Salem restricted area with GeoJSON
5. Set severity level to HIGH

**Execution:**
```bash
cd backend
python reset_database.py
```

### 3. Flight Simulator Development (5 hours)
Created `simulate_flights.py` with realistic physics:

**Aircraft Class Features:**
- Speed calculation (knots to degrees/second)
- Heading-based position updates
- Altitude variation
- Random perturbations for realism
- Transponder ID tracking

**Physics Formula:**
```python
speed_deg_per_sec = speed_knots * 0.000514
delta_lat = speed * cos(track) * time_delta
delta_lon = speed * sin(track) * time_delta / cos(latitude)
```

**Update Interval:** 1 second (adjustable via --interval flag)

### 4. Aircraft Scenario Configuration (3 hours)
Created 8 diverse aircraft with specific missions:

**INSIDE Restricted Zone (Loitering):**
1. **VT-SAL** - Civilian prop at 11.645°N, 78.15°E
   - Speed: 110 kt, Altitude: 3500 ft
   - Track: 90° (flying east, staying in zone)

2. **VT-TMN** - Private jet at 11.655°N, 78.16°E
   - Speed: 250 kt, Altitude: 18000 ft
   - Track: 270° (flying west, circling)

3. **IAF-304** - Fighter at 11.650°N, 78.15°E
   - Speed: 520 kt, Altitude: 12000 ft
   - Track: 180° (flying south, patrol pattern)

**PASSING THROUGH Zone:**
4. **AI301** - Air India airliner
   - Start: 11.55°N, 78.08°E
   - Speed: 420 kt, Altitude: 35000 ft
   - Track: 15° (northeast crossing)

5. **6E789** - IndiGo airliner
   - Start: 11.73°N, 78.22°E
   - Speed: 380 kt, Altitude: 32000 ft
   - Track: 225° (southwest crossing)

6. **UNKNOWN** - Drone (no transponder)
   - Start: 11.57°N, 78.15°E
   - Speed: 85 kt, Altitude: 300 ft
   - Track: 0° (straight north penetration)

7. **UNKNOWN** - Fighter jet (no transponder)
   - Start: 11.52°N, 78.08°E
   - Speed: 780 kt, Altitude: 25000 ft
   - Track: 45° (northeast diagonal, HIGH threat)

8. **UNKNOWN** - Military transport (no transponder)
   - Start: 11.75°N, 78.22°E
   - Speed: 460 kt, Altitude: 22000 ft
   - Track: 225° (southwest crossing)

### 5. Alert System Testing (2 hours)
**Verified Functionality:**
- ✅ Alerts triggering when aircraft enter Salem zone
- ✅ Model predictions appearing in alert messages
- ✅ Severity levels correctly assigned
- ✅ Alerts stored in database
- ✅ WebSocket broadcasts working

**Sample Alert:**
```
🚨 ALERT: Commercial aircraft detected (ID: 6E789)
Model Prediction: Likely: Boeing 737/Airbus A320 (83% confidence)
Location: Lat 11.6264, Lon 78.1142
Altitude: 32080 ft | Speed: 286 kt
```

### 6. Frontend Map Updates (2 hours)
**Changes Made:**
- Updated center coordinates to Salem
- Adjusted zoom level for better view
- Tested polygon rendering with new coordinates
- Verified marker positions match simulator data
- Confirmed real-time updates working

---

## 🧪 System Integration Testing

**Full Stack Test:**
1. Start backend: `uvicorn app.main:app --reload`
2. Start frontend: `npm run dev`
3. Start simulator: `python simulate_flights.py --interval 1`
4. Login to dashboard
5. Observe aircraft on map
6. Verify alerts appearing in real-time

**Results:**
- ✅ All 8 aircraft visible on map
- ✅ 3 aircraft continuously inside zone
- ✅ 5 aircraft crossing through zone
- ✅ Alerts generating every 1-2 seconds
- ✅ Backend handling ~8 requests/second
- ✅ Frontend updating smoothly

---

## 🐛 Issues & Solutions

**Issue #1: Simulator Transponder Format Bug**  
Problem: `transponder = telemetry.get('transponder_id') or 'UNKNOWN'` returning 'None'  
Solution: Fixed logic to properly handle None values

**Issue #2: Aircraft Flying Too Fast Past Zone**  
Problem: Fighters passing restricted area too quickly  
Solution: Adjusted starting positions farther from zone

**Issue #3: Too Many Alerts Flooding System**  
Problem: Duplicate alerts every second for same aircraft  
Solution: Added alert deduplication logic (check existing unresolved)

**Issue #4: Map Not Centering on Salem**  
Problem: Map still centered on old coordinates  
Solution: Updated center prop in MapContainer component

---

## 📊 Week 4 Metrics
- **Lines of Code:** ~500 new lines
- **Aircraft Simulated:** 8 simultaneous flights
- **Update Frequency:** 1 second intervals
- **Alert Rate:** ~10-15 alerts/minute
- **Time Spent:** 17 hours
- **Database Reset:** 1 successful migration

---

## 💡 Key Learnings
1. Realistic flight physics requires careful calculation
2. Aircraft speed directly impacts detection time
3. Multiple scenarios improve system testing
4. Database resets need careful planning
5. Geospatial coordinates require precision

---

## 📅 Next Week (Week 5)
- [ ] Implement smooth aircraft movement animation
- [ ] Add CSS transitions to markers
- [ ] Fix marker "blinking" issue
- [ ] Optimize animation performance
- [ ] Final polish and testing
- [ ] Prepare for deployment

---

**Status:** ✅ COMPLETE | **Progress:** 85% | **Next Review:** October 30, 2025
