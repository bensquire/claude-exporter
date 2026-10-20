import type { ChatConversation, ChatMessage, ContentBlock, ExportOptions } from '../content/types';

/** The path ending at `current_leaf_message_uuid`, or every message if no leaf is set. */
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

export type RenderedFragment =
    | { kind: 'text'; text: string }
    | { kind: 'thinking'; text: string }
    | { kind: 'code'; language: string; text: string; title?: string }
    | { kind: 'tool_use'; name: string; input: string }
    | { kind: 'tool_result'; text: string; isError: boolean }
    | { kind: 'unknown'; type: string; text: string };

type CodeFragment = Extract<RenderedFragment, { kind: 'code' }>;

/** Latest version of each artifact by id; edits arrive as old_str -> new_str patches. */
type ArtifactStore = Map<string, CodeFragment>;

export const renderConversation = (
    conversation: ChatConversation,
    options: ExportOptions,
): { msg: ChatMessage; fragments: RenderedFragment[] }[] => {
    const artifacts: ArtifactStore = new Map();
    return selectActiveBranch(conversation).map((msg) => ({
        msg,
        fragments: renderMessage(msg, options, artifacts),
    }));
};

export const renderBlock = (
    block: ContentBlock,
    options: ExportOptions,
    artifacts: ArtifactStore,
): RenderedFragment[] => {
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

    if (type === 'tool_use') {
        const b = block as { name?: unknown; input?: unknown };
        const name = typeof b.name === 'string' ? b.name : 'tool';
        if (name === 'artifacts' && isRecord(b.input)) return renderArtifact(b.input, artifacts);
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

    return [{ kind: 'unknown', type, text: safeStringify(block) }];
};

const renderArtifact = (
    input: Record<string, unknown>,
    artifacts: ArtifactStore,
): RenderedFragment[] => {
    const id = str(input.id);
    const prev = id === undefined ? undefined : artifacts.get(id);
    const title = str(input.title) ?? prev?.title;
    const language = str(input.language) ?? prev?.language ?? '';

    let text = str(input.content);
    if (input.command === 'update') {
        const oldStr = str(input.old_str);
        const newStr = str(input.new_str) ?? '';
        const at = prev && oldStr !== undefined ? prev.text.indexOf(oldStr) : -1;
        if (!prev || oldStr === undefined || at === -1) {
            // No base version (e.g. created on another branch): show the edit alone.
            return newStr
                ? [codeFragment(language, newStr, `${title ?? 'Artifact'} (partial update)`)]
                : [];
        }
        text = prev.text.slice(0, at) + newStr + prev.text.slice(at + oldStr.length);
    }
    if (!text) return [];

    const frag = codeFragment(language, text, title);
    if (id !== undefined) artifacts.set(id, frag);
    return [frag];
};

const codeFragment = (language: string, text: string, title: string | undefined): CodeFragment =>
    title === undefined
        ? { kind: 'code', language, text }
        : { kind: 'code', language, text, title };

export const renderMessage = (
    msg: ChatMessage,
    options: ExportOptions,
    artifacts: ArtifactStore,
): RenderedFragment[] => {
    const blocks = Array.isArray(msg.content) ? msg.content : [];
    if (blocks.length === 0 && typeof msg.text === 'string' && msg.text.length > 0) {
        return [{ kind: 'text', text: msg.text }];
    }
    return blocks.flatMap((b) => renderBlock(b, options, artifacts));
};

const str = (x: unknown): string | undefined => (typeof x === 'string' ? x : undefined);

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

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
