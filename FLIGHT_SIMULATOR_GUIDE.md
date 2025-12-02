# Flight Simulator - User Guide

## Overview
The flight simulator generates realistic aircraft flights that **pass through restricted zones** you draw on the map. When aircraft enter the restricted zone, they are automatically detected and alerts are triggered.

## How It Works

### 1. Draw a Restricted Zone
- Click the **"Draw Zone"** button in the dashboard
- Use the map to draw a polygon around the area you want to restrict
- The zone will be saved and activated automatically

### 2. Configure Flight Simulation
In the **Flight Simulator** panel (right sidebar):

- **Number of Flights**: Choose how many aircraft to simulate (1-10)
- **Aircraft Type**: Select the type of aircraft
  - **Random**: Mix of all types
  - **Commercial**: Airlines (300-550 kts, 30,000-42,000 ft)
  - **Private**: Small aircraft (100-250 kts, 5,000-15,000 ft)
  - **Military**: Fast jets (400-900 kts, 10,000-50,000 ft)
  - **Unknown**: No transponder (stealth aircraft)

### 3. Start the Simulation

**Step 1: Add Flights**
- Click **"➕ Add Flights"** button
- This creates the flight paths that will cross through your restricted zone
- Flights are generated but not yet moving

**Step 2: Run Simulation**
- Click **"▶ Run Simulation"** button
- Flights will start moving along their paths
- Telemetry updates are sent every 2 seconds
- Aircraft positions update on both radar and map

**Step 3: Monitor Detections**
- Watch the radar sweep detect aircraft
- See aircraft markers move on the map
- **When aircraft enter the restricted zone, alerts are triggered!**
- Alerts appear in the alert banner at the bottom

### 4. Control Options

- **⏸ Pause Simulation**: Stop sending telemetry updates (aircraft freeze)
- **🗑️ Clear All**: Remove all active flights
- **👁️ Preview Path**: See the trajectory before running (in console)

## What Happens When Aircraft Enter Restricted Zone

1. **Detection**: Aircraft position is checked against restricted zone boundaries
2. **Alert Generation**: If inside restricted zone:
   - Alert severity is calculated based on:
     - Unknown transponder = Higher threat
     - Speed and altitude
     - Aircraft type
   - Alert is created in the database
   - Alert appears in the UI

3. **Threat Levels**:
   - **Critical**: Unknown aircraft in restricted zone at high speed
   - **High**: Known aircraft in restricted zone
   - **Medium**: Aircraft near restricted zone
   - **Low**: Normal traffic

## Example Workflow

```
1. Login to the system (admin@example.com / strongpassword)
2. Click "Draw Zone" and draw a polygon over Salem
3. Set "Number of Flights" to 3
4. Select "Unknown" aircraft type (for maximum alerts)
5. Click "Add Flights"
6. Click "Run Simulation"
7. Watch the radar and map - aircraft will fly through the zone
8. See alerts triggered when they enter the restricted area!
```

## Technical Details

### Flight Path Generation
- Entry point is calculated outside the restricted zone
- Exit point is on the opposite side
- Path crosses directly through the zone
- Waypoints are interpolated along the path
- Small random variations make paths realistic

### Telemetry Updates
- Position updates every 2 seconds
- Speed and altitude have slight variations
- Bearing is maintained along the path
- Transponder ID is consistent (or None for unknown)

### Integration with Alert System
- Uses the same detection logic as real aircraft
- AI threat analysis is applied
- Alerts are stored in database
- WebSocket broadcasts for real-time updates

## API Endpoints

If you want to control via API:

```bash
# Start simulation
POST /api/simulator/start
{
  "num_flights": 3,
  "aircraft_type": "unknown",
  "use_active_restricted_area": true
}

# Send telemetry updates (advance all flights)
POST /api/simulator/send-all-telemetry

# Get simulator status
GET /api/simulator/status

# Clear all flights
DELETE /api/simulator/clear

# Preview trajectory
POST /api/simulator/preview-trajectory
```

## Troubleshooting

**No alerts appearing?**
- Make sure you drew a restricted zone first
- Verify the zone is active (check "Manage Zones")
- Ensure flights are actually running (not just added)
- Check that aircraft type isn't all "commercial" (lower threat)

**Flights disappear quickly?**
- This is normal - flights complete their route and are removed
- Add more flights or use the "Run Simulation" button again

**Backend not responding?**
- Restart backend: `cd "D:\STEALTH CARTEL\backend"; .\venv\Scripts\Activate.ps1; python -m app.main`
- Check backend is on port 8001
- Check frontend API URL is correct (localhost:8001)

## Future Enhancements
- Real-time speed adjustment
- Pause/resume individual flights
- Save/load flight scenarios
- Collision detection
- Weather impact on flight paths
