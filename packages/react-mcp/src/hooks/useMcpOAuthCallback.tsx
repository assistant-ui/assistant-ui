import { type FC, type ReactNode, useEffect, useRef, useState } from "react";
import { useAui } from "@assistant-ui/store";
import { decodeServerIdFromState } from "../auth/createOAuthProvider";

export const createMcpOAuthCallbackError = (
  err: unknown,
  serverId: string | null,
): Error => {
  const message = err instanceof Error ? err.message : String(err);
  if (serverId) {
    return new Error(
      `MCP OAuth callback for server "${serverId}" failed: ${message}`,
    );
  }
  return new Error(`MCP OAuth callback failed: ${message}`);
};

export type UseMcpOAuthCallbackOptions = {
  /** Defaults to `window.location.href`. */
  url?: string;
  onComplete?: (serverId: string) => void;
  onError?: (err: Error) => void;
};

export type UseMcpOAuthCallbackResult = {
  status: "idle" | "running" | "done" | "error";
  serverId: string | null;
  error: Error | null;
};

export function useMcpOAuthCallback(
  opts: UseMcpOAuthCallbackOptions = {},
): UseMcpOAuthCallbackResult {
  const aui = useAui();
  const [result, setResult] = useState<UseMcpOAuthCallbackResult>({
    status: "idle",
    serverId: null,
    error: null,
  });
  // Guard against React 18 Strict Mode's mount-unmount-remount: the effect
  // body must not run completeAuth twice for the same URL, otherwise the
  // single-use OAuth code is double-redeemed and the second attempt 4xxs.
  const startedRef = useRef<string | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const url =
      opts.url ?? (typeof window !== "undefined" ? window.location.href : null);
    if (!url) return;
    if (startedRef.current === url) return;
    startedRef.current = url;

    (async () => {
      let serverId: string | null = null;
      try {
        const parsed = new URL(url);
        const state = parsed.searchParams.get("state");
        if (state) serverId = decodeServerIdFromState(state);
        const error = parsed.searchParams.get("error");
        if (error) {
          throw new Error(
            parsed.searchParams.get("error_description") ?? error,
          );
        }
        if (!state) throw new Error('missing "state" parameter');
        if (!serverId) {
          throw new Error("state was not created by assistant-ui MCP");
        }
        setResult({ status: "running", serverId, error: null });
        await aui.mcp().server({ id: serverId }).completeAuth(url);
        setResult({ status: "done", serverId, error: null });
        optsRef.current.onComplete?.(serverId);
      } catch (err) {
        const e = createMcpOAuthCallbackError(err, serverId);
        setResult({ status: "error", serverId, error: e });
        optsRef.current.onError?.(e);
      }
    })();
  }, [aui, opts.url]);

  return result;
}

export const McpOAuthCallback: FC<
  UseMcpOAuthCallbackOptions & {
    children?: (result: UseMcpOAuthCallbackResult) => ReactNode;
  }
> = ({ children, ...opts }) => {
  const result = useMcpOAuthCallback(opts);
  if (children) return <>{children(result)}</>;
  return null;
};
