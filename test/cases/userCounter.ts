import axios from "axios";
import assert from "assert";
import { config } from "../../src/config";
import { getHash } from "../../src/utils/getHash";


describe("userCounter", () => {
    it("Should return 200", (done) => {
        if (!config.userCounterURL) return done(); // skip if no userCounterURL is set
        axios.request({
            method: "POST",
            baseURL: config.userCounterURL,
            url: "/api/v1/addIP",
            params: {
                hashedIP: getHash("127.0.0.1",1)
            }
        })
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });
});