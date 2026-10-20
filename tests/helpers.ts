import type { ChatConversation, ChatMessage } from '../src/content/types';
import { toHtml } from '../src/formatters/html';
import { toMarkdown } from '../src/formatters/markdown';
import { toTranscript } from '../src/transcript/from-claude';
import { applyOptions, defaultExportOptions, type ExportOptions } from '../src/transcript/options';

export const exportMarkdown = (
    c: ChatConversation,
    options: ExportOptions = defaultExportOptions,
) => toMarkdown(applyOptions(toTranscript(c), options));

export const exportHtml = (c: ChatConversation, options: ExportOptions = defaultExportOptions) =>
    toHtml(applyOptions(toTranscript(c), options));

type MessageInput = Partial<ChatMessage> & Pick<ChatMessage, 'content'>;

/** A conversation whose messages form a single chain, in the order given. */
export const conversationOf = (...messages: MessageInput[]): ChatConversation => ({
    uuid: 'c',
    name: 'Test',
    current_leaf_message_uuid: `m${messages.length - 1}`,
    chat_messages: messages.map(chainedMessage),
});

const chainedMessage = (m: MessageInput, i: number): ChatMessage => ({
    uuid: `m${i}`,
    sender: 'assistant',
    index: i,
    parent_message_uuid: i === 0 ? null : `m${i - 1}`,
    ...m,
});
