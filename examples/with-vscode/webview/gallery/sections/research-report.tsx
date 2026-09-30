import {
  ResearchReport,
  type ReportSection,
} from "@assistant-ui/ui/components/assistant-ui/elements/research-report.tsx";
import { defineSections } from "../types";

const HEADINGS = [
  "What the webview can load",
  "Where it breaks",
  "Fixes",
  "Open questions",
] as const;

const PREVIEWS = [
  "Scripts and styles need the nonce; images may come from data:, blob: and https:.",
  "Libraries that inject <style> or compile WASM trip the strict policy.",
] as const;

const sectionsAt = (phase: number): ReportSection[] =>
  HEADINGS.map((heading, i) => ({
    id: heading,
    heading,
    state: i < phase ? "done" : i === phase ? "writing" : "pending",
    sources: i < phase ? 4 - i : 0,
    ...(i < phase && PREVIEWS[i] ? { preview: PREVIEWS[i] } : {}),
  }));

export default defineSections([
  {
    id: "research-report",
    title: "Research report",
    category: "content",
    notes: "Two sections done, one writing, one pending.",
    render: () => (
      <ResearchReport
        title="Webview CSP audit"
        sections={sectionsAt(2)}
        sourcesRead={15}
      />
    ),
  },
]);
