"""
Utility functions for aircraft detection system
"""
import cv2
import numpy as np
import json
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
from datetime import datetime
import logging


def setup_logging(level: str = "INFO", log_file: Optional[str] = None):
    """
    Setup logging configuration
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR)
        log_file: Optional log file path
    """
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    
    handlers = [logging.StreamHandler()]
    if log_file:
        Path(log_file).parent.mkdir(parents=True, exist_ok=True)
        handlers.append(logging.FileHandler(log_file))
    
    logging.basicConfig(
        level=numeric_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=handlers
    )


def load_json(file_path: str) -> Dict[str, Any]:
    """Load JSON file"""
    with open(file_path, 'r') as f:
        return json.load(f)


def save_json(data: Dict[str, Any], file_path: str):
    """Save JSON file"""
    Path(file_path).parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)


def draw_bbox(
    frame: np.ndarray,
    bbox: Tuple[int, int, int, int],
    label: str = "",
    color: Tuple[int, int, int] = (0, 255, 0),
    thickness: int = 2,
    confidence: float = None
) -> np.ndarray:
    """
    Draw bounding box on frame
    
    Args:
        frame: Input frame
        bbox: Bounding box (x1, y1, x2, y2)
        label: Text label
        color: Box color (B, G, R)
        thickness: Line thickness
        confidence: Optional confidence score
        
    Returns:
        Annotated frame
    """
    x1, y1, x2, y2 = map(int, bbox)
    
    # Draw box
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, thickness)
    
    # Draw label background
    if label or confidence is not None:
        text = label
        if confidence is not None:
            text = f"{label} {confidence:.2f}" if label else f"{confidence:.2f}"
        
        (text_width, text_height), baseline = cv2.getTextSize(
            text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1
        )
        
        cv2.rectangle(
            frame,
            (x1, y1 - text_height - baseline - 5),
            (x1 + text_width, y1),
            color,
            -1
        )
        
        cv2.putText(
            frame,
            text,
            (x1, y1 - baseline - 5),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 255, 255),
            1
        )
    
    return frame


def draw_text(
    frame: np.ndarray,
    text: str,
    position: Tuple[int, int],
    color: Tuple[int, int, int] = (255, 255, 255),
    font_scale: float = 0.6,
    thickness: int = 2,
    background: bool = True
) -> np.ndarray:
    """
    Draw text on frame with optional background
    
    Args:
        frame: Input frame
        text: Text to draw
        position: (x, y) position
        color: Text color
        font_scale: Font scale
        thickness: Text thickness
        background: Draw black background
        
    Returns:
        Annotated frame
    """
    x, y = position
    
    if background:
        (text_width, text_height), baseline = cv2.getTextSize(
            text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness
        )
        
        cv2.rectangle(
            frame,
            (x, y - text_height - baseline - 5),
            (x + text_width, y + baseline),
            (0, 0, 0),
            -1
        )
    
    cv2.putText(
        frame,
        text,
        (x, y),
        cv2.FONT_HERSHEY_SIMPLEX,
        font_scale,
        color,
        thickness
    )
    
    return frame


def get_bbox_center(bbox: Tuple[float, float, float, float]) -> Tuple[float, float]:
    """Get center point of bounding box"""
    x1, y1, x2, y2 = bbox
    return ((x1 + x2) / 2, (y1 + y2) / 2)


def get_bbox_area(bbox: Tuple[float, float, float, float]) -> float:
    """Get area of bounding box"""
    x1, y1, x2, y2 = bbox
    return (x2 - x1) * (y2 - y1)


def crop_bbox(frame: np.ndarray, bbox: Tuple[int, int, int, int]) -> np.ndarray:
    """
    Crop region from frame using bounding box
    
    Args:
        frame: Input frame
        bbox: Bounding box (x1, y1, x2, y2)
        
    Returns:
        Cropped image
    """
    x1, y1, x2, y2 = map(int, bbox)
    h, w = frame.shape[:2]
    
    # Clamp to frame boundaries
    x1 = max(0, x1)
    y1 = max(0, y1)
    x2 = min(w, x2)
    y2 = min(h, y2)
    
    return frame[y1:y2, x1:x2]


def mps_to_knots(speed_mps: float) -> float:
    """Convert meters per second to knots"""
    return speed_mps * 1.94384


def knots_to_mps(speed_kt: float) -> float:
    """Convert knots to meters per second"""
    return speed_kt / 1.94384


def meters_to_feet(meters: float) -> float:
    """Convert meters to feet"""
    return meters * 3.28084


def feet_to_meters(feet: float) -> float:
    """Convert feet to meters"""
    return feet / 3.28084


def get_threat_color(level: str) -> Tuple[int, int, int]:
    """
    Get color for threat level (BGR format)
    
    Args:
        level: Threat level (Low, Medium, High, Critical)
        
    Returns:
        BGR color tuple
    """
    colors = {
        "Low": (0, 255, 0),      # Green
        "Medium": (0, 255, 255),  # Yellow
        "High": (0, 165, 255),    # Orange
        "Critical": (0, 0, 255)   # Red
    }
    return colors.get(level, (255, 255, 255))  # White default


def format_timestamp(dt: Optional[datetime] = None) -> str:
    """
    Format datetime to ISO string
    
    Args:
        dt: Datetime object (uses now if None)
        
    Returns:
        ISO formatted string
    """
    if dt is None:
        dt = datetime.utcnow()
    return dt.isoformat() + 'Z'


def ensure_dir(path: str):
    """Ensure directory exists"""
    Path(path).mkdir(parents=True, exist_ok=True)


class VideoWriter:
    """Context manager for video writing"""
    
    def __init__(self, output_path: str, fps: int, frame_size: Tuple[int, int]):
        """
        Initialize video writer
        
        Args:
            output_path: Output video file path
            fps: Frames per second
            frame_size: (width, height)
        """
        self.output_path = output_path
        self.fps = fps
        self.frame_size = frame_size
        self.writer = None
        
        ensure_dir(str(Path(output_path).parent))
    
    def __enter__(self):
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        self.writer = cv2.VideoWriter(
            self.output_path,
            fourcc,
            self.fps,
            self.frame_size
        )
        return self
    
    def write(self, frame: np.ndarray):
        """Write frame to video"""
        if self.writer is not None:
            self.writer.write(frame)
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.writer is not None:
            self.writer.release()


class VideoReader:
    """Context manager for video reading"""
    
    def __init__(self, video_path: str):
        """
        Initialize video reader
        
        Args:
            video_path: Input video file path
        """
        self.video_path = video_path
        self.cap = None
        self.fps = None
        self.frame_count = None
        self.frame_size = None
    
    def __enter__(self):
        self.cap = cv2.VideoCapture(self.video_path)
        if not self.cap.isOpened():
            raise ValueError(f"Cannot open video: {self.video_path}")
        
        self.fps = int(self.cap.get(cv2.CAP_PROP_FPS))
        self.frame_count = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.frame_size = (width, height)
        
        return self
    
    def read(self) -> Tuple[bool, np.ndarray]:
        """Read next frame"""
        return self.cap.read()
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.cap is not None:
            self.cap.release()
