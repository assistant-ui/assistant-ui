import { z } from "zod";

export const BLOCK_TYPES = [
  "h1",
  "h2",
  "h3",
  "paragraph",
  "bullet",
  "numbered",
  "quote",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export const isBlockType = (value: unknown): value is BlockType =>
  BLOCK_TYPES.includes(value as BlockType);

export const blockSchema = z.object({
  id: z.string().describe("Stable block id. Keep it when you edit a block."),
  type: z
    .enum(BLOCK_TYPES)
    .describe(
      "h1, h2 and h3 are headings. bullet and numbered are one list item each; neighbouring items of the same type form one list.",
    ),
  text: z
    .string()
    .describe(
      "The block's text. Inline markdown only: **bold**, *italic*, `code`, [label](url). Never block syntax such as #, - or >.",
    ),
});

export type Block = z.infer<typeof blockSchema>;

export const documentSchema = z.object({
  title: z.string().describe("The document's title."),
  blocks: z.array(blockSchema),
});

export type DocumentState = z.infer<typeof documentSchema>;

export function countChanges(before: DocumentState, after: DocumentState) {
  const previous = new Map(before.blocks.map((block) => [block.id, block]));
  const kept = new Set(after.blocks.map((block) => block.id));
  let edited = 0;
  let added = 0;
  for (const block of after.blocks) {
    const old = previous.get(block.id);
    if (!old) added++;
    else if (old.text !== block.text || old.type !== block.type) edited++;
  }
  return {
    edited,
    added,
    removed: before.blocks.filter((block) => !kept.has(block.id)).length,
    renamed: before.title !== after.title,
  };
}

export const DOCUMENT_NAME = "document";
export const DOCUMENT_ID = "document";

export const documentDescription = [
  "The rich text document open in the user's editor, as a title and an ordered list of blocks.",
  "Edit it with update_document and change only what was asked for.",
  "blocks.update takes [{ id, text }] or [{ id, type }] and rewrites those blocks in place; prefer it for any change to existing text.",
  "blocks.add appends new blocks at the end. blocks.remove takes block ids.",
  "blocks.set replaces the whole list and is the only way to insert a block between others or to reorder: repeat every block you keep with its id, and give each new block a new unique id.",
  "Edits appear in the editor as you write them, so do not repeat the new text in your reply.",
].join(" ");

export const commentSchema = z.object({
  id: z.string(),
  blockId: z.string().describe("Id of the block the comment is attached to."),
  quote: z
    .string()
    .describe(
      "The exact passage inside that block the comment is about, copied character for character without markdown markers. Keep it short.",
    ),
  author: z.enum(["user", "assistant"]),
  text: z.string().describe("The comment itself, in plain text."),
  resolved: z.boolean(),
  replyTo: z
    .string()
    .nullable()
    .describe("Id of the comment this one replies to, or null to start one."),
});

export type DocumentComment = z.infer<typeof commentSchema>;

export const commentsSchema = z.object({
  comments: z.array(commentSchema),
});

export type CommentsState = z.infer<typeof commentsSchema>;

export const COMMENTS_NAME = "comments";
export const COMMENTS_ID = "comments";

export const commentsDescription = [
  "Comments attached to passages of the document, shown in a panel beside it.",
  "Use update_comments to leave feedback without changing the text.",
  'comments.add takes [{ blockId, quote, author: "assistant", text, resolved: false, replyTo: null }]; set replyTo to a comment id to answer it.',
  "comments.update takes [{ id, resolved: true }] to resolve a comment once it is dealt with. Never edit or remove the user's comments.",
].join(" ");

export const initialComments: CommentsState = { comments: [] };

export const initialDocument: DocumentState = {
  title: "Launch plan",
  blocks: [
    { id: "b1", type: "h1", text: "Launch plan" },
    {
      id: "b2",
      type: "paragraph",
      text: "We ship the beta to design partners on the 3rd and open the waitlist a week later. This page is the single place where the plan lives, so edit it freely.",
    },
    { id: "b3", type: "h2", text: "Timeline" },
    {
      id: "b4",
      type: "bullet",
      text: "**Week 1:** private beta with twelve design partners",
    },
    {
      id: "b5",
      type: "bullet",
      text: "**Week 2:** waitlist opens and the docs go public",
    },
    {
      id: "b6",
      type: "bullet",
      text: "**Week 4:** general availability, announced on the blog",
    },
    { id: "b7", type: "h2", text: "Pricing" },
    {
      id: "b8",
      type: "paragraph",
      text: "Pricing stays flat for the first quarter. After that we move every team to usage based billing with a generous free tier, and anyone on an annual plan keeps their rate until renewal.",
    },
    { id: "b9", type: "h2", text: "Risks" },
    {
      id: "b10",
      type: "paragraph",
      text: "The main risk is support load during the first week, so two engineers stay on call. We also have not load tested the import flow past *ten thousand* rows.",
    },
  ],
};
