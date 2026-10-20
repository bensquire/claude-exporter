import { describe, expect, it } from 'vitest';
import { toHtml } from '../../src/formatters/html';
import { toMarkdown } from '../../src/formatters/markdown';
import type { Transcript } from '../../src/transcript/types';

const transcript: Transcript = {
    id: 't',
    title: 'Rendering',
    createdAt: '2026-04-01T10:00:00Z',
    turns: [
        {
            id: 'h',
            role: 'human',
            createdAt: '2026-04-01T10:05:30Z',
            blocks: [
                { kind: 'image', fileId: 'f', name: 'diagram <1>.png' },
                { kind: 'text', text: 'What is this?', format: 'plain' },
            ],
            attachments: [
                {
                    name: 'notes <draft>.txt',
                    size: 12,
                    source: 'upload',
                    extractedText: 'line with ``` and <b>tags</b>',
                },
                { name: 'plain.pdf', source: 'file' },
            ],
        },
        {
            id: 'a',
            role: 'assistant',
            blocks: [{ kind: 'thinking', text: 'Summary of thoughts', summarized: true }],
            attachments: [],
        },
    ],
};

describe('Markdown rendering', () => {
    const md = toMarkdown(transcript);

    it('formats the created time', () => {
        expect(md).toContain('_Created: 2026-04-01 10:00 UTC_');
    });

    it('shows turn times', () => {
        expect(md).toContain('## Human\n\n_2026-04-01 10:05 UTC_\n');
    });

    it('renders image references and summarized thinking', () => {
        expect(md).toContain('_[Image: diagram <1>.png]_');
        expect(md).toContain('<summary>Thinking (summary)</summary>');
    });

    it('embeds extracted attachment text with a fence that fits', () => {
        expect(md).toContain('- notes <draft>.txt (12 bytes)\n- plain.pdf');
        expect(md).toContain('````\nline with ``` and <b>tags</b>\n````');
    });
});

describe('HTML rendering', () => {
    const html = toHtml(transcript);

    it('shows turn times', () => {
        expect(html).toContain('<time datetime="2026-04-01T10:05:30Z">2026-04-01 10:05 UTC</time>');
    });

    it('escapes image names and attachment text', () => {
        expect(html).toContain('[Image: diagram &lt;1&gt;.png]');
        expect(html).toContain(
            '<summary>notes &lt;draft&gt;.txt <span class="size">(12 bytes)</span></summary><pre>line with ``` and &lt;b&gt;tags&lt;/b&gt;</pre>',
        );
        expect(html).not.toContain('<b>tags');
    });

    it('lists attachments without extracted text plainly', () => {
        expect(html).toContain('<li>plain.pdf</li>');
    });
});
