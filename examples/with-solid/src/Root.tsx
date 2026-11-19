import { AuiConfig, AuiProvider } from "@assistant-ui/solid";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import App from "./App";
import { createEchoRuntime } from "./runtime";

export default function Root() {
  const config = AuiConfig({
    threads: RuntimeAdapter(createEchoRuntime()),
  });

  return (
    <AuiProvider config={config}>
      <App />
    </AuiProvider>
  );
}
