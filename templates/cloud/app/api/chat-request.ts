import { frontendTools } from "@assistant-ui/ai-sdk";
import { type JSONSchema7, safeValidateUIMessages, type UIMessage } from "ai";

// The body comes from the browser, so check its shape before using it.
export async function readChatRequest(req: Request) {
  const body: unknown = await req.json().catch(() => undefined);
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { error: "The request body must be a JSON object." };
  }
  const { messages, system, tools } = body as Record<string, unknown>;
  if (system !== undefined && typeof system !== "string") {
    return { error: "`system` must be a string." };
  }
  const validated = await safeValidateUIMessages({ messages });
  if (!validated.success) {
    return { error: `Invalid messages: ${validated.error.message}` };
  }
  try {
    return {
      messages: validated.data,
      system,
      frontendTools: frontendTools(
        (tools === undefined ? {} : tools) as Record<
          string,
          { description?: string; parameters: JSONSchema7 }
        >,
      ),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

// Signs each tool approval request, so the client can approve only the exact
// call the server asked about. Set it before you give a server tool
// `needsApproval`: any random string of 32 or more characters (for example
// `openssl rand -hex 32`), the same on every server instance.
export function toolApprovalSecret() {
  const secret = process.env.TOOL_APPROVAL_SECRET;
  if (!secret) return undefined;
  if (secret.length < 32) {
    throw new Error("TOOL_APPROVAL_SECRET must be at least 32 characters.");
  }
  return secret;
}

// Without a secret the server cannot tell a real approval from a forged one,
// so it refuses every approval answer.
export function answersToolApproval(messages: UIMessage[]) {
  return messages.some((message) =>
    message.parts.some(
      (part) => "approval" in part && part.approval?.approved !== undefined,
    ),
  );
}
