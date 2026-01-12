"""Kitchen Sink Lite MCP server implemented with FastMCP (Python).

This server pairs with the `src/kitchen-sink-lite` widget bundle. It exposes two
tools:
- `kitchen-sink-show` renders the widget and echoes the provided message
- `kitchen-sink-refresh` is a lightweight echo tool meant to be called from the
  widget via `window.openai.callTool`

Both tools return the same widget template so the Apps SDK can hydrate the UI
with updated structured content.
"""

from __future__ import annotations

import os
from copy import deepcopy
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

import mcp.types as types
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from pydantic import BaseModel, ConfigDict, Field, ValidationError


ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"
TEMPLATE_URI = "ui://widget/kitchen-sink-lite.html"
MIME_TYPE = "text/html+skybridge"


class WidgetPayload(BaseModel):
    message: str
    accentColor: str | None = Field(
        default="#2d6cdf", description="Accent color to highlight the widget."
    )
    details: str | None = Field(
        default=None,
        description="Optional detail text that appears under the headline.",
    )
    fromTool: str = Field(
        default="kitchen-sink-show", description="Tool that produced the payload."
    )


class ShowInput(BaseModel):
    """Schema for kitchen-sink-show tool."""
    message: str = Field(..., description="Primary message to render in the widget.")
    accent_color: str = Field(
        default="#2d6cdf",
        alias="accentColor",
        description="Accent color for the widget header.",
    )
    details: str | None = Field(
        default=None,
        description="Optional supporting copy shown under the main message.",
    )
    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class RefreshInput(BaseModel):
    """Schema for kitchen-sink-refresh tool."""
    message: str = Field(..., description="Message to echo back.")
    model_config = ConfigDict(populate_by_name=True, extra="forbid")


@lru_cache(maxsize=None)
def load_widget_html() -> str:
    direct = ASSETS_DIR / "kitchen-sink-lite.html"
    if direct.exists():
        return direct.read_text(encoding="utf8")

    candidates = sorted(ASSETS_DIR.glob("kitchen-sink-lite-*.html"))
    if candidates:
        return candidates[-1].read_text(encoding="utf8")

    raise FileNotFoundError(
        f"Widget HTML for kitchen-sink-lite not found in {ASSETS_DIR}. "
        "Run `pnpm run build` from the repo root to generate assets."
    )


def tool_meta() -> Dict[str, Any]:
    return {
        "openai/outputTemplate": TEMPLATE_URI,
        "openai/toolInvocation/invoking": "Preparing the kitchen sink widget",
        "openai/toolInvocation/invoked": "Widget rendered",
        "openai/widgetAccessible": True,
    }


def _split_env_list(value: str | None) -> List[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _transport_security_settings() -> TransportSecuritySettings:
    allowed_hosts = _split_env_list(os.getenv("MCP_ALLOWED_HOSTS"))
    allowed_origins = _split_env_list(os.getenv("MCP_ALLOWED_ORIGINS"))
    if not allowed_hosts and not allowed_origins:
        return TransportSecuritySettings(enable_dns_rebinding_protection=False)
    return TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=allowed_hosts,
        allowed_origins=allowed_origins,
    )


mcp = FastMCP(
    name="kitchen-sink-python",
    stateless_http=True,
    transport_security=_transport_security_settings(),
)


SHOW_TOOL_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "message": {"type": "string", "description": "Primary message to render in the widget."},
        "accentColor": {"type": "string", "description": "Accent color for the widget header."},
        "details": {"type": "string", "description": "Optional supporting copy shown under the main message."},
    },
    "required": ["message"],
    "additionalProperties": False,
}

REFRESH_TOOL_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "message": {"type": "string", "description": "Message to echo back."},
    },
    "required": ["message"],
    "additionalProperties": False,
}


@mcp._mcp_server.list_tools()
async def _list_tools() -> List[types.Tool]:
    return [
        types.Tool(
            name="kitchen-sink-show",
            title="Show Kitchen Sink Widget",
            description="Renders the kitchen sink demo widget with a custom message.",
            inputSchema=deepcopy(SHOW_TOOL_SCHEMA),
            _meta=tool_meta(),
            annotations={
                "destructiveHint": False,
                "openWorldHint": False,
                "readOnlyHint": True,
            },
        ),
        types.Tool(
            name="kitchen-sink-refresh",
            title="Refresh Kitchen Sink Widget",
            description="Echo tool to refresh the widget from within the UI.",
            inputSchema=deepcopy(REFRESH_TOOL_SCHEMA),
            _meta=tool_meta(),
            annotations={
                "destructiveHint": False,
                "openWorldHint": False,
                "readOnlyHint": True,
            },
        ),
    ]


@mcp._mcp_server.list_resources()
async def _list_resources() -> List[types.Resource]:
    return [
        types.Resource(
            name="Kitchen Sink Lite Widget",
            title="Kitchen Sink Lite Widget",
            uri=TEMPLATE_URI,
            description="Kitchen sink lite widget markup",
            mimeType=MIME_TYPE,
            _meta=tool_meta(),
        )
    ]


@mcp._mcp_server.list_resource_templates()
async def _list_resource_templates() -> List[types.ResourceTemplate]:
    return [
        types.ResourceTemplate(
            name="Kitchen Sink Lite Widget",
            title="Kitchen Sink Lite Widget",
            uriTemplate=TEMPLATE_URI,
            description="Kitchen sink lite widget markup",
            mimeType=MIME_TYPE,
            _meta=tool_meta(),
        )
    ]


async def _handle_read_resource(req: types.ReadResourceRequest) -> types.ServerResult:
    if str(req.params.uri) != TEMPLATE_URI:
        return types.ServerResult(
            types.ReadResourceResult(
                contents=[],
                _meta={"error": f"Unknown resource: {req.params.uri}"},
            )
        )

    contents = [
        types.TextResourceContents(
            uri=TEMPLATE_URI,
            mimeType=MIME_TYPE,
            text=load_widget_html(),
            _meta=tool_meta(),
        )
    ]
    return types.ServerResult(types.ReadResourceResult(contents=contents))


async def _call_tool_request(req: types.CallToolRequest) -> types.ServerResult:
    arguments = req.params.arguments or {}

    if req.params.name == "kitchen-sink-show":
        try:
            payload_in = ShowInput.model_validate(arguments)
        except ValidationError as exc:
            return types.ServerResult(
                types.CallToolResult(
                    content=[types.TextContent(type="text", text=f"Input validation error: {exc.errors()}")],
                    isError=True,
                )
            )
        payload = WidgetPayload(
            message=payload_in.message,
            accentColor=payload_in.accent_color,
            details=payload_in.details,
            fromTool="kitchen-sink-show",
        )
        return types.ServerResult(
            types.CallToolResult(
                content=[types.TextContent(type="text", text=f"Widget ready with message: {payload.message}")],
                structuredContent=payload.model_dump(mode="json"),
                _meta=tool_meta(),
            )
        )

    elif req.params.name == "kitchen-sink-refresh":
        try:
            payload_in = RefreshInput.model_validate(arguments)
        except ValidationError as exc:
            return types.ServerResult(
                types.CallToolResult(
                    content=[types.TextContent(type="text", text=f"Input validation error: {exc.errors()}")],
                    isError=True,
                )
            )
        payload = WidgetPayload(
            message=payload_in.message,
            accentColor="#2d6cdf",
            details="This response came from the widget via window.openai.callTool.",
            fromTool="kitchen-sink-refresh",
        )
        return types.ServerResult(
            types.CallToolResult(
                content=[types.TextContent(type="text", text=payload.message)],
                structuredContent=payload.model_dump(mode="json"),
                _meta=tool_meta(),
            )
        )

    return types.ServerResult(
        types.CallToolResult(
            content=[types.TextContent(type="text", text=f"Unknown tool: {req.params.name}")],
            isError=True,
        )
    )


mcp._mcp_server.request_handlers[types.CallToolRequest] = _call_tool_request
mcp._mcp_server.request_handlers[types.ReadResourceRequest] = _handle_read_resource


app = mcp.streamable_http_app()

try:
    from starlette.middleware.cors import CORSMiddleware

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=False,
    )
except Exception:
    pass


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000)
