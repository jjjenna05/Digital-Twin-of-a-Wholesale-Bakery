# Digital-Twin-of-a-Wholesale-Bakery
A discrete-event simulation of a wholesale bakery’s overnight production. Enter a night’s orders, equipment, and staffing to see whether the morning deadline holds, where time goes, and how machines and workers are used. Compare "what if" scenarios, such as an added fryer or a larger account, before trying them at 5 am.


## Flask Backend Setup
The backend uses Python and Flask to run a local web server.

### Requirements
- Python 3.14
- Dependencies listed in `requirements.txt`

### Setup Instructions
Open a terminal in the project's root directory.

1. Create a virtual environment:
   py -m venv .venv

2. Activate the virtual environment (Windows PowerShell):
   .\.venv\Scripts\Activate.ps1

3. Install the required dependencies:
   python -m pip install -r requirements.txt

4. Start the Flask server:
   python -m flask --app backend.app run --debug

5. Open http://127.0.0.1:5000/ in a browser.

To stop the server, press Ctrl+C in the terminal.

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
python -m backend.test_errors

The test intentionally raises an exception to verify the 500 error handler. An error traceback in the terminal is expected.
The Flask development server is intended for local development and testing only.
