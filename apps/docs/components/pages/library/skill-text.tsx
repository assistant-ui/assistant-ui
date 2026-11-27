import { Fragment } from "react";

/** Skill prose, with each backtick-quoted span set in mono. */
export function SkillText({ text }: { text: string }) {
  return text.split("`").map((part, index) =>
    index % 2 === 1 ? (
      <span
        key={index}
        className="font-mono text-[0.92em] [font-variant-ligatures:none]"
      >
        {part}
      </span>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

/** Skill prose as one plain string, for a search index or a title attribute. */
export const plainSkillText = (text: string) => text.replaceAll("`", "");
