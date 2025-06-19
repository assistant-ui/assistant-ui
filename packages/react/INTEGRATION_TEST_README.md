# AssistantCloudFiles Integration Test

This document explains how to run the integration test that actually calls the real API endpoint for PDF to images conversion.

## Overview

The integration test makes a real HTTP request to the `https://backend.assistant-api.com/v1/files/pdf-to-images` endpoint using your actual API credentials. This ensures that the AssistantCloudFiles service works correctly with the live API.

## Prerequisites

You need valid API credentials for the Assistant API:
- API Key (starts with `sk_aui_proj_`)
- User ID 
- Workspace ID

## Running the Integration Test

### Option 1: Using the Script (Recommended)

1. Set your environment variables:
```bash
export AUI_API_KEY='sk_aui_proj_your_api_key_here'
export AUI_USER_ID='your_user_id_here'
export AUI_WORKSPACE_ID='your_workspace_id_here'
```

2. Run the script:
```bash
./scripts/test-integration.sh
```

### Option 2: Manual Command

Set environment variables and run the test directly:
```bash
export AUI_API_KEY='your_api_key_here'
export AUI_USER_ID='your_user_id_here'
export AUI_WORKSPACE_ID='your_workspace_id_here'

npm test -- src/tests/AssistantCloudFiles.test.ts
```

## Test Details

The integration test:
- ✅ Uses real API credentials (API key authentication)
- ✅ Makes actual HTTP request to the live endpoint
- ✅ Tests PDF conversion with the same file URL from your curl example
- ✅ Validates response structure and image URLs
- ✅ Automatically skips if credentials are missing

## What the Test Does

1. **Creates a real AssistantCloud instance** with your API credentials
2. **Calls `cloud.files.pdfToImages()`** with the test PDF URL
3. **Validates the response** has the correct structure:
   - `success` boolean
   - `urls` array of image URLs  
   - `message` string
4. **Verifies image URLs** are valid HTTPS URLs ending in .png/.jpg/.jpeg

## Expected Response

On success, you should see something like:
```json
{
  "success": true,
  "urls": [
    "https://aui-pdf-processing.r2.cloudflarestorage.com/images/.../page-1.png?...",
    "https://aui-pdf-processing.r2.cloudflarestorage.com/images/.../page-2.png?...",
    "https://aui-pdf-processing.r2.cloudflarestorage.com/images/.../page-3.png?..."
  ],
  "message": "PDF successfully converted to images"
}
```

## Security Note

- Never commit real API keys to version control
- The script only shows the first 20 characters of your API key for security
- Environment variables are the recommended way to provide credentials

## Troubleshooting

**Test is skipped?**
- Make sure all three environment variables are set: `AUI_API_KEY`, `AUI_USER_ID`, `AUI_WORKSPACE_ID`

**Authentication errors?**
- Verify your API key is correct and active
- Check that the User ID and Workspace ID match your account

**Network timeouts?**
- The test has a 15-second timeout
- Large PDFs may take longer to process 