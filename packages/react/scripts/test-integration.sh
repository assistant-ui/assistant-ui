#!/bin/bash

# Integration test script for AssistantCloudFiles
# This script runs the integration test that actually calls the real API

# Check if required environment variables are set
if [ -z "$AUI_API_KEY" ] || [ -z "$AUI_USER_ID" ] || [ -z "$AUI_WORKSPACE_ID" ]; then
    echo "❌ Missing required environment variables:"
    echo ""
    echo "Please set the following environment variables:"
    echo "  export AUI_API_KEY='your_api_key_here'"
    echo "  export AUI_USER_ID='your_user_id_here'"
    echo "  export AUI_WORKSPACE_ID='your_workspace_id_here'"
    echo ""
    echo "Example:"
    echo "  export AUI_API_KEY='sk_aui'"
    echo "  export AUI_USER_ID='676767'"
    echo "  export AUI_WORKSPACE_ID='65656'"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "🚀 Running integration test with real API credentials..."
echo ""
echo "Using:"
echo "  API Key: ${AUI_API_KEY:0:20}..."
echo "  User ID: $AUI_USER_ID"
echo "  Workspace ID: $AUI_WORKSPACE_ID"
echo ""

# Run the test
npm test -- src/tests/AssistantCloudFiles.test.ts --reporter=verbose

echo ""
echo "✅ Integration test completed!" 