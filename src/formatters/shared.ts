import type { ArtifactBlock } from '../transcript/types';

export const safeStringify = (x: unknown): string => {
    try {
        return JSON.stringify(x, null, 2) ?? String(x);
    } catch {
        return String(x);
    }
};

export const thinkingLabel = (summarized: boolean): string =>
    summarized ? 'Thinking (summary)' : 'Thinking';

/** `2026-04-01 10:00 UTC`: timezone-independent, so exports are reproducible. */
export const formatTime = (iso: string): string => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? iso
        : `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
};

export const artifactLabel = (a: ArtifactBlock): string | undefined =>
    a.partial ? `${a.title ?? 'Artifact'} (partial update)` : a.title;

export const escapeHtml = (s: string): string =>
    s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

/** Pick a code fence length that doesn't collide with backticks inside the content. */
export const pickFence = (text: string): string => {
    let max = 2;
    for (const m of text.matchAll(/`+/g)) max = Math.max(max, m[0].length);
    return '`'.repeat(max + 1);
};

export const sanitizeFilename = (name: string): string =>
    name
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120) || 'conversation';

export const dateStamp = (d: Date = new Date()): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};
