import { db } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";
import { AxiosResponse } from "axios";
import { UsernameUser, genUser, genUsersUsername } from "../utils/genUser";
import { insertUsernameBulk } from "../utils/queryGen";

const endpoint = "/api/userID";
const getUserName = (username: string, exact: any = false): Promise<AxiosResponse> => client.get(endpoint, { params: { username, exact } });

const validateSearch = (query: string, users: UsernameUser[], exact: number | boolean = false): Promise<void> =>
    getUserName(query, exact)
        .then(res => {
            assert.strictEqual(res.status, 200);
            const expected = users.map(user => ({
                userName: user.username,
                userID: user.pubID
            }));
            assert.deepStrictEqual(res.data, expected);
        });

const validateSearchWithUser = (user: UsernameUser, exact = false): Promise<void> =>
    validateSearch(user.username, [user], exact);

const cases = new Map([
    ["fuzzy_1", "fuzzy user 01"],
    ["fuzzy_2", "fuzzy user 02"],
    ["specific_1", "specific user 03"],
    ["repeating_1", "repeating"],
    ["repeating_2", "repeating"],
    ["redos_1", "0redis0"],
    ["redos_2", "%redos%"],
    ["redos_3", "_redos_"],
    ["redos_4", "redos\\%"],
    ["redos_5", "\\\\\\"],
    ["exact_1", "a"],
]);

const userPublicOne = genUser("getUserID", "public_1");
const users = genUsersUsername("getUserID", cases);
users["public_1"] = { ...userPublicOne, username: userPublicOne.pubID };

describe("getUserID", () => {
    before(async () => {
        await insertUsernameBulk(db, users);
    });

    // status tests
    it("Should be able to get a 200", () =>
        getUserName("fuzzy user 01")
            .then(res => assert.strictEqual(res.status, 200))
    );

    it("Should be able to get a 200 (username is public id)", () =>
        getUserName(users["public_1"].username)
            .then(res => assert.strictEqual(res.status, 200))
    );

    // individual user tests
    it("Should be able to get single username", () => validateSearchWithUser(users["fuzzy_1"]));
    it("Should be able to get with public ID", () => validateSearchWithUser(users["public_1"]));

    // individual user ReDOS
    it("should avoid ReDOS with _", () => validateSearchWithUser(users["redos_3"]));
    it("should avoid ReDOS with %", () => validateSearchWithUser(users["redos_2"]));
    it("should return user if just backslashes", () => validateSearchWithUser(users["redos_5"]));
    it("should allow exact match", () => validateSearchWithUser(users["exact_1"], true));

    // fuzzy tests
    it("Should be able to get multiple fuzzy user info from start", () =>
        validateSearch("fuzzy user",
            [users["fuzzy_1"], users["fuzzy_2"]]
        )
    );

    it("Should be able to get multiple fuzzy user info from middle", () => {
        validateSearch("user",
            [users["fuzzy_1"], users["fuzzy_2"], users["specific_1"]]
        );
    });

    it("Should be able to get with fuzzy public ID", () => {
        const userID = users["public_1"].pubID.substring(0,60);
        return validateSearch(userID,
            [users["public_1"]]
        );
    });

    it("Should be able to get repeating username", () =>
        validateSearch("repeating", [users["repeating_1"], users["repeating_2"]])
    );

    it("Should be able to get repeating fuzzy username", () =>
        validateSearch("peat", [users["repeating_1"], users["repeating_2"]])
    );

    it("Should be able to get repeating username with exact username", () =>
        validateSearch("repeating", [users["repeating_1"], users["repeating_2"]], true)
    );

    it("Should not get exact unless explicitly set to true", () =>
        validateSearch("user", [users["fuzzy_1"], users["fuzzy_2"], users["specific_1"]], 1)
    );
});

describe("getUserID 400/ 404", () => {
    const validateStatus = (query: string, status: number) =>
        getUserName(query)
            .then(res => assert.strictEqual(res.status, status));

    it("Should be able to get a 400 (No username parameter)", () =>
        client.get(endpoint)
            .then(res => assert.strictEqual(res.status, 400))
    );

    it("Should not allow usernames more than 64 characters", () => validateStatus("0".repeat(65), 400));
    it("Should not allow usernames less than 3 characters", () => validateStatus("aa", 400));
    it("Should return 404 if escaped backslashes present", () => validateStatus("%redos\\\\_", 404));
    it("Should return 404 if backslashes present", () => validateStatus(`\\%redos\\_`, 404));
});