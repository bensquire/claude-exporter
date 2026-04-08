// Typed discriminated union for popup <-> content script messaging.

export type ExportFormat = 'markdown' | 'html' | 'pdf' | 'copy-markdown' | 'copy-html';

export interface ExportRequest {
    kind: 'export';
    format: ExportFormat;
}

export type Request = ExportRequest;

export interface OkResponse {
    ok: true;
    filename?: string;
    /** For PDF: the rendered HTML string. The popup turns it into a blob URL
     *  and opens it in a new tab so the user-activation requirement for window
     *  opening is satisfied. */
    printHtml?: string;
    /** For copy-markdown / copy-html: the rendered text. The popup writes it
     *  to the clipboard via navigator.clipboard.writeText (popup has user
     *  activation; content scripts on claude.ai do not, reliably). */
    copyText?: string;
}

export interface ErrResponse {
    ok: false;
    error: string;
}

export type Response = OkResponse | ErrResponse;
