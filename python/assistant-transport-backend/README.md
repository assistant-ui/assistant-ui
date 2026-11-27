# Assistant Transport Backend

A simple Python server that demonstrates the assistant-transport protocol using FastAPI and assistant-stream. This backend returns static responses to show how the streaming protocol works with assistant-ui frontend applications.

## Features

- 🚀 **FastAPI-based** - High-performance async server
- 📡 **Streaming Responses** - Real-time responses using assistant-stream
- 🔄 **State Management** - Uses assistant-stream's object-stream state utilities
- 🔌 **Assistant-Transport Protocol** - Full compatibility with assistant-ui
- 🌐 **CORS Enabled** - Works with any frontend origin
- 📦 **Simple Setup** - Minimal dependencies
- 🧪 **Static Responses** - No API keys required, perfect for testing

## Prerequisites

- Python 3.10 or higher
- uv

## Quick Start

### 1. Install Dependencies

```bash
uv sync
```

### 2. Configure Environment (Optional)

```bash
# Copy example environment file
cp .env.example .env
# Edit .env file if needed
```

Default configuration:
```env
# Server Configuration
HOST=127.0.0.1
PORT=8000
DEBUG=true

# CORS Configuration  
CORS_ORIGINS=http://localhost:3000
```

### 3. Start the Server

```bash
# Using the installed command
assistant-transport-backend

# Or run directly
python main.py

# Or using uvicorn
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

`HOST` applies to the first two commands. The uvicorn command ignores it and uses its own `--host`, so change that flag for remote access. Browser clients on another machine also need their frontend origin in `CORS_ORIGINS`.

The assistant endpoint is then at http://localhost:8000/assistant.

## API Endpoints

### `POST /assistant`

Main endpoint that implements the assistant-transport protocol.

**Request Format:**
```json
{
  "commands": [
    {
      "type": "add-message",
      "message": {
        "role": "user",
        "parts": [
          {"type": "text", "text": "Hello!"}
        ]
      }
    }
  ],
  "system": "You are a helpful assistant",
  "tools": {},
  "runConfig": {}
}
```

**Response:** An assistant-transport stream of state updates.

## Scripted Reply

The backend calls no model. It applies every command in the request to the state, in order: messages are appended, a tool result lands on the tool call with its `toolCallId` (a result for an unknown id is ignored), and custom commands are accepted and skipped (`apply_commands` in `main.py` is where to handle yours). A request with only custom commands gets no reply. Otherwise the backend streams the same scripted assistant message every time: a short text part, then a `get_weather` tool call whose arguments arrive in two chunks, with a pause between steps so you can watch the stream.

## Integration with Frontend

This backend works with the `with-assistant-transport` frontend example:

1. Start backend: `python main.py`
2. Start frontend: `cd ../../examples/with-assistant-transport && pnpm dev`
3. Frontend connects to `http://localhost:8000/assistant`

## Project Structure

```
python/assistant-transport-backend/
├── main.py                    # FastAPI server and main entry point
├── pyproject.toml            # Project configuration and dependencies
├── .env.example             # Environment variables template
└── README.md               # This file
```

## How It Works

### Assistant-Stream Integration

The backend passes a run callback to `assistant_stream.create_run()`. The callback changes `controller.state`, and every change streams to the frontend as an object-stream operation. `AssistantTransportResponse` encodes the stream for assistant-transport.

### State Management

```python
from assistant_stream import RunController, create_run
from assistant_stream.serialization import AssistantTransportResponse


async def run_callback(controller: RunController):
    # Each change streams to the frontend as it happens
    controller.state["messages"].append(
        {"role": "assistant", "parts": [{"type": "text", "text": "Hello"}]}
    )
    controller.state["messages"][-1]["parts"][0]["text"] += " world"
    controller.state["provider"] = "completed"


stream = create_run(run_callback, state={"messages": []})
response = AssistantTransportResponse(stream)
```

## Development

### Running in Development Mode

```bash
# Enable debug mode and auto-reload
DEBUG=true python main.py
```

### Changing the Reply

The scripted reply is built in `run_callback` in `main.py`. Replace its steps with your own, or call a model there and append what it streams.

### Testing

```bash
# Test the assistant endpoint
curl -X POST http://localhost:8000/assistant \
  -H "Content-Type: application/json" \
  -d '{"commands":[{"type":"add-message","message":{"role":"user","parts":[{"type":"text","text":"Hello!"}]}}]}'
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HOST` | Server host (set `0.0.0.0` only to accept other machines) | `127.0.0.1` |
| `PORT` | Server port | `8000` |
| `DEBUG` | Enable debug mode | `false` |
| `LOG_LEVEL` | Logging level | `info` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000` |

## License

This project is part of the assistant-ui monorepo and follows the same MIT licensing terms.

## Learn More

- [assistant-ui Documentation](https://docs.assistant-ui.com)
- [Assistant Transport Protocol](https://docs.assistant-ui.com/runtimes/assistant-transport)
- [assistant-stream Package](https://github.com/assistant-ui/assistant-ui/tree/main/python/assistant-stream)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
