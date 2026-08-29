#!/usr/bin/env bash
# Update every workspace dependency, re-pin the Expo SDK modules, then regenerate
# the lockfile and the changeset.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

EXPO_MANIFEST="examples/with-expo/package.json"
expo_manifest_backup="$(mktemp)"
trap 'rm -f "$expo_manifest_backup"' EXIT
cp "$EXPO_MANIFEST" "$expo_manifest_backup"

expo_repin_skipped=0

npx taze major -f -w -r

# `expo install --fix` upgrades the expo package itself before it repins anything,
# so a release inside pnpm's minimumReleaseAge window makes it exit non-zero having
# applied nothing. Taze's Expo bumps are unsanctioned without that repin, and the
# floor it wrote resolves to nothing the age policy allows, which would fail the
# fresh install below. Restoring the manifest drops them until the release ages.
if ! (cd examples/with-expo && npx expo install --fix); then
  expo_repin_skipped=1
  cp "$expo_manifest_backup" "$EXPO_MANIFEST"
fi

find . -name node_modules -prune -exec rm -rf {} +
rm -f pnpm-lock.yaml
pnpm install
pnpm dedupe
bash scripts/generate-deps-changeset.sh

if [ "$expo_repin_skipped" -ne 0 ]; then
  echo "" >&2
  echo "expo install --fix failed, so $EXPO_MANIFEST kept its previous versions." >&2
  echo "Everything else in this run is complete. Rerun once the release has aged." >&2
fi
