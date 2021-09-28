import { getService } from "../../src/utils/getService";
import { Service } from "../../src/types/segments.model";
import assert from "assert";

describe("getService", () => {
    it("Should return youtube if not match", () => {
        assert.strictEqual(getService(), Service.YouTube);
        assert.strictEqual(getService(""), Service.YouTube);
        assert.strictEqual(getService("test", "not exist"), Service.YouTube);
        assert.strictEqual(getService(null, null), Service.YouTube);
        assert.strictEqual(getService(undefined, undefined), Service.YouTube);
        assert.strictEqual(getService(undefined), Service.YouTube);
    });

    it("Should return Youtube", () => {
        assert.strictEqual(getService("youtube"), Service.YouTube);
        assert.strictEqual(getService("   Youtube   "), Service.YouTube);
        assert.strictEqual(getService("   YouTube   "), Service.YouTube);
        assert.strictEqual(getService(undefined, "   YouTube   "), Service.YouTube);
    });

    it("Should return PeerTube", () => {
        assert.strictEqual(getService("PeerTube"), Service.PeerTube);
        assert.strictEqual(getService("   PeerTube   "), Service.PeerTube);
        assert.strictEqual(getService("   peertube   "), Service.PeerTube);
        assert.strictEqual(getService(undefined, "   PeerTube   "), Service.PeerTube);
    });
});
