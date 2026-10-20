import { describe, expect, it } from 'vitest';
import {
    escapeHtml,
    pickFence,
    renderBlock,
    renderMessage,
    sanitizeFilename,
    selectActiveBranch,
} from '../../src/formatters/shared';
import { toMarkdown } from '../../src/formatters/markdown';
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
        expect(renderBlock({ type: 'text', text: 'hi' }, defaultExportOptions, new Map())).toEqual([
            { kind: 'text', text: 'hi' },
        ]);
    });

    it('skips empty text blocks', () => {
        expect(renderBlock({ type: 'text', text: '' }, defaultExportOptions, new Map())).toEqual(
            [],
        );
    });

    it('omits thinking when includeThinking is false', () => {
        expect(
            renderBlock(
                { type: 'thinking', thinking: 'x' },
                { ...defaultExportOptions, includeThinking: false },
                new Map(),
            ),
        ).toEqual([]);
    });

    it('emits thinking when enabled', () => {
        expect(
            renderBlock({ type: 'thinking', thinking: 'x' }, defaultExportOptions, new Map()),
        ).toEqual([{ kind: 'thinking', text: 'x' }]);
    });

    it('renders artifacts as code with title', () => {
        const out = renderBlock(
            {
                type: 'tool_use',
                name: 'artifacts',
                input: { title: 'a.js', language: 'javascript', content: 'x' },
            },
            defaultExportOptions,
            new Map(),
        );
        expect(out).toEqual([{ kind: 'code', language: 'javascript', text: 'x', title: 'a.js' }]);
    });

    it('renders generic tool_use', () => {
        const out = renderBlock(
            { type: 'tool_use', name: 'web_search', input: { query: 'a' } },
            defaultExportOptions,
            new Map(),
        );
        expect(out[0]?.kind).toBe('tool_use');
    });

    it('marks tool_result errors', () => {
        const out = renderBlock(
            { type: 'tool_result', content: 'oops', is_error: true },
            defaultExportOptions,
            new Map(),
        );
        expect(out).toEqual([{ kind: 'tool_result', text: 'oops', isError: true }]);
    });

    it('degrades gracefully on unknown block types', () => {
        const out = renderBlock(
            { type: 'future_block', payload: 1 } as never,
            defaultExportOptions,
            new Map(),
        );
        expect(out[0]?.kind).toBe('unknown');
    });
});

const artifact = (input: Record<string, unknown>) =>
    ({ type: 'tool_use', name: 'artifacts', input }) as const;

describe('artifact updates', () => {
    it('applies an update to the previous version of the artifact', () => {
        const store = new Map();
        renderBlock(
            artifact({
                id: 'a1',
                command: 'create',
                title: 'App',
                language: 'js',
                content: 'let x = 1;\nlet y = 2;',
            }),
            defaultExportOptions,
            store,
        );
        const out = renderBlock(
            artifact({ id: 'a1', command: 'update', old_str: 'let y = 2;', new_str: 'let y = 3;' }),
            defaultExportOptions,
            store,
        );
        expect(out).toEqual([
            { kind: 'code', language: 'js', title: 'App', text: 'let x = 1;\nlet y = 3;' },
        ]);
    });

    it('chains successive updates', () => {
        const store = new Map();
        renderBlock(artifact({ id: 'a1', content: 'one' }), defaultExportOptions, store);
        renderBlock(
            artifact({ id: 'a1', command: 'update', old_str: 'one', new_str: 'two' }),
            defaultExportOptions,
            store,
        );
        const out = renderBlock(
            artifact({ id: 'a1', command: 'update', old_str: 'two', new_str: 'three' }),
            defaultExportOptions,
            store,
        );
        expect(out[0]).toMatchObject({ kind: 'code', text: 'three' });
    });

    it('treats $-patterns in new_str literally', () => {
        const store = new Map();
        renderBlock(artifact({ id: 'a1', content: 'price' }), defaultExportOptions, store);
        const out = renderBlock(
            artifact({ id: 'a1', command: 'update', old_str: 'price', new_str: "$& costs $'5" }),
            defaultExportOptions,
            store,
        );
        expect(out[0]).toMatchObject({ text: "$& costs $'5" });
    });

    it('shows a partial update when there is no base version', () => {
        const out = renderBlock(
            artifact({ id: 'missing', command: 'update', old_str: 'a', new_str: 'b' }),
            defaultExportOptions,
            new Map(),
        );
        expect(out).toEqual([
            { kind: 'code', language: '', text: 'b', title: 'Artifact (partial update)' },
        ]);
    });

    it('applies updates across messages in a full export', () => {
        const md = toMarkdown(
            {
                uuid: 'c',
                name: 'Artifacts',
                current_leaf_message_uuid: 'm2',
                chat_messages: [
                    {
                        uuid: 'm1',
                        sender: 'assistant',
                        index: 0,
                        parent_message_uuid: null,
                        content: [artifact({ id: 'a1', title: 'Doc', content: 'Hello world' })],
                    },
                    {
                        uuid: 'm2',
                        sender: 'assistant',
                        index: 1,
                        parent_message_uuid: 'm1',
                        content: [
                            artifact({
                                id: 'a1',
                                command: 'update',
                                old_str: 'world',
                                new_str: 'there',
                            }),
                        ],
                    },
                ],
            },
            defaultExportOptions,
        );
        expect(md).toContain('Hello world');
        expect(md).toContain('Hello there');
        expect(md).not.toContain('partial update');
    });
});

describe('renderMessage', () => {
    it('falls back to flat text when content array is empty', () => {
        const out = renderMessage(
            { uuid: 'x', sender: 'human', index: 0, content: [], text: 'fallback' },
            defaultExportOptions,
            new Map(),
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
