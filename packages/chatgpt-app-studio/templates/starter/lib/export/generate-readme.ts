import type { ExportConfig, ChatGPTAppManifest } from "./types";

export interface GenerateReadmeOptions {
  config: ExportConfig;
  manifest: ChatGPTAppManifest;
  files: string[];
}

export function generateReadme(options: GenerateReadmeOptions): string {
  const { manifest, files } = options;

  return `# ${manifest.name}

${manifest.description ? `${manifest.description}\n` : ""}
## Exported Files

${files.map((f) => `- \`${f}\``).join("\n")}

## Deployment

### Step 1: Host the Widget

Upload the \`widget/\` directory to a static hosting provider.

**Option A: Vercel (Recommended)**
\`\`\`bash
cd widget
npx vercel --prod
\`\`\`

**Option B: Netlify**
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag and drop the \`widget/\` folder
3. Copy your deployed URL

**Option C: Any Static Host**
Upload all files from \`widget/\` to your hosting provider.

### Step 2: Update the Manifest

Edit \`manifest.json\` and replace the placeholder URL with your deployed URL:

\`\`\`json
{
  "widget": {
    "url": "https://your-app.vercel.app/index.html"
  }
}
\`\`\`

### Step 3: Register with ChatGPT

1. Go to the **[ChatGPT Apps Dashboard](https://platform.openai.com/apps)**
2. Click **"Create New App"**
3. Upload your updated \`manifest.json\`
4. Follow the review process

## Verification Checklist

Before submitting your app, verify:

- [ ] Widget loads at your deployed URL (open in browser)
- [ ] \`manifest.json\` has the correct \`widget.url\`
- [ ] App name and description are set in the manifest
- [ ] Widget works in both light and dark themes
- [ ] Widget is responsive (test at different sizes)

## Troubleshooting

**Widget shows blank page**
- Check browser console for JavaScript errors
- Ensure all files were uploaded to the host
- Verify the URL in manifest.json matches exactly

**CORS errors**
- Your hosting provider may need CORS headers configured
- Vercel and Netlify handle this automatically

**Widget not loading in ChatGPT**
- Ensure widget.url uses HTTPS
- Check that manifest.json is valid JSON
- Verify the app is approved in the dashboard

## Development

To continue developing, run the workbench:

\`\`\`bash
npm run dev
\`\`\`

Then open \`http://localhost:3000\` to preview and test.

## Files Overview

| File | Description |
|------|-------------|
| \`widget/index.html\` | Main HTML entry point |
| \`widget/widget.js\` | Bundled JavaScript (React app) |
| \`widget/widget.css\` | Compiled Tailwind CSS |
| \`manifest.json\` | ChatGPT App configuration |

---

Generated with [ChatGPT App Studio](https://github.com/assistant-ui/chatgpt-app-studio)
`;
}
