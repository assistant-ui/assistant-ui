# Assistant Transport Backend with LangGraph

This is a LangGraph-based implementation of the assistant transport backend, providing streaming chat capabilities using FastAPI, assistant-stream, and LangGraph.

## Features

- Streaming responses using LangGraph's astream and astream_events
- Synchronization of LangGraph state to the frontend
- Support for both message streaming and state updates
- DeltaChannel-backed LangGraph message checkpoints (`langgraph>=1.2`)
- Optional Postgres checkpoint storage via `langgraph-checkpoint-postgres`
- Compatible with the assistant-ui frontend

## Installation

### Using uv (Recommended)

1. Initialize and install dependencies:
```bash
uv init --name assistant-transport-backend-langgraph --package
uv add fastapi uvicorn[standard] assistant-stream pydantic python-dotenv "langgraph>=1.2.0" langgraph-checkpoint-postgres langchain langchain-core langchain-openai httpx
# Or simply:
uv sync
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env to add your OpenAI API key
```

### Using pip

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env to add your OpenAI API key
```

## Configuration

The server can be configured via environment variables:

- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8001)
- `DEBUG`: Enable debug mode (default: false)
- `LOG_LEVEL`: Log level (default: info)
- `CORS_ORIGINS`: CORS origins (default: http://localhost:3000)
- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `LANGGRAPH_POSTGRES_URL`: Optional Postgres connection URL for LangGraph checkpoints
- `DATABASE_URL`: Fallback Postgres connection URL when `LANGGRAPH_POSTGRES_URL` is not set

## Running the Server

### Using uv
```bash
uv run python main.py
```

Or with uvicorn directly:
```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

### Using standard Python
```bash
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

## API Endpoints

### POST /api/chat
Main chat endpoint that processes commands and streams responses using LangGraph.

Request body:
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
            "text": "Hello, how are you?"
          }
        ]
      }
    }
  ],
  "system": "Optional system prompt",
  "state": {}
}
```

### GET /health
Health check endpoint.

## How It Works

1. The server receives chat requests at `/api/chat`
2. Commands are converted to LangGraph messages (HumanMessage, AIMessage, etc.)
3. The LangGraph processes the messages through its nodes using a per-thread checkpoint keyed by the AssistantTransport `threadId`
4. Two streaming tasks run concurrently:
   - `astream` provides state updates
   - `astream_events` provides message streaming
5. Both streams are synchronized to the frontend using `append_langgraph_event`
6. The response is streamed back using assistant-stream's DataStreamResponse

Frontend tools declared by `useAssistantTransportRuntime` are bound to the LangGraph model from the request `tools` payload, but they are not executed by this backend. For example, the `with-assistant-transport` demo keeps `get_weather` frontend-only: the backend streams the tool call, the browser runs the tool and sends an `add-tool-result` command, and LangGraph continues from that result. Server-owned smoke tools such as `calculate_sum`, `save_note`, and `task_tool` still execute inside the backend graph.

## DeltaChannel Prototype Notes

The graph's `messages` state uses LangGraph's `DeltaChannel` with a bulk reducer:

```python
def add_messages_delta(state, writes):
    result = list(state)
    for write in writes:
        if isinstance(write, BaseMessage):
            result = add_messages(result, [write])
        else:
            result = add_messages(result, list(write))
    return result
```

This keeps the assistant-ui API unchanged. The frontend still uses `useAssistantTransportRuntime`; the backend still accepts normal AssistantTransport `add-message` and `add-tool-result` commands; and the response remains the default data-stream encoding. The only required API adjustment is inside the LangGraph state definition: a delta-backed channel reducer receives `(state, writes)` where `writes` is a batch, not the old pairwise `(state, update)` reducer shape.

Postgres works through LangGraph's async checkpointer path:

```bash
docker run --rm -p 127.0.0.1:55432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=assistant_ui \
  postgres:16-alpine

LANGGRAPH_POSTGRES_URL=postgresql://postgres:postgres@127.0.0.1:55432/assistant_ui \
  uv run python main.py
```

Because the FastAPI route streams with `graph.astream`, the backend uses `AsyncPostgresSaver`; the synchronous `PostgresSaver` does not implement the async checkpointer methods used by this route.

## Integration with Frontend

This backend is designed to work with the assistant-ui frontend. Update your frontend configuration to point to this server:

```typescript
const runtime = useExternalStoreRuntime({
  endpoint: "http://localhost:8001/api/chat"
});
```

## Customizing the LangGraph

You can customize the graph in the `create_graph()` function. Currently, it implements a simple chat node using OpenAI's GPT-5.4 Nano model. You can:

- Add more nodes for different functionalities
- Implement tool calling
- Add conditional edges
- Integrate with different LLMs
- Add memory or persistence

Example of adding a tool node:
```python
from langgraph.prebuilt import ToolExecutor

def create_graph():
    workflow = StateGraph(GraphState)

    # Add nodes
    workflow.add_node("chat", chat_node)
    workflow.add_node("tools", tool_node)

    # Add conditional routing
    workflow.add_conditional_edges(
        "chat",
        should_use_tools,
        {
            "tools": "tools",
            "end": END
        }
    )

    return workflow.compile()
```
