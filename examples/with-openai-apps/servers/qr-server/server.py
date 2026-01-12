"""
QR Code MCP Server - Generates QR codes from text
"""
import os
import sys
import io
import base64
from pathlib import Path

import qrcode
import uvicorn
from mcp.server.fastmcp import FastMCP
from mcp import types
from starlette.middleware.cors import CORSMiddleware

WIDGET_URI = "ui://qr-server/widget.html"
HOST = os.environ.get("HOST", "0.0.0.0")  # 0.0.0.0 for Docker compatibility
PORT = int(os.environ.get("PORT", "3108"))

mcp = FastMCP("QR Server", port=PORT, stateless_http=True)


@mcp.tool(meta={"ui/resourceUri": WIDGET_URI})
def generate_qr(
    text: str,
    box_size: int = 10,
    border: int = 4,
    error_correction: str = "M",
    fill_color: str = "black",
    back_color: str = "white",
) -> list[types.ImageContent]:
    """Generate a QR code from text.

    Args:
        text: The text/URL to encode
        box_size: Size of each box in pixels (default: 10)
        border: Border size in boxes (default: 4)
        error_correction: Error correction level - L(7%), M(15%), Q(25%), H(30%)
        fill_color: Foreground color (hex like #FF0000 or name like red)
        back_color: Background color (hex like #FFFFFF or name like white)
    """
    error_levels = {
        "L": qrcode.constants.ERROR_CORRECT_L,
        "M": qrcode.constants.ERROR_CORRECT_M,
        "Q": qrcode.constants.ERROR_CORRECT_Q,
        "H": qrcode.constants.ERROR_CORRECT_H,
    }

    qr = qrcode.QRCode(
        version=1,
        error_correction=error_levels.get(error_correction.upper(), qrcode.constants.ERROR_CORRECT_M),
        box_size=box_size,
        border=border,
    )
    qr.add_data(text)
    qr.make(fit=True)

    img = qr.make_image(fill_color=fill_color, back_color=back_color)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    b64 = base64.b64encode(buffer.getvalue()).decode()
    return [types.ImageContent(type="image", data=b64, mimeType="image/png")]


# Register widget resource using FastMCP decorator (returns HTML string)
@mcp.resource(WIDGET_URI, mime_type="text/html;profile=mcp-app")
def widget() -> str:
    return Path(__file__).parent.joinpath("widget.html").read_text()


# Override the read_resource handler to inject _meta into the response
# This is needed because FastMCP doesn't support custom _meta on resources
_low_level_server = mcp._mcp_server


async def _read_resource_with_meta(req: types.ReadResourceRequest):
    """Custom handler that injects CSP metadata for the widget resource."""
    uri = str(req.params.uri)
    html = Path(__file__).parent.joinpath("widget.html").read_text()

    if uri == WIDGET_URI:
        # NOTE: Must use model_validate with '_meta' key (not 'meta') due to Pydantic alias behavior
        content = types.TextResourceContents.model_validate({
            "uri": WIDGET_URI,
            "mimeType": "text/html;profile=mcp-app",
            "text": html,
            # IMPORTANT: all the external domains used by app must be listed
            # in the _meta.ui.csp.resourceDomains - otherwise they will be blocked by CSP policy
            "_meta": {"ui": {"csp": {"resourceDomains": ["https://unpkg.com"]}}}
        })
        return types.ServerResult(
            types.ReadResourceResult(contents=[content])
        )

    # Fallback for other resources (shouldn't happen for this server)
    return types.ServerResult(
        types.ReadResourceResult(
            contents=[
                types.TextResourceContents(
                    uri=uri,
                    mimeType="text/plain",
                    text="Resource not found"
                )
            ]
        )
    )


# Replace the handler after FastMCP has registered its own
_low_level_server.request_handlers[types.ReadResourceRequest] = _read_resource_with_meta

if __name__ == "__main__":
    if "--stdio" in sys.argv:
        # Claude Desktop mode
        mcp.run(transport="stdio")
    else:
        # HTTP mode for basic-host (default) - with CORS
        app = mcp.streamable_http_app()
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_methods=["*"],
            allow_headers=["*"],
        )
        print(f"QR Server listening on http://{HOST}:{PORT}/mcp")
        uvicorn.run(app, host=HOST, port=PORT)
