"""
Flight simulator - Generates realistic flight telemetry data

Usage:
    python simulate_flights.py [--interval SECONDS] [--duration MINUTES]

Example:
    python simulate_flights.py --interval 2 --duration 60
"""

import requests
import time
import random
import math
import argparse
from datetime import datetime

API_BASE_URL = "http://localhost:8000/api"

# Salem, Tamil Nadu, India coordinates (restricted area)
CENTER_LAT = 11.6643
CENTER_LON = 78.1460

# Restricted area around Salem, Tamil Nadu
RESTRICTED_AREA = {
    "type": "Polygon",
    "coordinates": [[
        [78.10, 11.70],  # Northwest
        [78.20, 11.70],  # Northeast
        [78.20, 11.60],  # Southeast
        [78.10, 11.60],  # Southwest
        [78.10, 11.70]   # Close
    ]]
}


class Aircraft:
    """Simulated aircraft with realistic flight characteristics"""
    
    def __init__(self, aircraft_type, transponder_id=None):
        self.aircraft_type = aircraft_type
        self.transponder_id = transponder_id
        
        # Set characteristics based on type
        if aircraft_type == "civilian_prop":
            self.speed = random.uniform(80, 115)  # knots
            self.altitude = random.uniform(2000, 8000)  # feet
            self.track = random.uniform(0, 360)
        elif aircraft_type == "private_jet":
            self.speed = random.uniform(200, 300)
            self.altitude = random.uniform(10000, 35000)
            self.track = random.uniform(0, 360)
        elif aircraft_type == "airliner":
            self.speed = random.uniform(250, 350)
            self.altitude = random.uniform(25000, 40000)
            self.track = random.uniform(0, 360)
        elif aircraft_type == "drone":
            self.speed = random.uniform(20, 80)
            self.altitude = random.uniform(200, 3000)
            self.track = random.uniform(0, 360)
        elif aircraft_type == "fighter":
            self.speed = random.uniform(400, 800)
            self.altitude = random.uniform(5000, 50000)
            self.track = random.uniform(0, 360)
        else:
            self.speed = 200
            self.altitude = 10000
            self.track = 0
        
        # Random starting position near center
        self.latitude = CENTER_LAT + random.uniform(-0.1, 0.1)
        self.longitude = CENTER_LON + random.uniform(-0.1, 0.1)
    
    def update_position(self, time_delta=1.0):
        """Update aircraft position based on speed and track"""
        # Convert speed from knots to degrees per second (approximate)
        # 1 NM = 1/60 degree latitude; 1 kt = 1 NM/hour
        # degrees per second = (1/60) / 3600 = 1/216000 ≈ 0.0000046296
        speed_deg_per_sec = self.speed / 216000.0
        
        # Calculate position change
        delta_lat = speed_deg_per_sec * math.cos(math.radians(self.track)) * time_delta
        delta_lon = speed_deg_per_sec * math.sin(math.radians(self.track)) * time_delta / math.cos(math.radians(self.latitude))
        
        self.latitude += delta_lat
        self.longitude += delta_lon
        
        # Add small random variations
        self.speed += random.uniform(-2, 2)
        self.track += random.uniform(-5, 5)
        self.altitude += random.uniform(-100, 100)
        
        # Keep values in reasonable ranges
        self.track = self.track % 360
        if self.aircraft_type == "civilian_prop":
            self.speed = max(70, min(120, self.speed))
            self.altitude = max(1000, min(10000, self.altitude))
        elif self.aircraft_type == "airliner":
            self.speed = max(230, min(370, self.speed))
            self.altitude = max(20000, min(42000, self.altitude))
        elif self.aircraft_type == "fighter":
            self.speed = max(350, min(850, self.speed))

    def get_telemetry(self):
        """Get current telemetry data"""
        return {
            "transponder_id": self.transponder_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "altitude": self.altitude,
            "groundspeed": self.speed,
            "track": self.track
        }


class WaypointAircraft(Aircraft):
    """Aircraft that follows looping waypoints (ping-pong) to repeatedly cross the zone"""
    def __init__(self, transponder_id, speed, altitude, waypoints):
        super().__init__("path", transponder_id)
        self.speed = speed
        self.altitude = altitude
        self.waypoints = waypoints  # list of (lat, lon)
        self.wp_index = 0
        self.latitude, self.longitude = self.waypoints[0]
        self.forward = True  # ping-pong along path
        self.track = 0

    def update_position(self, time_delta=1.0):
        # target waypoint index
        next_index = self.wp_index + (1 if self.forward else -1)
        if next_index < 0 or next_index >= len(self.waypoints):
            # reverse direction
            self.forward = not self.forward
            next_index = self.wp_index + (1 if self.forward else -1)

        tgt_lat, tgt_lon = self.waypoints[next_index]
        cur_lat, cur_lon = self.latitude, self.longitude

        # compute vector to target in degrees
        dlat = tgt_lat - cur_lat
        dlon = (tgt_lon - cur_lon) * (1 / max(0.000001, math.cos(math.radians(cur_lat))))
        dist_deg = math.hypot(dlat, dlon)

        # step size in degrees latitude per second (approx)
        step_deg = max(0.000001, (self.speed / 216000.0) * time_delta)

        if dist_deg <= step_deg:
            # reach the waypoint
            self.latitude, self.longitude = tgt_lat, tgt_lon
            self.wp_index = next_index
        else:
            # move proportionally towards target
            ux, uy = dlat / dist_deg, dlon / dist_deg
            self.latitude += ux * step_deg
            self.longitude += (uy * step_deg) * max(0.000001, math.cos(math.radians(cur_lat)))

        # update track (bearing) for UI
        self.track = (math.degrees(math.atan2(
            (tgt_lon - cur_lon) * math.cos(math.radians((tgt_lat + cur_lat) / 2)),
            (tgt_lat - cur_lat)
        )) + 360) % 360
        # small natural variations
        self.altitude += random.uniform(-50, 50)
        self.altitude = max(300, min(60000, self.altitude))


def send_telemetry(telemetry):
    """Send telemetry data to API"""
    try:
        response = requests.post(
            f"{API_BASE_URL}/flights/telemetry",
            json=telemetry,
            timeout=5
        )
        if response.status_code == 201:
            transponder = telemetry.get('transponder_id') or 'UNKNOWN'
            print(f"✓ {transponder:12} | "
                  f"{telemetry['groundspeed']:6.1f} kt | "
                  f"{telemetry['altitude']:7.0f} ft | "
                  f"({telemetry['latitude']:.4f}, {telemetry['longitude']:.4f})")
        else:
            print(f"✗ Error sending telemetry: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"✗ Connection error: {e}")


def create_restricted_area():
    """Create restricted area on first run"""
    try:
        # Try to get active restricted area
        response = requests.get(f"{API_BASE_URL}/restricted-areas/active")
        if response.status_code == 200:
            print("✓ Restricted area already exists")
            return
    except:
        pass
    
    print("Creating restricted area...")
    # Note: This requires admin authentication
    # You may need to manually create it via the UI or with proper auth
    print("⚠ Please create restricted area manually via the admin UI")


def main():
    parser = argparse.ArgumentParser(description="Flight simulator for aircraft detection system")
    parser.add_argument("--interval", type=float, default=1.0, help="Update interval in seconds (default: 1)")
    parser.add_argument("--duration", type=int, default=0, help="Duration in minutes (0 = infinite)")
    args = parser.parse_args()
    
    print("=" * 80)
    print("Aircraft Detection System - Flight Simulator")
    print("=" * 80)
    print(f"API: {API_BASE_URL}")
    print(f"Update interval: {args.interval} seconds")
    print(f"Duration: {'infinite' if args.duration == 0 else f'{args.duration} minutes'}")
    print("=" * 80)
    print()
    
    # Create fleet of aircraft
    # Multiple aircraft will fly THROUGH the Salem restricted area with realistic paths
    aircraft_fleet = []
    
    # LOOPING CROSSERS that repeatedly pass through SALem restricted zone
    cross1 = WaypointAircraft(
        transponder_id="AI301",
        speed=140,  # slower for natural movement
        altitude=32000,
        waypoints=[
            (11.58, 78.08),  # SW outside
            (11.65, 78.15),  # center (inside)
            (11.72, 78.22)   # NE outside
        ]
    )
    aircraft_fleet.append(cross1)

    cross2 = WaypointAircraft(
        transponder_id="6E789",
        speed=150,
        altitude=30000,
        waypoints=[
            (11.72, 78.08),  # NW outside
            (11.65, 78.15),  # center (inside)
            (11.58, 78.22)   # SE outside
        ]
    )
    aircraft_fleet.append(cross2)
    
    # AIRCRAFT #3: Small civilian circling INSIDE restricted zone
    civilian_inside = WaypointAircraft(
        transponder_id="VT-SAL",
        speed=60,
        altitude=3500,
        waypoints=[
            (11.605, 78.12),
            (11.695, 78.18)
        ]
    )
    aircraft_fleet.append(civilian_inside)
    
    # AIRCRAFT #4: Private jet loitering INSIDE restricted zone
    jet_inside = WaypointAircraft(
        transponder_id="VT-TMN",
        speed=140,
        altitude=18000,
        waypoints=[
            (11.605, 78.18),
            (11.695, 78.12)
        ]
    )
    aircraft_fleet.append(jet_inside)
    
    # AIRCRAFT #5: Fighter circling INSIDE restricted zone
    fighter_inside = WaypointAircraft(
        transponder_id="IAF-304",
        speed=200,
        altitude=12000,
        waypoints=[
            (11.60, 78.15),
            (11.70, 78.15)
        ]
    )
    aircraft_fleet.append(fighter_inside)
    
    # THREAT #6: UNKNOWN drone passing through
    unknown_drone = WaypointAircraft(
        transponder_id=None,
        speed=40,
        altitude=300,
        waypoints=[
            (11.57, 78.15),
            (11.73, 78.15)
        ]
    )
    aircraft_fleet.append(unknown_drone)
    
    # THREAT #7: UNKNOWN fighter passing through fast
    unknown_fighter = WaypointAircraft(
        transponder_id=None,
        speed=250,
        altitude=22000,
        waypoints=[
            (11.52, 78.08),
            (11.80, 78.30)
        ]
    )
    aircraft_fleet.append(unknown_fighter)
    
    # THREAT #8: UNKNOWN high-performance passing through
    unknown_military = WaypointAircraft(
        transponder_id=None,
        speed=180,
        altitude=20000,
        waypoints=[
            (11.75, 78.22),
            (11.55, 78.10)
        ]
    )
    aircraft_fleet.append(unknown_military)

    # GLOBAL ROUTES: aircraft cruising across the globe (for world-wide lanes)
    world_lane_1 = WaypointAircraft(
        transponder_id="GLOBAL-1",
        speed=190,
        altitude=36000,
        waypoints=[
            (20.0, -160.0), (20.0, -100.0), (20.0, -40.0),
            (20.0, 20.0), (20.0, 80.0), (20.0, 140.0)
        ]
    )
    aircraft_fleet.append(world_lane_1)

    world_lane_2 = WaypointAircraft(
        transponder_id="GLOBAL-2",
        speed=170,
        altitude=38000,
        waypoints=[
            (-30.0, 150.0), (-10.0, 120.0), (0.0, 60.0), (10.0, 0.0),
            (30.0, -60.0), (45.0, -120.0)
        ]
    )
    aircraft_fleet.append(world_lane_2)
    
    print(f"Created {len(aircraft_fleet)} aircraft:")
    for aircraft in aircraft_fleet:
        print(f"  - {aircraft.aircraft_type:15} | ID: {aircraft.transponder_id or 'UNKNOWN'}")
    print()
    print("Starting simulation...")
    print("=" * 80)
    print(f"{'ID':<12} | {'Speed':>10} | {'Altitude':>10} | Position")
    print("-" * 80)
    
    start_time = time.time()
    duration_seconds = args.duration * 60 if args.duration > 0 else float('inf')
    
    try:
        while time.time() - start_time < duration_seconds:
            for aircraft in aircraft_fleet:
                # Update position
                aircraft.update_position(args.interval)
                
                # Send telemetry
                telemetry = aircraft.get_telemetry()
                send_telemetry(telemetry)
            
            print()  # Blank line between rounds
            time.sleep(args.interval)
    
    except KeyboardInterrupt:
        print("\n\nSimulation stopped by user")
    
    print("=" * 80)
    print("Simulation complete")


if __name__ == "__main__":
    main()
