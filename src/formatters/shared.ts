import type { ChatConversation, ChatMessage, ContentBlock, ExportOptions } from '../content/types';

/** Walks a branched conversation tree and returns messages on the active branch
 *  (the path ending at `current_leaf_message_uuid`), sorted by index. If no
 *  leaf is set, falls back to all messages sorted by index. */
export const selectActiveBranch = (conversation: ChatConversation): ChatMessage[] => {
    const messages = conversation.chat_messages ?? [];
    const leaf = conversation.current_leaf_message_uuid;
    if (!leaf) return messages.toSorted((a, b) => a.index - b.index);

    const byUuid = new Map(messages.map((m) => [m.uuid, m]));
    const path: ChatMessage[] = [];
    let cursor: string | null | undefined = leaf;
    const seen = new Set<string>();
    while (cursor) {
        if (seen.has(cursor)) break; // guard against cycles
        seen.add(cursor);
        const msg = byUuid.get(cursor);
        if (!msg) break;
        path.push(msg);
        cursor = msg.parent_message_uuid ?? null;
    }
    return path.toReversed();
};

/** Render a single ContentBlock to plain text / markdown-ish fragments.
 *  Consumers decide how to wrap (e.g. the HTML formatter HTML-escapes the output).
 *  Returns an array of logical "fragments" so formatters can choose wrapping. */
export type RenderedFragment =
    | { kind: 'text'; text: string }
    | { kind: 'thinking'; text: string }
    | { kind: 'code'; language: string; text: string; title?: string }
    | { kind: 'tool_use'; name: string; input: string }
    | { kind: 'tool_result'; text: string; isError: boolean }
    | { kind: 'unknown'; type: string; text: string };

export const renderBlock = (block: ContentBlock, options: ExportOptions): RenderedFragment[] => {
    const type = block.type;

    if (type === 'text') {
        const text = (block as { text?: unknown }).text;
        return typeof text === 'string' && text.length > 0 ? [{ kind: 'text', text }] : [];
    }

    if (type === 'thinking') {
        if (!options.includeThinking) return [];
        const b = block as { thinking?: unknown; text?: unknown };
        const raw =
            typeof b.thinking === 'string' ? b.thinking : typeof b.text === 'string' ? b.text : '';
        return raw ? [{ kind: 'thinking', text: raw }] : [];
    }

    // Artifacts come through as tool_use with name = 'artifacts'
    if (type === 'tool_use') {
        const b = block as { name?: unknown; input?: unknown };
        const name = typeof b.name === 'string' ? b.name : 'tool';
        if (name === 'artifacts' && isRecord(b.input)) {
            const title = typeof b.input.title === 'string' ? b.input.title : undefined;
            const language = typeof b.input.language === 'string' ? b.input.language : '';
            const content = typeof b.input.content === 'string' ? b.input.content : '';
            if (content) {
                const frag: RenderedFragment = { kind: 'code', language, text: content };
                if (title !== undefined) frag.title = title;
                return [frag];
            }
            return [];
        }
        return [{ kind: 'tool_use', name, input: safeStringify(b.input) }];
    }

    if (type === 'tool_result') {
        const b = block as { content?: unknown; is_error?: unknown };
        return [
            {
                kind: 'tool_result',
                text: stringifyToolResult(b.content),
                isError: b.is_error === true,
            },
        ];
    }

    // Unknown / future block type — degrade gracefully
    return [{ kind: 'unknown', type, text: safeStringify(block) }];
};

export const renderMessage = (msg: ChatMessage, options: ExportOptions): RenderedFragment[] => {
    const blocks = Array.isArray(msg.content) ? msg.content : [];
    if (blocks.length === 0 && typeof msg.text === 'string' && msg.text.length > 0) {
        return [{ kind: 'text', text: msg.text }];
    }
    return blocks.flatMap((b) => renderBlock(b, options));
};

const isRecord = (x: unknown): x is Record<string, unknown> =>
    typeof x === 'object' && x !== null;

const safeStringify = (x: unknown): string => {
    try {
        return JSON.stringify(x, null, 2) ?? String(x);
    } catch {
        return String(x);
    }
};

const stringifyToolResult = (content: unknown): string => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content
            .map((c) => {
                if (typeof c === 'string') return c;
                if (isRecord(c) && typeof c.text === 'string') return c.text;
                return safeStringify(c);
            })
            .join('\n');
    }
    return safeStringify(content);
};

/** HTML-escape a string. Small and self-contained — no DOMPurify dependency. */
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

/** Sanitize a string for use as a filename (cross-platform safe). */
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
