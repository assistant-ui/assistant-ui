# LangGraph Integration for assistant-stream

This document describes the LangGraph integration for the assistant-stream package.

## Installation

To use the LangGraph integration, install the assistant-stream package with the langgraph extra:

```bash
pip install assistant-stream[langgraph]
```

This will install the required dependencies including `langchain-core`.

## Usage

The integration exposes `append_langgraph_event`, which folds the events produced by LangGraph's native streaming into the state managed by a `RunController`. It is meant to consume `graph.astream(..., stream_mode=["messages", "updates"])` output directly: the event type is the LangGraph stream mode name, and the payload is the raw chunk LangGraph yields for that mode.

### Function Signature

```python
def append_langgraph_event(
    state: Any,
    _namespace: Any,
    type: str,
    payload: Any,
) -> None
```

### Parameters

- **state**: The state to mutate, normally `controller.state`. It is read and written with dictionary-style access.
- **_namespace**: The LangGraph namespace for the event. It is accepted for forward compatibility and is currently unused.
- **type**: The LangGraph stream mode that produced the event, either `"messages"` or `"updates"`.
- **payload**: The raw chunk LangGraph yields for that stream mode, described below.

### Event Types

#### Message events (`type="messages"`)

The payload is the `(message, metadata)` tuple that LangGraph yields in `"messages"` mode, where `message` is a single `BaseMessage` (often an `AIMessageChunk`) and `metadata` is currently unused.

The function will:

- Create a `messages` list in the state if it does not exist.
- Convert the message to a plain dict with `model_dump()`.
- Merge into an existing message when the `id` (or `tool_call_id`) matches: for an `AIMessageChunk` the message is merged with `add_ai_message_chunks`, then patched into state with granular `set` / `append-text` operations where possible. This lets streaming text and tool-call argument chunks update only the field that changed instead of sending the whole message again. If the shape cannot be represented safely as object-stream operations, the helper falls back to replacing the message.
- Append the message when no existing id matches.

```python
from langchain_core.messages import AIMessageChunk

# one chunk yielded by stream_mode="messages"
chunk = (AIMessageChunk(content="Hello", id="msg1"), {})
append_langgraph_event(controller.state, namespace, "messages", chunk)
```

#### Updates events (`type="updates"`)

The payload is the `{node_name: {channel: value}}` dict that LangGraph yields in `"updates"` mode.

The function will:

- Write each channel value directly onto the state (`state[channel] = value`), so the node name is not retained.
- Skip the `messages` channel, since messages are handled by message events.
- Skip a node whose value is not a dict.

```python
updates = {"weather_agent": {"status": "completed", "temperature": 72}}
append_langgraph_event(controller.state, namespace, "updates", updates)
# state now contains {"status": "completed", "temperature": 72}
```

### Notes

- The state holds plain JSON values (lists, dicts, str, int, bool, None); LangChain messages are converted with `model_dump()` before they are stored.
- Event types other than `"messages"` and `"updates"` are ignored.

## Example Integration

The events come straight from `graph.astream`, so a run callback forwards each one to `append_langgraph_event`:

```python
from assistant_stream import RunController, create_run
from assistant_stream.modules.langgraph import append_langgraph_event
from assistant_stream.serialization import DataStreamResponse


async def run_callback(controller: RunController):
    async for namespace, event_type, chunk in graph.astream(
        {"messages": input_messages},
        stream_mode=["messages", "updates"],
        subgraphs=True,
    ):
        append_langgraph_event(controller.state, namespace, event_type, chunk)


stream = create_run(run_callback, state={})
response = DataStreamResponse(stream)
```

As the assistant message streams in, its chunks merge by id, so `controller.state["messages"]` ends with a single assistant message:

```python
# controller.state
# {
#     "messages": [
#         {"type": "human", "content": "What is the weather?", "id": "user1"},
#         {"type": "ai", "content": "The weather is sunny today.", "id": "ai1"},
#     ],
# }
```

See `python/assistant-transport-backend-langgraph` for a complete server built on this pattern, including subgraph state via `get_tool_call_subgraph_state`.

## Testing

The integration is covered by unit tests that exercise `append_langgraph_event` against a real state proxy:

```bash
uv run pytest tests/test_langgraph.py
```
