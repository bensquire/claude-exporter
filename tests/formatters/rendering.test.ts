import { describe, expect, it } from 'vitest';
import { toHtml } from '../../src/formatters/html';
import { toMarkdown } from '../../src/formatters/markdown';
import { toText } from '../../src/formatters/text';
import type { ImageBlock, Transcript } from '../../src/transcript/types';
import { renderingTranscript } from '../fixtures/transcript';

const transcript = renderingTranscript;

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

const url = 'https://claude.ai/api/o/files/f/preview';
const withImage = (image: Partial<ImageBlock>): Transcript => ({
    id: 't',
    title: 'Images',
    turns: [
        {
            id: 'h',
            role: 'human',
            blocks: [{ kind: 'image', fileId: 'f', name: 'oven [1].jpeg', ...image }],
            attachments: [],
        },
    ],
});

describe('Images', () => {
    it('links to the preview in Markdown and plain text', () => {
        expect(toMarkdown(withImage({ url }))).toContain(`_[Image: oven \\[1\\].jpeg](${url})_`);
        expect(toText(withImage({ url }))).toContain(`[Image: oven [1].jpeg] ${url}`);
    });

    it('embeds the preview in HTML, sized and escaped', () => {
        const html = toHtml(
            withImage({ url, width: 952, height: 1269, dataUrl: 'data:image/webp;base64,AA"=' }),
        );
        expect(html).toContain(
            '<figure class="image"><img src="data:image/webp;base64,AA&quot;=" alt="oven [1].jpeg" width="952" height="1269"></figure>',
        );
        expect(html).not.toContain(url);
    });

    it('links instead when the image was not embedded', () => {
        expect(toHtml(withImage({ url }))).toContain(
            `<p class="image-ref"><a href="${url}">[Image: oven [1].jpeg]</a></p>`,
        );
    });

    it('puts consecutive images in one row, broken by other blocks', () => {
        const img = (fileId: string) => ({ kind: 'image', fileId, name: fileId, url }) as const;
        const html = toHtml({
            ...withImage({}),
            turns: [
                {
                    id: 'h',
                    role: 'human',
                    blocks: [
                        img('a'),
                        img('b'),
                        { kind: 'text', text: 'between', format: 'plain' },
                        img('c'),
                    ],
                    attachments: [],
                },
            ],
        });
        const rows = html.match(/<div class="images">.*?<\/div>/g) ?? [];
        expect(rows.map((r) => (r.match(/image-ref/g) ?? []).length)).toEqual([2, 1]);
        expect(html.indexOf('between')).toBeGreaterThan(html.indexOf(rows[0] ?? ''));
    });

    it('never puts anything but image data in an img src', () => {
        const html = toHtml(withImage({ url, dataUrl: 'https://evil.example/x.png' }));
        expect(html).not.toContain('<img');
        expect(html).not.toContain('evil.example');
    });
});
