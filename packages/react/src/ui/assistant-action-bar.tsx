"use client";

import { forwardRef, type FC } from "react";
import {
  AudioLinesIcon,
  CheckIcon,
  CopyIcon,
  RefreshCwIcon,
  StopCircleIcon,
} from "lucide-react";
import { ActionBarPrimitive, MessagePrimitive } from "../primitives";
import {
  TooltipIconButton,
  TooltipIconButtonProps,
} from "./base/tooltip-icon-button";
import { withDefaults } from "./utils/withDefaults";
import { useThreadConfig } from "./thread-config";
import { useThreadContext } from "../context";

const useAllowCopy = () => {
  const { assistantMessage: { allowCopy = true } = {} } = useThreadConfig();
  const { useThread } = useThreadContext();
  const copySupported = useThread((t) => t.capabilities.unstable_copy);
  return copySupported && allowCopy;
};

const useAllowSpeak = () => {
  const { assistantMessage: { allowSpeak = true } = {} } = useThreadConfig();
  const { useThread } = useThreadContext();
  const speakSupported = useThread((t) => t.capabilities.speak);
  return speakSupported && allowSpeak;
};

const useAllowReload = () => {
  const { assistantMessage: { allowReload = true } = {} } = useThreadConfig();
  const { useThread } = useThreadContext();
  const reloadSupported = useThread((t) => t.capabilities.reload);
  return reloadSupported && allowReload;
};

const AssistantActionBar: FC = () => {
  const allowCopy = useAllowCopy();
  const allowReload = useAllowReload();
  if (!allowCopy && !allowReload) return null;
  return (
    <AssistantActionBarRoot
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
    >
      <AssistantActionBarSpeechControl />
      <AssistantActionBarCopy />
      <AssistantActionBarReload />
    </AssistantActionBarRoot>
  );
};

AssistantActionBar.displayName = "AssistantActionBar";

const AssistantActionBarRoot = withDefaults(ActionBarPrimitive.Root, {
  className: "aui-assistant-action-bar-root",
});

AssistantActionBarRoot.displayName = "AssistantActionBarRoot";

const AssistantActionBarCopy = forwardRef<
  HTMLButtonElement,
  Partial<TooltipIconButtonProps>
>((props, ref) => {
  const {
    strings: {
      assistantMessage: { copy: { tooltip = "Copy" } = {} } = {},
    } = {},
  } = useThreadConfig();
  const allowCopy = useAllowCopy();
  if (!allowCopy) return null;
  return (
    <ActionBarPrimitive.Copy asChild>
      <TooltipIconButton tooltip={tooltip} {...props} ref={ref}>
        {props.children ?? (
          <>
            <MessagePrimitive.If copied>
              <CheckIcon />
            </MessagePrimitive.If>
            <MessagePrimitive.If copied={false}>
              <CopyIcon />
            </MessagePrimitive.If>
          </>
        )}
      </TooltipIconButton>
    </ActionBarPrimitive.Copy>
  );
});

AssistantActionBarCopy.displayName = "AssistantActionBarCopy";

const AssistantActionBarSpeechControl: FC = () => {
  return (
    <>
      <MessagePrimitive.If speaking={false}>
        <AssistantActionBarSpeak />
      </MessagePrimitive.If>
      <MessagePrimitive.If speaking>
        <AssistantActionBarStopSpeaking />
      </MessagePrimitive.If>
    </>
  );
};

const AssistantActionBarSpeak = forwardRef<
  HTMLButtonElement,
  Partial<TooltipIconButtonProps>
>((props, ref) => {
  const {
    strings: {
      assistantMessage: { speak: { tooltip = "Read aloud" } = {} } = {},
    } = {},
  } = useThreadConfig();
  const allowSpeak = useAllowSpeak();
  if (!allowSpeak) return null;
  return (
    <ActionBarPrimitive.Speak asChild>
      <TooltipIconButton tooltip={tooltip} {...props} ref={ref}>
        {props.children ?? <AudioLinesIcon />}
      </TooltipIconButton>
    </ActionBarPrimitive.Speak>
  );
});

AssistantActionBarSpeak.displayName = "AssistantActionBarSpeak";

const AssistantActionBarStopSpeaking = forwardRef<
  HTMLButtonElement,
  Partial<TooltipIconButtonProps>
>((props, ref) => {
  const {
    strings: {
      assistantMessage: {
        speak: { stop: { tooltip: stopTooltip = "Stop" } = {} } = {},
      } = {},
    } = {},
  } = useThreadConfig();
  const allowSpeak = useAllowSpeak();
  if (!allowSpeak) return null;
  return (
    <ActionBarPrimitive.StopSpeaking asChild>
      <TooltipIconButton tooltip={stopTooltip} {...props} ref={ref}>
        {props.children ?? <StopCircleIcon />}
      </TooltipIconButton>
    </ActionBarPrimitive.StopSpeaking>
  );
});

AssistantActionBarStopSpeaking.displayName = "AssistantActionBarStopSpeaking";

const AssistantActionBarReload = forwardRef<
  HTMLButtonElement,
  Partial<TooltipIconButtonProps>
>((props, ref) => {
  const {
    strings: {
      assistantMessage: { reload: { tooltip = "Refresh" } = {} } = {},
    } = {},
  } = useThreadConfig();
  const allowReload = useAllowReload();
  if (!allowReload) return null;
  return (
    <ActionBarPrimitive.Reload asChild>
      <TooltipIconButton tooltip={tooltip} {...props} ref={ref}>
        <RefreshCwIcon />
      </TooltipIconButton>
    </ActionBarPrimitive.Reload>
  );
});

AssistantActionBarReload.displayName = "AssistantActionBarReload";

const exports = {
  Root: AssistantActionBarRoot,
  Reload: AssistantActionBarReload,
  Copy: AssistantActionBarCopy,
  Speak: AssistantActionBarSpeak,
  StopSpeaking: AssistantActionBarStopSpeaking,
  SpeechControl: AssistantActionBarSpeechControl,
};

export default Object.assign(
  AssistantActionBar,
  exports,
) as typeof AssistantActionBar & typeof exports;
