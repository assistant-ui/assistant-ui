This is the [assistant-ui](https://github.com/Yonom/assistant-ui) starter project with [Assistant Cloud](https://cloud.assistant-ui.com) integration.

## Getting Started

### 1. Set up Assistant Cloud

1. Sign up for Assistant Cloud at [cloud.assistant-ui.com](https://cloud.assistant-ui.com)
2. Create a new project in your Assistant Cloud dashboard
3. Navigate to your project settings to get:
   - Your Assistant Cloud API URL
   - Your Assistant Cloud API Key

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory and add your credentials:

```
# Provider API Key
OPENAI_API_KEY=your-openai-api-key

# Assistant Cloud
NEXT_PUBLIC_ASSISTANT_BASE_URL=your-assistant-cloud-url
ASSISTANT_API_KEY=your-assistant-cloud-api-key
```

> **Note**: You can copy `.env.example` to `.env.local` and fill in your values.

### 3. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### 4. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development

You can start customizing the UI by modifying components in the `components/assistant-ui/` directory.

### Key Files

- `app/assistant.tsx` - Renders the chat interface and sets up the runtime provider with Assistant Cloud
- `app/api/chat/route.ts` - Chat API endpoint
- `components/assistant-ui/thread.tsx` - Chat thread component
- `components/app-sidebar.tsx` - Sidebar with thread list
