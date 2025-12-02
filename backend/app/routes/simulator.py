"""
Flight Simulator routes - Generate and manage simulated aircraft flights
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.models import RestrictedArea
from app.auth import get_current_user
from app.flight_simulator import SimulationManager, FlightSimulator
from app.manual_flight_manager import ManualFlightManager
from app.routes.flights import FlightTelemetry
import asyncio
import json

router = APIRouter(prefix="/api/simulator", tags=["simulator"])

# Global simulation managers
simulation_manager = SimulationManager()
manual_flight_manager = ManualFlightManager()


class SimulateFlightRequest(BaseModel):
    aircraft_type: Optional[str] = None  # commercial, private, military, unknown
    num_flights: int = 1
    use_active_restricted_area: bool = True
    polygon_json: Optional[str] = None
    custom_heading: Optional[float] = None  # 0-360 degrees
    custom_speed: Optional[float] = None  # knots


class SimulatorStatus(BaseModel):
    active_flights: int
    total_simulated: int


@router.post("/start")
async def start_simulation(
    request: SimulateFlightRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Start simulating flights that pass through a restricted zone
    """
    # Get the restricted area
    polygon_json = request.polygon_json
    
    if request.use_active_restricted_area:
        restricted_area = db.query(RestrictedArea).filter(
            RestrictedArea.is_active == True
        ).first()
        
        if not restricted_area:
            raise HTTPException(
                status_code=404,
                detail="No active restricted area found. Please draw a restricted zone first."
            )
        
        polygon_json = restricted_area.polygon_json
    
    if not polygon_json:
        raise HTTPException(
            status_code=400,
            detail="No restricted area provided"
        )
    
    # Generate flights
    flight_ids = []
    for _ in range(request.num_flights):
        flight_id = simulation_manager.add_flight(
            polygon_json, 
            request.aircraft_type,
            custom_heading=request.custom_heading,
            custom_speed=request.custom_speed
        )
        flight_ids.append(flight_id)
    
    return {
        "status": "success",
        "message": f"Started {request.num_flights} simulated flight(s)",
        "flight_ids": flight_ids,
        "active_flights": simulation_manager.get_active_count()
    }


@router.post("/send-telemetry/{flight_id}")
async def send_flight_telemetry(
    flight_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Send the next telemetry update for a specific flight
    This will trigger the detection and alert system
    """
    from app.routes.flights import ingest_telemetry
    
    telemetry = simulation_manager.get_next_telemetry(flight_id)
    
    if telemetry is None:
        return {
            "status": "complete",
            "message": f"Flight {flight_id} has completed its route"
        }
    
    # Create FlightTelemetry object
    flight_telemetry = FlightTelemetry(**telemetry)
    
    # Send to the actual telemetry ingestion endpoint
    result = await ingest_telemetry(flight_telemetry, db)
    
    return {
        "status": "success",
        "flight_id": flight_id,
        "telemetry": telemetry,
        "ingestion_result": result
    }


@router.post("/send-all-telemetry")
async def send_all_telemetry(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Send telemetry updates for all active flights
    Call this periodically to advance all flights
    """
    from app.routes.flights import ingest_telemetry
    
    results = []
    telemetry_list = simulation_manager.get_all_active_telemetry()
    
    for telemetry_data in telemetry_list:
        flight_id = telemetry_data.pop('flight_id')
        
        # Create FlightTelemetry object
        flight_telemetry = FlightTelemetry(**telemetry_data)
        
        # Send to telemetry ingestion
        result = await ingest_telemetry(flight_telemetry, db)
        
        results.append({
            "flight_id": flight_id,
            "status": "success",
            "result": result
        })
    
    return {
        "status": "success",
        "updates_sent": len(results),
        "active_flights": simulation_manager.get_active_count(),
        "results": results
    }


@router.get("/status", response_model=SimulatorStatus)
async def get_simulator_status(
    current_user: dict = Depends(get_current_user)
):
    """Get current simulator status"""
    return {
        "active_flights": simulation_manager.get_active_count(),
        "total_simulated": simulation_manager.flight_counter
    }


@router.delete("/clear")
async def clear_simulation(
    current_user: dict = Depends(get_current_user)
):
    """Clear all active simulated flights"""
    count = simulation_manager.get_active_count()
    simulation_manager.clear_all()
    
    return {
        "status": "success",
        "message": f"Cleared {count} active flight(s)"
    }


@router.delete("/remove/{flight_id}")
async def remove_flight(
    flight_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a specific simulated flight"""
    simulation_manager.remove_flight(flight_id)
    
    return {
        "status": "success",
        "message": f"Removed flight {flight_id}"
    }


@router.post("/preview-trajectory")
async def preview_trajectory(
    request: SimulateFlightRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Preview the trajectory of a simulated flight without actually starting it
    Useful for visualizing the path on the map
    """
    # Get the restricted area
    polygon_json = request.polygon_json
    
    if request.use_active_restricted_area:
        restricted_area = db.query(RestrictedArea).filter(
            RestrictedArea.is_active == True
        ).first()
        
        if not restricted_area:
            raise HTTPException(
                status_code=404,
                detail="No active restricted area found"
            )
        
        polygon_json = restricted_area.polygon_json
    
    if not polygon_json:
        raise HTTPException(
            status_code=400,
            detail="No restricted area provided"
        )
    
    # Generate flight plan
    flight_plan = FlightSimulator.generate_flight_plan(
        polygon_json,
        request.aircraft_type
    )
    
    return {
        "aircraft_type": flight_plan['aircraft_type'],
        "transponder_id": flight_plan['transponder_id'],
        "speed": flight_plan['speed'],
        "altitude": flight_plan['altitude'],
        "bearing": flight_plan['bearing'],
        "waypoints": [
            {"longitude": wp[0], "latitude": wp[1]} 
            for wp in flight_plan['waypoints']
        ],
        "total_waypoints": len(flight_plan['waypoints'])
    }


@router.post("/manual/register")
async def register_manual_flight(
    telemetry: FlightTelemetry,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Register a manually placed flight to move through the restricted zone
    """
    # Get active restricted area
    restricted_area = db.query(RestrictedArea).filter(
        RestrictedArea.is_active == True
    ).first()
    
    if not restricted_area:
        raise HTTPException(
            status_code=404,
            detail="No active restricted area found. Please draw a restricted zone first."
        )
    
    # Register the manual flight
    flight_id = manual_flight_manager.register_manual_flight(
        transponder_id=telemetry.transponder_id,
        latitude=telemetry.latitude,
        longitude=telemetry.longitude,
        altitude=telemetry.altitude,
        groundspeed=telemetry.groundspeed,
        track=telemetry.track,
        polygon_json=restricted_area.polygon_json
    )
    
    return {
        "status": "success",
        "message": "Manual flight registered and will move through restricted zone",
        "flight_id": flight_id,
        "active_manual_flights": manual_flight_manager.get_active_count()
    }


@router.post("/manual/send-all-telemetry")
async def send_manual_flights_telemetry(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Send telemetry updates for all manual flights (makes them move)
    """
    from app.routes.flights import ingest_telemetry
    
    results = []
    telemetry_list = manual_flight_manager.get_all_active_telemetry()
    
    for telemetry_data in telemetry_list:
        flight_id = telemetry_data.pop('flight_id')
        
        # Create FlightTelemetry object
        flight_telemetry = FlightTelemetry(**telemetry_data)
        
        # Send to telemetry ingestion
        result = await ingest_telemetry(flight_telemetry, db)
        
        results.append({
            "flight_id": flight_id,
            "status": "success",
            "result": result
        })
    
    return {
        "status": "success",
        "updates_sent": len(results),
        "active_manual_flights": manual_flight_manager.get_active_count(),
        "results": results
    }


@router.get("/manual/status")
async def get_manual_flights_status(
    current_user: dict = Depends(get_current_user)
):
    """Get status of manual flights"""
    return {
        "active_flights": manual_flight_manager.get_active_count(),
        "total_registered": manual_flight_manager.flight_counter
    }


@router.delete("/manual/clear")
async def clear_manual_flights(
    current_user: dict = Depends(get_current_user)
):
    """Clear all manual flights"""
    count = manual_flight_manager.get_active_count()
    manual_flight_manager.clear_all()
    
    return {
        "status": "success",
        "message": f"Cleared {count} manual flight(s)"
    }


@router.post("/send-all-combined")
async def send_all_combined_telemetry(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Send telemetry for BOTH auto-simulated AND manual flights
    Use this to move all aircraft at once
    """
    from app.routes.flights import ingest_telemetry
    
    all_results = []
    
    # Get auto-simulated flights
    auto_telemetry = simulation_manager.get_all_active_telemetry()
    for telemetry_data in auto_telemetry:
        flight_id = telemetry_data.pop('flight_id')
        flight_telemetry = FlightTelemetry(**telemetry_data)
        result = await ingest_telemetry(flight_telemetry, db)
        all_results.append({
            "flight_id": flight_id,
            "type": "auto",
            "status": "success",
            "result": result
        })
    
    # Get manual flights
    manual_telemetry = manual_flight_manager.get_all_active_telemetry()
    for telemetry_data in manual_telemetry:
        flight_id = telemetry_data.pop('flight_id')
        flight_telemetry = FlightTelemetry(**telemetry_data)
        result = await ingest_telemetry(flight_telemetry, db)
        all_results.append({
            "flight_id": flight_id,
            "type": "manual",
            "status": "success",
            "result": result
        })
    
    return {
        "status": "success",
        "total_updates": len(all_results),
        "auto_flights": simulation_manager.get_active_count(),
        "manual_flights": manual_flight_manager.get_active_count(),
        "results": all_results
    }
