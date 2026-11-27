import { describe, expect, it } from 'vitest';
import { applyOptions, defaultExportOptions } from '../../src/transcript/options';
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
                { kind: 'tool_use', name: 'web_search', input: { query: 'q' } },
                { kind: 'tool_result', name: 'web_search', text: 'found', isError: false },
                { kind: 'artifact', language: 'js', content: 'x', version: 1, partial: false },
                { kind: 'text', text: 'hi', format: 'markdown' },
            ],
            attachments: [{ name: 'a.txt', source: 'upload', extractedText: 'body' }],
        },
    ],
};

const kinds = (t: Transcript) => t.turns[0]?.blocks.map((b) => b.kind);

describe('applyOptions', () => {
    it('keeps everything by default', () => {
        expect(applyOptions(transcript, defaultExportOptions)).toEqual(transcript);
    });

    it('drops thinking blocks', () => {
        const t = applyOptions(transcript, { ...defaultExportOptions, includeThinking: false });
        expect(kinds(t)).toEqual(['tool_use', 'tool_result', 'artifact', 'text']);
    });

    it('drops tool calls and results, but not artifacts', () => {
        const t = applyOptions(transcript, { ...defaultExportOptions, includeToolCalls: false });
        expect(kinds(t)).toEqual(['thinking', 'artifact', 'text']);
    });

    it('drops extracted attachment text but keeps the attachment', () => {
        const t = applyOptions(transcript, { ...defaultExportOptions, embedAttachments: false });
        expect(t.turns[0]?.attachments).toEqual([{ name: 'a.txt', source: 'upload' }]);
    });

    it('does not mutate its input', () => {
        const before = structuredClone(transcript);
        applyOptions(transcript, {
            includeThinking: false,
            includeToolCalls: false,
            embedAttachments: false,
        });
        expect(transcript).toEqual(before);
    });
});
