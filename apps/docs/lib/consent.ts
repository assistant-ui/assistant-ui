export const CONSENT_STORAGE_KEY = "aui-consent";
export const CONSENT_CHANGE_EVENT = "aui-consent-change";
export const CONSENT_REOPEN_EVENT = "aui-consent-reopen";

export type ConsentChoice = "granted" | "denied";

// localStorage writes throw in private modes and wherever site data is blocked.
// The choice still has to hold for the rest of the page, and it outranks anything
// persisted, or a decline that failed to write loses to the older stored value.
let memoryConsent: ConsentChoice | null = null;

export function getStoredConsent(): ConsentChoice | null {
  if (memoryConsent !== null) return memoryConsent;
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (value === "granted" || value === "denied") return value;
  } catch {}
  return null;
}

export function setStoredConsent(choice: ConsentChoice): void {
  memoryConsent = choice;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {}
  window.dispatchEvent(
    new CustomEvent<ConsentChoice>(CONSENT_CHANGE_EVENT, { detail: choice }),
  );
}

export function reopenConsentBanner(): void {
  window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT));
}

export function subscribeToConsent(
  listener: (choice: ConsentChoice) => void,
): () => void {
  const onChange = (event: Event) =>
    listener((event as CustomEvent<ConsentChoice>).detail);

  // A CustomEvent never leaves its own document, so the storage event is the
  // only thing that carries a choice made in another tab.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== CONSENT_STORAGE_KEY) return;
    if (event.newValue !== "granted" && event.newValue !== "denied") return;
    memoryConsent = event.newValue;
    listener(event.newValue);
  };

  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function hasGlobalPrivacyControl(): boolean {
  return (
    typeof navigator !== "undefined" &&
    (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl ===
      true
  );
}

let consentRequiredPromise: Promise<boolean> | undefined;

export function isConsentRequired(): Promise<boolean> {
  consentRequiredPromise ??= fetch("/api/consent")
    .then((res): Promise<{ required?: boolean }> =>
      res.ok ? res.json() : Promise.resolve({}),
    )
    .then((data) => data.required !== false)
    .catch(() => true);
  return consentRequiredPromise;
}
