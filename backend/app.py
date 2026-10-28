import json
import os
import re
from functools import wraps
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, jsonify, request, abort, session, redirect, send_from_directory
from backend.errors import register_error_handlers

load_dotenv()

STATIC_DIR = Path(__file__).parent.parent / "web"
DATA_DIR = Path(__file__).parent.parent / "data"
USERS_FILE = DATA_DIR / "users.json"

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")
app.config["SECRET_KEY"] = os.environ["SECRET_KEY"]
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
register_error_handlers(app)

def load_users():
    with open(USERS_FILE, encoding="utf-8") as f:
        return json.load(f)["users"]

def find_user(user_id):
    return next((u for u in load_users() if str(u["userID"]) == user_id), None)


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            abort(401, description="You must be logged in.")
        return view(*args, **kwargs)
    return wrapped

def serve_protected(filename):
    if "user_id" not in session:
        return redirect("/login.html")
    response = send_from_directory(STATIC_DIR, filename)
    response.headers["Cache-Control"] = "no-store"
    return response

@app.route("/dashboard.html")
def dashboard_page():
    return serve_protected("dashboard.html")

@app.route("/config.html")
def config_page():
    return serve_protected("config.html")

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

    user = find_user(user_id)
    if user is None:
        abort(401, description="Invalid user ID.")

    session.clear()                    # start fresh, discarding any old session
    session["user_id"] = str(user["userID"])
    return jsonify({"user": {"userID": str(user["userID"]), "name": user["name"]}})


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out."})


@app.route("/api/me")
@login_required
def me():
    user = find_user(session["user_id"])
    if user is None:                   # user was removed from users.json
        session.clear()
        abort(401, description="You must be logged in.")
    return jsonify({"user": {"userID": str(user["userID"]), "name": user["name"]}})