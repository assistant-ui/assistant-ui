# with-a2a

An example of using [assistant-ui](https://www.assistant-ui.com/) with the [A2A (Agent-to-Agent) protocol](https://github.com/a2aproject/A2A).

## Getting Started

### 1. Start an A2A server

You need an A2A-compatible agent server. For example, using the [assistant-ui-a2a](https://github.com/assistant-ui/assistant-ui-a2a) kitchen sink demo:

```bash
cd a2a-server
pip install -e .
python main.py
```

This starts an A2A server at `http://localhost:9999` with 5 skills.

### 2. Configure the frontend

```bash
cp .env.example .env
# Edit .env if your A2A server is not at localhost:9999
```

### 3. Run the frontend

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features Demonstrated

| Feature | Skill / Command |
|---|---|
| Streaming chat | Default chat |
| Artifacts (text, data, file) | `/artifacts <topic>` |
| Multi-step input-required flow | `/multistep` then provide topic |
| Error/failure handling | `/fail` |
| Long-running + cancellation | `/slow` |
| Agent card display | Automatic on load |
| Task state tracking (8 states) | All commands |

## Architecture

```
Browser (Next.js) ──A2A v1.0 SSE──▶ A2A Server
```

No proxy backend needed. `@assistant-ui/react-a2a` handles the full A2A protocol directly:
- Agent card discovery (`/.well-known/agent-card.json`)
- Streaming via `POST /message:stream` (SSE)
- Task lifecycle management
- Artifact accumulation
