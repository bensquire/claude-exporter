import { describe, expect, it } from 'vitest';
import {
    escapeHtml,
    pickFence,
    renderBlock,
    renderMessage,
    sanitizeFilename,
    selectActiveBranch,
} from '../../src/formatters/shared';
import { defaultExportOptions } from '../../src/content/types';
import { branchedConversation, simpleConversation } from '../fixtures/simple';

describe('selectActiveBranch', () => {
    it('returns messages on the active branch in chronological order', () => {
        const branch = selectActiveBranch(branchedConversation);
        expect(branch.map((m) => m.uuid)).toEqual(['b1', 'b2', 'b3']);
        expect(branch.find((m) => m.uuid === 'b2-discarded')).toBeUndefined();
    });

    it('falls back to all messages sorted by index when no leaf set', () => {
        const branch = selectActiveBranch({
            ...simpleConversation,
            current_leaf_message_uuid: null,
        });
        expect(branch.map((m) => m.index)).toEqual([0, 1]);
    });
});

describe('renderBlock', () => {
    it('renders text blocks', () => {
        expect(renderBlock({ type: 'text', text: 'hi' }, defaultExportOptions)).toEqual([
            { kind: 'text', text: 'hi' },
        ]);
    });

    it('skips empty text blocks', () => {
        expect(renderBlock({ type: 'text', text: '' }, defaultExportOptions)).toEqual([]);
    });

    it('omits thinking when includeThinking is false', () => {
        expect(
            renderBlock(
                { type: 'thinking', thinking: 'x' },
                { ...defaultExportOptions, includeThinking: false },
            ),
        ).toEqual([]);
    });

    it('emits thinking when enabled', () => {
        expect(renderBlock({ type: 'thinking', thinking: 'x' }, defaultExportOptions)).toEqual([
            { kind: 'thinking', text: 'x' },
        ]);
    });

    it('renders artifacts as code with title', () => {
        const out = renderBlock(
            {
                type: 'tool_use',
                name: 'artifacts',
                input: { title: 'a.js', language: 'javascript', content: 'x' },
            },
            defaultExportOptions,
        );
        expect(out).toEqual([{ kind: 'code', language: 'javascript', text: 'x', title: 'a.js' }]);
    });

    it('renders generic tool_use', () => {
        const out = renderBlock(
            { type: 'tool_use', name: 'web_search', input: { query: 'a' } },
            defaultExportOptions,
        );
        expect(out[0]?.kind).toBe('tool_use');
    });

    it('marks tool_result errors', () => {
        const out = renderBlock(
            { type: 'tool_result', content: 'oops', is_error: true },
            defaultExportOptions,
        );
        expect(out).toEqual([{ kind: 'tool_result', text: 'oops', isError: true }]);
    });

    it('degrades gracefully on unknown block types', () => {
        const out = renderBlock(
            { type: 'future_block', payload: 1 } as never,
            defaultExportOptions,
        );
        expect(out[0]?.kind).toBe('unknown');
    });
});

describe('renderMessage', () => {
    it('falls back to flat text when content array is empty', () => {
        const out = renderMessage(
            { uuid: 'x', sender: 'human', index: 0, content: [], text: 'fallback' },
            defaultExportOptions,
        );
        expect(out).toEqual([{ kind: 'text', text: 'fallback' }]);
    });
});

describe('escapeHtml', () => {
    it('escapes the dangerous characters', () => {
        expect(escapeHtml('<script>alert("x")</script>')).toBe(
            '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
        );
        expect(escapeHtml("a&b'c")).toBe('a&amp;b&#39;c');
    });
});

describe('pickFence', () => {
    it('picks 3 backticks for normal content', () => {
        expect(pickFence('hello world')).toBe('```');
    });
    it('grows the fence to avoid collisions', () => {
        expect(pickFence('a ``` b')).toBe('````');
        expect(pickFence('a ```` b')).toBe('`````');
    });
});

describe('sanitizeFilename', () => {
    it('replaces path separators and clamps length', () => {
        expect(sanitizeFilename('a/b\\c:d')).toBe('a-b-c-d');
        expect(sanitizeFilename('   ')).toBe('conversation');
        expect(sanitizeFilename('x'.repeat(200)).length).toBeLessThanOrEqual(120);
    });
});
