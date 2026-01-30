#!/bin/bash
set -e

# Test scaffold script for mcp-app-studio
# Usage: ./scripts/test-scaffold.sh [project-name] [--no-server]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_NAME="${1:-test-chatgpt-app}"
INCLUDE_SERVER="--include-server"
TEST_DIR="/tmp/mcp-app-studio-test"

# Allow overriding the starter template source for local testing.
export MCP_APP_STUDIO_TEMPLATE_REPO="${MCP_APP_STUDIO_TEMPLATE_REPO:-assistant-ui/mcp-app-studio-starter}"
export MCP_APP_STUDIO_TEMPLATE_REF="${MCP_APP_STUDIO_TEMPLATE_REF:-main}"

# Check for --no-server flag
if [[ "$2" == "--no-server" ]]; then
  INCLUDE_SERVER="--no-server"
fi

echo "🧹 Cleaning up previous test..."
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

echo "📦 Building CLI..."
cd "$PACKAGE_DIR"
pnpm build

echo "🚀 Creating test project: $PROJECT_NAME"
cd "$TEST_DIR"

# Run the CLI in non-interactive mode with poi-map template
node "$PACKAGE_DIR/dist/cli/index.js" "$PROJECT_NAME" -y --template poi-map $INCLUDE_SERVER --description "Test project"

echo ""
echo "📥 Installing dependencies..."
cd "$TEST_DIR/$PROJECT_NAME"
npm install

# Verify export defaults are written to config file
echo ""
echo "🔍 Verifying mcp-app-studio.config.json defaults..."
CONFIG_PATH="$TEST_DIR/$PROJECT_NAME/mcp-app-studio.config.json"
if [ ! -f "$CONFIG_PATH" ]; then
  echo "❌ mcp-app-studio.config.json missing"
  exit 1
fi

CONFIG_PATH="$CONFIG_PATH" node - <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const configPath = process.env.CONFIG_PATH;
if (!configPath) {
  console.error("Missing CONFIG_PATH env var");
  process.exit(1);
}

const raw = fs.readFileSync(configPath, "utf-8");
const cfg = JSON.parse(raw);

if (!cfg.widget) {
  console.error("Missing cfg.widget");
  process.exit(1);
}

if (cfg.widget.entryPoint !== "lib/workbench/wrappers/poi-map-sdk.tsx") {
  console.error("Unexpected widget.entryPoint:", cfg.widget.entryPoint);
  process.exit(1);
}

if (cfg.widget.exportName !== "POIMapSDK") {
  console.error("Unexpected widget.exportName:", cfg.widget.exportName);
  process.exit(1);
}
NODE

# Verify server dependencies were installed via postinstall (if server exists)
if [ -d "server" ]; then
  echo ""
  echo "🔍 Verifying server dependencies were auto-installed via postinstall..."
  if [ -d "server/node_modules" ]; then
    echo "✅ server/node_modules exists - postinstall worked!"
  else
    echo "❌ server/node_modules missing - postinstall may have failed"
    exit 1
  fi

  # Verify @modelcontextprotocol/sdk is installed
  if [ -d "server/node_modules/@modelcontextprotocol/sdk" ]; then
    echo "✅ @modelcontextprotocol/sdk installed"
  else
    echo "❌ @modelcontextprotocol/sdk missing"
    exit 1
  fi

  echo ""
  echo "🔍 Verifying server package name..."
  PROJECT_DIR="$TEST_DIR/$PROJECT_NAME" node - <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const projectDir = process.env.PROJECT_DIR;
if (!projectDir) {
  console.error("Missing env vars for server name check");
  process.exit(1);
}

const serverPkgPath = path.join(projectDir, "server", "package.json");
const pkg = JSON.parse(fs.readFileSync(serverPkgPath, "utf-8"));
const rootPkgPath = path.join(projectDir, "package.json");
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf-8"));
const baseName = String(rootPkg.name).includes("/")
  ? String(rootPkg.name).split("/").pop()
  : String(rootPkg.name);
const expected = `${baseName}-mcp-server`;
if (pkg.name !== expected) {
  console.error(`Expected server package name '${expected}', got '${pkg.name}'`);
  process.exit(1);
}
NODE
fi

echo ""
echo "✅ Test project created at: $TEST_DIR/$PROJECT_NAME"
echo ""
echo "To start development:"
echo "  cd $TEST_DIR/$PROJECT_NAME"
echo "  npm run dev"
echo ""
if [ -d "server" ]; then
  echo "To start the MCP server (in a separate terminal):"
  echo "  cd $TEST_DIR/$PROJECT_NAME/server"
  echo "  npm run dev"
  echo ""
fi
