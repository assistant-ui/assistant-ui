import { Providers } from "./providers";
import { Showcase } from "./Showcase";

export default function Home() {
  return (
    <Providers>
      <h1 style={{ marginTop: 0 }}>GitHub MCP showcase</h1>
      <p>
        A live MCP server wrapping a slice of the GitHub REST API, with OAuth
        via GitHub login, served to this app through{" "}
        <code>@assistant-ui/react-mcp</code>. Tools return inline MCP App
        widgets (charts and diagrams) rendered via the native MCP Apps renderer
        in <code>@assistant-ui/react</code>.
      </p>
      <Showcase />
    </Providers>
  );
}
