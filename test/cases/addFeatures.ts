import assert from "assert";
import { db } from "../../src/databases/databases";
import { Feature } from "../../src/types/user.model";
import { hasFeature } from "../../src/utils/features";
import { client } from "../utils/httpClient";
import { grantFeature, insertVip } from "../utils/queryGen";
import { User, genUser, genUsersProxy } from "../utils/genUser";

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

const users = genUsersProxy("addFeatures");
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