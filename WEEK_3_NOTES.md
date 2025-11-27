# Week 3 Development Notes - October 17, 2025

## STEALTH CARTEL: Aircraft Detection System

### 🎯 Week Goals
- Build React frontend with Vite
- Integrate Leaflet maps
- Design military-themed UI
- Implement real-time updates

**Overview:** Created complete frontend interface with interactive maps, real-time data, and tactical military design theme.

---

## 📋 Tasks Completed

### 1. React + Vite Setup (2 hours)
**Technologies:**
- React 18.2.0 with Vite 5.4.21
- Tailwind CSS 3.3.6 for styling
- React Router 6.28.0 for navigation
- Axios 1.7.9 for API calls

**Project Structure:**
```
new-frontend/
├── src/
│   ├── components/    # Reusable components
│   ├── pages/         # Page components
│   ├── services/      # API services
│   ├── utils/         # Helper functions
│   └── App.jsx
```

### 2. Leaflet Map Integration (4 hours)
**Libraries:**
- Leaflet 1.9.4
- react-leaflet 4.2.1

**MapView Component Features:**
- OpenStreetMap tile layer
- Color-coded aircraft markers (green/blue/amber/red)
- Pulsing animation with CSS keyframes
- Custom divIcon with glowing effects
- Restricted area polygon (red dashed)
- Interactive popups with flight details
- Legend for aircraft types

**Marker Styling:**
```css
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
}
```

### 3. Dashboard Development (3 hours)
**Main Features:**
- Real-time flight list with status indicators
- Alert panel with severity color coding
- Flight details sidebar
- Map view with live aircraft positions
- Polling interval: 2 seconds for smooth updates

**Components Created:**
- `Dashboard.jsx` - Main container
- `MapView.jsx` - Interactive map
- `AlertsPanel.jsx` - Security notifications
- `FlightDetail.jsx` - Aircraft information
- `Header.jsx` - Navigation bar

### 4. Military-Themed UI (3 hours)
**Login Page:**
- Fighter jet background (Unsplash photo-1498084393753)
- Dark overlay (bg-opacity-75)
- Red alert styling (#ef4444)
- Shield icon from lucide-react
- Tactical font styling

**Dashboard Theme:**
- Dark mode color scheme
- Red/amber alert colors
- Monospace fonts for technical data
- Military-style badges and icons
- High-contrast text for readability

**Color Palette:**
- Background: #1f2937 (gray-800)
- Primary: #ef4444 (red-500)
- Secondary: #3b82f6 (blue-500)
- Success: #10b981 (green-500)
- Warning: #f59e0b (amber-500)

### 5. WebSocket Integration (2 hours)
**Features:**
- Real-time flight updates
- Live alert notifications
- Automatic reconnection on disconnect
- Event-based message handling

**WebSocketService.js:**
```javascript
connect() {
  this.ws = new WebSocket('ws://localhost:8000/ws');
  this.ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'flight_update') {
      this.onFlightUpdate(data.payload);
    }
  };
}
```

### 6. API Service Layer (2 hours)
Created centralized API services:
- `authAPI.js` - Login, register, token management
- `flightsAPI.js` - Flight data operations
- `alertsAPI.js` - Alert management
- `mapAPI.js` - Restricted area operations

**Features:**
- Axios interceptors for auth tokens
- Error handling with toast notifications
- Request/response logging
- Base URL configuration

---

## 🎨 UI Components

### Navigation Header
- Logo and app title
- User profile dropdown
- Logout functionality
- Active route highlighting

### Flight List
- Scrollable list with aircraft cards
- Color-coded by classification
- Speed, altitude, and track display
- Click to view on map

### Alerts Panel
- Sortable by severity/time
- Auto-scroll to latest alert
- Resolve button for each alert
- Unresolved count badge

### Flight Detail Sidebar
- Selected aircraft information
- Model prediction with confidence
- Real-time position updates
- Restricted area status indicator

---

## 🧪 Testing

**Browser Testing:**
- ✅ Chrome, Firefox, Edge compatibility
- ✅ Responsive design (desktop focus)
- ✅ Map zoom and pan functionality
- ✅ Real-time data updates working
- ✅ WebSocket connection stable

**User Flow Testing:**
- ✅ Login → Dashboard navigation
- ✅ Aircraft selection and detail view
- ✅ Alert notifications appearing
- ✅ Map markers updating positions

---

## 🐛 Issues & Solutions

**Issue #1: Leaflet Icon Not Loading**  
Problem: Default marker icons showing as broken images  
Solution: Manually set icon URLs from unpkg CDN

**Issue #2: CORS WebSocket Error**  
Problem: WebSocket connection blocked by CORS  
Solution: Added WebSocket support in FastAPI CORS config

**Issue #3: PostCSS ES Module Error**  
Problem: Vite expecting ES module syntax in postcss.config.js  
Solution: Changed to `export default` syntax

**Issue #4: Memory Leak from Polling**  
Problem: Multiple setInterval timers stacking up  
Solution: Proper cleanup with clearInterval in useEffect

---

## 📊 Week 3 Metrics
- **Lines of Code:** ~1200 new lines
- **Components Created:** 12 components
- **Pages:** 3 pages (Login, Dashboard, NotFound)
- **API Services:** 4 service files
- **Time Spent:** 20 hours
- **Dependencies Added:** 15 packages

---

## 💡 Key Learnings
1. React Leaflet requires careful ref management
2. WebSocket reconnection logic is essential
3. Tailwind CSS speeds up UI development
4. Real-time polling needs proper cleanup
5. Military theme requires high contrast for readability

---

## 📅 Next Week (Week 4)
- [ ] Change location to Salem, Tamil Nadu
- [ ] Build flight simulator for testing
- [ ] Configure 8 aircraft scenarios
- [ ] Reset database with new coordinates
- [ ] Test restricted area detection
- [ ] Optimize map performance

---

**Status:** ✅ COMPLETE | **Progress:** 70% | **Next Review:** October 24, 2025
