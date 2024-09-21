## Project Overview

This project configures `assistant-ui` to work with Ollama hosted on a local instance. Additionally, it changes the theme to dark mode.

This source code was generated using the `Getting Started` guide hosted on [assistant-ui.com/docs](https://www.assistant-ui.com/docs).

```bash
npx assistant-ui@latest create my-app
cd my-app
```



## Prerequisites

Ensure you have the following installed:

- Node.js
- npm

## Installation

Clone the repository:

```bash
git clone https://github.com/yourusername/assistant-ui-local-ollama.git
cd assistant-ui-local-ollama
```

Install the dependencies:

```bash
npm install
```

## Configuration
Copy the `.env.local.example` file to `.env`:

Add `OLLAMA_API_URL` to the `.env` file:
```
OLLAMA_API_URL=http:/x.x.x.x:11434/api
```

## Running the Development Server

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Editing the Project

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Changing the Theme to Dark Mode

The theme has been set to dark mode by default. You can customize the theme by annotating html with the className `dark`.


## License

This project is licensed under the MIT License.
