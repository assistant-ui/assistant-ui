---
description: Sync assistant-ui registry components to templates
argument-hint: [additional-paths...]
---

Follow the **aui-sync** skill to synchronize assistant-ui registry components to downstream templates.

## Paths

See [defaults.md](../skills/aui-sync/defaults.md) for configured paths.

If defaults contain placeholders, ask the user for:
1. Registry path (assistant-ui monorepo clone)
2. Templates path (directory containing template repos)
3. Examples path (optional)

## Additional Paths to Sync
$ARGUMENTS

If no additional paths specified, sync registry components only.

Begin by checking defaults.md for paths, then proceed with the workflow.
