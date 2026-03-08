# Assistant UI Starter (Assistant Cloud + Clerk)

This is the [assistant-ui](https://assistant-ui.com) starter project with [Assistant Cloud](https://cloud.assistant-ui.com) integration and [Clerk](https://clerk.com) for authentication.

## Getting Started

### 1. Set up Assistant Cloud

1. Sign up for Assistant Cloud at [cloud.assistant-ui.com](https://cloud.assistant-ui.com)
2. Create a new project in your Assistant Cloud dashboard
3. Navigate to your project settings to get:
   - Your Assistant Cloud API URL

### 2. Configure Assistant Cloud + Clerk

Follow the docs guide to connect Clerk to Assistant Cloud (JWT template + Auth Rule): https://www.assistant-ui.com/docs/cloud/authorization#setting-up-the-clerk-auth-provider

<details>
<summary>Setting up the Clerk Auth Provider</summary>

1. Go to the Clerk dashboard and under "Configure" tab, "JWT Templates" section, create a new template. Choose a blank template and name it "assistant-ui".

2. As the "Claims" field, enter the following:

```json
{
  "aud": "assistant-ui"
}
```

> **Note:** The aud claim ensures that the JWT is only valid for the assistant-ui API.

3. You can leave everything else as default. Take note of the "Issuer" and "JWKS Endpoint" fields.
4. In the assistant-cloud dashboard settings, navigate to the "Auth Rules" tab and create a new rule.
5. Choose "Clerk" and enter the Issuer and JWKS Endpoint from the previous step. As the "Audience" field, enter "assistant-ui".
</details>

### 3. Configure Environment Variables

Copy the example env file and then edit your values:

```bash
cp .env.example .env.local   # macOS/Linux
copy .env.example .env.local # or on Windows
```

### 4. Install Dependencies

```bash
pnpm install
```

### 5. Run the Development Server

```bash
pnpm dev
```

Open http://localhost:3000 with your browser to see the result.

- Click “Go to Chat”
  - If you’re signed out, you’ll be redirected to the embedded sign-in page
  - After sign-in, you’ll be returned to `/chat`

## Development

You can start customizing the UI by modifying components in the `components/assistant-ui/` directory.

### Key Files

- `app/page.tsx` — Public landing page (top-right auth controls, “Go to Chat” CTA)
- `app/chat/page.tsx` — Protected chat page (Assistant UI)
- `app/assistant.tsx` — Assistant runtime setup (Assistant Cloud + Clerk token)
- `app/api/chat/route.ts` — Demo chat API endpoint using OpenAI
- `app/sign-in/[[...sign-in]]/page.tsx` — Embedded Clerk sign-in
- `app/sign-up/[[...sign-up]]/page.tsx` — Embedded Clerk sign-up
- `app/layout.tsx` — App wrapper with `ClerkProvider` (embedded routes configured)
- `middleware.ts` — Protects `/chat` and `/api`, keeps `/` public
