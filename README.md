# Digital-Twin-of-a-Wholesale-Bakery
A discrete-event simulation of a wholesale bakery’s overnight production. Enter a night’s orders, equipment, and staffing to see whether the morning deadline holds, where time goes, and how machines and workers are used. Compare "what if" scenarios, such as an added fryer or a larger account, before trying them at 5 am.

## Project Structure
```
backend/   Flask app (app.py, errors.py, tests)
data/      JSON data files (users.json)
web/       Front end (HTML, CSS, JS), served by Flask
.env       Local secrets (not committed)
```

## Flask Backend Setup
The backend uses Python and Flask to run a local web server. Flask also serves the front-end files in `web/`, so there is no separate front-end server.

### Requirements
- Python 3.14
- Dependencies listed in `requirements.txt` (Flask, python-dotenv)

### Setup Instructions
Open a terminal in the project's root directory.

1. Create a virtual environment:
   - Windows: `py -m venv .venv`
   - macOS/Linux: `python3 -m venv .venv`

2. Activate the virtual environment:
   - Windows PowerShell: `.\.venv\Scripts\Activate.ps1`
   - macOS/Linux: `source .venv/bin/activate`

3. Install the required dependencies:
   `python -m pip install -r requirements.txt`

4. Create a `.env` file in the project root containing a secret key used to sign login sessions. Generate one with:
   `python -c "import secrets; print(secrets.token_hex(32))"`

   Then put it in `.env`:
   ```
   SECRET_KEY=paste-your-generated-key-here
   ```
   The `.env` file is listed in `.gitignore` and must never be committed. Each developer creates their own.

5. Start the Flask server:
   `python -m flask --app backend.app run --debug`

6. Open http://127.0.0.1:5000/login.html in a browser.

To stop the server, press Ctrl+C in the terminal.

### Logging In
Login uses an 8-digit user ID stored in `data/users.json`. For local testing, use an ID from that file (for example `10000001`). A successful login starts a session (a signed cookie), and the dashboard checks it on load.

Authentication routes:
- `POST /api/login` – start a session with `{"userID": "10000001"}`
- `POST /api/logout` – end the session
- `GET /api/me` – return the logged-in user (requires a session)

Routes that return data should use the `@login_required` decorator in `backend/app.py`.

### Error Handling
The backend returns JSON error responses for HTTP errors and unexpected server errors.

Error response format:
```json
{
  "error": {
    "code": "error_type",
    "message": "Error description"
  }
}
```

### Testing
Run the error handler test from the project root:
`python -m backend.test_errors`

The test intentionally raises an exception to verify the 500 error handler. An error traceback in the terminal is expected.

The Flask development server is intended for local development and testing only.