import json
import os
import re
from functools import wraps
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, jsonify, request, abort, session, redirect, send_from_directory
from backend.errors import register_error_handlers

load_dotenv()

STATIC_DIR = Path(__file__).parent.parent / "web"
DATA_DIR = Path(__file__).parent.parent / "data"
USERS_FILE = DATA_DIR / "users.json"
RUNS_DIR = DATA_DIR / "runs"

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

#send config data to config page
@app.route("/api/config")
@login_required
def get_config():
    return send_from_directory(DATA_DIR, "config.sample.json")


#run simulation

def read_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

#saved Orders: scenario.json, or the sample if it does not exist yet
def load_scenario():
    path = DATA_DIR / "scenario.json"
    if not path.exists():
        path = DATA_DIR / "scenario.sample.json"
    return read_json(path)

def load_config():
    return read_json(DATA_DIR / "config.sample.json")

#the engine's answer; copied from the sample until the engine is ready (read only)
def run_engine(scenario, config):
    log = read_json(DATA_DIR / "eventlog.sample.json")
    return {"startClock": log["startClock"], "rows": log["rows"], "summary": log["summary"]}

#Saves Name
def run_file_name(name):
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not slug:
        abort(400, description="Run name needs at least one letter or number.")
    return slug + ".json"

#names of the saved Orders (only one for now)
@app.route("/api/scenarios")
@login_required
def list_scenarios():
    return jsonify([load_scenario()["name"]])

#names of the saved configurations (only one for now)
@app.route("/api/configs")
@login_required
def list_configs():
    return jsonify([load_config()["name"]])

#run a simulation and save it as data/runs/<name>.json
@app.route("/api/runs", methods=["POST"])
@login_required
def create_run():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    scenario_name = str(data.get("scenario", "")).strip()
    config_name = str(data.get("config", "")).strip()
    if not name:
        abort(400, description="Run name is required.")
    file_name = run_file_name(name)

    scenario = load_scenario()
    if scenario_name != scenario["name"]:
        abort(404, description="Saved Orders not found.")
    config = load_config()
    if config_name != config["name"]:
        abort(404, description="Configuration not found.")

    result = run_engine(scenario, config)
    run = {
        "name": name,
        "ranAt": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "scenario": scenario,
        "config": config,
        "startClock": result["startClock"],
        "rows": result["rows"],
        "summary": result["summary"],
    }

    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    with open(RUNS_DIR / file_name, "w", encoding="utf-8") as f:   # same name replaces the old run
        json.dump(run, f, indent=2)
    return jsonify({"name": name, "file": file_name}), 201

#send one saved run (the Results page uses it)
@app.route("/api/runs/<path:name>")
@login_required
def get_run(name):
    file_name = run_file_name(name)
    if not (RUNS_DIR / file_name).exists():
        abort(404, description="Run not found.")
    response = send_from_directory(RUNS_DIR, file_name)
    response.headers["Cache-Control"] = "no-store"
    return response
