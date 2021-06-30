import fetch from 'node-fetch';
import {getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';
import {ImportMock,} from 'ts-mock-imports';
import * as YouTubeAPIModule from '../../src/utils/youtubeApi';
import {YouTubeApiMock} from '../youtubeMock';
import {IDatabase} from "../../src/databases/IDatabase";

declare const db: IDatabase

const mockManager = ImportMock.mockStaticClass(YouTubeAPIModule, 'YouTubeAPI');
const sinonStub = mockManager.mock('listVideos');
sinonStub.callsFake(YouTubeApiMock.listVideos);

describe('getSegmentsByHash', () => {
    beforeAll(async () => {
        const query = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "service", "hidden", "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", query, ['getSegmentsByHash-0', 1, 10, 2, 'getSegmentsByHash-0-0', 'testman', 0, 50, 'sponsor', 'YouTube', 0, 0, 'fdaff4dee1043451faa7398324fb63d8618ebcd11bddfe0491c488db12c6c910']);
        await db.prepare("run", query, ['getSegmentsByHash-0', 1, 10, 2, 'getSegmentsByHash-0-0-1', 'testman', 0, 50, 'sponsor', 'PeerTube', 0, 0, 'fdaff4dee1043451faa7398324fb63d8618ebcd11bddfe0491c488db12c6c910']);
        await db.prepare("run", query, ['getSegmentsByHash-0', 20, 30, 2, 'getSegmentsByHash-0-1', 'testman', 100, 150, 'intro', 'YouTube', 0, 0, 'fdaff4dee1043451faa7398324fb63d8618ebcd11bddfe0491c488db12c6c910']);
        await db.prepare("run", query, ['getSegmentsByHash-noMatchHash', 40, 50, 2, 'getSegmentsByHash-noMatchHash', 'testman', 0, 50, 'sponsor', 'YouTube', 0, 0, 'fdaffnoMatchHash']);
        await db.prepare("run", query, ['getSegmentsByHash-1', 60, 70, 2, 'getSegmentsByHash-1', 'testman', 0, 50, 'sponsor', 'YouTube', 0, 0, '3272fa85ee0927f6073ef6f07ad5f3146047c1abba794cfa364d65ab9921692b']);
        await db.prepare("run", query, ['onlyHidden', 60, 70, 2, 'onlyHidden', 'testman', 0, 50, 'sponsor', 'YouTube', 1, 0, 'f3a199e1af001d716cdc6599360e2b062c2d2b3fa2885f6d9d2fd741166cbbd3']);
        await db.prepare("run", query, ['highlightVid', 60, 60, 2, 'highlightVid-1', 'testman', 0, 50, 'highlight', 'YouTube', 0, 0, getHash('highlightVid', 1)]);
        await db.prepare("run", query, ['highlightVid', 70, 70, 2, 'highlightVid-2', 'testman', 0, 50, 'highlight', 'YouTube', 0, 0, getHash('highlightVid', 1)]);
    });

    it('Should be able to get a 200', async () => {
        const res = await fetch(getbaseURL() + '/api/skipSegments/3272f?categories=["sponsor", "intro"]')
        if (res.status !== 200) throw new Error("non 200 status code, was " + res.status);
    });

    it('Should return 404 if no segments are found even if a video for the given hash is known', async () => {
        const res = await fetch(getbaseURL() + '/api/skipSegments/3272f?categories=["shilling"]')
        if (res.status !== 404) {
            throw new Error("non 404 status code, was " + res.status);
        } else {
            const body = await res.text();
            if (body !== '[]') throw new Error("Response had videos");
        }
    });

    it('Should be able to get an empty array if no videos', async () => {
        const res = await fetch(getbaseURL() + '/api/skipSegments/11111?categories=["shilling"]')
        if (res.status !== 404) {
            throw new Error("non 404 status code, was " + res.status);
        } else {
            const body = await res.text();
            if (JSON.parse(body).length !== 0 || body !== '[]') throw new Error("non empty array returned");
        }
    });

    it('Should be able to get an empty array if only hidden videos', async () => {
        const res = await fetch(getbaseURL() + '/api/skipSegments/f3a1?categories=["sponsor"]')
        if (res.status !== 404) {
            throw new Error("non 404 status code, was " + res.status);
        } else {
            const body = await res.text();
            if (JSON.parse(body).length !== 0 || body !== '[]') throw new Error("non empty array returned");
        }
    });

    it('Should return 400 prefix too short', async () => {
        const res = await fetch(getbaseURL() + '/api/skipSegments/11?categories=["shilling"]')
        if (res.status !== 400) throw new Error("non 400 status code, was " + res.status);
    });

    it('Should return 400 prefix too long', async () => {
        let prefix = new Array(50).join('1');
        if (prefix.length <= 32) { // default value, config can change this
            throw new Error('failed to generate a long enough string for the test ' + prefix.length);
        }
        const res = await fetch(getbaseURL() + '/api/skipSegments/' + prefix + '?categories=["shilling"]')
        if (res.status !== 400) throw new Error("non 400 status code, was " + res.status);
    });

    it('Should not return 400 prefix in range', () =>
        fetch(getbaseURL() + '/api/skipSegments/11111?categories=["shilling"]')
            .then(res => {
                if (res.status === 400) throw new Error("prefix length 5 gave 400 " + res.status);
            })
    );

    it('Should return 404 for no hash', () =>
        fetch(getbaseURL() + '/api/skipSegments/?categories=["shilling"]')
            .then(res => {
                if (res.status !== 404) throw new Error("expected 404, got " + res.status);
            })
    );

    it('Should return 400 for bad format categories', () =>
        fetch(getbaseURL() + '/api/skipSegments/fdaf?categories=shilling')
            .then(res => {
                if (res.status !== 400) throw new Error("expected 400 got " + res.status);
            })
    );

    it('Should be able to get multiple videos', async () => {
        const res = await fetch(getbaseURL() + '/api/skipSegments/fdaf?categories=["sponsor","intro"]')
        if (res.status !== 200) throw new Error("non 200 status code, was " + res.status);
        else {
            const body = await res.json();
            if (body.length !== 2) throw new Error("expected 2 videos, got " + body.length);
            else if (body[0].segments.length !== 2) throw new Error("expected 2 segments for first video, got " + body[0].segments.length);
            else if (body[1].segments.length !== 1) throw new Error("expected 1 segment for second video, got " + body[1].segments.length);
        }
    });

    it('Should be able to get 200 for no categories (default sponsor)', async () => {
        const res = await fetch(getbaseURL() + '/api/skipSegments/fdaf')
        if (res.status !== 200) throw new Error("non 200 status code, was " + res.status);
        else {
            const body = await res.json();
            if (body.length !== 2) throw new Error("expected 2 videos, got " + body.length);
            else if (body[0].segments.length !== 1) throw new Error("expected 1 segments for first video, got " + body[0].segments.length);
            else if (body[1].segments.length !== 1) throw new Error("expected 1 segments for second video, got " + body[1].segments.length);
            else if (body[0].segments[0].category !== 'sponsor'
                || body[0].segments[0].UUID !== 'getSegmentsByHash-0-0'
                || body[1].segments[0].category !== 'sponsor') throw new Error("both segments are not sponsor");
        }
    });

    it('Should be able to get 200 for no categories (default sponsor) for a non YouTube service', async () => {
        const res = await fetch(getbaseURL() + '/api/skipSegments/fdaf?service=PeerTube')
        if (res.status !== 200) throw new Error("non 200 status code, was " + res.status);
        else {
            const body = await res.json();
            if (body.length !== 1) throw new Error("expected 1 video, got " + body.length);
            else if (body[0].segments.length !== 1) throw new Error("expected 1 segments for first video, got " + body[0].segments.length);
            else if (body[0].segments[0].UUID !== 'getSegmentsByHash-0-0-1') throw new Error("both segments are not sponsor");
        }
    });

    it('Should only return one segment when fetching highlight segments', async () => {
        const res = await fetch(getbaseURL() + '/api/skipSegments/c962?category=highlight')
        if (res.status !== 200) throw new Error("non 200 status code, was " + res.status);
        else {
            const body = await res.json();
            if (body.length !== 1) throw new Error("expected 1 video, got " + body.length);
            else if (body[0].segments.length !== 1) throw new Error("expected 1 segment, got " + body[0].segments.length);
        }
    });

    it('Should be able to post a segment and get it using endpoint', async () => {
        let testID = 'abc123goodVideo';
        const res = await fetch(getbaseURL() + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "test",
                videoID: testID,
                segments: [{
                    segment: [13, 17],
                    category: "sponsor",
                }],
            }),
        })
        if (res.status === 200) {
            const res = await fetch(getbaseURL() + '/api/skipSegments/' + getHash(testID, 1).substring(0, 3))
            if (res.status !== 200) throw new Error("(get) non 200 status code, was " + res.status);
            else {
                const body = await res.json();
                if (body.length !== 1) throw new Error("(get) expected 1 video, got " + body.length);
                else if (body[0].segments.length !== 1) throw new Error("(get) expected 1 segments for first video, got " + body[0].segments.length);
                else if (body[0].segments[0].category !== 'sponsor') throw new Error("(get) segment should be sponsor, was " + body[0].segments[0].category);
            }
        } else {
            throw new Error("(post) non 200 status code, was " + res.status);
        }
    });
});
