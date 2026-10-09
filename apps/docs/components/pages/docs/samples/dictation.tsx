"use client";

import { AuiIf, ComposerPrimitive } from "@assistant-ui/react";
import { SampleFrame } from "./sample-frame";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { MicIcon, Square } from "lucide-react";
import { VoiceSampleThread } from "./voice-sample-thread";

export const DictationSample = () => {
  return (
    <SampleFrame className="bg-muted/40 overflow-hidden">
      <VoiceSampleThread
        welcomeTitle="Voice Input Demo"
        welcomeSubtitle="Click the mic button to speak"
        composerActions={<DictationActions />}
      />
    </SampleFrame>
  );
};

const DictationActions = () => {
  return (
    <>
      <AuiIf condition={(s) => s.composer.dictation == null}>
        <ComposerPrimitive.Dictate asChild>
          <TooltipIconButton
            tooltip="Voice input"
            side="top"
            variant="ghost"
            className="aui-composer-dictate size-[34px] rounded-full p-1"
            aria-label="Start voice input"
          >
            <MicIcon className="size-5" />
          </TooltipIconButton>
        </ComposerPrimitive.Dictate>
      </AuiIf>

      <AuiIf condition={(s) => s.composer.dictation != null}>
        <ComposerPrimitive.StopDictation asChild>
          <TooltipIconButton
            tooltip="Stop dictation"
            side="top"
            variant="default"
            className="aui-composer-stop-dictation size-[34px] rounded-full p-1"
            aria-label="Stop voice input"
          >
            <Square className="size-4 animate-pulse fill-current" />
          </TooltipIconButton>
        </ComposerPrimitive.StopDictation>
      </AuiIf>
    </>
  );
};
