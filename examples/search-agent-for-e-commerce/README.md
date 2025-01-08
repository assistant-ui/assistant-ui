## Getting Started

1. Clone the repository:

```sh
git clone https://github.com/assistant-ui/assistant-ui.git
```

2. Navigate to the project directory:

```sh
cd assistant-ui/examples/search-agent-for-e-commerce
```

3. Create a `.env` file with the following variable:

```sh
OPENAI_API_KEY="skXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

4. Make the `start.sh` script executable:

```sh
chmod +x start.sh
```

5. Start the servers:

```sh
./start.sh
```

6. Open the dummy e-commerce website in your browser:
   [http://localhost:8080/dummy-ecommerce-website.html](http://localhost:8080/dummy-ecommerce-website.html)

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

This project uses:

- assistant-ui components
- shadcn components
- Vercel AI SDK
