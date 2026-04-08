import { describe, expect, it } from 'vitest';
import { toHtml } from '../../src/formatters/html';
import { defaultExportOptions } from '../../src/content/types';
import { richConversation, simpleConversation } from '../fixtures/simple';

describe('toHtml', () => {
    it('produces a complete standalone document', () => {
        const html = toHtml(simpleConversation, defaultExportOptions);
        expect(html.startsWith('<!doctype html>')).toBe(true);
        expect(html).toContain('<title>Hello world</title>');
        expect(html).toContain('<style>');
        expect(html).toContain('@media print');
    });

    it('escapes the conversation title and content', () => {
        const html = toHtml(richConversation, defaultExportOptions);
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
        const html = toHtml(evil, defaultExportOptions);
        expect(html).not.toMatch(/<script>alert\(1\)<\/script>/);
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('renders attachments list', () => {
        const html = toHtml(richConversation, defaultExportOptions);
        expect(html).toContain('Attachments');
        expect(html).toContain('spec.pdf');
    });

    it('snapshots simple conversation', () => {
        expect(toHtml(simpleConversation, defaultExportOptions)).toMatchSnapshot();
    });
});
