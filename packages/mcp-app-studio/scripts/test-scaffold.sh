#!/bin/bash
set -e

# Test scaffold script for mcp-app-studio
# Usage: ./scripts/test-scaffold.sh [project-name]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_NAME="${1:-test-chatgpt-app}"
TEST_DIR="/tmp/mcp-app-studio-test"

echo "🧹 Cleaning up previous test..."
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

echo "📦 Building CLI..."
cd "$PACKAGE_DIR"
pnpm build

echo "🚀 Creating test project: $PROJECT_NAME"
cd "$TEST_DIR"

# Run the CLI - this will be interactive
node "$PACKAGE_DIR/dist/index.js" "$PROJECT_NAME"

echo ""
echo "📥 Installing dependencies..."
cd "$TEST_DIR/$PROJECT_NAME"
npm install

# Check if server directory exists
if [ -d "server" ]; then
  echo ""
  echo "📥 Installing server dependencies..."
  cd server
  npm install
  cd ..
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
