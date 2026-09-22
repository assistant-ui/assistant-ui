---
"assistant-ui": patch
---

fix(cli): stop upgrade from silently skipping installs on non-interactive stdin

`assistant-ui upgrade` reached its dependency prompts, printed them, and then stopped without installing — exiting 0 and never printing `Upgrade complete!` — whenever stdin was not interactive (CI, an agent harness, `< /dev/null`). Every prompt now settles.

Note the resulting non-interactive behaviour: at EOF (or Ctrl+D) a prompt takes its own default, so `upgrade` installs the packages its codemods just rewrote imports onto, rather than leaving the project referencing packages it never installed. Cancelling a prompt with Ctrl+C declines instead, so nothing is installed. Piping a single answer (`echo n | assistant-ui upgrade`) still works and is still honoured, including without a trailing newline.
