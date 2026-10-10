# setup-agent

## 0.0.4

### Patch Changes

- [#8730](https://github.com/assistant-ui/assistant-ui/pull/8730) [`8199e65`](https://github.com/assistant-ui/assistant-ui/commit/8199e6533d23b1cb78d66a83d5ada03c6aa3e988) - fix(setup-agent): keep a finished setup done when a late cancel arrives, create `.env.local` owner-only and open it before taking the one-time key, stop counting acknowledged follow-ups, refuse duplicate or `:`-containing option ids, restrict an existing `.env.local` to its owner, lock a preset to `--only` even with `--choices`, refuse duplicate variant ids, and dispose a client whose first connection fails ([@Yonom](https://github.com/Yonom))

- [#8730](https://github.com/assistant-ui/assistant-ui/pull/8730) [`8199e65`](https://github.com/assistant-ui/assistant-ui/commit/8199e6533d23b1cb78d66a83d5ada03c6aa3e988) - chore(setup-agent): move setup-agent into the assistant-ui workspace and keep its published CLI, host, and protocol entry points ([@Yonom](https://github.com/Yonom))

- [#8730](https://github.com/assistant-ui/assistant-ui/pull/8730) [`8199e65`](https://github.com/assistant-ui/assistant-ui/commit/8199e6533d23b1cb78d66a83d5ada03c6aa3e988) - fix(setup-agent): validate environment variable names inside the exported dotenv helper and scope CLI secret retrieval to the current setup and model input ([@Yonom](https://github.com/Yonom))
- Updated dependencies [[`14ba56e`](https://github.com/assistant-ui/assistant-ui/commit/14ba56ee6fb868446552670b558b456abe67252c), [`9121416`](https://github.com/assistant-ui/assistant-ui/commit/9121416f70e5fed68eaf7f8922a726e289e98aa5), [`039d048`](https://github.com/assistant-ui/assistant-ui/commit/039d0489ef5cc21608891e9a92f1ecbd5c9ab201)]:
  - @assistant-ui/tap@0.9.22
