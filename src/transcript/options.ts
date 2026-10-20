import type { Transcript } from './types';

export interface ExportOptions {
    includeThinking: boolean;
    embedAttachments: boolean;
}

export const defaultExportOptions: ExportOptions = {
    includeThinking: true,
    embedAttachments: true,
};

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
