import assert from "assert";

import { db } from "#databases/databases";
import { hasFeature } from "#utils/features";
import { Feature } from "#types/user";

import { client } from "#test/utils/httpClient";
import { grantFeature, insertVip } from "#test/utils/queryGen";
import { User, genUser, genUsers } from "#test/utils/genUser";

const endpoint = "/api/feature";

const postAddFeatures = (userID: string, adminUserID: string, feature: Feature, enabled: boolean) => client({
    method: "POST",
    url: endpoint,
    data: {
        userID,
        feature,
        enabled: String(enabled),
        adminUserID
    }
});

const cases = [
    "grant",
    "remove",
    "update"
];
const users = genUsers("addFeatures", cases);
const vipUser = genUser("addFeatures", "vip");

const testedFeature = Feature.ChapterSubmitter;
const validFeatures = [testedFeature];

const updateValidateFeature = (user: User, feature: Feature, grant: boolean, issuer: User): Promise<void> =>
    postAddFeatures(user.pubID, issuer.privID, feature, grant)
        .then(res => assert.strictEqual(res.status, 200)) // ensure request was successful
        .then(() => hasFeature(user.pubID, feature))
        .then(result => assert.strictEqual(result, grant)); // ensure user has new feature

describe("addFeatures", () => {
    before(async () => {
        await insertVip(db, vipUser.pubID);
        await grantFeature(db, users["remove"].pubID, testedFeature, vipUser.pubID);
        await grantFeature(db, users["update"].pubID, testedFeature, vipUser.pubID);
    });

    it("can add features", (done) => {
        for (const feature of validFeatures) {
            updateValidateFeature(users["grant"], feature, true, vipUser)
                .catch(err => done(err));
        }
        done();
    });

    it("can remove features", () => updateValidateFeature(users["remove"], testedFeature, false, vipUser));

    it("can update features", () => updateValidateFeature(users["update"], testedFeature, true, vipUser));
});
