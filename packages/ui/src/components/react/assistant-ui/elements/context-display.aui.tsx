"use client";

import { useAuiState } from "@assistant-ui/react";
import { useThreadTokenUsage } from "@assistant-ui/ai-sdk";
import { type FC, type ReactNode } from "react";
import {
  ContextDisplayBar as ContextDisplayBarBase,
  ContextDisplayContent,
  ContextDisplayRing as ContextDisplayRingBase,
  ContextDisplayRoot as ContextDisplayRootBase,
  ContextDisplayText as ContextDisplayTextBase,
  ContextDisplayTrigger,
  type PresetProps,
  type TokenUsage,
} from "./context-display";

export type { TokenUsage } from "./context-display";

type ContextDisplayRootProps = {
  modelContextWindow: number;
  children: ReactNode;
  usage?: TokenUsage | undefined;
};

type WiredPresetProps = Omit<PresetProps, "resetKey">;

function ContextDisplayRootInternal({
  modelContextWindow,
  children,
}: {
  modelContextWindow: number;
  children: ReactNode;
}) {
  const usage = useThreadTokenUsage();
  const threadId = useAuiState((s) => s.threadListItem.id);
  return (
    <ContextDisplayRootBase
      modelContextWindow={modelContextWindow}
      usage={usage}
      resetKey={threadId}
    >
      {children}
    </ContextDisplayRootBase>
  );
}

function ContextDisplayRoot(props: ContextDisplayRootProps) {
  if (props.usage !== undefined) {
    return (
      <ContextDisplayRootBase
        modelContextWindow={props.modelContextWindow}
        usage={props.usage}
      >
        {props.children}
      </ContextDisplayRootBase>
    );
  }
  return (
    <ContextDisplayRootInternal modelContextWindow={props.modelContextWindow}>
      {props.children}
    </ContextDisplayRootInternal>
  );
}

function createWiredPreset(Preset: FC<PresetProps>): FC<WiredPresetProps> {
  const WiredPreset: FC<WiredPresetProps> = (props) => {
    const usage = useThreadTokenUsage();
    const threadId = useAuiState((s) => s.threadListItem.id);
    return <Preset {...props} usage={usage} resetKey={threadId} />;
  };
  return WiredPreset;
}

const WiredRing = createWiredPreset(ContextDisplayRingBase);
const WiredBar = createWiredPreset(ContextDisplayBarBase);
const WiredText = createWiredPreset(ContextDisplayTextBase);

const ContextDisplayRing: FC<WiredPresetProps> = ({ usage, ...rest }) =>
  usage !== undefined ? (
    <ContextDisplayRingBase usage={usage} {...rest} />
  ) : (
    <WiredRing {...rest} />
  );

const ContextDisplayBar: FC<WiredPresetProps> = ({ usage, ...rest }) =>
  usage !== undefined ? (
    <ContextDisplayBarBase usage={usage} {...rest} />
  ) : (
    <WiredBar {...rest} />
  );

const ContextDisplayText: FC<WiredPresetProps> = ({ usage, ...rest }) =>
  usage !== undefined ? (
    <ContextDisplayTextBase usage={usage} {...rest} />
  ) : (
    <WiredText {...rest} />
  );

const ContextDisplay = {} as {
  Root: typeof ContextDisplayRoot;
  Trigger: typeof ContextDisplayTrigger;
  Content: typeof ContextDisplayContent;
  Ring: typeof ContextDisplayRing;
  Bar: typeof ContextDisplayBar;
  Text: typeof ContextDisplayText;
};

ContextDisplay.Root = ContextDisplayRoot;
ContextDisplay.Trigger = ContextDisplayTrigger;
ContextDisplay.Content = ContextDisplayContent;
ContextDisplay.Ring = ContextDisplayRing;
ContextDisplay.Bar = ContextDisplayBar;
ContextDisplay.Text = ContextDisplayText;

export {
  ContextDisplay,
  ContextDisplayRoot,
  ContextDisplayTrigger,
  ContextDisplayContent,
  ContextDisplayRing,
  ContextDisplayBar,
  ContextDisplayText,
};
