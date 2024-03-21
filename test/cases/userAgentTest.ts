import assert from "assert";
import { parseUserAgent } from "../../src/utils/userAgent";

const validateUA = (ua: string, expected: string) =>
    assert.strictEqual(parseUserAgent(ua), expected);

describe("userAgent", () => {
    const uaCases = [
        ["Vanced/1521081792", "com.vanced.android.youtube/1521081792 (Linux; U; Android 10)"], // Vanced
        ["Vanced/1521081792", "com.google.android.youtube/1521081792 (Linux; U; Android 10)"], // Vanced (root)
        ["mpv_sponsorblock/1.0 (https://github.com/po5/mpv_sponsorblock)", "mpv_sponsorblock/1.0 (https://github.com/po5/mpv_sponsorblock)"], // mpv
        ["", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36"], // blank for everything else
    ];
    for (const [expected, ua] of uaCases) {
        it ("UA parser works", () => validateUA(ua, expected));
    }
});