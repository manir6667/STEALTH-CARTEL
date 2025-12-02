"""
Unit tests for speed estimation
"""
import pytest
import numpy as np

from src.speed_estimator import SpeedEstimator
from src.homography_calib import HomographyCalibrator


class TestSpeedEstimator:
    """Test speed estimation"""
    
    @pytest.fixture
    def identity_homography(self):
        """Identity homography (pixel == meter)"""
        image_points = np.array([[0, 0], [100, 0], [100, 100], [0, 100]], dtype=np.float32)
        world_points = np.array([[0, 0], [100, 0], [100, 100], [0, 100]], dtype=np.float32)
        return HomographyCalibrator.compute_homography(image_points, world_points)
    
    @pytest.fixture
    def scale_homography(self):
        """10x scale homography (100 pixels == 1000 meters)"""
        image_points = np.array([[0, 0], [100, 0], [100, 100], [0, 100]], dtype=np.float32)
        world_points = np.array([[0, 0], [1000, 0], [1000, 1000], [0, 1000]], dtype=np.float32)
        return HomographyCalibrator.compute_homography(image_points, world_points)
    
    def test_initialization_with_homography(self, identity_homography):
        """Test initialization with homography matrix"""
        estimator = SpeedEstimator(homography_matrix=identity_homography, fps=25.0)
        
        assert estimator.homography_matrix is not None
        assert estimator.fps == 25.0
        assert estimator.frame_time == pytest.approx(0.04, rel=1e-3)
    
    def test_initialization_fallback(self):
        """Test initialization in fallback mode"""
        estimator = SpeedEstimator(homography_matrix=None, fps=30.0)
        
        assert estimator.homography_matrix is None
        assert estimator.fps == 30.0
    
    def test_mps_to_knots_conversion(self):
        """Test meters per second to knots conversion"""
        # 1 m/s ≈ 1.944 knots
        assert SpeedEstimator.mps_to_knots(1.0) == pytest.approx(1.944, rel=1e-2)
        assert SpeedEstimator.mps_to_knots(0.0) == 0.0
        assert SpeedEstimator.mps_to_knots(100.0) == pytest.approx(194.4, rel=1e-2)
    
    def test_estimate_speed_single_detection(self, identity_homography):
        """Test speed estimation with single detection (no speed yet)"""
        estimator = SpeedEstimator(homography_matrix=identity_homography, fps=25.0)
        
        result = estimator.estimate_speed(
            track_id=1,
            centroid=(100, 100),
            bbox=(90, 90, 110, 110),
            frame_number=0
        )
        
        # First detection: no speed
        assert result is None
    
    def test_estimate_speed_horizontal_motion(self, identity_homography):
        """Test speed estimation for horizontal motion"""
        estimator = SpeedEstimator(homography_matrix=identity_homography, fps=25.0)
        
        # First detection
        estimator.estimate_speed(1, (0, 100), (0, 90, 10, 110), 0)
        
        # Second detection: moved 100 pixels (meters) right in 1 frame
        result = estimator.estimate_speed(1, (100, 100), (90, 90, 110, 110), 1)
        
        assert result is not None
        speed_mps, speed_kt, world_pos = result
        
        # 100 m in 0.04s = 2500 m/s
        assert speed_mps == pytest.approx(2500.0, rel=1e-2)
        assert speed_kt == pytest.approx(2500.0 * 1.944, rel=1e-2)
        assert world_pos == pytest.approx((100, 100), rel=1e-1)
    
    def test_estimate_speed_scaled_motion(self, scale_homography):
        """Test speed estimation with scaled coordinates"""
        # 10x scale: 100 pixels = 1000 meters
        estimator = SpeedEstimator(homography_matrix=scale_homography, fps=25.0)
        
        # First detection
        estimator.estimate_speed(1, (0, 50), (0, 40, 10, 60), 0)
        
        # Second detection: moved 10 pixels (100 meters) in 1 frame
        result = estimator.estimate_speed(1, (10, 50), (5, 40, 15, 60), 1)
        
        assert result is not None
        speed_mps, speed_kt, world_pos = result
        
        # 100 m in 0.04s = 2500 m/s
        assert speed_mps == pytest.approx(2500.0, rel=1e-1)
    
    def test_estimate_speed_diagonal_motion(self, identity_homography):
        """Test speed estimation for diagonal motion (3-4-5 triangle)"""
        estimator = SpeedEstimator(homography_matrix=identity_homography, fps=25.0)
        
        # Move 3 right, 4 up = 5 meters total
        estimator.estimate_speed(1, (0, 0), (0, 0, 10, 10), 0)
        result = estimator.estimate_speed(1, (3, 4), (0, 0, 10, 10), 1)
        
        assert result is not None
        speed_mps, speed_kt, world_pos = result
        
        # 5 m in 0.04s = 125 m/s
        assert speed_mps == pytest.approx(125.0, rel=1e-1)
    
    def test_estimate_speed_stationary(self, identity_homography):
        """Test speed estimation for stationary object"""
        estimator = SpeedEstimator(homography_matrix=identity_homography, fps=25.0)
        
        # Same position
        estimator.estimate_speed(1, (100, 100), (90, 90, 110, 110), 0)
        result = estimator.estimate_speed(1, (100, 100), (90, 90, 110, 110), 1)
        
        assert result is not None
        speed_mps, speed_kt, world_pos = result
        
        assert speed_mps == pytest.approx(0.0, abs=0.1)
        assert speed_kt == pytest.approx(0.0, abs=0.1)
    
    def test_estimate_speed_multiple_tracks(self, identity_homography):
        """Test speed estimation with multiple concurrent tracks"""
        estimator = SpeedEstimator(homography_matrix=identity_homography, fps=25.0)
        
        # Track 1
        estimator.estimate_speed(1, (0, 0), (0, 0, 10, 10), 0)
        result1 = estimator.estimate_speed(1, (100, 0), (95, 0, 105, 10), 1)
        
        # Track 2
        estimator.estimate_speed(2, (0, 100), (0, 95, 10, 105), 0)
        result2 = estimator.estimate_speed(2, (0, 200), (0, 195, 10, 205), 1)
        
        assert result1 is not None
        assert result2 is not None
        
        # Track 1: horizontal 100 m/s
        assert result1[0] == pytest.approx(2500.0, rel=1e-1)
        
        # Track 2: vertical 100 m/s
        assert result2[0] == pytest.approx(2500.0, rel=1e-1)
    
    def test_fallback_mode_estimation(self):
        """Test speed estimation in fallback mode (pinhole camera)"""
        estimator = SpeedEstimator(
            homography_matrix=None,
            fps=25.0,
            fallback_object_width_m=28.0,
            fallback_altitude_m=1000.0,
            camera_focal_length_px=1000.0
        )
        
        # First detection: bbox width 100px
        estimator.estimate_speed(1, (500, 500), (450, 450, 550, 550), 0)
        
        # Second detection: moved 50px right, same size
        result = estimator.estimate_speed(1, (550, 500), (500, 450, 600, 550), 1)
        
        assert result is not None
        speed_mps, speed_kt, world_pos = result
        
        # Should estimate some non-zero speed
        assert speed_mps > 0
    
    def test_track_history_smoothing(self, identity_homography):
        """Test that speed is smoothed over track history"""
        estimator = SpeedEstimator(homography_matrix=identity_homography, fps=25.0)
        
        # Create track with varying speeds
        positions = [(0, 0), (100, 0), (150, 0), (200, 0)]
        
        for i, pos in enumerate(positions):
            estimator.estimate_speed(1, pos, (pos[0]-5, pos[1]-5, pos[0]+5, pos[1]+5), i)
        
        # Should have track history
        assert 1 in estimator.track_history
        assert len(estimator.track_history[1]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
