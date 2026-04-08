import type { ChatConversation, ExportOptions } from '../content/types';
import { toHtml } from './html';

/** Builds a print-ready HTML string. Caller is responsible for opening it in a
 *  new tab from a context with user activation (e.g. the extension popup), so
 *  Chrome doesn't block the popup-blocker check on the eventual window.print(). */
export const buildPrintHtml = (conversation: ChatConversation, options: ExportOptions): string => {
    const html = toHtml(conversation, options);
    return html.replace(
        '</body>',
        `<script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));</script></body>`,
    );
};
