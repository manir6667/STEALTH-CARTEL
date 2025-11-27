"""
Restricted area management routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from datetime import datetime
from app.database import get_db
from app.models import RestrictedArea
from app.auth import get_current_user, get_admin_user
import json

router = APIRouter(prefix="/api/restricted-areas", tags=["restricted-areas"])


class RestrictedAreaCreate(BaseModel):
    name: str
    polygon_json: str  # GeoJSON polygon


class RestrictedAreaUpdate(BaseModel):
    is_active: bool


class RestrictedAreaResponse(BaseModel):
    id: int
    name: str
    polygon_json: str
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True


@router.post("/", response_model=RestrictedAreaResponse, status_code=201)
async def create_restricted_area(
    area: RestrictedAreaCreate,
    current_user: dict = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new restricted area (admin only)"""
    # Validate JSON
    try:
        json.loads(area.polygon_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid GeoJSON polygon")
    
    new_area = RestrictedArea(
        name=area.name,
        polygon_json=area.polygon_json
    )
    db.add(new_area)
    db.commit()
    db.refresh(new_area)
    
    return new_area


@router.get("/", response_model=List[RestrictedAreaResponse])
async def list_restricted_areas(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all restricted areas"""
    areas = db.query(RestrictedArea).all()
    return areas


@router.get("/active", response_model=RestrictedAreaResponse)
async def get_active_restricted_area(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the currently active restricted area"""
    area = db.query(RestrictedArea).filter(RestrictedArea.is_active == True).first()
    if not area:
        raise HTTPException(status_code=404, detail="No active restricted area")
    return area


@router.patch("/{area_id}/toggle")
async def toggle_restricted_area(
    area_id: int,
    current_user: dict = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Toggle restricted area active status (admin only)"""
    area = db.query(RestrictedArea).filter(RestrictedArea.id == area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="Restricted area not found")
    
    area.is_active = not area.is_active
    db.commit()
    
    return {"status": "success", "is_active": area.is_active}


@router.patch("/{area_id}", response_model=RestrictedAreaResponse)
async def update_restricted_area(
    area_id: int,
    update: RestrictedAreaUpdate,
    current_user: dict = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update restricted area active status (admin only)"""
    area = db.query(RestrictedArea).filter(RestrictedArea.id == area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="Restricted area not found")
    
    area.is_active = update.is_active
    db.commit()
    db.refresh(area)
    
    return area


@router.delete("/{area_id}", status_code=204)
async def delete_restricted_area(
    area_id: int,
    current_user: dict = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a restricted area (admin only)"""
    area = db.query(RestrictedArea).filter(RestrictedArea.id == area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="Restricted area not found")
    
    db.delete(area)
    db.commit()
    
    return None
