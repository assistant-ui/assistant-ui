## CONTRIBUTING

A big welcome and thank you for considering contributing to assistant-ui! It’s people like you that make it a reality for users in our community.

You can contribute by opening an issue, or by making a pull request. For large pull requests, we ask that you open an issue first to discuss the changes before submitting a pull request.

### Setting up your environment

You need to have Node.js installed on your computer. We develop with the latest LTS version of Node.js.

Install the dependencies:

```sh
pnpm install
```

Make an initial build:

```sh
pnpm turbo build
```

(some packages rely on build outputs from other packages, even if you want to start the project in development mode)

### Running the project

To run the docs project in development mode: 

```sh
cd apps/docs
pnpm dev
```

To run the examples project in development mode: 

```sh
cd examples/<your-example>
pnpm dev
```
