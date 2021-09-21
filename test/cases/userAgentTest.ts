import assert from "assert";
import { parseUserAgent } from "../../src/utils/userAgent.js";

describe("userAgent", () => {
    it ("Works for Vanced package", () => {
        assert.strictEqual("Vanced/1521081792", parseUserAgent("com.vanced.android.youtube/1521081792 (Linux; U; Android 10)"));
    });

    it ("Works for Android package (root)", () => {
        assert.strictEqual("Vanced/1521081792", parseUserAgent("com.google.android.youtube/1521081792 (Linux; U; Android 10)"));
    });

    it ("Works MPV", () => {
        assert.strictEqual("mpv_sponsorblock/1.0 (https://github.com/po5/mpv_sponsorblock)", parseUserAgent("mpv_sponsorblock/1.0 (https://github.com/po5/mpv_sponsorblock)"));
    });

    it ("Blank for anything else", () => {
        assert.strictEqual("", parseUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36"));
    });
});