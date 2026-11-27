import type { Block, Source, Transcript, Turn } from '../transcript/types';
import { safeStringify } from '../util';
import {
    artifactLabel,
    attachmentLabel,
    formatTime,
    imageLabel,
    isWebUrl,
    pickFence,
    roleLabel,
    thinkingLabel,
    toolCallSummaryHtml,
    toolResultSummaryHtml,
    unknownBlockLabel,
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
            return collapsed(thinkingLabel(block.summarized), block.text);
        case 'image':
            return block.url
                ? `_[Image: ${linkText(block.name)}](${block.url})_`
                : `_${imageLabel(block.name)}_`;
        case 'artifact': {
            const label = artifactLabel(block);
            const header = label ? `\n_${label}_\n` : '';
            return `${header}${codeBlock(block.content, block.language)}`;
        }
        case 'tool_use':
            return collapsed(
                toolCallSummaryHtml(block),
                codeBlock(safeStringify(block.input), 'json'),
            );
        case 'tool_result':
            return collapsed(
                toolResultSummaryHtml(block),
                [
                    (block.sources ?? []).map(sourceItem).join('\n'),
                    block.text && codeBlock(block.text),
                ]
                    .filter(Boolean)
                    .join('\n\n'),
            );
        case 'unknown':
            return `**${unknownBlockLabel(`\`${block.type}\``)}**\n\n${codeBlock(safeStringify(block.raw), 'json')}`;
    }
};

/** `summaryHtml` is HTML, where Markdown isn't read; the blank lines make `body` Markdown again. */
const collapsed = (summaryHtml: string, body: string): string =>
    `<details><summary>${summaryHtml}</summary>\n\n${body}\n\n</details>`;

const linkText = (text: string): string => text.replace(/\s+/g, ' ').replace(/[[\]\\]/g, '\\$&');

/** Characters that would end a Markdown link target early are percent-encoded. */
const linkTarget = (url: string): string =>
    url.replace(
        /[\s()<>]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`,
    );

const sourceItem = (s: Source): string =>
    isWebUrl(s.url) ? `- [${linkText(s.title)}](${linkTarget(s.url)})` : `- ${linkText(s.title)}`;

const codeBlock = (text: string, lang = ''): string => {
    const fence = pickFence(text);
    return `${fence}${lang}\n${text}\n${fence}`;
};

const renderAttachments = (turn: Turn): string | null => {
    if (turn.attachments.length === 0) return null;
    const lines = ['**Attachments:**'];
    for (const a of turn.attachments) {
        lines.push(`- ${attachmentLabel(a)}`);
    }
    for (const a of turn.attachments) {
        if (a.extractedText === undefined) continue;
        lines.push('', collapsed(a.name, codeBlock(a.extractedText)));
    }
    return lines.join('\n');
};
