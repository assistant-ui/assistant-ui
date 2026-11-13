# @assistant-ui/x-deploy

Pins the Vercel CLI that `.github/workflows/registry.yaml` runs, through the workspace lockfile.

The CLI used to be a devDependency of `apps/registry`. The docs app depends on the registry, so every docs install on Vercel also installed the CLI: 136 packages and about 309 MB unpacked that the docs build never runs. Nothing depends on this package, so a filtered install leaves it out.

The workflow runs the CLI from here and points it at the project with `--cwd`:

```sh
pnpm --filter @assistant-ui/x-deploy exec vercel build --prod --cwd "$GITHUB_WORKSPACE/apps/registry"
```
