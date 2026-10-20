import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_BASE, findConversation, readCookie } from '../src/content/api';

const ok = (body: unknown) =>
    new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
    });
const status = (code: number) => new Response('', { status: code });

const stubFetch = (handler: (path: string) => Response) => {
    const calls: string[] = [];
    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) => {
            const path = url.replace(API_BASE, '');
            calls.push(path);
            return handler(path);
        }),
    );
    return calls;
};

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('readCookie', () => {
    it('finds a cookie among others', () => {
        expect(readCookie('foo=1; lastActiveOrg=org-2; bar=3', 'lastActiveOrg')).toBe('org-2');
    });

    it('returns null when absent and does not match on prefix', () => {
        expect(readCookie('lastActiveOrgX=1', 'lastActiveOrg')).toBeNull();
        expect(readCookie('', 'lastActiveOrg')).toBeNull();
    });
});

describe('findConversation', () => {
    const conv = { uuid: 'c1', name: 'Found', chat_messages: [] };

    it('falls through 403/404 orgs to the one that owns the conversation', async () => {
        const calls = stubFetch((path) => {
            if (path === '/organizations') return ok([{ uuid: 'personal' }, { uuid: 'team' }]);
            if (path.startsWith('/organizations/personal/')) return status(404);
            if (path.startsWith('/organizations/team/')) return ok(conv);
            return status(500);
        });
        await expect(findConversation('c1', null)).resolves.toMatchObject({ name: 'Found' });
        expect(calls).toHaveLength(3);
    });

    it('uses the preferred org without listing orgs when it owns the conversation', async () => {
        const calls = stubFetch(() => ok(conv));
        await findConversation('c1', 'team');
        expect(calls).toEqual([
            '/organizations/team/chat_conversations/c1?tree=True&rendering_mode=messages',
        ]);
    });

    it('falls back to the other orgs, without retrying the preferred one', async () => {
        const calls = stubFetch((path) => {
            if (path === '/organizations') return ok([{ uuid: 'stale' }, { uuid: 'team' }]);
            if (path.startsWith('/organizations/team/')) return ok(conv);
            return status(404);
        });
        await expect(findConversation('c1', 'stale')).resolves.toMatchObject({ name: 'Found' });
        expect(calls.filter((c) => c.startsWith('/organizations/stale/'))).toHaveLength(1);
        expect(calls).toHaveLength(3);
    });

    it('rethrows errors other than 403/404 instead of trying other orgs', async () => {
        stubFetch((path) =>
            path === '/organizations' ? ok([{ uuid: 'a' }, { uuid: 'b' }]) : status(500),
        );
        await expect(findConversation('c1', null)).rejects.toThrow(/500/);
    });

    it('reports a clear error when no org has the conversation', async () => {
        stubFetch((path) =>
            path === '/organizations' ? ok([{ uuid: 'a' }, { uuid: 'b' }]) : status(403),
        );
        await expect(findConversation('c1', null)).rejects.toThrow(/any of your organizations/);
    });
});
