#!/bin/bash
# Setup script for Python MCP servers
# Creates virtual environments and installs dependencies for each Python server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Setting up Python MCP servers..."
echo ""

# List of Python servers with their directories
PYTHON_SERVERS=(
  "pizzaz_server_python"
  "kitchen_sink_server_python"
  "solar-system_server_python"
  "shopping_cart_python"
  "qr-server"
)

# Check Python version
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
  PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
  PYTHON_CMD="python"
else
  echo "Error: Python not found. Please install Python 3.10+"
  exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | cut -d' ' -f2)
echo "Using Python: $PYTHON_CMD ($PYTHON_VERSION)"
echo ""

# Setup each server
for server in "${PYTHON_SERVERS[@]}"; do
  if [ -d "$server" ]; then
    echo "Setting up $server..."
    cd "$server"
    
    # Create virtual environment if it doesn't exist
    if [ ! -d ".venv" ]; then
      echo "  Creating virtual environment..."
      $PYTHON_CMD -m venv .venv
    fi
    
    # Activate and install dependencies
    echo "  Installing dependencies..."
    source .venv/bin/activate
    pip install --quiet --upgrade pip
    if [ -f "requirements.txt" ]; then
      pip install --quiet -r requirements.txt
    fi
    deactivate
    
    echo "  Done!"
    cd "$SCRIPT_DIR"
  else
    echo "Warning: $server directory not found, skipping..."
  fi
done

echo ""
echo "Python setup complete!"
echo ""
echo "To run individual servers, use:"
echo "  pnpm dev:pizzaz-python       # Port 8002"
echo "  pnpm dev:kitchen-python      # Port 8003"
echo "  pnpm dev:solar-python        # Port 8004"
echo "  pnpm dev:shopping-python     # Port 8006"
echo ""
echo "Or run 'pnpm dev' from examples/with-mcp-apps to start everything."
