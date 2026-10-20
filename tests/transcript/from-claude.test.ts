import { describe, expect, it } from 'vitest';
import type { ContentBlock } from '../../src/content/types';
import { selectActiveBranch, toTranscript } from '../../src/transcript/from-claude';
import { branchedConversation, richConversation, simpleConversation } from '../fixtures/simple';
import { conversationOf, exportMarkdown } from '../helpers';

const blocksOf = (content: ContentBlock[], sender: 'human' | 'assistant' = 'assistant') =>
    toTranscript(conversationOf({ sender, content })).turns[0]?.blocks;

const artifact = (input: Record<string, unknown>) =>
    ({ type: 'tool_use', name: 'artifacts', input }) as const;

describe('selectActiveBranch', () => {
    it('returns messages on the active branch in chronological order', () => {
        const branch = selectActiveBranch(branchedConversation);
        expect(branch.map((m) => m.uuid)).toEqual(['b1', 'b2', 'b3']);
    });

    it('falls back to all messages sorted by index when no leaf set', () => {
        const branch = selectActiveBranch({
            ...simpleConversation,
            current_leaf_message_uuid: null,
        });
        expect(branch.map((m) => m.index)).toEqual([0, 1]);
    });
});

describe('toTranscript', () => {
    it('maps conversation and turn metadata', () => {
        const t = toTranscript(simpleConversation);
        expect(t).toMatchObject({
            id: 'conv-1',
            title: 'Hello world',
            createdAt: '2026-04-01T10:00:00Z',
        });
        expect(t.turns.map((turn) => [turn.id, turn.role])).toEqual([
            ['m1', 'human'],
            ['m2', 'assistant'],
        ]);
    });

    it('falls back to a default title', () => {
        expect(toTranscript({ ...simpleConversation, name: '' }).title).toBe('Claude conversation');
    });

    it('keeps the model only when it is a string', () => {
        expect(toTranscript({ ...simpleConversation, model: 'claude-x' }).model).toBe('claude-x');
        expect(toTranscript({ ...simpleConversation, model: { id: 1 } })).not.toHaveProperty(
            'model',
        );
    });

    it('omits optional fields rather than setting them to undefined', () => {
        const t = toTranscript(conversationOf({ content: [] }));
        expect(Object.keys(t)).toEqual(['id', 'title', 'turns']);
        expect(Object.keys(t.turns[0] ?? {})).toEqual(['id', 'role', 'blocks', 'attachments']);
    });
});

describe('blocks', () => {
    it('marks assistant text as markdown and human text as plain', () => {
        expect(blocksOf([{ type: 'text', text: 'hi' }], 'assistant')).toEqual([
            { kind: 'text', text: 'hi', format: 'markdown' },
        ]);
        expect(blocksOf([{ type: 'text', text: 'hi' }], 'human')).toEqual([
            { kind: 'text', text: 'hi', format: 'plain' },
        ]);
    });

    it('skips empty text blocks', () => {
        expect(blocksOf([{ type: 'text', text: '' }])).toEqual([]);
    });

    it('falls back to flat message text when content is empty', () => {
        const t = toTranscript(conversationOf({ sender: 'human', content: [], text: 'fallback' }));
        expect(t.turns[0]?.blocks).toEqual([{ kind: 'text', text: 'fallback', format: 'plain' }]);
    });

    it('reads thinking from either field', () => {
        expect(blocksOf([{ type: 'thinking', thinking: 'a' }])).toEqual([
            { kind: 'thinking', text: 'a', summarized: false },
        ]);
        expect(blocksOf([{ type: 'thinking', text: 'b' }])).toEqual([
            { kind: 'thinking', text: 'b', summarized: false },
        ]);
    });

    it('falls back to thinking summaries when the full text was not kept', () => {
        expect(
            blocksOf([
                {
                    type: 'thinking',
                    thinking: '',
                    summaries: [{ summary: 'First' }, { summary: 'Second' }],
                } as never,
            ]),
        ).toEqual([{ kind: 'thinking', text: 'First\n\nSecond', summarized: true }]);
        expect(blocksOf([{ type: 'thinking', thinking: '', summaries: [] } as never])).toEqual([]);
    });

    it('drops contentless marker blocks such as token_budget', () => {
        expect(
            blocksOf([
                { type: 'token_budget', start_timestamp: 'a', stop_timestamp: 'b' } as never,
                { type: 'text', text: 'kept' },
            ]),
        ).toEqual([{ kind: 'text', text: 'kept', format: 'markdown' }]);
    });

    it('keeps tool input as structured data', () => {
        expect(blocksOf([{ type: 'tool_use', name: 'web_search', input: { query: 'a' } }])).toEqual(
            [{ kind: 'tool_use', name: 'web_search', input: { query: 'a' } }],
        );
    });

    it('flattens tool results and marks errors', () => {
        expect(
            blocksOf([
                {
                    type: 'tool_result',
                    content: [{ type: 'text', text: 'a' }, 'b'],
                    is_error: true,
                },
            ]),
        ).toEqual([{ kind: 'tool_result', text: 'a\nb', isError: true }]);
    });

    it('keeps unknown block types whole', () => {
        const block = { type: 'future_block', payload: 1 };
        expect(blocksOf([block as never])).toEqual([
            { kind: 'unknown', type: 'future_block', raw: block },
        ]);
    });
});

describe('artifacts', () => {
    const artifactsOf = (...inputs: Record<string, unknown>[]) =>
        toTranscript(
            conversationOf(...inputs.map((input) => ({ content: [artifact(input)] }))),
        ).turns.flatMap((turn) => turn.blocks);

    it('converts an artifact with its title and language', () => {
        expect(
            artifactsOf({ id: 'a1', title: 'a.js', language: 'javascript', content: 'x' }),
        ).toEqual([
            {
                kind: 'artifact',
                id: 'a1',
                title: 'a.js',
                language: 'javascript',
                content: 'x',
                version: 1,
                partial: false,
            },
        ]);
    });

    it('applies updates across messages and counts versions', () => {
        const blocks = artifactsOf(
            { id: 'a1', title: 'App', language: 'js', content: 'let x = 1;\nlet y = 2;' },
            { id: 'a1', command: 'update', old_str: 'let y = 2;', new_str: 'let y = 3;' },
            { id: 'a1', command: 'update', old_str: 'x = 1', new_str: 'x = 5' },
        );
        expect(blocks.at(-1)).toEqual({
            kind: 'artifact',
            id: 'a1',
            title: 'App',
            language: 'js',
            content: 'let x = 5;\nlet y = 3;',
            version: 3,
            partial: false,
        });
    });

    it('treats $-patterns in new_str literally', () => {
        const blocks = artifactsOf(
            { id: 'a1', content: 'price' },
            { id: 'a1', command: 'update', old_str: 'price', new_str: "$& costs $'5" },
        );
        expect(blocks.at(-1)).toMatchObject({ content: "$& costs $'5" });
    });

    it('keeps an update with no base version as a partial artifact', () => {
        expect(
            artifactsOf({ id: 'missing', command: 'update', old_str: 'a', new_str: 'b' }),
        ).toEqual([
            {
                kind: 'artifact',
                id: 'missing',
                language: '',
                content: 'b',
                version: 1,
                partial: true,
            },
        ]);
    });

    it('labels partial updates in exports', () => {
        const md = exportMarkdown(
            conversationOf({
                content: [artifact({ id: 'x', command: 'update', old_str: 'a', new_str: 'b' })],
            }),
        );
        expect(md).toContain('_Artifact (partial update)_');
    });
});

describe('attachments', () => {
    it('merges uploads and files, in that order', () => {
        const t = toTranscript(
            conversationOf({
                content: [],
                attachments: [
                    {
                        file_name: 'notes.txt',
                        file_size: 12,
                        file_type: 'text/plain',
                        extracted_content: 'hello',
                    },
                ],
                files: [{ file_name: 'photo.png', file_size: 99 }],
            }),
        );
        expect(t.turns[0]?.attachments).toEqual([
            {
                name: 'notes.txt',
                size: 12,
                mimeType: 'text/plain',
                source: 'upload',
                extractedText: 'hello',
            },
            { name: 'photo.png', size: 99, source: 'file' },
        ]);
    });

    it('reads file sizes from size_bytes, falling back to file_size', () => {
        const t = toTranscript(
            conversationOf({
                content: [],
                files: [
                    { file_uuid: 'f1', file_name: 'a.pdf', size_bytes: 10 },
                    { file_uuid: 'f2', file_name: 'b.pdf', file_size: 20 },
                ],
            }),
        );
        expect(t.turns[0]?.attachments.map((a) => a.size)).toEqual([10, 20]);
    });

    it('turns image blocks into references and keeps those files out of attachments', () => {
        const t = toTranscript(
            conversationOf({
                sender: 'human',
                content: [
                    { type: 'image', file_uuid: 'img' } as never,
                    { type: 'text', text: 'see' },
                ],
                files: [
                    { file_uuid: 'img', file_name: 'photo.png', file_kind: 'image' },
                    { file_uuid: 'doc', file_name: 'spec.pdf', file_kind: 'document' },
                ],
            }),
        );
        expect(t.turns[0]?.blocks[0]).toEqual({ kind: 'image', fileId: 'img', name: 'photo.png' });
        expect(t.turns[0]?.attachments.map((a) => a.name)).toEqual(['spec.pdf']);
    });

    it('names unnamed attachments and drops empty extracted text', () => {
        const t = toTranscript(
            conversationOf({ content: [], attachments: [{ extracted_content: '' }] }),
        );
        expect(t.turns[0]?.attachments).toEqual([{ name: 'unnamed', source: 'upload' }]);
    });

    it('converts the rich fixture end to end', () => {
        const turn = toTranscript(richConversation).turns[0];
        expect(turn?.attachments).toEqual([
            { name: 'spec.pdf', size: 12345, mimeType: 'application/pdf', source: 'upload' },
        ]);
    });
});
