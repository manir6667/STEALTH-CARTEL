"""
Reset database and create Salem restricted area
"""
import json
import os
from app.database import init_db, get_db
from app.models import User, RestrictedArea
from app.auth import get_password_hash

# Delete old database
db_path = "aircraft_detection.db"
if os.path.exists(db_path):
    os.remove(db_path)
    print(f"✓ Deleted old database: {db_path}")

# Initialize new database
init_db()
print("✓ Initialized new database")

# Seed data
db = next(get_db())

# Create admin user
admin_user = User(
    email="admin@example.com",
    hashed_password=get_password_hash("strongpassword"),
    role="admin"
)
db.add(admin_user)
print("✓ Created admin user")

# Create restricted area in Salem, Tamil Nadu
salem_area = RestrictedArea(
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
db.add(salem_area)
print("✓ Created Salem restricted area")
print(f"  Coordinates: 11.60°N - 11.70°N, 78.10°E - 78.20°E")

db.commit()
db.close()

print("\n🎯 Database reset complete! Salem restricted area is now active.")
