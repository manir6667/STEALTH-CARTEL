# Advanced AI-Based Aircraft Detection & Threat Assessment System

Video-based aircraft detection system using YOLOv8, multi-object tracking, monocular speed estimation, and explainable threat analysis.

## 🚀 Features

- **YOLOv8 Detection**: Real-time aircraft detection from video using state-of-the-art object detection
- **Multi-Object Tracking**: ByteTrack/Norfair for stable track IDs across frames
- **Speed Estimation**: Homography-based or pinhole camera fallback for monocular speed measurement
- **Aircraft Classification**: EfficientNet-B0 for 6-class aircraft type recognition (fighter, airliner, private jet, propeller, drone, unknown)
- **Threat Scoring**: Explainable rule-based threat assessment with weighted factors
- **ADS-B Integration**: Simulated transponder matching for correlated tracking
- **REST API + WebSocket**: FastAPI server with real-time alert streaming
- **Comprehensive Testing**: pytest unit tests for critical components

## 📋 Requirements

- Python 3.10+
- CPU-friendly (GPU optional)
- ~2GB RAM minimum
- OpenCV-compatible video format (mp4, avi, etc.)

## 🛠️ Installation

### 1. Clone repository

```bash
git clone <repository-url>
cd aircraft_detection_advanced
```

### 2. Create virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Download YOLOv8 model (optional - auto-downloads on first run)

```bash
# Manual download
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
```

## 📁 Project Structure

```
aircraft_detection_advanced/
├── src/
│   ├── detector.py           # YOLOv8 wrapper
│   ├── tracker.py            # ByteTrack/Norfair tracker
│   ├── classifier.py         # EfficientNet aircraft classifier
│   ├── speed_estimator.py    # Homography/pinhole speed estimation
│   ├── threat_analyzer.py    # Explainable threat scoring
│   ├── adsb_simulator.py     # ADS-B transponder matching
│   ├── homography_calib.py   # Camera calibration tool
│   ├── main.py               # Video processing pipeline
│   ├── app.py                # FastAPI server
│   ├── config.py             # Configuration loader
│   ├── utils.py              # Utilities
│   └── tests/                # Unit tests
│       ├── test_homography.py
│       ├── test_speed.py
│       └── test_threat.py
├── models/                   # Model weights (auto-downloaded)
├── outputs/                  # Processed videos, logs, metrics
├── sample_videos/            # Input video files
├── config.yaml               # Main configuration
├── .env.example              # Environment template
└── requirements.txt          # Python dependencies
```

## ⚙️ Configuration

Edit `config.yaml` to customize:

```yaml
video:
  input_path: "sample_videos/drone_flight.mp4"
  output_path: "outputs/annotated_video.mp4"
  fps: 25
  skip_frames: 1  # Process every Nth frame

detector:
  model_path: "models/yolov8n.pt"
  conf_threshold: 0.35
  classes: [4]  # COCO airplane class

homography:
  use_homography: true
  file: "homography.json"

threat:
  weights:
    zone: 40
    transponder: 25
    speed: 15
    military: 10
    altitude: 10
```

See `config.yaml` for all options.

## 🎯 Usage

### Step 1: Camera Calibration (Optional but Recommended)

For accurate speed estimation, calibrate camera perspective:

```bash
python -m src.homography_calib sample_videos/frame.jpg
```

**Interactive workflow:**
1. Click 4 reference points in the image (corners of a known rectangle)
2. Enter world coordinates for each point (in meters)
3. Homography matrix saved to `homography.json`

**Example:**
- Airport runway corners: `(0, 0)`, `(1000, 0)`, `(1000, 500)`, `(0, 500)`
- Building corners with known dimensions
- GPS-marked ground control points

### Step 2: Process Video

Run the detection pipeline:

```bash
python -m src.main --config config.yaml
```

**Output:**
- `outputs/annotated_video.mp4` - Video with bounding boxes, IDs, speeds, threats
- `outputs/logs.json` - Per-detection JSON logs (frame, bbox, speed, threat, etc.)
- `outputs/metrics.json` - Processing metrics (FPS, detection count, alerts)

### Step 3: Start API Server

Launch REST API and WebSocket server:

```bash
python -m src.app
```

Server runs on `http://localhost:8000`

**Endpoints:**
- `GET /` - Health check
- `GET /logs?threat_level=High&limit=10` - Filter detection logs (requires API key)
- `GET /logs/summary` - Statistics summary
- `GET /frame/123` - Get annotated frame as image
- `GET /alerts?min_level=High` - High-priority alerts
- `GET /metrics` - Processing performance metrics
- `WS /ws/alerts` - WebSocket for real-time High/Critical alerts

**API Key:**
Set in `config.yaml` under `server.api_key` or use `X-API-Key` header:

```bash
curl -H "X-API-Key: your_key_here" http://localhost:8000/logs
```

### Step 4: Run Tests

```bash
# All tests
pytest src/tests/ -v

# Specific module
pytest src/tests/test_homography.py -v

# With coverage
pytest src/tests/ --cov=src --cov-report=html
```

## 📊 Output Format

### Detection Log Entry (JSON)

```json
{
  "frame": 123,
  "timestamp": "2025-11-27T14:30:45.123456",
  "id": 5,
  "bbox": [120, 80, 250, 180],
  "confidence": 0.87,
  "class_label": "fighter",
  "class_confidence": 0.92,
  "world_pos_m": [1500.5, 2300.8],
  "speed_mps": 185.3,
  "speed_kt": 360.2,
  "transponder": {
    "transponder_id": "ABC123",
    "match_distance_m": 12.5,
    "match_time_diff_s": 0.04,
    "altitude": 5000,
    "speed": 365
  },
  "threat": {
    "score": 75,
    "level": "Critical",
    "reasons": [
      "Inside restricted zone",
      "No transponder signal",
      "High speed (360 kt)",
      "Military aircraft type"
    ],
    "breakdown": {
      "zone": 40,
      "transponder": 25,
      "speed": 10,
      "military": 10,
      "altitude": 0
    }
  }
}
```

### Metrics (JSON)

```json
{
  "total_frames": 1500,
  "total_detections": 342,
  "max_concurrent_tracks": 8,
  "avg_processing_time_s": 0.085,
  "avg_fps": 11.76,
  "alerts": {
    "Low": 120,
    "Medium": 180,
    "High": 35,
    "Critical": 7
  }
}
```

## 🧪 Testing

Unit tests cover:

- **Homography**: Transform accuracy, identity/scale matrices, save/load
- **Speed**: Conversion functions, horizontal/diagonal motion, multi-track, fallback mode
- **Threat**: Scoring logic, zone checking, allowlists, custom weights/thresholds

Run with:

```bash
pytest src/tests/ -v --tb=short
```

## 🐳 Docker (Optional)

### Build

```bash
docker build -t aircraft-detection .
```

### Run Pipeline

```bash
docker run -v $(pwd)/sample_videos:/app/sample_videos \
           -v $(pwd)/outputs:/app/outputs \
           aircraft-detection python -m src.main
```

### Run Server

```bash
docker run -p 8000:8000 \
           -v $(pwd)/outputs:/app/outputs \
           aircraft-detection python -m src.app
```

## 🔧 Troubleshooting

### No detections in video

- Check `config.yaml` → `detector.conf_threshold` (try lowering to 0.25)
- Verify video has aircraft (test with sample frames)
- Check `detector.classes` includes `[4]` (COCO airplane class)

### Speed estimation inaccurate

- **Without homography**: Use fallback mode (adjust `fallback_object_width_m` and `fallback_altitude_m`)
- **With homography**: Recalibrate with accurate ground control points
- Verify `video.fps` matches actual video framerate

### Low FPS / slow processing

- Increase `video.skip_frames` (process every 2nd or 3rd frame)
- Use smaller YOLOv8 model (`yolov8n.pt` instead of `yolov8m.pt`)
- Disable classifier: `config.yaml` → `classifier.use_classifier: false`
- Lower resolution: Pre-process video with `ffmpeg -i input.mp4 -s 1280x720 output.mp4`

### Import errors

```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check Python version (requires 3.10+)
python --version
```

## 📚 Algorithm Details

### Detection (YOLOv8)
- Pre-trained COCO weights (`yolov8n.pt`)
- Filters for class ID `4` (airplane)
- Confidence threshold: 0.35 (configurable)
- Outputs: bounding boxes (xyxy), confidences, class IDs

### Tracking (ByteTrack)
- IoU-based association with Kalman filter
- Track buffer: 30 frames (survives occlusions)
- Assigns stable IDs across video

### Speed Estimation
**Homography Mode:**
- Maps image pixels → world coordinates (meters)
- Tracks centroid displacement over time
- Speed = distance / (frame_time * frame_diff)

**Fallback Mode (no homography):**
- Pinhole camera model
- Estimates depth from known object size (wingspan)
- Distance = (focal_length * real_size) / pixel_size

### Threat Scoring
Weighted sum of 5 factors (max 100):

| Factor | Weight | Criteria |
|--------|--------|----------|
| Zone | 40 | Inside restricted polygon (GeoJSON) |
| Transponder | 25 | No ADS-B signal or not on allowlist |
| Speed | 15 | > 500 kt (proportional) |
| Military | 10 | Fighter/military classification |
| Altitude | 10 | < 1000 ft (inverse proportional) |

**Levels:**
- Low: 0-25
- Medium: 25-50
- High: 50-70
- Critical: 70-100

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- [ ] Live camera support (RTSP streams)
- [ ] Multi-camera tracking fusion
- [ ] Deep SORT tracker option
- [ ] Custom aircraft classifier training
- [ ] GPU acceleration docs
- [ ] Kubernetes deployment

## 📄 License

MIT License - see LICENSE file

## 🙏 Acknowledgments

- **YOLOv8**: Ultralytics
- **ByteTrack**: supervision library
- **EfficientNet**: timm (PyTorch Image Models)
- **FastAPI**: Sebastián Ramírez

## 📧 Contact

For issues or questions, open a GitHub issue or contact: maniraja6667713@gmail.com

---

**STEALTH CARTEL** © 2025
