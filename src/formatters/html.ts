import MarkdownIt from 'markdown-it';
import type { Block, Transcript, Turn } from '../transcript/types';
import { artifactLabel, escapeHtml, safeStringify } from './shared';

// `html: false` escapes raw HTML and markdown-it drops javascript:/data: links.
// Images are off so opening an export never fetches a remote URL. Built lazily
// because this module loads on every claude.ai page.
let md: InstanceType<typeof MarkdownIt> | undefined;
const renderMarkdown = (text: string): string => {
    md ??= new MarkdownIt({ html: false, linkify: true }).disable('image');
    return md.render(text).trimEnd();
};

export const toHtml = (t: Transcript): string => {
    const title = escapeHtml(t.title);

    const body = t.turns
        .map((turn) => {
            const blocks = turn.blocks.map(renderBlock).join('\n');
            const attachments = renderAttachments(turn);
            return `<section class="turn turn-${turn.role}">
  <header class="turn-header">${turn.role === 'human' ? 'Human' : 'Assistant'}</header>
  <div class="turn-body">
${blocks}
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
  ${t.createdAt ? `<p class="meta">Created ${escapeHtml(t.createdAt)}</p>` : ''}
  ${body}
</main>
</body>
</html>
`;
};

const renderBlock = (block: Block): string => {
    switch (block.kind) {
        case 'text':
            return block.format === 'markdown'
                ? `<div class="text markdown">${renderMarkdown(block.text)}</div>`
                : `<div class="text">${paragraphs(block.text)}</div>`;
        case 'thinking':
            return `<details class="thinking"><summary>Thinking</summary><pre>${escapeHtml(block.text)}</pre></details>`;
        case 'artifact': {
            const lang = escapeHtml(block.language);
            const label = artifactLabel(block);
            const title = label ? `<div class="code-title">${escapeHtml(label)}</div>` : '';
            return `${title}<pre class="code" data-lang="${lang}"><code>${escapeHtml(block.content)}</code></pre>`;
        }
        case 'tool_use':
            return `<div class="tool-use"><div class="tool-label">Tool call: <code>${escapeHtml(block.name)}</code></div><pre><code>${escapeHtml(safeStringify(block.input))}</code></pre></div>`;
        case 'tool_result':
            return `<div class="tool-result ${block.isError ? 'is-error' : ''}"><div class="tool-label">${block.isError ? 'Tool error' : 'Tool result'}</div><pre><code>${escapeHtml(block.text)}</code></pre></div>`;
        case 'unknown':
            return `<div class="unknown"><div class="tool-label">Unknown block (${escapeHtml(block.type)})</div><pre><code>${escapeHtml(safeStringify(block.raw))}</code></pre></div>`;
    }
};

const paragraphs = (text: string): string =>
    text
        .split(/\n{2,}/)
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
        .join('\n');

const renderAttachments = (turn: Turn): string | null => {
    if (turn.attachments.length === 0) return null;
    const items = turn.attachments.map((a) => {
        const size = a.size === undefined ? '' : ` <span class="size">(${a.size} bytes)</span>`;
        return `<li>${escapeHtml(a.name)}${size}</li>`;
    });
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
    --link: #4f46e5;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
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
  pre.code, .markdown pre, .tool-use pre, .tool-result pre, .unknown pre, .thinking pre {
    background: var(--bg-code);
    color: var(--fg-code);
    padding: 0.75rem 1rem;
    border-radius: 6px;
    overflow-x: auto;
    font: 13px/1.5 var(--font-mono);
    white-space: pre-wrap;
    word-break: break-word;
  }
  .markdown > :first-child { margin-top: 0; }
  .markdown > :last-child { margin-bottom: 0; }
  .markdown :not(pre) > code {
    font: 0.875em var(--font-mono);
    background: var(--bg-human);
    padding: 0.1em 0.3em;
    border-radius: 4px;
  }
  .markdown pre code { font: inherit; }
  .markdown h1, .markdown h2, .markdown h3, .markdown h4 { line-height: 1.3; margin: 1.25rem 0 0.5rem; }
  .markdown h1 { font-size: 1.4rem; }
  .markdown h2 { font-size: 1.25rem; }
  .markdown h3 { font-size: 1.1rem; }
  .markdown h4 { font-size: 1rem; }
  .markdown ul, .markdown ol { padding-left: 1.5rem; margin: 0.5rem 0; }
  .markdown li + li { margin-top: 0.25rem; }
  .markdown blockquote { margin: 0.5rem 0; padding-left: 1rem; border-left: 3px solid var(--border); color: var(--fg-muted); }
  .markdown table { border-collapse: collapse; margin: 0.5rem 0; display: block; overflow-x: auto; }
  .markdown th, .markdown td { border: 1px solid var(--border); padding: 0.35rem 0.6rem; text-align: left; }
  .markdown th { background: var(--bg-human); }
  .markdown hr { border: 0; border-top: 1px solid var(--border); margin: 1rem 0; }
  .markdown a { color: var(--link); }
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
    pre.code, .markdown pre, .tool-use pre, .tool-result pre, .unknown pre {
      background: #f6f8fa;
      color: #111;
      border: 1px solid #e4e4e7;
    }
    a { color: inherit; text-decoration: none; }
    h1 { font-size: 16pt; }
  }
`;
