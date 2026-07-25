def _auth_headers(client, unique_email):
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "SecurePass123", "full_name": "Test User"},
    )
    login_res = client.post(
        "/api/v1/auth/login", json={"email": unique_email, "password": "SecurePass123"}
    )
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_and_list_expense(client, unique_email):
    headers = _auth_headers(client, unique_email)

    create_res = client.post(
        "/api/v1/expenses",
        json={"amount": 50000, "currency": "UZS", "description": "Lunch", "expense_date": "2026-07-20"},
        headers=headers,
    )
    assert create_res.status_code == 201
    expense_id = create_res.json()["id"]

    list_res = client.get("/api/v1/expenses", headers=headers)
    assert list_res.status_code == 200
    assert list_res.json()["total"] == 1
    assert list_res.json()["items"][0]["id"] == expense_id


def test_update_and_delete_expense(client, unique_email):
    headers = _auth_headers(client, unique_email)

    create_res = client.post(
        "/api/v1/expenses",
        json={"amount": 100000, "expense_date": "2026-07-20"},
        headers=headers,
    )
    expense_id = create_res.json()["id"]

    update_res = client.patch(
        f"/api/v1/expenses/{expense_id}", json={"amount": 150000}, headers=headers
    )
    assert update_res.status_code == 200
    assert float(update_res.json()["amount"]) == 150000.0

    delete_res = client.delete(f"/api/v1/expenses/{expense_id}", headers=headers)
    assert delete_res.status_code == 204

    get_res = client.get(f"/api/v1/expenses/{expense_id}", headers=headers)
    assert get_res.status_code == 404


def test_expense_requires_auth(client):
    res = client.get("/api/v1/expenses")
    assert res.status_code == 401


def test_expense_invalid_amount_rejected(client, unique_email):
    headers = _auth_headers(client, unique_email)
    res = client.post(
        "/api/v1/expenses",
        json={"amount": -10, "expense_date": "2026-07-20"},
        headers=headers,
    )
    assert res.status_code == 422
