// claude.ai's internal API is undocumented and can change, so these are kept loose.

export type MessageSender = 'human' | 'assistant';

export interface TextBlock {
    type: 'text';
    text: string;
}

export interface ThinkingBlock {
    type: 'thinking';
    thinking?: string;
    text?: string;
}

export interface ToolUseBlock {
    type: 'tool_use';
    name?: string;
    input?: unknown;
    id?: string;
}

export interface ToolResultBlock {
    type: 'tool_result';
    content?: unknown;
    tool_use_id?: string;
    is_error?: boolean;
}

export interface ArtifactBlock {
    type: 'artifact' | 'tool_use';
    name?: string;
    input?: {
        title?: string;
        language?: string;
        content?: string;
        id?: string;
        type?: string;
    };
}

export interface UnknownBlock {
    type: string;
    [key: string]: unknown;
}

export type ContentBlock =
    | TextBlock
    | ThinkingBlock
    | ToolUseBlock
    | ToolResultBlock
    | ArtifactBlock
    | UnknownBlock;

export interface Attachment {
    id?: string;
    file_name?: string;
    file_size?: number;
    file_type?: string;
    extracted_content?: string;
}

export interface FileAttachment {
    file_uuid?: string;
    file_name?: string;
    file_kind?: string;
    size_bytes?: number;
    file_size?: number;
    preview_url?: string;
}

export interface ChatMessage {
    uuid: string;
    text?: string;
    content: ContentBlock[];
    sender: MessageSender;
    index: number;
    created_at?: string;
    updated_at?: string;
    attachments?: Attachment[];
    files?: FileAttachment[];
    parent_message_uuid?: string | null;
}

export interface ChatConversation {
    uuid: string;
    name: string;
    summary?: string;
    created_at?: string;
    updated_at?: string;
    model?: unknown;
    current_leaf_message_uuid?: string | null;
    chat_messages: ChatMessage[];
}

export interface Organization {
    uuid: string;
    name?: string;
}
