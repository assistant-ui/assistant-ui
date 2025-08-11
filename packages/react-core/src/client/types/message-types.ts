import { UserUITools, UserUIToolMetadata } from "../../utils/augmentation";
import { DeepPartial, ReadonlyDeep, ValueOf } from "../../utils/type-utils";

export type TextUIPart = {
  readonly type: "text";
  readonly text: string;
  readonly state?: "streaming" | "done";
  readonly metadata?: Record<string, unknown>;
};

export type ToolUIInput<NAME extends keyof UserUITools> = ReadonlyDeep<
  UserUITools[NAME]["input"]
>;

export type ToolUIOutput<NAME extends keyof UserUITools> = ReadonlyDeep<
  UserUITools[NAME]["output"]
>;

export type ToolUIPart<NAME extends keyof UserUITools = keyof UserUITools> =
  ValueOf<{
    [TOOLNAME in NAME]: {
      readonly type: `tool-${TOOLNAME}`;
      readonly toolCallId: string;
      readonly metadata?: UserUIToolMetadata;
      readonly output?: ToolUIOutput<TOOLNAME>;
      readonly errorText?: string;
      readonly providerExecuted?: boolean;
    } & (
      | {
          readonly state: "input-streaming";
          readonly input: DeepPartial<ToolUIInput<TOOLNAME>>;
          readonly inputText: string;
        }
      | {
          readonly state: "input-available";
          readonly input: ToolUIInput<TOOLNAME>;
        }
      | {
          readonly state: "pending-approval";
          readonly input: ToolUIInput<TOOLNAME>;
        }
      | {
          readonly state: "output-available";
          readonly input: ToolUIInput<TOOLNAME>;
          readonly output: ToolUIOutput<TOOLNAME>;
        }
      | {
          readonly state: "output-error";
          readonly input: ToolUIInput<TOOLNAME>;
          readonly errorText: string;
        }
    );
  }>;

export type UserUIPart = TextUIPart | ToolUIPart;
export type AssistantUIPart = TextUIPart | ToolUIPart;

export type UIPart = UserUIPart | AssistantUIPart;

export type UIMessage =
  | {
      readonly role: "user";
      readonly parts: readonly UserUIPart[];
    }
  | {
      readonly role: "assistant";
      readonly parts: readonly AssistantUIPart[];
    };

type TextUIMessageLike = {
  readonly role: "user" | "assistant";
  readonly text: string;
};

export type ToolUIPartLike =
  | {
      readonly type: `tool-${string}`;
      readonly toolCallId?: string;
      readonly input: unknown;
      readonly output?: unknown;
      readonly errorText?: string;
      readonly providerExecuted?: boolean;
    }
  | {
      readonly type: `tool-${string}`;
      readonly toolCallId?: string;
      readonly state: "input-streaming" | "input-available";
      readonly input: unknown;
      readonly providerExecuted?: boolean;
    }
  | {
      readonly type: `tool-${string}`;
      readonly toolCallId?: string;
      readonly state: "pending-approval";
      readonly input: unknown;
      readonly providerExecuted?: boolean;
    }
  | {
      readonly type: `tool-${string}`;
      readonly toolCallId?: string;
      readonly state: "output-available";
      readonly input: unknown;
      readonly output: unknown;
      readonly providerExecuted?: boolean;
    }
  | {
      readonly type: `tool-${string}`;
      readonly toolCallId?: string;
      readonly state: "output-error";
      readonly input: unknown;
      readonly errorText: string;
      readonly providerExecuted?: boolean;
    };

type RegularUIMessageLike = {
  readonly role: "user" | "assistant";
  readonly parts: readonly (
    | {
        readonly type?: "text";
        readonly text: string;
      }
    | ToolUIPartLike
    | {
        readonly type: `toolOutput`;
        readonly toolCallId: string;
        readonly state?: "output-available";
        readonly output: unknown;
      }
    | {
        readonly type: `toolOutput`;
        readonly toolCallId: string;
        readonly state?: "output-error";
        readonly errorText: string;
      }
  )[];
};

export type UIMessageLike = TextUIMessageLike | RegularUIMessageLike;
export type UIMessagePartLike = RegularUIMessageLike["parts"][number];
