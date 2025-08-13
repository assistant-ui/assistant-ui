# Assistant UI Sync Server API

A Python client library for interacting with Assistant UI sync server backends, providing the same API structure as the JavaScript/TypeScript `useChatRuntime`.

## Installation

```bash
pip install assistant-ui-sync-server-api
```

Or using uv:

```bash
uv add assistant-ui-sync-server-api
```

## Usage

### Basic Example

```python
import asyncio
from assistant_ui import AssistantClient

# Create a client
client = AssistantClient(base_url="https://api.example.com")

# Create messages
messages = [
    {
        "role": "user",
        "content": [{"type": "text", "text": "Hello, how are you?"}]
    }
]

# Send a chat request to a specific thread
async def main():
    thread = client.threads("thread-123")
    response = await thread.chat(
        messages=messages,
        system="You are a helpful assistant."
    )
    print(response.json())
    await client.close()

asyncio.run(main())
```

### Using Context Managers

```python
# Async context manager
async with AssistantClient(base_url="https://api.example.com") as client:
    thread = client.threads("thread-123")
    response = await thread.chat(messages=messages)

# Sync context manager
with AssistantClient(base_url="https://api.example.com") as client:
    thread = client.threads("thread-123")
    response = thread.chat_sync(messages=messages)
```

### Authentication

```python
# Static headers
client = AssistantClient(
    base_url="https://api.example.com",
    headers={"Authorization": "Bearer your-token"}
)

# Dynamic headers (async)
async def get_auth_headers():
    token = await fetch_token()
    return {"Authorization": f"Bearer {token}"}

client = AssistantClient(
    base_url="https://api.example.com",
    headers=get_auth_headers
)
```

### Using Tools

```python
tools = {
    "get_weather": {
        "description": "Get the current weather for a location",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {"type": "string"},
                "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
            },
            "required": ["location"]
        }
    }
}

thread = client.threads("thread-123")
response = await thread.chat(
    messages=messages,
    tools=tools
)
```

### Canceling Operations

```python
thread = client.threads("thread-123")

# Start a long-running chat
chat_task = asyncio.create_task(thread.chat(messages=messages))

# Cancel it
await thread.cancel()
chat_task.cancel()
```

### Message Types

The package supports various message types matching the Assistant UI format:

```python
from assistant_ui.types import Message

# Text message
text_message: Message = {
    "role": "user",
    "content": [{"type": "text", "text": "Hello!"}]
}

# Image message
image_message: Message = {
    "role": "user",
    "content": [
        {"type": "text", "text": "What's in this image?"},
        {"type": "image", "image": "https://example.com/image.jpg"}
    ]
}

# File message
file_message: Message = {
    "role": "user",
    "content": [
        {"type": "file", "data": "https://example.com/file.pdf", "mimeType": "application/pdf"}
    ]
}

# Assistant message with tool calls
assistant_message: Message = {
    "role": "assistant",
    "content": [
        {"type": "text", "text": "I'll help you with that."},
        {
            "type": "tool-call",
            "toolCallId": "call-123",
            "toolName": "get_weather",
            "args": {"location": "San Francisco"}
        }
    ]
}

# Tool result message
tool_message: Message = {
    "role": "tool",
    "content": [
        {
            "type": "tool-result",
            "toolCallId": "call-123",
            "toolName": "get_weather",
            "result": {"temperature": 72, "condition": "sunny"},
            "isError": False
        }
    ]
}
```

## API Reference

### `AssistantClient`

Main client for interacting with Assistant UI backends.

**Constructor:**

```python
AssistantClient(
    base_url: str,
    headers: Optional[Dict[str, str] | Callable] = None,
    timeout: Optional[float] = None,
    **kwargs
)
```

**Methods:**

- `threads(thread_id: str) -> ThreadClient`: Get a ThreadClient for a specific thread
- `close()`: Close the async client
- `close_sync()`: Close the sync client

### `ThreadClient`

Client for interacting with a specific thread.

**Methods:**

- `chat(messages, system=None, tools=None, **kwargs)`: Send an async chat request
- `chat_sync(messages, system=None, tools=None, **kwargs)`: Send a sync chat request
- `cancel()`: Cancel the current async operation
- `cancel_sync()`: Cancel the current sync operation

## Type Definitions

The package includes TypedDict definitions for all message types and configuration options, providing full type hints for better IDE support and type checking.

## Development

This package is part of the Assistant UI monorepo. To contribute:

1. Clone the main repository
2. Navigate to `python/assistant-ui`
3. Install dependencies with `uv sync`
4. Run tests with `uv run pytest`
