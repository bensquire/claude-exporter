import type { ExportFormat, Request, Response } from '../messages';
import { extractConversationUuid, fetchImageDataUrl, findConversation, readCookie } from './api';
import { toMarkdown } from '../formatters/markdown';
import { toHtml, toHtmlFragment } from '../formatters/html';
import { toJson } from '../formatters/json';
import { toText } from '../formatters/text';
import { dateStamp, sanitizeFilename } from '../formatters/shared';
import { toTranscript } from '../transcript/from-claude';
import { embedImages } from '../transcript/images';
import { applyOptions, defaultExportOptions } from '../transcript/options';
import type { Transcript } from '../transcript/types';

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
    if (!Object.hasOwn(exporters, format)) return { ok: false, error: `Unknown format: ${format}` };

    const conversation = await findConversation(uuid, readCookie(document.cookie, 'lastActiveOrg'));
    let transcript = applyOptions(toTranscript(conversation), defaultExportOptions);
    if (EMBEDS_IMAGES.has(format)) transcript = await embedImages(transcript, fetchImageDataUrl);
    const baseName = `${sanitizeFilename(transcript.title)}-${dateStamp()}`;
    return exporters[format](transcript, baseName);
};

/** HTML-based formats carry image previews; the rest link to them. */
const EMBEDS_IMAGES: ReadonlySet<ExportFormat> = new Set(['html', 'pdf', 'copy-html', 'copy-rich']);

const exporters: Record<ExportFormat, (t: Transcript, baseName: string) => Response> = {
    markdown: (t, baseName) => download(toMarkdown(t), 'text/markdown', `${baseName}.md`),
    html: (t, baseName) => download(toHtml(t), 'text/html', `${baseName}.html`),
    pdf: (t, baseName) => ({ ok: true, filename: `${baseName}.pdf`, printHtml: toHtml(t) }),
    json: (t, baseName) => download(toJson(t), 'application/json', `${baseName}.json`),
    text: (t, baseName) => download(toText(t), 'text/plain', `${baseName}.txt`),
    'copy-markdown': (t) => ({ ok: true, copyText: toMarkdown(t) }),
    'copy-html': (t) => ({ ok: true, copyText: toHtml(t) }),
    'copy-rich': (t) => ({ ok: true, copyText: toMarkdown(t), copyHtml: toHtmlFragment(t) }),
    'copy-text': (t) => ({ ok: true, copyText: toText(t) }),
};

const download = (text: string, type: string, filename: string): Response => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { ok: true, filename };
};
