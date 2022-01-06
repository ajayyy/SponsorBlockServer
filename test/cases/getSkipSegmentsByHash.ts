import { db } from "../../src/databases/databases";
import { partialDeepEquals, arrayPartialDeepEquals } from "../utils/partialDeepEquals";
import { getHash } from "../../src/utils/getHash";
import { ImportMock, } from "ts-mock-imports";
import * as YouTubeAPIModule from "../../src/utils/youtubeApi";
import { YouTubeApiMock } from "../youtubeMock";
import assert from "assert";
import { client } from "../utils/httpClient";

const mockManager = ImportMock.mockStaticClass(YouTubeAPIModule, "YouTubeAPI");
const sinonStub = mockManager.mock("listVideos");
sinonStub.callsFake(YouTubeApiMock.listVideos);

describe("getSkipSegmentsByHash", () => {
    const endpoint = "/api/skipSegments";
    const getSegmentsByHash0Hash = "fdaff4dee1043451faa7398324fb63d8618ebcd11bddfe0491c488db12c6c910";
    const requiredSegmentVidHash = "d51822c3f681e07aef15a8855f52ad12db9eb9cf059e65b16b64c43359557f61";
    const requiredSegmentHashVidHash = "17bf8d9090e050257772f8bff277293c29c7ce3b25eb969a8fae111a2434504d";
    const differentCategoryVidHash = "7fac44d1ee3257ec7f18953e2b5f991828de6854ad57193d1027c530981a89c0";
    const nonMusicOverlapVidHash = "306151f778f9bfd19872b3ccfc83cbab37c4f370717436bfd85e0a624cd8ba3c";
    const fullCategoryVidHash = "278fa987eebfe07ae3a4a60cf0663989ad874dd0c1f0430831d63c2001567e6f";
    before(async () => {
        const query = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", views, category, "actionType", "service", "hidden", "shadowHidden", "hashedVideoID", "description") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", query, ["getSegmentsByHash-0", 1, 10, 2, 0, "getSegmentsByHash-01", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, getSegmentsByHash0Hash, ""]);
        await db.prepare("run", query, ["getSegmentsByHash-0", 1, 10, 2, 0, "getSegmentsByHash-02", "testman", 0, 50, "sponsor", "skip", "PeerTube", 0, 0, getSegmentsByHash0Hash, ""]);
        await db.prepare("run", query, ["getSegmentsByHash-0", 20, 30, 2, 0, "getSegmentsByHash-03", "testman", 100, 150, "intro", "skip", "YouTube", 0, 0, getSegmentsByHash0Hash, ""]);
        await db.prepare("run", query, ["getSegmentsByHash-0", 40, 50, 2, 0, "getSegmentsByHash-04", "testman", 0, 50, "sponsor", "mute", "YouTube", 0, 0, getSegmentsByHash0Hash, ""]);
        await db.prepare("run", query, ["getSegmentsByHash-noMatchHash", 40, 50, 2, 0, "getSegmentsByHash-noMatchHash", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, "fdaffnoMatchHash", ""]);
        await db.prepare("run", query, ["getSegmentsByHash-1", 60, 70, 2, 0, "getSegmentsByHash-1", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, "3272fa85ee0927f6073ef6f07ad5f3146047c1abba794cfa364d65ab9921692b", ""]);
        await db.prepare("run", query, ["onlyHidden", 60, 70, 2, 0, "onlyHidden", "testman", 0, 50, "sponsor", "skip", "YouTube", 1, 0, "f3a199e1af001d716cdc6599360e2b062c2d2b3fa2885f6d9d2fd741166cbbd3", ""]);
        await db.prepare("run", query, ["highlightVid", 60, 60, 2, 0, "highlightVid-1", "testman", 0, 50, "poi_highlight", "skip", "YouTube", 0, 0, getHash("highlightVid", 1), ""]);
        await db.prepare("run", query, ["highlightVid", 70, 70, 2, 0, "highlightVid-2", "testman", 0, 50, "poi_highlight", "skip", "YouTube", 0, 0, getHash("highlightVid", 1), ""]);
        await db.prepare("run", query, ["requiredSegmentVid", 60, 70, 2, 0, "requiredSegmentVid-1", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, requiredSegmentVidHash, ""]);
        await db.prepare("run", query, ["requiredSegmentVid", 60, 70, -2, 0, "requiredSegmentVid-2", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, requiredSegmentVidHash, ""]);
        await db.prepare("run", query, ["requiredSegmentVid", 80, 90, -2, 0, "requiredSegmentVid-3", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, requiredSegmentVidHash, ""]);
        await db.prepare("run", query, ["requiredSegmentVid", 80, 90, 2, 0, "requiredSegmentVid-4", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, requiredSegmentVidHash, ""]);
        await db.prepare("run", query, ["chapterVid-hash", 60, 80, 2, 0, "chapterVid-hash-1", "testman", 0, 50, "chapter", "chapter", "YouTube", 0, 0, getHash("chapterVid-hash", 1), "Chapter 1"]); //7258
        await db.prepare("run", query, ["chapterVid-hash", 70, 75, 2, 0, "chapterVid-hash-2", "testman", 0, 50, "chapter", "chapter", "YouTube", 0, 0, getHash("chapterVid-hash", 1), "Chapter 2"]); //7258
        await db.prepare("run", query, ["chapterVid-hash", 71, 75, 2, 0, "chapterVid-hash-3", "testman", 0, 50, "chapter", "chapter", "YouTube", 0, 0, getHash("chapterVid-hash", 1), "Chapter 3"]); //7258
        await db.prepare("run", query, ["longMuteVid-hash", 40, 45, 2, 0, "longMuteVid-hash-1", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, getHash("longMuteVid-hash", 1), ""]); //6613
        await db.prepare("run", query, ["longMuteVid-hash", 30, 35, 2, 0, "longMuteVid-hash-2", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, getHash("longMuteVid-hash", 1), ""]); //6613
        await db.prepare("run", query, ["longMuteVid-hash", 2, 80, 2, 0, "longMuteVid-hash-3", "testman", 0, 50, "sponsor", "mute", "YouTube", 0, 0, getHash("longMuteVid-hash", 1), ""]); //6613
        await db.prepare("run", query, ["longMuteVid-hash", 3, 78, 2, 0, "longMuteVid-hash-4", "testman", 0, 50, "sponsor", "mute", "YouTube", 0, 0, getHash("longMuteVid-hash", 1), ""]); //6613
        await db.prepare("run", query, ["longMuteVid-2-hash", 1, 15, 2, 0, "longMuteVid-2-hash-1", "testman", 0, 50, "sponsor", "mute", "YouTube", 0, 0, getHash("longMuteVid-2-hash", 1), ""]); //ab0c
        await db.prepare("run", query, ["longMuteVid-2-hash", 30, 35, 2, 0, "longMuteVid-2-hash-2", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, getHash("longMuteVid-2-hash", 1), ""]); //ab0c
        await db.prepare("run", query, ["longMuteVid-2-hash", 2, 80, 2, 0, "longMuteVid-2-hash-3", "testman", 0, 50, "sponsor", "mute", "YouTube", 0, 0, getHash("longMuteVid-2-hash", 1), ""]); //ab0c
        await db.prepare("run", query, ["longMuteVid-2-hash", 3, 78, 2, 0, "longMuteVid-2-hash-4", "testman", 0, 50, "sponsor", "mute", "YouTube", 0, 0, getHash("longMuteVid-2-hash", 1), ""]); //ab0c
        await db.prepare("run", query, ["requiredSegmentHashVid", 10, 20, -2, 0, "fbf0af454059733c8822f6a4ac8ec568e0787f8c0a5ee915dd5b05e0d7a9a388", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, requiredSegmentHashVidHash, ""]);
        await db.prepare("run", query, ["requiredSegmentHashVid", 20, 30, -2, 0, "7e1ebc5194551d2d0a606d64f675e5a14952e4576b2959f8c9d51e316c14f8da", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, requiredSegmentHashVidHash, ""]);
        await db.prepare("run", query, ["differentCategoryVid", 60, 70, 2, 0, "differentCategoryVid-1", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, differentCategoryVidHash, ""]);
        await db.prepare("run", query, ["differentCategoryVid", 60, 70, 2, 1, "differentCategoryVid-2", "testman", 0, 50, "intro", "skip", "YouTube", 0, 0, differentCategoryVidHash, ""]);
        await db.prepare("run", query, ["nonMusicOverlapVid", 60, 70, 2, 0, "nonMusicOverlapVid-1", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, nonMusicOverlapVidHash, ""]);
        await db.prepare("run", query, ["nonMusicOverlapVid", 60, 70, 2, 1, "nonMusicOverlapVid-2", "testman", 0, 50, "music_offtopic", "skip", "YouTube", 0, 0, nonMusicOverlapVidHash, ""]);
        await db.prepare("run", query, ["fullCategoryVid", 60, 70, 2, 0, "fullCategoryVid-1", "testman", 0, 50, "sponsor", "full", "YouTube", 0, 0, fullCategoryVidHash, ""]);
        await db.prepare("run", query, ["fullCategoryVid", 60, 70, 2, 1, "fullCategoryVid-2", "testman", 0, 50, "selfpromo", "full", "YouTube", 0, 0, fullCategoryVidHash, ""]);
    });

    it("Should be able to get a 200", (done) => {
        client.get(`${endpoint}/3272f`, { params: { categories: `["sponsor", "intro"]` } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 404 if no segments are found even if a video for the given hash is known", (done) => {
        client.get(`${endpoint}/3272f`, { params: { categories: `["shilling"]` } })
            .then(res => {
                assert.strictEqual(res.status, 404);
                assert.equal(res.data.length, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get an empty array if no videos", (done) => {
        client.get(`${endpoint}/11111`, { params: { categories: `["shilling"]` } })
            .then(res => {
                assert.strictEqual(res.status, 404);
                const body = res.data;
                assert.strictEqual(body.length, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get an empty array if only hidden videos", (done) => {
        client.get(`${endpoint}/f3a1`, { params: { categories:`["sponsor"]` } })
            .then(res => {
                if (res.status !== 404) done(`non 404 status code, was ${res.status}`);
                else {
                    const body = res.data;
                    if (body.length === 0) done(); // pass
                    else done("non empty array returned");
                }
            })
            .catch(err => done(err));
    });

    it("Should return 400 prefix too short", (done) => {
        client.get(`${endpoint}/11`, { params: { categories: `["shilling"]` } })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 prefix too long", (done) => {
        const prefix = "1".repeat(50);
        assert.ok(prefix.length > 33, "failed to generate long enough string");
        client.get(`${endpoint}/${prefix}`, { params: { categories: `["shilling"]` } })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 404 prefix in range", (done) => {
        const prefix = "1".repeat(5);
        client.get(`${endpoint}/${prefix}`, { params: { categories: `["shilling"]` } })
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for no hash", (done) => {
        client.get(`${endpoint}`, { params: { categories: `["shilling"]` } })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for bad format categories", (done) => {
        client.get(`${endpoint}/fdaf`, { params: { categories: "shilling" } })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get multiple videos", (done) => {
        client.get(`${endpoint}/fdaf`, { params: { categories: `["sponsor","intro"]` } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.strictEqual(data.length, 2);
                assert.strictEqual(data[0].segments.length, 2);
                assert.strictEqual(data[1].segments.length, 1);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get 200 for no categories (default sponsor)", (done) => {
        client.get(`${endpoint}/fdaf`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const expected = [{
                    segments: [{
                        category: "sponsor",
                        UUID: "getSegmentsByHash-01",
                    }]
                }, {
                    segments: [{
                        category: "sponsor",
                    }]
                }];
                assert.strictEqual(data.length, 2);
                assert.ok(partialDeepEquals(data, expected));
                assert.strictEqual(data[0].segments.length, 1);
                assert.strictEqual(data[1].segments.length, 1);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get 200 for no categories (default sponsor) with action type", (done) => {
        client.get(`${endpoint}/fdaf`, { params: { actionType: "skip" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.strictEqual(data.length, 2);
                assert.strictEqual(data[0].segments.length, 1);
                assert.strictEqual(data[1].segments.length, 1);
                const expected = [{
                    segments: [{
                        category: "sponsor",
                        UUID: "getSegmentsByHash-01",
                    }]
                }, {
                    segments: [{
                        category: "sponsor",
                    }]
                }];
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get 200 for no categories (default sponsor) with multiple action types", (done) => {
        client.get(`${endpoint}/fdaf?actionType=skip&actionType=mute`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.strictEqual(data.length, 2);
                assert.strictEqual(data[0].segments.length, 2);
                assert.strictEqual(data[1].segments.length, 1);
                const expected = [{
                    segments: [{
                        category: "sponsor",
                        UUID: "getSegmentsByHash-01",
                    }, {
                        UUID: "getSegmentsByHash-04",
                    }]
                }, {
                    segments: [{
                        category: "sponsor",
                    }]
                }];
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get 200 for no categories (default sponsor) with multiple action types (JSON array)", (done) => {
        client.get(`${endpoint}/fdaf?actionTypes=["skip","mute"]`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.strictEqual(data.length, 2);
                const expected = [{
                    segments: [{
                        category: "sponsor",
                        UUID: "getSegmentsByHash-01",
                    }, {
                        UUID: "getSegmentsByHash-04",
                    }]
                }, {
                    segments: [{
                        category: "sponsor",
                    }]
                }];
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get 200 for no categories (default sponsor) for a non YouTube service", (done) => {
        client.get(`${endpoint}/fdaf`, { params: { service: "PeerTube" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.strictEqual(data.length, 1);
                const expected = [{
                    segments: [{
                        UUID: "getSegmentsByHash-02"
                    }]
                }];
                assert.ok(partialDeepEquals(data, expected));
                assert.strictEqual(data[0].segments.length, 1);
                done();
            })
            .catch(err => done(err));
    });

    it("Should only return one segment when fetching highlight segments", (done) => {
        client.get(`${endpoint}/c962`, { params: { category: "poi_highlight" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.strictEqual(data.length, 1);
                assert.strictEqual(data[0].segments.length, 1);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to post a segment and get it using endpoint", (done) => {
        const testID = "abc123goodVideo";
        client.post("/api/skipSegments", {
            userID: "test-qwertyuiopasdfghjklzxcvbnm",
            videoID: testID,
            segments: [{
                segment: [13, 17],
                category: "sponsor",
            }],
        })
            .then(() => {
                client.get(`${endpoint}/${getHash(testID, 1).substring(0, 3)}`)
                    .then(res => {
                        assert.strictEqual(res.status, 200);
                        const data = res.data;
                        assert.strictEqual(data.length, 1);
                        const expected = [{
                            segments: [{
                                category: "sponsor",
                            }]
                        }];
                        assert.ok(partialDeepEquals(data, expected));
                        assert.strictEqual(data[0].segments.length, 1);
                        done();
                    })
                    .catch(err => done(`(get) ${err}`));
            })
            .catch(err => done(`(post) ${err}`));
    });

    it("Should be able to get multiple categories with repeating parameters", (done) => {
        client.get(`${endpoint}/fdaff4?&category=sponsor&category=intro`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.strictEqual(data.length, 1);
                const expected = [{
                    segments: [{
                        segment: [1, 10],
                        category: "sponsor",
                        UUID: "getSegmentsByHash-01",
                    }, {
                        segment: [20, 30],
                        category: "intro",
                        UUID: "getSegmentsByHash-03",
                    }]
                }];
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get specific segments with requiredSegments", (done) => {
        client.get(`${endpoint}/d518?requiredSegments=["requiredSegmentVid-2","requiredSegmentVid-3"]`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.strictEqual(data.length, 1);
                const expected = [{
                    segments: [{
                        UUID: "requiredSegmentVid-2"
                    }, {
                        UUID: "requiredSegmentVid-3"
                    }]
                }];
                assert.ok(partialDeepEquals(data, expected));
                assert.strictEqual(data[0].segments.length, 2);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get specific segments with repeating requiredSegment", (done) => {
        client.get(`${endpoint}/d518?requiredSegment=requiredSegmentVid-2&requiredSegment=requiredSegmentVid-3`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.strictEqual(data.length, 1);
                assert.strictEqual(data[0].segments.length, 2);
                const expected = [{
                    segments: [{
                        UUID: "requiredSegmentVid-2"
                    }, {
                        UUID: "requiredSegmentVid-3"
                    }]
                }];
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get overlapping chapter segments if very different", (done) => {
        client.get(`${endpoint}/7258?category=chapter&actionType=chapter`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.strictEqual(data.length, 1);
                const expected = [{
                    segments: [{
                        UUID: "chapterVid-hash-1",
                        description: "Chapter 1"
                    }, {
                        UUID: "chapterVid-hash-2",
                        description: "Chapter 2"
                    }]
                }];
                const expected2 = [{
                    segments: [{
                        UUID: "chapterVid-hash-1",
                        description: "Chapter 1"
                    }, {
                        UUID: "chapterVid-hash-3",
                        description: "Chapter 3"
                    }]
                }];

                assert.ok(partialDeepEquals(data, expected, false) || partialDeepEquals(data, expected2));
                assert.strictEqual(data[0].segments.length, 2);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get mute segment with small skip segment in middle", (done) => {
        client.get(`${endpoint}/6613?actionType=skip&actionType=mute`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.strictEqual(data.length, 1);
                const expected = [{
                    segments: [{
                        UUID: "longMuteVid-hash-3",
                        actionType: "mute"
                    }, {
                        UUID: "longMuteVid-hash-2",
                        actionType: "skip"
                    }, {
                        UUID: "longMuteVid-hash-1",
                        actionType: "skip"
                    }]
                }];
                const expected2 = [{
                    segments: [{
                        UUID: "longMuteVid-hash-4",
                        actionType: "mute"
                    }, {
                        UUID: "longMuteVid-hash-2",
                        actionType: "skip"
                    }, {
                        UUID: "longMuteVid-hash-1",
                        actionType: "skip"
                    }]
                }];

                assert.ok(arrayPartialDeepEquals(data, expected) || arrayPartialDeepEquals(data, expected2));
                assert.strictEqual(data[0].segments.length, 3);
                done();
            })
            .catch(err => done(err));
    });

    // This behavior was causing unintended consequence, uncommend when a solution is found
    // https://discord.com/channels/603643120093233162/607338052221665320/928099684835274883
    // it("Should be able to get only one segment when two categories are at the same time", (done) => {
    //     client.get(`${endpoint}/7fac?categories=["sponsor","intro"]`)
    //         .then(res => {
    //             assert.strictEqual(res.status, 200);
    //             const data = res.data;
    //             assert.strictEqual(data.length, 1);
    //             const expected = [{
    //                 segments: [{
    //                     category: "intro"
    //                 }]
    //             }];
    //             assert.ok(partialDeepEquals(data, expected));
    //             assert.strictEqual(data[0].segments.length, 1);
    //             done();
    //         })
    //         .catch(err => done(err));
    // });

    it("Should be able to get overlapping segments where one is non music and one is other", (done) => {
        client.get(`${endpoint}/3061?categories=["sponsor","music_offtopic"]`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.strictEqual(data.length, 1);
                const expected = [{
                    segments: [{
                        category: "sponsor"
                    }, {
                        category: "music_offtopic"
                    }]
                }];
                assert.ok(partialDeepEquals(data, expected));
                assert.strictEqual(data[0].segments.length, 2);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get mute segment with small skip segment in middle (2)", (done) => {
        client.get(`${endpoint}/ab0c?actionType=skip&actionType=mute`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.strictEqual(data.length, 1);
                const expected = [{
                    segments: [{
                        UUID: "longMuteVid-2-hash-1",
                        actionType: "mute"
                    }, {
                        UUID: "longMuteVid-2-hash-2",
                        actionType: "skip"
                    }]
                }];
                const expected2 = [{
                    segments: [{
                        UUID: "longMuteVid-2-hash-3",
                        actionType: "mute"
                    }, {
                        UUID: "longMuteVid-2-hash-2",
                        actionType: "skip"
                    }]
                }];
                const expected3 = [{
                    segments: [{
                        UUID: "longMuteVid-2-hash-4",
                        actionType: "mute"
                    }, {
                        UUID: "longMuteVid-2-hash-2",
                        actionType: "skip"
                    }]
                }];

                assert.ok(partialDeepEquals(data, expected, false) || partialDeepEquals(data, expected2) || partialDeepEquals(data, expected3));
                assert.strictEqual(data[0].segments.length, 2);
                done();
            })
            .catch(err => done(err));
    });

    it("Should only return one segment when fetching full video segments", (done) => {
        client.get(`${endpoint}/278f`, { params: { category: ["sponsor", "selfpromo"], actionType: "full" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.strictEqual(data.length, 1);
                assert.strictEqual(data[0].segments.length, 1);
                assert.strictEqual(data[0].segments[0].category, "selfpromo");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get specific segments with partial requiredSegments", (done) => {
        const requiredSegment1 = "fbf0af454059733c8822f6a4ac8ec568e0787f8c0a5ee915dd5b05e0d7a9a388";
        const requiredSegment2 = "7e1ebc5194551d2d0a606d64f675e5a14952e4576b2959f8c9d51e316c14f8da";
        client.get(`${endpoint}/17bf?requiredSegments=["${requiredSegment1.slice(0,8)}","${requiredSegment2.slice(0,8)}"]`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.strictEqual(data.length, 1);
                const expected = [{
                    segments: [{
                        UUID: requiredSegment1
                    }, {
                        UUID: requiredSegment2
                    }]
                }];
                assert.ok(partialDeepEquals(data, expected));
                assert.strictEqual(data[0].segments.length, 2);
                done();
            })
            .catch(err => done(err));
    });
});
