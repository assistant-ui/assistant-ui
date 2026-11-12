import { DOCS_URL } from "@/lib/config";

/** Leaves the setup page for assistant-ui.com; a setup the page leaves keeps running. */
export const leavePage = () => window.location.assign(DOCS_URL);
