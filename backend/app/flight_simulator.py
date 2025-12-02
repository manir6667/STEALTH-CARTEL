"""
Flight Simulator - Generates realistic aircraft trajectories that pass through restricted zones
"""
import random
import math
from typing import List, Dict, Tuple, Optional
from shapely.geometry import Point, Polygon, shape
import json


class FlightSimulator:
    """Simulates aircraft flights with realistic paths"""
    
    # Aircraft types with their typical characteristics
    AIRCRAFT_TYPES = {
        'commercial': {
            'speed_range': (300, 550),  # knots
            'altitude_range': (30000, 42000),  # feet
            'transponder_prefix': 'COM',
            'probability': 0.4
        },
        'private': {
            'speed_range': (100, 250),
            'altitude_range': (5000, 15000),
            'transponder_prefix': 'PVT',
            'probability': 0.3
        },
        'military': {
            'speed_range': (400, 900),
            'altitude_range': (10000, 50000),
            'transponder_prefix': 'MIL',
            'probability': 0.1
        },
        'unknown': {
            'speed_range': (150, 400),
            'altitude_range': (1000, 25000),
            'transponder_prefix': None,
            'probability': 0.2
        }
    }
    
    @staticmethod
    def get_polygon_bounds(polygon_json: str) -> Tuple[float, float, float, float]:
        """Get bounding box of a polygon"""
        polygon_data = json.loads(polygon_json)
        polygon = shape(polygon_data)
        bounds = polygon.bounds
        return bounds  # (minx, miny, maxx, maxy)
    
    @staticmethod
    def get_polygon_center(polygon_json: str) -> Tuple[float, float]:
        """Get center point of a polygon"""
        polygon_data = json.loads(polygon_json)
        polygon = shape(polygon_data)
        centroid = polygon.centroid
        return (centroid.x, centroid.y)
    
    @staticmethod
    def generate_entry_exit_points(
        polygon_json: str,
        num_points: int = 1
    ) -> List[Tuple[Tuple[float, float], Tuple[float, float], float]]:
        """
        Generate entry and exit points that cross through the restricted zone
        Returns: List of (entry_point, exit_point, bearing) tuples
        """
        polygon_data = json.loads(polygon_json)
        polygon = shape(polygon_data)
        bounds = polygon.bounds
        minx, miny, maxx, maxy = bounds
        
        # Expand bounds to create entry/exit points outside the zone
        width = maxx - minx
        height = maxy - miny
        buffer = max(width, height) * 0.5  # 50% buffer around zone
        
        trajectories = []
        
        for _ in range(num_points):
            # Generate random angle (0-360 degrees)
            angle = random.uniform(0, 360)
            angle_rad = math.radians(angle)
            
            # Get center of polygon
            center_x, center_y = FlightSimulator.get_polygon_center(polygon_json)
            
            # Calculate entry point (outside the zone on one side)
            entry_distance = max(width, height) + buffer
            entry_x = center_x + entry_distance * math.cos(angle_rad)
            entry_y = center_y + entry_distance * math.sin(angle_rad)
            
            # Calculate exit point (opposite side)
            exit_x = center_x - entry_distance * math.cos(angle_rad)
            exit_y = center_y - entry_distance * math.sin(angle_rad)
            
            # Calculate bearing (0-360, where 0 is North)
            bearing = (90 - math.degrees(math.atan2(exit_y - entry_y, exit_x - entry_x))) % 360
            
            trajectories.append(((entry_x, entry_y), (exit_x, exit_y), bearing))
        
        return trajectories
    
    @staticmethod
    def generate_waypoints(
        entry_point: Tuple[float, float],
        exit_point: Tuple[float, float],
        num_waypoints: int = 20
    ) -> List[Tuple[float, float]]:
        """Generate waypoints along a path from entry to exit"""
        waypoints = []
        
        for i in range(num_waypoints + 1):
            t = i / num_waypoints
            # Linear interpolation with slight random variation
            x = entry_point[0] + t * (exit_point[0] - entry_point[0])
            y = entry_point[1] + t * (exit_point[1] - entry_point[1])
            
            # Add small random variation to make path more realistic
            if i > 0 and i < num_waypoints:
                variation = 0.001  # About 100m at mid latitudes
                x += random.uniform(-variation, variation)
                y += random.uniform(-variation, variation)
            
            waypoints.append((x, y))
        
        return waypoints
    
    @staticmethod
    def select_aircraft_type() -> str:
        """Randomly select an aircraft type based on probability distribution"""
        rand = random.random()
        cumulative = 0
        
        for aircraft_type, config in FlightSimulator.AIRCRAFT_TYPES.items():
            cumulative += config['probability']
            if rand <= cumulative:
                return aircraft_type
        
        return 'commercial'  # Default fallback
    
    @staticmethod
    def generate_flight_plan(
        polygon_json: str,
        aircraft_type: Optional[str] = None,
        custom_heading: Optional[float] = None,
        custom_speed: Optional[float] = None
    ) -> Dict:
        """
        Generate a complete flight plan that crosses through the restricted zone
        
        Args:
            polygon_json: GeoJSON polygon of restricted area
            aircraft_type: Type of aircraft (optional)
            custom_heading: Custom heading in degrees 0-360 (optional)
            custom_speed: Custom speed in knots (optional)
        
        Returns:
            {
                'aircraft_type': str,
                'transponder_id': str or None,
                'waypoints': List[(lon, lat)],
                'speed': float (knots),
                'altitude': float (feet),
                'bearing': float (degrees)
            }
        """
        # Select aircraft type
        if aircraft_type is None:
            aircraft_type = FlightSimulator.select_aircraft_type()
        
        config = FlightSimulator.AIRCRAFT_TYPES[aircraft_type]
        
        # Generate transponder ID
        if config['transponder_prefix'] and aircraft_type != 'unknown':
            transponder_id = f"{config['transponder_prefix']}{random.randint(1000, 9999)}"
        else:
            transponder_id = None
        
        # Use custom heading or generate random
        if custom_heading is not None:
            # Generate entry/exit points based on custom heading
            entry, exit_point, bearing = FlightSimulator.generate_entry_exit_from_heading(
                polygon_json, custom_heading
            )
        else:
            # Generate random entry/exit points
            trajectories = FlightSimulator.generate_entry_exit_points(polygon_json, num_points=1)
            entry, exit_point, bearing = trajectories[0]
        
        # Generate waypoints
        waypoints = FlightSimulator.generate_waypoints(entry, exit_point, num_waypoints=30)
        
        # Use custom speed or generate random based on aircraft type
        if custom_speed is not None:
            speed = custom_speed
        else:
            speed = random.uniform(*config['speed_range'])
        
        altitude = random.uniform(*config['altitude_range'])
        
        return {
            'aircraft_type': aircraft_type,
            'transponder_id': transponder_id,
            'waypoints': waypoints,
            'speed': speed,
            'altitude': altitude,
            'bearing': bearing,
            'current_waypoint_index': 0
        }
    
    @staticmethod
    def generate_entry_exit_from_heading(
        polygon_json: str,
        heading: float
    ) -> Tuple[Tuple[float, float], Tuple[float, float], float]:
        """
        Generate entry and exit points based on a specific heading
        
        Args:
            polygon_json: GeoJSON polygon
            heading: Heading in degrees (0 = North, 90 = East, etc.)
        
        Returns:
            (entry_point, exit_point, bearing)
        """
        polygon_data = json.loads(polygon_json)
        polygon = shape(polygon_data)
        bounds = polygon.bounds
        minx, miny, maxx, maxy = bounds
        
        width = maxx - minx
        height = maxy - miny
        buffer = max(width, height) * 0.5
        
        center_x, center_y = FlightSimulator.get_polygon_center(polygon_json)
        
        # Convert heading to angle (heading 0 = North = 90 degrees in math coordinates)
        angle_rad = math.radians(90 - heading)
        
        # Calculate entry point (opposite of heading direction - plane comes FROM opposite side)
        entry_distance = max(width, height) + buffer
        entry_x = center_x - entry_distance * math.cos(angle_rad)
        entry_y = center_y - entry_distance * math.sin(angle_rad)
        
        # Calculate exit point (in heading direction)
        exit_x = center_x + entry_distance * math.cos(angle_rad)
        exit_y = center_y + entry_distance * math.sin(angle_rad)
        
        return ((entry_x, entry_y), (exit_x, exit_y), heading)
    
    @staticmethod
    def get_next_position(flight_plan: Dict) -> Optional[Dict]:
        """
        Get next position in the flight plan
        
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
        waypoint_index = flight_plan['current_waypoint_index']
        waypoints = flight_plan['waypoints']
        
        if waypoint_index >= len(waypoints):
            return None  # Flight complete
        
        lon, lat = waypoints[waypoint_index]
        
        # Add slight variation to speed and altitude
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


class SimulationManager:
    """Manages multiple active flight simulations"""
    
    def __init__(self):
        self.active_flights: Dict[str, Dict] = {}
        self.flight_counter = 0
    
    def add_flight(
        self, 
        polygon_json: str, 
        aircraft_type: Optional[str] = None,
        custom_heading: Optional[float] = None,
        custom_speed: Optional[float] = None
    ) -> str:
        """Add a new flight to the simulation"""
        self.flight_counter += 1
        flight_id = f"FLIGHT_{self.flight_counter:04d}"
        
        flight_plan = FlightSimulator.generate_flight_plan(
            polygon_json, 
            aircraft_type,
            custom_heading=custom_heading,
            custom_speed=custom_speed
        )
        self.active_flights[flight_id] = flight_plan
        
        return flight_id
    
    def get_next_telemetry(self, flight_id: str) -> Optional[Dict]:
        """Get next telemetry update for a flight"""
        if flight_id not in self.active_flights:
            return None
        
        flight_plan = self.active_flights[flight_id]
        telemetry = FlightSimulator.get_next_position(flight_plan)
        
        # Remove flight if complete
        if telemetry is None:
            del self.active_flights[flight_id]
        
        return telemetry
    
    def get_all_active_telemetry(self) -> List[Dict]:
        """Get telemetry updates for all active flights"""
        telemetry_list = []
        
        for flight_id in list(self.active_flights.keys()):
            telemetry = self.get_next_telemetry(flight_id)
            if telemetry:
                telemetry['flight_id'] = flight_id
                telemetry_list.append(telemetry)
        
        return telemetry_list
    
    def remove_flight(self, flight_id: str):
        """Remove a flight from simulation"""
        if flight_id in self.active_flights:
            del self.active_flights[flight_id]
    
    def clear_all(self):
        """Clear all active flights"""
        self.active_flights.clear()
        self.flight_counter = 0
    
    def get_active_count(self) -> int:
        """Get number of active flights"""
        return len(self.active_flights)
