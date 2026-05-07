# Assistant Transport Example

This example demonstrates how to use assistant-ui with the `useAssistantTransportRuntime` hook to connect to a custom backend server that implements the assistant-transport protocol.

## Quick Start

### Using CLI (Recommended)

```bash
npx assistant-ui@latest create my-app --example with-assistant-transport
cd my-app
```

### Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/assistant
```

### Run

```bash
npm install
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Overview

The Assistant Transport runtime allows you to connect assistant-ui to any backend server that can handle:

- `AddMessageCommand` - for sending user messages
- `AddToolResultCommand` - for sending tool execution results
- Streaming responses using the `assistant-stream` format

## Backend Server Requirements

Your backend server should:

1. Accept POST requests at the configured endpoint (e.g., `/assistant`)
2. Handle the following command types in the request body:
   - `AddMessageCommand`: `{ type: "add-message", message: { role: "user", parts: [...] } }`
   - `AddToolResultCommand`: `{ type: "add-tool-result", toolCallId: string, result: object }`
3. Return streaming responses using the `assistant-stream` format
4. Include CORS headers to allow requests from the frontend

## Key Features

- **Custom Runtime**: Uses `useAssistantTransportRuntime` to connect to any backend
- **Streaming Support**: Handles real-time streaming responses from the server
- **Tool Support**: Supports tool calling between frontend and backend
- **Error Handling**: Includes proper error handling and loading states
- **Modern UI**: Built with Tailwind CSS and Radix UI components

## Related Documentation

- [assistant-ui Documentation](https://www.assistant-ui.com/docs)
- [Assistant Transport Runtime API](https://www.assistant-ui.com/docs/runtimes/assistant-transport)
