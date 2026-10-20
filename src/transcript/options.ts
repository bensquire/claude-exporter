import type { ExportOptions, Transcript } from './types';

export const applyOptions = (t: Transcript, options: ExportOptions): Transcript => ({
    ...t,
    turns: t.turns.map((turn) => ({
        ...turn,
        blocks: options.includeThinking
            ? turn.blocks
            : turn.blocks.filter((b) => b.kind !== 'thinking'),
        attachments: options.embedAttachments
            ? turn.attachments
            : turn.attachments.map(({ extractedText: _, ...rest }) => rest),
    })),
});
