"""MCP server for an authenticated app implemented with the Python FastMCP helper."""

from __future__ import annotations

import os
from copy import deepcopy
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List
from urllib.parse import urlparse

import mcp.types as types
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from mcp.shared.auth import ProtectedResourceMetadata
from dotenv import load_dotenv
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


@dataclass(frozen=True)
class PizzazWidget:
    identifier: str
    title: str
    template_uri: str
    invoking: str
    invoked: str
    html: str
    response_text: str


ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / ".env")

ASSETS_DIR = ROOT_DIR.parent / "assets"


@lru_cache(maxsize=None)
def _load_widget_html(component_name: str) -> str:
    html_path = ASSETS_DIR / f"{component_name}.html"
    if html_path.exists():
        return html_path.read_text(encoding="utf8")

    fallback_candidates = sorted(ASSETS_DIR.glob(f"{component_name}-*.html"))
    if fallback_candidates:
        return fallback_candidates[-1].read_text(encoding="utf8")

    raise FileNotFoundError(
        f'Widget HTML for "{component_name}" not found in {ASSETS_DIR}. '
        "Run `pnpm run build` to generate the assets before starting the server."
    )


SEARCH_WIDGET = PizzazWidget(
    identifier="search_pizza_sf",
    title="Show pizza spots",
    template_uri="ui://widget/mixed-auth-search.html",
    invoking="Searching pizza spots in San Francisco",
    invoked="Served SF pizza search results",
    html=_load_widget_html("mixed-auth-search"),
    response_text="Rendered SF pizza search results!",
)

PAST_ORDERS_WIDGET = PizzazWidget(
    identifier="mixed-auth-past-orders",
    title="Past orders",
    template_uri="ui://widget/mixed-auth-past-orders.html",
    invoking="Fetching your recent orders",
    invoked="Served recent orders",
    html=_load_widget_html("mixed-auth-past-orders"),
    response_text="Rendered past orders list!",
)


MIME_TYPE = "text/html+skybridge"

SEARCH_TOOL_NAME = SEARCH_WIDGET.identifier
PAST_ORDERS_TOOL_NAME = "see_past_orders"

SEARCH_TOOL_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "title": "Search terms",
    "properties": {
        "searchTerm": {
            "type": "string",
            "description": "Optional text to echo back in the response.",
        },
    },
    "required": [],
    "additionalProperties": False,
}

PAST_ORDERS_TOOL_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "title": "Past orders",
    "properties": {
        "limit": {
            "type": "integer",
            "minimum": 1,
            "maximum": 20,
            "description": "Optional max number of past orders to return.",
        }
    },
    "required": [],
    "additionalProperties": False,
}

PAST_ORDERS_DATA = [
    {
        "orderId": "pz-4931",
        "restaurantName": "Nova Slice Lab",
        "items": ["Classic Margherita", "Garlic knots"],
        "status": "delivered",
        "total": "$18.50",
        "placedAt": "Today, 7:18 PM",
        "location": "North Beach",
    },
    {
        "orderId": "pz-4810",
        "restaurantName": "Midnight Marinara",
        "items": ["Pepperoni Feast", "Basil soda"],
        "status": "delivered",
        "total": "$21.00",
        "placedAt": "Aug 28, 6:02 PM",
        "location": "Mission",
    },
    {
        "orderId": "pz-4799",
        "restaurantName": "Cinder Oven Co.",
        "items": ["Veggie Garden", "Caesar salad"],
        "status": "refunded",
        "total": "$22.40",
        "placedAt": "Aug 19, 8:11 PM",
        "location": "Nob Hill",
    },
    {
        "orderId": "pz-4750",
        "restaurantName": "Neon Crust Works",
        "items": ["Spicy Hawaiian"],
        "status": "delivered",
        "total": "$17.25",
        "placedAt": "Aug 12, 7:45 PM",
        "location": "SoMa",
    },
]

AUTHORIZATION_SERVER_URL = os.getenv("AUTHORIZATION_SERVER_URL")
RESOURCE_SERVER_URL = os.getenv("RESOURCE_SERVER_URL")

missing_env = [
    name
    for name, value in (
        ("AUTHORIZATION_SERVER_URL", AUTHORIZATION_SERVER_URL),
        ("RESOURCE_SERVER_URL", RESOURCE_SERVER_URL),
    )
    if not value
]
if missing_env:
    raise RuntimeError(
        "Missing required environment variables: "
        + ", ".join(missing_env)
        + ". Set them in authenticated_server_python/.env."
    )

print("AUTHORIZATION_SERVER_URL", AUTHORIZATION_SERVER_URL)
print("RESOURCE_SERVER_URL", RESOURCE_SERVER_URL)
RESOURCE_SCOPES = []

_parsed_resource_url = urlparse(str(RESOURCE_SERVER_URL))
_resource_path = (
    _parsed_resource_url.path if _parsed_resource_url.path not in ("", "/") else ""
)
PROTECTED_RESOURCE_METADATA_PATH = (
    f"/.well-known/oauth-protected-resource{_resource_path}"
)
PROTECTED_RESOURCE_METADATA_URL = f"{_parsed_resource_url.scheme}://{_parsed_resource_url.netloc}{PROTECTED_RESOURCE_METADATA_PATH}"

print("PROTECTED_RESOURCE_METADATA_URL", PROTECTED_RESOURCE_METADATA_URL)
PROTECTED_RESOURCE_METADATA = ProtectedResourceMetadata(
    resource=RESOURCE_SERVER_URL,
    authorization_servers=[AUTHORIZATION_SERVER_URL],
    scopes_supported=RESOURCE_SCOPES,
)

# Tool-level securitySchemes inform ChatGPT when OAuth is required for a call.
MIXED_TOOL_SECURITY_SCHEMES = [
    {"type": "noauth"},
    {
        "type": "oauth2",
        "scopes": RESOURCE_SCOPES,
    },
]

OAUTH_ONLY_SECURITY_SCHEMES = [
    {
        "type": "oauth2",
        "scopes": RESOURCE_SCOPES,
    }
]


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
    name="authenticated-server-python",
    stateless_http=True,
    transport_security=_transport_security_settings(),
)


def _build_www_authenticate_value(error: str, description: str) -> str:
    safe_error = error.replace('"', r"\"")
    safe_description = description.replace('"', r"\"")
    parts = [
        f'error="{safe_error}"error_description="{safe_description}"',
    ]
    parts.append(f'resource_metadata="{PROTECTED_RESOURCE_METADATA_URL}"')
    return f"Bearer {', '.join(parts)}"


def _oauth_error_result(
    user_message: str,
    *,
    error: str = "invalid_request",
    description: str | None = None,
) -> types.ServerResult:
    description_text = description or user_message
    return types.ServerResult(
        types.CallToolResult(
            content=[
                types.TextContent(
                    type="text",
                    text=user_message,
                )
            ],
            _meta={
                "mcp/www_authenticate": [
                    _build_www_authenticate_value(error, description_text)
                ]
            },
            isError=True,
        )
    )


def _get_bearer_token_from_request() -> str | None:
    try:
        request_context = mcp._mcp_server.request_context
    except LookupError:
        return None

    request = getattr(request_context, "request", None)
    if request is None:
        return None

    header_value: Any = None
    headers = getattr(request, "headers", None)
    if headers is not None:
        try:
            header_value = headers.get("authorization")
            if header_value is None:
                header_value = headers.get("Authorization")
        except Exception:
            header_value = None

    if header_value is None:
        # Attempt to read from ASGI scope headers if available
        scope = getattr(request, "scope", None)
        scope_headers = scope.get("headers") if isinstance(scope, dict) else None
        if scope_headers:
            for key, value in scope_headers:
                decoded_key = (
                    key.decode("latin-1")
                    if isinstance(key, (bytes, bytearray))
                    else str(key)
                ).lower()
                if decoded_key == "authorization":
                    header_value = (
                        value.decode("latin-1")
                        if isinstance(value, (bytes, bytearray))
                        else str(value)
                    )
                    break

    if header_value is None and isinstance(request, dict):
        # Fall back to dictionary-like request contexts
        raw_value = request.get("authorization") or request.get("Authorization")
        header_value = raw_value

    if header_value is None:
        return None

    if isinstance(header_value, (bytes, bytearray)):
        header_value = header_value.decode("latin-1")

    header_value = header_value.strip()
    if not header_value.lower().startswith("bearer "):
        return None

    token = header_value[7:].strip()
    return token or None


@mcp.custom_route(PROTECTED_RESOURCE_METADATA_PATH, methods=["GET", "OPTIONS"])
async def protected_resource_metadata(request: Request) -> Response:
    """Expose RFC 9728 metadata so clients can find the Auth0 authorization server."""
    if request.method == "OPTIONS":
        return Response(status_code=204)
    return JSONResponse(PROTECTED_RESOURCE_METADATA.model_dump(mode="json"))


def _resource_description(widget: PizzazWidget) -> str:
    return f"{widget.title} widget markup"


def _tool_meta(
    widget: PizzazWidget,
    security_schemes: List[Dict[str, Any]] | None = None,
) -> Dict[str, Any]:
    meta = {
        "openai/outputTemplate": widget.template_uri,
        "openai/toolInvocation/invoking": widget.invoking,
        "openai/toolInvocation/invoked": widget.invoked,
        "openai/widgetAccessible": True,
    }
    if security_schemes is not None:
        meta["securitySchemes"] = deepcopy(security_schemes)
    return meta


def _tool_invocation_meta(widget: PizzazWidget) -> Dict[str, Any]:
    return {
        "openai/toolInvocation/invoking": widget.invoking,
        "openai/toolInvocation/invoked": widget.invoked,
        "openai/widgetSessionId": "ren-test-session-id",
    }


def _tool_error(message: str) -> types.ServerResult:
    return types.ServerResult(
        types.CallToolResult(
            content=[types.TextContent(type="text", text=message)],
            isError=True,
        )
    )


@mcp._mcp_server.list_tools()
async def _list_tools() -> List[types.Tool]:
    tool_meta = _tool_meta(SEARCH_WIDGET, MIXED_TOOL_SECURITY_SCHEMES)
    past_orders_meta = _tool_meta(PAST_ORDERS_WIDGET, OAUTH_ONLY_SECURITY_SCHEMES)
    return [
        types.Tool(
            name=SEARCH_TOOL_NAME,
            title=SEARCH_WIDGET.title,
            description=(
                "Search for pizza shops in San Francisco (optionally filter by toppings)."
            ),
            inputSchema=SEARCH_TOOL_SCHEMA,
            _meta=tool_meta,
            securitySchemes=list(MIXED_TOOL_SECURITY_SCHEMES),
            # To disable the approval prompt for the tools
            annotations={
                "destructiveHint": False,
                "openWorldHint": False,
                "readOnlyHint": True,
            },
        ),
        types.Tool(
            name=PAST_ORDERS_TOOL_NAME,
            title="See past orders",
            description="Return a list of past pizza orders (OAuth required).",
            inputSchema=PAST_ORDERS_TOOL_SCHEMA,
            _meta=past_orders_meta,
            securitySchemes=list(OAUTH_ONLY_SECURITY_SCHEMES),
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
            name=SEARCH_WIDGET.title,
            title=SEARCH_WIDGET.title,
            uri=SEARCH_WIDGET.template_uri,
            description=_resource_description(SEARCH_WIDGET),
            mimeType=MIME_TYPE,
            _meta=_tool_meta(SEARCH_WIDGET),
        ),
        types.Resource(
            name=PAST_ORDERS_WIDGET.title,
            title=PAST_ORDERS_WIDGET.title,
            uri=PAST_ORDERS_WIDGET.template_uri,
            description=_resource_description(PAST_ORDERS_WIDGET),
            mimeType=MIME_TYPE,
            _meta=_tool_meta(PAST_ORDERS_WIDGET),
        ),
    ]


@mcp._mcp_server.list_resource_templates()
async def _list_resource_templates() -> List[types.ResourceTemplate]:
    return [
        types.ResourceTemplate(
            name=SEARCH_WIDGET.title,
            title=SEARCH_WIDGET.title,
            uriTemplate=SEARCH_WIDGET.template_uri,
            description=_resource_description(SEARCH_WIDGET),
            mimeType=MIME_TYPE,
            _meta=_tool_meta(SEARCH_WIDGET),
        ),
        types.ResourceTemplate(
            name=PAST_ORDERS_WIDGET.title,
            title=PAST_ORDERS_WIDGET.title,
            uriTemplate=PAST_ORDERS_WIDGET.template_uri,
            description=_resource_description(PAST_ORDERS_WIDGET),
            mimeType=MIME_TYPE,
            _meta=_tool_meta(PAST_ORDERS_WIDGET),
        ),
    ]


async def _handle_read_resource(req: types.ReadResourceRequest) -> types.ServerResult:
    requested_uri = str(req.params.uri)
    if requested_uri not in {
        SEARCH_WIDGET.template_uri,
        PAST_ORDERS_WIDGET.template_uri,
    }:
        return types.ServerResult(
            types.ReadResourceResult(
                contents=[],
                _meta={"error": f"Unknown resource: {req.params.uri}"},
            )
        )

    widget = (
        SEARCH_WIDGET
        if requested_uri == SEARCH_WIDGET.template_uri
        else PAST_ORDERS_WIDGET
    )

    contents = [
        types.TextResourceContents(
            uri=widget.template_uri,
            mimeType=MIME_TYPE,
            text=widget.html,
            _meta=_tool_meta(widget),
        )
    ]

    return types.ServerResult(types.ReadResourceResult(contents=contents))


async def _call_tool_request(req: types.CallToolRequest) -> types.ServerResult:
    tool_name = req.params.name

    arguments = req.params.arguments or {}

    if tool_name == SEARCH_TOOL_NAME:
        meta = _tool_invocation_meta(SEARCH_WIDGET)
        topping = str(arguments.get("searchTerm", "")).strip()
        return types.ServerResult(
            types.CallToolResult(
                content=[
                    types.TextContent(
                        type="text",
                        text="Rendered SF pizza search results!",
                    )
                ],
                structuredContent={"pizzaTopping": topping},
                _meta=meta,
            )
        )

    if tool_name == PAST_ORDERS_TOOL_NAME:
        if not _get_bearer_token_from_request():
            return _oauth_error_result(
                "Authentication required: no access token provided.",
                description="No access token was provided",
            )

        meta = _tool_invocation_meta(PAST_ORDERS_WIDGET)
        limit = arguments.get("limit")
        try:
            parsed_limit = int(limit) if limit is not None else len(PAST_ORDERS_DATA)
        except Exception:
            parsed_limit = len(PAST_ORDERS_DATA)
        parsed_limit = max(1, min(parsed_limit, len(PAST_ORDERS_DATA)))
        orders = PAST_ORDERS_DATA[:parsed_limit]
        return types.ServerResult(
            types.CallToolResult(
                content=[
                    types.TextContent(
                        type="text",
                        text=PAST_ORDERS_WIDGET.response_text,
                    )
                ],
                structuredContent={"orders": orders},
                _meta=meta,
            )
        )

    return _tool_error(f"Unknown tool: {req.params.name}")


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
