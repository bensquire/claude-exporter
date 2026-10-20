import type { Block, Transcript, Turn } from '../transcript/types';
import { safeStringify } from '../util';
import {
    artifactLabel,
    formatSize,
    formatTime,
    imageLabel,
    pickFence,
    roleLabel,
    thinkingLabel,
    toolResultLabel,
} from './shared';

export const toMarkdown = (t: Transcript): string => {
    const parts: string[] = [];

    parts.push(`# ${t.title}`);
    parts.push('');
    if (t.createdAt) parts.push(`_Created: ${formatTime(t.createdAt)}_`);
    if (t.updatedAt) parts.push(`_Updated: ${formatTime(t.updatedAt)}_`);
    parts.push('');

    for (const turn of t.turns) {
        parts.push(`## ${roleLabel(turn.role)}`);
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
            return `_${imageLabel(block.name)}_`;
        case 'artifact': {
            const label = artifactLabel(block);
            const header = label ? `\n_${label}_\n` : '';
            return `${header}${codeBlock(block.content, block.language)}`;
        }
        case 'tool_use':
            return `**Tool call: \`${block.name}\`**\n\n${codeBlock(safeStringify(block.input), 'json')}`;
        case 'tool_result':
            return `**${toolResultLabel(block.isError)}**\n\n${codeBlock(block.text)}`;
        case 'unknown':
            return `**Unknown block (\`${block.type}\`)**\n\n${codeBlock(safeStringify(block.raw), 'json')}`;
    }
};

const codeBlock = (text: string, lang = ''): string => {
    const fence = pickFence(text);
    return `${fence}${lang}\n${text}\n${fence}`;
};

const renderAttachments = (turn: Turn): string | null => {
    if (turn.attachments.length === 0) return null;
    const lines = ['**Attachments:**'];
    for (const a of turn.attachments) {
        const size = a.size === undefined ? '' : ` ${formatSize(a.size)}`;
        lines.push(`- ${a.name}${size}`);
    }
    for (const a of turn.attachments) {
        if (a.extractedText === undefined) continue;
        lines.push(
            '',
            `<details><summary>${a.name}</summary>`,
            '',
            codeBlock(a.extractedText),
            '',
            '</details>',
        );
    }
    return lines.join('\n');
};
