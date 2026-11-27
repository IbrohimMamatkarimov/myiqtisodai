import os
import uuid

os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest-only")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base_class import Base
from app.db.session import get_db
from app.main import app
from app import models  # noqa: F401


@pytest.fixture(scope="function")
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def unique_email() -> str:
    return f"test-{uuid.uuid4().hex[:8]}@example.com"


@pytest.fixture
def verification_mailbox(monkeypatch):
    from app.api.v1.endpoints import auth

    mailbox = {}
    def send(email, token):
        mailbox[email] = token
        return True

    monkeypatch.setattr(auth, "send_verification_email", send)
    return mailbox


@pytest.fixture
def verified_account(client, unique_email, verification_mailbox):
    password = "SecurePass123"
    result = client.post("/api/v1/auth/register", json={"email": unique_email, "password": password})
    assert result.status_code == 201
    verified = client.post("/api/v1/auth/verify-email", json={"token": verification_mailbox[unique_email]})
    assert verified.status_code == 200
    return {"email": unique_email, "password": password}
