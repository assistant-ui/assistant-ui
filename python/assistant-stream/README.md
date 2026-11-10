## assistant-stream

### Durable Pydantic AI threads

`assistant_stream.pydantic_ai.DurableAGUI` serves a Pydantic AI agent over AG-UI with runs that keep going when the browser closes, and that a reopened thread rejoins.

```sh
pip install "assistant-stream[pydantic-ai]"   # Python 3.11+
```

```python
from starlette.applications import Starlette
from assistant_stream.pydantic_ai import DurableAGUI, SqliteThreadStore

durable = DurableAGUI(
    agent,
    threads=SqliteThreadStore("threads.db"),
    owner=current_user,  # request -> user id, or None for 401
)
app = Starlette(routes=durable.routes())
```

Without `owner`, every client can read every thread, so leave it out only for local development.

Guide: https://www.assistant-ui.com/docs/runtimes/ag-ui/durable-threads
