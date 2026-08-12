# Meet the project

## Goal

Create a plain Next.js App Router application that is intentionally missing a
chat interface. This is the before-state that makes the rest of the course
meaningful.

## Agent instructions

Ask the learner for the target directory before scaffolding. For a new project,
use `create-next-app` with TypeScript, Tailwind CSS, and the App Router. Do not
use an assistant-ui starter or copy a finished template: this lesson must not
pre-create `Thread`, a runtime provider, a chat route, or tools.

```sh
npx create-next-app@latest generative-ui-assistant
cd generative-ui-assistant
npm install @assistant-ui/react @assistant-ui/react-ai-sdk @assistant-ui/react-markdown @assistant-ui/next ai
```

Inspect `package.json` and `app/page.tsx` before editing. Replace the page with
a visible placeholder that says there is no chat interface yet. Explain that
`app/page.tsx` is the page route and that later lessons will add the runtime,
transport, and application-owned components.

## Verify

Run the project’s normal development command and ask the learner to confirm the
placeholder is visible. Run the project’s typecheck or build if one exists.
Do not ask for an API key yet. Record the exact command and result, explain the
diff from the scaffold, and stop at this checkpoint until the learner confirms
the blank baseline.

Use `assistantUIDocs` for `(docs)/index` if a concept needs clarification.
