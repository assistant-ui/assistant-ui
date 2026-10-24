# setup-agent

## 0.0.7

### Patch Changes

- [#10066](https://github.com/assistant-ui/assistant-ui/pull/10066) [`bfd98a8`](https://github.com/assistant-ui/assistant-ui/commit/bfd98a80c51a766201a350b77acbf62c4b5499ee) - fix: bind model key redemption to the asking CLI. ([@okisdev](https://github.com/okisdev))

- [#10063](https://github.com/assistant-ui/assistant-ui/pull/10063) [`297b607`](https://github.com/assistant-ui/assistant-ui/commit/297b6077eacb2ccebb37386dc1f9d9e2a61cc8ca) - fix: refuse symbolic links and project paths that resolve outside the project when writing configuration. ([@okisdev](https://github.com/okisdev))

## 0.0.6

### Patch Changes

- [#9869](https://github.com/assistant-ui/assistant-ui/pull/9869) [`0a6d4cb`](https://github.com/assistant-ui/assistant-ui/commit/0a6d4cb49bd7749e7e708448708e325c88752531) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.5

### Patch Changes

- [#9200](https://github.com/assistant-ui/assistant-ui/pull/9200) [`61d8f4e`](https://github.com/assistant-ui/assistant-ui/commit/61d8f4ecf002c2016c8ac3ec560b2991cc823fcb) - fix(setup-agent): `checkout/cancel` takes an optional checkout `id`, and the host ignores a cancel that names another checkout than the current one ([@Yonom](https://github.com/Yonom))

- [#8731](https://github.com/assistant-ui/assistant-ui/pull/8731) [`c0b41de`](https://github.com/assistant-ui/assistant-ui/commit/c0b41de73756e153b6b0b09961e9620bbbc28c29) - feat(setup-agent): add contextual assistant entry-point questions with validated options and stable selection answers, treat selected product names as starting goals for setup discovery, let installation steps name products outside the starting list, and keep the existing CLI exports and legacy session behavior ([@Yonom](https://github.com/Yonom))

## 0.0.4

### Patch Changes

- [#8730](https://github.com/assistant-ui/assistant-ui/pull/8730) [`8199e65`](https://github.com/assistant-ui/assistant-ui/commit/8199e6533d23b1cb78d66a83d5ada03c6aa3e988) - fix(setup-agent): keep a finished setup done when a late cancel arrives, create `.env.local` owner-only and open it before taking the one-time key, stop counting acknowledged follow-ups, refuse duplicate or `:`-containing option ids, restrict an existing `.env.local` to its owner, lock a preset to `--only` even with `--choices`, refuse duplicate variant ids, and dispose a client whose first connection fails ([@Yonom](https://github.com/Yonom))

- [#8730](https://github.com/assistant-ui/assistant-ui/pull/8730) [`8199e65`](https://github.com/assistant-ui/assistant-ui/commit/8199e6533d23b1cb78d66a83d5ada03c6aa3e988) - chore(setup-agent): move setup-agent into the assistant-ui workspace and keep its published CLI, host, and protocol entry points ([@Yonom](https://github.com/Yonom))

- [#8730](https://github.com/assistant-ui/assistant-ui/pull/8730) [`8199e65`](https://github.com/assistant-ui/assistant-ui/commit/8199e6533d23b1cb78d66a83d5ada03c6aa3e988) - fix(setup-agent): validate environment variable names inside the exported dotenv helper and scope CLI secret retrieval to the current setup and model input ([@Yonom](https://github.com/Yonom))
- Updated dependencies [[`14ba56e`](https://github.com/assistant-ui/assistant-ui/commit/14ba56ee6fb868446552670b558b456abe67252c), [`9121416`](https://github.com/assistant-ui/assistant-ui/commit/9121416f70e5fed68eaf7f8922a726e289e98aa5), [`039d048`](https://github.com/assistant-ui/assistant-ui/commit/039d0489ef5cc21608891e9a92f1ecbd5c9ab201)]:
  - @assistant-ui/tap@0.9.22
