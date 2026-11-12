/** The page every "Talk to an expert" and "Contact sales" link opens. */
export const CONTACT_SALES_PATH = "/contact-sales";

/** The cal.com event the form hands off to. Its booking form has name, email and notes. */
export const SALES_BOOKING_URL = "https://cal.com/simon-farshid/assistant-ui";

export const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-1,000",
  "1,001-5,000",
  "5,000+",
] as const;

export const ROLES = [
  "Engineer",
  "Engineering lead",
  "Product",
  "Design",
  "Founder or executive",
  "Other",
] as const;

export const REFERRAL_SOURCES = [
  "Search",
  "AI assistant",
  "GitHub",
  "X or LinkedIn",
  "Friend or colleague",
  "Event or podcast",
  "Other",
] as const;

export const BUILDING_MAX_LENGTH = 1000;

export type ContactSalesValues = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  companySize: string;
  role: string;
  building: string;
  referral: string;
};

export type ContactSalesField = keyof ContactSalesValues;

export type ContactSalesErrors = Partial<Record<ContactSalesField, string>>;

export const EMPTY_CONTACT_SALES_VALUES: ContactSalesValues = {
  firstName: "",
  lastName: "",
  email: "",
  company: "",
  companySize: "",
  role: "",
  building: "",
  referral: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "gmx.de",
  "web.de",
  "mail.com",
  "yandex.com",
  "yandex.ru",
  "qq.com",
  "163.com",
  "126.com",
  "zoho.com",
  "hey.com",
  "fastmail.com",
  "tutanota.com",
]);

/** True when the address is on a free mail provider rather than a company domain. */
export function isPersonalEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1];
  return domain !== undefined && PERSONAL_EMAIL_DOMAINS.has(domain);
}

export function validateContactSales(
  values: ContactSalesValues,
): ContactSalesErrors {
  const errors: ContactSalesErrors = {};
  if (!values.firstName.trim()) errors.firstName = "Enter your first name.";
  if (!values.lastName.trim()) errors.lastName = "Enter your last name.";
  if (!values.email.trim()) errors.email = "Enter your work email.";
  else if (!EMAIL_PATTERN.test(values.email.trim()))
    errors.email = "Enter an email like name@company.com.";
  if (!values.company.trim()) errors.company = "Enter your company name.";
  if (!values.companySize) errors.companySize = "Choose a company size.";
  if (values.building.length > BUILDING_MAX_LENGTH)
    errors.building = `Keep it under ${BUILDING_MAX_LENGTH} characters.`;
  return errors;
}

/** The text that lands in the booking's notes field, one answer per line. */
export function contactSalesNotes(values: ContactSalesValues): string {
  const lines = [
    `Company: ${values.company.trim()}`,
    `Company size: ${values.companySize}`,
  ];
  if (values.role) lines.push(`Role: ${values.role}`);
  if (values.referral) lines.push(`Heard about us: ${values.referral}`);
  if (values.building.trim())
    lines.push("", "What are you building?", values.building.trim());
  return lines.join("\n");
}

/** The cal.com booking link with name, email and notes prefilled. */
export function buildSalesBookingUrl(values: ContactSalesValues): string {
  const url = new URL(SALES_BOOKING_URL);
  url.searchParams.set(
    "name",
    `${values.firstName.trim()} ${values.lastName.trim()}`,
  );
  url.searchParams.set("email", values.email.trim());
  url.searchParams.set("notes", contactSalesNotes(values));
  return url.toString();
}
