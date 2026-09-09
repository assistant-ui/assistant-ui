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
# dependents does not block a focused change. Build selected packages and their
# package dependencies without duplicating application, example, or template
# builds.
pnpm turbo build \
  --filter="${selector}..." \
  --filter="!./apps/*" \
  --filter="!./examples/*" \
  --filter="!./templates/*"
exec pnpm -r --filter="$selector" --workspace-concurrency=4 --no-bail exec sh -c \
  'if test -f tsconfig.json; then echo "Type-checking $PWD"; tsc --noEmit; fi'
