import { describe, expect, it } from 'vitest';
import { exportHtml, exportMarkdown } from './helpers';
import type { ChatConversation } from '../src/content/types';
import { extractConversationUuid } from '../src/content/api';

const empty: ChatConversation = {
    uuid: 'e',
    name: 'Empty',
    current_leaf_message_uuid: null,
    chat_messages: [],
};

describe('edge cases', () => {
    it('handles an empty conversation without throwing', () => {
        expect(() => exportMarkdown(empty)).not.toThrow();
        expect(() => exportHtml(empty)).not.toThrow();
        expect(exportMarkdown(empty)).toContain('# Empty');
    });

    it('handles a single message', () => {
        const single: ChatConversation = {
            uuid: 's',
            name: 'Single',
            current_leaf_message_uuid: 'a',
            chat_messages: [
                {
                    uuid: 'a',
                    sender: 'human',
                    index: 0,
                    parent_message_uuid: null,
                    content: [{ type: 'text', text: 'only message' }],
                },
            ],
        };
        expect(exportMarkdown(single)).toContain('only message');
    });

    it('handles unicode and emoji', () => {
        const u: ChatConversation = {
            uuid: 'u',
            name: 'Unicode 🌍',
            current_leaf_message_uuid: 'a',
            chat_messages: [
                {
                    uuid: 'a',
                    sender: 'human',
                    index: 0,
                    parent_message_uuid: null,
                    content: [{ type: 'text', text: '你好 👋 — שלום' }],
                },
            ],
        };
        expect(exportMarkdown(u)).toContain('你好 👋 — שלום');
        expect(exportHtml(u)).toContain('Unicode 🌍');
    });

    it('handles missing optional message fields', () => {
        const m: ChatConversation = {
            uuid: 'm',
            name: 'Missing',
            current_leaf_message_uuid: 'a',
            chat_messages: [
                {
                    uuid: 'a',
                    sender: 'assistant',
                    index: 0,
                    content: [],
                } as never,
            ],
        };
        expect(() => exportMarkdown(m)).not.toThrow();
    });

    it('handles a long conversation', () => {
        const messages = Array.from({ length: 200 }, (_, i) => ({
            uuid: `m${i}`,
            sender: i % 2 === 0 ? ('human' as const) : ('assistant' as const),
            index: i,
            parent_message_uuid: i === 0 ? null : `m${i - 1}`,
            content: [{ type: 'text' as const, text: `message ${i}` }],
        }));
        const long: ChatConversation = {
            uuid: 'l',
            name: 'Long',
            current_leaf_message_uuid: 'm199',
            chat_messages: messages,
        };
        const md = exportMarkdown(long);
        expect(md).toContain('message 0');
        expect(md).toContain('message 199');
    });
});

describe('extractConversationUuid', () => {
    it('extracts uuid from a chat URL', () => {
        expect(
            extractConversationUuid('https://claude.ai/chat/bf625a17-50a8-4611-9911-0afcf84a03b1'),
        ).toBe('bf625a17-50a8-4611-9911-0afcf84a03b1');
    });
    it('returns null on non-chat URLs', () => {
        expect(extractConversationUuid('https://claude.ai/new')).toBeNull();
        expect(extractConversationUuid('https://claude.ai/')).toBeNull();
    });
});
