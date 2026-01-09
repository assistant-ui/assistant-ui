# Authenticated MCP server (Python)

This example shows how to build an authenticated app with the OpenAI Apps SDK.
It demonstrates triggering the ChatGPT authentication UI by responding with MCP
authorization metadata and follows the same OAuth flow described in the [MCP
authorization spec](https://modelcontextprotocol.io/docs/tutorials/security/authorization#the-authorization-flow:-step-by-step).

The Apps SDK [auth guide](https://developers.openai.com/apps-sdk/build/auth#triggering-authentication-ui) covers how the UI is triggered.

The server exposes two tools:

1. `search_pizza_sf` (mixed auth, returns the `mixed-auth-search` widget)
2. `see_past_orders` (OAuth required, returns the `mixed-auth-past-orders` widget with past orders data)

If a request is missing a token for the protected tool, the server returns an `mcp/www_authenticate` hint (backed by `WWW-Authenticate`) plus `/.well-known/oauth-protected-resource` metadata so ChatGPT knows which authorization server to use. With a valid token, the tools return widget markup or structured results.

## Set up

### 1. Configure the authorization server (Auth0)

> This example uses an Auth0 tenant as a default authorization server. To set up your own, follow the instructions below:

1. **Create an API**

   - Auth0 Dashboard → _Applications_ → _APIs_ → _Create API_
   - Name it (e.g., `mcp-python-server`)
   - Identifier → `https://your-domain.example.com/mcp` (add this to your `JWT_AUDIENCES` environment variable)
   - (JWT) Profile → Auth0

2. **Enable a default audience for your tenant** (per [this community post](https://community.auth0.com/t/rfc-8707-implementation-audience-vs-resource/188990/4)) so that Auth0 issues an unencrypted RS256 JWT.

   - Tenant settings > Default Audience > Add the API identifier you created in step 1.

3. **Enable Dynamic Client Registration**

   - Go to Dashboard > Settings > Advanced and enable the [OIDC Dynamic Application Registration](https://auth0.com/docs/get-started/applications/dynamic-client-registration?tenant=openai-mcpkit-trial%40prod-us-5&locale=en-us).

4. **Add a social connection to the tenant** for example Google oauth2 to provide a social login mechanism for uers.
   - Authentication > Social > google-oauth2 > Advanced > Promote Connection to Domain Level

### 2. Set the environment variables

Create `authenticated_server_python/.env` with the values below:

```env
AUTHORIZATION_SERVER_URL=https://your-domain.example.com
RESOURCE_SERVER_URL=https://your-domain.example.com/mcp
```

- `AUTHORIZATION_SERVER_URL`: Base URL for your OAuth authorization server (Auth0 tenant). This is what ChatGPT uses to start the OAuth flow.
- `RESOURCE_SERVER_URL`: Public URL to this MCP server's `/mcp` endpoint. This is the protected resource URL advertised in the OAuth metadata.

### 3. Customize the app

Adjust the `WWW-Authenticate` construction or scopes to match your security model.

## Run the app

### Serve the static assets

In a separate terminal, from the root of the directory, build and serve the widget assets (required for the UI):

```bash
pnpm run build
pnpm run serve
```

### Install python requirements

```bash
cd authenticated_server_python/
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Run the MCP server

Run the following command to start the MCP server:

```bash
uvicorn authenticated_server_python.main:app --port 8000
```

### Tunnel with ngrok

In a separate tab, to expose the server publicly (required for ChatGPT to reach it), tunnel the local port with ngrok:

```bash
ngrok http 8000
```

Copy the `https://...ngrok-free.app` URL and set `RESOURCE_SERVER_URL` in `.env` to `https://...ngrok-free.app/mcp`

The server listens on `http://127.0.0.1:8000` and exposes the standard MCP endpoint at `GET /mcp`.

The `search_pizza_sf` tool echoes the optional `searchTerm` argument as a topping and returns structured content plus widget markup. Unauthenticated calls return the MCP auth hint so the Apps SDK can start the OAuth flow.

The `see_past_orders` tool requires OAuth and returns the `mixed-auth-past-orders` widget with past orders data.
