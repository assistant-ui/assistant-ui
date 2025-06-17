# External Store with AI SDK Example

This example demonstrates how to use `useExternalStoreRuntime` with AI SDK for streaming responses.

## Setup

1. Copy `.env.local.example` to `.env.local` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your-api-key-here
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run the development server:
   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Key Files

- `app/MyRuntimeProvider.tsx` - External store runtime setup with streaming support
- `app/api/chat/route.ts` - AI SDK endpoint using OpenAI
- `app/page.tsx` - Main page with Thread component

## Features

- Real-time streaming responses from OpenAI
- External state management
- Manual handling of message updates during streaming
- Error handling for API failures

## Testing Autoscroll

This example can be used to test autoscroll behavior with external store and streaming responses. The implementation manually updates messages in the store as chunks arrive from the AI SDK stream.