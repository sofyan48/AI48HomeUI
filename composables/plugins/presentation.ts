export function safeURL(raw: string | URL | null | undefined) {
    try {
        const url = new URL(raw as string | URL);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}
