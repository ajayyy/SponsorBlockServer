import assert from "assert";
import { db } from "../../src/databases/databases";
import { Feature, HashedUserID } from "../../src/types/user.model";
import { hasFeature } from "../../src/utils/features";
import { getHash } from "../../src/utils/getHash";
import { client } from "../utils/httpClient";

const endpoint = "/api/feature";

const postAddFeatures = (userID: string, adminUserID: string, feature: Feature, enabled: string) => client({
    method: "POST",
    url: endpoint,
    data: {
        userID,
        feature,
        enabled,
        adminUserID
    }
});

const privateVipUserID = "VIPUser-addFeatures";
const vipUserID = getHash(privateVipUserID);

const hashedUserID1 = "user1-addFeatures" as HashedUserID;
const hashedUserID2 = "user2-addFeatures" as HashedUserID;
const hashedUserID3 = "user3-addFeatures" as HashedUserID;

const validFeatures = [Feature.ChapterSubmitter];

describe("addFeatures", () => {
    before(() => {
        const userFeatureQuery = `INSERT INTO "userFeatures" ("userID", "feature", "issuerUserID", "timeSubmitted") VALUES(?, ?, ?, ?)`;

        return Promise.all([
            db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES (?)`, [vipUserID]),

            db.prepare("run", userFeatureQuery, [hashedUserID2, Feature.ChapterSubmitter, "some-user", 0]),
            db.prepare("run", userFeatureQuery, [hashedUserID3, Feature.ChapterSubmitter, "some-user", 0])
        ]);
    });

    it("can add features", async () => {
        for (const feature of validFeatures) {
            const result = await postAddFeatures(hashedUserID1, privateVipUserID, feature, "true");
            assert.strictEqual(result.status, 200);

            assert.strictEqual(await hasFeature(hashedUserID1, feature), true);
        }
    });

    it("can remove features", async () => {
        const feature = Feature.ChapterSubmitter;

        const result = await postAddFeatures(hashedUserID2, privateVipUserID, feature, "false");
        assert.strictEqual(result.status, 200);

        assert.strictEqual(await hasFeature(hashedUserID2, feature), false);
    });

    it("can update features", async () => {
        const feature = Feature.ChapterSubmitter;

        const result = await postAddFeatures(hashedUserID3, privateVipUserID, feature, "true");
        assert.strictEqual(result.status, 200);

        assert.strictEqual(await hasFeature(hashedUserID3, feature), true);
    });
});