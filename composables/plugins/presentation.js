export function safeURL(raw) {
    try {
        const url = new URL(raw);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}
