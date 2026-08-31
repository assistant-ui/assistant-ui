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

- Python 3.9 or higher
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
HOST=0.0.0.0
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
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The server will be available at:
- **API**: http://localhost:8000
- **Health Check**: http://localhost:8000/health
- **Assistant Endpoint**: http://localhost:8000/assistant

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

**Response:** Streaming response using assistant-stream format with static responses.

### `GET /health`

Health check endpoint that returns server status and current conversation state.

### `POST /cancel`

Cancel the current request (placeholder for request cancellation).

## Static Response Patterns

The backend recognizes these message patterns and returns appropriate static responses:

- **Greetings** (`hello`, `hi`) → Welcome message
- **Weather** (`weather`) → Sunny static response
- **What/What is** → Explanation of what the backend does
- **Help** → Available command information
- **Other messages** → Acknowledgment with echo

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

The backend uses `assistant_stream.create_run()` to create a streaming controller that:

1. **Manages State**: Updates conversation state with messages
2. **Streams Text**: Uses `controller.append_text()` for character-by-character streaming
3. **Updates State**: Uses `controller.state` to update the object-stream state
4. **Handles Protocol**: Automatically formats responses for assistant-transport

### State Management

```python
# Initialize state
conversation_state = {
    "messages": [],
    "provider": "static"
}

# Create run controller with state
controller = create_run(conversation_state)

# Update state during processing
controller.state.provider = "processing"
controller.state.messages.append(new_message)

# Stream text responses
for char in response_text:
    controller.append_text(char)
```

## Development

### Running in Development Mode

```bash
# Enable debug mode and auto-reload
DEBUG=true python main.py
```

### Adding Response Patterns

Edit the static response logic in `main.py`:

```python
# Add new patterns
if "goodbye" in user_message:
    response_text = "Goodbye! Thanks for testing the assistant-transport backend!"
```

### Testing

```bash
# Test the health endpoint
curl http://localhost:8000/health

# Test the assistant endpoint
curl -X POST http://localhost:8000/assistant \
  -H "Content-Type: application/json" \
  -d '{"commands":[{"type":"add-message","message":{"role":"user","parts":[{"type":"text","text":"Hello!"}]}}]}'
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HOST` | Server host | `0.0.0.0` |
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
