from flask import Flask, jsonify
from backend.errors import register_error_handlers

app = Flask(__name__)
register_error_handlers(app)

@app.route("/")
def home():
    return jsonify({"message": "Running!"})
