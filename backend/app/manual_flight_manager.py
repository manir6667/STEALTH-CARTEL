"""
Manual flight manager - Creates moving flights from manually placed positions
"""
from typing import Dict, List, Tuple, Optional
from app.flight_simulator import FlightSimulator
import json


class ManualFlightManager:
    """Manages manually placed flights and creates trajectories through restricted zones"""
    
    def __init__(self):
        self.manual_flights: Dict[str, Dict] = {}
        self.flight_counter = 0
    
    def register_manual_flight(
        self,
        transponder_id: Optional[str],
        latitude: float,
        longitude: float,
        altitude: float,
        groundspeed: float,
        track: float,
        polygon_json: str
    ) -> str:
        """
        Register a manually placed flight and create a trajectory in the specified heading
        
        Args:
            transponder_id: Aircraft transponder ID
            latitude: Current latitude
            longitude: Current longitude
            altitude: Flight altitude
            groundspeed: Aircraft speed
            track: Current heading (0-360 degrees, 0=North)
            polygon_json: Restricted zone polygon
            
        Returns:
            flight_id: Unique identifier for this flight
        """
        self.flight_counter += 1
        flight_id = f"MANUAL_{self.flight_counter:04d}"
        
        # Create trajectory based on heading, not zone center
        waypoints = self._create_trajectory_from_heading(
            (longitude, latitude),
            track,
            polygon_json,
            num_waypoints=30
        )
        
        # Store flight plan
        self.manual_flights[flight_id] = {
            'transponder_id': transponder_id,
            'waypoints': waypoints,
            'speed': groundspeed,
            'altitude': altitude,
            'bearing': track,
            'current_waypoint_index': 0
        }
        
        return flight_id
    
    def _create_trajectory_from_heading(
        self,
        start_pos: Tuple[float, float],
        heading: float,
        polygon_json: str,
        num_waypoints: int = 30
    ) -> List[Tuple[float, float]]:
        """
        Create waypoints from start position in the direction of the heading
        
        Args:
            start_pos: (longitude, latitude) starting position
            heading: Heading in degrees (0 = North, 90 = East, etc.)
            polygon_json: GeoJSON polygon of restricted zone (used to calculate distance)
            num_waypoints: Number of waypoints to generate
            
        Returns:
            List of (longitude, latitude) waypoints
        """
        import math
        import random
        
        start_lon, start_lat = start_pos
        
        # Get zone bounds to determine appropriate travel distance
        from shapely.geometry import shape
        polygon_data = json.loads(polygon_json)
        polygon = shape(polygon_data)
        bounds = polygon.bounds
        minx, miny, maxx, maxy = bounds
        
        # Calculate zone size
        zone_width = maxx - minx
        zone_height = maxy - miny
        
        # Travel distance: enough to cross the zone and continue beyond
        total_distance = max(zone_width, zone_height) * 2.5
        
        # Convert heading to radians
        # Heading: 0 = North (positive Y), 90 = East (positive X)
        # Math angle: 0 = East (positive X), 90 = North (positive Y)
        # Conversion: math_angle = 90 - heading
        angle_rad = math.radians(90 - heading)
        
        # Calculate direction components
        dx = math.cos(angle_rad) * total_distance
        dy = math.sin(angle_rad) * total_distance
        
        # Calculate end point
        end_lon = start_lon + dx
        end_lat = start_lat + dy
        
        # Generate waypoints along the path
        waypoints = []
        for i in range(num_waypoints + 1):
            t = i / num_waypoints
            lon = start_lon + t * (end_lon - start_lon)
            lat = start_lat + t * (end_lat - start_lat)
            
            # Add slight random variation for realism
            if i > 0 and i < num_waypoints:
                variation = 0.0005
                lon += random.uniform(-variation, variation)
                lat += random.uniform(-variation, variation)
            
            waypoints.append((lon, lat))
        
        return waypoints
    
    def get_next_position(self, flight_id: str) -> Optional[Dict]:
        """
        Get next position for a manually placed flight
        
        Returns:
            {
                'latitude': float,
                'longitude': float,
                'altitude': float,
                'groundspeed': float,
                'track': float,
                'transponder_id': str or None
            }
            or None if flight is complete
        """
        if flight_id not in self.manual_flights:
            return None
        
        flight_plan = self.manual_flights[flight_id]
        waypoint_index = flight_plan['current_waypoint_index']
        waypoints = flight_plan['waypoints']
        
        if waypoint_index >= len(waypoints):
            # Flight complete, remove it
            del self.manual_flights[flight_id]
            return None
        
        lon, lat = waypoints[waypoint_index]
        
        # Add slight variation to speed and altitude
        import random
        speed = flight_plan['speed'] + random.uniform(-10, 10)
        altitude = flight_plan['altitude'] + random.uniform(-500, 500)
        
        # Increment waypoint index
        flight_plan['current_waypoint_index'] += 1
        
        return {
            'latitude': lat,
            'longitude': lon,
            'altitude': max(0, altitude),
            'groundspeed': max(0, speed),
            'track': flight_plan['bearing'],
            'transponder_id': flight_plan['transponder_id']
        }
    
    def get_all_active_telemetry(self) -> List[Dict]:
        """Get telemetry updates for all active manual flights"""
        telemetry_list = []
        
        for flight_id in list(self.manual_flights.keys()):
            telemetry = self.get_next_position(flight_id)
            if telemetry:
                telemetry['flight_id'] = flight_id
                telemetry_list.append(telemetry)
        
        return telemetry_list
    
    def get_active_count(self) -> int:
        """Get number of active manual flights"""
        return len(self.manual_flights)
    
    def clear_all(self):
        """Clear all manual flights"""
        self.manual_flights.clear()
        self.flight_counter = 0
    
    def remove_flight(self, flight_id: str):
        """Remove a specific manual flight"""
        if flight_id in self.manual_flights:
            del self.manual_flights[flight_id]
