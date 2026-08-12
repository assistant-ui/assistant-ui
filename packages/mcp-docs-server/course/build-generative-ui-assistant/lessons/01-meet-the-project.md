# Meet the project

## What you will do

Set up the local project that will become a generative UI assistant. In this
lesson, the coding agent creates a blank Next.js App Router project, gives it a
visible placeholder page, starts it, and helps the learner see the before-state.
Install the assistant-ui foundation packages now, but do not write chat UI,
the runtime, or a `Thread` yet.

At the end of the lesson, the learner has a running blank Next.js project. The
next lesson deliberately introduces assistant-ui's runtime, Thread, route, and
safe no-key fallback.

## First, choose the correct setup path

Ask the learner for the directory and app name. Do not silently run a scaffold
in an unknown directory.

### New project

Use a new directory and create a plain Next.js App Router application:

```sh
node --version
npm --version
npx create-next-app@latest generative-ui-assistant
cd generative-ui-assistant
```

Select TypeScript, Tailwind CSS, and the App Router in the interactive prompts.
Use the learner's preferred package manager if they specify one. In PowerShell,
the same commands work. Do not use an assistant-ui starter template: it would
pre-create the runtime and Thread that step 2 is meant to teach.

Install the stable foundation used by assistant-ui's minimal/base templates now,
while keeping the application UI blank:

```sh
npm install @assistant-ui/react @assistant-ui/react-ai-sdk @assistant-ui/react-markdown @assistant-ui/next @ai-sdk/openai ai @base-ui/react class-variance-authority clsx lucide-react remark-gfm tailwind-merge tw-animate-css tw-shimmer zustand
```

Confirm that this command succeeds and `package.json` lists the packages before
continuing. This prepares the course without hiding the runtime, Thread, tools,
or thread list that the learner will build in later lessons.

## Inspect the scaffold together

After the command finishes, verify the files actually exist before moving on:

```sh
test -f package.json && echo "package.json found"
test -f app/page.tsx && echo "app/page.tsx found"
```

PowerShell equivalent:

```powershell
@("package.json", "app/page.tsx") |
  ForEach-Object { if (Test-Path $_) { Write-Output "$_ found" } else { throw "Missing $_" } }
```

Read `(docs)/index` with `assistantUIDocs`. Explain the files in plain language:

- `app/page.tsx` is the page the learner opens in the browser.
- `package.json` contains the commands used to run and build the project.

Replace `app/page.tsx` with this stage-0 placeholder. It must say that no chat
interface exists yet; this visible baseline makes the step-2 transition
meaningful.

### `app/page.tsx`

```tsx
export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6 text-[var(--foreground)]">
      <section className="w-full max-w-xl rounded-3xl border border-[var(--foreground)]/15 bg-[var(--foreground)]/5 p-8 shadow-sm">
        <p className="text-sm font-medium text-[var(--foreground)]/70">
          Build a Generative UI Assistant
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Your assistant starts here.
        </h1>
        <p className="mt-4 leading-7 text-[var(--foreground)]/70">
          This Next.js project has no chat interface yet. The next step connects
          assistant-ui and sends the first message.
        </p>
      </section>
    </main>
  );
}
```

## Run and experience it

Start the development server from the learner project:

```sh
npm run dev
```

Report the local URL printed by Next.js (commonly `http://localhost:3000`). If
a browser tool is available, open that URL. Otherwise give the URL to the
learner and ask them to open it themselves.

Ask the learner to confirm all of the following:

1. The page loads without a build or runtime error.
2. They can read the “assistant starts here” placeholder and confirm there is
   no chat interface yet.
3. They understand that this is the baseline the next lessons will change.

Do not ask the learner for an API key in this lesson. Step 2 creates the chat
route and its deterministic local fallback.

## Checkpoint

Before offering step 2, ask the learner: “Is the blank baseline open in your
browser, and can you see that there is no chat interface yet?” If they cannot
confirm, diagnose the dev-server or scaffold problem first. Only then call
`assistantUICourse` with `{ "step": 2 }`.
