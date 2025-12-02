@echo off
echo ========================================
echo Aircraft Detection System - Quick Start
echo ========================================
echo.

cd /d "%~dp0"

REM Check if sample videos exist
if not exist "sample_videos\standard_test.mp4" (
    echo Sample videos not found. Generating...
    call venv\Scripts\activate.bat
    python scripts\generate_sample_videos.py --output "sample_videos\standard_test.mp4" --duration 30 --aircraft 5
    echo.
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo ========================================
echo Starting Web Server
echo ========================================
echo.
echo The web interface will open at:
echo   http://localhost:8000
echo.
echo Note: If no video has been processed yet, the dashboard
echo will show empty data. Run python -m src.main first to
echo process a video and generate detection logs.
echo.
echo Press Ctrl+C to stop the server
echo.

python -m src.app
