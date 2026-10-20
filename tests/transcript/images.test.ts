import { describe, expect, it, vi } from 'vitest';
import { embedImages } from '../../src/transcript/images';
import type { ImageBlock, Transcript } from '../../src/transcript/types';

const image = (url?: string): ImageBlock => ({
    kind: 'image',
    fileId: url ?? 'none',
    name: 'p.jpeg',
    ...(url === undefined ? {} : { url }),
});

const transcriptOf = (...blocks: ImageBlock[]): Transcript => ({
    id: 't',
    title: 'T',
    turns: [{ id: 'a', role: 'human', blocks, attachments: [] }],
});

const blocksOf = (t: Transcript) => t.turns[0]?.blocks;

describe('embedImages', () => {
    it('adds each loaded preview, fetching a repeated URL once', async () => {
        const load = vi.fn(async (url: string) => `data:image/webp;base64,${url.length}`);
        const t = await embedImages(transcriptOf(image('u1'), image('u1'), image('u22')), load);
        expect(load).toHaveBeenCalledTimes(2);
        expect(blocksOf(t)?.map((b) => (b as ImageBlock).dataUrl)).toEqual([
            'data:image/webp;base64,2',
            'data:image/webp;base64,2',
            'data:image/webp;base64,3',
        ]);
    });

    it('keeps the link when loading fails or returns nothing', async () => {
        const load = vi.fn(async (url: string) => {
            if (url === 'bad') throw new Error('403');
            return undefined;
        });
        const t = await embedImages(transcriptOf(image('bad'), image('empty')), load);
        expect(blocksOf(t)).toEqual([image('bad'), image('empty')]);
    });

    it('returns the transcript untouched when no image has a URL', async () => {
        const load = vi.fn();
        const input = transcriptOf(image());
        expect(await embedImages(input, load)).toBe(input);
        expect(load).not.toHaveBeenCalled();
    });
});
