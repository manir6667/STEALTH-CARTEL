"""
FastAPI main application with WebSocket support
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List
import json

from app.database import init_db, get_db
from app.routes import auth, flights, alerts, restricted_areas
from app.models import User
from app.auth import get_password_hash


class ConnectionManager:
    """Manage WebSocket connections for real-time updates"""
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass


manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup"""
    init_db()
    
    # Seed default admin user if not exists
    db = next(get_db())
    existing_admin = db.query(User).filter(User.email == "admin@example.com").first()
    if not existing_admin:
        admin_user = User(
            email="admin@example.com",
            hashed_password=get_password_hash("strongpassword"),
            role="admin"
        )
        db.add(admin_user)
        db.commit()
    
    # Seed restricted area in Salem, Tamil Nadu if not exists
    from app.models import RestrictedArea
    existing_area = db.query(RestrictedArea).filter(RestrictedArea.is_active == True).first()
    if not existing_area:
        # Create a restricted area around Salem, Tamil Nadu, India
        # Salem coordinates: approximately 11.65°N, 78.15°E
        restricted_area = RestrictedArea(
            name="Salem Military Airspace - Restricted Zone",
            polygon_json=json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [78.10, 11.70],  # Northwest corner
                    [78.20, 11.70],  # Northeast corner
                    [78.20, 11.60],  # Southeast corner
                    [78.10, 11.60],  # Southwest corner
                    [78.10, 11.70]   # Close polygon
                ]]
            }),
            is_active=True
        )
        db.add(restricted_area)
        db.commit()
        print("✓ Created restricted area in Salem, Tamil Nadu, India")
    
    db.close()
    
    yield


# Create FastAPI app
app = FastAPI(
    title="Aircraft Detection System",
    description="Real-time aircraft detection and classification system",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(flights.router)
app.include_router(alerts.router)
app.include_router(restricted_areas.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Aircraft Detection System API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time flight updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and receive messages
            data = await websocket.receive_text()
            # Echo back or handle client messages if needed
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# Utility function to broadcast flight updates
async def broadcast_flight_update(flight_data: dict):
    """Broadcast flight update to all connected clients"""
    await manager.broadcast({
        "type": "flight_update",
        "data": flight_data
    })


async def broadcast_alert(alert_data: dict):
    """Broadcast alert to all connected clients"""
    await manager.broadcast({
        "type": "alert",
        "data": alert_data
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
