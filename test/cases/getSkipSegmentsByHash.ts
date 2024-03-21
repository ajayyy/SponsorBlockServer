import { db } from "../../src/databases/databases";
import { partialDeepEquals } from "../utils/partialDeepEquals";
import { getHash } from "../../src/utils/getHash";
import { ImportMock, } from "ts-mock-imports";
import * as YouTubeAPIModule from "../../src/utils/youtubeApi";
import { genRandomNumber, genRandomValue, multiGenProxy } from "../utils/genRandom";
import { insertSegment, insertSegmentParams } from "../utils/segmentQueryGen";
import { YouTubeApiMock } from "../mocks/youtubeMock";
import { AxiosRequestConfig } from "axios";
import assert from "assert";
import { client } from "../utils/httpClient";
import { Service, VideoIDHash } from "../../src/types/segments.model";

const mockManager = ImportMock.mockStaticClass(YouTubeAPIModule, "YouTubeAPI");
const sinonStub = mockManager.mock("listVideos");
sinonStub.callsFake(YouTubeApiMock.listVideos);

type HashResponseSegment = {
    videoID: string,
    segments: ResponseSegment[]
}

type ResponseSegment = {
    segment?: [number, number] | number[],
    category?: string,
    UUID?: string,
    videoDuration?: number,
    actionType?: string,
    votes?: number,
    locked?: number,
    description?: string
};

const defaultResponseSegment = {
    segment: [1, 10] as [number, number],
    category: "sponsor",
    UUID: "",
    videoDuration: 0,
    actionType: "skip",
    votes: 0,
    locked: 0,
    description: ""
};

describe("getSkipSegmentsByHash", () => {
    const endpoint = "/api/skipSegments";
    const videoIDs = multiGenProxy("video", "getSegmentsByHash");
    const hashedVideoIDs = new Proxy({}, {
        get(target: Record<string, { videoID: string, hashedVideoID: VideoIDHash, hashPrefix: string }>, prop: string, receiver) {
            if (Reflect.has(target, prop)) return Reflect.get(target, prop, receiver);
            const videoID = videoIDs[prop];
            const hashedVideoID = getHash(videoID, 1);
            const hashPrefix = hashedVideoID.substring(0, 4);
            const result = { videoID, hashedVideoID, hashPrefix };
            Reflect.set(target, prop, result, receiver);
            return result;
        }
    });

    const requiredSegmentVidHash = getHash("requiredSegmentsVid", 1);
    const insertSegments: insertSegmentParams[] = [
        // videoID 0
        { videoID: hashedVideoIDs[0].videoID, startTime: 1, endTime: 10, UUID: "getSegmentsByHash-01" },
        { videoID: hashedVideoIDs[0].videoID, startTime: 1, endTime: 10, UUID: "getSegmentsByHash-02", service: Service.PeerTube },
        { videoID: hashedVideoIDs[0].videoID, startTime: 20, endTime: 30, UUID: "getSegmentsByHash-03", category: "intro" },
        { videoID: hashedVideoIDs[0].videoID, startTime: 40, endTime: 50, UUID: "getSegmentsByHash-04", actionType: "mute" },
        // getSegmentsByHash-noMatchHash
        { videoID: "getSegmentsByHash-noMatchHash", startTime: 40, endTime: 50, UUID: "getSegmentsByHash-noMatchHash", hashedVideoID: `${hashedVideoIDs[0].hashedVideoID.substring(0,5)}noMatchHash` },
        // videoID: "getSegmentsByHash-1"
        { videoID: "getSegmentsByHash-1", startTime: 60, endTime: 70, UUID: "getSegmentsByHash-1" },
        // videoID: onlyHidden
        { videoID: "onlyHidden", startTime: 60, endTime: 70, UUID: "onlyHidden", hidden: true },
        // videoID: highlightVid
        { videoID: hashedVideoIDs["highlight"].videoID, startTime: 60, endTime: 60, votes: 1, UUID: "highlightVid-1", category: "poi_highlight", actionType: "poi" },
        { videoID: hashedVideoIDs["highlight"].videoID, startTime: 70, endTime: 70, votes: 2, UUID: "highlightVid-2", category: "poi_highlight", actionType: "poi" },
        // videoID: requiredSegmentsVid
        { videoID: "requiredSegmentsVid", startTime: 60, endTime: 70, UUID: "requiredSegmentsVid-1", votes: 2 },
        { videoID: "requiredSegmentsVid", startTime: 60, endTime: 70, UUID: "requiredSegmentsVid-2", votes: -2 },
        { videoID: "requiredSegmentsVid", startTime: 80, endTime: 90, UUID: "requiredSegmentsVid-3", votes: -2 },
        { videoID: "requiredSegmentsVid", startTime: 80, endTime: 90, UUID: "requiredSegmentsVid-4", votes: 2 },
        // specific UUIDs
        { videoID: "requiredSegmentsHashVid", startTime: 10, endTime: 20, UUID: "fbf0af454059733c8822f6a4ac8ec568e0787f8c0a5ee915dd5b05e0d7a9a388", votes: -2 },
        { videoID: "requiredSegmentsHashVid", startTime: 20, endTime: 30, UUID: "7e1ebc5194551d2d0a606d64f675e5a14952e4576b2959f8c9d51e316c14f8da", votes: -2 },
        // videoID: chapterVid-hash
        { videoID: "chapterVid-hash", startTime: 60, endTime: 80, UUID: "chapterVid-hash-1", actionType: "chapter", category: "chapter", description: "Chapter 1" },
        { videoID: "chapterVid-hash", startTime: 70, endTime: 75, UUID: "chapterVid-hash-2", actionType: "chapter", category: "chapter", description: "Chapter 2" },
        { videoID: "chapterVid-hash", startTime: 71, endTime: 75, UUID: "chapterVid-hash-3", actionType: "chapter", category: "chapter", description: "Chapter 3" },
        // videoID: longMuteVid-hash
        { videoID: "longMuteVid-hash", startTime: 40, endTime: 45, UUID: "longMuteVid-hash-1" },
        { videoID: "longMuteVid-hash", startTime: 30, endTime: 35, UUID: "longMuteVid-hash-2" },
        { videoID: "longMuteVid-hash", startTime: 2, endTime: 80, UUID: "longMuteVid-hash-3", actionType: "mute" },
        { videoID: "longMuteVid-hash", startTime: 3, endTime: 78, UUID: "longMuteVid-hash-4", actionType: "mute" },
        // videoID: longMuteVid-2-hash
        { videoID: "longMuteVid-2-hash", startTime: 1, endTime: 15, UUID: "longMuteVid-2-hash-1", actionType: "mute" },
        { videoID: "longMuteVid-2-hash", startTime: 30, endTime: 35, UUID: "longMuteVid-2-hash-2" },
        { videoID: "longMuteVid-2-hash", startTime: 2, endTime: 80, UUID: "longMuteVid-2-hash-3", actionType: "mute" },
        { videoID: "longMuteVid-2-hash", startTime: 3, endTime: 78, UUID: "longMuteVid-2-hash-4",  actionType: "mute" },
        // videoID: differentCategoryVid
        { videoID: "differentCategoryVid", startTime: 60, endTime: 70, UUID: "differentCategoryVid-1", category: "sponsor" },
        { videoID: "differentCategoryVid", startTime: 60, endTime: 70, UUID: "differentCategoryVid-2", category: "intro" },
        // videoID: nonMusicOverlapVid
        { videoID: "nonMusicOverlapVid", startTime: 60, endTime: 70, UUID: "nonMusicOverlapVid-1", votes: 0, category: "sponsor" },
        { videoID: "nonMusicOverlapVid", startTime: 60, endTime: 70, UUID: "nonMusicOverlapVid-2", votes: 1, category: "music_offtopic" },
        // videoID: fullCategoryVid
        { videoID: "fullCategoryVid", startTime: 60, endTime: 70, UUID: "fullCategoryVid-1", votes: 0, category: "sponsor", actionType: "full" },
        { videoID: "fullCategoryVid", startTime: 60, endTime: 70, UUID: "fullCategoryVid-2", votes: 1, category: "selfpromo", actionType: "full" },
    ];

    const assertSegmentsEqual = async (hashPrefix: string, expectedUUIDs: string[], axiosConfig: AxiosRequestConfig = {}) => {
        // fetch segments
        const res = await client.get(`${endpoint}/${hashPrefix}`, axiosConfig);
        assert.strictEqual(res.status, 200);
        const data = (res.data as Array<any>).sort((a, b) => a.videoID.localeCompare(b.videoID));
        // sort out videos
        const expected = insertSegments.filter(segment => segment.UUID && expectedUUIDs.includes(segment.UUID));
        let expectedArray: HashResponseSegment[] = [];
        for (const segment of expected) {
            const videoID = segment.videoID;
            if (!videoID) throw new Error("VideoID is undefined");
            const rawResponse = {
                ...defaultResponseSegment,
                ...segment
            };
            if (!rawResponse.startTime || !rawResponse.endTime) throw new Error("startTime or endTime is undefined");
            const sanitizedResponse: ResponseSegment = {
                segment: [rawResponse.startTime, rawResponse.endTime],
                category: rawResponse.category,
                UUID: rawResponse.UUID,
                videoDuration: rawResponse.videoDuration,
                actionType: rawResponse.actionType,
                votes: rawResponse.votes,
                locked: Number(rawResponse.locked),
                description: rawResponse.description
            };
            // insert into array
            const match = expectedArray.findIndex((s: insertSegmentParams) => s.videoID === videoID);
            if (match !== -1) {
                expectedArray[match].segments.push(sanitizedResponse);
            } else {
                expectedArray.push({
                    videoID,
                    segments: [sanitizedResponse]
                });
            }
            // sort array to match
            expectedArray = expectedArray.sort((a, b) => a.videoID.localeCompare(b.videoID));
        }
        assert.ok(partialDeepEquals(data, expectedArray, true));
    };

    const assertSegmentsArray = async(hashPrefix: string, expectedArray: { segments: any[]}[][], axiosConfig: AxiosRequestConfig) => {
        // fetch segments
        const res = await client.get(`${endpoint}/${hashPrefix}`, axiosConfig);
        assert.strictEqual(res.status, 200);
        const data = (res.data as Array<any>).sort((a, b) => a.videoID.localeCompare(b.videoID));
        const arrayMatch = expectedArray.some(exp => partialDeepEquals(data, exp));
        assert.ok(arrayMatch);
        return assert.strictEqual(data[0].segments.length, expectedArray[0][0].segments.length);
    };

    before(async () => {
        for (const segment of insertSegments) {
            await insertSegment(db, segment);
        }
    });

    it("Should be able to get multiple videos", () => {
        const prefix = hashedVideoIDs[0].hashPrefix;
        return assertSegmentsEqual(prefix, ["getSegmentsByHash-01", "getSegmentsByHash-03", "getSegmentsByHash-noMatchHash"], { params: { categories: `["sponsor","intro"]` } });
    });

    it("Should be able to get 200 for no categories (default sponsor)", () => {
        return assertSegmentsEqual(hashedVideoIDs[0].hashPrefix, ["getSegmentsByHash-01", "getSegmentsByHash-noMatchHash"]);
    });

    it("Should be able to get 200 for no categories (default sponsor) with action type", () => {
        return assertSegmentsEqual(hashedVideoIDs[0].hashPrefix, ["getSegmentsByHash-01", "getSegmentsByHash-noMatchHash"], { params: { actionType: "skip" } });
    });

    it("Should be able to get 200 for no categories (default sponsor) with multiple action types", () => {
        return assertSegmentsEqual(hashedVideoIDs[0].hashPrefix, ["getSegmentsByHash-01", "getSegmentsByHash-04", "getSegmentsByHash-noMatchHash"], { params: { actionTypes: `["skip","mute"]` } });
    });

    it("Should be able to get 200 for no categories (default sponsor) for a non YouTube service", () => {
        return assertSegmentsEqual(hashedVideoIDs[0].hashPrefix, ["getSegmentsByHash-02"], { params: { service: "PeerTube" } });
    });

    it("Should only return one segment when fetching highlight segments", () => {
        return client.get(`${endpoint}/${hashedVideoIDs["highlight"].hashPrefix}`, { params: { category: "poi_highlight", actionType: "poi" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.length, 1);
                assert.strictEqual(res.data[0].segments.length, 1);
                assert.strictEqual(res.data[0].segments[0].category, "poi_highlight");
                assert.strictEqual(res.data[0].segments[0].actionType, "poi");
            });
    });

    it("Should return skip actionType for highlight for old clients", () => {
        return client.get(`${endpoint}/${hashedVideoIDs["highlight"].hashPrefix}`, { params: { category: "poi_highlight" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.length, 1);
                assert.strictEqual(res.data[0].segments.length, 1);
                assert.strictEqual(res.data[0].segments[0].category, "poi_highlight");
                assert.strictEqual(res.data[0].segments[0].actionType, "skip");
            });
    });

    it("Should be able to post a segment and get it using endpoint", async () => {
        const videoID = genRandomValue("video", "getSegmentsByHash");
        const segment = [genRandomNumber(0, 100), genRandomNumber(100, 200)];
        const submit = await client.post("/api/skipSegments", {
            userID: genRandomValue("user", "getSegmentsByHash"),
            videoID,
            segments: [{
                segment,
                category: "sponsor",
            }],
        });
        // check if segment was inserted
        assert.strictEqual(submit.status, 200);
        const videoIDHash = getHash(videoID, 1);
        const prefix = videoIDHash.substring(0, 3);
        const retreive = await client.get(`${endpoint}/${prefix}`);
        assert.strictEqual(retreive.status, 200);
        assert.strictEqual(retreive.data.length, 1);
        const expected = [{
            segments: [{
                segment,
                category: "sponsor",
            }]
        }];
        assert.ok(partialDeepEquals(retreive.data, expected));
        assert.strictEqual(retreive.data[0].segments.length, 1);
    });

    it("Should be able to get specific segments with requiredSegments", () => {
        const prefix = requiredSegmentVidHash.substring(0, 5);
        return assertSegmentsEqual(prefix, ["requiredSegmentsVid-2", "requiredSegmentsVid-3"], { params: { requiredSegments: `["requiredSegmentsVid-2","requiredSegmentsVid-3"]` } });
    });

    it("Should be able to get specific segments with repeating requiredSegment", () => {
        const prefix = requiredSegmentVidHash.substring(0, 5);
        const requiredSegments = ["requiredSegmentsVid-2","requiredSegmentsVid-3"];
        return assertSegmentsEqual(prefix, requiredSegments, { params: { requiredSegment: requiredSegments } });
    });

    it("Should be able to get overlapping chapter segments if very different", () => {
        const expectedArray = [
            [{
                segments: [{
                    UUID: "chapterVid-hash-1",
                    description: "Chapter 1"
                }, {
                    UUID: "chapterVid-hash-2",
                    description: "Chapter 2"
                }]
            }],
            [{
                segments: [{
                    UUID: "chapterVid-hash-1",
                    description: "Chapter 1"
                }, {
                    UUID: "chapterVid-hash-3",
                    description: "Chapter 3"
                }]
            }]
        ];
        return assertSegmentsArray("7258", expectedArray, { params: { category: "chapter", actionType: "chapter" } });
    });

    it("Should be able to get mute segment with small skip segment in middle", () => {
        const expectedArray = [
            [{
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
            }],
            [{
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
            }]
        ];
        return assertSegmentsArray("6613", expectedArray, { params: { actionType: ["skip", "mute"] } });
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

    it("Should be able to get overlapping segments where one is non music and one is other", () => {
        return assertSegmentsEqual("3061", ["nonMusicOverlapVid-1", "nonMusicOverlapVid-2"], { params: { categories: `["sponsor","music_offtopic"]` } });
    });

    it("Should be able to get mute segment with small skip segment in middle (2)", () => {
        const expectedArrays = [
            [{
                segments: [{
                    UUID: "longMuteVid-2-hash-1",
                    actionType: "mute"
                }, {
                    UUID: "longMuteVid-2-hash-2",
                    actionType: "skip"
                }]
            }],
            [{
                segments: [{
                    UUID: "longMuteVid-2-hash-3",
                    actionType: "mute"
                }, {
                    UUID: "longMuteVid-2-hash-2",
                    actionType: "skip"
                }]
            }],
            [{
                segments: [{
                    UUID: "longMuteVid-2-hash-4",
                    actionType: "mute"
                }, {
                    UUID: "longMuteVid-2-hash-2",
                    actionType: "skip"
                }]
            }]
        ];
        return assertSegmentsArray("ab0c", expectedArrays, { params: { actionType: ["skip", "mute"] } });
    });

    it("Should only return one segment when fetching full video segments", () => {
        return assertSegmentsEqual("278f", ["fullCategoryVid-2"], { params: { category: ["sponsor", "selfpromo"], actionType: "full" } });
    });

    it("Should be able to get specific segments with partial requiredSegments", () => {
        const requiredSegment1 = "fbf0af454059733c8822f6a4ac8ec568e0787f8c0a5ee915dd5b05e0d7a9a388";
        const requiredSegment2 = "7e1ebc5194551d2d0a606d64f675e5a14952e4576b2959f8c9d51e316c14f8da";
        return assertSegmentsEqual("32ef", [requiredSegment1, requiredSegment2], { params: { requiredSegments: `["${requiredSegment1.slice(0,8)}","${requiredSegment2.slice(0,8)}"]` } });
    });

    it("Should be able to get single segment with requiredSegments", () => {
        const requiredSegment = "fbf0af454059733c8822f6a4ac8ec568e0787f8c0a5ee915dd5b05e0d7a9a388";
        return assertSegmentsEqual("32ef", [requiredSegment], { params: { requiredSegment: requiredSegment } });
    });
});
