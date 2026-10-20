import { describe, expect, it } from 'vitest';
import { applyOptions } from '../../src/transcript/options';
import type { Transcript } from '../../src/transcript/types';

const transcript: Transcript = {
    id: 't',
    title: 'T',
    turns: [
        {
            id: 'a',
            role: 'assistant',
            blocks: [
                { kind: 'thinking', text: 'hmm', summarized: false },
                { kind: 'text', text: 'hi', format: 'markdown' },
            ],
            attachments: [{ name: 'a.txt', source: 'upload', extractedText: 'body' }],
        },
    ],
};

describe('applyOptions', () => {
    it('keeps everything with both options on', () => {
        expect(applyOptions(transcript, { includeThinking: true, embedAttachments: true })).toEqual(
            transcript,
        );
    });

    it('drops thinking blocks', () => {
        const t = applyOptions(transcript, { includeThinking: false, embedAttachments: true });
        expect(t.turns[0]?.blocks.map((b) => b.kind)).toEqual(['text']);
    });

    it('drops extracted attachment text but keeps the attachment', () => {
        const t = applyOptions(transcript, { includeThinking: true, embedAttachments: false });
        expect(t.turns[0]?.attachments).toEqual([{ name: 'a.txt', source: 'upload' }]);
    });

    it('does not mutate its input', () => {
        const before = structuredClone(transcript);
        applyOptions(transcript, { includeThinking: false, embedAttachments: false });
        expect(transcript).toEqual(before);
    });
});
