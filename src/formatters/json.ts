import { TRANSCRIPT_SCHEMA, type Transcript } from '../transcript/types';

export const toJson = (t: Transcript): string =>
    JSON.stringify({ schema: TRANSCRIPT_SCHEMA, ...t }, null, 2) + '\n';
