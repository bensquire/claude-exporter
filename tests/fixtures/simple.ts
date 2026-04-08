import type { ChatConversation } from '../../src/content/types';

export const simpleConversation: ChatConversation = {
    uuid: 'conv-1',
    name: 'Hello world',
    created_at: '2026-04-01T10:00:00Z',
    current_leaf_message_uuid: 'm2',
    chat_messages: [
        {
            uuid: 'm1',
            sender: 'human',
            index: 0,
            parent_message_uuid: null,
            content: [{ type: 'text', text: 'Hello, Claude!' }],
        },
        {
            uuid: 'm2',
            sender: 'assistant',
            index: 1,
            parent_message_uuid: 'm1',
            content: [
                { type: 'thinking', thinking: 'Greeting the user.' },
                { type: 'text', text: 'Hi there! How can I help?' },
            ],
        },
    ],
};

export const branchedConversation: ChatConversation = {
    uuid: 'conv-2',
    name: 'Branched chat',
    current_leaf_message_uuid: 'b3',
    chat_messages: [
        {
            uuid: 'b1',
            sender: 'human',
            index: 0,
            parent_message_uuid: null,
            content: [{ type: 'text', text: 'Question' }],
        },
        {
            uuid: 'b2-discarded',
            sender: 'assistant',
            index: 1,
            parent_message_uuid: 'b1',
            content: [{ type: 'text', text: 'Discarded answer (other branch)' }],
        },
        {
            uuid: 'b2',
            sender: 'assistant',
            index: 1,
            parent_message_uuid: 'b1',
            content: [{ type: 'text', text: 'Active answer' }],
        },
        {
            uuid: 'b3',
            sender: 'human',
            index: 2,
            parent_message_uuid: 'b2',
            content: [{ type: 'text', text: 'Follow up' }],
        },
    ],
};

export const richConversation: ChatConversation = {
    uuid: 'conv-3',
    name: 'Rich content with `backticks` and <html>',
    current_leaf_message_uuid: 'r2',
    chat_messages: [
        {
            uuid: 'r1',
            sender: 'human',
            index: 0,
            parent_message_uuid: null,
            content: [{ type: 'text', text: 'Make me an artifact and call a tool.' }],
            attachments: [
                { file_name: 'spec.pdf', file_size: 12345, file_type: 'application/pdf' },
            ],
        },
        {
            uuid: 'r2',
            sender: 'assistant',
            index: 1,
            parent_message_uuid: 'r1',
            content: [
                {
                    type: 'tool_use',
                    name: 'artifacts',
                    input: {
                        title: 'Hello.js',
                        language: 'javascript',
                        content: 'console.log("```hi```");',
                    },
                },
                {
                    type: 'tool_use',
                    name: 'web_search',
                    input: { query: 'claude.ai api' },
                },
                {
                    type: 'tool_result',
                    content: [{ type: 'text', text: 'Result line 1\nResult line 2' }],
                },
                { type: 'text', text: 'Done — see <above>.' },
            ],
        },
    ],
};
