@echo off
REM Run complete demo workflow for aircraft detection system

echo === Aircraft Detection System - Demo Workflow ===
echo.

REM Check if virtual environment is activated
python -c "import sys; exit(0 if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix) else 1)" 2>nul
if errorlevel 1 (
    echo Virtual environment not detected
    echo Activate with: venv\Scripts\activate
    pause
    exit /b 1
)

REM Step 1: Check dependencies
echo Step 1: Checking dependencies...
python -c "import ultralytics, cv2, torch" 2>nul
if errorlevel 1 (
    echo Missing dependencies. Run: pip install -r requirements.txt
    pause
    exit /b 1
)
echo Dependencies OK
echo.

REM Step 2: Download models if needed
echo Step 2: Checking models...
if not exist models\yolov8n.pt (
    echo Downloading YOLOv8 model...
    call scripts\download_models.bat
)
echo Models ready
echo.

REM Step 3: Check input video
echo Step 3: Checking input video...
for /f "delims=" %%i in ('python -c "from src.config import get_config; print(get_config().get('video.input_path', 'sample_videos/demo.mp4'))"') do set VIDEO_PATH=%%i

if not exist "%VIDEO_PATH%" (
    echo Input video not found: %VIDEO_PATH%
    echo Please place a video file at the path specified in config.yaml
    echo.
    echo Example: Download sample drone footage
    echo   mkdir sample_videos
    echo   REM Add your video file to sample_videos\
    pause
    exit /b 1
)
echo Input video: %VIDEO_PATH%
echo.

REM Step 4: Optional - Camera calibration
echo Step 4: Camera calibration ^(optional^)
if not exist homography.json (
    echo No homography calibration found
    echo For accurate speed estimation, run:
    echo   python -m src.homography_calib ^<path_to_reference_frame.jpg^>
    echo.
    set /p SKIP="Skip calibration and use fallback mode? (y/n): "
    if /i not "%SKIP%"=="y" exit /b 1
    echo Using fallback speed estimation
) else (
    echo Homography calibration loaded
)
echo.

REM Step 5: Process video
echo Step 5: Processing video...
echo This may take several minutes depending on video length
echo.
python -m src.main --config config.yaml

if errorlevel 1 (
    echo Processing failed
    pause
    exit /b 1
)
echo.
echo Video processing complete
echo.

REM Step 6: Show results
echo Step 6: Results
echo ---------------------------------------------------------
for /f "delims=" %%i in ('python -c "from src.config import get_config; print(get_config().get('video.output_path', 'outputs/annotated_video.mp4'))"') do set OUTPUT_PATH=%%i
set LOGS_PATH=outputs\logs.json
set METRICS_PATH=outputs\metrics.json

if exist "%OUTPUT_PATH%" (
    for %%A in ("%OUTPUT_PATH%") do set SIZE=%%~zA
    echo Annotated video: %OUTPUT_PATH% ^(!SIZE! bytes^)
)

if exist "%LOGS_PATH%" (
    for /f %%i in ('python -c "import json; print(len(json.load(open('%LOGS_PATH%'))))"') do set COUNT=%%i
    echo Detection logs: %LOGS_PATH% ^(!COUNT! detections^)
)

if exist "%METRICS_PATH%" (
    echo Metrics: %METRICS_PATH%
    python -c "import json; m=json.load(open('%METRICS_PATH%')); print(f'  - Total frames: {m[\"total_frames\"]}'); print(f'  - Total detections: {m[\"total_detections\"]}'); print(f'  - Avg FPS: {m[\"avg_fps\"]:.2f}'); print(f'  - Alerts: {m[\"alerts\"]}')"
)
echo.

REM Step 7: Start API server
echo Step 7: Start API server
set /p LAUNCH="Launch API server? (y/n): "
if /i "%LAUNCH%"=="y" (
    echo Starting server on http://localhost:8000
    echo Press Ctrl+C to stop
    echo.
    python -m src.app
)

echo.
echo === Demo Complete! ===
pause
