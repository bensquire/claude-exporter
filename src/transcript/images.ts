import type { Block, Transcript } from './types';

/** Adds `dataUrl` to every image `load` can fetch. Images it can't keep their link. */
export const embedImages = async (
    t: Transcript,
    load: (url: string) => Promise<string | undefined>,
): Promise<Transcript> => {
    const urls = new Set(
        t.turns.flatMap((turn) =>
            turn.blocks.flatMap((b) => (b.kind === 'image' && b.url ? [b.url] : [])),
        ),
    );
    if (urls.size === 0) return t;

    const loaded = new Map(
        await Promise.all(
            [...urls].map(async (url) => [url, await load(url).catch(() => undefined)] as const),
        ),
    );
    const embed = (b: Block): Block => {
        if (b.kind !== 'image' || !b.url) return b;
        const dataUrl = loaded.get(b.url);
        return dataUrl ? { ...b, dataUrl } : b;
    };
    return { ...t, turns: t.turns.map((turn) => ({ ...turn, blocks: turn.blocks.map(embed) })) };
};
