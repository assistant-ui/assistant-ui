# Remote components conformance

The spec for remote components and the suite that checks it. Private: nothing here is published.

- `SPEC.md`: the protocol, page API, host API, layout, theme, overlays, errors.
- `DESIGN.md`: why it is built this way.
- `THREAT_MODEL.md`: what isolates a remote, and from what.
- `SCORE.md`: the latest conformance results.

## Run

The suite drives headless Chromium, Firefox and WebKit in the official Playwright Linux image (`mcr.microsoft.com/playwright`, the version of `@playwright/test` in the lockfile), against the Vite dev server and against `vite build` output. It needs Docker (or OrbStack). Nothing listens on the host.

```sh
pnpm --filter @assistant-ui/remote-components-conformance conformance
node packages/remote-components-conformance/scripts/score.mjs
```

The script pipes the workspace manifests, the lockfile and the remote components packages into a named volume, installs and builds them there, and copies `.out/` and `test-results/` back.

Narrow a run:

```sh
RC_ENGINES=chromium RC_REMOTE=dev pnpm --filter @assistant-ui/remote-components-conformance conformance -g overlay
RC_VARIANT=static …   # every remote as static HTML (no React in the frame)
RC_PAGES=1 RC_REMOTE=dev … tests/pages.spec.ts   # the 47-page corpus; node pages-report.mjs summarises
```

CI does not run this suite: it needs the Playwright image and about ten minutes for all three engines. The packages' unit tests run in CI like every other package.
