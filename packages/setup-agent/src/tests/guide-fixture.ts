import { GUIDE_PROTOCOL, GUIDE_TEXT_KEYS } from "../guide";
import type { Guide, GuideTextKey } from "../guide";

const PLACEHOLDERS: Partial<Record<GuideTextKey, string[]>> = {
  briefing: ["cmd", "url"],
  "stream.briefing": ["name", "cmd", "url", "browserUrl"],
  "stream.briefing-footer": ["browserUrl"],
  "stream.opened.input": ["prompt", "url", "wait"],
  "stream.opened.plan": ["url", "wait"],
  "stream.opened.finish": ["url"],
  "stream.ask.recently-opened": ["agoSeconds", "wait", "question"],
  "stream.ask.browser-closed": ["question"],
  "stream.ask.no-browser": ["page", "question"],
  "need.finish.question-preview": ["preview"],
  "need.product.add": ["product"],
};

/**
 * A guide whose every text is its key followed by its placeholders, such as
 * `[stream.ask.no-browser] {{page}} {{question}}`, so tests see what the CLI
 * filled in without depending on the server's wording.
 */
export const testGuide: Guide = {
  protocol: GUIDE_PROTOCOL,
  texts: Object.fromEntries(
    GUIDE_TEXT_KEYS.map((key) => [
      key,
      [`[${key}]`, ...(PLACEHOLDERS[key] ?? []).map((p) => `{{${p}}}`)].join(
        " ",
      ),
    ]),
  ) as Record<GuideTextKey, string>,
  intro: [
    { action: "announce-agent" },
    { action: "print", text: "briefing" },
    { action: "print", text: "intro.status-heading" },
    { action: "print-status" },
  ],
};
