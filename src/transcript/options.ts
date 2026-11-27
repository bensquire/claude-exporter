import type { Transcript } from './types';

export interface ExportOptions {
    includeThinking: boolean;
    /** Tool calls and their results. Artifacts are kept either way. */
    includeToolCalls: boolean;
    embedAttachments: boolean;
}

export const defaultExportOptions: ExportOptions = {
    includeThinking: true,
    includeToolCalls: true,
    embedAttachments: true,
};

export const applyOptions = (t: Transcript, options: ExportOptions): Transcript => ({
    ...t,
    turns: t.turns.map((turn) => ({
        ...turn,
        blocks: turn.blocks.filter(
            (b) =>
                (options.includeThinking || b.kind !== 'thinking') &&
                (options.includeToolCalls || (b.kind !== 'tool_use' && b.kind !== 'tool_result')),
        ),
        attachments: options.embedAttachments
            ? turn.attachments
            : turn.attachments.map(({ extractedText: _, ...rest }) => rest),
    })),
});
