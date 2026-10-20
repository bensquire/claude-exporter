import type {
    Attachment as ClaudeAttachment,
    ChatConversation,
    ChatMessage,
    ContentBlock,
    FileAttachment,
} from '../content/types';
import { safeStringify } from '../util';
import type { ArtifactBlock, Attachment, Block, Role, Transcript, Turn } from './types';

export const toTranscript = (conversation: ChatConversation): Transcript => {
    const artifacts: ArtifactStore = new Map();
    return {
        id: conversation.uuid,
        title: conversation.name || 'Claude conversation',
        ...optional('createdAt', str(conversation.created_at)),
        ...optional('updatedAt', str(conversation.updated_at)),
        ...optional('model', str(conversation.model)),
        turns: selectActiveBranch(conversation).map((msg) => toTurn(msg, artifacts)),
    };
};

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

/** Latest version of each artifact by id; edits arrive as old_str -> new_str patches. */
type ArtifactStore = Map<string, ArtifactBlock>;

const toTurn = (msg: ChatMessage, artifacts: ArtifactStore): Turn => {
    const role: Role = msg.sender === 'human' ? 'human' : 'assistant';
    const content = Array.isArray(msg.content) ? msg.content : [];
    const files = new Map((msg.files ?? []).map((f) => [f.file_uuid, f]));
    const blocks =
        content.length === 0 && typeof msg.text === 'string' && msg.text.length > 0
            ? [textBlock(msg.text, role)]
            : content.flatMap((b) => toBlocks(b, role, artifacts, files));
    // Images already appear inline as image blocks.
    const inline = new Set(blocks.flatMap((b) => (b.kind === 'image' ? [b.fileId] : [])));
    return {
        id: msg.uuid,
        role,
        ...optional('createdAt', str(msg.created_at)),
        blocks,
        attachments: [
            ...(msg.attachments ?? []).map(fromUpload),
            ...(msg.files ?? []).filter((f) => !inline.has(f.file_uuid ?? '')).map(fromFile),
        ],
    };
};

const toBlocks = (
    block: ContentBlock,
    role: Role,
    artifacts: ArtifactStore,
    files: Map<string | undefined, FileAttachment>,
): Block[] => {
    const type = block.type;

    if (type === 'text') {
        const text = (block as { text?: unknown }).text;
        return typeof text === 'string' && text.length > 0 ? [textBlock(text, role)] : [];
    }

    if (type === 'thinking') {
        const b = block as { thinking?: unknown; text?: unknown; summaries?: unknown };
        const text = str(b.thinking) || str(b.text);
        if (text) return [{ kind: 'thinking', text, summarized: false }];
        // With thinking hidden, claude.ai keeps only these summaries.
        const summary = (Array.isArray(b.summaries) ? b.summaries : [])
            .map((s) => (isRecord(s) ? str(s.summary) : undefined))
            .filter(Boolean)
            .join('\n\n');
        return summary ? [{ kind: 'thinking', text: summary, summarized: true }] : [];
    }

    if (type === 'image') {
        const fileId = str((block as { file_uuid?: unknown }).file_uuid);
        if (fileId === undefined) return [];
        return [{ kind: 'image', fileId, name: files.get(fileId)?.file_name || 'image' }];
    }

    if (type === 'tool_use') {
        const b = block as { name?: unknown; input?: unknown };
        const name = str(b.name) ?? 'tool';
        if (name === 'artifacts' && isRecord(b.input)) return toArtifact(b.input, artifacts);
        return [{ kind: 'tool_use', name, input: b.input }];
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

    // Markers such as token_budget carry nothing worth exporting.
    if (Object.keys(block).every((k) => CONTENTLESS_KEYS.has(k))) return [];

    return [{ kind: 'unknown', type, raw: block }];
};

const CONTENTLESS_KEYS = new Set(['type', 'start_timestamp', 'stop_timestamp']);

const textBlock = (text: string, role: Role): Block => ({
    kind: 'text',
    text,
    format: role === 'assistant' ? 'markdown' : 'plain',
});

const toArtifact = (input: Record<string, unknown>, artifacts: ArtifactStore): Block[] => {
    const id = str(input.id);
    const prev = id === undefined ? undefined : artifacts.get(id);
    const base = {
        ...optional('id', id),
        ...optional('title', str(input.title) ?? prev?.title),
        language: str(input.language) ?? prev?.language ?? '',
        version: (prev?.version ?? 0) + 1,
    };

    let content = str(input.content);
    if (input.command === 'update') {
        const oldStr = str(input.old_str);
        const newStr = str(input.new_str) ?? '';
        const at = prev && oldStr !== undefined ? prev.content.indexOf(oldStr) : -1;
        if (!prev || oldStr === undefined || at === -1) {
            // No base version (e.g. created on another branch): keep the edit alone.
            return newStr ? [{ kind: 'artifact', ...base, content: newStr, partial: true }] : [];
        }
        content = prev.content.slice(0, at) + newStr + prev.content.slice(at + oldStr.length);
    }
    if (!content) return [];

    const block: ArtifactBlock = { kind: 'artifact', ...base, content, partial: false };
    if (id !== undefined) artifacts.set(id, block);
    return [block];
};

const fromUpload = (a: ClaudeAttachment): Attachment => ({
    name: a.file_name || 'unnamed',
    ...optional('size', num(a.file_size)),
    ...optional('mimeType', str(a.file_type)),
    source: 'upload',
    ...optional('extractedText', str(a.extracted_content) || undefined),
});

const fromFile = (f: FileAttachment): Attachment => ({
    name: f.file_name || 'unnamed',
    ...optional('size', num(f.size_bytes) ?? num(f.file_size)),
    source: 'file',
});

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

/** `{ [key]: value }`, or `{}` when value is undefined, for exactOptionalPropertyTypes. */
const optional = <K extends string, V>(key: K, value: V | undefined) =>
    (value === undefined ? {} : { [key]: value }) as { [P in K]?: V };

const str = (x: unknown): string | undefined => (typeof x === 'string' ? x : undefined);

const num = (x: unknown): number | undefined => (typeof x === 'number' ? x : undefined);

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
