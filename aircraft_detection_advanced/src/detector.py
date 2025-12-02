"""
YOLOv8 aircraft detector wrapper
"""
import torch
import numpy as np
from typing import List, Tuple, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class Detector:
    """YOLOv8 object detector for aircraft"""
    
    def __init__(
        self,
        model_path: str = "models/yolov8n.pt",
        conf_threshold: float = 0.35,
        iou_threshold: float = 0.45,
        device: str = "cpu",
        classes: Optional[List[int]] = None
    ):
        """
        Initialize YOLOv8 detector
        
        Args:
            model_path: Path to YOLO model weights
            conf_threshold: Confidence threshold for detections
            iou_threshold: IOU threshold for NMS
            device: Device to run on ('cpu' or 'cuda')
            classes: List of COCO class IDs to detect (None for all)
        """
        self.model_path = model_path
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.device = device
        self.classes = classes  # [4] for airplane in COCO
        
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load YOLO model"""
        try:
            from ultralytics import YOLO
            
            # Auto-download if not exists
            if not Path(self.model_path).exists():
                logger.info(f"Model not found at {self.model_path}, downloading...")
                Path(self.model_path).parent.mkdir(parents=True, exist_ok=True)
                self.model = YOLO('yolov8n.pt')  # This will download
                logger.info("Model downloaded successfully")
            else:
                self.model = YOLO(self.model_path)
            
            # Move to device
            if self.device == "cuda" and torch.cuda.is_available():
                self.model.to('cuda')
                logger.info("Using CUDA for detection")
            else:
                logger.info("Using CPU for detection")
            
            logger.info(f"Loaded YOLO model from {self.model_path}")
            
        except ImportError:
            logger.error("ultralytics not installed. Install with: pip install ultralytics")
            raise
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def predict(
        self,
        frame: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Run detection on frame
        
        Args:
            frame: Input image (BGR format)
            
        Returns:
            Tuple of (bboxes, confidences, class_ids)
            - bboxes: np.array of shape (N, 4) with [x1, y1, x2, y2]
            - confidences: np.array of shape (N,)
            - class_ids: np.array of shape (N,)
        """
        if self.model is None:
            raise RuntimeError("Model not loaded")
        
        # Run inference
        results = self.model.predict(
            frame,
            conf=self.conf_threshold,
            iou=self.iou_threshold,
            classes=self.classes,
            verbose=False
        )[0]
        
        # Extract detections
        boxes = results.boxes
        
        if len(boxes) == 0:
            return np.array([]), np.array([]), np.array([])
        
        # Get bounding boxes in xyxy format
        bboxes = boxes.xyxy.cpu().numpy()  # (N, 4)
        confidences = boxes.conf.cpu().numpy()  # (N,)
        class_ids = boxes.cls.cpu().numpy().astype(int)  # (N,)
        
        return bboxes, confidences, class_ids
    
    def detect_batch(
        self,
        frames: List[np.ndarray]
    ) -> List[Tuple[np.ndarray, np.ndarray, np.ndarray]]:
        """
        Run detection on multiple frames (batch processing)
        
        Args:
            frames: List of input frames
            
        Returns:
            List of detection tuples for each frame
        """
        results = self.model.predict(
            frames,
            conf=self.conf_threshold,
            iou=self.iou_threshold,
            classes=self.classes,
            verbose=False
        )
        
        detections = []
        for result in results:
            boxes = result.boxes
            
            if len(boxes) == 0:
                detections.append((np.array([]), np.array([]), np.array([])))
            else:
                bboxes = boxes.xyxy.cpu().numpy()
                confidences = boxes.conf.cpu().numpy()
                class_ids = boxes.cls.cpu().numpy().astype(int)
                detections.append((bboxes, confidences, class_ids))
        
        return detections
    
    @staticmethod
    def get_class_name(class_id: int) -> str:
        """
        Get COCO class name from ID
        
        Args:
            class_id: COCO class ID
            
        Returns:
            Class name string
        """
        # COCO class names (partial - only relevant ones)
        coco_names = {
            4: "airplane",
            # Add more if needed
        }
        return coco_names.get(class_id, f"class_{class_id}")


if __name__ == "__main__":
    # Test detector
    import cv2
    
    detector = Detector(
        model_path="models/yolov8n.pt",
        conf_threshold=0.35,
        device="cpu",
        classes=[4]  # airplane only
    )
    
    # Create dummy frame
    frame = np.zeros((640, 640, 3), dtype=np.uint8)
    
    bboxes, confs, class_ids = detector.predict(frame)
    print(f"Detections: {len(bboxes)}")
    print(f"Bboxes shape: {bboxes.shape}")
    print(f"Confidences shape: {confs.shape}")
