import { describe, expect, it } from 'vitest';
import {
    artifactLabel,
    escapeHtml,
    pickFence,
    safeStringify,
    sanitizeFilename,
} from '../../src/formatters/shared';

describe('artifactLabel', () => {
    const base = { kind: 'artifact', language: '', content: '', version: 1 } as const;

    it('uses the title, or marks partial updates', () => {
        expect(artifactLabel({ ...base, title: 'App', partial: false })).toBe('App');
        expect(artifactLabel({ ...base, partial: false })).toBeUndefined();
        expect(artifactLabel({ ...base, title: 'App', partial: true })).toBe(
            'App (partial update)',
        );
        expect(artifactLabel({ ...base, partial: true })).toBe('Artifact (partial update)');
    });

    it('shows the version from the second version on', () => {
        expect(artifactLabel({ ...base, title: 'App', partial: false, version: 2 })).toBe(
            'App (v2)',
        );
        expect(artifactLabel({ ...base, partial: false, version: 3 })).toBe('Artifact (v3)');
    });
});

describe('safeStringify', () => {
    it('pretty-prints JSON and survives cycles and undefined', () => {
        expect(safeStringify({ a: 1 })).toBe('{\n  "a": 1\n}');
        expect(safeStringify(undefined)).toBe('undefined');
        const cyclic: Record<string, unknown> = {};
        cyclic.self = cyclic;
        expect(safeStringify(cyclic)).toBe('[object Object]');
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
