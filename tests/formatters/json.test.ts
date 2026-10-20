import { describe, expect, it } from 'vitest';
import { TRANSCRIPT_SCHEMA, toJson } from '../../src/formatters/json';
import { toTranscript } from '../../src/transcript/from-claude';
import { richConversation } from '../fixtures/simple';

describe('toJson', () => {
    const transcript = toTranscript(richConversation);

    it('round-trips the transcript with a schema tag', () => {
        expect(JSON.parse(toJson(transcript))).toEqual({
            schema: TRANSCRIPT_SCHEMA,
            ...transcript,
        });
    });

    it('puts the schema tag first and ends with a newline', () => {
        const json = toJson(transcript);
        expect(json.startsWith(`{\n  "schema": "${TRANSCRIPT_SCHEMA}",`)).toBe(true);
        expect(json.endsWith('}\n')).toBe(true);
    });

    it('keeps tool input as structured JSON', () => {
        const parsed = JSON.parse(toJson(transcript)) as typeof transcript;
        expect(parsed.turns[1]?.blocks).toContainEqual({
            kind: 'tool_use',
            name: 'web_search',
            input: { query: 'claude.ai api' },
        });
    });
});
