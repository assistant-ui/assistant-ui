"use client";

import { useRouter } from "next/navigation";
import { McpOAuthCallback } from "@assistant-ui/react-mcp";
import { Providers } from "../../providers";

export default function CallbackPage() {
  const router = useRouter();
  return (
    <Providers>
      <h1>Completing GitHub login…</h1>
      <McpOAuthCallback
        onComplete={() => router.replace("/")}
        onError={(err) => {
          console.error("OAuth callback failed:", err);
        }}
      >
        {(result) => (
          <pre>
            {JSON.stringify(
              {
                status: result.status,
                serverId: result.serverId,
                error: result.error?.message ?? null,
              },
              null,
              2,
            )}
          </pre>
        )}
      </McpOAuthCallback>
    </Providers>
  );
}
