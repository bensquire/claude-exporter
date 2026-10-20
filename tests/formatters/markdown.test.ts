import { describe, expect, it } from 'vitest';
import { exportMarkdown } from '../helpers';
import { defaultExportOptions } from '../../src/transcript/options';
import { branchedConversation, richConversation, simpleConversation } from '../fixtures/simple';

describe('toMarkdown', () => {
    it('renders human/assistant turns with thinking collapsed', () => {
        const md = exportMarkdown(simpleConversation);
        expect(md).toContain('# Hello world');
        expect(md).toContain('## Human');
        expect(md).toContain('## Assistant');
        expect(md).toContain('Hello, Claude!');
        expect(md).toContain('<details><summary>Thinking</summary>');
        expect(md).toContain('Hi there!');
    });

    it('omits thinking when disabled', () => {
        const md = exportMarkdown(simpleConversation, {
            ...defaultExportOptions,
            includeThinking: false,
        });
        expect(md).not.toContain('Thinking');
        expect(md).not.toContain('Greeting the user');
    });

    it('only renders the active branch in branched conversations', () => {
        const md = exportMarkdown(branchedConversation);
        expect(md).toContain('Active answer');
        expect(md).not.toContain('Discarded answer');
    });

    it('renders artifacts as fenced code, escapes inner backticks via fence growth', () => {
        const md = exportMarkdown(richConversation);
        // The artifact content contains ``` so the fence must grow.
        expect(md).toMatch(/`{4,}javascript\nconsole\.log\("```hi```"\);\n`{4,}/);
        expect(md).toContain('_Hello.js_');
    });

    it('lists tool calls and tool results', () => {
        const md = exportMarkdown(richConversation);
        expect(md).toContain('Tool call: `web_search`');
        expect(md).toContain('Tool result');
        expect(md).toContain('Result line 1');
    });

    it('lists attachments with size', () => {
        const md = exportMarkdown(richConversation);
        expect(md).toContain('**Attachments:**');
        expect(md).toContain('spec.pdf');
        expect(md).toContain('12345 bytes');
    });

    it('produces stable output (snapshot)', () => {
        expect(exportMarkdown(simpleConversation)).toMatchSnapshot();
    });
});
