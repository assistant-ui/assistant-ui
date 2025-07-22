"use client";

import {
  type ComponentType,
  type FC,
  memo,
  PropsWithChildren,
  useMemo,
} from "react";
import {
  TextMessagePartProvider,
  useMessagePart,
  useMessagePartRuntime,
  useToolUIs,
} from "../../context";
import {
  useMessage,
  useMessageRuntime,
} from "../../context/react/MessageContext";
import { MessagePartRuntimeProvider } from "../../context/providers/MessagePartRuntimeProvider";
import { MessagePartPrimitiveText } from "../messagePart/MessagePartText";
import { MessagePartPrimitiveImage } from "../messagePart/MessagePartImage";
import type {
  Unstable_AudioMessagePartComponent,
  EmptyMessagePartComponent,
  TextMessagePartComponent,
  ImageMessagePartComponent,
  SourceMessagePartComponent,
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
  FileMessagePartComponent,
  ReasoningMessagePartComponent,
} from "../../types/MessagePartComponentTypes";
import { MessagePartPrimitiveInProgress } from "../messagePart/MessagePartInProgress";
import { MessagePartStatus } from "../../types/AssistantTypes";

type MessagePartGroup = {
  parentId: string | undefined;
  indices: number[];
};

/**
 * Groups message parts by their parent ID.
 * Parts without a parent ID appear after grouped parts and remain ungrouped.
 * The position of groups is based on the first occurrence of each parent ID.
 */
const groupMessagePartsByParentId = (
  parts: readonly any[],
): MessagePartGroup[] => {
  const groups: MessagePartGroup[] = [];
  const parentIdToGroupIndex = new Map<string | undefined, number>();
  const processedIndices = new Set<number>();

  // First pass: process all parts with parent IDs
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const parentId = part?.parentId as string | undefined;

    if (parentId !== undefined) {
      let groupIndex = parentIdToGroupIndex.get(parentId);

      if (groupIndex === undefined) {
        // Create new group for this parent ID
        groupIndex = groups.length;
        groups.push({ parentId, indices: [] });
        parentIdToGroupIndex.set(parentId, groupIndex);
      }

      groups[groupIndex]!.indices.push(i);
      processedIndices.add(i);
    }
  }

  // Second pass: add ungrouped parts (those without parent ID)
  for (let i = 0; i < parts.length; i++) {
    if (!processedIndices.has(i)) {
      // Add individual group for parts without parent ID
      groups.push({ parentId: undefined, indices: [i] });
    }
  }

  return groups;
};

const useMessagePartsGroupedByParentId = (): MessagePartGroup[] => {
  const parts = useMessage((m) => m.content);

  return useMemo(() => {
    if (parts.length === 0) {
      return [];
    }
    return groupMessagePartsByParentId(parts);
  }, [parts]);
};

export namespace MessagePrimitiveUnstable_PartsGroupedByParentId {
  export type Props = {
    /**
     * Component configuration for rendering different types of message content.
     *
     * You can provide custom components for each content type (text, image, file, etc.)
     * and configure tool rendering behavior. If not provided, default components will be used.
     */
    components?:
      | {
          /** Component for rendering empty messages */
          Empty?: EmptyMessagePartComponent | undefined;
          /** Component for rendering text content */
          Text?: TextMessagePartComponent | undefined;
          /** Component for rendering reasoning content (typically hidden) */
          Reasoning?: ReasoningMessagePartComponent | undefined;
          /** Component for rendering source content */
          Source?: SourceMessagePartComponent | undefined;
          /** Component for rendering image content */
          Image?: ImageMessagePartComponent | undefined;
          /** Component for rendering file content */
          File?: FileMessagePartComponent | undefined;
          /** Component for rendering audio content (experimental) */
          Unstable_Audio?: Unstable_AudioMessagePartComponent | undefined;
          /** Configuration for tool call rendering */
          tools?:
            | {
                /** Map of tool names to their specific components */
                by_name?:
                  | Record<string, ToolCallMessagePartComponent | undefined>
                  | undefined;
                /** Fallback component for unregistered tools */
                Fallback?: ComponentType<ToolCallMessagePartProps> | undefined;
              }
            | {
                /** Override component that handles all tool calls */
                Override: ComponentType<ToolCallMessagePartProps>;
              }
            | undefined;

          /**
           * Component for rendering grouped message parts with the same parent ID.
           *
           * When provided, this component will automatically wrap message parts that share
           * the same parent ID, allowing you to create collapsible sections, custom styling,
           * or other grouped presentations.
           *
           * The component receives:
           * - `parentId`: The parent ID shared by all parts in the group (or undefined for ungrouped parts)
           * - `indices`: Array of indices for the parts in this group
           * - `children`: The rendered message part components
           *
           * @example
           * ```tsx
           * // Collapsible parent ID group
           * Group: ({ parentId, indices, children }) => {
           *   if (!parentId) return <>{children}</>;
           *   return (
           *     <details className="parent-group">
           *       <summary>
           *         Group {parentId} ({indices.length} parts)
           *       </summary>
           *       <div className="parent-group-content">
           *         {children}
           *       </div>
           *     </details>
           *   );
           * }
           * ```
           *
           * @example
           * ```tsx
           * // Custom styled parent ID group
           * Group: ({ parentId, indices, children }) => {
           *   if (!parentId) return <>{children}</>;
           *   return (
           *     <div className="border rounded-lg p-4 my-2">
           *       <div className="text-sm text-gray-600 mb-2">
           *         Related content ({parentId})
           *       </div>
           *       <div className="space-y-2">
           *         {children}
           *       </div>
           *     </div>
           *   );
           * }
           * ```
           *
           * @param parentId - The parent ID shared by all parts in this group (undefined for ungrouped parts)
           * @param indices - Array of indices for the parts in this group
           * @param children - Rendered message part components to display within the group
           */
          Group?: ComponentType<
            PropsWithChildren<{
              parentId: string | undefined;
              indices: number[];
            }>
          >;
        }
      | undefined;
  };
}

const ToolUIDisplay = ({
  Fallback,
  ...props
}: {
  Fallback: ToolCallMessagePartComponent | undefined;
} & ToolCallMessagePartProps) => {
  const Render = useToolUIs((s) => s.getToolUI(props.toolName)) ?? Fallback;
  if (!Render) return null;
  return <Render {...props} />;
};

const defaultComponents = {
  Text: () => (
    <p style={{ whiteSpace: "pre-line" }}>
      <MessagePartPrimitiveText />
      <MessagePartPrimitiveInProgress>
        <span style={{ fontFamily: "revert" }}>{" \u25CF"}</span>
      </MessagePartPrimitiveInProgress>
    </p>
  ),
  Reasoning: () => null,
  Source: () => null,
  Image: () => <MessagePartPrimitiveImage />,
  File: () => null,
  Unstable_Audio: () => null,
  Group: ({ children }) => children,
} satisfies MessagePrimitiveUnstable_PartsGroupedByParentId.Props["components"];

type MessagePartComponentProps = {
  components: MessagePrimitiveUnstable_PartsGroupedByParentId.Props["components"];
};

const MessagePartComponent: FC<MessagePartComponentProps> = ({
  components: {
    Text = defaultComponents.Text,
    Reasoning = defaultComponents.Reasoning,
    Image = defaultComponents.Image,
    Source = defaultComponents.Source,
    File = defaultComponents.File,
    Unstable_Audio: Audio = defaultComponents.Unstable_Audio,
    tools = {},
  } = {},
}) => {
  const MessagePartRuntime = useMessagePartRuntime();

  const part = useMessagePart();

  const type = part.type;
  if (type === "tool-call") {
    const addResult = (result: any) => MessagePartRuntime.addToolResult(result);
    if ("Override" in tools)
      return <tools.Override {...part} addResult={addResult} />;
    const Tool = tools.by_name?.[part.toolName] ?? tools.Fallback;
    return <ToolUIDisplay {...part} Fallback={Tool} addResult={addResult} />;
  }

  if (part.status.type === "requires-action")
    throw new Error("Encountered unexpected requires-action status");

  switch (type) {
    case "text":
      return <Text {...part} />;

    case "reasoning":
      return <Reasoning {...part} />;

    case "source":
      return <Source {...part} />;

    case "image":
      // eslint-disable-next-line jsx-a11y/alt-text
      return <Image {...part} />;

    case "file":
      return <File {...part} />;

    case "audio":
      return <Audio {...part} />;

    default:
      const unhandledType: never = type;
      throw new Error(`Unknown message part type: ${unhandledType}`);
  }
};

type MessagePartProps = {
  partIndex: number;
  components: MessagePrimitiveUnstable_PartsGroupedByParentId.Props["components"];
};

const MessagePartImpl: FC<MessagePartProps> = ({ partIndex, components }) => {
  const messageRuntime = useMessageRuntime();
  const runtime = useMemo(
    () => messageRuntime.getMessagePartByIndex(partIndex),
    [messageRuntime, partIndex],
  );

  return (
    <MessagePartRuntimeProvider runtime={runtime}>
      <MessagePartComponent components={components} />
    </MessagePartRuntimeProvider>
  );
};

const MessagePart = memo(
  MessagePartImpl,
  (prev, next) =>
    prev.partIndex === next.partIndex &&
    prev.components?.Text === next.components?.Text &&
    prev.components?.Reasoning === next.components?.Reasoning &&
    prev.components?.Source === next.components?.Source &&
    prev.components?.Image === next.components?.Image &&
    prev.components?.File === next.components?.File &&
    prev.components?.Unstable_Audio === next.components?.Unstable_Audio &&
    prev.components?.tools === next.components?.tools &&
    prev.components?.Group === next.components?.Group,
);

const COMPLETE_STATUS: MessagePartStatus = Object.freeze({
  type: "complete",
});

const EmptyPartFallback: FC<{
  status: MessagePartStatus;
  component: TextMessagePartComponent;
}> = ({ status, component: Component }) => {
  return (
    <TextMessagePartProvider text="" isRunning={status.type === "running"}>
      <Component type="text" text="" status={status} />
    </TextMessagePartProvider>
  );
};

const EmptyPartsImpl: FC<MessagePartComponentProps> = ({ components }) => {
  const status =
    useMessage((s) => s.status as MessagePartStatus) ?? COMPLETE_STATUS;

  if (components?.Empty) return <components.Empty status={status} />;

  return (
    <EmptyPartFallback
      status={status}
      component={components?.Text ?? defaultComponents.Text}
    />
  );
};

const EmptyParts = memo(
  EmptyPartsImpl,
  (prev, next) =>
    prev.components?.Empty === next.components?.Empty &&
    prev.components?.Text === next.components?.Text,
);

/**
 * Renders the parts of a message grouped by their parent ID.
 *
 * This component automatically groups message parts that share the same parent ID,
 * allowing you to create hierarchical or related content presentations. Parts without
 * a parent ID appear after grouped parts and remain ungrouped.
 *
 * @example
 * ```tsx
 * <MessagePrimitive.Unstable_PartsGroupedByParentId
 *   components={{
 *     Text: ({ text }) => <p className="message-text">{text}</p>,
 *     Image: ({ image }) => <img src={image} alt="Message image" />,
 *     Group: ({ parentId, indices, children }) => {
 *       if (!parentId) return <>{children}</>;
 *       return (
 *         <div className="parent-group border rounded p-4">
 *           <h4>Related Content</h4>
 *           {children}
 *         </div>
 *       );
 *     }
 *   }}
 * />
 * ```
 */
export const MessagePrimitiveUnstable_PartsGroupedByParentId: FC<
  MessagePrimitiveUnstable_PartsGroupedByParentId.Props
> = ({ components }) => {
  const contentLength = useMessage((s) => s.content.length);
  const messageGroups = useMessagePartsGroupedByParentId();

  const partsElements = useMemo(() => {
    if (contentLength === 0) {
      return <EmptyParts components={components} />;
    }

    return messageGroups.map((group, groupIndex) => {
      const GroupComponent = components?.Group ?? defaultComponents.Group;

      return (
        <GroupComponent
          key={`group-${groupIndex}-${group.parentId ?? "ungrouped"}`}
          parentId={group.parentId}
          indices={group.indices}
        >
          {group.indices.map((partIndex) => (
            <MessagePart
              key={partIndex}
              partIndex={partIndex}
              components={components}
            />
          ))}
        </GroupComponent>
      );
    });
  }, [messageGroups, components, contentLength]);

  return <>{partsElements}</>;
};

MessagePrimitiveUnstable_PartsGroupedByParentId.displayName =
  "MessagePrimitive.Unstable_PartsGroupedByParentId";
