export type ExportFormat =
    | 'markdown'
    | 'html'
    | 'pdf'
    | 'json'
    | 'text'
    | 'copy-markdown'
    | 'copy-html'
    | 'copy-text'
    | 'copy-rich';

export interface ExportRequest {
    kind: 'export';
    format: ExportFormat;
}

export type Request = ExportRequest;

export interface OkResponse {
    ok: true;
    filename?: string;
    printHtml?: string;
    /** Copied by the popup, which has user activation; the content script doesn't. */
    copyText?: string;
    /** With copyText as the plain-text fallback, copied as rich text. */
    copyHtml?: string;
}

export interface ErrResponse {
    ok: false;
    error: string;
}

export type Response = OkResponse | ErrResponse;
