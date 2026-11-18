"""Bind host and CORS defaults of the example server."""

import importlib
import sys

import pytest
from fastapi.testclient import TestClient

PREFLIGHT_HEADERS = {"Access-Control-Request-Method": "POST"}


def load_main(monkeypatch, **env):
    monkeypatch.setattr("dotenv.load_dotenv", lambda *args, **kwargs: False)
    for name in ("HOST", "CORS_ORIGINS"):
        monkeypatch.delenv(name, raising=False)
    for name, value in env.items():
        monkeypatch.setenv(name, value)
    sys.modules.pop("main", None)
    return importlib.import_module("main")


def preflight(module, origin):
    client = TestClient(module.app)
    return client.options("/assistant", headers={**PREFLIGHT_HEADERS, "Origin": origin})


def test_main_binds_to_localhost_by_default(monkeypatch):
    module = load_main(monkeypatch)
    calls = []
    monkeypatch.setattr(module.uvicorn, "run", lambda *args, **kwargs: calls.append(kwargs))

    module.main()

    assert calls[0]["host"] == "127.0.0.1"


def test_main_uses_host_env(monkeypatch):
    module = load_main(monkeypatch, HOST="0.0.0.0")
    calls = []
    monkeypatch.setattr(module.uvicorn, "run", lambda *args, **kwargs: calls.append(kwargs))

    module.main()

    assert calls[0]["host"] == "0.0.0.0"


def test_default_origin_gets_credentialed_cors(monkeypatch):
    response = preflight(load_main(monkeypatch), "http://localhost:3000")

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert response.headers["access-control-allow-credentials"] == "true"


def test_other_origin_is_not_allowed_by_default(monkeypatch):
    response = preflight(load_main(monkeypatch), "https://evil.example")

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


@pytest.mark.parametrize("cors_origins", ["*", "http://localhost:3000, *"])
def test_wildcard_origins_drop_credentials(monkeypatch, cors_origins):
    response = preflight(load_main(monkeypatch, CORS_ORIGINS=cors_origins), "https://evil.example")

    assert response.headers["access-control-allow-origin"] == "*"
    assert "access-control-allow-credentials" not in response.headers
