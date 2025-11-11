# Assistant Transport Backend - Django

A Django implementation of the assistant-transport protocol, providing a backend for AI assistant interfaces with streaming support.

## ✨ Features

- 🚀 **Django REST Framework** - Modern Python web framework
- 📡 **Assistant Transport Protocol** - Compatible with assistant-ui frontend
- 🔄 **Streaming Responses** - Real-time message streaming with assistant-stream
- 🎯 **Mock AI Responses** - Test without API keys (optionally integrate OpenAI/Anthropic)
- 🌐 **CORS Support** - Ready for frontend integration
- ⚡ **Async Views** - Django 5.0+ async support for better performance
- 🐍 **Python 3.10+** - Modern Python with type hints (required by Django 5.0)

## 📋 Prerequisites

- Python 3.10 or higher (required by Django 5.0)
- pip or uv package manager
- Virtual environment (recommended)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Using pip
pip install -e .

# Or using uv
uv pip install -e .
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and configure as needed
# (API keys are optional - server works with mock responses)
```

### 3. Run the Server

```bash
# Using Django's manage.py (default port 8002)
python manage.py

# Or with uvicorn (matching FastAPI style)
python run_server.py

# Or specify host/port
python manage.py runserver 0.0.0.0:8002
```

The server will start at `http://localhost:8002`

## 📡 API Endpoints

### POST /assistant

Main endpoint for assistant interactions.

**Request:**
```json
{
  "commands": [
    {
      "type": "add-message",
      "message": {
        "role": "user",
        "parts": [
          {
            "type": "text",
            "text": "Hello!"
          }
        ]
      }
    }
  ],
  "state": {
    "messages": []
  }
}
```

**Response:** Streaming text protocol with state updates

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "assistant-transport-backend-django",
  "version": "0.1.0"
}
```

## 🔧 How It Works

This Django backend implements the same protocol as the FastAPI example:

1. **Request Handling**: Django async views receive POST requests
2. **Validation**: Pydantic models validate request structure
3. **Stream Generation**: assistant-stream library creates streaming responses
4. **State Management**: RunController manages conversation state
5. **Response**: Django StreamingHttpResponse returns real-time updates

**Key Code** (`api/views.py:95-118`):

```python
@csrf_exempt
@require_http_methods(["POST"])
async def assistant_endpoint(request):
    # Validate request
    request_data = AssistantRequest(**json.loads(request.body))

    # Define streaming callback
    async def run_callback(controller: RunController):
        # Process commands
        if request_data.commands[0].type == "add-message":
            controller.state["messages"].append(
                request_data.commands[0].message.model_dump()
            )

        # Generate response (mock or AI-powered)
        controller.state["messages"].append({
            "role": "assistant",
            "parts": [{"type": "text", "text": "Hello from Django!"}]
        })

    # Create and return stream
    stream = create_run(run_callback, state=request_data.state)
    return StreamingHttpResponse(
        DataStreamResponse(stream),
        content_type="text/plain; charset=utf-8"
    )
```

## 📁 Project Structure

```
assistant-transport-backend-django/
├── assistant_backend/          # Django project
│   ├── settings.py            # Configuration
│   ├── urls.py                # URL routing
│   └── asgi.py                # ASGI application
├── api/                       # Main API app
│   ├── views.py               # Assistant endpoint
│   └── models.py              # Pydantic models
├── manage.py                  # Django management
├── run_server.py              # uvicorn entry point
├── pyproject.toml             # Python packaging
├── requirements.txt           # Dependencies
├── .env.example               # Environment template
└── README.md                  # This file
```

## 🔗 Integration with Frontend

This backend works with the `with-assistant-transport` frontend example:

```bash
# Terminal 1: Start Django backend
cd python/assistant-transport-backend-django
python manage.py

# Terminal 2: Start frontend
cd examples/with-assistant-transport
NEXT_PUBLIC_API_URL=http://localhost:8002/assistant pnpm dev
```

The frontend will connect to the Django backend and stream responses in real-time.

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Server host |
| `PORT` | `8002` | Server port |
| `DEBUG` | `True` | Django debug mode |
| `SECRET_KEY` | (auto) | Django secret key |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed origins (comma-separated) |
| `LOG_LEVEL` | `INFO` | Logging level |
| `OPENAI_API_KEY` | - | OpenAI API key (optional) |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model (optional) |
| `ANTHROPIC_API_KEY` | - | Anthropic API key (optional) |
| `ANTHROPIC_MODEL` | `claude-3-haiku-20240307` | Anthropic model (optional) |

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:8002/health

# Test assistant endpoint
curl -X POST http://localhost:8002/assistant \
  -H "Content-Type: application/json" \
  -d '{
    "commands": [{
      "type": "add-message",
      "message": {
        "role": "user",
        "parts": [{"type": "text", "text": "Hello!"}]
      }
    }],
    "state": {"messages": []}
  }'
```

## 🔄 Comparison with FastAPI Example

This Django implementation mirrors the FastAPI example (`python/assistant-transport-backend/`):

| Feature | FastAPI | Django |
|---------|---------|--------|
| **Framework** | FastAPI | Django 5.0+ DRF |
| **Async Support** | Native | async views |
| **Server** | uvicorn | Django dev server or uvicorn |
| **Request Validation** | Pydantic | Pydantic (same models) |
| **CORS** | FastAPI CORSMiddleware | django-cors-headers |
| **Streaming** | StreamingResponse | StreamingHttpResponse |
| **assistant-stream** | ✅ Same | ✅ Same |
| **Port** | 8000 | 8002 |

**Use Django if:**
- You prefer Django's ecosystem
- Your project already uses Django
- You want Django ORM, admin, or other Django features

**Use FastAPI if:**
- You need maximum performance
- You prefer FastAPI's automatic OpenAPI docs
- You want simpler async/await patterns

## 🛠️ Development

### Setup Development Environment

```bash
# Install with dev dependencies
pip install -e ".[dev]"

# Run code formatting
black .
isort .

# Run linting
ruff check .

# Run type checking
mypy api/
```

### Adding AI Provider Integration

To integrate with OpenAI (replacing mock responses):

1. Install OpenAI package: `pip install openai`
2. Set `OPENAI_API_KEY` in `.env`
3. Modify `api/views.py` `run_callback` to use OpenAI client
4. Follow pattern from `python/assistant-transport-backend-langgraph/main.py:149-178`

## 📚 Learn More

- [assistant-ui Documentation](https://docs.assistant-ui.com)
- [Assistant Transport Protocol](https://docs.assistant-ui.com/concepts/assistant-transport)
- [FastAPI Example](../assistant-transport-backend/) - Compare implementations
- [LangGraph Integration](../assistant-transport-backend-langgraph/) - Advanced AI example

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please read the contributing guidelines in the main repository.

---

Built with ❤️ using Django and assistant-ui
