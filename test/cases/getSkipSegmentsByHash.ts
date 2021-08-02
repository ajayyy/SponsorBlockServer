import fetch from "node-fetch";
import {db} from "../../src/databases/databases";
import {Done, getbaseURL, objectContain} from "../utils";
import {getHash} from "../../src/utils/getHash";
import {ImportMock,} from "ts-mock-imports";
import * as YouTubeAPIModule from "../../src/utils/youtubeApi";
import {YouTubeApiMock} from "../youtubeMock";
import assert from "assert";

const mockManager = ImportMock.mockStaticClass(YouTubeAPIModule, "YouTubeAPI");
const sinonStub = mockManager.mock("listVideos");
sinonStub.callsFake(YouTubeApiMock.listVideos);

describe("getSkipSegmentsByHash", () => {
    before(async () => {
        const query = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "actionType", "service", "hidden", "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", query, ["getSegmentsByHash-0", 1, 10, 2, "getSegmentsByHash-0-0", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, "fdaff4dee1043451faa7398324fb63d8618ebcd11bddfe0491c488db12c6c910"]);
        await db.prepare("run", query, ["getSegmentsByHash-0", 1, 10, 2, "getSegmentsByHash-0-0-1", "testman", 0, 50, "sponsor", "skip", "PeerTube", 0, 0, "fdaff4dee1043451faa7398324fb63d8618ebcd11bddfe0491c488db12c6c910"]);
        await db.prepare("run", query, ["getSegmentsByHash-0", 20, 30, 2, "getSegmentsByHash-0-1", "testman", 100, 150, "intro", "skip", "YouTube", 0, 0, "fdaff4dee1043451faa7398324fb63d8618ebcd11bddfe0491c488db12c6c910"]);
        await db.prepare("run", query, ["getSegmentsByHash-0", 40, 50, 2, "getSegmentsByHash-0-2", "testman", 0, 50, "sponsor", "mute", "YouTube", 0, 0, "fdaff4dee1043451faa7398324fb63d8618ebcd11bddfe0491c488db12c6c910"]);
        await db.prepare("run", query, ["getSegmentsByHash-noMatchHash", 40, 50, 2, "getSegmentsByHash-noMatchHash", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, "fdaffnoMatchHash"]);
        await db.prepare("run", query, ["getSegmentsByHash-1", 60, 70, 2, "getSegmentsByHash-1", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, "3272fa85ee0927f6073ef6f07ad5f3146047c1abba794cfa364d65ab9921692b"]);
        await db.prepare("run", query, ["onlyHidden", 60, 70, 2, "onlyHidden", "testman", 0, 50, "sponsor", "skip", "YouTube", 1, 0, "f3a199e1af001d716cdc6599360e2b062c2d2b3fa2885f6d9d2fd741166cbbd3"]);
        await db.prepare("run", query, ["highlightVid", 60, 60, 2, "highlightVid-1", "testman", 0, 50, "highlight", "skip", "YouTube", 0, 0, getHash("highlightVid", 1)]);
        await db.prepare("run", query, ["highlightVid", 70, 70, 2, "highlightVid-2", "testman", 0, 50, "highlight", "skip", "YouTube", 0, 0, getHash("highlightVid", 1)]);
        await db.prepare("run", query, ["requiredSegmentVid", 60, 70, 2, "requiredSegmentVid-1", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, "d51822c3f681e07aef15a8855f52ad12db9eb9cf059e65b16b64c43359557f61"]);
        await db.prepare("run", query, ["requiredSegmentVid", 60, 70, -2, "requiredSegmentVid-2", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, "d51822c3f681e07aef15a8855f52ad12db9eb9cf059e65b16b64c43359557f61"]);
        await db.prepare("run", query, ["requiredSegmentVid", 80, 90, -2, "requiredSegmentVid-3", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, "d51822c3f681e07aef15a8855f52ad12db9eb9cf059e65b16b64c43359557f61"]);
        await db.prepare("run", query, ["requiredSegmentVid", 80, 90, 2, "requiredSegmentVid-4", "testman", 0, 50, "sponsor", "skip", "YouTube", 0, 0, "d51822c3f681e07aef15a8855f52ad12db9eb9cf059e65b16b64c43359557f61"]);
    });

    it("Should be able to get a 200", (done: Done) => {
        fetch(`${getbaseURL()}/api/skipSegments/3272f?categories=["sponsor", "intro"]`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 404 if no segments are found even if a video for the given hash is known", (done: Done) => {
        fetch(`${getbaseURL()}/api/skipSegments/3272f?categories=["shilling"]`)
            .then(async res => {
                assert.strictEqual(res.status, 404);
                const expected = "[]";
                const body = await res.text();
                assert.strictEqual(body, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get an empty array if no videos", (done: Done) => {
        fetch(`${getbaseURL()}/api/skipSegments/11111?categories=["shilling"]`)
            .then(async res => {
                assert.strictEqual(res.status, 404);
                const body = await res.text();
                const expected = "[]";
                assert.strictEqual(JSON.parse(body).length, 0);
                assert.strictEqual(body, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get an empty array if only hidden videos", (done: Done) => {
        fetch(`${getbaseURL()}/api/skipSegments/f3a1?categories=["sponsor"]`)
            .then(async res => {
                if (res.status !== 404) done(`non 404 status code, was ${res.status}`);
                else {
                    const body = await res.text();
                    if (JSON.parse(body).length === 0 && body === "[]") done(); // pass
                    else done("non empty array returned");
                }
            })
            .catch(err => done(err));
    });

    it("Should return 400 prefix too short", (done: Done) => {
        fetch(`${getbaseURL()}/api/skipSegments/11?categories=["shilling"]`)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 prefix too long", (done: Done) => {
        const prefix = "1".repeat(50);
        assert.ok(prefix.length > 33, "failed to generate long enough string");
        fetch(`${getbaseURL()}/api/skipSegments/${prefix}?categories=["shilling"]`)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 404 prefix in range", (done: Done) => {
        const prefix = "1".repeat(5);
        fetch(`${getbaseURL()}/api/skipSegments/${prefix}?categories=["shilling"]`)
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for no hash", (done: Done) => {
        fetch(`${getbaseURL()}/api/skipSegments/?categories=["shilling"]`)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for bad format categories", (done: Done) => {
        fetch(`${getbaseURL()}/api/skipSegments/fdaf?categories=shilling`)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get multiple videos", (done: Done) => {
        fetch(`${getbaseURL()}/api/skipSegments/fdaf?categories=["sponsor","intro"]`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();

                assert(objectContain(data, {
                    length: 2,
                    0: {segments: {length: 2}},
                    1: {segments: {length: 1}}
                }));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get 200 for no categories (default sponsor)", (done: Done) => {
        fetch(`${getbaseURL()}/api/skipSegments/fdaf`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();

                assert(objectContain(data, {
                    length: 2,
                    0: {
                        segments: {
                            length: 1,
                            0: {
                                category: "sponsor",
                                UUID: "getSegmentsByHash-0-0"
                            }
                        }
                    },
                    1: {
                        segments: {
                            length: 1,
                            0: {
                                category: "sponsor"
                            }
                        },
                    }
                }));

                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get 200 for no categories (default sponsor) with action type", (done: Done) => {
        fetch(`${getbaseURL()}/api/skipSegments/fdaf?actionType=skip`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();

                assert(objectContain(data, {
                    length: 2,
                    0: {
                        segments: {
                            length: 1,
                            0: {
                                category: "sponsor",
                                UUID: "getSegmentsByHash-0-0"
                            }
                        }
                    },
                    1: {
                        segments: {
                            length: 1,
                            0: {
                                category: "sponsor"
                            }
                        },
                    }
                }));

                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get 200 for no categories (default sponsor) with multiple action types", (done: Done) => {
        fetch(`${getbaseURL()}/api/skipSegments/fdaf?actionType=skip&actionType=mute`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();

                assert(objectContain(data, {
                    length: 2,
                    0: {
                        segments: {
                            length: 2,
                            0: {
                                category: "sponsor",
                                UUID: "getSegmentsByHash-0-0" },
                            1: {
                                UUID: "getSegmentsByHash-0-2" }
                        }
                    },
                    1: {
                        segments: {
                            length: 1,
                            0: {
                                category: "sponsor"
                            }
                        },
                    }
                }));

                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get 200 for no categories (default sponsor) with multiple action types (JSON array)", (done: Done) => {
        fetch(`${getbaseURL()}/api/skipSegments/fdaf?actionTypes=["skip","mute"]`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();

                assert(objectContain(data, {
                    length: 2,
                    0: {
                        segments: {
                            length: 2,
                            0: {
                                category: "sponsor",
                                UUID: "getSegmentsByHash-0-0" },
                            1: {
                                UUID: "getSegmentsByHash-0-2" }
                        }
                    },
                    1: {
                        segments: {
                            length: 1,
                            0: {
                                category: "sponsor"
                            }
                        },
                    }
                }));

                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get 200 for no categories (default sponsor) for a non YouTube service", (done: Done) => {
        fetch(`${getbaseURL()}/api/skipSegments/fdaf?service=PeerTube`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();

                assert(objectContain(data, {
                    length: 1,
                    0: {
                        segments: {
                            length: 1,
                            0: {
                                UUID: "getSegmentsByHash-0-0-1"
                            },
                        }
                    }
                }));

                done();
            })
            .catch(err => done(err));
    });

    it("Should only return one segment when fetching highlight segments", (done: Done) => {
        fetch(`${getbaseURL()}/api/skipSegments/c962?category=highlight`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();

                assert(objectContain(data, {
                    length: 1,
                    0: {
                        segments: {
                            length: 1,
                        }
                    }
                }));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to post a segment and get it using endpoint", (done: Done) => {
        const testID = "abc123goodVideo";
        fetch(`${getbaseURL()}/api/postVideoSponsorTimes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userID: "test-qwertyuiopasdfghjklzxcvbnm",
                videoID: testID,
                segments: [{
                    segment: [13, 17],
                    category: "sponsor",
                }],
            }),
        })
            .then(async () => {
                fetch(`${getbaseURL()}/api/skipSegments/${getHash(testID, 1).substring(0, 3)}`)
                    .then(async res => {
                        assert.strictEqual(res.status, 200);
                        const data = await res.json();

                        assert(objectContain(data, {
                            length: 1,
                            0: {
                                segments: {
                                    length: 1,
                                    0: {category: "sponsor"}
                                }
                            }
                        }));
                        done();
                    })
                    .catch(err => done(`(get) ${err}`));
            })
            .catch(err => done(`(post) ${err}`));
    });

    it("Should be able to get multiple categories with repeating parameters", (done: Done) => {
        fetch(`${getbaseURL()}/api/skipSegments/fdaff4?&category=sponsor&category=intro`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();

                assert(objectContain(data, {
                    length: 1,
                    0: {
                        segments: {
                            length: 2,
                            0: {
                                segment:{
                                    0: 1,
                                    1: 10},
                                category: "sponsor",
                                UUID: "getSegmentsByHash-0-0" },
                            1: {
                                segment:{
                                    0: 20,
                                    1: 30},
                                category: "intro",
                                UUID: "getSegmentsByHash-0-1" }
                        }
                    }
                }));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get specific segments with requiredSegments", (done: Done) => {
        fetch(`${getbaseURL()}/api/skipSegments/d518?requiredSegments=["requiredSegmentVid-2","requiredSegmentVid-3"]`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();

                assert(objectContain(data, {
                    length: 1,
                    0: {
                        segments: {
                            length: 2,
                            0: {
                                UUID: "requiredSegmentVid-2" },
                        }
                    }
                }));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get specific segments with repeating requiredSegment", (done: Done) => {
        fetch(`${getbaseURL()}/api/skipSegments/d518?requiredSegment=requiredSegmentVid-2&requiredSegment=requiredSegmentVid-3`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();

                assert(objectContain(data, {
                    length: 1,
                    0: {
                        segments: {
                            length: 2,
                            0: {
                                UUID: "requiredSegmentVid-2" },
                            1: {
                                UUID: "requiredSegmentVid-3" },
                        }
                    }
                }));
                done();
            })
            .catch(err => done(err));
    });
});
