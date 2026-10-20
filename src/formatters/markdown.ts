import type { Block, Transcript, Turn } from '../transcript/types';
import { artifactLabel, formatTime, pickFence, safeStringify, thinkingLabel } from './shared';

export const toMarkdown = (t: Transcript): string => {
    const parts: string[] = [];

    parts.push(`# ${t.title}`);
    parts.push('');
    if (t.createdAt) parts.push(`_Created: ${formatTime(t.createdAt)}_`);
    if (t.updatedAt) parts.push(`_Updated: ${formatTime(t.updatedAt)}_`);
    parts.push('');

    for (const turn of t.turns) {
        parts.push(turn.role === 'human' ? '## Human' : '## Assistant');
        parts.push('');
        if (turn.createdAt) {
            parts.push(`_${formatTime(turn.createdAt)}_`);
            parts.push('');
        }
        for (const block of turn.blocks) {
            parts.push(renderBlock(block));
            parts.push('');
        }
        const attachments = renderAttachments(turn);
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

const renderBlock = (block: Block): string => {
    switch (block.kind) {
        case 'text':
            return block.text;
        case 'thinking':
            return `<details><summary>${thinkingLabel(block.summarized)}</summary>\n\n${block.text}\n\n</details>`;
        case 'image':
            return `_[Image: ${block.name}]_`;
        case 'artifact': {
            const fence = pickFence(block.content);
            const label = artifactLabel(block);
            const header = label ? `\n_${label}_\n` : '';
            return `${header}${fence}${block.language}\n${block.content}\n${fence}`;
        }
        case 'tool_use': {
            const input = safeStringify(block.input);
            const fence = pickFence(input);
            return `**Tool call: \`${block.name}\`**\n\n${fence}json\n${input}\n${fence}`;
        }
        case 'tool_result': {
            const fence = pickFence(block.text);
            const label = block.isError ? 'Tool error' : 'Tool result';
            return `**${label}**\n\n${fence}\n${block.text}\n${fence}`;
        }
        case 'unknown': {
            const raw = safeStringify(block.raw);
            const fence = pickFence(raw);
            return `**Unknown block (\`${block.type}\`)**\n\n${fence}json\n${raw}\n${fence}`;
        }
    }
};

const renderAttachments = (turn: Turn): string | null => {
    if (turn.attachments.length === 0) return null;
    const lines = ['**Attachments:**'];
    for (const a of turn.attachments) {
        const size = a.size === undefined ? '' : ` (${a.size} bytes)`;
        lines.push(`- ${a.name}${size}`);
    }
    for (const a of turn.attachments) {
        if (a.extractedText === undefined) continue;
        const fence = pickFence(a.extractedText);
        lines.push(
            '',
            `<details><summary>${a.name}</summary>`,
            '',
            `${fence}\n${a.extractedText}\n${fence}`,
            '',
            '</details>',
        );
    }
    return lines.join('\n');
};
