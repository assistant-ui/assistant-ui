# Agent Dashboard MVP

A demonstration of the `@assistant-ui/react-agent` package for agent supervision UX.

## Features

- **Task Management**: Create, monitor, and cancel agent tasks
- **Real-time Updates**: Live status and cost tracking
- **Approval Flow**: Review and approve/deny tool executions
- **Agent Activity**: Monitor agent events and reasoning

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. (Optional) Set up environment variables:

```bash
cp .env.example .env.local
# Edit .env.local and add your Anthropic API key
```

3. Run the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Demo Mode

The app includes a built-in simulator that demonstrates the full agent workflow without requiring an actual API key. Simply launch a task and interact with the approval system.

## Architecture

This example uses:

- `@assistant-ui/react-agent` - Core agent UI package
- Next.js 15 - React framework
- Tailwind CSS - Styling

## Key Components

- **TaskCard**: Displays task status, agents, and pending approvals
- **ApprovalCard**: Shows tool use requests with approve/deny actions
- **AgentActivity**: Real-time feed of agent events
