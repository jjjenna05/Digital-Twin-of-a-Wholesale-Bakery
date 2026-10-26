from backend.app import app

@app.route("/test-500")
def cause_error():
    raise RuntimeError("Intentional test error")

with app.test_client() as client:
    response = client.get("/test-500")
    assert response.status_code == 500
    assert response.get_json()["error"]["code"] == "internal_server_error"
    print("500 error handler test passed!")
