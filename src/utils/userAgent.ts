export function parseUserAgent(userAgent: string): string {
    const ua = userAgent;

    const revanced = ua.match(/RVX\S+|ReVanced\S+/i);
    if (revanced) {
        return revanced[0];
    }

    if (ua.match(/(com.google.android.youtube\/)|(com.vanced.android.youtube\/)|(^YouTube\/)|(^Dalvik\/)/i)) {
        return `Vanced/${ua.match(/.android.youtube\/([^\s]+)/i)[1]}`;
    }

    if (ua.match(/(mpv_sponsorblock)|(^python-requests)|(^GuzzleHttp\/)|(^PostmanRuntime\/)/i)) {
        return ua;
    }

    return "";
}