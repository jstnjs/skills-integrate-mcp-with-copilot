"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Depends, Cookie
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
from typing import Optional
import os
import json
import bcrypt
import secrets
from pathlib import Path

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# Load teachers data
teachers_file = os.path.join(current_dir, "teachers.json")
with open(teachers_file, 'r') as f:
    teachers_data = json.load(f)

# In-memory session storage (maps session_id -> username)
sessions = {}

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"]
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"]
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"]
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"]
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"]
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"]
    }
}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


# Authentication helper function
def get_current_user(session_id: Optional[str] = Cookie(None)) -> Optional[str]:
    """Get the current logged-in user from session cookie"""
    if session_id and session_id in sessions:
        return sessions[session_id]
    return None


def require_auth(session_id: Optional[str] = Cookie(None)) -> str:
    """Require authentication, raise exception if not logged in"""
    user = get_current_user(session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


@app.post("/auth/login")
def login(username: str, password: str):
    """Login endpoint for teachers"""
    # Find teacher by username
    teacher = next((t for t in teachers_data["teachers"] if t["username"] == username), None)
    
    if not teacher:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    password_bytes = password.encode('utf-8')
    stored_hash = teacher["password_hash"].encode('utf-8')
    
    if not bcrypt.checkpw(password_bytes, stored_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session_id = secrets.token_urlsafe(32)
    sessions[session_id] = username
    
    # Create response with session cookie
    response = JSONResponse({"message": "Logged in successfully", "username": username})
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        max_age=86400,  # 24 hours
        samesite="lax"
    )
    return response


@app.post("/auth/logout")
def logout(session_id: Optional[str] = Cookie(None)):
    """Logout endpoint"""
    if session_id and session_id in sessions:
        del sessions[session_id]
    
    response = JSONResponse({"message": "Logged out successfully"})
    response.delete_cookie("session_id")
    return response


@app.get("/auth/status")
def auth_status(session_id: Optional[str] = Cookie(None)):
    """Check authentication status"""
    user = get_current_user(session_id)
    if user:
        return {"authenticated": True, "username": user}
    return {"authenticated": False}


@app.get("/activities")
def get_activities():
    return activities


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str, current_user: str = Depends(require_auth)):
    """Sign up a student for an activity (requires authentication)"""
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Add student
    activity["participants"].append(email)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str, current_user: str = Depends(require_auth)):
    """Unregister a student from an activity (requires authentication)"""
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(email)
    return {"message": f"Unregistered {email} from {activity_name}"}
