export function parseUserAgent(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.includes("com.google.android.youtube/") || ua.includes("com.vanced.android.youtube/")) {
        return `Vanced/${ua.match(/.android.youtube\/([^\s]+)/)[1]}`;
    }

    if (ua.includes("mpv_sponsorblock/") || ua.includes("node_sponsorblock/")) {
        return ua;
    }

    return "";
}