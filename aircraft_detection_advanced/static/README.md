# Aircraft Detection Web Interface

Professional, clean web dashboard for the Aircraft Detection & Threat Assessment System.

## Features

- **Real-time Monitoring**: Live metrics and detection statistics
- **Detection Log**: Sortable table with filtering by threat level
- **Live Alerts**: WebSocket-based real-time High/Critical threat notifications
- **Threat Distribution**: Visual breakdown of threat levels
- **Aircraft Classification**: Statistics on detected aircraft types
- **Detail View**: Modal with complete detection information

## Quick Start

### Windows

Simply double-click `start_server.bat` or run:

```cmd
start_server.bat
```

Then open your browser to: **http://localhost:8000**

### Manual Start

```bash
# Activate virtual environment
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Start server
python -m src.app
```

Access at: **http://localhost:8000**

## Interface Layout

### Header
- API connection status
- Total detections count
- Active high-priority alerts count

### Left Panel
- **System Metrics**: Frames processed, unique tracks, FPS, processing time
- **Threat Distribution**: Count of Low/Medium/High/Critical threats
- **Aircraft Types**: Classification breakdown

### Center Panel
- **Detection Table**: All detections with filtering
  - Filter by threat level (All/Critical/High/Medium/Low)
  - Limit results (default 50)
  - Sortable columns: Frame, ID, Type, Speed, Altitude, etc.
  - View details button for each detection

### Right Panel
- **Live Alerts**: Real-time WebSocket feed
  - Only High and Critical threats
  - Connection status indicator
  - Last 20 alerts

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /api/status` | API health check |
| `GET /logs` | Fetch detection logs with filters |
| `GET /logs/summary` | Statistics summary |
| `GET /metrics` | Processing performance metrics |
| `WS /ws/alerts` | WebSocket for live alerts |

## Configuration

Edit API settings in `static/app.js`:

```javascript
const API_BASE_URL = 'http://localhost:8000';
const API_KEY = 'dev_key_12345'; // Match config.yaml
const WS_URL = 'ws://localhost:8000/ws/alerts';
```

## Design Principles

✅ **Professional** - Clean, corporate styling  
✅ **Functional** - No unnecessary animations or effects  
✅ **Responsive** - Works on desktop and tablet  
✅ **Accessible** - Clear typography and color contrast  
✅ **Fast** - Minimal JavaScript, efficient rendering  

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

## Troubleshooting

### "API Status: Offline"
- Ensure the server is running (`python -m src.app`)
- Check if port 8000 is available
- Verify firewall settings

### "No detections found"
- Process a video first: `python -m src.main`
- Check that `outputs/logs.json` exists
- Verify API key in `app.js` matches `config.yaml`

### WebSocket disconnected
- Check WebSocket URL in `app.js`
- Ensure server supports WebSocket connections
- Auto-reconnects every 5 seconds

## Files

- `static/index.html` - Main HTML structure
- `static/styles.css` - Professional styling (no animations)
- `static/app.js` - Frontend logic (vanilla JavaScript)
- `start_server.bat` - Windows startup script

## License

MIT License - Part of STEALTH CARTEL Aircraft Detection System
