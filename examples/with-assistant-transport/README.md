# Assistant Transport Example

This example demonstrates how to use assistant-ui with the `useAssistantTransportRuntime` hook to connect to a custom backend server that implements the assistant-transport protocol.

## Overview

The Assistant Transport runtime allows you to connect assistant-ui to any backend server that can handle:

- `AddMessageCommand` - for sending user messages
- `AddToolResultCommand` - for sending tool execution results
- Streaming responses using the `assistant-stream` format

## Prerequisites

Before running this example, you'll need:

1. A backend server that implements the assistant-transport protocol
2. Node.js 18+ installed
3. pnpm package manager

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Update the `NEXT_PUBLIC_API_URL` in `.env.local` to point to your backend server:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/assistant
```

### 3. Start the Development Server

```bash
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Backend Server Requirements

Your backend server should:

1. Accept POST requests at the configured endpoint (e.g., `/assistant`)
2. Handle the following command types in the request body:
   - `AddMessageCommand`: `{ type: "add-message", message: { role: "user", parts: [...] } }`
   - `AddToolResultCommand`: `{ type: "add-tool-result", toolCallId: string, result: object }`
3. Return streaming responses using the `assistant-stream` format
4. Include CORS headers to allow requests from the frontend

### Example Request Format

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
  "system": "You are a helpful assistant",
  "tools": {
    "get_weather": {
      "description": "Get weather information",
      "parameters": {
        "type": "object",
        "properties": {
          "location": { "type": "string" }
        }
      }
    }
  }
}
```

## Project Structure

```
examples/with-assistant-transport/
├── app/
│   ├── globals.css              # Global styles with Tailwind CSS
│   ├── layout.tsx              # Root layout component
│   ├── MyRuntimeProvider.tsx   # Custom runtime provider using useAssistantTransportRuntime
│   └── page.tsx               # Main page component
├── components/
│   └── assistant-ui/
│       └── thread.tsx         # Thread component for the chat interface
├── package.json               # Project dependencies
├── tailwind.config.js         # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── next.config.js            # Next.js configuration
└── README.md                 # This file
```

## Key Features

- **Custom Runtime**: Uses `useAssistantTransportRuntime` to connect to any backend
- **Streaming Support**: Handles real-time streaming responses from the server
- **Tool Support**: Supports tool calling between frontend and backend
- **Error Handling**: Includes proper error handling and loading states
- **Modern UI**: Built with Tailwind CSS and Radix UI components

## Backend Examples

For a complete working backend example, check out:

- `python/assistant-transport-backend` - Python FastAPI server with assistant-stream integration

## Customization

### Modifying the Runtime Configuration

Edit `app/MyRuntimeProvider.tsx` to customize:

- **API Endpoint**: Change the `api` URL
- **Headers**: Add authentication or other headers
- **Body Parameters**: Add additional request parameters
- **Event Handlers**: Customize response, error, and completion handling
- **State Converter**: Modify how backend state is converted to frontend state

### Styling

The project uses Tailwind CSS for styling. Modify `app/globals.css` and `tailwind.config.js` to customize the appearance.

## Troubleshooting

### Backend Connection Issues

1. Ensure your backend server is running and accessible
2. Check CORS configuration on your backend
3. Verify the API endpoint URL in your `.env.local` file
4. Check the browser console for network errors

### Runtime Errors

1. Verify the backend response format matches assistant-stream expectations
2. Check that the state converter function properly transforms your backend state
3. Ensure all required dependencies are installed

## Learn More

- [assistant-ui Documentation](https://www.assistant-ui.com/docs)
- [Assistant Transport Runtime API](https://www.assistant-ui.com/docs/runtimes/assistant-transport)
- [Next.js Documentation](https://nextjs.org/docs)
