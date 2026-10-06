# Terminal chat example

Run `pnpm dev` for a local, scripted conversation. The thread sidebar uses the existing assistant-ui runtime and keeps each conversation and its composer draft in memory for the current session.

The same sidebar is used by [the browser terminal demo](../with-react-ink-web). Wide terminals show it beside the conversation; narrow terminals switch between the thread list and composer.

## Keyboard controls

| Shortcut | Action |
| --- | --- |
| Ctrl+G | Switch between threads and composer; also exits search or help |
| Alt+↑ / Alt+↓ | Open the previous / next active thread |
| Ctrl+N | New thread |
| Ctrl+R | Rename the current thread |
| ↑ / ↓, then Enter | Select and open a thread in the sidebar |
| / | Search threads; Enter returns to the list |
| r | Rename the selected thread; Enter saves, Esc cancels |
| a | Archive the selected thread, or restore it in the archived list |
| x | Switch between active and archived threads |
| p | Pin / unpin the selected active thread |
| d | Delete the selected thread after confirming with y; n cancels |
| l | Load more threads or retry a failed list request |
| ? | Show all shortcuts |
| Esc | Return to the list or composer |

Single-letter shortcuts only apply while browsing the sidebar. Composer text stays intact while managing threads. Run `pnpm test` for the keyboard interaction and runtime integration tests.
