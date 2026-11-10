## assistant-stream

### Durable Pydantic AI threads

`assistant_stream.pydantic_ai.DurableAGUI` serves a Pydantic AI agent over AG-UI with runs that keep going when the browser closes, and that a reopened thread rejoins.

```sh
pip install "assistant-stream[pydantic-ai]"
```

```python
from assistant_stream.pydantic_ai import DurableAGUI, SqliteThreadStore

durable = DurableAGUI(agent, threads=SqliteThreadStore("threads.db"))
app = Starlette(routes=durable.routes())
```

Guide: https://www.assistant-ui.com/docs/runtimes/ag-ui/durable-threads
