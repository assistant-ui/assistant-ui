# AG-UI Protocol Integration

This example demonstrates how to integrate assistant-ui with the AG-UI protocol for connecting to AG-UI compatible agents.

## Quick Start

### Using CLI (Recommended)

```bash
npx assistant-ui@latest create my-app --example with-ag-ui
cd my-app
```

### 1. Start the Backend Agent

```bash
# Install Python dependencies
pip install -r server/requirements.txt

# Run the agent (echo mode by default)
python server/agent.py

# Or with OpenAI integration
OPENAI_API_KEY=sk-xxx python server/agent.py
```

The agent will start at `http://localhost:8000/agent`.

### 2. Configure Environment

Create `.env.local`:

```
NEXT_PUBLIC_AGUI_AGENT_URL=http://localhost:8000/agent
```

### 3. Run the Frontend

```bash
pnpm dev
```

## Features

- AG-UI protocol integration via `@assistant-ui/react-ag-ui`
- Multi-thread support with "New Thread" button
- Custom browser alert tool demonstration
- Client-side tool execution
- Tool result rendering

## Backend Agent

The included `server/agent.py` provides:

- **Echo mode** (default): Echoes back user messages for testing
- **OpenAI mode**: Uses GPT-4o-mini when `OPENAI_API_KEY` is set

### Endpoints

- `POST /agent` - AG-UI agent endpoint (SSE streaming)
- `GET /health` - Health check

## Related Documentation

- [assistant-ui Documentation](https://www.assistant-ui.com/docs)
- [AG-UI Protocol](https://docs.ag-ui.com)
