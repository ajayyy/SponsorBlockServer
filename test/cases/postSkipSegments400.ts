import assert from "assert";
import { postSkipSegmentJSON, postSkipSegmentParam } from "./postSkipSegments";

const videoID = "postSkipSegments-404-video";
const userID = "postSkipSegments-404-user";

describe("postSkipSegments 400 - missing params", () => {
    it("Should return 400 for missing params (JSON method) 1", (done) => {
        postSkipSegmentJSON({
            userID,
            segments: [{
                segment: [9, 10],
                category: "sponsor",
            }, {
                segment: [31, 60],
                category: "intro",
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for missing params (JSON method) 2", (done) => {
        postSkipSegmentJSON({
            userID,
            videoID,
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for missing params (JSON method) 3", (done) => {
        postSkipSegmentJSON({
            userID,
            videoID,
            segments: [{
                segment: [0],
                category: "sponsor",
            }, {
                segment: [31, 60],
                category: "intro",
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for missing params (JSON method) 4", (done) => {
        postSkipSegmentJSON({
            userID,
            videoID,
            segments: [{
                segment: [9, 10],
            }, {
                segment: [31, 60],
                category: "intro",
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for missing params (JSON method) 5", (done) => {
        postSkipSegmentJSON({
            userID,
            videoID,
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for missing multiple params (Params method)", (done) => {
        postSkipSegmentParam({
            startTime: 9,
            endTime: 10,
            userID
        })
            .then(res => {
                if (res.status === 400) done();
                else done(true);
            })
            .catch(err => done(err));
    });

    it("Should return 400 if videoID is empty", (done) => {
        const videoID = null as unknown as string;
        postSkipSegmentParam({
            videoID,
            startTime: 1,
            endTime: 5,
            category: "sponsor",
            userID
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 if no segments provided", (done) => {
        postSkipSegmentJSON({
            videoID,
            segments: [],
            category: "sponsor",
            userID
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});

describe("postSkipSegments 400 - Chapters", () => {
    const actionType = "chapter";
    const category = actionType;

    it("Should not be able to submit a chapter name that is too long", (done) => {
        postSkipSegmentParam({
            videoID,
            startTime: 1,
            endTime: 5,
            category,
            actionType,
            description: "a".repeat(256),
            userID
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});

describe("postSkipSegments 400 - POI", () => {
    const category = "poi_highlight";
    it("Should be rejected if a POI is at less than 1 second", (done) => {
        postSkipSegmentParam({
            videoID,
            startTime: 0.5,
            endTime: 0.5,
            category,
            userID
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be rejected if highlight segment doesn't start and end at the same time", (done) => {
        postSkipSegmentParam({
            videoID,
            startTime: 30,
            endTime: 30.5,
            category,
            userID
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});

describe("postSkipSegments 400 - Automod", () => {
    it("Should be rejected if over 80% of the video", (done) => {
        postSkipSegmentParam({
            videoID,
            startTime: 30,
            endTime: 1000000,
            userID,
            category: "sponsor"
        })
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be rejected if a sponsor is less than 1 second", (done) => {
        postSkipSegmentParam({
            videoID,
            category: "sponsor",
            startTime: 30,
            endTime: 30.5,
            userID
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be rejected if non-POI segment starts and ends at the same time", (done) => {
        postSkipSegmentParam({
            videoID,
            startTime: 90,
            endTime: 90,
            userID,
            category: "intro"
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not allow submitting full video not at zero seconds", (done) => {
        postSkipSegmentParam({
            videoID,
            startTime: 0,
            endTime: 1,
            category: "sponsor",
            actionType: "full",
            userID
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to submit an music_offtopic with mute action type (JSON method)", (done) => {
        postSkipSegmentJSON({
            userID,
            videoID,
            segments: [{
                segment: [0, 10],
                category: "music_offtopic",
                actionType: "mute"
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});

describe("postSkipSegments 400 - Mismatched Types", () => {
    it("Should not be able to submit with a category that does not exist", (done) => {
        postSkipSegmentParam({
            videoID,
            startTime: 1,
            endTime: 5,
            category: "this-category-will-never-exist",
            userID
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to submit a chapter with skip action type (JSON method)", (done) => {
        postSkipSegmentJSON({
            userID,
            videoID,
            segments: [{
                segment: [0, 10],
                category: "chapter",
                actionType: "skip"
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to submit a sponsor with a description (JSON method)", (done) => {
        const videoID = "postSkipChapter5";
        postSkipSegmentJSON({
            userID,
            videoID,
            segments: [{
                segment: [0, 10],
                category: "sponsor",
                description: "This is a sponsor"
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});