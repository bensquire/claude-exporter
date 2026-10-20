import type { Block, Transcript, Turn } from '../transcript/types';
import { safeStringify } from '../util';
import {
    artifactLabel,
    formatSize,
    formatTime,
    imageLabel,
    roleLabel,
    thinkingLabel,
    toolResultLabel,
} from './shared';

const RULE = '-'.repeat(40);

/** Message text is kept as written; only the export's own structure avoids Markdown. */
export const toText = (t: Transcript): string => {
    const header = [t.title];
    if (t.createdAt) header.push(`Created: ${formatTime(t.createdAt)}`);
    if (t.updatedAt) header.push(`Updated: ${formatTime(t.updatedAt)}`);
    return [header.join('\n'), ...t.turns.map(renderTurn)].join('\n\n') + '\n';
};

const renderTurn = (turn: Turn): string => {
    const time = turn.createdAt ? ` · ${formatTime(turn.createdAt)}` : '';
    const sections = [`${RULE}\n${roleLabel(turn.role)}${time}`, ...turn.blocks.map(renderBlock)];
    if (turn.attachments.length > 0) sections.push(renderAttachments(turn));
    return sections.join('\n\n');
};

const renderBlock = (block: Block): string => {
    switch (block.kind) {
        case 'text':
            return block.text;
        case 'thinking':
            return delimited(thinkingLabel(block.summarized), 'thinking', block.text);
        case 'image':
            return imageLabel(block.name);
        case 'artifact': {
            const label = artifactLabel(block);
            return delimited(label ? `Artifact: ${label}` : 'Artifact', 'artifact', block.content);
        }
        case 'tool_use':
            return delimited(`Tool call: ${block.name}`, 'tool call', safeStringify(block.input));
        case 'tool_result':
            return delimited(toolResultLabel(block.isError), 'tool result', block.text);
        case 'unknown':
            return delimited(`Unknown block: ${block.type}`, 'block', safeStringify(block.raw));
    }
};

/** Brackets multi-line content so its end is visible without Markdown fences. */
const delimited = (label: string, endOf: string, body: string): string =>
    `[${label}]\n${body}\n[End of ${endOf}]`;

const renderAttachments = (turn: Turn): string => {
    const list = turn.attachments.map(
        (a) => `- ${a.name}${a.size === undefined ? '' : ` ${formatSize(a.size)}`}`,
    );
    const embedded = turn.attachments.flatMap((a) =>
        a.extractedText === undefined
            ? []
            : [delimited(`Attachment: ${a.name}`, 'attachment', a.extractedText)],
    );
    return [['Attachments:', ...list].join('\n'), ...embedded].join('\n\n');
};
