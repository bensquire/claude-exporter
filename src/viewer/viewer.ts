const STORAGE_KEY = 'pendingPrintHtml';

const main = async (): Promise<void> => {
    const stored = (await chrome.storage.session.get(STORAGE_KEY)) as Record<string, unknown>;
    const html = stored[STORAGE_KEY];
    if (typeof html !== 'string') {
        document.body.textContent =
            'No conversation to print. Open the extension popup and try again.';
        return;
    }
    // So a refresh doesn't replay stale content.
    await chrome.storage.session.remove(STORAGE_KEY);

    document.open();
    document.write(html);
    document.close();

    await Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)));
    setTimeout(() => window.print(), 500);
};

void main();
