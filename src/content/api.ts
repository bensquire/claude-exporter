import type { ChatConversation, Organization } from './types';

const API_BASE = 'https://claude.ai/api';

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

/** Returns the uuid of the first organization (the user's primary). */
export const getPrimaryOrgUuid = async (): Promise<string> => {
    const orgs = await getOrganizations();
    const first = orgs[0];
    if (!first?.uuid) throw new ApiError('No organizations returned for the current user');
    return first.uuid;
};

export const getConversation = (
    orgUuid: string,
    conversationUuid: string,
): Promise<ChatConversation> =>
    jsonFetch<ChatConversation>(
        `/organizations/${orgUuid}/chat_conversations/${conversationUuid}?tree=True&rendering_mode=messages`,
    );

/** Extract the conversation uuid from a claude.ai URL, or null if not on a chat page. */
export const extractConversationUuid = (url: string): string | null => {
    const match = url.match(/claude\.ai\/chat\/([0-9a-f-]{36})/i);
    return match?.[1] ?? null;
};

export { ApiError };
