import type { ChatConversation, Organization } from './types';

export const CLAUDE_ORIGIN = 'https://claude.ai';
export const API_BASE = `${CLAUDE_ORIGIN}/api`;

class ApiError extends Error {
    constructor(
        message: string,
        readonly status?: number,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

const jsonFetch = async <T>(path: string): Promise<T> => {
    const res = await fetch(`${API_BASE}${path}`, {
        credentials: 'include',
        headers: { accept: 'application/json' },
    });
    if (!res.ok) {
        throw new ApiError(`GET ${path} failed: ${res.status} ${res.statusText}`, res.status);
    }
    return (await res.json()) as T;
};

export const getOrganizations = (): Promise<Organization[]> =>
    jsonFetch<Organization[]>('/organizations');

export const getConversation = (
    orgUuid: string,
    conversationUuid: string,
): Promise<ChatConversation> =>
    jsonFetch<ChatConversation>(
        `/organizations/${orgUuid}/chat_conversations/${conversationUuid}?tree=True&rendering_mode=messages`,
    );

const tryGetConversation = async (
    orgUuid: string,
    conversationUuid: string,
): Promise<ChatConversation | null> => {
    try {
        return await getConversation(orgUuid, conversationUuid);
    } catch (err) {
        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) return null;
        throw err;
    }
};

/** A conversation 404s or 403s under every org but its own, and Team/Enterprise
 *  users usually also have a personal org. */
export const findConversation = async (
    conversationUuid: string,
    preferredOrgUuid: string | null,
): Promise<ChatConversation> => {
    if (preferredOrgUuid) {
        const hit = await tryGetConversation(preferredOrgUuid, conversationUuid);
        if (hit) return hit;
    }
    const others = (await getOrganizations())
        .map((o) => o.uuid)
        .filter((uuid) => uuid && uuid !== preferredOrgUuid);
    for (const orgUuid of others) {
        // Sequential: other orgs rarely own the conversation, so don't fan out.
        // oxlint-disable-next-line no-await-in-loop
        const hit = await tryGetConversation(orgUuid, conversationUuid);
        if (hit) return hit;
    }
    throw new ApiError('Conversation not found in any of your organizations.');
};

/** A claude.ai image as a `data:` URL. Anything not on claude.ai is refused. */
export const fetchImageDataUrl = async (url: string): Promise<string | undefined> => {
    if (new URL(url).origin !== CLAUDE_ORIGIN) return undefined;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return undefined;
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return undefined;
    return `data:${blob.type};base64,${toBase64(new Uint8Array(await blob.arrayBuffer()))}`;
};

const toBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    // Chunked: spreading a whole image into fromCharCode overflows the stack.
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
};

export const readCookie = (cookies: string, name: string): string | null => {
    for (const part of cookies.split(';')) {
        const eq = part.indexOf('=');
        if (eq !== -1 && part.slice(0, eq).trim() === name) {
            return decodeURIComponent(part.slice(eq + 1).trim());
        }
    }
    return null;
};

export const extractConversationUuid = (url: string): string | null => {
    const match = url.match(/claude\.ai\/chat\/([0-9a-f-]{36})/i);
    return match?.[1] ?? null;
};

export { ApiError };
