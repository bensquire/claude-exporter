# Claude Exporter

Privacy-first Chrome extension to export [claude.ai](https://claude.ai) conversations to Markdown, HTML, and PDF — or copy them straight to the clipboard.

## Privacy

- **Zero network calls outside `claude.ai`.** Everything runs locally in your browser.
- **No telemetry, no analytics, no remote code.**
- **Minimal permissions** — see below.
- **Open source.** Audit the code in an afternoon.
- **Reproducible builds**: the Chrome Web Store build is produced from a tagged commit with `npm ci && npm run build`.

### Permissions

This extension requests the smallest set of permissions it can. Every one is justified below.

| Permission                              | Why we need it                                                                                                                                                                                                                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `host_permissions: https://claude.ai/*` | Required to (a) inject the content script into your claude.ai tab and (b) call the claude.ai JSON API from that script using your existing session cookies. The extension touches no other origin.                                                                                                   |
| `storage`                               | Used only via `chrome.storage.session` (in-memory, cleared when the browser closes) to hand the rendered print-ready HTML from the popup to the print-preview tab. We never write to `chrome.storage.local` or `sync`, so nothing persists across sessions and nothing syncs to your Google account. |

Permissions we deliberately do **not** request:

- **`activeTab`** — not needed; `host_permissions` for `claude.ai` already lets us read the active tab's URL when it matches.
- **`tabs`** — not needed for the same reason.
- **`downloads`** — `.md` and `.html` exports use a normal anchor click with the `download` attribute, which doesn't require the API.
- **`scripting`** — the content script is registered statically in the manifest; we never inject programmatically.
- **`<all_urls>` / any other host** — the extension only ever talks to `claude.ai`.

## Install (unpacked)

1. `npm ci && npm run build`
2. Open `chrome://extensions`, enable Developer Mode, click "Load unpacked", select `dist/`.
3. Open any conversation on `claude.ai`, click the extension icon, pick a format.

## Develop

```bash
nvm use            # Node 20
npm ci
npm run dev        # HMR-capable dev build
npm test           # Vitest unit tests
npm run test:e2e   # Playwright end-to-end
npm run typecheck
```

## How it works

claude.ai exposes a cookie-authenticated JSON API (`/api/organizations/{org}/chat_conversations/{chat}?tree=True&rendering_mode=messages`). Because the content script runs on `claude.ai`, browser cookies are sent automatically — no token handling, no OAuth. The full message tree is fetched, walked, and rendered into the chosen format. The PDF path generates a print-tuned standalone HTML document and opens it in a new tab so you can use the browser's native "Save as PDF" for vector-quality output.

## License

MIT. See [LICENSE](./LICENSE).
