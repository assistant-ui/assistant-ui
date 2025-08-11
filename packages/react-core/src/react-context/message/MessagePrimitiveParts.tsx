import { useMemo, memo, ComponentType } from "react";
import { ToolUIPart } from "../../client/types/message-types";
import { PartProvider } from "../part/PartProvider";
import { usePart } from "../part/usePart";
import { useMessage } from "./useMessage";
import { useAssistant } from "../assistant/useAssistant";

interface MessagePrimitivePartsProps {
  components: {
    Text?: ComponentType;
    ToolFallback?: ComponentType<ToolUIPart>;
  };
}

const ToolRenderer = ({ components }: MessagePrimitivePartsProps) => {
  const toolkit = useAssistant((a) => a.toolkit);
  const part = usePart() as ToolUIPart;

  const ToolUI = toolkit[part.type.slice(5)]?.render;
  if (!ToolUI) {
    if (!components.ToolFallback) return null;
    return <components.ToolFallback {...part} />;
  }

  return <ToolUI {...part} />;
};

const PartRenderer = ({ components }: MessagePrimitivePartsProps) => {
  const part = usePart();
  if (!part) return null;
  if (part.type === "text") {
    if (!components.Text) return null;
    return <components.Text />;
  }

  if (part.type.startsWith("tool-")) {
    return <ToolRenderer components={components} />;
  }

  throw new Error("Unsupported part type: " + part.type);
};

PartRenderer.displayName = "PartRenderer";

interface PartItemProps extends MessagePrimitivePartsProps {
  partIdx: number;
}

const PartItem = memo<PartItemProps>(({ partIdx, components }) => {
  return (
    <PartProvider partIdx={partIdx}>
      <PartRenderer components={components} />
    </PartProvider>
  );
});

PartItem.displayName = "PartItem";

export const MessagePrimitiveParts = ({
  components,
}: MessagePrimitivePartsProps) => {
  const partsLength = useMessage()?.parts.length ?? 0;
  const memoizedComponents = useMemo(() => components, [components.Text]);

  const partItems = useMemo(
    () =>
      Array.from({ length: partsLength }, (_, index) => (
        <PartItem key={index} partIdx={index} components={memoizedComponents} />
      )),
    [partsLength, memoizedComponents]
  );

  return <>{partItems}</>;
};

MessagePrimitiveParts.displayName = "MessagePrimitive.Parts";
