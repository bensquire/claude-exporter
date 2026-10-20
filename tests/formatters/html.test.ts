import { describe, expect, it } from 'vitest';
import { toHtmlFragment } from '../../src/formatters/html';
import { toTranscript } from '../../src/transcript/from-claude';
import { conversationOf, exportHtml } from '../helpers';
import { richConversation, simpleConversation } from '../fixtures/simple';

describe('toHtml', () => {
    it('produces a complete standalone document', () => {
        const html = exportHtml(simpleConversation);
        expect(html.startsWith('<!doctype html>')).toBe(true);
        expect(html).toContain('<title>Hello world</title>');
        expect(html).toContain('<style>');
        expect(html).toContain('@media print');
    });

    it('escapes the conversation title and content', () => {
        const html = exportHtml(richConversation);
        expect(html).toContain('Rich content with `backticks` and &lt;html&gt;');
        expect(html).toContain('Done — see &lt;above&gt;.');
        expect(html).not.toContain('<above>');
    });

    it('escapes code block content (no script execution risk)', () => {
        const evil = {
            ...simpleConversation,
            chat_messages: [
                {
                    uuid: 'e1',
                    sender: 'assistant' as const,
                    index: 0,
                    parent_message_uuid: null,
                    content: [{ type: 'text' as const, text: '<script>alert(1)</script>' }],
                },
            ],
            current_leaf_message_uuid: 'e1',
        };
        const html = exportHtml(evil);
        expect(html).not.toMatch(/<script>alert\(1\)<\/script>/);
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    describe('markdown rendering', () => {
        const withText = (sender: 'human' | 'assistant', text: string) =>
            exportHtml(conversationOf({ sender, content: [{ type: 'text', text }] }));

        it('renders assistant markdown: code fences, lists, tables', () => {
            const html = withText(
                'assistant',
                '## Plan\n\n- one\n- two\n\n```py\nx = 1\n\ny = 2\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |',
            );
            expect(html).toContain('<h2>Plan</h2>');
            expect(html).toContain('<li>one</li>');
            expect(html).toContain('<pre><code class="language-py">x = 1\n\ny = 2\n</code></pre>');
            expect(html).toContain('<td>1</td>');
        });

        it('leaves human messages verbatim', () => {
            const html = withText('human', '## not a heading\n- not a list');
            expect(html).toContain('<p>## not a heading<br>- not a list</p>');
        });

        it('escapes raw HTML inside assistant markdown', () => {
            const html = withText('assistant', 'Hi <img src=x onerror=alert(1)> there');
            expect(html).not.toContain('<img');
            expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
        });

        it('drops javascript: links', () => {
            const html = withText('assistant', '[click](javascript:alert(1))');
            expect(html).not.toMatch(/href="javascript:/i);
        });

        it('never emits images, so opening an export makes no network requests', () => {
            const html = withText('assistant', '![pixel](https://tracker.example/p.png?d=secret)');
            expect(html).not.toContain('<img');
        });
    });

    it('renders attachments list', () => {
        const html = exportHtml(richConversation);
        expect(html).toContain('Attachments');
        expect(html).toContain('spec.pdf');
    });

    it('snapshots simple conversation', () => {
        expect(exportHtml(simpleConversation)).toMatchSnapshot();
    });
});

describe('toHtmlFragment', () => {
    const fragment = toHtmlFragment(toTranscript(richConversation));

    it('has the conversation but no document wrapper or styles', () => {
        expect(fragment.startsWith('<h1>')).toBe(true);
        expect(fragment).toContain('Make me an artifact and call a tool.');
        expect(fragment).not.toMatch(/<(html|head|style|body)[\s>]/);
    });

    it('is exactly what the full document wraps', () => {
        expect(exportHtml(richConversation)).toContain(fragment);
    });
});
