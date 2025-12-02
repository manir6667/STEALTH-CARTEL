"""
Multi-object tracker wrapper (ByteTrack / Norfair)
"""
import numpy as np
from typing import List, Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class Tracker:
    """Multi-object tracker wrapper"""
    
    def __init__(
        self,
        method: str = "bytetrack",
        max_distance: float = 100.0,
        track_buffer: int = 30,
        match_threshold: float = 0.8
    ):
        """
        Initialize tracker
        
        Args:
            method: Tracking method ('bytetrack' or 'norfair')
            max_distance: Maximum distance for matching
            track_buffer: Number of frames to keep lost tracks
            match_threshold: Matching confidence threshold
        """
        self.method = method.lower()
        self.max_distance = max_distance
        self.track_buffer = track_buffer
        self.match_threshold = match_threshold
        
        self.tracker = None
        self._init_tracker()
    
    def _init_tracker(self):
        """Initialize the selected tracker"""
        if self.method == "bytetrack":
            self._init_bytetrack()
        elif self.method == "norfair":
            self._init_norfair()
        else:
            raise ValueError(f"Unknown tracker method: {self.method}")
    
    def _init_bytetrack(self):
        """Initialize ByteTrack via supervision library"""
        try:
            from supervision import ByteTrack as SupervisionByteTrack
            
            self.tracker = SupervisionByteTrack(
                lost_track_buffer=self.track_buffer,
                track_activation_threshold=self.match_threshold,
                minimum_matching_threshold=self.match_threshold
            )
            logger.info("Initialized ByteTrack tracker (via supervision)")
            
        except ImportError:
            logger.error("supervision library not installed. Install with: pip install supervision")
            raise
    
    def _init_norfair(self):
        """Initialize Norfair tracker"""
        try:
            from norfair import Tracker as NorfairTracker
            from norfair.distances import mean_euclidean
            
            self.tracker = NorfairTracker(
                distance_function=mean_euclidean,
                distance_threshold=self.max_distance,
                hit_counter_max=self.track_buffer
            )
            logger.info("Initialized Norfair tracker")
            
        except ImportError:
            logger.error("norfair library not installed. Install with: pip install norfair")
            raise
    
    def update(
        self,
        detections: Tuple[np.ndarray, np.ndarray, np.ndarray]
    ) -> List[Dict]:
        """
        Update tracker with new detections
        
        Args:
            detections: Tuple of (bboxes, confidences, class_ids)
                - bboxes: np.array of shape (N, 4) [x1, y1, x2, y2]
                - confidences: np.array of shape (N,)
                - class_ids: np.array of shape (N,)
        
        Returns:
            List of tracked objects with format:
            [
                {
                    'id': int,
                    'bbox': [x1, y1, x2, y2],
                    'confidence': float,
                    'class_id': int,
                    'centroid': [cx, cy]
                },
                ...
            ]
        """
        if self.method == "bytetrack":
            return self._update_bytetrack(detections)
        elif self.method == "norfair":
            return self._update_norfair(detections)
    
    def _update_bytetrack(
        self,
        detections: Tuple[np.ndarray, np.ndarray, np.ndarray]
    ) -> List[Dict]:
        """Update ByteTrack"""
        from supervision import Detections as SupervisionDetections
        
        bboxes, confidences, class_ids = detections
        
        if len(bboxes) == 0:
            # Update with empty detections to age out tracks
            empty_dets = SupervisionDetections.empty()
            self.tracker.update_with_detections(empty_dets)
            return []
        
        # Convert to supervision Detections format
        sv_detections = SupervisionDetections(
            xyxy=bboxes,
            confidence=confidences,
            class_id=class_ids
        )
        
        # Update tracker
        tracked_detections = self.tracker.update_with_detections(sv_detections)
        
        # Convert to our format
        results = []
        for i in range(len(tracked_detections)):
            bbox = tracked_detections.xyxy[i]
            track_id = tracked_detections.tracker_id[i] if tracked_detections.tracker_id is not None else i
            confidence = tracked_detections.confidence[i] if tracked_detections.confidence is not None else 1.0
            class_id = tracked_detections.class_id[i] if tracked_detections.class_id is not None else 0
            
            # Calculate centroid
            cx = (bbox[0] + bbox[2]) / 2
            cy = (bbox[1] + bbox[3]) / 2
            
            results.append({
                'id': int(track_id),
                'bbox': bbox.tolist(),
                'confidence': float(confidence),
                'class_id': int(class_id),
                'centroid': [float(cx), float(cy)]
            })
        
        return results
    
    def _update_norfair(
        self,
        detections: Tuple[np.ndarray, np.ndarray, np.ndarray]
    ) -> List[Dict]:
        """Update Norfair"""
        from norfair import Detection as NorfairDetection
        
        bboxes, confidences, class_ids = detections
        
        if len(bboxes) == 0:
            # Update with empty detections
            self.tracker.update([])
            return []
        
        # Convert to Norfair Detection format
        norfair_dets = []
        for bbox, conf, cls_id in zip(bboxes, confidences, class_ids):
            # Norfair uses centroids
            cx = (bbox[0] + bbox[2]) / 2
            cy = (bbox[1] + bbox[3]) / 2
            
            norfair_dets.append(
                NorfairDetection(
                    points=np.array([[cx, cy]]),
                    scores=np.array([conf]),
                    data={'bbox': bbox, 'class_id': cls_id}
                )
            )
        
        # Update tracker
        tracked_objects = self.tracker.update(detections=norfair_dets)
        
        # Convert to our format
        results = []
        for obj in tracked_objects:
            if obj.last_detection is not None:
                bbox = obj.last_detection.data['bbox']
                class_id = obj.last_detection.data['class_id']
                confidence = obj.last_detection.scores[0]
                centroid = obj.estimate[0]
                
                results.append({
                    'id': obj.id,
                    'bbox': bbox.tolist(),
                    'confidence': float(confidence),
                    'class_id': int(class_id),
                    'centroid': centroid.tolist()
                })
        
        return results
    
    def reset(self):
        """Reset tracker state"""
        self._init_tracker()


if __name__ == "__main__":
    # Test tracker
    tracker = Tracker(method="bytetrack")
    
    # Dummy detections
    bboxes = np.array([[100, 100, 200, 200], [300, 300, 400, 400]])
    confidences = np.array([0.9, 0.8])
    class_ids = np.array([4, 4])
    
    tracks = tracker.update((bboxes, confidences, class_ids))
    print(f"Tracked objects: {len(tracks)}")
    for track in tracks:
        print(f"  ID {track['id']}: bbox={track['bbox']}, centroid={track['centroid']}")
