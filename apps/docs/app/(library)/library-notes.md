# Library notes

## Starters that need their own previews

VS Code (`templates/vscode`, an editor extension), React Ink (`examples/with-react-ink`, a terminal app), and Expo (`examples/with-expo`, a phone app) don't run in a browser, so they were left out of the light and dark screenshot run and keep their glyphs on the cards. They need their own way to get previews later: for example, a capture of the extension's webview inside VS Code, a recorded terminal session for Ink, and Expo's web build or a simulator capture.

## Starter data is a hand-copied snapshot

`lib/library/starters-data.ts` holds every starter on `/library/starters`. Most of it was copied by hand or by one-off scripts, so it goes stale when a starter, the CLI, or the registry changes. Nothing checks it today.

What is copied, and from where:

- The starter list, names, and descriptions mirror `PROJECT_METADATA` in `packages/cli/src/commands/create.ts`. The docs app cannot import the CLI, so a starter added or renamed there does not show up here.
- `framework` and `backend` tags were read from each starter's `package.json` dependencies.
- `env` comes from each starter's `.env.example` (or `.env.local.example`).
- `components`, `uiComponents`, `files`, and `dependencies` are what `create` installs. They were worked out the way the CLI and shadcn do it: scan the starter's `@/components/assistant-ui/...` and `@/components/ui/...` imports, then follow every item's `registryDependencies` through the registry (assistant-ui items from `apps/registry/dist`, shadcn/ui items from ui.shadcn.com). `dependencies` drops `@assistant-ui/ui`, which `create` removes. Default checks out against a real `npx assistant-ui@latest create my-app`: 35 files.
- `componentsIncluded` marks Minimal, Shared cloud chat, and React Ink, whose components ship inside the starter (`hasLocalComponents` in the CLI), so their files are listed from the starter folder instead of the registry.
- `devScript` is set only for Expo, which starts with `npm run start`.
- `image` points at the four screenshots that exist in `public/screenshot/examples`.

When to redo it: a starter is added, removed, or renamed in the CLI; a starter's imports, `.env.example`, or `package.json` change; or a registry item's files or dependencies change.

A fix that was tried and set aside: a `pnpm generate:library-starters` script in `apps/docs/scripts` that imports the CLI's `PROJECT_METADATA`, `scanRequiredComponents`, and registry URL helpers, resolves everything above, and writes `lib/library/starters.generated.json` for `starters-data.ts` to merge in. It reproduced the snapshot exactly. Its costs: it needs `apps/registry/dist` built first (it is gitignored), it fetches from ui.shadcn.com, it adds a generated file and a package script to the docs app, and CI would not type-check it, since the docs `tsconfig` skips top-level `scripts/*.mts`.
