import "./zod-jitless";
import { installLinkInterceptor } from "@assistant-ui/vscode/webview";
import { createRoot } from "react-dom/client";
import { Assistant } from "./assistant";

installLinkInterceptor();

const root = document.getElementById("root");
if (root) createRoot(root).render(<Assistant />);
