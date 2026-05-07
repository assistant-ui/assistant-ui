import "dotenv/config";
import { createAgentPlaygroundApp } from "./app.js";
import { readEnv } from "./config/env.js";

const env = readEnv();
const app = createAgentPlaygroundApp();

app.listen(env.port, () => {
  console.log(`assistant-ui agent playground backend listening on :${env.port}`);
});
