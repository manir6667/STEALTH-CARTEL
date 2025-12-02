"""
Generate sample video with aircraft-like objects for testing detection system
Creates a simple aerial view with moving objects
"""
import cv2
import numpy as np
from pathlib import Path


def create_sample_video(
    output_path: str = "sample_videos/test_aircraft.mp4",
    duration_sec: int = 30,
    fps: int = 25,
    width: int = 1280,
    height: int = 720,
    num_aircraft: int = 5
):
    """
    Generate sample video with moving aircraft-like objects
    
    Args:
        output_path: Output video path
        duration_sec: Video duration in seconds
        fps: Frames per second
        width: Video width
        height: Video height
        num_aircraft: Number of aircraft to simulate
    """
    print(f"Generating sample video: {output_path}")
    print(f"Duration: {duration_sec}s, FPS: {fps}, Resolution: {width}x{height}")
    print(f"Aircraft: {num_aircraft}")
    
    # Create output directory
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    # Video writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    total_frames = duration_sec * fps
    
    # Initialize aircraft positions and velocities
    aircraft = []
    for i in range(num_aircraft):
        # Random starting position
        x = np.random.randint(100, width - 100)
        y = np.random.randint(100, height - 100)
        
        # Random velocity (pixels per frame)
        vx = np.random.uniform(-3, 3)
        vy = np.random.uniform(-3, 3)
        
        # Random size (represents different aircraft types)
        size = np.random.randint(20, 50)
        
        # Random color (different aircraft)
        color = (
            np.random.randint(100, 255),
            np.random.randint(100, 255),
            np.random.randint(100, 255)
        )
        
        aircraft.append({
            'x': x,
            'y': y,
            'vx': vx,
            'vy': vy,
            'size': size,
            'color': color,
            'id': i + 1
        })
    
    print("\nGenerating frames...")
    
    for frame_num in range(total_frames):
        # Create background (sky blue with clouds texture)
        frame = np.ones((height, width, 3), dtype=np.uint8) * 200
        frame[:, :, 0] = 180  # Blue channel
        frame[:, :, 1] = 200  # Green channel
        frame[:, :, 2] = 220  # Red channel
        
        # Add some texture
        noise = np.random.randint(-10, 10, (height, width, 3), dtype=np.int16)
        frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        
        # Update and draw each aircraft
        for ac in aircraft:
            # Update position
            ac['x'] += ac['vx']
            ac['y'] += ac['vy']
            
            # Bounce off edges
            if ac['x'] < 0 or ac['x'] > width:
                ac['vx'] *= -1
                ac['x'] = np.clip(ac['x'], 0, width)
            
            if ac['y'] < 0 or ac['y'] > height:
                ac['vy'] *= -1
                ac['y'] = np.clip(ac['y'], 0, height)
            
            # Draw aircraft (simple airplane shape)
            center = (int(ac['x']), int(ac['y']))
            size = ac['size']
            
            # Main body (ellipse)
            axes = (size, int(size * 0.4))
            cv2.ellipse(frame, center, axes, 0, 0, 360, ac['color'], -1)
            
            # Wings (horizontal line)
            wing_start = (int(ac['x'] - size * 1.2), int(ac['y']))
            wing_end = (int(ac['x'] + size * 1.2), int(ac['y']))
            cv2.line(frame, wing_start, wing_end, ac['color'], int(size * 0.2))
            
            # Add shadow/outline for depth
            cv2.ellipse(frame, center, axes, 0, 0, 360, (0, 0, 0), 2)
            
            # Add ID label
            label_pos = (int(ac['x'] - size), int(ac['y'] - size - 5))
            cv2.putText(frame, f"AC{ac['id']}", label_pos, 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
        
        # Add frame info
        info_text = f"Frame: {frame_num}/{total_frames}"
        cv2.putText(frame, info_text, (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
        
        # Write frame
        out.write(frame)
        
        # Progress indicator
        if frame_num % fps == 0:
            print(f"  {frame_num}/{total_frames} frames ({frame_num/total_frames*100:.1f}%)")
    
    out.release()
    
    print(f"\n✓ Video generated successfully!")
    print(f"  Location: {output_path}")
    print(f"  Duration: {duration_sec}s")
    print(f"  Total frames: {total_frames}")
    print(f"  File size: {Path(output_path).stat().st_size / 1024 / 1024:.2f} MB")


def create_multiple_samples():
    """Create different sample videos for testing"""
    
    print("=" * 60)
    print("Creating Sample Videos for Aircraft Detection")
    print("=" * 60)
    print()
    
    # Sample 1: Short test video
    create_sample_video(
        output_path="sample_videos/short_test.mp4",
        duration_sec=10,
        fps=25,
        num_aircraft=3
    )
    
    print("\n" + "-" * 60 + "\n")
    
    # Sample 2: Standard test video
    create_sample_video(
        output_path="sample_videos/standard_test.mp4",
        duration_sec=30,
        fps=25,
        num_aircraft=5
    )
    
    print("\n" + "-" * 60 + "\n")
    
    # Sample 3: Busy airspace
    create_sample_video(
        output_path="sample_videos/busy_airspace.mp4",
        duration_sec=20,
        fps=25,
        num_aircraft=10
    )
    
    print("\n" + "=" * 60)
    print("All sample videos generated!")
    print("=" * 60)
    print("\nTo test the detection system:")
    print("  1. Update config.yaml with video path:")
    print("     video:")
    print("       input_path: 'sample_videos/standard_test.mp4'")
    print("  2. Run detection: python -m src.main")
    print("  3. View results in outputs/")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate sample aircraft videos")
    parser.add_argument("--output", default="sample_videos/test_aircraft.mp4", help="Output video path")
    parser.add_argument("--duration", type=int, default=30, help="Duration in seconds")
    parser.add_argument("--fps", type=int, default=25, help="Frames per second")
    parser.add_argument("--aircraft", type=int, default=5, help="Number of aircraft")
    parser.add_argument("--all", action="store_true", help="Generate all sample videos")
    
    args = parser.parse_args()
    
    if args.all:
        create_multiple_samples()
    else:
        create_sample_video(
            output_path=args.output,
            duration_sec=args.duration,
            fps=args.fps,
            num_aircraft=args.aircraft
        )
