import type { Transcript } from '../transcript/types';

/** Bump when the Transcript shape changes incompatibly. */
export const TRANSCRIPT_SCHEMA = 'claude-exporter/transcript@1';

export const toJson = (t: Transcript): string =>
    JSON.stringify({ schema: TRANSCRIPT_SCHEMA, ...t }, null, 2) + '\n';
