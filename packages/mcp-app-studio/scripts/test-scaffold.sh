#!/bin/bash
set -e

# Test scaffold script for mcp-app-studio
# Usage: ./scripts/test-scaffold.sh [project-name] [--no-server]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_NAME="${1:-test-chatgpt-app}"
INCLUDE_SERVER="--include-server"
TEST_DIR="/tmp/mcp-app-studio-test"

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
