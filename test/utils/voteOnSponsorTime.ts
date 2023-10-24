import { client } from "../utils/httpClient";
import { db, privateDB } from "../../src/databases/databases";
import assert from "assert";
import { User } from "../utils/genUser";

// generic helpers
const endpoint = "/api/voteOnSponsorTime";
export const postVote = (userID: string, UUID: string, type: number) => client({
    method: "POST",
    url: endpoint,
    params: { userID, UUID, type }
});
export const postVoteCategory = (userID: string, UUID: string, category: string) => client({
    method: "POST",
    url: endpoint,
    params: { userID, UUID, category }
});

export const getSegmentVotes = (UUID: string) => db.prepare("get", `SELECT "votes" FROM "sponsorTimes" WHERE "UUID" = ?`, [UUID]);
export const assertVotes = async (user: User, UUID: string, voteType: number, voteResult: number, status = 200) => {
    const voteRes = await postVote(user.privID, UUID, voteType);
    assert.strictEqual(voteRes.status, status);
    const voteInfo = await getSegmentVotes(UUID);
    assert.strictEqual(Number(voteInfo.votes), voteResult, `expect votes value to be ${voteResult}`);
};

const getSegmentCategory = (UUID: string) => db.prepare("get", `SELECT "category" FROM "sponsorTimes" WHERE "UUID" = ?`, [UUID]);
export const assertCategory = async (user: User, UUID: string, targetCategory: string, expectedCategory: string, status = 200) => {
    const categoryRes = await postVoteCategory(user.privID, UUID, targetCategory);
    assert.strictEqual(categoryRes.status, status);
    const categoryInfo = await getSegmentCategory(UUID);
    assert.strictEqual(categoryInfo.category, expectedCategory);
};

const getPrivateVoteInfo = (UUID: string) => privateDB.prepare("all", `SELECT * FROM "votes" WHERE "UUID" = ?`, [UUID]);
export const assertPrivateVote = async (user: User, UUID: string, voteType: number) => {
    // assert private vote info
    const privateVoteInfo = await getPrivateVoteInfo(UUID);
    assert.strictEqual(privateVoteInfo.length, 1);
    assert.strictEqual(privateVoteInfo[0].normalUserID, user.pubID);
    assert.strictEqual(privateVoteInfo[0].type, voteType, `expect vote type to be ${voteType}`);
};

const getCategoryVoteInfo = (UUID: string, category: string) => db.prepare("get", `SELECT * FROM "categoryVotes" WHERE "UUID" = ? AND "category" = ?`, [UUID, category]);
export const assertCategoryVotes = async (UUID: string, category: string, votes: number) => {
    type categoryVoteRow = {
        UUID: string,
        category: string,
        votes: number
    };
    const categoryVoteInfo: categoryVoteRow = await getCategoryVoteInfo(UUID, category);
    const row = categoryVoteInfo;
    if (!row) throw new Error(`categoryVotes row not found for UUID ${UUID} and category ${category} at count ${votes}`);
    assert.strictEqual(row.votes, votes);
};

const getSegment = (UUID: string) => db.prepare("get", `SELECT * FROM "sponsorTimes" WHERE "UUID" = ?`, [UUID]);
export const assertSegmentStatus = async (user: User, UUID: string, vote: number, status: string, value: number) => {
    const voteRes = await postVote(user.privID, UUID, vote);
    assert.strictEqual(voteRes.status, 200);
    const row = await getSegment(UUID);
    assert.strictEqual(row[status], value);
};