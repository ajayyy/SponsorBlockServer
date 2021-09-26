import { getHash } from "../../src/utils/getHash";
import { notStrictEqual, strictEqual } from "assert";

describe("getHash", () => {
    it("Should not output the input string", () => {
        notStrictEqual(getHash("test"), "test");
        notStrictEqual(getHash("test", -1), "test");
        notStrictEqual(getHash("test", 0), "test");
        notStrictEqual(getHash("test", null), "test");
    });

    it("Should return a hashed value", () => {
        strictEqual(getHash("test"), "2f327ef967ade1ebf4319163f7debbda9cc17bb0c8c834b00b30ca1cf1c256ee");
    });

    it("Should be able to output the same has the DB upgrade script will output", () => {
        strictEqual(getHash("vid", 1), "1ff838dc6ca9680d88455341118157d59a055fe6d0e3870f9c002847bebe4663");
    });

    it("Should take a variable number of passes", () => {
        strictEqual(getHash("test", 1), "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08");
        strictEqual(getHash("test", 2), "7b3d979ca8330a94fa7e9e1b466d8b99e0bcdea1ec90596c0dcc8d7ef6b4300c");
        strictEqual(getHash("test", 3), "5b24f7aa99f1e1da5698a4f91ae0f4b45651a1b625c61ed669dd25ff5b937972");
    });

    it("Should default to 5000 passes", () => {
        strictEqual(getHash("test"), getHash("test", 5000));
    });

    it("Should not take a negative number of passes", () => {
        strictEqual(getHash("test", -1), "");
    });
});
