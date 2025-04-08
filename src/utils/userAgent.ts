export function parseUserAgent(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.match(/(com.google.android.youtube\/)|(com.vanced.android.youtube\/)|(^YouTube\/)|(^Dalvik\/)/)) {
        return `Vanced/${ua.match(/.android.youtube\/([^\s]+)/)[1]}`;
    }

    const revanced = ua.match(/RVX\S+|ReVanced\S+/);
    if (revanced) {
        return revanced[0];
    }

    if (ua.match(/(mpv_sponsorblock\/)|(^python-requests)|(^GuzzleHttp\/)|(^PostmanRuntime\/)/)) {
        return ua;
    }

    return "";
}