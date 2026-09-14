# assistant-ui + Expo

A native chat app built with [assistant-ui](https://www.assistant-ui.com) and [Expo](https://expo.dev). It runs on iOS, Android, and the web from a single codebase, and is styled to match the assistant-ui web kit: a clean, neutral, ChatGPT-grade look with subtle hairline borders.

The chat is powered by `@assistant-ui/react-native` with the AI SDK runtime (`@assistant-ui/ai-sdk`). The UI comes from the assistant-ui React Native kit (`packages/ui/src/components/react-native`), styled with Tailwind classes through [Uniwind](https://uniwind.dev) and the same design tokens as the web kit, so the thread, composer, attachments, and thread list read the same on every platform. The example adds:

- **Image picker** (`expo-image-picker`) for attachments and **clipboard** (`expo-clipboard`) for the copy action.
- A native **drawer** (`@react-navigation/drawer`) for the thread list, with a swipe gesture to switch conversations.
- A `"use generative"` toolkit (`components/tools.tsx`) that renders weather cards inline.

## Get started

1. Install dependencies from the repository root:

   ```bash
   pnpm install
   ```

2. Configure the chat backend. Copy `.env.example` to `.env` and set your key:

   ```bash
   cp .env.example .env
   ```

   The bundled API route (`app/api/chat+api.ts`) needs `OPENAI_API_KEY`. To point the app at a separately hosted backend instead, set `EXPO_PUBLIC_CHAT_ENDPOINT_URL`. Browser deployments use `/api/anonymous-session` when the hosted backend supports it and otherwise send the request normally. Native deployments should use a backend intended for their app.

3. Start the app:

   ```bash
   pnpm --filter with-expo start
   ```

   From there you can open it in the iOS simulator, an Android emulator, or the browser.

## Project structure

- `app/_layout.tsx` wires the runtime, the toolkit, the suggestions, and the drawer navigation.
- `app/index.tsx` renders the `Thread`.
- `components/tools.tsx` holds the weather toolkit and its tool UIs.
- `global.css` holds the Tailwind and Uniwind setup plus the color tokens; `metro.config.js` wires Uniwind around the assistant-ui Metro transformer.
- `@/components/assistant-ui/*` and `@/components/ui/*` resolve to the kit sources in `packages/ui/src/components/react-native` through `tsconfig.json` paths. A project scaffolded with `npx assistant-ui create --native` gets the same files installed under `components/` from the registry instead.

## Learn more

- [assistant-ui documentation](https://www.assistant-ui.com/docs)
- [Expo documentation](https://docs.expo.dev)
