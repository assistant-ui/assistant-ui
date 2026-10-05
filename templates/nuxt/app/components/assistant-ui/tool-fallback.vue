<script setup lang="ts">
import { computed, onMounted, ref, watch, watchEffect } from "vue";
import { useAui, useAuiState, type ToolUIProps } from "@assistant-ui/vue";
import {
  toolApprovalAcceptsText,
  type ToolApprovalAnswer,
  type ToolApprovalOption,
  type ToolApprovalQuestion,
} from "@assistant-ui/core";
import type {} from "@assistant-ui/core/store";
import {
  CollapsibleContent,
  CollapsibleRoot,
  CollapsibleTrigger,
} from "reka-ui";
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleMinusIcon,
  LoaderIcon,
  XCircleIcon,
} from "@lucide/vue";

type Approval = NonNullable<ToolUIProps["part"]["approval"]>;

const APPROVED_RESULT = "Approved by user";
const DENIED_RESULT = "User denied tool execution";

const APPROVAL_OPTION_DEFAULT_LABELS: Record<string, string> = {
  "allow-once": "Allow",
  "allow-always": "Always allow",
  "reject-once": "Deny",
  "reject-always": "Always deny",
};

const isKnownKind = (kind: string) =>
  Object.hasOwn(APPROVAL_OPTION_DEFAULT_LABELS, kind);

const isAllowKind = (kind: string) =>
  kind === "allow-once" || kind === "allow-always";

const optionLabel = (option: ToolApprovalOption) =>
  option.label ??
  (isKnownKind(option.kind)
    ? APPROVAL_OPTION_DEFAULT_LABELS[option.kind]
    : undefined) ??
  option.id;

// A request that declares how it wants to be presented is asking a question,
// not gating an action, so a refusal is not one of the answers it accepts
// unless the request declares itself dismissible.
const isQuestion = (approval: Approval | undefined) =>
  approval?.display === "select" ||
  approval?.display === "text" ||
  approval?.display === "questions";

const isSettled = (approval: Approval | undefined) =>
  approval != null &&
  (approval.approved !== undefined || approval.resolution !== undefined);

const questionAcceptsText = (question: ToolApprovalQuestion) =>
  !question.options?.length || question.allowFreeform === true;

const formatUnknownValue = (value: unknown, space?: number): string => {
  if (typeof value === "string") return value;
  try {
    if (value instanceof Error) return String(value);
    const json = JSON.stringify(value, null, space);
    if (json !== undefined) return json;
  } catch {}
  try {
    return String(value);
  } catch {
    return "[Unserializable value]";
  }
};

const formatToolDuration = (ms: number) => {
  if (ms < 1000) return "<1s";
  const seconds = ms / 1000;
  if (seconds < 10) return `${(Math.floor(seconds * 10) / 10).toFixed(1)}s`;
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
};

const button =
  "rounded-lg px-3 text-sm font-medium transition-[scale,background-color] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
const primary = "bg-primary text-primary-foreground hover:bg-primary/90";
const outline =
  "border-border bg-background hover:bg-accent hover:text-accent-foreground border";
const inline = "inline-flex items-center gap-1.5 py-1.5";
const primaryButton = [button, primary, inline];
const outlineButton = [button, outline, inline];
const textareaClass =
  "border-border bg-background placeholder:text-muted-foreground focus-visible:ring-ring/50 min-h-16 w-full resize-none rounded-lg border px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 disabled:opacity-50";

const aui = useAui();
const part = useAuiState((s) => (s.part.type === "tool-call" ? s.part : null));
const voiceActive = useAuiState((s) => s.thread.voice !== undefined);
const canAnswer = useAuiState((s) => s.thread.capabilities.answerToolCall);

const status = computed(() => part.value?.status);
const statusType = computed(() => status.value?.type ?? "complete");
const isRunning = computed(() => statusType.value === "running");
const isCancelled = computed(
  () =>
    status.value?.type === "incomplete" && status.value.reason === "cancelled",
);
const requiresAction = computed(() => statusType.value === "requires-action");

const label = computed(() => {
  switch (statusType.value) {
    case "running":
      return "Running tool";
    case "requires-action":
      return "Waiting on tool";
    case "incomplete":
      return `${isCancelled.value ? "Cancelled" : "Failed"} tool`;
    default:
      return "Used tool";
  }
});

const statusIcon = computed(() => {
  switch (statusType.value) {
    case "running":
      return LoaderIcon;
    case "requires-action":
      return AlertCircleIcon;
    case "incomplete":
      return XCircleIcon;
    default:
      return CheckIcon;
  }
});

const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});
const now = ref<number | undefined>(undefined);
const timing = computed(() => part.value?.timing);
const clockRunning = computed(
  () =>
    timing.value !== undefined &&
    timing.value.completedAt === undefined &&
    isRunning.value,
);
watchEffect((onCleanup) => {
  if (!mounted.value || !clockRunning.value) return;
  now.value = Date.now();
  const id = setInterval(() => {
    now.value = Date.now();
  }, 1000);
  onCleanup(() => clearInterval(id));
});
const duration = computed(() => {
  const value = timing.value;
  if (value === undefined) return undefined;
  if (value.completedAt !== undefined)
    return formatToolDuration(Math.max(0, value.completedAt - value.startedAt));
  if (!clockRunning.value || now.value === undefined) return undefined;
  return formatToolDuration(Math.max(0, now.value - value.startedAt));
});

const open = ref(requiresAction.value);
watch(requiresAction, (value) => {
  if (value) open.value = true;
});

const errorText = computed(() => {
  const value = status.value;
  if (value?.type !== "incomplete") return null;
  if (value.error === undefined || value.error === null) return null;
  return formatUnknownValue(value.error) || null;
});

const approval = computed(() => part.value?.approval);
const interrupt = computed(() => part.value?.interrupt);
const offersInterruptAction = computed(() => {
  const value = status.value;
  return (
    value?.type !== "requires-action" ||
    value.reason !== "interrupt" ||
    approval.value != null ||
    interrupt.value != null
  );
});
const showApproval = computed(
  () =>
    (requiresAction.value && offersInterruptAction.value) ||
    isSettled(approval.value),
);

const receipt = computed(() => {
  const value = approval.value;
  if (value == null || !isSettled(value)) return null;
  if (value.resolution !== undefined)
    return {
      outcome: "closed" as const,
      label:
        value.resolution === "cancelled"
          ? "Cancelled before a decision"
          : "Expired before a decision",
      option: undefined,
    };
  const chosen =
    value.optionId === undefined
      ? undefined
      : value.options?.find((option) => option.id === value.optionId);
  const option = chosen !== undefined ? optionLabel(chosen) : value.optionId;
  const answered =
    isQuestion(value) || (chosen !== undefined && !isKnownKind(chosen.kind));
  const automatic = value.isAutomatic ? " automatically" : "";
  return value.approved
    ? {
        outcome: "allowed" as const,
        label: `${answered ? "Answered" : "Allowed"}${automatic}`,
        option,
      }
    : {
        outcome: "refused" as const,
        label: `${answered ? "Dismissed" : "Denied"}${automatic}`,
        option,
      };
});
const receiptIcon = computed(() => {
  switch (receipt.value?.outcome) {
    case "allowed":
      return CheckIcon;
    case "refused":
      return XCircleIcon;
    default:
      return CircleMinusIcon;
  }
});
const receiptAnswers = computed(() => {
  const value = approval.value;
  if (!value?.answers) return [];
  const answers = value.answers;
  return (value.questions ?? []).flatMap((question) => {
    const answer = Object.hasOwn(answers, question.id)
      ? answers[question.id]
      : undefined;
    const labels = [
      ...(answer?.optionIds ?? []).map(
        (id) =>
          question.options?.find((option) => option.id === id)?.label ?? id,
      ),
      ...(answer?.text?.trim() ? [answer.text] : []),
    ];
    return labels.length === 0
      ? []
      : [
          {
            id: question.id,
            title: question.header ?? question.prompt,
            labels: labels.join(", "),
          },
        ];
  });
});
const receiptNotes = computed(() => [
  ...new Set(
    [approval.value?.text, approval.value?.reason].filter(
      (value): value is string => typeof value === "string" && value !== "",
    ),
  ),
]);

const submitted = ref(false);
const locked = computed(() => submitted.value || voiceActive.value);
const confirmingId = ref<string | null>(null);
const answer = ref("");
const error = ref<string | null>(null);

const options = computed(() => approval.value?.options ?? []);
const allowOptions = computed(() =>
  options.value.filter((option) => isAllowKind(option.kind)),
);
const rejectOptions = computed(() =>
  options.value.filter(
    (option) => isKnownKind(option.kind) && !isAllowKind(option.kind),
  ),
);
const orderedOptions = computed(() => [
  ...allowOptions.value,
  ...options.value.filter((option) => !isKnownKind(option.kind)),
  ...rejectOptions.value,
]);
const question = computed(() => isQuestion(approval.value));
const dismissible = computed(
  () => question.value && approval.value?.dismissible === true,
);
const acceptsText = computed(
  () => approval.value != null && toolApprovalAcceptsText(approval.value),
);
const confirming = computed(() =>
  confirmingId.value == null
    ? undefined
    : options.value.find((option) => option.id === confirmingId.value),
);
const confirmMeta = computed(() =>
  typeof confirming.value?.confirm === "object"
    ? confirming.value.confirm
    : undefined,
);

// A refused response leaves the request open, so the controls come back
// rather than staying spent on a decision the runtime never recorded.
const submit = (send: () => Promise<void> | void) => {
  submitted.value = true;
  error.value = null;
  void (async () => {
    try {
      await send();
    } catch (sendError) {
      submitted.value = false;
      error.value =
        sendError instanceof Error ? sendError.message : String(sendError);
    }
  })();
};

const typedNote = () => (answer.value.trim() ? { text: answer.value } : {});

const respond = (approved: boolean) => {
  if (locked.value) return;
  const value = status.value;
  if (approval.value != null && approval.value.approved === undefined) {
    submit(() => aui.part.respondToToolApproval({ approved, ...typedNote() }));
  } else if (interrupt.value) {
    submit(() => aui.part.resumeToolCall({ approved }));
  } else if (
    value?.type === "requires-action" &&
    value.reason === "interrupt"
  ) {
    return;
  } else {
    submit(() =>
      aui.part.addToolResult(approved ? APPROVED_RESULT : DENIED_RESULT),
    );
  }
};

// A custom kind has no decision class for the runtime to derive, and
// responding without one throws; picking a declared option is an answer, so
// it resolves as approved.
const respondWithOption = (option: ToolApprovalOption) => {
  if (locked.value) return;
  confirmingId.value = null;
  submit(() =>
    aui.part.respondToToolApproval(
      isKnownKind(option.kind)
        ? { optionId: option.id, ...typedNote() }
        : { optionId: option.id, approved: true, ...typedNote() },
    ),
  );
};

const handleOption = (option: ToolApprovalOption) => {
  if (option.confirm) {
    confirmingId.value = option.id;
  } else {
    respondWithOption(option);
  }
};

const submitAnswer = () => {
  if (locked.value) return;
  submit(() => aui.part.respondToToolApproval({ text: answer.value }));
};

// A dismissal is no answer at all, so a typed draft does not travel with it.
const dismiss = () => {
  if (locked.value) return;
  submit(() => aui.part.respondToToolApproval({ approved: false }));
};

const questions = computed(() => approval.value?.questions ?? []);
const selected = ref<ReadonlyMap<string, readonly string[]>>(new Map());
const typed = ref<ReadonlyMap<string, string>>(new Map());

const isChosen = (item: ToolApprovalQuestion, optionId: string) =>
  (selected.value.get(item.id) ?? []).includes(optionId);
const isDescribed = (item: ToolApprovalQuestion) =>
  item.options?.some((option) => option.description) ?? false;
const toggle = (item: ToolApprovalQuestion, optionId: string) => {
  const chosen = selected.value.get(item.id) ?? [];
  const next = chosen.includes(optionId)
    ? chosen.filter((id) => id !== optionId)
    : item.multiple
      ? [...chosen, optionId]
      : [optionId];
  selected.value = new Map(selected.value).set(item.id, next);
};
const setTyped = (item: ToolApprovalQuestion, event: Event) => {
  const { value } = event.target as HTMLTextAreaElement;
  typed.value = new Map(typed.value).set(item.id, value);
};
const answerOf = (item: ToolApprovalQuestion): ToolApprovalAnswer => {
  const optionIds = selected.value.get(item.id) ?? [];
  const draft = typed.value.get(item.id);
  const text = draft?.trim() ? draft : undefined;
  return {
    ...(optionIds.length > 0 && { optionIds }),
    ...(text !== undefined && { text }),
  };
};
const questionsComplete = computed(
  () =>
    questions.value.length > 0 &&
    questions.value.every((item) => {
      const value = answerOf(item);
      return value.optionIds !== undefined || value.text !== undefined;
    }),
);
const sendAnswers = () => {
  if (locked.value || !questionsComplete.value) return;
  const answers = Object.fromEntries(
    questions.value.map((item) => [item.id, answerOf(item)]),
  );
  submit(() => aui.part.respondToToolApproval({ answers }));
};
</script>

<template>
  <CollapsibleRoot
    v-if="part"
    v-model:open="open"
    data-slot="aui_tool-fallback-root"
    class="w-full"
  >
    <CollapsibleTrigger
      data-slot="aui_tool-fallback-trigger"
      class="group/trigger text-muted-foreground hover:text-foreground flex w-fit origin-left items-center gap-2 py-1.5 text-sm transition-[color,scale] active:scale-[0.98]"
    >
      <component
        :is="statusIcon"
        class="size-4 shrink-0"
        :class="[
          isCancelled && 'text-muted-foreground',
          isRunning && 'animate-spin [animation-duration:0.6s]',
        ]"
      />
      <span
        class="inline-block text-start leading-none"
        :class="[
          isCancelled && 'text-muted-foreground line-through',
          isRunning && 'animate-pulse motion-reduce:animate-none',
        ]"
      >
        {{ label }}: <b>{{ part.toolName }}</b>
      </span>
      <span
        v-if="duration !== undefined"
        data-slot="aui_tool-fallback-duration"
        class="text-muted-foreground text-xs tabular-nums"
        >{{ duration }}</span
      >
      <ChevronDownIcon
        class="size-4 shrink-0 -rotate-90 transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-[state=open]/trigger:rotate-0 motion-reduce:transition-none"
      />
    </CollapsibleTrigger>
    <CollapsibleContent
      data-slot="aui_tool-fallback-content"
      class="aui-collapsible-content relative overflow-hidden text-sm outline-none"
    >
      <div class="flex flex-col gap-2 ps-6 pt-1 pb-2">
        <div v-if="errorText" data-slot="aui_tool-fallback-error">
          <p class="text-muted-foreground font-semibold">
            {{ isCancelled ? "Cancelled reason:" : "Error:" }}
          </p>
          <p class="text-muted-foreground whitespace-pre-line">
            {{ errorText }}
          </p>
        </div>
        <pre
          v-if="part.argsText"
          data-slot="aui_tool-fallback-args"
          class="bg-muted/50 text-foreground/90 rounded-md p-2.5 text-xs whitespace-pre-wrap"
          :class="isCancelled && 'opacity-60'"
          >{{ part.argsText }}</pre>
        <template v-if="showApproval">
          <div
            v-if="receipt"
            data-slot="aui_tool-fallback-approval-receipt"
            :data-outcome="receipt.outcome"
            class="flex flex-col gap-1.5 pt-1"
          >
            <p
              v-if="approval?.prompt"
              class="text-muted-foreground whitespace-pre-line"
            >
              {{ approval.prompt }}
            </p>
            <p class="flex items-center gap-1.5">
              <component
                :is="receiptIcon"
                aria-hidden="true"
                class="text-muted-foreground size-3.5 shrink-0"
              />
              <span class="font-medium">{{ receipt.label }}</span>
              <span
                v-if="receipt.option !== undefined"
                class="text-muted-foreground"
                >· {{ receipt.option }}</span
              >
            </p>
            <p
              v-for="row in receiptAnswers"
              :key="row.id"
              class="whitespace-pre-line"
            >
              <span class="text-muted-foreground">{{ row.title }}</span> ·
              {{ row.labels }}
            </p>
            <p
              v-for="note in receiptNotes"
              :key="note"
              class="text-muted-foreground whitespace-pre-line"
            >
              {{ note }}
            </p>
          </div>
          <template v-else-if="!canAnswer">
            <div
              v-if="approval?.prompt"
              data-slot="aui_tool-fallback-approval"
              class="flex flex-col gap-2 pt-1"
            >
              <p class="text-foreground whitespace-pre-line">
                {{ approval.prompt }}
              </p>
            </div>
          </template>
          <div
            v-else-if="confirming"
            data-slot="aui_tool-fallback-approval-confirm"
            class="flex flex-col gap-2 pt-1"
          >
            <p class="font-semibold">
              {{ confirmMeta?.title ?? `${optionLabel(confirming)}?` }}
            </p>
            <p
              v-if="confirmMeta?.description ?? confirming.description"
              class="text-muted-foreground whitespace-pre-line"
            >
              {{ confirmMeta?.description ?? confirming.description }}
            </p>
            <ul v-if="confirming.grants?.length" class="flex flex-col gap-1">
              <li v-for="grant in confirming.grants" :key="grant">
                <code class="bg-muted rounded px-1.5 py-0.5 text-xs">{{
                  grant
                }}</code>
              </li>
            </ul>
            <div class="flex items-center gap-2">
              <button
                type="button"
                :class="primaryButton"
                :disabled="locked"
                @click="respondWithOption(confirming)"
              >
                Confirm
              </button>
              <button
                type="button"
                :class="outlineButton"
                :disabled="locked"
                @click="confirmingId = null"
              >
                Back
              </button>
            </div>
          </div>
          <div
            v-else-if="approval?.display === 'questions'"
            data-slot="aui_tool-fallback-approval"
            class="flex flex-col gap-3 pt-1"
          >
            <p
              v-if="approval.prompt"
              class="text-foreground whitespace-pre-line"
            >
              {{ approval.prompt }}
            </p>
            <div
              v-for="item in questions"
              :key="item.id"
              role="group"
              :aria-label="item.prompt"
              data-slot="aui_tool-fallback-approval-question"
              class="flex flex-col gap-2"
            >
              <p class="text-foreground whitespace-pre-line">
                <span
                  v-if="item.header"
                  class="text-muted-foreground me-1.5 text-xs font-medium uppercase"
                  >{{ item.header }}</span
                >{{ item.prompt }}
              </p>
              <div
                v-if="item.options?.length"
                class="flex gap-2"
                :class="
                  isDescribed(item)
                    ? 'flex-col items-stretch'
                    : 'flex-wrap items-center'
                "
              >
                <button
                  v-for="option in item.options"
                  :key="option.id"
                  type="button"
                  :class="[
                    button,
                    isChosen(item, option.id) ? primary : outline,
                    isDescribed(item)
                      ? 'flex flex-col items-start gap-0.5 py-2 text-start whitespace-normal'
                      : inline,
                  ]"
                  :aria-pressed="isChosen(item, option.id)"
                  :disabled="locked"
                  @click="toggle(item, option.id)"
                >
                  <span>{{ option.label }}</span>
                  <span
                    v-if="option.description"
                    class="text-xs font-normal opacity-80"
                    >{{ option.description }}</span
                  >
                </button>
              </div>
              <textarea
                v-if="questionAcceptsText(item)"
                :value="typed.get(item.id) ?? ''"
                :disabled="locked"
                :aria-label="item.prompt"
                :placeholder="
                  item.options?.length
                    ? 'Or type an answer'
                    : 'Type your answer'
                "
                :class="textareaClass"
                @input="setTyped(item, $event)"
              />
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                :class="primaryButton"
                :disabled="locked || !questionsComplete"
                @click="sendAnswers"
              >
                Send
              </button>
              <button
                v-if="approval.dismissible === true"
                type="button"
                :class="outlineButton"
                :disabled="locked"
                @click="dismiss"
              >
                Dismiss
              </button>
            </div>
            <p
              v-if="error"
              role="alert"
              class="text-destructive text-xs whitespace-pre-line"
            >
              {{ error }}
            </p>
          </div>
          <div
            v-else
            data-slot="aui_tool-fallback-approval"
            class="flex flex-col gap-2 pt-1"
          >
            <p
              v-if="approval?.prompt"
              class="text-foreground whitespace-pre-line"
            >
              {{ approval.prompt }}
            </p>
            <div
              v-if="orderedOptions.length > 0"
              class="flex flex-wrap items-center gap-2"
            >
              <button
                v-for="option in orderedOptions"
                :key="option.id"
                type="button"
                :class="
                  option === allowOptions[0] ? primaryButton : outlineButton
                "
                :disabled="locked"
                @click="handleOption(option)"
              >
                {{ optionLabel(option) }}
              </button>
              <button
                v-if="rejectOptions.length === 0 && !question"
                type="button"
                :class="outlineButton"
                :disabled="locked"
                @click="respond(false)"
              >
                Deny
              </button>
              <button
                v-if="!acceptsText && dismissible"
                type="button"
                :class="outlineButton"
                :disabled="locked"
                @click="dismiss"
              >
                Dismiss
              </button>
            </div>
            <div v-else-if="!question" class="flex items-center gap-2">
              <button
                type="button"
                :class="primaryButton"
                :disabled="locked"
                @click="respond(true)"
              >
                Allow
              </button>
              <button
                type="button"
                :class="outlineButton"
                :disabled="locked"
                @click="respond(false)"
              >
                Deny
              </button>
            </div>
            <div v-if="acceptsText" class="flex flex-col items-start gap-2">
              <textarea
                v-model="answer"
                :disabled="locked"
                :aria-label="question ? (approval?.prompt ?? 'Answer') : 'Note'"
                :placeholder="
                  question ? 'Type your answer' : 'Add a note to your decision'
                "
                :class="textareaClass"
              />
              <div v-if="question" class="flex items-center gap-2">
                <button
                  type="button"
                  :class="primaryButton"
                  :disabled="locked"
                  @click="submitAnswer"
                >
                  Send
                </button>
                <button
                  v-if="dismissible"
                  type="button"
                  :class="outlineButton"
                  :disabled="locked"
                  @click="dismiss"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <div
              v-else-if="question && orderedOptions.length === 0 && dismissible"
              class="flex items-center gap-2"
            >
              <button
                type="button"
                :class="outlineButton"
                :disabled="locked"
                @click="dismiss"
              >
                Dismiss
              </button>
            </div>
            <p
              v-if="error"
              role="alert"
              class="text-destructive text-xs whitespace-pre-line"
            >
              {{ error }}
            </p>
          </div>
        </template>
        <div
          v-if="part.result !== undefined"
          data-slot="aui_tool-fallback-result"
        >
          <p class="text-muted-foreground text-xs font-medium">Result:</p>
          <pre
            class="bg-muted/50 text-foreground/90 mt-1 rounded-md p-2.5 text-xs whitespace-pre-wrap"
            >{{ formatUnknownValue(part.result, 2) }}</pre>
        </div>
      </div>
    </CollapsibleContent>
  </CollapsibleRoot>
</template>

<style scoped>
.aui-collapsible-content[data-state="open"] {
  animation: aui-collapsible-down 200ms cubic-bezier(0.32, 0.72, 0, 1);
}
.aui-collapsible-content[data-state="closed"] {
  animation: aui-collapsible-up 200ms cubic-bezier(0.32, 0.72, 0, 1);
}
@media (prefers-reduced-motion: reduce) {
  .aui-collapsible-content[data-state] {
    animation: none;
  }
}
@keyframes aui-collapsible-down {
  from {
    height: 0;
  }
  to {
    height: var(--reka-collapsible-content-height);
  }
}
@keyframes aui-collapsible-up {
  from {
    height: var(--reka-collapsible-content-height);
  }
  to {
    height: 0;
  }
}
</style>
