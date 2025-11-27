"""
Alert management routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models import Alert, User
from app.auth import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class AlertResponse(BaseModel):
    id: int
    flight_id: int
    transponder_id: Optional[str]
    severity: str
    message: str
    timestamp: datetime
    acknowledged: bool
    acknowledged_by: Optional[int]
    acknowledged_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class AcknowledgeAlert(BaseModel):
    alert_id: int


@router.get("/", response_model=List[AlertResponse])
async def list_alerts(
    acknowledged: Optional[bool] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all alerts, optionally filter by acknowledged status"""
    query = db.query(Alert)
    
    if acknowledged is not None:
        query = query.filter(Alert.acknowledged == acknowledged)
    
    alerts = query.order_by(Alert.timestamp.desc()).all()
    return alerts


@router.post("/acknowledge")
async def acknowledge_alert(
    data: AcknowledgeAlert,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Acknowledge an alert"""
    alert = db.query(Alert).filter(Alert.id == data.alert_id).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    if alert.acknowledged:
        raise HTTPException(status_code=400, detail="Alert already acknowledged")
    
    # Get user ID
    user = db.query(User).filter(User.email == current_user["email"]).first()
    
    alert.acknowledged = True
    alert.acknowledged_by = user.id
    alert.acknowledged_at = datetime.utcnow()
    
    db.commit()
    
    return {"status": "success", "alert_id": alert.id}


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific alert details"""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert
