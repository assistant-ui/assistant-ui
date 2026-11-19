class AgentOriginGuard:
    def __init__(self, app, allowed_origins):
        self.app = app
        self.allowed_origins = frozenset(allowed_origins)

    async def __call__(self, scope, receive, send):
        if (
            scope["type"] == "http"
            and scope["method"] == "POST"
            and scope["path"] == "/agent"
        ):
            origin = next(
                (
                    value.decode("latin-1")
                    for name, value in scope.get("headers", ())
                    if name.lower() == b"origin"
                ),
                None,
            )
            if (
                origin is not None
                and "*" not in self.allowed_origins
                and origin not in self.allowed_origins
            ):
                body = b'{"detail":"Cross-origin requests are not allowed."}'
                await send(
                    {
                        "type": "http.response.start",
                        "status": 403,
                        "headers": [
                            (b"content-type", b"application/json"),
                            (b"content-length", str(len(body)).encode("ascii")),
                        ],
                    }
                )
                await send({"type": "http.response.body", "body": body})
                return

        await self.app(scope, receive, send)
