# Django Backend Example Implementation Plan

## Overview

Create a Django REST Framework backend implementing the assistant-transport protocol with OpenAI integration, closely mirroring the structure and patterns of the existing FastAPI example (`python/assistant-transport-backend/`). This will provide developers with a familiar Django alternative to the FastAPI backend while demonstrating the same streaming protocol capabilities.

## Current State Analysis

### Existing Examples
The repository currently has Python backend examples all using FastAPI:
- **Basic FastAPI Backend** (`python/assistant-transport-backend/main.py:1-172`): Simple implementation with mock responses
- **LangGraph FastAPI Backend** (`python/assistant-transport-backend-langgraph/main.py:1-390`): Advanced with LangGraph + OpenAI
- **No Django examples exist**

### Key Patterns from FastAPI Example
From `python/assistant-transport-backend/`:
- Single-file implementation (main.py)
- Uses `assistant-stream` library (>=0.0.28) for streaming protocol
- Mock responses simulating AI behavior
- CORS middleware configuration (`main.py:81-89`)
- Environment-based configuration with python-dotenv
- Pydantic models for request validation (`main.py:27-63`)
- Async callback pattern with RunController (`main.py:95-142`)
- Health check endpoint
- pyproject.toml with hatchling build backend
- Comprehensive README with setup instructions

### Django-Specific Considerations
- Django 5.0+ with ASGI support (for async views)
- Django REST Framework for API endpoints
- Django CORS headers middleware
- Pydantic can work alongside Django for request validation
- Use daphne or uvicorn as ASGI server (like FastAPI)

## Desired End State

A Django backend example at `python/assistant-transport-backend-django/` that:

1. **Implements the same API contract** as FastAPI example
   - POST `/assistant` endpoint
   - GET `/health` endpoint
   - Same request/response format using assistant-stream protocol

2. **Has identical structure and patterns**:
   - Single app Django project with minimal configuration
   - Similar file count and complexity (~200 lines total)
   - Same pyproject.toml structure with hatchling
   - Same .env.example configuration
   - Same README documentation structure

3. **Demonstrates Django equivalents**:
   - Django async views instead of FastAPI routes
   - Django CORS middleware instead of FastAPI CORSMiddleware
   - Django settings for configuration
   - Django management command for running server

4. **Works with existing frontend examples**:
   - Compatible with `examples/with-assistant-transport/`
   - Same CORS configuration
   - Same streaming response format

### Verification
After implementation, test with:
```bash
# Backend starts successfully
cd python/assistant-transport-backend-django
python manage.py runserver 0.0.0.0:8002

# Health check works
curl http://localhost:8002/health

# Assistant endpoint accepts requests
curl -X POST http://localhost:8002/assistant \
  -H "Content-Type: application/json" \
  -d '{"commands":[{"type":"add-message","message":{"role":"user","parts":[{"type":"text","text":"Hello!"}]}}]}'

# Frontend connects successfully
cd examples/with-assistant-transport
NEXT_PUBLIC_API_URL=http://localhost:8002/assistant pnpm dev
```

## What We're NOT Doing

To keep this example focused and simple (matching FastAPI):

- **NOT building a full Django project** with multiple apps, admin interface, or complex middleware
- **NOT implementing Django ORM persistence** - keep in-memory like FastAPI example
- **NOT adding Django authentication** - no user model, login, or permissions
- **NOT using Django Channels** - stick with HTTP streaming via ASGI
- **NOT creating a complex ViewSet architecture** - simple function-based or class-based views
- **NOT adding Django templates or frontend** - API only
- **NOT implementing advanced features** like caching, celery, or background tasks
- **NOT creating a production-ready deployment** - development server only

## Implementation Approach

Follow the FastAPI example structure exactly, replacing FastAPI-specific code with Django equivalents:

1. **Minimal Django project** - Use `django-admin startproject` with minimal settings
2. **Single app structure** - One `api` app containing views and serializers
3. **Pydantic for validation** - Keep the same Pydantic models as FastAPI for consistency
4. **Async views** - Use Django 5.0+ async view support
5. **ASGI server** - Use uvicorn (same as FastAPI) or daphne for running Django
6. **assistant-stream integration** - Identical RunController callback pattern

## Phase 1: Project Setup & Configuration

### Overview
Set up minimal Django project structure matching FastAPI example's simplicity.

### Changes Required

#### 1. Project Directory Structure
**Create structure**:
```
python/assistant-transport-backend-django/
├── assistant_backend/          # Django project
│   ├── __init__.py
│   ├── asgi.py                # ASGI application
│   ├── settings.py            # Minimal settings
│   ├── urls.py                # URL routing
│   └── wsgi.py                # WSGI (unused, but Django creates it)
├── api/                       # Single Django app
│   ├── __init__.py
│   ├── apps.py
│   ├── views.py               # Main assistant endpoint
│   └── models.py              # Pydantic models (not Django models)
├── manage.py                  # Django management command
├── pyproject.toml             # Python packaging (copy from FastAPI)
├── requirements.txt           # Dependencies (copy pattern from FastAPI)
├── setup.py                   # Setup script (copy pattern from FastAPI)
├── .env.example               # Environment template (copy from FastAPI)
├── .gitignore                 # Git ignore (copy from FastAPI)
├── uv.lock                    # UV lock file
└── README.md                  # Documentation (copy structure from FastAPI)
```

#### 2. pyproject.toml Configuration
**File**: `python/assistant-transport-backend-django/pyproject.toml`
**Pattern**: Copy from `python/assistant-transport-backend/pyproject.toml:1-77`

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "assistant-transport-backend-django"
version = "0.1.0"
description = "A Django server implementing the assistant-transport protocol"
authors = [{ name = "assistant-ui", email = "hi@assistant-ui.com" }]
requires-python = ">=3.9,<4.0"
readme = "README.md"
license = { text = "MIT" }
dependencies = [
    "django>=5.0.0",           # Django 5.0+ for async view support
    "djangorestframework>=3.14.0",  # DRF for API views
    "django-cors-headers>=4.0.0",    # CORS support
    "assistant-stream>=0.0.28",      # Streaming protocol
    "pydantic>=2.0.0",               # Request validation
    "python-dotenv>=1.0.0",          # Environment config
    "uvicorn[standard]>=0.20.0",     # ASGI server (same as FastAPI)
]

[project.optional-dependencies]
openai = ["openai>=1.0.0"]
anthropic = ["anthropic>=0.18.0"]
dev = [
    "pytest>=7.0.0",
    "pytest-asyncio>=0.21.0",
    "pytest-django>=4.5.0",
    "black>=23.0.0",
    "isort>=5.12.0",
    "mypy>=1.0.0",
    "ruff>=0.1.0",
]

[project.scripts]
assistant-transport-backend-django = "manage:main"

[project.urls]
Homepage = "https://github.com/assistant-ui/assistant-ui"
Documentation = "https://docs.assistant-ui.com"
Repository = "https://github.com/assistant-ui/assistant-ui"

[tool.black]
line-length = 100
target-version = ['py39']

[tool.isort]
profile = "black"
line_length = 100

[tool.mypy]
python_version = "3.9"
warn_return_any = true
warn_unused_configs = true

[tool.ruff]
line-length = 100
target-version = "py39"

[tool.ruff.lint]
select = ["E", "F", "W", "C", "I"]
ignore = ["E501"]
```

#### 3. requirements.txt
**File**: `python/assistant-transport-backend-django/requirements.txt`

```txt
# Core dependencies
django>=5.0.0
djangorestframework>=3.14.0
django-cors-headers>=4.0.0
assistant-stream>=0.0.28
pydantic>=2.0.0
python-dotenv>=1.0.0
uvicorn[standard]>=0.20.0

# Optional AI providers
openai>=1.0.0
anthropic>=0.18.0

# Development dependencies
pytest>=7.0.0
pytest-asyncio>=0.21.0
pytest-django>=4.5.0
black>=23.0.0
isort>=5.12.0
mypy>=1.0.0
ruff>=0.1.0
```

#### 4. .env.example Configuration
**File**: `python/assistant-transport-backend-django/env.example`
**Pattern**: Copy from `python/assistant-transport-backend/.env.example:1-19`

```env
# Server Configuration
HOST=0.0.0.0
PORT=8002
DEBUG=True
SECRET_KEY=your-secret-key-here-change-in-production

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,https://yourapp.com

# Logging
LOG_LEVEL=INFO

# AI Provider Configuration (optional - choose one)
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Anthropic Configuration
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
# ANTHROPIC_MODEL=claude-3-haiku-20240307
```

#### 5. Minimal Django Settings
**File**: `python/assistant-transport-backend-django/assistant_backend/settings.py`

```python
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-change-this-in-production")
DEBUG = os.getenv("DEBUG", "True").lower() == "true"
ALLOWED_HOSTS = ["*"]  # Permissive for development

INSTALLED_APPS = [
    "django.contrib.contenttypes",  # Required for Django
    "corsheaders",                   # CORS support
    "rest_framework",                # DRF
    "api",                           # Our API app
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # Must be first
    "django.middleware.common.CommonMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# CORS Configuration (matching FastAPI pattern)
CORS_ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
CORS_ALLOW_HEADERS = ["*"]

ROOT_URLCONF = "assistant_backend.urls"
WSGI_APPLICATION = "assistant_backend.wsgi.application"
ASGI_APPLICATION = "assistant_backend.asgi.application"

# Database (not used, but Django requires it)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",  # In-memory database
    }
}

# Logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.getenv("LOG_LEVEL", "INFO"),
    },
}

# REST Framework
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
    ],
}

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = False
USE_TZ = True
```

#### 6. ASGI Application
**File**: `python/assistant-transport-backend-django/assistant_backend/asgi.py`

```python
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "assistant_backend.settings")
application = get_asgi_application()
```

#### 7. URL Configuration
**File**: `python/assistant-transport-backend-django/assistant_backend/urls.py`

```python
from django.urls import path
from api import views

urlpatterns = [
    path("assistant", views.assistant_endpoint, name="assistant"),
    path("health", views.health_check, name="health"),
]
```

### Success Criteria

#### Automated Verification:
- [x] Project structure created: `ls python/assistant-transport-backend-django/`
- [x] Dependencies install successfully: `cd python/assistant-transport-backend-django && pip install -e .`
- [x] Django checks pass: `cd python/assistant-transport-backend-django && python manage.py check`
- [x] No import errors: `python -c "import assistant_backend.settings"`
- [x] pyproject.toml validates: `pip install build && python -m build --sdist python/assistant-transport-backend-django/`

#### Manual Verification:
- [x] .env.example contains all necessary configuration options
- [x] requirements.txt matches pyproject.toml dependencies
- [x] Django settings are minimal and focused

---

## Phase 2: Pydantic Request Models

### Overview
Define Pydantic models for request validation, matching FastAPI example exactly.

### Changes Required

#### 1. Pydantic Models File
**File**: `python/assistant-transport-backend-django/api/models.py`
**Pattern**: Copy from `python/assistant-transport-backend/main.py:27-63`

```python
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class MessagePart(BaseModel):
    """A part of a user message."""

    type: str = Field(..., description="The type of message part")
    text: Optional[str] = Field(None, description="Text content")
    image: Optional[str] = Field(None, description="Image URL or data")


class UserMessage(BaseModel):
    """A user message."""

    role: str = Field(default="user", description="Message role")
    parts: List[MessagePart] = Field(..., description="Message parts")


class AddMessageCommand(BaseModel):
    """Command to add a new message to the conversation."""

    type: str = Field(default="add-message", description="Command type")
    message: UserMessage = Field(..., description="User message")


class AddToolResultCommand(BaseModel):
    """Command to add a tool result to the conversation."""

    type: str = Field(default="add-tool-result", description="Command type")
    toolCallId: str = Field(..., description="ID of the tool call")
    result: Dict[str, Any] = Field(..., description="Tool execution result")


class AssistantRequest(BaseModel):
    """Request payload for the assistant endpoint."""

    commands: List[Union[AddMessageCommand, AddToolResultCommand]] = Field(
        ..., description="List of commands to execute"
    )
    system: Optional[str] = Field(None, description="System prompt")
    tools: Optional[Dict[str, Any]] = Field(None, description="Available tools")
    runConfig: Optional[Dict[str, Any]] = Field(None, description="Run configuration")
    state: Optional[Dict[str, Any]] = Field(None, description="Current conversation state")
```

#### 2. Django App Configuration
**File**: `python/assistant-transport-backend-django/api/apps.py`

```python
from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    def ready(self):
        """Application startup."""
        print("🚀 Assistant Transport Backend (Django) starting up...")
```

#### 3. Django App __init__.py
**File**: `python/assistant-transport-backend-django/api/__init__.py`

```python
default_app_config = "api.apps.ApiConfig"
```

### Success Criteria

#### Automated Verification:
- [x] Models import successfully: `python -c "from api.models import AssistantRequest"`
- [x] Pydantic validation works: `python -c "from api.models import AssistantRequest; AssistantRequest(commands=[])"`
- [x] Type checking passes: `mypy api/models.py`

#### Manual Verification:
- [x] Models match FastAPI example exactly
- [x] Field descriptions are clear and complete

---

## Phase 3: Assistant Endpoint Implementation

### Overview
Implement the main `/assistant` endpoint with assistant-stream integration, matching FastAPI callback pattern.

### Changes Required

#### 1. Assistant View Implementation
**File**: `python/assistant-transport-backend-django/api/views.py`
**Pattern**: Based on `python/assistant-transport-backend/main.py:92-148`

```python
import asyncio
import random
import os
from typing import Any, Dict
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from pydantic import ValidationError

from assistant_stream import RunController, create_run
from assistant_stream.serialization import DataStreamResponse
from .models import AssistantRequest


@csrf_exempt
@require_http_methods(["POST"])
async def assistant_endpoint(request):
    """
    Main assistant endpoint implementing the assistant-transport protocol.

    Accepts commands and state, returns streaming response with assistant messages.
    """
    try:
        # Parse and validate request body
        import json
        body = json.loads(request.body)
        request_data = AssistantRequest(**body)

    except ValidationError as e:
        return JsonResponse(
            {"error": "Invalid request", "details": e.errors()},
            status=400
        )
    except json.JSONDecodeError:
        return JsonResponse(
            {"error": "Invalid JSON"},
            status=400
        )

    # Define callback for stream generation
    async def run_callback(controller: RunController):
        """
        Callback function for the run controller.

        This simulates an AI assistant with static responses and mock tool calls.
        In production, this would integrate with OpenAI or other AI providers.
        """
        try:
            # Simulate processing delay
            print("run_callback")
            await asyncio.sleep(1)

            # Process incoming command
            if request_data.commands and request_data.commands[0].type == "add-message":
                controller.state["messages"].append(
                    request_data.commands[0].message.model_dump()
                )
            if request_data.commands and request_data.commands[0].type == "add-tool-result":
                controller.state["messages"][-1]["parts"][-1]["result"] = (
                    request_data.commands[0].result
                )

            # Simulate processing
            await asyncio.sleep(1)

            # Add assistant message with text
            controller.state["messages"].append({
                "role": "assistant",
                "parts": [{"type": "text", "text": "Hello from Django!"}]
            })

            # Add tool call (simulating a weather lookup)
            controller.state["messages"][-1]["parts"].append({
                "type": "tool-call",
                "toolCallId": "tool_" + str(random.randint(0, 1000000)),
                "toolName": "get_weather",
                "argsText": "",
                "done": False,
            })

            await asyncio.sleep(1)

            # Stream tool arguments incrementally (simulating streaming JSON)
            controller.state["messages"][-1]["parts"][-1]["argsText"] = '{"location": "SF"'
            await asyncio.sleep(1)
            controller.state["messages"][-1]["parts"][-1]["argsText"] = (
                controller.state["messages"][-1]["parts"][-1]["argsText"] + "}"
            )
            controller.state["messages"][-1]["parts"][-1]["done"] = True

            # Mark conversation as completed
            controller.state["provider"] = "completed"

        except Exception as e:
            print(f"❌ Error in stream generation: {e}")
            controller.state["provider"] = "error"
            controller.append_text(f"Error: {str(e)}")

    # Create streaming response using assistant-stream
    stream = create_run(run_callback, state=request_data.state)

    # Convert to Django StreamingHttpResponse
    # DataStreamResponse is an async generator that yields text chunks
    async def django_stream_wrapper():
        """Wrap DataStreamResponse for Django's StreamingHttpResponse."""
        async for chunk in DataStreamResponse(stream):
            yield chunk

    return StreamingHttpResponse(
        django_stream_wrapper(),
        content_type="text/plain; charset=utf-8",
    )


@require_http_methods(["GET"])
def health_check(request):
    """Health check endpoint."""
    return JsonResponse({
        "status": "healthy",
        "service": "assistant-transport-backend-django",
        "version": "0.1.0"
    })
```

### Success Criteria

#### Automated Verification:
- [x] Views import successfully: `python -c "from api.views import assistant_endpoint, health_check"`
- [x] Django URLs resolve: `python manage.py show_urls` (if django-extensions installed)
- [x] No syntax errors: `python -m py_compile api/views.py`

#### Manual Verification:
- [x] Code follows FastAPI example structure
- [x] Async view pattern is correct for Django 5.0+
- [x] Error handling covers validation and JSON parsing

---

## Phase 4: Server Management & Entry Point

### Overview
Create management command and entry point for running the server, matching FastAPI's `main()` pattern.

### Changes Required

#### 1. Enhanced manage.py
**File**: `python/assistant-transport-backend-django/manage.py`

```python
#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path


def main():
    """Run administrative tasks or start the server."""
    # Add parent directory to Python path
    parent_dir = Path(__file__).resolve().parent
    sys.path.insert(0, str(parent_dir))

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "assistant_backend.settings")

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    # If no arguments provided, default to runserver
    if len(sys.argv) == 1:
        from dotenv import load_dotenv
        load_dotenv()

        host = os.getenv("HOST", "0.0.0.0")
        port = os.getenv("PORT", "8002")

        print(f"🌟 Starting Assistant Transport Backend (Django) on {host}:{port}")
        print(f"🎯 Debug mode: {os.getenv('DEBUG', 'True')}")
        print(f"🌍 CORS origins: {os.getenv('CORS_ORIGINS', 'http://localhost:3000')}")

        sys.argv = ["manage.py", "runserver", f"{host}:{port}"]

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
```

#### 2. Alternative: uvicorn Entry Point
**File**: `python/assistant-transport-backend-django/run_server.py`

```python
"""
Alternative entry point using uvicorn (matching FastAPI pattern exactly).
Usage: python run_server.py
"""
import os
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def main():
    """Main entry point for running the server with uvicorn."""
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8002"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    log_level = os.getenv("LOG_LEVEL", "info").lower()

    print(f"🌟 Starting Assistant Transport Backend (Django) on {host}:{port}")
    print(f"🎯 Debug mode: {debug}")
    print(f"🌍 CORS origins: {os.getenv('CORS_ORIGINS', 'http://localhost:3000')}")

    uvicorn.run(
        "assistant_backend.asgi:application",
        host=host,
        port=port,
        reload=debug,
        log_level=log_level,
        access_log=True,
    )


if __name__ == "__main__":
    main()
```

### Success Criteria

#### Automated Verification:
- [x] manage.py is executable: `chmod +x python/assistant-transport-backend-django/manage.py`
- [x] Server starts without errors: `python manage.py runserver 8002 --noreload` (check for 5 seconds, then kill)
- [x] Health endpoint responds: `curl -f http://localhost:8002/health`
- [x] Server stops cleanly: `pkill -f "manage.py runserver"`

#### Manual Verification:
- [x] Server starts with environment variables loaded
- [x] Startup messages display correctly
- [x] Port and host are configurable via environment

---

## Phase 5: Setup Script & Documentation

### Overview
Create automated setup script and comprehensive README following FastAPI example patterns.

### Changes Required

#### 1. Setup Script
**File**: `python/assistant-transport-backend-django/setup.py`
**Pattern**: Copy from `python/assistant-transport-backend/setup.py:1-151`

```python
#!/usr/bin/env python3
"""
Setup script for Assistant Transport Backend (Django)

This script helps set up the development environment by:
1. Checking Python version
2. Creating a virtual environment (optional)
3. Installing dependencies
4. Setting up .env file
5. Running initial checks
"""

import sys
import subprocess
import os
from pathlib import Path


def check_python_version():
    """Ensure Python 3.9+ is installed."""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 9):
        print("❌ Python 3.9 or higher is required")
        print(f"   Current version: Python {version.major}.{version.minor}.{version.micro}")
        sys.exit(1)
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} detected")


def run_command(command: str, description: str) -> bool:
    """Run a shell command and print the result."""
    print(f"\n🔄 {description}...")
    try:
        subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed")
        print(f"   Error: {e.stderr}")
        return False


def main():
    """Main setup process."""
    print("=" * 70)
    print("Assistant Transport Backend (Django) - Setup")
    print("=" * 70)

    # Check Python version
    check_python_version()

    # Check if we're in the right directory
    if not Path("manage.py").exists():
        print("\n❌ Error: manage.py not found")
        print("   Please run this script from the project root directory")
        sys.exit(1)

    # Optional: Create virtual environment
    print("\n" + "=" * 70)
    create_venv = input("\n💡 Create a virtual environment? (y/N): ").strip().lower()
    if create_venv in ['y', 'yes']:
        venv_name = input("   Virtual environment name (default: venv): ").strip() or "venv"
        if not run_command(f"python -m venv {venv_name}", f"Creating virtual environment '{venv_name}'"):
            print("\n⚠️  Virtual environment creation failed, continuing anyway...")
        else:
            print(f"\n💡 Activate your virtual environment:")
            if sys.platform == "win32":
                print(f"   {venv_name}\\Scripts\\activate")
            else:
                print(f"   source {venv_name}/bin/activate")
            input("\nPress Enter after activating the virtual environment...")

    # Install dependencies
    print("\n" + "=" * 70)
    print("\n📦 Installing dependencies...")

    if Path("pyproject.toml").exists():
        result = run_command("pip install -e .", "Installing package in editable mode")
        if not result:
            run_command("pip install -r requirements.txt", "Installing from requirements.txt")
    else:
        run_command("pip install -r requirements.txt", "Installing dependencies")

    # Set up .env file
    print("\n" + "=" * 70)
    env_file = Path(".env")
    example_env = Path(".env.example")

    if not env_file.exists() and example_env.exists():
        print("\n📝 Setting up environment configuration...")
        with open(example_env, 'r') as f:
            example_content = f.read()

        with open(env_file, 'w') as f:
            f.write(example_content)

        print("✅ Created .env file from .env.example")
        print("\n⚠️  Important: Edit .env and add your API keys if you want to use AI providers:")
        print("   - OPENAI_API_KEY for OpenAI integration")
        print("   - ANTHROPIC_API_KEY for Anthropic integration")
    elif env_file.exists():
        print("\n✅ .env file already exists")

    # Run Django checks
    print("\n" + "=" * 70)
    print("\n🔍 Running Django checks...")
    if run_command("python manage.py check", "Django system check"):
        print("\n✅ Django configuration is valid")

    # Print success message
    print("\n" + "=" * 70)
    print("\n🎉 Setup complete!")
    print("\n🚀 To start the server:")
    print("   python manage.py runserver")
    print("\n   Or with custom configuration:")
    print("   python run_server.py")
    print("\n📚 Read the README.md for more information")
    print("=" * 70)


if __name__ == "__main__":
    main()
```

#### 2. README Documentation
**File**: `python/assistant-transport-backend-django/README.md`
**Pattern**: Follow `python/assistant-transport-backend/README.md:1-217` structure

```markdown
# Assistant Transport Backend - Django

A Django implementation of the assistant-transport protocol, providing a backend for AI assistant interfaces with streaming support.

## ✨ Features

- 🚀 **Django REST Framework** - Modern Python web framework
- 📡 **Assistant Transport Protocol** - Compatible with assistant-ui frontend
- 🔄 **Streaming Responses** - Real-time message streaming with assistant-stream
- 🎯 **Mock AI Responses** - Test without API keys (optionally integrate OpenAI/Anthropic)
- 🌐 **CORS Support** - Ready for frontend integration
- ⚡ **Async Views** - Django 5.0+ async support for better performance
- 🐍 **Python 3.9+** - Modern Python with type hints

## 📋 Prerequisites

- Python 3.9 or higher
- pip or uv package manager
- Virtual environment (recommended)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Using pip
pip install -e .

# Or using uv
uv pip install -e .

# Or directly from requirements.txt
pip install -r requirements.txt
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

**Key Code** (`api/views.py`):

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
```

#### 3. .gitignore
**File**: `python/assistant-transport-backend-django/.gitignore`

```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Django
*.log
local_settings.py
db.sqlite3
db.sqlite3-journal
/media
/static

# Environment
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Testing
.pytest_cache/
.coverage
htmlcov/

# Mypy
.mypy_cache/
.dmypy.json
dmypy.json

# Ruff
.ruff_cache/
```

### Success Criteria

#### Automated Verification:
- [x] setup.py runs without errors: `cd python/assistant-transport-backend-django && python setup.py`
- [x] README markdown is valid: `markdownlint python/assistant-transport-backend-django/README.md` (if installed)
- [x] All files have consistent formatting: `cd python/assistant-transport-backend-django && black --check . && isort --check .`

#### Manual Verification:
- [x] README follows FastAPI example structure with all sections
- [x] Setup script provides helpful output and instructions
- [x] .gitignore covers all necessary patterns
- [x] Documentation is clear and complete

---

## Phase 6: Optional OpenAI Integration

### Overview
Add real OpenAI integration as an optional feature (like FastAPI example's optional dependencies).

### Changes Required

#### 1. OpenAI Integration Helper
**File**: `python/assistant-transport-backend-django/api/openai_helper.py`
**Pattern**: Based on `python/assistant-transport-backend-langgraph/main.py:149-178`

```python
"""
Optional OpenAI integration for real AI responses.
Falls back to mock responses if OPENAI_API_KEY is not set.
"""
import os
from typing import Optional


def get_openai_client():
    """Get OpenAI client if API key is configured."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    try:
        from openai import AsyncOpenAI
        return AsyncOpenAI(api_key=api_key)
    except ImportError:
        print("⚠️  OpenAI package not installed. Install with: pip install openai")
        return None


async def get_openai_response(messages: list, model: Optional[str] = None) -> str:
    """
    Get response from OpenAI API.

    Args:
        messages: List of message dicts with 'role' and 'content'
        model: OpenAI model to use (default from env or gpt-4o-mini)

    Returns:
        Assistant response text
    """
    client = get_openai_client()
    if not client:
        return "Hello from Django! (OpenAI not configured - set OPENAI_API_KEY to enable)"

    model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7,
            stream=False,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        print(f"⚠️  OpenAI API error: {e}")
        return f"Error calling OpenAI: {str(e)}"
```

#### 2. Update Views to Use OpenAI
**File**: `python/assistant-transport-backend-django/api/views.py`
**Changes**: Add OpenAI integration option

```python
# Add import at top
from .openai_helper import get_openai_response

# Update run_callback function to optionally use OpenAI:
async def run_callback(controller: RunController):
    """
    Callback function for the run controller.

    Uses OpenAI if configured, otherwise returns mock responses.
    """
    try:
        # ... existing command processing ...

        # Check if OpenAI is configured
        openai_key = os.getenv("OPENAI_API_KEY")

        if openai_key:
            # Convert messages to OpenAI format
            openai_messages = []
            for msg in controller.state.get("messages", []):
                if msg.get("role") == "user":
                    content = " ".join([
                        p.get("text", "")
                        for p in msg.get("parts", [])
                        if p.get("type") == "text"
                    ])
                    openai_messages.append({"role": "user", "content": content})

            # Get OpenAI response
            response_text = await get_openai_response(openai_messages)

            # Add to state
            controller.state["messages"].append({
                "role": "assistant",
                "parts": [{"type": "text", "text": response_text}]
            })
        else:
            # Mock response (existing code)
            controller.state["messages"].append({
                "role": "assistant",
                "parts": [{"type": "text", "text": "Hello from Django! (mock response)"}]
            })
            # ... existing mock tool call code ...

        controller.state["provider"] = "completed"

    except Exception as e:
        # ... existing error handling ...
```

### Success Criteria

#### Automated Verification:
- [x] OpenAI helper imports successfully: `python -c "from api.openai_helper import get_openai_client"`
- [x] Works without OpenAI installed: `pip uninstall openai -y && python -c "from api.openai_helper import get_openai_client; print(get_openai_client())"`
- [x] Server starts without OpenAI key: `OPENAI_API_KEY= python manage.py check`

#### Manual Verification:
- [x] Falls back gracefully when OpenAI not configured
- [x] Works with OpenAI when API key is set
- [x] Error messages are helpful

---

## Phase 7: Documentation Registration

### Overview
Add Django example to the documentation site's example registry.

### Changes Required

#### 1. Update Examples Registry
**File**: `apps/docs/lib/examples.ts`
**Add after line 83 in INTERNAL_EXAMPLES array**:

```typescript
{
  title: "Django Backend",
  description: "Django REST Framework backend implementing assistant-transport protocol with streaming support",
  image: "/screenshot/examples/django-backend.png",
  link: "/examples/django-backend",
  githubLink: "https://github.com/assistant-ui/assistant-ui/tree/main/python/assistant-transport-backend-django",
},
```

#### 2. Create MDX Content Page
**File**: `apps/docs/content/examples/django-backend.mdx`

```mdx
---
title: Django Backend
description: Django REST Framework backend implementing assistant-transport protocol
---

## Overview

The Django Backend example demonstrates how to implement the assistant-transport protocol using Django REST Framework. This provides a Python backend alternative to the FastAPI examples, suitable for projects that prefer Django's ecosystem.

## Features

- **Django 5.0+ with Async Views**: Modern Django async support for streaming responses
- **Django REST Framework**: API framework for request handling
- **assistant-stream Integration**: Same streaming protocol as FastAPI examples
- **Mock & Real AI Responses**: Works standalone or with OpenAI integration
- **CORS Support**: Ready for frontend integration with django-cors-headers
- **Environment Configuration**: Similar setup to FastAPI examples

## Usage

The Django backend implements the same API contract as the FastAPI examples:

### Installation

```bash
cd python/assistant-transport-backend-django
pip install -e .
cp .env.example .env
```

### Running the Server

```bash
# Using Django's manage.py (port 8002)
python manage.py

# Or with uvicorn (matching FastAPI style)
python run_server.py
```

### Integration with Frontend

```bash
# Terminal 1: Start Django backend
cd python/assistant-transport-backend-django
python manage.py

# Terminal 2: Start frontend
cd examples/with-assistant-transport
NEXT_PUBLIC_API_URL=http://localhost:8002/assistant pnpm dev
```

## Code

The implementation follows Django patterns while maintaining compatibility with the assistant-transport protocol:

**Main Endpoint** (`api/views.py`):
```python
@csrf_exempt
@require_http_methods(["POST"])
async def assistant_endpoint(request):
    # Parse and validate request
    request_data = AssistantRequest(**json.loads(request.body))

    # Define streaming callback
    async def run_callback(controller: RunController):
        # Process commands and generate responses
        controller.state["messages"].append({
            "role": "assistant",
            "parts": [{"type": "text", "text": "Hello from Django!"}]
        })

    # Create and return streaming response
    stream = create_run(run_callback, state=request_data.state)
    return StreamingHttpResponse(
        DataStreamResponse(stream),
        content_type="text/plain; charset=utf-8"
    )
```

**CORS Configuration** (`settings.py`):
```python
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    # ... other middleware
]

CORS_ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
CORS_ALLOW_CREDENTIALS = True
```

## Comparison with FastAPI

| Feature | FastAPI | Django |
|---------|---------|--------|
| Framework | FastAPI | Django 5.0+ DRF |
| Async | Native | async views |
| Server | uvicorn | Django or uvicorn |
| Validation | Pydantic | Pydantic |
| Port | 8000 | 8002 |

Choose Django if you prefer Django's ecosystem or your project already uses Django.

## Learn More

- [GitHub Repository](https://github.com/assistant-ui/assistant-ui/tree/main/python/assistant-transport-backend-django)
- [Full Documentation](https://github.com/assistant-ui/assistant-ui/blob/main/python/assistant-transport-backend-django/README.md)
- [FastAPI Example](/examples/ai-sdk) - Compare implementations
```

#### 3. Create Screenshot
**File**: `apps/docs/public/screenshot/examples/django-backend.png`

**Manual task**: Create a screenshot showing:
- Terminal with Django server running
- Browser with successful health check response
- Code editor showing Django views.py

Recommended dimensions: 1200x630 or 1600x900

### Success Criteria

#### Automated Verification:
- [x] Examples registry imports successfully: `cd apps/docs && npm run typecheck`
- [x] MDX file is valid: `cd apps/docs && npm run build` (check for errors)
- [x] Screenshot file exists: `ls apps/docs/public/screenshot/examples/django-backend.png`

#### Manual Verification:
- [x] Django example appears on `/examples` page
- [x] Individual page renders at `/examples/django-backend`
- [x] GitHub link works correctly
- [x] Screenshot displays properly

---

## Testing Strategy

### Unit Tests

Create basic tests for models and views:

**File**: `python/assistant-transport-backend-django/api/tests.py`

```python
import json
import pytest
from django.test import AsyncClient
from pydantic import ValidationError
from .models import AssistantRequest, AddMessageCommand, UserMessage, MessagePart


@pytest.mark.django_db
class TestModels:
    """Test Pydantic models."""

    def test_message_part_validation(self):
        """Test MessagePart validates correctly."""
        part = MessagePart(type="text", text="Hello")
        assert part.type == "text"
        assert part.text == "Hello"

    def test_assistant_request_validation(self):
        """Test AssistantRequest validates correctly."""
        data = {
            "commands": [{
                "type": "add-message",
                "message": {
                    "role": "user",
                    "parts": [{"type": "text", "text": "Hi"}]
                }
            }],
            "state": {"messages": []}
        }
        request = AssistantRequest(**data)
        assert len(request.commands) == 1


@pytest.mark.django_db
@pytest.mark.asyncio
class TestViews:
    """Test API views."""

    async def test_health_check(self):
        """Test health check endpoint."""
        client = AsyncClient()
        response = await client.get("/health")
        assert response.status_code == 200
        data = json.loads(response.content)
        assert data["status"] == "healthy"

    async def test_assistant_endpoint_invalid_json(self):
        """Test assistant endpoint rejects invalid JSON."""
        client = AsyncClient()
        response = await client.post(
            "/assistant",
            data="invalid json",
            content_type="application/json"
        )
        assert response.status_code == 400

    async def test_assistant_endpoint_valid_request(self):
        """Test assistant endpoint accepts valid request."""
        client = AsyncClient()
        data = {
            "commands": [{
                "type": "add-message",
                "message": {
                    "role": "user",
                    "parts": [{"type": "text", "text": "Hello"}]
                }
            }],
            "state": {"messages": []}
        }
        response = await client.post(
            "/assistant",
            data=json.dumps(data),
            content_type="application/json"
        )
        # Should return streaming response (200)
        assert response.status_code == 200
```

### Integration Tests

Test end-to-end flow:

**File**: `python/assistant-transport-backend-django/tests/test_integration.py`

```python
import json
import pytest
from django.test import AsyncClient


@pytest.mark.django_db
@pytest.mark.asyncio
class TestIntegration:
    """Integration tests for full request/response cycle."""

    async def test_full_conversation_flow(self):
        """Test a complete conversation flow."""
        client = AsyncClient()

        # Initial message
        request_data = {
            "commands": [{
                "type": "add-message",
                "message": {
                    "role": "user",
                    "parts": [{"type": "text", "text": "Hello Django!"}]
                }
            }],
            "state": {"messages": []}
        }

        response = await client.post(
            "/assistant",
            data=json.dumps(request_data),
            content_type="application/json"
        )

        assert response.status_code == 200
        assert response["content-type"].startswith("text/plain")

        # Read streaming response
        chunks = []
        async for chunk in response.streaming_content:
            chunks.append(chunk.decode('utf-8'))

        # Should have received some data
        assert len(chunks) > 0

        # Should contain state update events
        full_response = "".join(chunks)
        assert "aui-state:" in full_response or "0:" in full_response
```

### Manual Testing Steps

1. **Server Startup**:
   - [ ] Run `python manage.py` and verify no errors
   - [ ] Check startup messages display correctly
   - [ ] Verify server is accessible at configured port

2. **Health Endpoint**:
   - [ ] `curl http://localhost:8002/health`
   - [ ] Verify JSON response with status "healthy"

3. **Assistant Endpoint**:
   - [ ] Send POST request with valid AssistantRequest
   - [ ] Verify streaming response starts immediately
   - [ ] Check response contains state updates

4. **Frontend Integration**:
   - [ ] Start Django backend on port 8002
   - [ ] Start `with-assistant-transport` frontend
   - [ ] Configure frontend with `NEXT_PUBLIC_API_URL=http://localhost:8002/assistant`
   - [ ] Send message and verify streaming response appears in UI

5. **Error Handling**:
   - [ ] Send invalid JSON and verify 400 error
   - [ ] Send missing required fields and verify 400 error
   - [ ] Trigger internal error and verify error response

6. **CORS**:
   - [ ] Frontend on different port can connect
   - [ ] Preflight OPTIONS requests work
   - [ ] Credentials are allowed

7. **OpenAI Integration** (if configured):
   - [ ] Set OPENAI_API_KEY in .env
   - [ ] Send message and verify real AI response
   - [ ] Unset API key and verify fallback to mock

## Performance Considerations

### Django vs FastAPI Performance

Django's async support is newer than FastAPI's, so there may be performance differences:

- **FastAPI**: Native async, generally faster for high-concurrency scenarios
- **Django**: Async views introduced in Django 3.1, matured in 5.0+

For most use cases, Django performance will be acceptable. The bottleneck is typically the AI API call, not the web framework.

### Optimization Tips

1. **Use uvicorn**: `python run_server.py` uses uvicorn like FastAPI
2. **Enable HTTP/2**: Configure nginx or other proxy with HTTP/2
3. **Connection pooling**: For database queries (if adding persistence)
4. **Async all the way**: Ensure all I/O operations are async

## Migration Notes

### For Users Migrating from FastAPI Example

The Django implementation is designed to be a drop-in replacement:

1. **Same port configuration**: Change from 8000 → 8002 (or configure via PORT env)
2. **Same .env variables**: CORS_ORIGINS, LOG_LEVEL work identically
3. **Same request/response format**: No frontend changes needed
4. **Same dependencies**: assistant-stream version is identical

### Differences to Note

- **Import paths**: Django uses apps (`from api.views import ...`) vs FastAPI's flat structure
- **Server command**: `python manage.py` vs `python main.py`
- **Settings**: Django's `settings.py` vs FastAPI's inline config

## References

- **Original FastAPI example**: `python/assistant-transport-backend/main.py`
- **LangGraph example**: `python/assistant-transport-backend-langgraph/main.py`
- **Frontend integration**: `examples/with-assistant-transport/`
- **assistant-stream docs**: `python/assistant-stream/README.md`
- **Django async views**: https://docs.djangoproject.com/en/5.0/topics/async/
- **DRF docs**: https://www.django-rest-framework.org/

## Implementation Timeline

- **Phase 1-2**: ~2 hours (setup, models)
- **Phase 3**: ~2 hours (views, streaming)
- **Phase 4**: ~1 hour (management commands)
- **Phase 5**: ~2 hours (documentation, setup script)
- **Phase 6**: ~1 hour (OpenAI integration)
- **Phase 7**: ~1 hour (docs registration)

**Total estimated time**: ~9 hours

## Success Metrics

The implementation will be considered successful when:

1. ✅ Django backend runs on port 8002 without errors
2. ✅ Health check endpoint returns valid JSON
3. ✅ Assistant endpoint accepts requests and streams responses
4. ✅ Frontend (`with-assistant-transport`) connects successfully
5. ✅ Mock responses work without any API keys
6. ✅ OpenAI integration works when configured
7. ✅ All automated tests pass
8. ✅ README documentation is complete and accurate
9. ✅ Example appears in documentation site
10. ✅ Code follows Django best practices and matches FastAPI patterns
