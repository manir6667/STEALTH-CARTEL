"""
Main video processing pipeline
Integrates detection, tracking, classification, speed estimation, and threat analysis
"""
import cv2
import numpy as np
import json
from pathlib import Path
from tqdm import tqdm
from datetime import datetime
import logging
from typing import List, Dict

from src.config import get_config
from src.detector import Detector
from src.tracker import Tracker
from src.classifier import AircraftClassifier
from src.speed_estimator import SpeedEstimator
from src.threat_analyzer import ThreatAnalyzer
from src.adsb_simulator import ADSBSimulator
from src.homography_calib import HomographyCalibrator
from src.utils import (
    VideoReader, VideoWriter, setup_logging, draw_bbox,
    draw_text, crop_bbox, get_threat_color, format_timestamp,
    ensure_dir, save_json
)

logger = logging.getLogger(__name__)


class AircraftDetectionPipeline:
    """Main pipeline for aircraft detection from video"""
    
    def __init__(self, config_path: str = "config.yaml"):
        """
        Initialize pipeline
        
        Args:
            config_path: Path to configuration file
        """
        self.config = get_config(config_path)
        
        # Setup logging
        setup_logging(
            level=self.config.get('logging.level', 'INFO'),
            log_file=self.config.get('logging.file')
        )
        
        logger.info("="*80)
        logger.info("Aircraft Detection Pipeline Initialized")
        logger.info("="*80)
        
        # Initialize components
        self._init_detector()
        self._init_tracker()
        self._init_classifier()
        self._init_speed_estimator()
        self._init_threat_analyzer()
        self._init_adsb()
        
        # Metrics
        self.metrics = {
            "total_frames": 0,
            "detections_count": 0,
            "tracks_count": 0,
            "alerts": {"Low": 0, "Medium": 0, "High": 0, "Critical": 0},
            "processing_times": []
        }
        
        # Log storage
        self.detection_logs = []
    
    def _init_detector(self):
        """Initialize YOLOv8 detector"""
        detector_config = self.config.get_section('detector')
        self.detector = Detector(
            model_path=detector_config.get('model_path', 'models/yolov8n.pt'),
            conf_threshold=detector_config.get('conf_threshold', 0.35),
            iou_threshold=detector_config.get('iou_threshold', 0.45),
            device=detector_config.get('device', 'cpu'),
            classes=detector_config.get('classes')
        )
        logger.info("✓ Detector initialized")
    
    def _init_tracker(self):
        """Initialize multi-object tracker"""
        tracker_config = self.config.get_section('tracking')
        self.tracker = Tracker(
            method=tracker_config.get('method', 'bytetrack'),
            max_distance=tracker_config.get('max_distance', 100.0),
            track_buffer=tracker_config.get('track_buffer', 30),
            match_threshold=tracker_config.get('match_threshold', 0.8)
        )
        logger.info("✓ Tracker initialized")
    
    def _init_classifier(self):
        """Initialize aircraft classifier"""
        classifier_config = self.config.get_section('classifier')
        self.classifier = AircraftClassifier(
            model_name=classifier_config.get('model_name', 'efficientnet_b0'),
            num_classes=classifier_config.get('num_classes', 6),
            checkpoint_path=classifier_config.get('checkpoint_path'),
            device=classifier_config.get('device', 'cpu'),
            use_classifier=classifier_config.get('use_classifier', True)
        )
        logger.info("✓ Classifier initialized")
    
    def _init_speed_estimator(self):
        """Initialize speed estimator"""
        homography_config = self.config.get_section('homography')
        video_config = self.config.get_section('video')
        
        # Load homography if available
        H = None
        if homography_config.get('use_homography', False):
            H = HomographyCalibrator.load_homography(
                homography_config.get('file', 'homography.json')
            )
        
        self.speed_estimator = SpeedEstimator(
            homography_matrix=H,
            fps=video_config.get('fps', 25.0),
            fallback_object_width_m=homography_config.get('fallback_object_width_m', 28.0),
            fallback_altitude_m=homography_config.get('fallback_altitude_m', 1000.0),
            camera_focal_length_px=homography_config.get('camera_focal_length_px', 1000.0)
        )
        logger.info("✓ Speed estimator initialized")
    
    def _init_threat_analyzer(self):
        """Initialize threat analyzer"""
        threat_config = self.config.get_section('threat')
        self.threat_analyzer = ThreatAnalyzer(
            zone_polygons_file=threat_config.get('zone_polygons_file'),
            allowlist_file=threat_config.get('allowlist_file'),
            weights=threat_config.get('weights'),
            thresholds=threat_config.get('thresholds')
        )
        logger.info("✓ Threat analyzer initialized")
    
    def _init_adsb(self):
        """Initialize ADS-B simulator"""
        adsb_config = self.config.get_section('adsb')
        self.adsb = None
        
        if adsb_config.get('enabled', False):
            self.adsb = ADSBSimulator(
                csv_path=adsb_config.get('csv_path'),
                match_radius_m=adsb_config.get('match_radius_m', 50.0),
                match_time_s=adsb_config.get('match_time_s', 2.0)
            )
            logger.info("✓ ADS-B simulator initialized")
        else:
            logger.info("✓ ADS-B simulator disabled")
    
    def process_video(self):
        """Main video processing loop"""
        video_config = self.config.get_section('video')
        input_path = video_config.get('input_path')
        output_path = video_config.get('output_path')
        skip_frames = video_config.get('skip_frames', 1)
        
        logger.info(f"Processing video: {input_path}")
        logger.info(f"Output will be saved to: {output_path}")
        
        # Open video
        with VideoReader(input_path) as reader:
            logger.info(f"Video info: {reader.frame_size}, {reader.fps} FPS, {reader.frame_count} frames")
            
            # Prepare writer
            writer_ctx = VideoWriter(output_path, reader.fps, reader.frame_size) if output_path else None
            
            frame_number = 0
            
            # Use contextlib.nullcontext for proper context manager handling
            from contextlib import nullcontext
            ctx = writer_ctx if writer_ctx else nullcontext()
            with ctx as writer:
                # Progress bar
                pbar = tqdm(total=reader.frame_count, desc="Processing")
                
                while True:
                    ret, frame = reader.read()
                    if not ret:
                        break
                                                        
                    # Skip frames if configured
                    if frame_number % skip_frames != 0:
                        frame_number += 1
                        pbar.update(1)
                        continue
                    
                    # Process frame
                    start_time = cv2.getTickCount()
                    annotated_frame = self._process_frame(frame, frame_number)
                    end_time = cv2.getTickCount()
                    
                    processing_time = (end_time - start_time) / cv2.getTickFrequency()
                    self.metrics['processing_times'].append(processing_time)
                    
                    # Write frame
                    if writer is not None:
                        writer.write(annotated_frame)
                    
                    frame_number += 1
                    self.metrics['total_frames'] += 1
                    pbar.update(1)
                
                pbar.close()
        
        # Save logs and metrics
        self._save_outputs()
        
        logger.info("="*80)
        logger.info("Processing Complete!")
        self._print_metrics()
        logger.info("="*80)
    
    def _process_frame(self, frame: np.ndarray, frame_number: int) -> np.ndarray:
        """
        Process single frame through entire pipeline
        
        Args:
            frame: Input frame
            frame_number: Frame index
            
        Returns:
            Annotated frame
        """
        timestamp = frame_number * self.speed_estimator.frame_time
        
        # Step 1: Detection
        bboxes, confidences, class_ids = self.detector.predict(frame)
        self.metrics['detections_count'] += len(bboxes)
        
        # Step 2: Tracking
        tracks = self.tracker.update((bboxes, confidences, class_ids))
        self.metrics['tracks_count'] = max(self.metrics['tracks_count'], len(tracks))
        
        # Step 3: Process each track
        for track in tracks:
            track_id = track['id']
            bbox = track['bbox']
            centroid = track['centroid']
            confidence = track['confidence']
            
            # Step 4: Speed estimation
            speed_result = self.speed_estimator.estimate_speed(
                track_id, tuple(centroid), tuple(bbox), frame_number
            )
            
            if speed_result is None:
                continue
            
            speed_mps, speed_kt, world_pos = speed_result
            
            # Step 5: Classification
            crop = crop_bbox(frame, tuple(map(int, bbox)))
            if crop.size > 0:
                class_label, class_conf = self.classifier.classify(crop, tuple(bbox))
            else:
                class_label, class_conf = "unknown", 0.5
            
            # Step 6: ADS-B matching
            adsb_info = None
            if self.adsb:
                adsb_info = self.adsb.match_nearest(world_pos, timestamp)
            
            transponder_id = adsb_info['transponder_id'] if adsb_info else None
            
            # Step 7: Threat assessment
            threat = self.threat_analyzer.assess_threat(
                world_pos=world_pos,
                speed_kt=speed_kt,
                classification=class_label,
                transponder_id=transponder_id,
                altitude_ft=adsb_info.get('altitude') if adsb_info else None
            )
            
            # Update metrics
            self.metrics['alerts'][threat['level']] += 1
            
            # Step 8: Log detection
            log_entry = {
                "frame": frame_number,
                "timestamp": format_timestamp(),
                "id": track_id,
                "bbox": bbox,
                "confidence": float(confidence),
                "class_label": class_label,
                "class_confidence": float(class_conf),
                "world_pos_m": list(world_pos),
                "speed_mps": float(speed_mps),
                "speed_kt": float(speed_kt),
                "transponder": adsb_info if adsb_info else None,
                "threat": threat
            }
            self.detection_logs.append(log_entry)
            
            # Step 9: Annotate frame
            color = get_threat_color(threat['level'])
            
            # Draw bbox
            label = f"ID{track_id} {class_label} {speed_kt:.0f}kt"
            draw_bbox(frame, bbox, label, color, confidence=confidence)
            
            # Draw threat info
            threat_text = f"{threat['level']} ({threat['score']}/100)"
            draw_text(frame, threat_text, (int(bbox[0]), int(bbox[3]) + 20), color)
        
        # Draw frame info
        info_text = f"Frame: {frame_number} | Tracks: {len(tracks)}"
        draw_text(frame, info_text, (10, 30), (255, 255, 255))
        
        return frame
    
    def _save_outputs(self):
        """Save detection logs and metrics"""
        output_config = self.config.get_section('output')
        
        # Save logs
        logs_file = output_config.get('logs_file', 'outputs/logs.json')
        save_json(self.detection_logs, logs_file)
        logger.info(f"✓ Saved {len(self.detection_logs)} detection logs to {logs_file}")
        
        # Compute final metrics
        avg_time = np.mean(self.metrics['processing_times']) if self.metrics['processing_times'] else 0
        avg_fps = 1.0 / avg_time if avg_time > 0 else 0
        
        final_metrics = {
            "total_frames": self.metrics['total_frames'],
            "total_detections": self.metrics['detections_count'],
            "max_concurrent_tracks": self.metrics['tracks_count'],
            "avg_processing_time_s": float(avg_time),
            "avg_fps": float(avg_fps),
            "alerts": self.metrics['alerts']
        }
        
        # Save metrics
        metrics_file = output_config.get('metrics_file', 'outputs/metrics.json')
        save_json(final_metrics, metrics_file)
        logger.info(f"✓ Saved metrics to {metrics_file}")
    
    def _print_metrics(self):
        """Print summary metrics"""
        avg_time = np.mean(self.metrics['processing_times']) if self.metrics['processing_times'] else 0
        avg_fps = 1.0 / avg_time if avg_time > 0 else 0
        
        print(f"\n📊 Processing Metrics:")
        print(f"  Total frames: {self.metrics['total_frames']}")
        print(f"  Total detections: {self.metrics['detections_count']}")
        print(f"  Max concurrent tracks: {self.metrics['tracks_count']}")
        print(f"  Avg processing time: {avg_time*1000:.1f} ms/frame")
        print(f"  Avg FPS: {avg_fps:.1f}")
        print(f"\n🚨 Alerts:")
        for level, count in self.metrics['alerts'].items():
            print(f"  {level}: {count}")


def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Aircraft Detection Pipeline")
    parser.add_argument("--config", default="config.yaml", help="Config file path")
    args = parser.parse_args()
    pipeline = AircraftDetectionPipeline(config_path=args.config)
    pipeline.process_video()


if __name__ == "__main__":
    main()


    