import { describe, expect, it } from 'vitest';
import { toText } from '../../src/formatters/text';
import { toTranscript } from '../../src/transcript/from-claude';
import type { Transcript } from '../../src/transcript/types';
import { richConversation, simpleConversation } from '../fixtures/simple';

const transcript: Transcript = {
    id: 't',
    title: 'Plain',
    createdAt: '2026-04-01T10:00:00Z',
    turns: [
        {
            id: 'h',
            role: 'human',
            createdAt: '2026-04-01T10:05:30Z',
            blocks: [
                { kind: 'image', fileId: 'f', name: 'diagram.png' },
                { kind: 'text', text: '## Kept as typed\n\n\n\nafter gap', format: 'plain' },
            ],
            attachments: [
                { name: 'notes.txt', size: 12, source: 'upload', extractedText: 'note body' },
                { name: 'plain.pdf', source: 'file' },
            ],
        },
        {
            id: 'a',
            role: 'assistant',
            blocks: [
                { kind: 'thinking', text: 'Pondering', summarized: true },
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

describe('toText', () => {
    const text = toText(transcript);

    it('heads each turn with its role and time', () => {
        expect(text).toContain('Plain\nCreated: 2026-04-01 10:00 UTC\n\n');
        expect(text).toContain(`${'-'.repeat(40)}\nHuman · 2026-04-01 10:05 UTC\n\n`);
        expect(text).toContain(`${'-'.repeat(40)}\nAssistant\n\n`);
    });

    it('keeps message and artifact text exactly as written', () => {
        expect(text).toContain('## Kept as typed\n\n\n\nafter gap');
        expect(text).toContain('[Artifact: a.py (v2)]\nx = 1\n\n\n\ny = 2\n[End of artifact]');
    });

    it('brackets thinking and lists attachments with embedded text', () => {
        expect(text).toContain('[Thinking (summary)]\nPondering\n[End of thinking]');
        expect(text).toContain('[Image: diagram.png]');
        expect(text).toContain(
            'Attachments:\n- notes.txt (12 bytes)\n- plain.pdf\n\n[Attachment: notes.txt]\nnote body\n[End of attachment]',
        );
    });

    it('uses no Markdown or HTML of its own', () => {
        const own = toText({ ...transcript, turns: transcript.turns.slice(1) });
        expect(own).not.toMatch(/```|<details>|^#|\*\*/m);
    });

    it('ends with exactly one newline', () => {
        expect(text.endsWith('[End of artifact]\n')).toBe(true);
    });

    it('snapshots simple conversation', () => {
        expect(toText(toTranscript(simpleConversation))).toMatchSnapshot();
    });

    it('snapshots rich conversation', () => {
        expect(toText(toTranscript(richConversation))).toMatchSnapshot();
    });
});
