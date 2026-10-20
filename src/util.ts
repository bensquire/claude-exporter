export const safeStringify = (x: unknown): string => {
    try {
        return JSON.stringify(x, null, 2) ?? String(x);
    } catch {
        return String(x);
    }
};
