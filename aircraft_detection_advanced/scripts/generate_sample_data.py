"""
Generate sample ADS-B data for testing
Creates CSV file with simulated transponder readings
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta


def generate_sample_adsb(
    output_path: str = "sample_data/adsb_data.csv",
    num_aircraft: int = 10,
    duration_seconds: int = 300,
    update_rate_hz: float = 1.0
):
    """
    Generate simulated ADS-B transponder data
    
    Args:
        output_path: Output CSV path
        num_aircraft: Number of aircraft to simulate
        duration_seconds: Simulation duration
        update_rate_hz: Update frequency (Hz)
    """
    print(f"Generating ADS-B data for {num_aircraft} aircraft over {duration_seconds}s")
    
    records = []
    start_time = datetime.now()
    
    # Aircraft patterns
    patterns = [
        "circling",
        "linear",
        "approach",
        "departure",
        "hovering"
    ]
    
    for aircraft_id in range(num_aircraft):
        transponder_id = f"AC{aircraft_id:04d}"
        pattern = np.random.choice(patterns)
        
        # Random initial position (world coordinates in meters)
        start_x = np.random.uniform(-5000, 5000)
        start_y = np.random.uniform(-5000, 5000)
        
        # Random altitude and speed
        altitude_ft = np.random.randint(500, 30000)
        base_speed_kt = np.random.randint(150, 500)
        
        # Generate trajectory based on pattern
        num_updates = int(duration_seconds * update_rate_hz)
        
        for i in range(num_updates):
            timestamp = start_time + timedelta(seconds=i / update_rate_hz)
            t = i / update_rate_hz
            
            if pattern == "circling":
                # Circular pattern
                radius = 1000
                angular_speed = 0.1  # rad/s
                x = start_x + radius * np.cos(angular_speed * t)
                y = start_y + radius * np.sin(angular_speed * t)
                speed_kt = base_speed_kt
                
            elif pattern == "linear":
                # Straight line
                velocity_x = np.random.uniform(-50, 50)
                velocity_y = np.random.uniform(-50, 50)
                x = start_x + velocity_x * t
                y = start_y + velocity_y * t
                speed_kt = base_speed_kt + np.random.uniform(-20, 20)
                
            elif pattern == "approach":
                # Landing approach (descending)
                x = start_x - 30 * t  # Approaching
                y = start_y
                altitude_ft = max(0, altitude_ft - 50 * t)
                speed_kt = max(100, base_speed_kt - 5 * t)
                
            elif pattern == "departure":
                # Takeoff (ascending)
                x = start_x + 40 * t
                y = start_y
                altitude_ft = min(30000, altitude_ft + 100 * t)
                speed_kt = min(500, base_speed_kt + 10 * t)
                
            else:  # hovering (drone)
                # Slight drift
                x = start_x + np.random.normal(0, 10)
                y = start_y + np.random.normal(0, 10)
                altitude_ft = min(500, altitude_ft)
                speed_kt = np.random.uniform(0, 30)
            
            # Add noise
            x += np.random.normal(0, 5)
            y += np.random.normal(0, 5)
            
            records.append({
                'timestamp': timestamp.isoformat(),
                'transponder_id': transponder_id,
                'x': round(x, 2),
                'y': round(y, 2),
                'altitude': int(altitude_ft),
                'speed': int(speed_kt),
                'heading': int(np.random.uniform(0, 360)),
                'pattern': pattern
            })
    
    # Create DataFrame
    df = pd.DataFrame(records)
    
    # Sort by timestamp
    df = df.sort_values('timestamp')
    
    # Save to CSV
    from pathlib import Path
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    
    print(f"✓ Generated {len(records)} ADS-B records")
    print(f"✓ Saved to {output_path}")
    print(f"\nAircraft breakdown:")
    for pattern in patterns:
        count = len(df[df['pattern'] == pattern]['transponder_id'].unique())
        print(f"  {pattern}: {count} aircraft")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate sample ADS-B data")
    parser.add_argument("--output", default="sample_data/adsb_data.csv", help="Output CSV path")
    parser.add_argument("--aircraft", type=int, default=10, help="Number of aircraft")
    parser.add_argument("--duration", type=int, default=300, help="Duration in seconds")
    parser.add_argument("--rate", type=float, default=1.0, help="Update rate (Hz)")
    
    args = parser.parse_args()
    
    generate_sample_adsb(
        output_path=args.output,
        num_aircraft=args.aircraft,
        duration_seconds=args.duration,
        update_rate_hz=args.rate
    )
