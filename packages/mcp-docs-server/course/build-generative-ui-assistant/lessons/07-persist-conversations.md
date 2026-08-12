# Add conversations that persist

## Goal

Let the learner create, switch, and reload conversations in the browser while
keeping the active thread and its messages consistent.

## Agent instructions

Read `integrations/persistence/custom-adapter`, `ui/thread-list`, and
`with-custom-thread-list`. Inspect the runtime’s thread-list contract before
editing. Add an application-owned `ThreadList`, a small browser adapter backed
by local storage, and an assistant shell that places the list beside the thread.
Use stable thread IDs and serialize only the data the adapter contract requires.

Wire the adapter through the runtime’s documented thread-list integration.
Handle create, select, rename if supported, delete if supported, and reload.
Keep the active thread from being overwritten while another thread is selected;
explain where persistence ends and server-side storage would begin.

## Verify

Create two conversations with distinct messages, switch between them, reload
the page, and confirm both remain available. Clear the browser storage and
confirm the documented empty state. Run the project typecheck or build and show
the adapter/runtime diff.
