import { runProxy } from "./proxy.js";

export { runProxy };

export async function runServer() {
  await runProxy();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void runServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}
