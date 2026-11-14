import json
import os
import re
from functools import wraps
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, jsonify, request, abort, session, redirect, send_from_directory
from backend.errors import register_error_handlers
from engine.engine import run_night, ConfigError

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

#every pages needs login except for the login page
@app.route("/<page>.html")
def show_page(page):
    if page == "login":
        return send_from_directory(STATIC_DIR, "login.html")
    return serve_protected(page + ".html")

#go to dashboard if logged in, otherwise login page
@app.route("/")
def home():
    if "user_id" not in session:
        return redirect("/login.html")
    return redirect("/dashboard.html")

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

#send config data to onfig page
@app.route("/api/config")
@login_required
def get_config():
    return send_from_directory(DATA_DIR, "config.sample.json")


#run the simulation and return the event log and summary
@app.route("/api/simulate", methods=["POST"])
@login_required
def simulate():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        abort(400, description="JSON data is required.")

    config = data.get("config")
    scenario = data.get("scenario")

    if not isinstance(config, dict):
        abort(400, description="Bakery configuration is required.")

    if not isinstance(scenario, dict):
        abort(400, description="Scenario is required.")

    #check required configuration fields
    for field in ["units", "steps", "roles", "equipment", "recipes"]:
        if field not in config:
            abort(400, description="Missing configuration field: " + field)
        if not isinstance(config[field], list):
            abort(400, description="Configuration field must be a list: " + field)

    #check required scenario fields
    for field in ["name", "startClock", "orders", "staff", "equipment"]:
        if field not in scenario:
            abort(400, description="Missing scenario field: " + field)

    #check scenario field types
    for field in ["orders", "staff", "equipment"]:
        if not isinstance(scenario[field], list):
            abort(400, description="Scenario field must be a list: " + field)

    for field in ["name", "startClock"]:
        if not isinstance(scenario[field], str):
            abort(400, description="Scenario field must be a string: " + field)

    #run the simulation using the engine
    try:
        result = run_night(config, scenario, include_summary=True)
    except ConfigError as error:
        abort(400, description=str(error))

    return jsonify(result)