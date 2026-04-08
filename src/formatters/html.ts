import type { ChatConversation, ChatMessage, ExportOptions } from '../content/types';
import { escapeHtml, renderMessage, selectActiveBranch, type RenderedFragment } from './shared';

export const toHtml = (conversation: ChatConversation, options: ExportOptions): string => {
    const messages = selectActiveBranch(conversation);
    const title = escapeHtml(conversation.name || 'Claude conversation');

    const body = messages
        .map((msg) => {
            const fragments = renderMessage(msg, options).map(renderFragment).join('\n');
            const attachments = renderAttachments(msg);
            return `<section class="turn turn-${msg.sender}">
  <header class="turn-header">${msg.sender === 'human' ? 'Human' : 'Assistant'}</header>
  <div class="turn-body">
${fragments}
${attachments ?? ''}
  </div>
</section>`;
        })
        .join('\n');

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>${STYLES}</style>
</head>
<body>
<main>
  <h1>${title}</h1>
  ${conversation.created_at ? `<p class="meta">Created ${escapeHtml(conversation.created_at)}</p>` : ''}
  ${body}
</main>
</body>
</html>
`;
};

const renderFragment = (frag: RenderedFragment): string => {
    switch (frag.kind) {
        case 'text':
            return `<div class="text">${paragraphs(frag.text)}</div>`;
        case 'thinking':
            return `<details class="thinking"><summary>Thinking</summary><pre>${escapeHtml(frag.text)}</pre></details>`;
        case 'code': {
            const lang = escapeHtml(frag.language || '');
            const title = frag.title
                ? `<div class="code-title">${escapeHtml(frag.title)}</div>`
                : '';
            return `${title}<pre class="code" data-lang="${lang}"><code>${escapeHtml(frag.text)}</code></pre>`;
        }
        case 'tool_use':
            return `<div class="tool-use"><div class="tool-label">Tool call: <code>${escapeHtml(frag.name)}</code></div><pre><code>${escapeHtml(frag.input)}</code></pre></div>`;
        case 'tool_result':
            return `<div class="tool-result ${frag.isError ? 'is-error' : ''}"><div class="tool-label">${frag.isError ? 'Tool error' : 'Tool result'}</div><pre><code>${escapeHtml(frag.text)}</code></pre></div>`;
        case 'unknown':
            return `<div class="unknown"><div class="tool-label">Unknown block (${escapeHtml(frag.type)})</div><pre><code>${escapeHtml(frag.text)}</code></pre></div>`;
    }
};

const paragraphs = (text: string): string =>
    text
        .split(/\n{2,}/)
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
        .join('\n');

const renderAttachments = (msg: ChatMessage): string | null => {
    const atts = msg.attachments ?? [];
    const files = msg.files ?? [];
    if (atts.length === 0 && files.length === 0) return null;
    const items: string[] = [];
    for (const a of atts) {
        const name = escapeHtml(a.file_name ?? 'unnamed');
        const size =
            typeof a.file_size === 'number'
                ? ` <span class="size">(${a.file_size} bytes)</span>`
                : '';
        items.push(`<li>${name}${size}</li>`);
    }
    for (const f of files) {
        const name = escapeHtml(f.file_name ?? 'unnamed');
        const size =
            typeof f.file_size === 'number'
                ? ` <span class="size">(${f.file_size} bytes)</span>`
                : '';
        items.push(`<li>${name}${size}</li>`);
    }
    return `<div class="attachments"><div class="tool-label">Attachments</div><ul>${items.join('')}</ul></div>`;
};

const STYLES = `
  :root {
    --fg: #1a1a1a;
    --fg-muted: #666;
    --bg: #ffffff;
    --bg-human: #f4f4f6;
    --bg-code: #0f1115;
    --fg-code: #e6e6e6;
    --border: #e4e4e7;
  }
  * { box-sizing: border-box; }
  body {
    font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: var(--fg);
    background: var(--bg);
    margin: 0;
    padding: 2rem 1rem;
  }
  main { max-width: 780px; margin: 0 auto; }
  h1 { font-size: 1.75rem; margin: 0 0 0.25rem; }
  .meta { color: var(--fg-muted); font-size: 0.875rem; margin: 0 0 2rem; }
  .turn {
    border: 1px solid var(--border);
    border-radius: 8px;
    margin: 1rem 0;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .turn-header {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--fg-muted);
    background: var(--bg-human);
    border-bottom: 1px solid var(--border);
  }
  .turn-human .turn-header { background: #eef2ff; }
  .turn-body { padding: 1rem; }
  .turn-body > * + * { margin-top: 0.75rem; }
  p { margin: 0.5rem 0; }
  pre.code, .tool-use pre, .tool-result pre, .unknown pre, .thinking pre {
    background: var(--bg-code);
    color: var(--fg-code);
    padding: 0.75rem 1rem;
    border-radius: 6px;
    overflow-x: auto;
    font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .code-title { font-size: 0.8rem; color: var(--fg-muted); margin-bottom: 0.25rem; }
  .tool-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--fg-muted); margin-bottom: 0.25rem; }
  .tool-result.is-error pre { border-left: 3px solid #dc2626; }
  .attachments ul { margin: 0.25rem 0 0 1.25rem; padding: 0; }
  .attachments .size { color: var(--fg-muted); font-size: 0.85em; }
  details.thinking { border-left: 3px solid #d4d4d8; padding-left: 0.75rem; }
  details.thinking summary { cursor: pointer; color: var(--fg-muted); font-size: 0.875rem; }

  @media print {
    body { padding: 0; font-size: 11pt; }
    main { max-width: none; }
    .turn { border-color: #ccc; break-inside: avoid; page-break-inside: avoid; }
    details.thinking { display: none; }
    pre.code, .tool-use pre, .tool-result pre, .unknown pre {
      background: #f6f8fa;
      color: #111;
      border: 1px solid #e4e4e7;
    }
    a { color: inherit; text-decoration: none; }
    h1 { font-size: 16pt; }
  }
`;
