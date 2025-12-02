@echo off
REM Start Aircraft Detection System Web Interface

echo ========================================
echo Aircraft Detection System
echo ========================================
echo.

REM Check if virtual environment exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Check if dependencies are installed
python -c "import fastapi" 2>nul
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements.txt
)

echo.
echo Starting API server...
echo Web interface will be available at: http://localhost:8000
echo API endpoints available at: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo.

python -m src.app

pause
