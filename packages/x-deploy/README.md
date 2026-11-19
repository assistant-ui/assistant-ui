# @assistant-ui/x-deploy

Pins the Vercel CLI that `.github/workflows/registry.yaml` runs, through the workspace lockfile. No app depends on this package, so a filtered app install leaves the CLI out.

The workflow runs the CLI from here and points it at the project with `--cwd`:

```sh
pnpm --fail-if-no-match --filter @assistant-ui/x-deploy exec vercel build --prod --cwd "$GITHUB_WORKSPACE/apps/registry"
```
