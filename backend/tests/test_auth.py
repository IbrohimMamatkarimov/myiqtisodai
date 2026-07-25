def test_register_and_login(client, unique_email):
    register_res = client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "SecurePass123", "full_name": "Test User"},
    )
    assert register_res.status_code == 201
    assert register_res.json()["email"] == unique_email

    login_res = client.post(
        "/api/v1/auth/login", json={"email": unique_email, "password": "SecurePass123"}
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_login_wrong_password_fails(client, unique_email):
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "SecurePass123", "full_name": "Test User"},
    )
    res = client.post("/api/v1/auth/login", json={"email": unique_email, "password": "WrongPass1"})
    assert res.status_code == 401


def test_duplicate_registration_fails(client, unique_email):
    payload = {"email": unique_email, "password": "SecurePass123", "full_name": "Test User"}
    first = client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201
    second = client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 400


def test_get_me_requires_auth(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_get_me_with_token(client, unique_email):
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "SecurePass123", "full_name": "Test User"},
    )
    login_res = client.post(
        "/api/v1/auth/login", json={"email": unique_email, "password": "SecurePass123"}
    )
    token = login_res.json()["access_token"]

    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == unique_email
