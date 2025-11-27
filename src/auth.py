"""
auth.py - Simple username/password authentication
"""
USERS = {
    "admin": "password123",
    "user": "testpass"
}

def authenticate_user(username: str, password: str) -> bool:
    """Check if username/password is valid."""
    return USERS.get(username) == password
