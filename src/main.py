"""
main.py - FastAPI backend for Stealth Aircraft Detection
"""
from fastapi import FastAPI, Depends, HTTPException, status, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from src.auth import authenticate_user
from src.ml_model import get_detection_results, predict_aircraft

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

sessions = {}

@app.post("/login")
def login(username: str = Form(...), password: str = Form(...)):
    if authenticate_user(username, password):
        sessions[username] = True
        return {"access_token": username, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/detections")
def detections(token: str = Depends(oauth2_scheme)):
    if token not in sessions:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return get_detection_results()

@app.get("/predict/{detection_id}")
def predict(detection_id: int, token: str = Depends(oauth2_scheme)):
    if token not in sessions:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return predict_aircraft(detection_id)
