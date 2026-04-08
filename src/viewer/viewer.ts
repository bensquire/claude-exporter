// Loads the print-ready HTML stashed by the popup in chrome.storage.session
// and replaces the document body with it, then triggers window.print().

const STORAGE_KEY = 'pendingPrintHtml';

const main = async (): Promise<void> => {
    const stored = (await chrome.storage.session.get(STORAGE_KEY)) as Record<string, unknown>;
    const html = stored[STORAGE_KEY];
    if (typeof html !== 'string') {
        document.body.textContent =
            'No conversation to print. Open the extension popup and try again.';
        return;
    }
    // One-shot: clear the stash so a refresh doesn't replay stale content.
    await chrome.storage.session.remove(STORAGE_KEY);

    // Replace the entire document with the rendered conversation HTML. Using
    // document.open/write is the simplest way to swap in a full <html> document
    // (including <head> styles) without parsing it ourselves.
    document.open();
    document.write(html);
    document.close();

    // After document.write the new document parses synchronously; queue print.
    setTimeout(() => window.print(), 500);
};

void main();
