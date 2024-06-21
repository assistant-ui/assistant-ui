# `@assistant-ui/react`

assistant-ui is a set of React components for AI chat.

- [Discord](https://discord.gg/S9dwgCNEFs)
- [Website](https://assistant-ui.com/)
- [Demo](https://assistant-ui-rsc-example.vercel.app/)

## Documentation

- [Documentation](https://www.assistant-ui.com/docs/getting-started)

## Starter Template

```
npx assistant-ui@latest create
```

## Quick Start In Existing Project
![Demo of my project](demo.gif)

### PREREQUISITES:
It is assumed that you have already installed and initialized node.js, tailwind, typescript, react, next.js. If not, follow the instructions:
```sh
npx create-next-app@latest my-app --typescript --tailwind
```
```sh
cd my-app
```
```sh
npm install @ai-sdk/react @assistant-ui/react @assistant-ui/react-ai-sdk
```
Install shadcn react components, follow instructins with default answers
```sh
npx shadcn-ui init
```

GETTING STARTED:
```sh
npx assistant-ui@latest add modal
```

Create/edit your desired page file:
```
/src/app/pages.tsx
```

```tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useVercelUseChatRuntime } from "@assistant-ui/react-ai-sdk";
import { AssistantModal } from "@/components/ui/assistant-ui/assistant-modal";

const MyApp = () => {
  const chat = useChat({ 
    api: "/api/chat" // your backend route
  });
  const runtime = useVercelUseChatRuntime(chat);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantModal />
    </AssistantRuntimeProvider>
);        
}

export default MyApp; 
```


### Backend connection using Vercel AI SDK:

```sh
npm install @ai-sdk/openai
```

```sh
npm install @assistant-ui/react-hook-form
```

Create backend route file:
```
/src/app/api/chat/route.ts
```

```tsx
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
 
export const maxDuration = 30;
 
export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = await streamText({
    model: openai('gpt-4o'),
    messages,
  });
 
  return result.toAIStreamResponse();
}
```

```sh
export OPENAI_API_KEY="skXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

```sh
npm run dev
```

Now Open: [http://localhost:3000](http://localhost:3000)
