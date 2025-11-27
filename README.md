# Stealth Aircraft AI Defence System

A beginner-friendly, software-only project to detect stealth aircraft using simulated radar/acoustic data and AI/ML.

## Project Structure

```
/project-root  
  /src              → backend code (FastAPI + ML model)  
  /frontend         → React frontend  
  requirements.txt  → Python dependencies  
  README.md         → setup and run instructions
```

## Setup Instructions

### 1. Python Backend

1. **Create virtual environment**
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```
2. **Install dependencies**
   ```powershell
   pip install -r requirements.txt
   ```
3. **Run backend server**
   ```powershell
   uvicorn src.main:app --reload
   ```
   The API will be available at `http://127.0.0.1:8000`

### 2. React Frontend

1. **Install Node.js and npm (if not installed)**
   - Download from https://nodejs.org/ (LTS version recommended).
   - Run installer and restart your terminal.
   - Check installation:
     ```powershell
     node -v
     npm -v
     ```
     Both should show version numbers.

2. **Install frontend dependencies**
   ```powershell
   cd frontend
   npm install
   ```
2. **Start frontend**
   ```powershell
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

### 3. Usage

- Go to the frontend URL and log in with the test credentials.
- View detected aircraft and details.

## Notes
- All data is simulated in code (no hardware required).
- Authentication is basic (for demo purposes).
- Backend and frontend are connected via REST API (CORS enabled).
