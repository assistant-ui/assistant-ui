import {
  contactSalesEmail,
  parseContactSalesSubmission,
  sendContactSalesEmail,
} from "@/lib/contact-sales-email";
import { allowContactSalesEmail } from "@/lib/rate-limit";

/** Bodies past this size are not a real form. */
const MAX_BODY_BYTES = 16_000;

const json = (body: { ok: boolean; sent: boolean }, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

/**
 * Emails one contact-sales submission to the team. The form moves on to
 * cal.com whatever this answers, so it never blocks the visitor.
 */
export async function POST(req: Request) {
  const raw = await req.text().catch(() => "");
  if (raw.length === 0 || raw.length > MAX_BODY_BYTES)
    return json({ ok: false, sent: false }, 400);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, sent: false }, 400);
  }

  const submission = parseContactSalesSubmission(body);
  if (!submission) return json({ ok: false, sent: false }, 400);

  // A bot filled the hidden field. Answer like a success so it learns nothing.
  if (submission.website.trim() !== "") return json({ ok: true, sent: false });

  if (!(await allowContactSalesEmail(req))) {
    console.warn(
      JSON.stringify({ level: "warn", message: "contact_sales_rate_limited" }),
    );
    return json({ ok: false, sent: false }, 429);
  }

  const sent = await sendContactSalesEmail(
    contactSalesEmail(submission, new Date()),
    submission.values.email.trim(),
  );
  return json({ ok: true, sent });
}
