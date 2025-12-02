"""
ADS-B data simulator and matcher
"""
import pandas as pd
import numpy as np
from typing import Optional, Dict, Tuple
from pathlib import Path
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class ADSBSimulator:
    """ADS-B data simulator and spatio-temporal matcher"""
    
    def __init__(
        self,
        csv_path: Optional[str] = None,
        match_radius_m: float = 50.0,
        match_time_s: float = 2.0
    ):
        """
        Initialize ADS-B simulator
        
        Args:
            csv_path: Path to ADS-B CSV file
            match_radius_m: Maximum distance for matching (meters)
            match_time_s: Maximum time difference for matching (seconds)
        """
        self.csv_path = csv_path
        self.match_radius_m = match_radius_m
        self.match_time_s = match_time_s
        
        self.data = None
        self.enabled = False
        
        if csv_path and Path(csv_path).exists():
            self._load_data()
    
    def _load_data(self):
        """Load ADS-B data from CSV"""
        try:
            self.data = pd.read_csv(self.csv_path)
            
            # Expected columns: timestamp, transponder_id, x, y, altitude, speed
            required_cols = ['timestamp', 'transponder_id', 'x', 'y']
            for col in required_cols:
                if col not in self.data.columns:
                    logger.error(f"Missing required column: {col}")
                    self.data = None
                    return
            
            # Convert timestamp to numeric if needed
            if self.data['timestamp'].dtype == 'object':
                self.data['timestamp'] = pd.to_datetime(self.data['timestamp']).astype(int) / 10**9
            
            self.enabled = True
            logger.info(f"Loaded {len(self.data)} ADS-B records from {self.csv_path}")
            
        except Exception as e:
            logger.error(f"Failed to load ADS-B data: {e}")
            self.data = None
    
    def match_nearest(
        self,
        world_pos: Tuple[float, float],
        timestamp: float,
        max_radius_m: Optional[float] = None,
        max_time_s: Optional[float] = None
    ) -> Optional[Dict]:
        """
        Find nearest ADS-B record matching position and time
        
        Args:
            world_pos: World position (x, y) in meters
            timestamp: Timestamp in seconds
            max_radius_m: Override match radius
            max_time_s: Override time window
            
        Returns:
            Dictionary with ADS-B info or None if no match:
            {
                'transponder_id': str,
                'match_distance_m': float,
                'match_time_diff_s': float,
                'altitude': float (optional),
                'speed': float (optional)
            }
        """
        if not self.enabled or self.data is None:
            return None
        
        max_radius = max_radius_m or self.match_radius_m
        max_time = max_time_s or self.match_time_s
        
        x, y = world_pos
        
        # Filter by time window
        time_mask = np.abs(self.data['timestamp'] - timestamp) <= max_time
        candidates = self.data[time_mask]
        
        if len(candidates) == 0:
            return None
        
        # Compute distances
        distances = np.sqrt(
            (candidates['x'] - x) ** 2 +
            (candidates['y'] - y) ** 2
        )
        
        # Find nearest within radius
        within_radius = distances <= max_radius
        if not within_radius.any():
            return None
        
        idx = distances[within_radius].idxmin()
        match = candidates.loc[idx]
        
        # Build result
        result = {
            'transponder_id': str(match['transponder_id']),
            'match_distance_m': float(distances.loc[idx]),
            'match_time_diff_s': float(abs(match['timestamp'] - timestamp))
        }
        
        # Add optional fields
        if 'altitude' in match:
            result['altitude'] = float(match['altitude'])
        if 'speed' in match:
            result['speed'] = float(match['speed'])
        
        return result
    
    @staticmethod
    def create_sample_csv(output_path: str, num_records: int = 100):
        """
        Create a sample ADS-B CSV file for testing
        
        Args:
            output_path: Output CSV file path
            num_records: Number of records to generate
        """
        # Generate synthetic data
        timestamps = np.linspace(0, 600, num_records)  # 10 minutes
        
        data = {
            'timestamp': timestamps,
            'transponder_id': [f"TEST-{i%5}" for i in range(num_records)],
            'x': np.random.uniform(-1000, 1000, num_records),
            'y': np.random.uniform(-1000, 1000, num_records),
            'altitude': np.random.uniform(1000, 40000, num_records),
            'speed': np.random.uniform(100, 500, num_records)
        }
        
        df = pd.DataFrame(data)
        df.to_csv(output_path, index=False)
        
        logger.info(f"Created sample ADS-B CSV with {num_records} records: {output_path}")


if __name__ == "__main__":
    # Test ADS-B simulator
    
    # Create sample data
    ADSBSimulator.create_sample_csv("adsb_data.csv", 50)
    
    # Load and test matching
    simulator = ADSBSimulator(
        csv_path="adsb_data.csv",
        match_radius_m=100.0,
        match_time_s=5.0
    )
    
    # Try to match a position
    result = simulator.match_nearest(
        world_pos=(100.0, 200.0),
        timestamp=30.0
    )
    
    if result:
        print("ADS-B Match Found:")
        print(f"  Transponder: {result['transponder_id']}")
        print(f"  Distance: {result['match_distance_m']:.1f} m")
        print(f"  Time diff: {result['match_time_diff_s']:.1f} s")
    else:
        print("No ADS-B match found")
