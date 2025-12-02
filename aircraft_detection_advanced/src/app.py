"""
FastAPI server for aircraft detection system
Provides REST API and WebSocket endpoints for real-time alerts
"""
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, Security
from fastapi.security.api_key import APIKeyHeader
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
from pathlib import Path
from typing import List, Dict, Optional
import cv2
import numpy as np
import logging
from datetime import datetime

from src.config import get_config
from src.utils import setup_logging

logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="Aircraft Detection API",
    description="REST API and WebSocket server for aircraft detection system",
    version="1.0.0"
)

# Mount static files
static_path = Path(__file__).parent.parent / "static"
if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
config = get_config()
server_config = config.get_section('server')

# API Key authentication
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

# Global state
detection_logs: List[Dict] = []
video_path: Optional[str] = None
websocket_clients: List[WebSocket] = []


def get_api_key(api_key: str = Security(api_key_header)):
    """Validate API key"""
    expected_key = server_config.get('api_key', 'dev_key_12345')
    
    if api_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key


@app.on_event("startup")
async def startup_event():
    """Load logs on startup"""
    global detection_logs, video_path
    
    setup_logging(
        level=config.get('logging.level', 'INFO'),
        log_file=config.get('logging.file')
    )
    
    logger.info("Starting Aircraft Detection API Server")
    
    # Load detection logs
    output_config = config.get_section('output')
    logs_file = output_config.get('logs_file', 'outputs/logs.json')
    
    try:
        if Path(logs_file).exists():
            with open(logs_file, 'r') as f:
                detection_logs = json.load(f)
            logger.info(f"Loaded {len(detection_logs)} detection logs from {logs_file}")
        else:
            logger.warning(f"Logs file not found: {logs_file}")
    except Exception as e:
        logger.error(f"Error loading logs: {e}")
    
    # Get video path
    video_config = config.get_section('video')
    video_path = video_config.get('output_path', 'outputs/annotated_video.mp4')
    
    logger.info(f"API server ready on port {server_config.get('port', 8000)}")


@app.get("/")
async def root():
    """Serve the web interface"""
    static_path = Path(__file__).parent.parent / "static" / "index.html"
    if static_path.exists():
        return FileResponse(static_path)
    
    # Fallback to API info
    return {
        "status": "online",
        "service": "Aircraft Detection API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "logs_loaded": len(detection_logs)
    }


@app.get("/api/status")
async def api_status():
    """API health check"""
    return {
        "status": "online",
        "service": "Aircraft Detection API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "logs_loaded": len(detection_logs)
    }


@app.get("/logs")
async def get_logs(
    api_key: str = Depends(get_api_key),
    frame: Optional[int] = None,
    threat_level: Optional[str] = None,
    limit: Optional[int] = None
):
    """
    Get detection logs with optional filtering
    
    Args:
        frame: Filter by frame number
        threat_level: Filter by threat level (Low, Medium, High, Critical)
        limit: Maximum number of results
        
    Returns:
        Filtered detection logs
    """
    filtered_logs = detection_logs
    
    # Filter by frame
    if frame is not None:
        filtered_logs = [log for log in filtered_logs if log['frame'] == frame]
    
    # Filter by threat level
    if threat_level:
        valid_levels = ['Low', 'Medium', 'High', 'Critical']
        if threat_level not in valid_levels:
            raise HTTPException(status_code=400, detail=f"Invalid threat level. Must be one of: {valid_levels}")
        filtered_logs = [log for log in filtered_logs if log['threat']['level'] == threat_level]
    
    # Apply limit
    if limit:
        filtered_logs = filtered_logs[:limit]
    
    return {
        "count": len(filtered_logs),
        "logs": filtered_logs
    }


@app.get("/logs/summary")
async def get_logs_summary(api_key: str = Depends(get_api_key)):
    """
    Get summary statistics from detection logs
    
    Returns:
        Summary statistics
    """
    if not detection_logs:
        return {"error": "No logs available"}
    
    # Count by threat level
    threat_counts = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    class_counts = {}
    unique_tracks = set()
    
    for log in detection_logs:
        threat_counts[log['threat']['level']] += 1
        
        class_label = log['class_label']
        class_counts[class_label] = class_counts.get(class_label, 0) + 1
        
        unique_tracks.add(log['id'])
    
    return {
        "total_detections": len(detection_logs),
        "unique_tracks": len(unique_tracks),
        "threat_distribution": threat_counts,
        "class_distribution": class_counts
    }


@app.get("/frame/{frame_number}")
async def get_frame(frame_number: int, api_key: str = Depends(get_api_key)):
    """
    Get annotated frame as image
    
    Args:
        frame_number: Frame index
        
    Returns:
        JPEG image stream
    """
    if not video_path or not Path(video_path).exists():
        raise HTTPException(status_code=404, detail="Annotated video not found")
    
    # Open video
    cap = cv2.VideoCapture(video_path)
    
    # Seek to frame
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
    ret, frame = cap.read()
    cap.release()
    
    if not ret:
        raise HTTPException(status_code=404, detail=f"Frame {frame_number} not found")
    
    # Encode as JPEG
    _, buffer = cv2.imencode('.jpg', frame)
    
    return StreamingResponse(
        iter([buffer.tobytes()]),
        media_type="image/jpeg"
    )


@app.get("/alerts")
async def get_alerts(
    api_key: str = Depends(get_api_key),
    min_level: str = "High"
):
    """
    Get high-priority alerts (High and Critical threats)
    
    Args:
        min_level: Minimum threat level (Medium, High, Critical)
        
    Returns:
        List of alerts
    """
    level_priority = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}
    
    if min_level not in level_priority:
        raise HTTPException(status_code=400, detail="Invalid threat level")
    
    min_priority = level_priority[min_level]
    
    alerts = [
        log for log in detection_logs
        if level_priority[log['threat']['level']] >= min_priority
    ]
    
    return {
        "count": len(alerts),
        "alerts": alerts
    }


@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """
    WebSocket endpoint for real-time alert streaming
    Sends High and Critical threats as they are processed
    """
    await websocket.accept()
    websocket_clients.append(websocket)
    logger.info("WebSocket client connected")
    
    try:
        # Send existing High/Critical alerts
        high_priority_logs = [
            log for log in detection_logs
            if log['threat']['level'] in ['High', 'Critical']
        ]
        
        for log in high_priority_logs:
            await websocket.send_json({
                "type": "alert",
                "data": log
            })
            await asyncio.sleep(0.1)  # Rate limiting
        
        # Keep connection alive
        while True:
            # Wait for client messages (heartbeat)
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # Send heartbeat
                await websocket.send_json({"type": "heartbeat", "timestamp": datetime.now().isoformat()})
    
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
        websocket_clients.remove(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if websocket in websocket_clients:
            websocket_clients.remove(websocket)


async def broadcast_alert(log: Dict):
    """
    Broadcast alert to all connected WebSocket clients
    
    Args:
        log: Detection log entry
    """
    if log['threat']['level'] in ['High', 'Critical']:
        message = {"type": "alert", "data": log}
        
        # Send to all clients
        for client in websocket_clients[:]:  # Copy to avoid modification during iteration
            try:
                await client.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to client: {e}")
                websocket_clients.remove(client)


@app.get("/metrics")
async def get_metrics(api_key: str = Depends(get_api_key)):
    """
    Get processing metrics
    
    Returns:
        Performance metrics
    """
    output_config = config.get_section('output')
    metrics_file = output_config.get('metrics_file', 'outputs/metrics.json')
    
    if not Path(metrics_file).exists():
        raise HTTPException(status_code=404, detail="Metrics file not found")
    
    try:
        with open(metrics_file, 'r') as f:
            metrics = json.load(f)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading metrics: {str(e)}")


def run_server():
    """Start the FastAPI server"""
    import uvicorn
    
    host = server_config.get('host', '0.0.0.0')
    port = server_config.get('port', 8000)
    
    uvicorn.run(
        "src.app:app",
        host=host,
        port=port,
        reload=False,
        log_level="info"
    )


if __name__ == "__main__":
    run_server()
