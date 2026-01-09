"""Solar system MCP server implemented with the Python FastMCP helper."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

import mcp.types as types
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from pydantic import BaseModel, ConfigDict, Field, ValidationError

MIME_TYPE = "text/html+skybridge"
PLANETS = [
    "Mercury",
    "Venus",
    "Earth",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
]
PLANET_ALIASES = {
    "terra": "Earth",
    "gaia": "Earth",
    "soliii": "Earth",
    "tellus": "Earth",
    "ares": "Mars",
    "jove": "Jupiter",
    "zeus": "Jupiter",
    "cronus": "Saturn",
    "ouranos": "Uranus",
    "poseidon": "Neptune",
}
PLANET_DESCRIPTIONS = {
    "Mercury": "Mercury is the smallest planet in the Solar System and the closest to the Sun. It has a rocky, cratered surface and extreme temperature swings.",
    "Venus": "Venus, similar in size to Earth, is cloaked in thick clouds of sulfuric acid with surface temperatures hot enough to melt lead.",
    "Earth": "Earth is the only known planet to support life, with liquid water covering most of its surface and a protective atmosphere.",
    "Mars": "Mars, the Red Planet, shows evidence of ancient rivers and volcanoes and is a prime target in the search for past life.",
    "Jupiter": "Jupiter is the largest planet, a gas giant with a Great Red Spot—an enormous storm raging for centuries.",
    "Saturn": "Saturn is famous for its stunning ring system composed of billions of ice and rock particles orbiting the planet.",
    "Uranus": "Uranus is an ice giant rotating on its side, giving rise to extreme seasonal variations during its long orbit.",
    "Neptune": "Neptune, the farthest known giant, is a deep-blue world with supersonic winds and a faint ring system.",
}
DEFAULT_PLANET = "Earth"


@dataclass(frozen=True)
class SolarWidget:
    identifier: str
    title: str
    template_uri: str
    invoking: str
    invoked: str
    html: str
    response_text: str


ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"


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


WIDGET = SolarWidget(
    identifier="solar-system",
    title="Explore the Solar System",
    template_uri="ui://widget/solar-system.html",
    invoking="Charting the solar system",
    invoked="Solar system ready",
    html=_load_widget_html("solar-system"),
    response_text="Solar system ready",
)


class SolarInput(BaseModel):
    """Schema describing the solar system focus request."""

    planet_name: str = Field(
        DEFAULT_PLANET,
        alias="planetName",
        description="Planet to focus in the widget (case insensitive).",
    )
    auto_orbit: bool = Field(
        True,
        alias="autoOrbit",
        description="Whether to keep the camera orbiting if the target planet is missing.",
    )

    model_config = ConfigDict(populate_by_name=True, extra="forbid")


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
    name="solar-system-python",
    stateless_http=True,
    transport_security=_transport_security_settings(),
)

TOOL_INPUT_SCHEMA: Dict[str, Any] = SolarInput.model_json_schema()


def _resource_description(widget: SolarWidget) -> str:
    return f"{widget.title} widget markup"


def _tool_meta(widget: SolarWidget) -> Dict[str, Any]:
    return {
        "openai/outputTemplate": widget.template_uri,
        "openai/toolInvocation/invoking": widget.invoking,
        "openai/toolInvocation/invoked": widget.invoked,
        "openai/widgetAccessible": True,
        "annotations": {
            "destructiveHint": False,
            "openWorldHint": False,
            "readOnlyHint": True,
        },
    }


def _embedded_widget_resource(widget: SolarWidget) -> types.EmbeddedResource:
    return types.EmbeddedResource(
        type="resource",
        resource=types.TextResourceContents(
            uri=widget.template_uri,
            mimeType=MIME_TYPE,
            text=widget.html,
            title=widget.title,
        ),
    )


def _normalize_planet(name: str) -> str | None:
    if not name:
        return DEFAULT_PLANET

    key = name.strip().lower()
    if not key:
        return DEFAULT_PLANET

    clean = "".join(ch for ch in key if ch.isalnum())

    for planet in PLANETS:
        planet_key = "".join(ch for ch in planet.lower() if ch.isalnum())
        if clean == planet_key or key == planet.lower():
            return planet

    alias = PLANET_ALIASES.get(clean)
    if alias:
        return alias

    for planet in PLANETS:
        planet_key = "".join(ch for ch in planet.lower() if ch.isalnum())
        if planet_key.startswith(clean):
            return planet

    return None


@mcp._mcp_server.list_tools()
async def _list_tools() -> List[types.Tool]:
    return [
        types.Tool(
            name="focus-solar-planet",
            title=WIDGET.title,
            description="Render the solar system widget centered on the requested planet.",
            inputSchema=TOOL_INPUT_SCHEMA,
            _meta=_tool_meta(WIDGET),
        )
    ]


@mcp._mcp_server.list_resources()
async def _list_resources() -> List[types.Resource]:
    return [
        types.Resource(
            name=WIDGET.title,
            title=WIDGET.title,
            uri=WIDGET.template_uri,
            description=_resource_description(WIDGET),
            mimeType=MIME_TYPE,
            _meta=_tool_meta(WIDGET),
        )
    ]


@mcp._mcp_server.list_resource_templates()
async def _list_resource_templates() -> List[types.ResourceTemplate]:
    return [
        types.ResourceTemplate(
            name=WIDGET.title,
            title=WIDGET.title,
            uriTemplate=WIDGET.template_uri,
            description=_resource_description(WIDGET),
            mimeType=MIME_TYPE,
            _meta=_tool_meta(WIDGET),
        )
    ]


async def _handle_read_resource(req: types.ReadResourceRequest) -> types.ServerResult:
    resource_uri = str(req.params.uri)

    if resource_uri != WIDGET.template_uri:
        return types.ServerResult(
            types.ReadResourceResult(
                contents=[],
                _meta={"error": f"Unknown resource: {req.params.uri}"},
            )
        )

    contents = [
        types.TextResourceContents(
            uri=WIDGET.template_uri,
            mimeType=MIME_TYPE,
            text=WIDGET.html,
            _meta=_tool_meta(WIDGET),
        )
    ]

    return types.ServerResult(types.ReadResourceResult(contents=contents))


async def _call_tool_request(req: types.CallToolRequest) -> types.ServerResult:
    arguments = req.params.arguments or {}
    try:
        payload = SolarInput.model_validate(arguments)
    except ValidationError as exc:
        return types.ServerResult(
            types.CallToolResult(
                content=[
                    types.TextContent(
                        type="text",
                        text=f"Input validation error: {exc.errors()}",
                    )
                ],
                isError=True,
            )
        )

    planet = _normalize_planet(payload.planet_name)
    if planet is None:
        return types.ServerResult(
            types.CallToolResult(
                content=[
                    types.TextContent(
                        type="text",
                        text=("Unknown planet. Provide one of: " + ", ".join(PLANETS)),
                    )
                ],
                isError=True,
            )
        )

    widget_resource = _embedded_widget_resource(WIDGET)
    meta: Dict[str, Any] = {
        "openai.com/widget": widget_resource.model_dump(mode="json"),
        "openai/outputTemplate": WIDGET.template_uri,
        "openai/toolInvocation/invoking": WIDGET.invoking,
        "openai/toolInvocation/invoked": WIDGET.invoked,
        "openai/widgetAccessible": True,
    }

    description = PLANET_DESCRIPTIONS.get(planet, "")
    structured = {
        "planet_name": planet,
        "planet_description": description,
        "autoOrbit": payload.auto_orbit,
    }
    message = f"Centered the solar system view on {planet}."

    return types.ServerResult(
        types.CallToolResult(
            content=[
                types.TextContent(
                    type="text",
                    text=message,
                )
            ],
            structuredContent=structured,
            _meta=meta,
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
except Exception:  # pragma: no cover - middleware is optional
    pass


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000)
