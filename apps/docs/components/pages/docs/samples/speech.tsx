"use client";

import { ActionBarPrimitive, AuiIf } from "@assistant-ui/react";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { AudioLinesIcon, StopCircleIcon } from "lucide-react";
import { VoiceSampleThread } from "./voice-sample-thread";

export const SpeechSample = () => {
  return (
    <SampleFrame className="bg-muted/40 overflow-hidden">
      <VoiceSampleThread
        welcomeTitle="Hello there!"
        welcomeSubtitle="How can I help you today?"
        assistantActionBarActions={<SpeechActions />}
      />
    </SampleFrame>
  );
};

const SpeechActions = () => {
  return (
    <>
      <AuiIf condition={(s) => s.message.speech == null}>
        <ActionBarPrimitive.Speak asChild>
          <TooltipIconButton tooltip="Read aloud">
            <AudioLinesIcon />
          </TooltipIconButton>
        </ActionBarPrimitive.Speak>
      </AuiIf>
      <AuiIf condition={(s) => s.message.speech != null}>
        <ActionBarPrimitive.StopSpeaking asChild>
          <TooltipIconButton tooltip="Stop">
            <StopCircleIcon />
          </TooltipIconButton>
        </ActionBarPrimitive.StopSpeaking>
      </AuiIf>
    </>
  );
};
