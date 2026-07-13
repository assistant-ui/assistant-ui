# `@assistant-ui/ui`

Internal monorepo-only package. **Not published to npm.**

This is the source of truth for the styled, shadcn-style components that ship to user projects via the `assistant-ui` CLI:

```bash
npx assistant-ui@latest add thread
npx assistant-ui@latest add thread-list assistant-modal
```

The CLI fetches each component from the shadcn registry served at [`r.assistant-ui.com`](https://r.assistant-ui.com) (built from `apps/registry`), which in turn reads its inputs from this package's `src/components/`. Inside the monorepo, the docs site and registry build also depend on this package directly so we avoid maintaining two copies.

## Layout

| Path                              | Contents                                                                 |
| --------------------------------- | ------------------------------------------------------------------------ |
| `src/components/assistant-ui/*`   | Assistant-specific components (thread, message, composer, attachment, etc.). |
| `src/components/ui/base/*`        | Standard shadcn-style Base UI components (button, dialog, sheet, etc.).  |
| `src/components/ui/radix/*`       | Radix-flavor shadcn-style components (button, dialog, sheet, etc.).      |
| `src/hooks/*`                     | Shared hooks consumed by the components above.                           |
| `src/lib/*`                       | Utility helpers (`cn`, formatters, etc.).                                |

Exports use direct file paths (no barrel) so the CLI can copy individual files cleanly.

## Editing

When you change a component here, the change reaches end users only after the registry rebuilds and a new version of the `assistant-ui` CLI is published. See `apps/registry` for the build pipeline.
