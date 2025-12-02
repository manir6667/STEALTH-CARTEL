"""
Speed estimation from tracking and homography
"""
import numpy as np
from typing import Tuple, Optional, List, Dict
import logging
from src.homography_calib import image_to_world, world_distance

logger = logging.getLogger(__name__)


class SpeedEstimator:
    """Aircraft speed estimation using homography or fallback methods"""
    
    def __init__(
        self,
        homography_matrix: Optional[np.ndarray] = None,
        fps: float = 25.0,
        fallback_object_width_m: float = 28.0,
        fallback_altitude_m: float = 1000.0,
        camera_focal_length_px: float = 1000.0
    ):
        """
        Initialize speed estimator
        
        Args:
            homography_matrix: 3x3 homography for image→world transform
            fps: Video frames per second
            fallback_object_width_m: Known object width for pinhole fallback (meters)
            fallback_altitude_m: Assumed altitude for monocular estimation (meters)
            camera_focal_length_px: Camera focal length in pixels
        """
        self.H = homography_matrix
        self.fps = fps
        self.frame_time = 1.0 / fps if fps > 0 else 1.0
        
        # Fallback parameters
        self.fallback_width = fallback_object_width_m
        self.fallback_altitude = fallback_altitude_m
        self.focal_length = camera_focal_length_px
        
        # Track history: {id: [(timestamp, world_pos), ...]}
        self.track_history = {}
        
        self.use_homography = homography_matrix is not None
        
        if self.use_homography:
            logger.info("Speed estimator using homography-based method")
        else:
            logger.info("Speed estimator using fallback pinhole model")
    
    def estimate_speed(
        self,
        track_id: int,
        centroid: Tuple[float, float],
        bbox: Tuple[float, float, float, float],
        frame_number: int
    ) -> Optional[Tuple[float, float, Tuple[float, float]]]:
        """
        Estimate speed for a tracked object
        
        Args:
            track_id: Unique track ID
            centroid: Image centroid (cx, cy) in pixels
            bbox: Bounding box [x1, y1, x2, y2] for fallback method
            frame_number: Current frame number
            
        Returns:
            Tuple of (speed_mps, speed_kt, world_pos) or None if insufficient data
            - speed_mps: Speed in meters per second
            - speed_kt: Speed in knots
            - world_pos: Current world position (x, y) in meters
        """
        timestamp = frame_number * self.frame_time
        
        # Transform to world coordinates
        if self.use_homography:
            world_pos = self._transform_with_homography(centroid)
        else:
            world_pos = self._transform_with_fallback(centroid, bbox)
        
        if world_pos is None:
            return None
        
        # Initialize track history
        if track_id not in self.track_history:
            self.track_history[track_id] = []
        
        # Add current position
        self.track_history[track_id].append((timestamp, world_pos))
        
        # Keep last N positions (for smoothing)
        max_history = 10
        if len(self.track_history[track_id]) > max_history:
            self.track_history[track_id] = self.track_history[track_id][-max_history:]
        
        # Need at least 2 positions to compute speed
        if len(self.track_history[track_id]) < 2:
            return 0.0, 0.0, world_pos
        
        # Compute speed from recent positions
        speed_mps = self._compute_speed_from_history(track_id)
        speed_kt = self._mps_to_knots(speed_mps)
        
        return speed_mps, speed_kt, world_pos
    
    def _transform_with_homography(
        self,
        centroid: Tuple[float, float]
    ) -> Optional[Tuple[float, float]]:
        """Transform image point to world coordinates using homography"""
        if self.H is None:
            return None
        
        try:
            world_pos = image_to_world(self.H, centroid[0], centroid[1])
            return world_pos
        except Exception as e:
            logger.error(f"Homography transform failed: {e}")
            return None
    
    def _transform_with_fallback(
        self,
        centroid: Tuple[float, float],
        bbox: Tuple[float, float, float, float]
    ) -> Optional[Tuple[float, float]]:
        """
        Fallback method using pinhole camera model
        
        Assumes:
        - Known aircraft wingspan (fallback_width)
        - Constant altitude (fallback_altitude)
        - Simple perspective projection
        
        Returns approximate ground plane position
        """
        # Get object width in pixels
        x1, y1, x2, y2 = bbox
        bbox_width_px = x2 - x1
        
        if bbox_width_px <= 0:
            return None
        
        # Estimate distance using pinhole model
        # distance = (real_width * focal_length) / pixel_width
        distance = (self.fallback_width * self.focal_length) / bbox_width_px
        
        # Assume camera center is at (0, 0) in image coordinates
        # Convert centroid to camera coordinates (simple approximation)
        cx, cy = centroid
        
        # Simple planar approximation: world x,y proportional to image displacement
        # This is very rough but works for demo without camera calibration
        scale = distance / self.focal_length
        world_x = cx * scale
        world_y = cy * scale
        
        return (world_x, world_y)
    
    def _compute_speed_from_history(self, track_id: int) -> float:
        """
        Compute speed from track history using linear regression or last two points
        
        Args:
            track_id: Track ID
            
        Returns:
            Speed in m/s
        """
        history = self.track_history[track_id]
        
        if len(history) < 2:
            return 0.0
        
        # Use last two positions for instantaneous speed
        (t1, pos1) = history[-2]
        (t2, pos2) = history[-1]
        
        dt = t2 - t1
        if dt <= 0:
            return 0.0
        
        distance = world_distance(pos1, pos2)
        speed = distance / dt
        
        return speed
    
    @staticmethod
    def _mps_to_knots(speed_mps: float) -> float:
        """Convert meters per second to knots"""
        return speed_mps * 1.94384
    
    def reset_track(self, track_id: int):
        """Clear history for a specific track"""
        if track_id in self.track_history:
            del self.track_history[track_id]
    
    def reset_all(self):
        """Clear all track histories"""
        self.track_history.clear()


if __name__ == "__main__":
    # Test speed estimator
    estimator = SpeedEstimator(fps=25.0)
    
    # Simulate track moving 10 pixels per frame
    track_id = 1
    for frame in range(100):
        centroid = (100 + frame * 10, 200)
        bbox = (centroid[0] - 20, centroid[1] - 10, centroid[0] + 20, centroid[1] + 10)
        
        result = estimator.estimate_speed(track_id, centroid, bbox, frame)
        if result:
            speed_mps, speed_kt, world_pos = result
            if frame % 10 == 0:
                print(f"Frame {frame}: {speed_kt:.1f} kt, pos={world_pos}")
