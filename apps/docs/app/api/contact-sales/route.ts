import {
  contactSalesEmail,
  parseContactSalesSubmission,
  sendContactSalesEmail,
} from "@/lib/contact-sales-email";
import { checkContactSalesRateLimit } from "@/lib/rate-limit";

/** Bodies past this many bytes are not a real form. */
const MAX_BODY_BYTES = 16_000;

const json = (
  body: { ok: boolean; sent: boolean },
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", ...headers },
  });

/** Reads the body as text, or null once it passes `MAX_BODY_BYTES`. */
async function readBoundedText(req: Request): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Emails one contact-sales submission to the team. The form moves on to
 * cal.com whatever this answers, so it never blocks the visitor.
 */
export async function POST(req: Request) {
  // Only the form's JSON post gets through, which keeps out cross-origin
  // simple requests (form posts and text/plain) that skip CORS preflight.
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json"))
    return json({ ok: false, sent: false }, 415);

  const raw = await readBoundedText(req).catch(() => null);
  if (!raw) return json({ ok: false, sent: false }, 400);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, sent: false }, 400);
  }

  const submission = parseContactSalesSubmission(body);
  if (!submission) return json({ ok: false, sent: false }, 400);

  // A bot filled the hidden field. Answer exactly like a sent email.
  if (submission.website.trim() !== "") return json({ ok: true, sent: true });

  const limited = await checkContactSalesRateLimit(req);
  if (limited) {
    if (limited.status === 429)
      console.warn(
        JSON.stringify({
          level: "warn",
          message: "contact_sales_rate_limited",
        }),
      );
    const retryAfter = limited.headers.get("Retry-After");
    return json(
      { ok: false, sent: false },
      limited.status,
      retryAfter ? { "Retry-After": retryAfter } : {},
    );
  }

  const sent = await sendContactSalesEmail(
    contactSalesEmail(submission, new Date()),
    submission.values.email.trim(),
  );
  return json({ ok: true, sent });
}
