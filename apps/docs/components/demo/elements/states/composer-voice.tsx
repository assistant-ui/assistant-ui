"use client";

import {
  Composer,
  ComposerActions,
  ComposerAttachButton,
  ComposerBar,
  ComposerInput,
  ComposerSend,
  ComposerToolbar,
  ComposerVoice,
  ComposerVoiceButton,
} from "@/components/assistant-ui/elements/composer";
import { defineStates } from "./types";

const noop = () => {};

function Dictation({
  voice,
  seconds = 0,
  value = "",
}: {
  voice: "idle" | "recording" | "transcribing";
  seconds?: number;
  value?: string;
}) {
  const active = voice !== "idle";
  return (
    <Composer>
      <ComposerBar>
        {active ? (
          <ComposerVoice recording={voice === "recording"} seconds={seconds} />
        ) : (
          <ComposerInput
            value={value}
            placeholder="Ask anything"
            onChange={noop}
            onSubmit={noop}
          />
        )}
        <ComposerToolbar>
          <ComposerActions>
            <ComposerAttachButton onClick={noop} />
          </ComposerActions>
          <ComposerActions>
            <ComposerVoiceButton active={active} onClick={noop} />
            <ComposerSend
              streaming={false}
              idle={value.length === 0}
              onClick={noop}
            />
          </ComposerActions>
        </ComposerToolbar>
      </ComposerBar>
    </Composer>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "recording",
    label: "Recording",
    note: "The mic is live, with a moving waveform and a timer.",
    Component: () => <Dictation voice="recording" seconds={14} />,
  },
  {
    key: "transcribing",
    label: "Transcribing",
    note: "Recording stopped and the audio is turning into text.",
    Component: () => <Dictation voice="transcribing" seconds={14} />,
  },
  {
    key: "success",
    label: "Transcribed",
    note: "The transcript landed in the input, ready to edit or send.",
    Component: () => (
      <Dictation voice="idle" value="Add a regression test for draft restore" />
    ),
  },
]);
