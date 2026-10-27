import json
import re
from pathlib import Path
from flask import Flask, jsonify, request, abort
from backend.errors import register_error_handlers

app = Flask(__name__)
register_error_handlers(app)

STATIC_DIR = Path(__file__).parent.parent / "web"
DATA_DIR = Path(__file__).parent.parent / "data"
USERS_FILE = DATA_DIR / "users.json"
app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")

def load_users():
    with open(USERS_FILE, encoding="utf-8") as f:
        return json.load(f)["users"]

@app.route("/")
def home():
    return jsonify({"message": "Running!"})

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    user_id = str(data.get("userID", "")).strip()

    if not user_id:
        abort(400, description="User ID is required.")

    if not re.fullmatch(r"[0-9]{8}", user_id):
        abort(400, description="User ID must be exactly 8 digits.")

    user = next((u for u in load_users() if u["userID"] == user_id), None)
    if user is None:
        abort(401, description="Invalid user ID.")

    return jsonify({"user": {"userID": user["userID"], "name": user["name"]}})