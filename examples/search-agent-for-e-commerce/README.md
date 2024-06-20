## Getting Started

1. Clone the repository:
   (((git clone https://github.com/Yonom/assistant-ui.git)))

2. Navigate to the project directory:
   (((cd assistant-ui/examples/search-agent-for-e-commerce)))

3. Create a `.env` file with the following variable:
   (((echo 'OPENAI_API_KEY="")))

4. Make the `start.sh` script executable:
   (((chmod +x start.sh)))

5. Start the servers:
   (((./start.sh)))

6. Open the dummy e-commerce website in your browser:
   [http://localhost:8080/dummy-ecommerce-website.html](http://localhost:8080/dummy-ecommerce-website.html)

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

This project uses:

- assistant-ui components
- shadcn components
- Vercel AI SDK
- [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.
