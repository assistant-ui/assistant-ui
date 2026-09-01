import {
  iterateToolCallParts,
  mapToolCallPartsDeep,
} from "@assistant-ui/core/internal";
import { buildResumeArray } from "@ag-ui/client";
import type {
  RespondToToolApprovalOptions,
  ThreadAssistantMessagePart,
  ToolCallMessagePart,
} from "@assistant-ui/core";
import type { AgUiInterrupt, AgUiResumeEntry } from "../types";
import {
  readRawResponseSchema,
  withoutRawResponseSchema,
} from "../interrupt-internals";

type ToolApproval = NonNullable<ToolCallMessagePart["approval"]>;

const EMPTY_APPROVALS: ReadonlyMap<string, ToolApproval> = new Map();

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown) => typeof value === "string";

const JSON_SCHEMA_TYPES = new Set([
  "null",
  "boolean",
  "object",
  "array",
  "number",
  "integer",
  "string",
]);

const isUniqueStrings = (value: unknown) =>
  Array.isArray(value) &&
  value.every(isString) &&
  new Set(value).size === value.length;

const isSchemaType = (type: unknown) =>
  (isString(type) && JSON_SCHEMA_TYPES.has(type as string)) ||
  (Array.isArray(type) &&
    type.length > 0 &&
    isUniqueStrings(type) &&
    type.every((entry) => JSON_SCHEMA_TYPES.has(entry as string)));

const acceptsType = (type: unknown, primitive: string) =>
  type === primitive ||
  (Array.isArray(type) && isSchemaType(type) && type.includes(primitive));

const acceptsObject = (type: unknown) => acceptsType(type, "object");

const SUB_SCHEMA_ANNOTATIONS = new Set([
  "$schema",
  "$id",
  "title",
  "description",
]);

/**
 * A field schema accepts a value of `primitive` only where nothing in it can
 * narrow past the type: an annotation carries no constraint, and an absent
 * `type` constrains nothing. Any other keyword — `const`, `enum`, `anyOf`,
 * `format` — can reject the value this seam sends, so it is not interpreted.
 */
const acceptsOnly = (schema: unknown, primitive: string) =>
  isPlainObject(schema) &&
  Object.entries(schema).every(([keyword, value]) =>
    keyword === "type"
      ? acceptsType(value, primitive)
      : SUB_SCHEMA_ANNOTATIONS.has(keyword) && isString(value),
  );

/**
 * Keywords of a sub-schema whose value shape a validator reads, each paired
 * with that shape: the same shapes the top-level schema is held to, plus
 * `properties` and `items`, which carry schemas, so a malformed one nested
 * under them is as uncompilable as a malformed one at the top. A keyword this
 * seam cannot judge is left alone: unlike the top-level schema, a field the
 * seam never sends needs only to be compilable, not permissive.
 */
const SUB_SCHEMA_SHAPES = new Map<string, (value: unknown) => boolean>([
  ["type", isSchemaType],
  ["required", isUniqueStrings],
  ...[...SUB_SCHEMA_ANNOTATIONS].map(
    (annotation) =>
      [annotation, isString] as [string, (value: unknown) => boolean],
  ),
  [
    "properties",
    (value) =>
      isPlainObject(value) &&
      Object.values(value).every((schema) => isWellFormedSubSchema(schema)),
  ],
  ["items", (value) => isWellFormedSubSchema(value)],
]);

/**
 * A schema the server cannot compile fails the run whatever payload follows, so
 * a field this seam never sends is still checked for the shape a validator
 * reads it as. A boolean is a schema in its own right.
 */
const isWellFormedSubSchema = (schema: unknown): boolean =>
  typeof schema === "boolean" ||
  (isPlainObject(schema) &&
    Object.entries(schema).every(([keyword, value]) => {
      const holds = SUB_SCHEMA_SHAPES.get(keyword);
      return holds === undefined || holds(value);
    }));

/**
 * AG-UI's own tool-approval schema declares the fields it expects under
 * `properties`, so a declaration is read where it cannot reject what the seam
 * sends: `approved` must accept a boolean and `reason` a string. A field the
 * seam never sends is unconstrained by `required` (which admits only
 * `approved`), so only its well-formedness as a sub-schema is checked — the
 * `editedArgs` of the spec's approve-with-edits shape is such a field.
 */
const acceptsSeamProperties = (properties: unknown) =>
  isPlainObject(properties) &&
  Object.entries(properties).every(([field, schema]) => {
    if (field === "approved") return acceptsOnly(schema, "boolean");
    if (field === "reason") return acceptsOnly(schema, "string");
    return isWellFormedSubSchema(schema);
  });

const acceptsSeamPayload = (required: unknown) =>
  Array.isArray(required) &&
  required.every((field) => field === "approved") &&
  new Set(required).size === required.length;

/**
 * Keywords that cannot reject a payload this seam emits, each paired with the
 * check that its value is the well-formed shape the keyword is read as. A
 * keyword whose value a validator would reject as an invalid schema is not
 * decided here, because a server that compiles the schema fails the run. An
 * unlisted keyword — `additionalProperties`, `allOf`, `$ref` — makes the gate
 * bespoke rather than being interpreted. The map is keyed by
 * `Map` rather than by object property, because a schema key of `constructor`
 * or `toString` would otherwise read an `Object.prototype` member as its
 * validator and `__proto__` would read the prototype itself.
 */
const SEAM_SAFE_KEYWORDS = new Map<string, (value: unknown) => boolean>([
  ["$schema", isString],
  ["$id", isString],
  ["title", isString],
  ["description", isString],
  ["type", acceptsObject],
  ["required", acceptsSeamPayload],
  ["properties", acceptsSeamProperties],
]);

/**
 * The seam sends `{ approved }` and may add `reason`, so it may answer a
 * `responseSchema` only where acceptance of those exact payloads is established
 * by construction. AG-UI answers a resume payload its schema rejects with
 * `RunError`, and the host can always build the exact payload through the
 * bespoke interrupt hooks, so an undecidable schema is left to them. Only an
 * absent schema and a plain object of well-formed allowed keywords establish
 * that: a boolean schema (`false` rejects every payload), a malformed one, and
 * a keyword whose value is not the shape it interprets are all left bespoke.
 */
const isSeamAnswerable = (schema: unknown) => {
  if (schema === undefined) return true;
  if (!isPlainObject(schema)) return false;
  return Object.entries(schema).every(([keyword, value]) => {
    const accepts = SEAM_SAFE_KEYWORDS.get(keyword);
    return accepts !== undefined && accepts(value);
  });
};

const isGate = (
  interrupt: AgUiInterrupt,
): interrupt is AgUiInterrupt & { toolCallId: string } =>
  interrupt.reason === "tool_call" &&
  !!interrupt.id &&
  !!interrupt.toolCallId &&
  // A restored interrupt is untyped, so `responseSchema` may hold any persisted
  // shape; a non-object schema received live arrives on the internal carrier.
  readRawResponseSchema(interrupt) === undefined &&
  isSeamAnswerable(interrupt.responseSchema);

const isPending = (approval: ToolCallMessagePart["approval"]) =>
  !!approval && approval.approved === undefined && !approval.resolution;

/**
 * AG-UI binds a decision to a tool call with `reason: "tool_call"`;
 * `confirmation` is a free-standing yes/no and `input_required` wants structured
 * input, so both stay on the bespoke interrupt hooks, as does a `tool_call`
 * whose `responseSchema` asks for more than this seam can send. A batch mixing a
 * gate with any other interrupt projects nothing: AG-UI resumes with one
 * response per open interrupt, so a half-owned batch cannot be completed from
 * either side alone.
 *
 * The same rule covers binding. A gate naming a tool call the message does not
 * render can never be decided through this seam, so the batch it belongs to
 * could never be completed either: the decisions taken on its visible siblings
 * would sit on the message while the run waited for a response that no click
 * can produce. `boundToolCallIds` spans every call the run produced — root or
 * nested on ToolCallMessagePart.messages — so only a gate naming a call the
 * message renders nowhere leaves the batch bespoke.
 */
export const projectAgUiToolApprovals = (
  interrupts: readonly AgUiInterrupt[] | undefined,
  boundToolCallIds?: ReadonlySet<string>,
): ReadonlyMap<string, ToolApproval> => {
  if (!interrupts?.length || !interrupts.every(isGate)) return EMPTY_APPROVALS;
  if (
    boundToolCallIds &&
    !interrupts.every((interrupt) => boundToolCallIds.has(interrupt.toolCallId))
  ) {
    return EMPTY_APPROVALS;
  }
  // Two gates naming one tool call would collapse into a single approval, so
  // the batch could never be completed: the surviving gate takes one decision
  // while the resume array still waits on the id that no part carries.
  const toolCallIds = interrupts.map((interrupt) => interrupt.toolCallId);
  if (new Set(toolCallIds).size !== toolCallIds.length) return EMPTY_APPROVALS;
  return new Map(
    interrupts.map((interrupt) => [interrupt.toolCallId, { id: interrupt.id }]),
  );
};

/**
 * Records a decision on the gated tool call. The decision is held on the part
 * until every gate in the batch is answered, because AG-UI resumes a run with
 * one response per open interrupt rather than one response per gate. A chosen
 * `optionId` is not recorded: the projection exposes an approval without
 * options, and core rejects an `optionId` absent from them, so no option can
 * reach this seam.
 */
export const withToolApprovalDecision = (
  content: readonly ThreadAssistantMessagePart[],
  { approvalId, approved, reason }: RespondToToolApprovalOptions,
): readonly ThreadAssistantMessagePart[] => {
  const { content: next, changed } = mapToolCallPartsDeep(content, (part) => {
    const approval = part.approval;
    if (approval?.id !== approvalId || !isPending(approval)) return part;
    return {
      ...part,
      approval: {
        ...approval,
        approved,
        ...(reason !== undefined && { reason }),
      },
    };
  });
  return changed ? next : content;
};

/**
 * Maps the recorded decisions onto AG-UI resume entries, or `null` while the
 * batch is incomplete. A denial is a resolved response carrying
 * `approved: false`, not a cancellation: `cancelled` means the user abandoned
 * the interrupt without meaningful input and carries no payload, which would
 * drop the denial reason on the wire.
 */
export const buildToolApprovalResume = (
  content: readonly ThreadAssistantMessagePart[],
  interrupts: readonly AgUiInterrupt[],
): AgUiResumeEntry[] | null => {
  const open = new Set(interrupts.map((interrupt) => interrupt.id));
  // Decisions accumulate in a `Map` rather than in an object literal, because an
  // interrupt id of `__proto__` would otherwise write to the prototype chain
  // instead of recording a response, and `constructor` or `toString` would
  // report themselves as answered while undecided.
  const responses = new Map<string, { status: "resolved"; payload: unknown }>();
  for (const part of iterateToolCallParts(content)) {
    const approval = part.approval;
    if (!approval || approval.approved === undefined) continue;
    if (!open.has(approval.id)) continue;
    responses.set(approval.id, {
      status: "resolved",
      payload: {
        approved: approval.approved,
        ...(approval.reason !== undefined && { reason: approval.reason }),
      },
    });
  }
  if (interrupts.some((interrupt) => !responses.has(interrupt.id))) return null;
  // The schema is dropped rather than cast: AG-UI's own interrupt type cannot
  // express a boolean schema, and `buildResumeArray` reads only the ids.
  return buildResumeArray(
    interrupts.map((interrupt) => {
      const { responseSchema: _schema, ...rest } =
        withoutRawResponseSchema(interrupt);
      return rest;
    }),
    Object.fromEntries(responses),
  );
};

const settle = (
  approval: ToolApproval,
  entry: AgUiResumeEntry,
): ToolApproval | undefined => {
  // A decision this gate recorded locally but never sent is dropped rather than
  // displayed beside the settlement it contradicts: a submitted entry carries
  // the whole outcome, so no field of an earlier one may survive it.
  const {
    approved: _approved,
    reason: _reason,
    resolution: _resolution,
    ...rest
  } = approval;
  if (entry.status === "cancelled") {
    return { ...rest, resolution: "cancelled" };
  }
  const payload = entry.payload;
  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof (payload as { approved?: unknown }).approved !== "boolean"
  ) {
    // The entry settles the gate with no decision. Nothing is fabricated, and a
    // decision recorded locally is dropped: the payload that went out carried
    // none, so displaying one would show what was never sent. The gate is still
    // marked terminal, because the interrupt it belonged to is closed and a
    // click on it afterwards would find nothing pending.
    return { ...rest, resolution: "cancelled" };
  }
  const { approved, reason } = payload as {
    approved: boolean;
    reason?: unknown;
  };
  return {
    ...rest,
    approved,
    ...(typeof reason === "string" && { reason }),
  };
};

/**
 * Settles every gate the submitted resume array names, so the displayed outcome
 * cannot contradict the wire. A decision recorded locally is not exempt: a gate
 * approved while the batch waited on its sibling is still cancelled when
 * `steerAway` submits a cancellation for it. A gate is shown as cancelled only
 * where its own entry is cancelled; a resolved entry supplies the decision it
 * carries, and one that carries none settles the gate with no decision rather
 * than fabricating one or keeping an unsent local decision beside it.
 *
 * A settlement always overrides an earlier one, in either direction. A resolved
 * settlement leaves no state a locally recorded decision does not also leave —
 * core's `resolution` covers only `cancelled` and `expired` — so honoring the
 * first settlement instead would mean treating an unsent local decision as
 * terminal, which is exactly what the cancellation case must override.
 */
export const withSettledToolApprovals = (
  content: readonly ThreadAssistantMessagePart[],
  resume: readonly AgUiResumeEntry[],
): readonly ThreadAssistantMessagePart[] => {
  if (resume.length === 0) return content;
  const byId = new Map(resume.map((entry) => [entry.interruptId, entry]));
  const { content: next, changed } = mapToolCallPartsDeep(content, (part) => {
    const approval = part.approval;
    if (!approval) return part;
    const entry = byId.get(approval.id);
    if (!entry) return part;
    const settled = settle(approval, entry);
    if (!settled) return part;
    return { ...part, approval: settled };
  });
  return changed ? next : content;
};
