import unittest
from unittest.mock import AsyncMock

from origin_guard import AgentOriginGuard


def request_scope(origin, path="/agent", method="POST"):
    headers = [] if origin is None else [(b"origin", origin.encode("latin-1"))]
    return {"type": "http", "method": method, "path": path, "headers": headers}


class AgentOriginGuardTests(unittest.IsolatedAsyncioTestCase):
    async def test_foreign_origin_is_rejected_before_body_or_agent(self):
        app, receive, send = AsyncMock(), AsyncMock(), AsyncMock()
        guard = AgentOriginGuard(app, ["https://frontend.example"])

        await guard(request_scope("https://attacker.example"), receive, send)

        app.assert_not_awaited()
        receive.assert_not_awaited()
        self.assertEqual(send.await_args_list[0].args[0]["status"], 403)

    async def test_configured_origin_reaches_the_agent(self):
        app, receive, send = AsyncMock(), AsyncMock(), AsyncMock()
        guard = AgentOriginGuard(app, ["https://frontend.example"])

        await guard(request_scope("https://frontend.example"), receive, send)

        app.assert_awaited_once()
        send.assert_not_awaited()

    async def test_wildcard_allows_any_origin(self):
        app, receive, send = AsyncMock(), AsyncMock(), AsyncMock()
        guard = AgentOriginGuard(app, ["https://frontend.example", "*"])

        await guard(request_scope("https://another.example"), receive, send)

        app.assert_awaited_once()
        send.assert_not_awaited()

    async def test_missing_origin_remains_supported(self):
        app, receive, send = AsyncMock(), AsyncMock(), AsyncMock()
        guard = AgentOriginGuard(app, ["https://frontend.example"])

        await guard(request_scope(None), receive, send)

        app.assert_awaited_once()
        send.assert_not_awaited()

    async def test_unrelated_routes_are_not_rejected(self):
        app, receive, send = AsyncMock(), AsyncMock(), AsyncMock()
        guard = AgentOriginGuard(app, ["https://frontend.example"])

        await guard(
            request_scope("https://attacker.example", path="/health", method="GET"),
            receive,
            send,
        )

        app.assert_awaited_once()
        send.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
