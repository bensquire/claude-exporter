import type {
    ArtifactBlock,
    Attachment,
    Role,
    ToolResultBlock,
    ToolUseBlock,
} from '../transcript/types';

export const roleLabel = (role: Role): string => (role === 'human' ? 'Human' : 'Assistant');

export const imageLabel = (name: string): string => `[Image: ${name}]`;

/** `name` and `message` are inserted as given, so formatters can mark them up first. */
export const toolCallLabel = (name: string, message?: string): string =>
    message ? `Tool call: ${name} — ${message}` : `Tool call: ${name}`;

/** `name` is inserted as given, like toolCallLabel's. */
export const toolResultLabel = (isError: boolean, name?: string): string => {
    const label = isError ? 'Tool error' : 'Tool result';
    return name ? `${label}: ${name}` : label;
};

/** The labels as escaped HTML, for a `<summary>`, which is HTML in Markdown too. */
export const toolCallSummaryHtml = (b: ToolUseBlock): string =>
    toolCallLabel(codeHtml(b.name), b.message && escapeHtml(b.message));

export const toolResultSummaryHtml = (b: ToolResultBlock): string =>
    toolResultLabel(b.isError, b.name && codeHtml(b.name));

const codeHtml = (text: string): string => `<code>${escapeHtml(text)}</code>`;

/** Whether a URL from claude.ai is safe to turn into a link. */
export const isWebUrl = (url: string): boolean => /^https?:\/\//i.test(url);

/** `type` is inserted as given, like toolCallLabel's `name`. */
export const unknownBlockLabel = (type: string): string => `Unknown block (${type})`;

export const formatSize = (bytes: number): string => `(${bytes} bytes)`;

/** `name (12 bytes)`, or just the name when the size is unknown. */
export const attachmentLabel = (a: Attachment): string =>
    a.size === undefined ? a.name : `${a.name} ${formatSize(a.size)}`;

export const thinkingLabel = (summarized: boolean): string =>
    summarized ? 'Thinking (summary)' : 'Thinking';

/** `2026-04-01 10:00 UTC`: timezone-independent, so exports are reproducible. */
export const formatTime = (iso: string): string => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? iso
        : `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
};

export const artifactLabel = (a: ArtifactBlock): string | undefined => {
    if (a.partial) return `${a.title ?? 'Artifact'} (partial update)`;
    if (a.version > 1) return `${a.title ?? 'Artifact'} (v${a.version})`;
    return a.title;
};

export const escapeHtml = (s: string): string =>
    s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

/** Pick a code fence length that doesn't collide with backticks inside the content. */
export const pickFence = (text: string): string => {
    let max = 2;
    for (const m of text.matchAll(/`+/g)) max = Math.max(max, m[0].length);
    return '`'.repeat(max + 1);
};

export const sanitizeFilename = (name: string): string =>
    name
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120) || 'conversation';

export const dateStamp = (d: Date = new Date()): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};
