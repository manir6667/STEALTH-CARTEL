"""
Unit tests for homography calibration and transforms
"""
import pytest
import numpy as np
import cv2
from pathlib import Path
import json

from src.homography_calib import HomographyCalibrator


class TestHomographyCalibrator:
    """Test homography calibration"""
    
    def test_compute_homography_identity(self):
        """Test identity transform (image points == world points)"""
        image_points = np.array([[0, 0], [100, 0], [100, 100], [0, 100]], dtype=np.float32)
        world_points = np.array([[0, 0], [100, 0], [100, 100], [0, 100]], dtype=np.float32)
        
        H = HomographyCalibrator.compute_homography(image_points, world_points)
        
        assert H is not None
        assert H.shape == (3, 3)
        
        # Should be close to identity
        np.testing.assert_array_almost_equal(H / H[2, 2], np.eye(3), decimal=2)
    
    def test_compute_homography_scale(self):
        """Test scaling transform"""
        # Image: 100x100, World: 1000x1000 (10x scale)
        image_points = np.array([[0, 0], [100, 0], [100, 100], [0, 100]], dtype=np.float32)
        world_points = np.array([[0, 0], [1000, 0], [1000, 1000], [0, 1000]], dtype=np.float32)
        
        H = HomographyCalibrator.compute_homography(image_points, world_points)
        
        assert H is not None
        
        # Transform center point
        center_image = (50, 50)
        center_world = HomographyCalibrator.image_to_world(H, center_image[0], center_image[1])
        
        # Should be close to (500, 500)
        np.testing.assert_array_almost_equal(center_world, [500, 500], decimal=0)
    
    def test_compute_homography_insufficient_points(self):
        """Test with insufficient points (< 4)"""
        image_points = np.array([[0, 0], [100, 0], [100, 100]], dtype=np.float32)
        world_points = np.array([[0, 0], [1000, 0], [1000, 1000]], dtype=np.float32)
        
        H = HomographyCalibrator.compute_homography(image_points, world_points)
        
        assert H is None
    
    def test_image_to_world_transform(self):
        """Test image to world coordinate transform"""
        # Simple 2x scale
        image_points = np.array([[0, 0], [100, 0], [100, 100], [0, 100]], dtype=np.float32)
        world_points = np.array([[0, 0], [200, 0], [200, 200], [0, 200]], dtype=np.float32)
        
        H = HomographyCalibrator.compute_homography(image_points, world_points)
        
        # Test multiple points
        test_cases = [
            ((0, 0), (0, 0)),
            ((100, 100), (200, 200)),
            ((50, 50), (100, 100)),
        ]
        
        for image_pt, expected_world in test_cases:
            world_pt = HomographyCalibrator.image_to_world(H, image_pt[0], image_pt[1])
            np.testing.assert_array_almost_equal(world_pt, expected_world, decimal=0)
    
    def test_world_distance(self):
        """Test world distance calculation"""
        pt1 = (0, 0)
        pt2 = (3, 4)  # 3-4-5 right triangle
        
        distance = HomographyCalibrator.world_distance(pt1, pt2)
        
        assert distance == pytest.approx(5.0, rel=1e-3)
    
    def test_save_load_homography(self, tmp_path):
        """Test saving and loading homography matrix"""
        # Create test matrix
        image_points = np.array([[0, 0], [100, 0], [100, 100], [0, 100]], dtype=np.float32)
        world_points = np.array([[0, 0], [200, 0], [200, 200], [0, 200]], dtype=np.float32)
        H_original = HomographyCalibrator.compute_homography(image_points, world_points)
        
        # Save
        save_path = tmp_path / "test_homography.json"
        HomographyCalibrator.save_homography(H_original, str(save_path))
        
        assert save_path.exists()
        
        # Load
        H_loaded = HomographyCalibrator.load_homography(str(save_path))
        
        assert H_loaded is not None
        np.testing.assert_array_almost_equal(H_original, H_loaded, decimal=6)
    
    def test_load_nonexistent_file(self):
        """Test loading from non-existent file"""
        H = HomographyCalibrator.load_homography("nonexistent_file.json")
        
        assert H is None
    
    def test_perspective_transform_corners(self):
        """Test perspective transform with corner points"""
        # Perspective transform (trapezoid -> rectangle)
        image_points = np.array([[50, 0], [150, 0], [200, 100], [0, 100]], dtype=np.float32)
        world_points = np.array([[0, 0], [100, 0], [100, 100], [0, 100]], dtype=np.float32)
        
        H = HomographyCalibrator.compute_homography(image_points, world_points)
        
        assert H is not None
        
        # Transform corners
        for img_pt, world_pt in zip(image_points, world_points):
            transformed = HomographyCalibrator.image_to_world(H, img_pt[0], img_pt[1])
            np.testing.assert_array_almost_equal(transformed, world_pt, decimal=0)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
