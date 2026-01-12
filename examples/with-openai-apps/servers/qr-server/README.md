# QR Code MCP Server

A minimal Python MCP server that generates customizable QR codes with an interactive widget UI.

![Screenshot](https://modelcontextprotocol.github.io/ext-apps/screenshots/qr-server/screenshot.png)

## Features

- Generate QR codes from any text or URL
- Customizable colors, size, and error correction
- Interactive widget that displays in MCP-UI enabled clients
- Supports both HTTP (for web clients) and stdio (for Claude Desktop)

## Quick Start

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server (HTTP mode)
python server.py
# → QR Server listening on http://localhost:3108/mcp
```

## Usage

### HTTP Mode (for basic-host / web clients)

```bash
python server.py
```

Connect from basic-host:

```bash
SERVERS='["http://localhost:3108/mcp"]' bun serve.ts
```

### Stdio Mode (for Claude Desktop)

```bash
python server.py --stdio
```

Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "qr": {
      "command": "/path/to/qr-server/.venv/bin/python",
      "args": ["/path/to/qr-server/server.py", "--stdio"]
    }
  }
}
```

### Docker (accessing host server from container)

```
http://host.docker.internal:3108/mcp
```

## Tool: `generate_qr`

Generate a QR code with optional customization.

### Parameters

| Parameter          | Type   | Default    | Description                     |
| ------------------ | ------ | ---------- | ------------------------------- |
| `text`             | string | (required) | The text or URL to encode       |
| `box_size`         | int    | 10         | Size of each box in pixels      |
| `border`           | int    | 4          | Border size in boxes            |
| `error_correction` | string | "M"        | Error correction level: L/M/Q/H |
| `fill_color`       | string | "black"    | Foreground color (hex or name)  |
| `back_color`       | string | "white"    | Background color (hex or name)  |

### Error Correction Levels

| Level | Recovery | Use Case                  |
| ----- | -------- | ------------------------- |
| L     | 7%       | Clean environments        |
| M     | 15%      | General use (default)     |
| Q     | 25%      | Industrial/outdoor        |
| H     | 30%      | Adding logos/damage-prone |

### Example Inputs

**Basic:**

```json
{ "text": "https://example.com" }
```

**Styled:**

```json
{
  "text": "https://claude.ai",
  "fill_color": "#CC785C",
  "back_color": "#FFF8F5",
  "box_size": 12,
  "border": 3
}
```

**Dark Mode:**

```json
{
  "text": "Hello World",
  "fill_color": "#E0E0E0",
  "back_color": "#1a1a1a",
  "box_size": 15,
  "border": 2
}
```

**WiFi QR Code:**

```json
{
  "text": "WIFI:T:WPA;S:MyNetwork;P:MyPassword;;",
  "error_correction": "H",
  "box_size": 10
}
```

## Architecture

```
qr-server/
├── server.py      # MCP server (FastMCP + uvicorn)
├── widget.html    # Interactive UI widget
├── requirements.txt
└── README.md
```

### Protocol

The widget uses MCP Apps SDK protocol:

1. Widget sends `ui/initialize` request
2. Host responds with capabilities
3. Widget sends `ui/notifications/initialized`
4. Host sends `ui/notifications/tool-result` with QR image
5. Widget renders image and sends `ui/notifications/size-changed`

## Dependencies

- `mcp[cli]` - MCP Python SDK with FastMCP
- `qrcode[pil]` - QR code generation with Pillow
- `uvicorn` - ASGI server (included with mcp)
- `starlette` - CORS middleware (included with mcp)

## License

MIT
