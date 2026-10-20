import { describe, expect, it } from 'vitest';
import { toText } from '../../src/formatters/text';
import { toTranscript } from '../../src/transcript/from-claude';
import { richConversation, simpleConversation } from '../fixtures/simple';
import { renderingTranscript } from '../fixtures/transcript';

describe('toText', () => {
    const text = toText(renderingTranscript);

    it('keeps message and artifact text exactly as written', () => {
        expect(text).toContain('\n## What is this?\n');
        expect(text).toContain('x = 1\n\n\n\ny = 2');
    });

    it('uses no Markdown or HTML of its own', () => {
        const own = toText({ ...renderingTranscript, turns: renderingTranscript.turns.slice(1) });
        expect(own).not.toMatch(/```|<details>|^#|\*\*/m);
    });

    it.each([
        ['hand-built transcript', renderingTranscript],
        ['simple conversation', toTranscript(simpleConversation)],
        ['rich conversation', toTranscript(richConversation)],
    ])('snapshots %s', (_, t) => {
        expect(toText(t)).toMatchSnapshot();
    });
});
