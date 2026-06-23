# assistant-ui + Expo

A native chat app built with [assistant-ui](https://www.assistant-ui.com) and [Expo](https://expo.dev). It runs on iOS, Android, and the web from a single codebase, and is styled to match the assistant-ui web kit: a clean, neutral, ChatGPT-grade look with subtle hairline borders.

The chat is powered by `@assistant-ui/react-native` with the AI SDK runtime (`@assistant-ui/react-ai-sdk`). The example leans on native Expo APIs throughout:

- **SF Symbols** (`expo-symbols`) for native iconography on iOS, with a Material Icons fallback on Android and the web.
- **Haptics** (`expo-haptics`) for tactile feedback on send, stop, and selection.
- **Image picker** (`expo-image-picker`) and **expo-image** for attachments.
- **Clipboard** (`expo-clipboard`) so the copy action works natively.
- A native **drawer** (`@react-navigation/drawer`) for the thread list, with a swipe gesture to switch conversations.

It follows the assistant-ui component conventions: `MessagePrimitive.Parts` for message rendering, `AuiIf` for declarative state-driven UI, the `ThreadList` / `ThreadListItem` primitives for the drawer, and a `"use generative"` toolkit (`components/assistant-ui/tools.tsx`) that renders weather cards inline.

## Get started

1. Install dependencies from the repository root:

   ```bash
   pnpm install
   ```

2. Configure the chat backend. Copy `.env.example` to `.env` and set your key:

   ```bash
   cp .env.example .env
   ```

   The bundled API route (`app/api/chat+api.ts`) needs `OPENAI_API_KEY`. To point the app at a separately hosted backend instead, set `EXPO_PUBLIC_CHAT_ENDPOINT_URL`.

3. Start the app:

   ```bash
   pnpm --filter with-expo start
   ```

   From there you can open it in the iOS simulator, an Android emulator, or the browser.

## Project structure

- `app/_layout.tsx` wires the runtime, the toolkit, and the drawer navigation.
- `app/index.tsx` renders the `Thread`.
- `components/assistant-ui/` holds the composer, message, action bar, branch picker, and tool UIs.
- `components/thread-list/` holds the drawer thread list.
- `constants/theme.ts` and `hooks/use-theme.ts` define the shared design tokens.
- `components/ui/icon.tsx` is the cross-platform icon (SF Symbols on iOS, Material Icons elsewhere).

## Learn more

- [assistant-ui documentation](https://www.assistant-ui.com/docs)
- [Expo documentation](https://docs.expo.dev)
