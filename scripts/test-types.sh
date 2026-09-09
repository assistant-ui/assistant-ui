#!/bin/sh

set -eu

if [ "${1:-}" = "--" ]; then
  shift
fi

selector="${1:-}"

if [ -z "$selector" ]; then
  exec pnpm -r --workspace-concurrency=4 --no-bail exec sh -c \
    '! test -f tsconfig.json || tsc --noEmit'
fi

# Only directly changed workspaces are checked so unrelated type drift in
# dependents does not block a focused change. Build the selected workspaces and
# their dependency closure so a dependency that is also changed is not omitted.
pnpm turbo build --filter="${selector}..."
exec pnpm -r --filter="$selector" --workspace-concurrency=4 --no-bail exec sh -c \
  '! test -f tsconfig.json || tsc --noEmit'
