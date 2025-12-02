#!/bin/bash
# Download required models for aircraft detection system

echo "=== Aircraft Detection System - Model Downloader ==="
echo ""

# Create models directory
mkdir -p models

# Download YOLOv8 nano model
echo "📦 Downloading YOLOv8 nano model..."
python -c "from ultralytics import YOLO; model = YOLO('yolov8n.pt'); print('✓ YOLOv8n downloaded')"

# Move to models directory
if [ -f "yolov8n.pt" ]; then
    mv yolov8n.pt models/
    echo "✓ Moved to models/yolov8n.pt"
fi

echo ""
echo "✅ Models downloaded successfully!"
echo ""
echo "Optional: Download larger models for better accuracy"
echo "  - yolov8s.pt (small): python -c \"from ultralytics import YOLO; YOLO('yolov8s.pt')\""
echo "  - yolov8m.pt (medium): python -c \"from ultralytics import YOLO; YOLO('yolov8m.pt')\""
echo "  - yolov8l.pt (large): python -c \"from ultralytics import YOLO; YOLO('yolov8l.pt')\""
echo ""
