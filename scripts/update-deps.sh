#!/usr/bin/env bash
# Update every workspace dependency, re-pin the Expo SDK modules, then regenerate
# the lockfile and the changeset.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

expo_needs_attention=0

npx taze major -f -w -r

# `expo install --fix` upgrades the expo package itself before it repins anything,
# so a release inside pnpm's minimumReleaseAge window makes it exit non-zero having
# applied nothing. Report what the SDK expects and carry on, because aborting here
# would leave taze's manifest edits without a regenerated lockfile or changeset.
if ! (cd examples/with-expo && npx expo install --fix); then
  expo_needs_attention=1
  echo "" >&2
  echo "expo install --fix failed. Falling back to --check, which only reports." >&2
  (cd examples/with-expo && npx expo install --check) || true
fi

find . -name node_modules -prune -exec rm -rf {} +
rm -f pnpm-lock.yaml
pnpm install
pnpm dedupe
bash scripts/generate-deps-changeset.sh

if [ "$expo_needs_attention" -ne 0 ]; then
  echo "" >&2
  echo "The lockfile and changeset are up to date, but examples/with-expo was not repinned." >&2
  echo "Apply the expectations printed above by hand, then rerun pnpm install." >&2
  exit 1
fi
