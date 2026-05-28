# Remote Docs

Use this reference to read up on assistant-ui docs, or when the user asks for latest assistant-ui guidance.


## Preferred Sources

Start with the AI-readable docs index:

```text
https://www.assistant-ui.com/llms.txt
```


Then for raw page content, assistant-ui docs pages can be read as markdown by using the `.mdx` form .

## Exploration Pattern

Follow this order:

```text
Read llms.txt, discover available docs sections -> read the relevant page -> inspect source/project -> plan -> implement
```

Do not guess docs URLs. Start from the index.

## High-Value Sections

Common starting points:

```text
/docs/architecture
/docs/cli
/docs/docs
/docs/runtimes/
/docs/guides/
```

Use the docs structure in llms.txt to find the exact page for the task instead of relying on memory.

## Example: Looking up a thread component 

### 1. Check main documentation index

```
WebFetch({
  url: "https://www.assistant-ui.com/llms.txt",
  prompt: "Where can I find documentation about thread component?"
})
```
Or just fetch the whole llms.txt

This will point you to the thread components reference section.

### 2. Fetch specific method documentation

```
https://www.assistant-ui.com/docs/ui/thread.mdx
```

### 3. Use WebFetch tool or read the whole url data

```
WebFetch({
  url: "https://www.assistant-ui.com/docs/ui/thread.mdx",
  prompt: "How can use the thread components"
})
```

Or just fetch the whole mdx file using the url
