# Kitchen Sink Lite MCP server (Python)

This server pairs with the `src/kitchen-sink-lite` widget in this repo. It exposes two tools:

- `kitchen-sink-show`: returns the widget template and structured content for the initial render.
- `kitchen-sink-refresh`: a lightweight echo tool you can call from the widget with `window.openai.callTool`.

Both tools include `_meta.openai/outputTemplate` pointing to the same widget HTML so the Apps SDK can hydrate the UI.

## Prereqs

- Python 3.10+
- Static assets built (run `pnpm run build` from the repo root). The server reads `assets/kitchen-sink-lite*.html`.

## Run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn kitchen_sink_server_python.main:app --port 8000
```

The server uses FastAPI over SSE-compatible streaming HTTP (the `stateless_http=True` flag). Point ChatGPT at `http://localhost:8000/mcp` once it is running.
