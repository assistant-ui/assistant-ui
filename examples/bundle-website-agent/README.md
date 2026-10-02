# Website-use agent preview

Downloaded source: `npm install`, `npm run build`, then `npm run preview`.

A browser-local task board demonstrates a reusable cursor moving to real controls. The assistant-ui chat uses the shared AI SDK transport with scripted responses. No model requests, backend, or credentials are involved.

## Run and build

From this repository, run `pnpm build:bundles`. The shared example build reads `scripts/example-bundles.json` and produces a standalone `dist/index.html` and browser assets. Serve that directory with a static HTTP server.

## Try it

- `Show open tasks` selects the Open filter.
- `Show completed tasks` selects the Completed filter.
- `Complete the first open task` clicks the first incomplete task. A full task title also selects that task.
- `Add a task called "Review onboarding copy"` fills and submits the task form.
- `Reset the board` restores the sample tasks.

The controls remain available for mouse and keyboard use. Task changes persist when local storage is available in this browser. Stop cancels subsequent actions; an action already performed remains on the board.

## Reuse the cursor

`AgentCursor` is a props-only component in this example. It accepts an element, element ref, or viewport coordinates, plus `idle`, `moving`, or `clicking` phase. It visualizes movement and clicks; the application performs the actions. This example owns its command parser and uses native `button.click()` calls after moving the cursor to the selected control.

Reduced motion disables the cursor transition and bounce. A status region announces progress and result independently of the decorative cursor. Add a live AI SDK backend and a constrained tool layer in your application if you need model-directed operations.
