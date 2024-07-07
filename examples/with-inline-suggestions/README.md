# AI_button

This project is something I've been missing quite a lot. How do I engage user with AI chat with less friction?

So, I integrated LLM calls to auto-generate follow-up questions based on the latest conversation, displayed as clickable buttons.

![Demo](./app/demo.gif)

## Getting Started

First, add your OpenAI API key to `.env` file:

```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.
