@echo off
REM Download required models for aircraft detection system

echo === Aircraft Detection System - Model Downloader ===
echo.

REM Create models directory
if not exist models mkdir models

REM Download YOLOv8 nano model
echo Downloading YOLOv8 nano model...
python -c "from ultralytics import YOLO; model = YOLO('yolov8n.pt'); print('Downloaded YOLOv8n')"

REM Move to models directory
if exist yolov8n.pt (
    move /Y yolov8n.pt models\
    echo Moved to models\yolov8n.pt
)

echo.
echo Models downloaded successfully!
echo.
echo Optional: Download larger models for better accuracy
echo   - yolov8s.pt ^(small^): python -c "from ultralytics import YOLO; YOLO('yolov8s.pt')"
echo   - yolov8m.pt ^(medium^): python -c "from ultralytics import YOLO; YOLO('yolov8m.pt')"
echo   - yolov8l.pt ^(large^): python -c "from ultralytics import YOLO; YOLO('yolov8l.pt')"
echo.

pause
