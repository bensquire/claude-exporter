import type { ExportFormat, Request, Response } from '../messages';
import { defaultExportOptions } from './types';
import { extractConversationUuid, getConversation, getPrimaryOrgUuid } from './api';
import { toMarkdown } from '../formatters/markdown';
import { toHtml } from '../formatters/html';
import { buildPrintHtml } from '../formatters/pdf';
import { dateStamp, sanitizeFilename } from '../formatters/shared';

chrome.runtime.onMessage.addListener((msg: Request, _sender, sendResponse) => {
    if (msg?.kind !== 'export') return false;
    void handleExport(msg.format)
        .then(sendResponse)
        .catch((err: unknown) => {
            sendResponse({
                ok: false,
                error: err instanceof Error ? err.message : String(err),
            } satisfies Response);
        });
    // Return true to keep the message channel open for the async response.
    return true;
});

const handleExport = async (format: ExportFormat): Promise<Response> => {
    const uuid = extractConversationUuid(location.href);
    if (!uuid) return { ok: false, error: 'Not on a claude.ai conversation page.' };

    const orgUuid = await getPrimaryOrgUuid();
    const conversation = await getConversation(orgUuid, uuid);
    const options = defaultExportOptions;
    const baseName = `${sanitizeFilename(conversation.name ?? 'conversation')}-${dateStamp()}`;

    if (format === 'markdown') {
        const text = toMarkdown(conversation, options);
        triggerDownload(new Blob([text], { type: 'text/markdown' }), `${baseName}.md`);
        return { ok: true, filename: `${baseName}.md` };
    }
    if (format === 'html') {
        const html = toHtml(conversation, options);
        triggerDownload(new Blob([html], { type: 'text/html' }), `${baseName}.html`);
        return { ok: true, filename: `${baseName}.html` };
    }
    if (format === 'pdf') {
        const printHtml = buildPrintHtml(conversation, options);
        return { ok: true, filename: `${baseName}.pdf`, printHtml };
    }
    if (format === 'copy-markdown') {
        return { ok: true, copyText: toMarkdown(conversation, options) };
    }
    if (format === 'copy-html') {
        return { ok: true, copyText: toHtml(conversation, options) };
    }
    return { ok: false, error: `Unknown format: ${format as string}` };
};

const triggerDownload = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
