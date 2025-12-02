#!/bin/bash
# Run complete demo workflow for aircraft detection system

echo "=== Aircraft Detection System - Demo Workflow ==="
echo ""

# Check if virtual environment is activated
if [ -z "$VIRTUAL_ENV" ]; then
    echo "⚠️  Virtual environment not detected"
    echo "Activate with: source venv/bin/activate"
    exit 1
fi

# Step 1: Check dependencies
echo "Step 1: Checking dependencies..."
python -c "import ultralytics, cv2, torch" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Missing dependencies. Run: pip install -r requirements.txt"
    exit 1
fi
echo "✓ Dependencies OK"
echo ""

# Step 2: Download models if needed
echo "Step 2: Checking models..."
if [ ! -f "models/yolov8n.pt" ]; then
    echo "📦 Downloading YOLOv8 model..."
    bash scripts/download_models.sh
fi
echo "✓ Models ready"
echo ""

# Step 3: Check input video
echo "Step 3: Checking input video..."
VIDEO_PATH=$(python -c "from src.config import get_config; print(get_config().get('video.input_path', 'sample_videos/demo.mp4'))")

if [ ! -f "$VIDEO_PATH" ]; then
    echo "⚠️  Input video not found: $VIDEO_PATH"
    echo "Please place a video file at the path specified in config.yaml"
    echo ""
    echo "Example: Download sample drone footage"
    echo "  mkdir -p sample_videos"
    echo "  # Add your video file to sample_videos/"
    exit 1
fi
echo "✓ Input video: $VIDEO_PATH"
echo ""

# Step 4: Optional - Camera calibration
echo "Step 4: Camera calibration (optional)"
if [ ! -f "homography.json" ]; then
    echo "⚠️  No homography calibration found"
    echo "For accurate speed estimation, run:"
    echo "  python -m src.homography_calib <path_to_reference_frame.jpg>"
    echo ""
    read -p "Skip calibration and use fallback mode? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    echo "✓ Using fallback speed estimation"
else
    echo "✓ Homography calibration loaded"
fi
echo ""

# Step 5: Process video
echo "Step 5: Processing video..."
echo "This may take several minutes depending on video length"
echo ""
python -m src.main --config config.yaml

if [ $? -ne 0 ]; then
    echo "❌ Processing failed"
    exit 1
fi
echo ""
echo "✓ Video processing complete"
echo ""

# Step 6: Show results
echo "Step 6: Results"
echo "─────────────────────────────────────────────────────"
OUTPUT_PATH=$(python -c "from src.config import get_config; print(get_config().get('video.output_path', 'outputs/annotated_video.mp4'))")
LOGS_PATH="outputs/logs.json"
METRICS_PATH="outputs/metrics.json"

if [ -f "$OUTPUT_PATH" ]; then
    SIZE=$(du -h "$OUTPUT_PATH" | cut -f1)
    echo "✓ Annotated video: $OUTPUT_PATH ($SIZE)"
fi

if [ -f "$LOGS_PATH" ]; then
    COUNT=$(python -c "import json; print(len(json.load(open('$LOGS_PATH'))))")
    echo "✓ Detection logs: $LOGS_PATH ($COUNT detections)"
fi

if [ -f "$METRICS_PATH" ]; then
    echo "✓ Metrics: $METRICS_PATH"
    python -c "import json; m=json.load(open('$METRICS_PATH')); print(f\"  - Total frames: {m['total_frames']}\"); print(f\"  - Total detections: {m['total_detections']}\"); print(f\"  - Avg FPS: {m['avg_fps']:.2f}\"); print(f\"  - Alerts: {m['alerts']}\");"
fi
echo ""

# Step 7: Start API server
echo "Step 7: Start API server"
read -p "Launch API server? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting server on http://localhost:8000"
    echo "Press Ctrl+C to stop"
    echo ""
    python -m src.app
fi

echo ""
echo "=== Demo Complete! ==="
