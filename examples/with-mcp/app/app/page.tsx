import { Providers } from "./providers";
import { McpUI } from "./McpUI";

export default function Home() {
  return (
    <Providers>
      <h1>react-mcp test</h1>
      <p>
        A minimal harness for verifying the OAuth flow against a local MCP
        server. The server runs at <code>http://localhost:8787</code> (started
        alongside the app by <code>pnpm dev</code>).
      </p>
      <McpUI />
    </Providers>
  );
}
