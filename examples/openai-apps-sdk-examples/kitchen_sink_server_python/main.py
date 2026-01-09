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
from functools import lru_cache
from pathlib import Path
from typing import List

import mcp.types as types
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from pydantic import BaseModel, Field


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


def tool_meta(invocation: str):
    return {
        "openai/outputTemplate": TEMPLATE_URI,
        "openai/toolInvocation/invoking": "Preparing the kitchen sink widget",
        "openai/toolInvocation/invoked": "Widget rendered",
        "openai/widgetAccessible": True,
        "invocation": invocation,
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


@mcp.resource(TEMPLATE_URI, "Kitchen sink lite widget", mime_type=MIME_TYPE)
async def kitchen_sink_template() -> str:
    return load_widget_html()


@mcp.tool()
async def kitchen_sink_show(
    message: str = Field(..., description="Primary message to render in the widget."),
    accent_color: str = Field(
        default="#2d6cdf",
        description="Accent color for the widget header.",
        alias="accentColor",
    ),
    details: str | None = Field(
        default=None,
        description="Optional supporting copy shown under the main message.",
    ),
) -> types.CallToolResult:
    # Return the widget markup + structured payload so the Apps SDK can hydrate the UI.
    payload = WidgetPayload(
        message=message,
        accentColor=accent_color,
        details=details,
        fromTool="kitchen-sink-show",
    )
    return types.CallToolResult(
        content=[
            types.TextContent(
                type="text", text=f"Widget ready with message: {payload.message}"
            )
        ],
        structuredContent=payload.model_dump(mode="json"),
        _meta=tool_meta("kitchen-sink-show"),
        isError=False,
    )


@mcp.tool()
async def kitchen_sink_refresh(
    message: str = Field(..., description="Message to echo back."),
) -> types.CallToolResult:
    # Simple echo tool used by the widget via window.openai.callTool.
    payload = WidgetPayload(
        message=message,
        accentColor="#2d6cdf",
        details="This response came from the widget via window.openai.callTool.",
        fromTool="kitchen-sink-refresh",
    )
    return types.CallToolResult(
        content=[types.TextContent(type="text", text=payload.message)],
        structuredContent=payload.model_dump(mode="json"),
        _meta=tool_meta("kitchen-sink-refresh"),
        isError=False,
    )


app = mcp.fastapi

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
