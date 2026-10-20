# Claude Exporter

> A privacy-first Chrome extension to export [claude.ai](https://claude.ai) conversations to **Markdown**, **HTML**, and **PDF** — or copy them straight to your **clipboard**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg)](./tsconfig.json)

Everything runs locally in your browser. No backend, no telemetry, no third-party services. Audit the entire codebase in an afternoon.

---

## Features

- **Export to Markdown** — clean `.md` with human/assistant turns, code blocks, and collapsible thinking sections.
- **Export to HTML** — self-contained, single-file `.html` with inlined styles. Claude's replies are rendered from Markdown (headings, lists, tables, code blocks), as on claude.ai.
- **Export to PDF** — opens a print-tuned preview and triggers your browser's native print dialog (vector text, real pagination).
- **Copy to clipboard** — copy any conversation as Markdown or HTML in one click.
- **Branched conversations** — only the active branch (the path you're reading) is exported, not regenerated dead-ends.
- **Artifacts** — exported in full, with later edits applied, so each one shows the version Claude produced at that point.
- **Multiple organizations** — works whether the conversation lives in your personal account or a Team/Enterprise org.
- **Code-fence safe** — code blocks containing backticks get a longer fence, so they don't break out.
- **XSS-safe** — raw HTML in conversations is escaped, and `javascript:`-style links are dropped. Images are not rendered, so opening an export never fetches a remote URL.

## Privacy

This extension is built around one principle: **your conversations never leave your browser**.

- ✅ **Zero network calls outside `claude.ai`.** No analytics, no telemetry, no error reporting, no remote code.
- ✅ **No persistent storage.** Nothing is written to disk other than the files _you_ choose to export.
- ✅ **Minimal permissions** (see [below](#permissions)).
- ✅ **No build-time obfuscation.** Source maps are shipped with the build so you can step through the exact code that runs.
- ✅ **Reproducible builds.** `npm ci && npm run build` from a release tag reproduces the released `dist/` (see [below](#reproducible-builds)).
- ✅ **Open source under MIT.**

### Permissions

| Permission                              | Why we need it                                                                                                                                                                                                                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `host_permissions: https://claude.ai/*` | Required to inject the content script into your claude.ai tab and call the claude.ai JSON API from that script using your existing session cookies. The extension touches no other origin.                                                                                                           |
| `storage`                               | Used only via `chrome.storage.session` (in-memory, cleared when the browser closes) to hand the rendered print-ready HTML from the popup to the print-preview tab. We never write to `chrome.storage.local` or `sync`, so nothing persists across sessions and nothing syncs to your Google account. |

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
nvm use            # Node version from .nvmrc
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

If a claude.ai tab was open before you installed the extension, the first export reloads it so the content script can load. Anything you'd typed but not sent in that tab is lost.

### Limitations

- Attachments and uploaded images are listed by name; their contents aren't exported.
- Thinking is included in Markdown and HTML exports (collapsed), but hidden in PDFs.
- **Copy as HTML** copies the HTML source as text, for pasting into an editor or file, not as formatted text.
- claude.ai's API is undocumented, so a change on their side can break exports until the extension is updated.

## How it works

claude.ai exposes a cookie-authenticated JSON API at `/api/organizations/{org}/chat_conversations/{chat}?tree=True&rendering_mode=messages`. Because the extension's content script runs on the `claude.ai` origin, your browser cookies are sent automatically — no token handling, no OAuth, no storage of credentials. The org is taken from claude.ai's `lastActiveOrg` cookie, falling back to each of your other orgs in turn.

The full message tree is fetched, the active branch is selected (using `current_leaf_message_uuid`), and each message's content blocks (text, thinking, tool_use, tool_result, artifacts, attachments) are walked and rendered into the chosen format by pure formatter functions.

For PDF specifically: rather than rasterizing the live claude.ai page (which produces poor output because their CSS isn't print-tuned), the extension generates its own standalone HTML with a print-optimized stylesheet, opens it in a new tab, and triggers `window.print()`. Result: vector text, real pagination, and turns kept on one page where they fit.

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
│   └── html.ts              # ChatConversation → string (standalone HTML + print CSS)
└── viewer/
    ├── viewer.html          # Print preview shell
    └── viewer.ts            # Reads HTML from session storage and prints
```

The formatters are **pure functions** over the conversation JSON — no I/O, no DOM, no `chrome.*` APIs. This is the most important architectural rule: it makes them trivially unit-testable and keeps the side-effect surface tiny.

## Development

```bash
nvm use                # Node version from .nvmrc
npm ci                 # install dependencies (lockfile-frozen)

npm run dev            # HMR-capable dev build (watch mode)
npm run build          # production build → dist/
npm run typecheck      # tsc --noEmit
npm run lint           # oxlint
npm run format         # oxfmt . (writes in place)
npm run format:check   # oxfmt --check .
npm test               # vitest unit tests
npm run test:watch     # vitest in watch mode
```

After running `npm run build`, **reload the extension** in `chrome://extensions` (the circular arrow icon on the extension card) to pick up your changes.

### Tooling

- **[Vite](https://vitejs.dev)** + **[@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)** — fast builds, HMR, MV3-aware bundling.
- **TypeScript strict mode** with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- **[oxlint](https://oxc.rs/docs/guide/usage/linter.html)** + **[oxfmt](https://oxc.rs/docs/guide/usage/formatter.html)** — fast Rust-based linter and formatter.
- **[Vitest](https://vitest.dev)** — unit tests for the formatters, API helpers and edge cases.

### Releasing

Pushing a version tag publishes to the Chrome Web Store via GitHub Actions. See [RELEASING.md](./RELEASING.md).

### Code style

- 4-space indentation, single quotes, semicolons, trailing commas. Enforced by `oxfmt` (see `.oxfmtrc.json`).
- Arrow functions over `function` declarations (personal preference).
- Defensive parsing at the API boundary in `src/content/api.ts` and `src/content/types.ts`. The claude.ai API is undocumented and may change.

### Testing

Unit tests cover:

- Branched conversation trees (only the active branch is rendered).
- HTML escaping (XSS-safe rendering of arbitrary user content), including raw HTML, `javascript:` links and images inside Claude's Markdown.
- Artifact updates applied across messages to reconstruct each version.
- Finding a conversation across multiple organizations (personal + Team/Enterprise).
- Code-fence collision (backticks inside content force the fence to grow).
- Unknown / future block types (degrade gracefully, never crash).
- Empty conversations, single messages, very long conversations (200+ messages).
- Unicode, emoji, RTL text.
- Missing optional fields.

## Reproducible builds

Each [GitHub release](https://github.com/bensquire/claude-exporter/releases) has the exact zip that was uploaded to the Chrome Web Store, built by CI from the tagged commit. To check it against the source:

```bash
git clone https://github.com/bensquire/claude-exporter.git
cd claude-exporter
git checkout vX.Y.Z           # the release tag
nvm use                       # Node version pinned in .nvmrc
npm ci                        # frozen-lockfile install
npm run build
```

`dist/` should match the contents of the release zip byte for byte, except `assets/crx-manifest.js-*.js.map`: that source map embeds a path that depends on where you cloned the repo.

## Contributing

Issues and PRs welcome. Please:

1. Run `npm run typecheck && npm run lint && npm run format:check && npm test` before opening a PR.
2. Add tests for any change to the formatters or content-block walker.
3. Keep the runtime dependency surface minimal — every dep is something users have to audit. The only direct one today is [`markdown-it`](https://github.com/markdown-it/markdown-it), for rendering Claude's replies in HTML exports; it brings in five small packages of its own (`entities`, `linkify-it`, `mdurl`, `punycode.js`, `uc.micro`).
4. Don't add new permissions to the manifest without strong justification.

## License

[MIT](./LICENSE) © Ben Squire
