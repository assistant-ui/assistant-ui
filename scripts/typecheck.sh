#!/usr/bin/env bash
# The workspace exclusions live here so local runs and CI agree. The nuxt
# workspaces keep their `nuxi typecheck` script for the projects scaffolded
# from the template, but vue-tsc cannot start under TypeScript 7 (#7560).
set -euo pipefail
# pnpm forwards the `--` separator itself; turbo would pass everything after it to each tsc.
if [ "${1:-}" = "--" ]; then shift; fi
exec pnpm exec turbo typecheck \
  --filter='!./examples/with-nuxt' \
  --filter='!./templates/nuxt' \
  "$@"
