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

# `expo install --fix` compares the versions resolved in `node_modules` against the
# SDK matrix, so the manifest taze just wrote is invisible to it until it has been
# installed. `expo install --fix` also upgrades the expo package itself before it
# repins anything, so a release inside pnpm's minimumReleaseAge window makes either
# step exit non-zero having applied nothing. Taze's Expo bumps are unsanctioned
# without that repin, and the floor it wrote resolves to nothing the age policy
# allows, which would fail the fresh install below. Restoring just those entries
# drops them until the release ages, while taze's other bumps in the same manifest
# stand.
if ! pnpm install --no-frozen-lockfile ||
  ! (cd examples/with-expo && npx expo install --fix); then
  expo_repin_skipped=1
  # shellcheck disable=SC2016 # the JS body must not be expanded by the shell
  node -e '
    const fs = require("node:fs");
    const [backupPath, manifestPath, projectDir] = process.argv.slice(1);
    // The SDK native-module matrix, read rather than hardcoded so the set tracks
    // the SDK. `expo install --fix` also merges relatedPackages from the versions
    // endpoint, which needs the network, so those entries are left to taze.
    const expoFamily = /^(@expo\/.+|@react-native\/.+|expo|expo-.+|react|react-dom|react-native|react-native-.+)$/;
    let matrixKeys = new Set();
    try {
      const matrix = require.resolve("expo/bundledNativeModules.json", { paths: [projectDir] });
      matrixKeys = new Set(Object.keys(JSON.parse(fs.readFileSync(matrix, "utf8"))));
    } catch {}
    // Union, not a fallback: a package Expo ships in the SDK batch without keying
    // it here would otherwise keep the age-blocked floor and fail the install below.
    const isOwned = (name) => matrixKeys.has(name) || expoFamily.test(name);
    const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
      for (const name of Object.keys(manifest[field] ?? {})) {
        if (isOwned(name) && backup[field]?.[name]) {
          manifest[field][name] = backup[field][name];
        }
      }
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  ' "$expo_manifest_backup" "$EXPO_MANIFEST" examples/with-expo
fi

# The tracked manifests name exactly this checkout's packages. A repository-wide
# `find` also reaches into any git worktree checked out under the repository and
# wipes a tree another session is using.
git ls-files -z -- '*/package.json' 'package.json' | while IFS= read -r -d '' manifest; do
  rm -rf "$(dirname "$manifest")/node_modules"
done
rm -f pnpm-lock.yaml
pnpm install
pnpm dedupe
bash scripts/generate-deps-changeset.sh

if [ "$expo_repin_skipped" -ne 0 ]; then
  echo "" >&2
  echo "The Expo repin did not run, so the Expo-managed entries in $EXPO_MANIFEST" >&2
  echo "kept their previous versions. Everything else in this run is complete." >&2
  echo "Rerun once the release has aged." >&2
  exit 1
fi
