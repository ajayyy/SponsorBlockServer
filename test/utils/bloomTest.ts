import * as murmurhash3js from "murmurhash3js";
import { numberOfHashes } from "../../src/utils/bloomFilter";

function hashContent(data: string, bloomSize: number): number[] {
    const result = new Array(numberOfHashes);
    for (let i = 0; i < numberOfHashes; i++) {
        result[i] = murmurhash3js.x86.hash32(data, i) % bloomSize;
    }

    return result;
}

export function checkBloom(bloomData: Buffer | ArrayBuffer, contentID: string): boolean {
    const data = new Uint8Array(bloomData);

    const hashes = hashContent(contentID, data.length * 8);
    let success = false;
    for (const hash of hashes) {
        const hashByte = Math.floor(hash / 8);
        const checkByte = data[hashByte];

        if (!(checkByte & (1 << (7 - hash % 8)))) {
            success = false;
            break;
        } else {
            success = true;
        }
    }

    return success;
}