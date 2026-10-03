# Shared cloud chat

This Next.js starter connects assistant-ui to a hosted harness. Browser clients
on the same URL share conversation state, replies, and cancellation through
`HarnessCloudThreadList`.

Run `npx assistant-ui@latest cloud setup .` from this app to sign in and configure a project and harness.
Add your `OPENAI_API_KEY` to `.env.local`, install dependencies, and run `npm run dev`.
Open the app in two browser windows, or use **Share this chat** to copy its link.
Send a message from either window; both show the same reply as it streams.
Reload either window to restore the conversation.

The URL fragment selects the thread. A fresh app uses `main` in the
configured shared workspace. The server mints short-lived browser credentials for the
shared `hackathon` user. `ASSISTANT_API_KEY` and `OPENAI_API_KEY` stay in the
server environment. This starter admits visitors as the same shared user.
Both `/api/credential` and `/api/chat` admit public visitors in this hackathon
starter. Add your application authentication to both routes before deploying a
private workspace.

During local development, the existing harness runtime serves model requests
through the browser's localhost tunnel. Keep a browser connected while a run
is active. For deployment, add the application's HTTPS `/api/chat` endpoint to
the harness's allowed endpoints.

The harness runtimes are bundled as local package tarballs while their public
packages are in preview. See [vendor/README.md](vendor/README.md) for their source
revision, license, and reproduction command.
