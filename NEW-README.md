# Aircraft Detection System

A complete web application for detecting and classifying unknown aircraft entering restricted airspace using simulated telemetry data and machine learning classification.

![System Architecture](https://via.placeholder.com/800x400?text=Aircraft+Detection+System)

## 📋 Features

- **Real-time Flight Tracking**: Monitor multiple aircraft simultaneously on an interactive map
- **Intelligent Classification**: Automatically classify aircraft based on speed profiles
  - Small aircraft / Civilian propeller (< 120 kt)
  - Airliner / Private jet (120-350 kt)
  - High-performance aircraft (350-600 kt)
  - Fighter / Attack aircraft (> 600 kt)
- **Restricted Airspace Detection**: Define polygonal restricted areas and detect violations
- **Smart Alerting**: Automatic alerts for unknown aircraft in restricted zones with severity levels
- **User Authentication**: Secure JWT-based authentication with role-based access (Admin/Analyst)
- **Live Updates**: WebSocket support for real-time flight and alert updates
- **Flight Simulation**: Realistic telemetry simulator with multiple aircraft types

## 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  React Frontend │◄───────►│  FastAPI Backend │◄───────►│  SQLite Database│
│  (Vite + Leaflet│         │  (WebSocket + REST│         │                 │
│                 │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
         ▲                            ▲
         │                            │
         └────────────────┬───────────┘
                          │
                 ┌────────▼────────┐
                 │                 │
                 │  Flight Simulator│
                 │  (simulate_flights│
                 │                 │
                 └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm or yarn

### Option 1: Docker (Recommended)

```powershell
# Clone and navigate to project
cd "D:\STEALTH CARTEL"

# Start all services
docker-compose up
```

- Backend API: http://localhost:8000
- Frontend UI: http://localhost:5173
- API Docs: http://localhost:8000/docs

### Option 2: Manual Setup

#### 1. Backend Setup

```powershell
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run backend server
uvicorn app.main:app --reload
```

Backend will be available at http://localhost:8000

#### 2. Frontend Setup

```powershell
# Open new terminal and navigate to frontend
cd new-frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will be available at http://localhost:5173

#### 3. Flight Simulator

```powershell
# Open new terminal in project root
cd "D:\STEALTH CARTEL"

# Install simulator requirements
pip install -r simulator_requirements.txt

# Run simulator
python simulate_flights.py --interval 2
```

## 🔐 Default Credentials

**Admin Account:**
- Email: `admin@example.com`
- Password: `strongpassword`

**⚠️ IMPORTANT**: Change these credentials in production!

## 📊 Classification Thresholds

The system classifies aircraft based on ground speed:

| Classification | Speed Range (knots) | Severity | Example |
|----------------|---------------------|----------|---------|
| Civilian Prop  | 0 - 120            | LOW      | Cessna 172 |
| Airliner       | 120 - 350          | MEDIUM   | Boeing 737 |
| High Performance| 350 - 600         | HIGH     | F-16 (subsonic) |
| Fighter/Attack | > 600              | HIGH     | F-22 (supersonic) |

Thresholds are configurable in `backend/app/classification.py`

## 🧪 Running Tests

```powershell
# Navigate to backend
cd backend

# Activate virtual environment
.\venv\Scripts\activate

# Run tests
pytest tests/ -v
```

### Test Coverage

- ✅ Classification logic with various speeds
- ✅ Edge case handling (boundaries, negative values)
- ✅ Sustained speed window calculations
- ✅ Alert message generation
- ✅ Threat level detection

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Flights
- `POST /api/flights/telemetry` - Ingest flight telemetry
- `GET /api/flights/` - List recent flights
- `GET /api/flights/{id}` - Get flight details

### Alerts
- `GET /api/alerts/` - List all alerts
- `POST /api/alerts/acknowledge` - Acknowledge an alert
- `GET /api/alerts/{id}` - Get alert details

### Restricted Areas
- `POST /api/restricted-areas/` - Create restricted area (admin)
- `GET /api/restricted-areas/` - List all areas
- `GET /api/restricted-areas/active` - Get active area
- `PATCH /api/restricted-areas/{id}/toggle` - Toggle area status (admin)

### WebSocket
- `ws://localhost:8000/ws` - Real-time flight and alert updates

## 🎯 Acceptance Criteria

### ✅ Core Features
- [x] User registration and login with secure password hashing
- [x] Role-based access control (Admin/Analyst)
- [x] Interactive map showing real-time flights
- [x] Restricted area overlay on map
- [x] Flight classification based on speed
- [x] Alert generation for unknown aircraft in restricted zones
- [x] Alert acknowledgment and logging
- [x] Flight detail modal with full telemetry
- [x] WebSocket support for live updates

### ✅ Technical Requirements
- [x] FastAPI backend with REST + WebSocket
- [x] React frontend with Leaflet map
- [x] SQLite database with proper models
- [x] JWT authentication
- [x] bcrypt password hashing
- [x] Unit tests for classification logic
- [x] Docker support
- [x] Comprehensive documentation

### ✅ Simulator
- [x] Multiple aircraft types (airliner, prop, drone, fighter)
- [x] Realistic speed and altitude profiles
- [x] Configurable update interval
- [x] Unknown aircraft (no transponder ID)

## 🛠️ Development

### Project Structure

```
STEALTH CARTEL/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── auth.py              # JWT authentication
│   │   ├── classification.py    # Aircraft classification logic
│   │   ├── database.py          # Database configuration
│   │   └── routes/
│   │       ├── auth.py          # Authentication routes
│   │       ├── flights.py       # Flight routes
│   │       ├── alerts.py        # Alert routes
│   │       └── restricted_areas.py
│   ├── tests/
│   │   └── test_classification.py
│   ├── requirements.txt
│   └── Dockerfile
├── new-frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── components/
│   │   │   ├── MapView.jsx
│   │   │   ├── AlertsPanel.jsx
│   │   │   └── FlightDetail.jsx
│   │   ├── services/
│   │   │   └── api.js           # API client + WebSocket
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── Dockerfile
├── simulate_flights.py          # Flight simulator
├── docker-compose.yml
└── README.md
```

### Environment Variables

Create `.env` file in backend directory:

```env
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///./aircraft_detection.db
```

### Adding New Aircraft Types

Edit `backend/app/classification.py` to add new thresholds:

```python
THRESHOLDS = {
    "small_aircraft": 120,
    "commercial": 350,
    "high_performance": 600,
    "supersonic": 1000  # New threshold
}
```

## 🔒 Security Considerations

### ⚠️ Production Checklist
- [ ] Change default admin credentials
- [ ] Set strong SECRET_KEY in environment variables
- [ ] Use PostgreSQL instead of SQLite
- [ ] Configure CORS with specific origins
- [ ] Enable HTTPS
- [ ] Implement rate limiting
- [ ] Add input validation
- [ ] Enable logging and monitoring
- [ ] Implement email/webhook alerts
- [ ] Add audit trail for admin actions

## 🚀 Deployment

### Production Deployment

1. Update CORS settings in `backend/app/main.py`
2. Use PostgreSQL for database
3. Set environment variables securely
4. Use gunicorn or similar WSGI server
5. Deploy frontend with nginx
6. Use SSL certificates

### Docker Production

```powershell
docker-compose -f docker-compose.prod.yml up -d
```

## 📈 Future Enhancements

- [ ] Email/webhook alert integration
- [ ] Allowlist CSV upload for known transponders
- [ ] Historical playback mode
- [ ] Multiple restricted areas
- [ ] Advanced filtering and search
- [ ] Export alerts to CSV/PDF
- [ ] Mobile app
- [ ] Integration with real ADS-B receivers

## 🐛 Troubleshooting

### Backend won't start
- Check Python version (3.11+)
- Verify all dependencies installed: `pip install -r requirements.txt`
- Check port 8000 is not in use

### Frontend won't start
- Check Node.js version (18+)
- Delete `node_modules` and run `npm install` again
- Check port 5173 is not in use

### Simulator connection errors
- Ensure backend is running first
- Check API_BASE_URL in `simulate_flights.py`
- Verify no firewall blocking localhost connections

### Map not loading
- Check browser console for errors
- Verify Leaflet CSS is loaded
- Check network requests to tile server

## 📄 License

This project is for educational and demonstration purposes.

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For issues and questions, please open an issue on the repository.

---

**Built with ❤️ for aircraft detection and airspace security**
