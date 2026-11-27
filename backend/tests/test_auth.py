from app.api.v1.endpoints import auth


def test_register_verify_and_login(client, unique_email, verification_mailbox):
    payload = {"email": unique_email, "password": "SecurePass123", "language": "uz"}
    registered = client.post("/api/v1/auth/register", json=payload)
    assert registered.status_code == 201
    assert registered.json()["email"] == unique_email
    assert client.post("/api/v1/auth/login", json=payload).status_code == 403

    verified = client.post("/api/v1/auth/verify-email", json={"token": verification_mailbox[unique_email]})
    assert verified.status_code == 200
    login = client.post("/api/v1/auth/login", json=payload)
    assert login.status_code == 200
    assert login.json()["user"]["email"] == unique_email
    assert login.json()["access_token"]


def test_wrong_password_fails(client, verified_account):
    payload = {**verified_account, "password": "WrongPass1"}
    assert client.post("/api/v1/auth/login", json=payload).status_code == 401


def test_verified_registration_is_not_replaced(client, verified_account):
    payload = {**verified_account, "password": "DifferentPassword123"}
    assert client.post("/api/v1/auth/register", json=payload).status_code == 400
    assert client.post("/api/v1/auth/login", json=verified_account).status_code == 200


def test_delivery_failure_and_retry(client, unique_email, verification_mailbox, monkeypatch):
    payload = {"email": unique_email, "password": "SecurePass123"}
    send = auth.send_verification_email
    monkeypatch.setattr(auth, "send_verification_email", lambda *_: False)
    failed = client.post("/api/v1/auth/register", json=payload)
    assert failed.status_code == 503
    assert failed.json()["detail"]["code"] == "verification_delivery_failed"
    assert client.post("/api/v1/auth/resend-verification", json={"email": unique_email}).status_code == 503

    monkeypatch.setattr(auth, "send_verification_email", send)
    assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    assert client.post("/api/v1/auth/verify-email", json={"token": verification_mailbox[unique_email]}).status_code == 200
    assert client.post("/api/v1/auth/login", json=payload).status_code == 200


def test_verified_google_registration(client, unique_email, monkeypatch):
    monkeypatch.setattr(auth.settings, "GOOGLE_CLIENT_ID", "local-test-client")
    monkeypatch.setattr(auth.google_id_token, "verify_oauth2_token", lambda *_: {
        "email": unique_email, "email_verified": True, "name": "Test User",
    })
    login = client.post("/api/v1/auth/google", json={"credential": "local-google-fixture"})
    assert login.status_code == 200
    assert login.json()["user"]["is_email_verified"] is True
    assert login.json()["user"]["onboarding_completed"] is False


def test_get_me_requires_auth(client):
    assert client.get("/api/v1/auth/me").status_code == 401


def test_get_me_with_token(client, verified_account):
    login = client.post("/api/v1/auth/login", json=verified_account)
    token = login.json()["access_token"]
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == verified_account["email"]
