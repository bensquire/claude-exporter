import type { ArtifactBlock, Role } from '../transcript/types';

export const roleLabel = (role: Role): string => (role === 'human' ? 'Human' : 'Assistant');

export const imageLabel = (name: string): string => `[Image: ${name}]`;

export const toolResultLabel = (isError: boolean): string =>
    isError ? 'Tool error' : 'Tool result';

export const formatSize = (bytes: number): string => `(${bytes} bytes)`;

export const thinkingLabel = (summarized: boolean): string =>
    summarized ? 'Thinking (summary)' : 'Thinking';

/** `2026-04-01 10:00 UTC`: timezone-independent, so exports are reproducible. */
export const formatTime = (iso: string): string => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? iso
        : `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
};

export const artifactLabel = (a: ArtifactBlock): string | undefined => {
    if (a.partial) return `${a.title ?? 'Artifact'} (partial update)`;
    if (a.version > 1) return `${a.title ?? 'Artifact'} (v${a.version})`;
    return a.title;
};

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
