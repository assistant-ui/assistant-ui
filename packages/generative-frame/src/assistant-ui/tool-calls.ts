type ToolCallLike = {
  type: string;
  toolName?: string;
  toolCallId?: string;
  args?: unknown;
  argsText?: unknown;
  result?: unknown;
};

/** The part of a thread message the history readers need. */
export type MessageLike = { readonly content: string | readonly unknown[] };

export function* toolCalls(messages: readonly MessageLike[]) {
  for (const message of messages) {
    if (typeof message.content === "string") continue;
    for (const part of message.content) {
      const call = part as ToolCallLike;
      if (call?.type === "tool-call" && call.toolCallId && call.toolName) {
        yield {
          id: call.toolCallId,
          name: call.toolName,
          args: (call.args ?? {}) as Record<string, unknown>,
          argsText:
            typeof call.argsText === "string" ? call.argsText : undefined,
          result: call.result,
        };
      }
    }
  }
}

const STRING_TOKEN = /"(?:[^"\\]|\\.)*"/y;

const decode = (token: string): unknown => {
  try {
    return JSON.parse(token);
  } catch {
    return undefined;
  }
};

const streamedTitle = (argsText: string): unknown => {
  let depth = 0;
  let key: unknown;
  let inValue = false;
  for (let i = 0; i < argsText.length; i++) {
    const char = argsText[i];
    if (char === '"') {
      STRING_TOKEN.lastIndex = i;
      const token = STRING_TOKEN.exec(argsText)?.[0];
      if (token === undefined) return undefined;
      if (depth === 1) {
        if (!inValue) key = decode(token);
        else if (key === "title") return decode(token);
        else inValue = false;
      }
      i += token.length - 1;
    } else if (char === "{" || char === "[") depth++;
    else if (char === "}" || char === "]") depth--;
    else if (depth === 1 && char === ":") inValue = true;
    else if (depth === 1 && char === ",") inValue = false;
  }
  return undefined;
};

const holdsTitle = (argsText: string | undefined, title: string) =>
  argsText === undefined || streamedTitle(argsText) === title;

export function hasLaterToolCallInMessage(
  messages: readonly MessageLike[],
  toolCallId: string,
  title: string,
  toolNames: ReadonlySet<string>,
): boolean {
  if (!title) return false;
  for (const message of messages) {
    let seen = false;
    for (const call of toolCalls([message])) {
      if (call.id === toolCallId) seen = true;
      else if (
        seen &&
        toolNames.has(call.name) &&
        call.args["title"] === title &&
        holdsTitle(call.argsText, title)
      )
        return true;
    }
    if (seen) return false;
  }
  return false;
}
