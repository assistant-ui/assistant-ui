# Guide the first message

## Goal

Make the empty state teach the learner what the assistant can do with a small
set of suggestions. Suggestions submit ordinary user messages through the
active thread; they are not a second transport or request path.

## Agent instructions

Read `primitives/thread` and `primitives/message`, then inspect the existing
thread component. Keep the runtime and route unchanged. Add a focused welcome,
three labeled suggestions such as Ideas, Code, and Write, and a responsive
empty-state layout. Use the primitive suggestion API already present in the
installed version rather than inventing a separate state store.

Ask the learner to predict the prompt behind one suggestion and select it.
Explain that the suggestions disappear after the first message because the
thread is no longer empty. Show the diff and call out which code controls copy,
prompts, and styling.

## Verify

Run the app, select a suggestion, confirm it appears as a user message, and
confirm the response still uses the step-2 route. Run the project’s focused
typecheck or build before continuing.
