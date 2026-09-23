// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { useAuiState } from "@assistant-ui/store";
import { ThreadPrimitiveMessages } from "../thread/ThreadMessages";
import { ThreadPrimitiveRoot } from "../thread/ThreadRoot";
import { MessagePrimitiveIf } from "./MessageIf";

const messages: ThreadMessageLike[] = [
  { id: "u", role: "user", content: [{ type: "text", text: "u" }] },
  { id: "a", role: "assistant", content: [{ type: "text", text: "a" }] },
  { id: "s", role: "system", content: [{ type: "text", text: "s" }] },
];

const roles = ["user", "assistant", "system"] as const;
type Role = (typeof roles)[number];

const roleFilter = (role: Role, value: boolean | undefined) =>
  ({ [role]: value }) as MessagePrimitiveIf.Props;

const renderRoles = (filter: MessagePrimitiveIf.Props) => {
  const Message = () => {
    const role = useAuiState((s) => s.message.role);
    return (
      <MessagePrimitiveIf {...filter}>
        <span data-testid={`shown-${role}`} />
      </MessagePrimitiveIf>
    );
  };
  const Example = () => {
    const runtime = useExternalStoreRuntime({
      messages,
      convertMessage: (message) => message,
      onNew: async () => {},
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadPrimitiveRoot>
          <ThreadPrimitiveMessages components={{ Message }} />
        </ThreadPrimitiveRoot>
      </AssistantRuntimeProvider>
    );
  };
  const { queryByTestId } = render(<Example />);
  return roles.filter((role) => queryByTestId(`shown-${role}`) !== null);
};

describe("MessagePrimitive.If role filters", () => {
  it.each(roles)("%s={true} renders only that role", (role) => {
    expect(renderRoles(roleFilter(role, true))).toEqual([role]);
  });

  it.each(roles)("%s={false} renders every other role", (role) => {
    expect(renderRoles(roleFilter(role, false))).toEqual(
      roles.filter((r) => r !== role),
    );
  });

  it.each(roles)("%s={undefined} renders every role", (role) => {
    expect(renderRoles(roleFilter(role, undefined))).toEqual([...roles]);
  });

  it("combines a true filter with a false filter", () => {
    expect(renderRoles({ assistant: false, system: false })).toEqual(["user"]);
  });
});
