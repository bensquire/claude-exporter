import type { ExportFormat, Request, Response } from '../messages';

const statusEl = document.getElementById('status') as HTMLDivElement;
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-format]'));

const setStatus = (text: string, isError = false): void => {
    statusEl.textContent = text;
    statusEl.classList.toggle('error', isError);
};

const exportAs = async (format: ExportFormat): Promise<void> => {
    setStatus('Exporting…');
    buttons.forEach((b) => (b.disabled = true));
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id || !tab.url?.startsWith('https://claude.ai/')) {
            throw new Error('Open a claude.ai conversation tab first.');
        }
        const req: Request = { kind: 'export', format };
        const res = (await sendWithInject(tab.id, req)) as Response | undefined;
        if (!res) throw new Error('No response from page. Try reloading the tab.');
        if (!res.ok) throw new Error(res.error);
        if (res.printHtml) {
            await chrome.storage.session.set({ pendingPrintHtml: res.printHtml });
            await chrome.tabs.create({ url: chrome.runtime.getURL('src/viewer/viewer.html') });
            setStatus('Print dialog opened in new tab');
        } else if (res.copyText !== undefined) {
            await navigator.clipboard.writeText(res.copyText);
            setStatus(`Copied ${res.copyText.length.toLocaleString()} chars to clipboard`);
        } else {
            setStatus(res.filename ? `Saved ${res.filename}` : 'Done');
        }
    } catch (err) {
        setStatus(err instanceof Error ? err.message : String(err), true);
    } finally {
        buttons.forEach((b) => (b.disabled = false));
    }
};

/** sendMessage to the content script, falling back to a tab reload if the
 *  content script isn't registered yet (tab opened before the extension loaded). */
const sendWithInject = async (
    tabId: number,
    req: Request,
): Promise<Response | undefined> => {
    try {
        return (await chrome.tabs.sendMessage(tabId, req)) as Response | undefined;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/Receiving end does not exist|Could not establish connection/i.test(msg)) throw err;
        setStatus('First run — reloading the tab…');
        await reloadAndWait(tabId);
        return (await chrome.tabs.sendMessage(tabId, req)) as Response | undefined;
    }
};

const reloadAndWait = async (tabId: number): Promise<void> => {
    await chrome.tabs.reload(tabId);
    await new Promise<void>((resolve) => {
        const listener = (id: number, info: chrome.tabs.TabChangeInfo) => {
            if (id === tabId && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
    });
    // Give the content script a moment to register its message listener.
    await new Promise((r) => setTimeout(r, 300));
};

for (const btn of buttons) {
    const format = btn.dataset.format as ExportFormat;
    btn.addEventListener('click', () => void exportAs(format));
}
