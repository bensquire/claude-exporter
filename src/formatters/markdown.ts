import type { ChatConversation, ChatMessage, ExportOptions } from '../content/types';
import { pickFence, renderMessage, selectActiveBranch, type RenderedFragment } from './shared';

export const toMarkdown = (conversation: ChatConversation, options: ExportOptions): string => {
    const messages = selectActiveBranch(conversation);
    const parts: string[] = [];

    parts.push(`# ${conversation.name || 'Claude conversation'}`);
    parts.push('');
    if (conversation.created_at) parts.push(`_Created: ${conversation.created_at}_`);
    if (conversation.updated_at) parts.push(`_Updated: ${conversation.updated_at}_`);
    parts.push('');

    for (const msg of messages) {
        parts.push(roleHeader(msg));
        parts.push('');
        for (const frag of renderMessage(msg, options)) {
            parts.push(renderFragment(frag));
            parts.push('');
        }
        const attachments = renderAttachments(msg);
        if (attachments) {
            parts.push(attachments);
            parts.push('');
        }
        parts.push('---');
        parts.push('');
    }

    return (
        parts
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trimEnd() + '\n'
    );
};

const roleHeader = (msg: ChatMessage): string =>
    msg.sender === 'human' ? '## Human' : '## Assistant';

const renderFragment = (frag: RenderedFragment): string => {
    switch (frag.kind) {
        case 'text':
            return frag.text;
        case 'thinking':
            return `<details><summary>Thinking</summary>\n\n${frag.text}\n\n</details>`;
        case 'code': {
            const fence = pickFence(frag.text);
            const lang = frag.language || '';
            const header = frag.title ? `\n_${frag.title}_\n` : '';
            return `${header}${fence}${lang}\n${frag.text}\n${fence}`;
        }
        case 'tool_use': {
            const fence = pickFence(frag.input);
            return `**Tool call: \`${frag.name}\`**\n\n${fence}json\n${frag.input}\n${fence}`;
        }
        case 'tool_result': {
            const fence = pickFence(frag.text);
            const label = frag.isError ? 'Tool error' : 'Tool result';
            return `**${label}**\n\n${fence}\n${frag.text}\n${fence}`;
        }
        case 'unknown': {
            const fence = pickFence(frag.text);
            return `**Unknown block (\`${frag.type}\`)**\n\n${fence}json\n${frag.text}\n${fence}`;
        }
    }
};

const renderAttachments = (msg: ChatMessage): string | null => {
    const atts = msg.attachments ?? [];
    const files = msg.files ?? [];
    if (atts.length === 0 && files.length === 0) return null;
    const lines = ['**Attachments:**'];
    for (const a of atts) {
        const name = a.file_name ?? 'unnamed';
        const size = typeof a.file_size === 'number' ? ` (${a.file_size} bytes)` : '';
        lines.push(`- ${name}${size}`);
    }
    for (const f of files) {
        const name = f.file_name ?? 'unnamed';
        const size = typeof f.file_size === 'number' ? ` (${f.file_size} bytes)` : '';
        lines.push(`- ${name}${size}`);
    }
    return lines.join('\n');
};
