import assert from "assert";
import { client } from "../utils/httpClient";
import { config } from "../../src/config";
import sinon from "sinon";
import { sanitize } from "../../src/utils/youtubeID";

// videoID array
const badVideoIDs = [
    ["null", "< 11"],
    ["dQw4w9WgXc?", "invalid characters"],
    ["https://www.youtube.com/clip/UgkxeLPGsmKnMdm46DGml_0aa0aaAAAAA00a", "clip URL"],
    ["https://youtube.com/channel/UCaAa00aaaAA0a0a0AaaAAAA", "channel ID (UC)"],
    ["https://www.youtube.com/@LinusTechTips", "channel @username"],
    ["https://www.youtube.com/@GamersNexus", "channel @username"],
    ["https://www.youtube.com/c/LinusTechTips", "custom channel /c/"],
    ["https://www.youtube.com/c/GamersNexus", "custom channel /c/"],
    ["https://www.youtube.com/", "home/ page URL"],
    ["03224876b002487796379942f199bc22ffac46157ad2488119bccc7b03c55430","UUID"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=16s#requiredSegment=03224876b002487796379942f199bc22ffac46157ad2488119bccc7b03c55430", "full #requiredSegments uuid"],
    ["","empty videoID"]

];
const goodVideoIDs = [
    ["dQw4w9WgXcQ", "standalone videoID"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "?watch link"],
    ["http://www.youtube.com/watch?v=dQw4w9WgXcQ", "http link"],
    ["www.youtube.com/watch?v=dQw4w9WgXcQ", "no protocol link"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ?t=2", "trailing &t parameter"],
    ["https://youtu.be/dQw4w9WgXcQ","youtu.be"],
    ["youtu.be/dQw4w9WgXcQ","no protocol youtu.be"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=16s#requiredSegment=00000000000","#requiredsegment link"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ?wmode=transparent&rel=0&autohide=1&showinfo=1&fs=1&enablejsapi=0&theme=light", "long embedded link"],
    ["http://m.youtube.com/watch?v=dQw4w9WgXcQ&app=m&persist_app=1", "force persist desktop"],
    ["http://m.youtube.com/watch?v=dQw4w9WgXcQ", "mobile"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL8mG-AaA0aAa0AAa0A0A-aAaaA00aaAa0","/watch&list"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ?list=PL8mG-AaA0aAa0AAa0A0A-aAaaA00aaAa0","/embed/video"],
    ["dQw4w9WgXcQ\n", "escaped newline"],
    ["dQw4w9WgXcQ\t", "escaped tab"],
    ["%20dQw4w9WgXcQ%20%20%20", "urlencoded"],
    ["https://sb.ltn.fi/video/dQw4w9WgXcQ/","sbltnfi link"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=0m10s", "anchor as t parameter"],
];
const edgeVideoIDs = [
    ["https://www.youtube.com/embed/videoseries?list=PL8mG-Aaa0aAa1AAa0A0A-a0aaA00aaAa0", "/videoseries"],
    ["https://www.youtube.com/embed/playlist?list=PL8mG-Aaa0aAa1AAa0A0A-a0aaA00aaAa0", "/playlist"],
    ["PL8mG-Aaa0aAa1AAa0A0A-a0aaA00aaAa0", "playlist ID"],
    ["UgkxeLPGsmKnMdm46DGml_0aa0aaAAAAA00a","clip ID"],
    ["https://www.youtube.com/GamersNexus", "channel custom URL"],
    ["https://www.youtube.com/LinusTechTips", "channel custom URL"],
];
const targetVideoID = "dQw4w9WgXcQ";

// tests
describe("YouTube VideoID validation - failing tests", () => {
    for (const testCase of badVideoIDs) {
        it(`Should error on invalid videoID - ${testCase[1]}`, () => {
            assert.equal(sanitize(testCase[0]), null);
        });
    }
});
describe("YouTube VideoID validation - passing tests", () => {
    for (const testCase of goodVideoIDs) {
        it(`Should be able to sanitize good videoID - ${testCase[1]}`, () => {
            assert.equal(sanitize(testCase[0]), targetVideoID);
        });
    }
});
describe("YouTube VideoID validation - edge cases tests", () => {
    for (const testCase of edgeVideoIDs) {
        it(`edge cases produce bad results - ${testCase[1]}`, () => {
            assert.ok(sanitize(testCase[0]));
        });
    }
});

// stubs
const mode = "production";
let stub: sinon.SinonStub;

// constants
const endpoint = "/api/skipSegments";
const userID = "postVideoID_user1";
const expectedError = `No valid videoID. YouTube videoID could not be extracted`;


// helper functions
const postSkipSegments = (videoID: string) => client({
    method: "POST",
    url: endpoint,
    params: {
        videoID,
        startTime: Math.random(),
        endTime: 10,
        userID,
        service: "YouTube",
        category: "sponsor"
    }
});

describe("VideoID Validation - postSkipSegments", () => {
    before(() => stub = sinon.stub(config, "mode").value(mode));
    after(() => stub.restore());

    it("Should return production mode if stub worked", (done) => {
        assert.strictEqual(config.mode, mode);
        done();
    });

    it(`Should return 400 for invalid videoID`, (done) => {
        postSkipSegments("123456").then(res => {
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.data, expectedError);
            done();
        })
            .catch(err => done(err));
    });

    it(`Should return 200 for valid videoID`, (done) => {
        postSkipSegments("dQw4w9WgXcQ").then(res => {
            assert.strictEqual(res.status, 200);
            done();
        })
            .catch(err => done(err));
    });
});