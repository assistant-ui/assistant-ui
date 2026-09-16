#!/usr/bin/env bash
set -euo pipefail
# pnpm forwards the `--` separator itself; turbo would pass everything after it to each tsc.
if [ "${1:-}" = "--" ]; then shift; fi
exec pnpm exec turbo typecheck "$@"
