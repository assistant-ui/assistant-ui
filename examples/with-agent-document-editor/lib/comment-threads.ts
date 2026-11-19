type Reply = { id: string; replyTo: string | null };

/**
 * The thread each comment belongs to, by id. A reply can answer another
 * reply, so the thread is the comment at the top of the chain. A reply whose
 * parent is gone is a thread of its own, so that it can still be seen.
 */
export function threadIds(comments: readonly Reply[]): Map<string, string> {
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  return new Map(
    comments.map((comment) => {
      let top = comment;
      for (let hops = 0; top.replyTo && hops < comments.length; hops++) {
        const parent = byId.get(top.replyTo);
        if (!parent) break;
        top = parent;
      }
      return [comment.id, top.id];
    }),
  );
}
