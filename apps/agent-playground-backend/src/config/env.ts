export type AgentBackendEnv = {
  port: number;
  allowedOrigins: string[];
};

export function readEnv(env: NodeJS.ProcessEnv = process.env): AgentBackendEnv {
  return {
    port: Number(env.PORT ?? 3001),
    allowedOrigins: (env.ASSISTANT_UI_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}
