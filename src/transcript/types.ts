// The format every exporter consumes. It's plain data with no ties to the
// claude.ai API, so API changes only touch the converter in from-claude.ts.

export interface Transcript {
    id: string;
    title: string;
    createdAt?: string;
    updatedAt?: string;
    model?: string;
    turns: Turn[];
}

export type Role = 'human' | 'assistant';

export interface Turn {
    id: string;
    role: Role;
    createdAt?: string;
    blocks: Block[];
    attachments: Attachment[];
}

export type Block =
    | TextBlock
    | ThinkingBlock
    | ImageBlock
    | ArtifactBlock
    | ToolUseBlock
    | ToolResultBlock
    | UnknownBlock;

/** `plain` text is shown verbatim, as claude.ai does for human messages. */
export interface TextBlock {
    kind: 'text';
    text: string;
    format: 'markdown' | 'plain';
}

/** `summarized`: claude.ai only kept a summary of the thinking, not the full text. */
export interface ThinkingBlock {
    kind: 'thinking';
    text: string;
    summarized: boolean;
}

/** An image in the message. Its binary isn't exported, only a reference. */
export interface ImageBlock {
    kind: 'image';
    fileId: string;
    name: string;
}

/** The full artifact as of this point in the conversation, with earlier edits
 *  applied. `partial` means only an edit was available, not the whole artifact. */
export interface ArtifactBlock {
    kind: 'artifact';
    id?: string;
    title?: string;
    language: string;
    content: string;
    version: number;
    partial: boolean;
}

export interface ToolUseBlock {
    kind: 'tool_use';
    name: string;
    input: unknown;
}

export interface ToolResultBlock {
    kind: 'tool_result';
    text: string;
    isError: boolean;
}

export interface UnknownBlock {
    kind: 'unknown';
    type: string;
    raw: unknown;
}

export interface Attachment {
    name: string;
    size?: number;
    mimeType?: string;
    /** `upload`: content claude.ai extracted text from. `file`: a stored file, e.g. a PDF. */
    source: 'upload' | 'file';
    extractedText?: string;
}

export interface ExportOptions {
    includeThinking: boolean;
    embedAttachments: boolean;
}

export const defaultExportOptions: ExportOptions = {
    includeThinking: true,
    embedAttachments: true,
};
