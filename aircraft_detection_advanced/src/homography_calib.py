"""
Homography calibration tool for image-to-world coordinate mapping
"""
import cv2
import numpy as np
import json
from pathlib import Path
from typing import List, Tuple, Optional
import logging
import argparse

logger = logging.getLogger(__name__)


class HomographyCalibrator:
    """Interactive homography calibration tool"""
    
    def __init__(self):
        self.image_points = []
        self.world_points = []
        self.image = None
        self.window_name = "Homography Calibration - Click 4 Points"
    
    def mouse_callback(self, event, x, y, flags, param):
        """Mouse click callback for point selection"""
        if event == cv2.EVENT_LBUTTONDOWN and len(self.image_points) < 4:
            self.image_points.append([x, y])
            
            # Draw point
            cv2.circle(self.image, (x, y), 5, (0, 0, 255), -1)
            cv2.putText(
                self.image,
                f"P{len(self.image_points)}",
                (x + 10, y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 0, 255),
                2
            )
            cv2.imshow(self.window_name, self.image)
            
            logger.info(f"Selected point {len(self.image_points)}: ({x}, {y})")
    
    def calibrate_interactive(self, image_path: str) -> Optional[np.ndarray]:
        """
        Interactive calibration - user clicks 4 points
        
        Args:
            image_path: Path to calibration image
            
        Returns:
            3x3 homography matrix or None if cancelled
        """
        # Load image
        self.image = cv2.imread(image_path)
        if self.image is None:
            logger.error(f"Cannot load image: {image_path}")
            return None
        
        display_image = self.image.copy()
        cv2.imshow(self.window_name, display_image)
        cv2.setMouseCallback(self.window_name, self.mouse_callback)
        
        print("\nHomography Calibration")
        print("=" * 50)
        print("Click 4 points in the image in this order:")
        print("1. Top-left corner")
        print("2. Top-right corner")
        print("3. Bottom-right corner")
        print("4. Bottom-left corner")
        print("\nPress 'q' to quit without saving")
        print("=" * 50)
        
        while len(self.image_points) < 4:
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                cv2.destroyAllWindows()
                return None
        
        # Get world coordinates from user
        print("\nImage points selected:")
        for i, pt in enumerate(self.image_points, 1):
            print(f"  P{i}: {pt}")
        
        print("\nEnter corresponding world coordinates (in meters):")
        for i in range(4):
            while True:
                try:
                    x = float(input(f"  P{i+1} - X coordinate (m): "))
                    y = float(input(f"  P{i+1} - Y coordinate (m): "))
                    self.world_points.append([x, y])
                    break
                except ValueError:
                    print("  Invalid input. Please enter numbers.")
        
        # Compute homography
        H = self.compute_homography()
        
        cv2.destroyAllWindows()
        return H
    
    def compute_homography(self) -> Optional[np.ndarray]:
        """
        Compute homography matrix from point correspondences
        
        Returns:
            3x3 homography matrix
        """
        if len(self.image_points) < 4 or len(self.world_points) < 4:
            logger.error("Need at least 4 point correspondences")
            return None
        
        src_pts = np.array(self.image_points, dtype=np.float32)
        dst_pts = np.array(self.world_points, dtype=np.float32)
        
        H, status = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
        
        if H is not None:
            logger.info("Homography computed successfully")
            logger.info(f"Matrix:\n{H}")
        else:
            logger.error("Failed to compute homography")
        
        return H
    
    @staticmethod
    def save_homography(H: np.ndarray, file_path: str):
        """
        Save homography matrix to JSON file
        
        Args:
            H: 3x3 homography matrix
            file_path: Output file path
        """
        data = {
            "homography_matrix": H.tolist(),
            "shape": list(H.shape)
        }
        
        Path(file_path).parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        logger.info(f"Saved homography to {file_path}")
    
    @staticmethod
    def load_homography(file_path: str) -> Optional[np.ndarray]:
        """
        Load homography matrix from JSON file
        
        Args:
            file_path: Input file path
            
        Returns:
            3x3 homography matrix or None if not found
        """
        if not Path(file_path).exists():
            logger.warning(f"Homography file not found: {file_path}")
            return None
        
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            H = np.array(data["homography_matrix"], dtype=np.float64)
            logger.info(f"Loaded homography from {file_path}")
            return H
            
        except Exception as e:
            logger.error(f"Failed to load homography: {e}")
            return None


def image_to_world(H: np.ndarray, u: float, v: float) -> Tuple[float, float]:
    """
    Transform image coordinates to world coordinates
    
    Args:
        H: 3x3 homography matrix
        u: Image x coordinate (pixels)
        v: Image y coordinate (pixels)
        
    Returns:
        (x, y) world coordinates in meters
    """
    # Convert to homogeneous coordinates
    img_pt = np.array([u, v, 1.0])
    
    # Apply homography
    world_pt_h = H @ img_pt
    
    # Convert back from homogeneous
    x = world_pt_h[0] / world_pt_h[2]
    y = world_pt_h[1] / world_pt_h[2]
    
    return x, y


def world_distance(pt1: Tuple[float, float], pt2: Tuple[float, float]) -> float:
    """
    Calculate Euclidean distance between two world points
    
    Args:
        pt1: First point (x, y) in meters
        pt2: Second point (x, y) in meters
        
    Returns:
        Distance in meters
    """
    dx = pt2[0] - pt1[0]
    dy = pt2[1] - pt1[1]
    return np.sqrt(dx**2 + dy**2)


def main():
    """CLI entry point for homography calibration"""
    parser = argparse.ArgumentParser(description="Homography Calibration Tool")
    parser.add_argument("--image", required=True, help="Path to calibration image")
    parser.add_argument("--output", default="homography.json", help="Output file path")
    args = parser.parse_args()
    
    calibrator = HomographyCalibrator()
    H = calibrator.calibrate_interactive(args.image)
    
    if H is not None:
        HomographyCalibrator.save_homography(H, args.output)
        print(f"\n✓ Homography saved to {args.output}")
    else:
        print("\n✗ Calibration cancelled or failed")


if __name__ == "__main__":
    main()
