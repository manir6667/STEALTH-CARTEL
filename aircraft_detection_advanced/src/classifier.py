"""
Aircraft type classifier using EfficientNet
"""
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
import numpy as np
from typing import Tuple, Optional
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class AircraftClassifier:
    """Aircraft type classification using EfficientNet backbone"""
    
    # Class labels
    CLASSES = [
        "fighter",      # 0
        "airliner",     # 1
        "private_jet",  # 2
        "propeller",    # 3
        "drone",        # 4
        "unknown"       # 5
    ]
    
    def __init__(
        self,
        model_name: str = "efficientnet_b0",
        num_classes: int = 6,
        checkpoint_path: Optional[str] = None,
        device: str = "cpu",
        use_classifier: bool = True
    ):
        """
        Initialize aircraft classifier
        
        Args:
            model_name: Model architecture (from timm)
            num_classes: Number of output classes
            checkpoint_path: Path to trained weights (None for heuristic fallback)
            device: Device to run on ('cpu' or 'cuda')
            use_classifier: Whether to use classifier (False for heuristic only)
        """
        self.model_name = model_name
        self.num_classes = num_classes
        self.checkpoint_path = checkpoint_path
        self.device = device
        self.use_classifier = use_classifier
        
        self.model = None
        self.transform = None
        
        if self.use_classifier:
            self._load_model()
            self._setup_transform()
        else:
            logger.info("Classifier disabled, using heuristic classification")
    
    def _load_model(self):
        """Load EfficientNet model"""
        try:
            import timm
            
            # Load pretrained backbone
            self.model = timm.create_model(
                self.model_name,
                pretrained=True,
                num_classes=self.num_classes
            )
            
            # Load checkpoint if available
            if self.checkpoint_path and Path(self.checkpoint_path).exists():
                try:
                    state_dict = torch.load(
                        self.checkpoint_path,
                        map_location=self.device
                    )
                    self.model.load_state_dict(state_dict)
                    logger.info(f"Loaded classifier weights from {self.checkpoint_path}")
                except Exception as e:
                    logger.warning(f"Failed to load checkpoint: {e}. Using pretrained weights.")
            else:
                logger.info("No checkpoint found, using pretrained ImageNet weights")
            
            self.model = self.model.to(self.device)
            self.model.eval()
            
            logger.info(f"Loaded {self.model_name} classifier")
            
        except ImportError:
            logger.error("timm not installed. Install with: pip install timm")
            self.use_classifier = False
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.use_classifier = False
    
    def _setup_transform(self):
        """Setup image preprocessing transforms"""
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])
    
    def classify(
        self,
        crop: np.ndarray,
        bbox: Optional[Tuple[float, float, float, float]] = None
    ) -> Tuple[str, float]:
        """
        Classify aircraft type from image crop
        
        Args:
            crop: Image crop (BGR format)
            bbox: Optional bounding box for heuristic fallback
            
        Returns:
            Tuple of (class_label, confidence)
        """
        if not self.use_classifier or self.model is None:
            return self._classify_heuristic(crop, bbox)
        
        try:
            # Convert BGR to RGB
            crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(crop_rgb)
            
            # Preprocess
            input_tensor = self.transform(pil_image).unsqueeze(0).to(self.device)
            
            # Inference
            with torch.no_grad():
                outputs = self.model(input_tensor)
                probabilities = torch.softmax(outputs, dim=1)
                confidence, predicted_class = torch.max(probabilities, 1)
            
            class_label = self.CLASSES[predicted_class.item()]
            conf_value = confidence.item()
            
            return class_label, conf_value
            
        except Exception as e:
            logger.error(f"Classification failed: {e}")
            return self._classify_heuristic(crop, bbox)
    
    def _classify_heuristic(
        self,
        crop: np.ndarray,
        bbox: Optional[Tuple[float, float, float, float]] = None
    ) -> Tuple[str, float]:
        """
        Heuristic classification based on aspect ratio and size
        
        Args:
            crop: Image crop
            bbox: Bounding box [x1, y1, x2, y2]
            
        Returns:
            Tuple of (class_label, confidence)
        """
        h, w = crop.shape[:2]
        
        if h == 0 or w == 0:
            return "unknown", 0.5
        
        aspect_ratio = w / h
        area = w * h
        
        # Heuristic rules (very simplified)
        if area < 1000:
            # Very small - likely drone
            return "drone", 0.6
        elif aspect_ratio > 3.0:
            # Very wide - likely airliner
            return "airliner", 0.65
        elif aspect_ratio > 2.0:
            # Wide - could be fighter or airliner
            return "fighter" if area < 5000 else "airliner", 0.6
        elif aspect_ratio > 1.5:
            # Medium aspect - private jet or propeller
            return "private_jet" if area > 3000 else "propeller", 0.6
        else:
            # Compact - unknown
            return "unknown", 0.5
    
    def classify_batch(
        self,
        crops: list
    ) -> list:
        """
        Classify multiple crops in batch
        
        Args:
            crops: List of image crops
            
        Returns:
            List of (class_label, confidence) tuples
        """
        if not self.use_classifier or self.model is None:
            return [self._classify_heuristic(crop, None) for crop in crops]
        
        # Batch preprocessing
        batch_tensors = []
        for crop in crops:
            try:
                crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(crop_rgb)
                tensor = self.transform(pil_image)
                batch_tensors.append(tensor)
            except Exception as e:
                logger.error(f"Crop preprocessing failed: {e}")
                continue
        
        if not batch_tensors:
            return [("unknown", 0.5)] * len(crops)
        
        # Stack into batch
        batch = torch.stack(batch_tensors).to(self.device)
        
        # Batch inference
        with torch.no_grad():
            outputs = self.model(batch)
            probabilities = torch.softmax(outputs, dim=1)
            confidences, predicted_classes = torch.max(probabilities, 1)
        
        # Convert to results
        results = []
        for conf, cls_idx in zip(confidences, predicted_classes):
            class_label = self.CLASSES[cls_idx.item()]
            conf_value = conf.item()
            results.append((class_label, conf_value))
        
        return results


# Import cv2 for color conversion
import cv2


if __name__ == "__main__":
    # Test classifier
    classifier = AircraftClassifier(use_classifier=False)  # Heuristic mode
    
    # Dummy crop
    crop = np.zeros((100, 300, 3), dtype=np.uint8)  # Wide aspect ratio
    
    label, confidence = classifier.classify(crop)
    print(f"Classification: {label} ({confidence:.2f})")
