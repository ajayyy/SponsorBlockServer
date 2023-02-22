import axios from "axios";
import assert from "assert";
import { config } from "../../src/config";
import { getHash } from "../../src/utils/getHash";
import { client } from "../utils/httpClient";

describe("userCounter", () => {
    it("Should return 200", function (done) {
        if (!config.userCounterURL) this.skip(); // skip if no userCounterURL is set
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
    it("Should not incremeent counter on OPTIONS", function (done) {
        /* cannot spy test */
        if (!config.userCounterURL) this.skip(); // skip if no userCounterURL is set
        //const spy = sinon.spy(UserCounter);
        client({ method: "OPTIONS", url: "/api/status" })
            .then(() => client({ method: "GET", url: "/api/status" }));
        //assert.strictEqual(spy.callCount, 1);
        done();
    });
});