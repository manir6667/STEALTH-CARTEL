@echo off
echo ========================================
echo Aircraft Detection System - Setup
echo ========================================
echo.

cd /d "%~dp0"

REM Check if virtual environment exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Installing dependencies...
pip install opencv-python numpy

echo.
echo ========================================
echo Generating Sample Videos
echo ========================================
echo.

python scripts/generate_sample_videos.py --all

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Sample videos created in: sample_videos/
echo   - short_test.mp4 (10s, 3 aircraft)
echo   - standard_test.mp4 (30s, 5 aircraft)
echo   - busy_airspace.mp4 (20s, 10 aircraft)
echo.
echo Next steps:
echo   1. Install full dependencies: pip install -r requirements.txt
echo   2. Run detection: python -m src.main
echo   3. Start web server: python -m src.app
echo.

pause
