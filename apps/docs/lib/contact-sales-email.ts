import {
  BUILDING_MAX_LENGTH,
  EMPTY_CONTACT_SALES_VALUES,
  validateContactSales,
  type ContactSalesField,
  type ContactSalesValues,
} from "@/lib/contact-sales";

/** Longest value any one-line field may hold. */
export const CONTACT_SALES_FIELD_MAX_LENGTH = 200;
/** Longest page URL kept in the email. */
const PAGE_URL_MAX_LENGTH = 500;

export type ContactSalesSubmission = {
  values: ContactSalesValues;
  /** Hidden field people never see. Bots that fill it are dropped. */
  website: string;
  pageUrl: string;
};

const FIELDS = Object.keys(EMPTY_CONTACT_SALES_VALUES) as ContactSalesField[];

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

/**
 * Reads a request body into a submission, or null when it is malformed,
 * too long or fails the same checks the form runs.
 */
export function parseContactSalesSubmission(
  body: unknown,
): ContactSalesSubmission | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  const values = { ...EMPTY_CONTACT_SALES_VALUES };
  for (const field of FIELDS) {
    const value = asString(record[field]);
    const max =
      field === "building"
        ? BUILDING_MAX_LENGTH
        : CONTACT_SALES_FIELD_MAX_LENGTH;
    if (value.length > max) return null;
    values[field] = value;
  }
  if (Object.keys(validateContactSales(values)).length > 0) return null;
  return {
    values,
    website: asString(record.website),
    pageUrl: asString(record.pageUrl).slice(0, PAGE_URL_MAX_LENGTH),
  };
}

export type ContactSalesEmail = { subject: string; text: string };

/** The plain-text email one submission becomes. */
export function contactSalesEmail(
  { values, pageUrl }: ContactSalesSubmission,
  submittedAt: Date,
): ContactSalesEmail {
  const oneLine = (value: string) => value.trim().replace(/\s+/g, " ");
  const lines = [
    `Name: ${oneLine(values.firstName)} ${oneLine(values.lastName)}`,
    `Email: ${oneLine(values.email)}`,
    `Company: ${oneLine(values.company)}`,
    `Company size: ${values.companySize}`,
    `Role: ${values.role || "-"}`,
    `Heard about us: ${values.referral || "-"}`,
    `Page: ${pageUrl || "-"}`,
    `Submitted: ${submittedAt.toISOString()}`,
    "",
    "What are you building?",
    values.building.trim() || "-",
  ];
  return {
    subject: `Sales inquiry: ${oneLine(values.company)}`,
    text: lines.join("\n"),
  };
}

type CloudflareEmailResponse = {
  success?: boolean;
  errors?: { code?: string | number }[];
  result?: {
    delivered?: string[];
    queued?: string[];
    permanent_bounces?: string[];
  } | null;
};

/**
 * Mails one inquiry to `CONTACT_SALES_TO` through Cloudflare Email Service,
 * the sender every other assistant-ui notification uses. Never throws: a
 * failure is logged and reported as false.
 */
export async function sendContactSalesEmail(
  email: ContactSalesEmail,
  replyTo: string,
): Promise<boolean> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_EMAIL_API_TOKEN;
  const to = process.env.CONTACT_SALES_TO;
  let status: number | "none" = "none";
  let codes: (string | number)[] = [];

  try {
    if (!accountId || !token || !to) {
      codes = ["missing_configuration"];
    } else {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: {
              address: "noreply@mail.assistant-ui.com",
              name: "assistant-ui sales",
            },
            to,
            reply_to: replyTo,
            subject: email.subject,
            text: email.text,
          }),
          signal: AbortSignal.timeout(8_000),
        },
      );
      status = response.status;
      const body = (await response.json()) as CloudflareEmailResponse;
      const result = body?.result;
      if (
        response.ok &&
        body?.success === true &&
        result &&
        (result.permanent_bounces?.length ?? 0) === 0 &&
        (result.delivered?.length ?? 0) + (result.queued?.length ?? 0) > 0
      ) {
        console.info(
          JSON.stringify({
            level: "info",
            message: "contact_sales_email_sent",
          }),
        );
        return true;
      }
      codes = Array.isArray(body?.errors)
        ? body.errors.map((error) => error?.code ?? "unknown")
        : [];
      if (codes.length === 0) codes = ["delivery_unconfirmed"];
    }
  } catch {
    codes = ["request_failed"];
  }

  console.error(
    JSON.stringify({
      level: "error",
      message: "contact_sales_email_failed",
      status,
      codes,
    }),
  );
  return false;
}
