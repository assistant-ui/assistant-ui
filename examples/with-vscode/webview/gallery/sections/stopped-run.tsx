import { StoppedRun } from "@assistant-ui/ui/components/assistant-ui/elements/stopped-run.tsx";
import { defineSections } from "../types";

const WORDS =
  "The composer reads the draft from the per-thread slot, so switching threads mid-edit no longer".split(
    " ",
  );

export default defineSections([
  {
    id: "stopped-run",
    title: "Stopped run",
    category: "chat",
    notes: "stopped-run.tsx (standalone): a reply cut off mid-sentence.",
    render: () => <StoppedRun words={WORDS} reason="stopped by you" />,
  },
]);
