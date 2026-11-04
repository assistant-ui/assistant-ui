#!/usr/bin/env bash
# Runs the conformance suite inside the official Playwright Linux image.
#
# Why: headless browsers on a macOS host whose display is asleep produce no
# animation frames (rAF / ResizeObserver never fire), which makes layout
# tests meaningless. Linux headless browsers render deterministically.
#
# - Only the workspace manifests, the lockfile and the packages this suite
#   builds are piped in as a tarball and unpacked into a named volume, where
#   Linux node_modules are installed (cached between runs).
# - All servers run inside the container; nothing listens on the host.
# - RC_REMOTE=dev,build (default both): remotes from the Vite dev server,
#   then from `vite build` output. RC_ENGINES picks browsers.
# - Results (.out/, test-results/) are copied back to this package.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PKG="packages/$(basename "$HERE")"
PW_VERSION="$(node -p 'require("@playwright/test/package.json").version' 2>/dev/null || echo 1.64.1)"
IMAGE="mcr.microsoft.com/playwright:v${PW_VERSION}-noble"
PNPM_VERSION="$(node -p 'require(process.argv[1]).packageManager.split("@")[1]' "$ROOT/package.json")"
# One volume per checkout, so parallel worktrees do not share sources.
VOLUME="${RC_VOLUME:-rc-conformance-$(basename "$ROOT")}"
ARGS=("$@")

docker volume create "$VOLUME" >/dev/null
# Empty (do not recreate) the bind-mounted results dir: recreating it can
# leave the container with a stale mount.
mkdir -p "$HERE/.out"
find "$HERE/.out" -mindepth 1 -delete
rm -rf "$HERE/test-results"

# Sources are tarred here on the host and piped in: reading them through the
# file share right after an edit can see a stale size ("file shrank") and
# truncate files. pnpm needs every workspace manifest to install a filtered
# graph from the shared lockfile.
cd "$ROOT"
LIST="$(mktemp)"
trap 'rm -f "$LIST"' EXIT
{
  printf '%s\n' package.json pnpm-lock.yaml pnpm-workspace.yaml
  git ls-files -- '*/package.json' | grep -v '/node_modules/'
  git ls-files --cached --others --exclude-standard -- packages/remote-components-* packages/x-buildutils packages/safe-content-frame
} | sort -u | while read -r f; do [ -f "$f" ] && printf '%s\n' "$f"; done >"$LIST"
COPYFILE_DISABLE=1 tar --no-xattrs -cf - -T "$LIST" |
docker run --rm -i --init --ipc=host \
  -v "$VOLUME":/work \
  -v "$HERE/.out":/results \
  -e CI=1 -e RC_DOCKER=1 -e npm_config_verify_deps_before_run=false -e PKG="$PKG" -e PNPM_VERSION="$PNPM_VERSION" \
  -e INSPECT="${INSPECT:-}" -e INSPECT_STATE="${INSPECT_STATE:-}" -e INSPECT_PRESHOT="${INSPECT_PRESHOT:-}" -e INSPECT_DPR="${INSPECT_DPR:-}" \
  -e RC_ENGINES="${RC_ENGINES:-}" -e RC_EXTRA_WAIT="${RC_EXTRA_WAIT:-}" -e RC_REMOTE="${RC_REMOTE:-dev,build}" -e RC_PERF="${RC_PERF:-}" -e RC_VARIANT="${RC_VARIANT:-}" -e RC_PAGES="${RC_PAGES:-}" \
  -w /work \
  "$IMAGE" bash -lc '
set -euo pipefail
mkdir -p /work/repo
# Remove stale sources (files deleted on the host), keeping node_modules.
find /work/repo -path "*/node_modules" -prune -o -type f -print0 | xargs -0 rm -f
tar -xf - -C /work/repo
cd /work/repo
command -v pnpm >/dev/null && [ "$(pnpm --version)" = "$PNPM_VERSION" ] || npm i -g "pnpm@$PNPM_VERSION" >/dev/null 2>&1
pnpm install --frozen-lockfile --ignore-scripts --filter "./$PKG..." >/tmp/install.log 2>&1 || { cat /tmp/install.log; exit 1; }
pnpm --filter "./$PKG^..." run build >/tmp/build.log 2>&1 || { cat /tmp/build.log; exit 1; }
cd "$PKG"
rm -rf test-results
find .out -mindepth 1 -delete 2>/dev/null || true
status=0
for mode in ${RC_REMOTE//,/ }; do
  RC_REMOTE=$mode pnpm exec playwright test "$@" || status=$?
done
echo "copying results (playwright exit $status)"
cp -r .out/. /results/ || echo "copy of .out failed"
[ -d test-results ] && cp -r test-results /results/test-results || true
exit $status
' rc-conformance ${ARGS[@]+"${ARGS[@]}"}
