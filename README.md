# Claude Exporter

> A privacy-first Chrome extension to export [claude.ai](https://claude.ai) conversations to **Markdown**, **HTML**, and **PDF** — or copy them straight to your **clipboard**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg)](./tsconfig.json)
[![Tests](https://img.shields.io/badge/tests-34%20passing-success.svg)](./tests)

Everything runs locally in your browser. No backend, no telemetry, no third-party services. Audit the entire codebase in an afternoon.

---

## Features

- **Export to Markdown** — clean `.md` with human/assistant turns, code blocks, and collapsible thinking sections.
- **Export to HTML** — self-contained, single-file `.html` with inlined styles.
- **Export to PDF** — opens a print-tuned preview and triggers your browser's native print dialog (vector text, real pagination).
- **Copy to clipboard** — copy any conversation as Markdown or HTML in one click.
- **Branched conversations** — only the active branch (the path you're reading) is exported, not regenerated dead-ends.
- **Code-fence safe** — code blocks containing backticks are escaped correctly.
- **XSS-safe** — all rendered content is HTML-escaped. Generated files are safe to open locally.

## Privacy

This extension is built around one principle: **your conversations never leave your browser**.

- ✅ **Zero network calls outside `claude.ai`.** No analytics, no telemetry, no error reporting, no remote code.
- ✅ **No persistent storage.** Nothing is written to disk other than the files *you* choose to export.
- ✅ **Minimal permissions** (see [below](#permissions)).
- ✅ **No build-time obfuscation.** Source maps are shipped with the build so you can step through the exact code that runs.
- ✅ **Reproducible builds.** `npm ci && npm run build` from any tagged commit produces byte-identical output to the Chrome Web Store release.
- ✅ **Open source under MIT.**

### Permissions

| Permission | Why we need it |
|---|---|
| `host_permissions: https://claude.ai/*` | Required to inject the content script into your claude.ai tab and call the claude.ai JSON API from that script using your existing session cookies. The extension touches no other origin. |
| `storage` | Used only via `chrome.storage.session` (in-memory, cleared when the browser closes) to hand the rendered print-ready HTML from the popup to the print-preview tab. We never write to `chrome.storage.local` or `sync`, so nothing persists across sessions and nothing syncs to your Google account. |

Permissions we deliberately do **not** request:

- **`activeTab`** — not needed; `host_permissions` for `claude.ai` already lets us read the active tab's URL when it matches.
- **`tabs`** — not needed for the same reason.
- **`downloads`** — `.md` and `.html` exports use a normal anchor click with the `download` attribute, which doesn't require the API.
- **`scripting`** — the content script is registered statically in the manifest; we never inject programmatically.
- **`<all_urls>` / any other host** — the extension only ever talks to `claude.ai`.

## Installation

### From source (unpacked)

```bash
git clone https://github.com/bensquire/claude-exporter.git
cd claude-exporter
nvm use            # Node 20
npm ci
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `dist/` directory.
4. Pin the extension to your toolbar (optional but convenient).

### Chrome Web Store

Coming soon.

## Usage

1. Open any conversation on [claude.ai](https://claude.ai).
2. Click the **Claude Exporter** icon in your toolbar.
3. Pick an action:
   - **Download**: Markdown · HTML · PDF
   - **Copy to clipboard**: Copy as Markdown · Copy as HTML

For PDF: a new tab opens with the print preview and the system print dialog automatically appears. Choose **Save as PDF** as the destination. Chrome remembers your last destination, so subsequent prints are effectively one click.

## How it works

claude.ai exposes a cookie-authenticated JSON API at `/api/organizations/{org}/chat_conversations/{chat}?tree=True&rendering_mode=messages`. Because the extension's content script runs on the `claude.ai` origin, your browser cookies are sent automatically — no token handling, no OAuth, no storage of credentials.

The full message tree is fetched, the active branch is selected (using `current_leaf_message_uuid`), and each message's content blocks (text, thinking, tool_use, tool_result, artifacts, attachments) are walked and rendered into the chosen format by pure formatter functions.

For PDF specifically: rather than rasterizing the live claude.ai page (which produces poor output because their CSS isn't print-tuned), the extension generates its own standalone HTML with a print-optimized stylesheet, opens it in a new tab, and triggers `window.print()`. Result: vector text, real pagination, proper page breaks between turns.

## Architecture

```
src/
├── manifest.ts              # MV3 manifest, permissions, content_scripts
├── messages.ts              # Typed popup ↔ content script message protocol
├── popup/
│   ├── popup.html           # Toolbar popup UI
│   └── popup.ts             # Button handlers, clipboard write, tab opening
├── content/
│   ├── content.ts           # Message handler, dispatches to formatters
│   ├── api.ts               # Authenticated fetch wrappers for claude.ai API
│   └── types.ts             # TypeScript types for ChatConversation et al.
├── formatters/
│   ├── shared.ts            # Pure content-block walker, HTML escape, fence picker
│   ├── markdown.ts          # ChatConversation → string (Markdown)
│   ├── html.ts              # ChatConversation → string (standalone HTML)
│   └── pdf.ts               # Builds print-ready HTML from html.ts output
└── viewer/
    ├── viewer.html          # Print preview shell
    └── viewer.ts            # Reads HTML from session storage and prints
```

The formatters are **pure functions** over the conversation JSON — no I/O, no DOM, no `chrome.*` APIs. This is the most important architectural rule: it makes them trivially unit-testable and keeps the side-effect surface tiny.

## Development

```bash
nvm use                # Node 20
npm ci                 # install dependencies (lockfile-frozen)

npm run dev            # HMR-capable dev build (watch mode)
npm run build          # production build → dist/
npm run typecheck      # tsc --noEmit
npm run lint           # oxlint
npm run format         # oxfmt . (writes in place)
npm run format:check   # oxfmt --check .
npm test               # vitest unit tests (34 tests)
npm run test:watch     # vitest in watch mode
npm run test:e2e       # Playwright end-to-end (planned)
```

After running `npm run build`, **reload the extension** in `chrome://extensions` (the circular arrow icon on the extension card) to pick up your changes.

### Tooling

- **[Vite](https://vitejs.dev)** + **[@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)** — fast builds, HMR, MV3-aware bundling.
- **TypeScript strict mode** with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- **[oxlint](https://oxc.rs/docs/guide/usage/linter.html)** + **[oxfmt](https://oxc.rs/docs/guide/usage/formatter.html)** — fast Rust-based linter and formatter.
- **[Vitest](https://vitest.dev)** — unit tests for the formatters and edge cases.
- **Playwright** — end-to-end tests (planned).

### Code style

- 4-space indentation, single quotes, semicolons, trailing commas. Enforced by `oxfmt` (see `.oxfmtrc.json`).
- Arrow functions over `function` declarations (personal preference).
- Pure functions in `src/formatters/*` — no side effects, ever.
- Defensive parsing at the API boundary in `src/content/api.ts` and `src/content/types.ts`. The claude.ai API is undocumented and may change.

### Testing

Unit tests cover the formatters exhaustively, including:

- Branched conversation trees (only the active branch is rendered).
- HTML escaping (XSS-safe rendering of arbitrary user content).
- Code-fence collision (backticks inside content force the fence to grow).
- Unknown / future block types (degrade gracefully, never crash).
- Empty conversations, single messages, very long conversations (200+ messages).
- Unicode, emoji, RTL text.
- Missing optional fields, malformed input.

```bash
npm test
```

```
 ✓ tests/formatters/shared.test.ts (15 tests)
 ✓ tests/formatters/markdown.test.ts (7 tests)
 ✓ tests/formatters/html.test.ts (5 tests)
 ✓ tests/edge-cases.test.ts (7 tests)

 Test Files  4 passed (4)
      Tests  34 passed (34)
```

## Reproducible builds

To verify that the Chrome Web Store build matches the source:

```bash
git clone https://github.com/bensquire/claude-exporter.git
cd claude-exporter
git checkout v0.1.0           # or whichever release tag
nvm use                       # Node version pinned in .nvmrc
npm ci                        # frozen-lockfile install
npm run build
```

The contents of `dist/` should be byte-identical to the package distributed via the Chrome Web Store.

## Contributing

Issues and PRs welcome. Please:

1. Run `npm run typecheck && npm run lint && npm test` before opening a PR.
2. Add tests for any change to the formatters or content-block walker.
3. Keep the runtime dependency surface at **zero** — every dep is something users have to audit.
4. Don't add new permissions to the manifest without strong justification.

## License

[MIT](./LICENSE) © Ben Squire
