import type { Transcript } from '../../src/transcript/types';

/** A hand-built transcript covering the block kinds the claude.ai fixtures don't. */
export const renderingTranscript: Transcript = {
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
                { kind: 'text', text: '## What is this?', format: 'plain' },
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
            blocks: [
                { kind: 'thinking', text: 'Summary of thoughts', summarized: true },
                {
                    kind: 'artifact',
                    title: 'a.py',
                    language: 'python',
                    content: 'x = 1\n\n\n\ny = 2',
                    version: 2,
                    partial: false,
                },
            ],
            attachments: [],
        },
    ],
};
