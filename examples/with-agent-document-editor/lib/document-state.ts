import { z } from "zod";

export const BLOCK_TYPES = [
  "h1",
  "h2",
  "h3",
  "paragraph",
  "bullet",
  "numbered",
  "quote",
  "divider",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export const isBlockType = (value: unknown): value is BlockType =>
  BLOCK_TYPES.includes(value as BlockType);

export const blockSchema = z.object({
  id: z.string().describe("Stable block id. Keep it when you edit a block."),
  type: z
    .enum(BLOCK_TYPES)
    .describe(
      "h1, h2 and h3 are headings. bullet and numbered are one list item each; neighbouring items of the same type form one list. divider is a horizontal rule and its text is empty.",
    ),
  text: z
    .string()
    .describe(
      "The block's text. Inline formatting only: **bold**, *italic*, ~~strikethrough~~, `code`, [label](url), <u>underline</u> and <mark>highlight</mark>. Never block syntax such as #, - or >.",
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
  title: "Agent document editor",
  blocks: [
    { id: "b1", type: "h1", text: "Agent document editor" },
    {
      id: "b2",
      type: "paragraph",
      text: "This page is a document that you and an assistant edit together, and it is also its own guide. Everything here can be changed, so try each feature on the text that describes it.",
    },
    { id: "b3", type: "h2", text: "Write" },
    {
      id: "b4",
      type: "paragraph",
      text: "Type anywhere. The toolbar at the top sets **bold**, *italic*, <u>underline</u>, ~~strikethrough~~, `code`, <mark>highlight</mark> and [links](https://www.assistant-ui.com), and turns a line into a heading, a list or a quote.",
    },
    {
      id: "b5",
      type: "bullet",
      text: "Type `/` on a line to insert a heading, a list, a quote or a divider.",
    },
    {
      id: "b6",
      type: "bullet",
      text: "Highlight some text to get the same formatting in a toolbar beside it.",
    },
    { id: "b7", type: "h2", text: "Ask the assistant" },
    {
      id: "b8",
      type: "paragraph",
      text: "The chat is docked at the bottom of the page. Ask for a change in plain words and the assistant edits the document itself. A block shimmers while the assistant is rewriting it, then the new text is typed in over the old, with the newest words in blue.",
    },
    {
      id: "b9",
      type: "bullet",
      text: "Highlight a passage and choose **Ask AI** to give an instruction about that passage only.",
    },
    {
      id: "b10",
      type: "bullet",
      text: "Open **Rewrite** beside it for a one-click change: improve, fix spelling and grammar, shorten, lengthen or simplify.",
    },
    {
      id: "b11",
      type: "bullet",
      text: "Type `/` in the chat for ready-made requests.",
    },
    {
      id: "b26",
      type: "bullet",
      text: "Each edit leaves a line in the chat with **View changes** and **Undo**.",
    },
    {
      id: "b27",
      type: "bullet",
      text: "The **Chats** button starts a new chat and keeps the earlier ones.",
    },
    {
      id: "b12",
      type: "bullet",
      text: "**Hide chat** tucks the chat away when you want the whole page, and **Show chat** brings it back.",
    },
    { id: "b13", type: "h2", text: "Comment" },
    {
      id: "b14",
      type: "paragraph",
      text: "Highlight a passage and choose the comment button to leave a note on it. Commented text is marked in the page, and the **Comments** panel holds each thread, where you can reply, resolve or delete. The assistant comments too: ask it to review the document.",
    },
    { id: "b15", type: "h2", text: "Go back" },
    {
      id: "b16",
      type: "paragraph",
      text: "Every message you send and every edit the assistant makes is recorded as a version. Open **History** to see what each version changed and to restore one.",
    },
    {
      id: "b17",
      type: "quote",
      text: "History covers the current chat. The document and its comments are saved in this browser, and the chat starts fresh when you reload.",
    },
    { id: "b18", type: "h2", text: "Keys and models" },
    {
      id: "b19",
      type: "paragraph",
      text: "The assistant needs a model key. The round key button at the top right takes one for OpenAI, Anthropic or Google. Keys stay in this browser and go only to this app's own server. The model picker in the chat lists the models you have a key for.",
    },
    { id: "b20", type: "divider", text: "" },
    { id: "b21", type: "h2", text: "Try it" },
    {
      id: "b22",
      type: "numbered",
      text: "Highlight this sentence, open **Rewrite** and choose **Make shorter**.",
    },
    {
      id: "b23",
      type: "numbered",
      text: "Ask in the chat: *Add a two-sentence summary under the title.*",
    },
    {
      id: "b24",
      type: "numbered",
      text: "Ask: *Review this page and leave two comments.*",
    },
    {
      id: "b25",
      type: "numbered",
      text: "Open **History** and restore the first version.",
    },
  ],
};
