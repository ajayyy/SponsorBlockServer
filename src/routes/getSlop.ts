import { Request, Response } from "express";
import { isEmpty } from "lodash";
import { db } from "../databases/databases";
import { ContentIDHash, ProfileIDHash } from "../types/slop.model";
import { AllBloomFilters, numberOfHashes } from "../utils/bloomFilter";
import { hashPrefixTester } from "../utils/hashPrefixTester";
import { Logger } from "../utils/logger";
import { QueryCacher } from "../utils/queryCacher";
import { slopContentHashKey, slopProfileFromContentHashKey, slopProfileHashKey } from "../utils/redisKeys";
import { slopVoteIDToNames } from "../utils/slop";

interface SlopByHashResult {
    content: Record<string, {
        id: number;
        votes: number;
        profileID?: string;
    }[]>;
    profile: Record<string, {
        id: number;
        voteSum: number;
        votes: number;
    }[]>;
}

export async function getSlopByHash(contentIdHashPrefix: ContentIDHash, profileIdHashPrefix: ProfileIDHash): Promise<SlopByHashResult> {
    const contentVotesPromise = QueryCacher.get(() => db.prepare("all", `SELECT "id", "count", "contentID", "profileID"
            FROM "slopVotes"
            WHERE "hashedContentID" LIKE ?
            `, [`${contentIdHashPrefix}%`])
    , slopContentHashKey(contentIdHashPrefix));

    let profileVotesPromise = Promise.resolve([]);

    if (profileIdHashPrefix) {
        profileVotesPromise = QueryCacher.get(() => db.prepare("all", `SELECT "profileID", "id", SUM("count") as voteSum, COUNT(*) as count 
                FROM "slopVotes"
                WHERE "hashedProfileID" LIKE ?
                AND "wholeProfile" > 0
                GROUP BY "profileID", "id"`
        , [`${profileIdHashPrefix}%`])
        , slopProfileHashKey(profileIdHashPrefix));
    } else {
        profileVotesPromise = QueryCacher.get(() => db.prepare("all", `SELECT "profileID", "id", SUM("count") as voteSum, COUNT(*) as count 
                FROM "slopVotes"
                WHERE "wholeProfile" > 0 AND
                    "profileID" IN (
                        SELECT "profileID"
                        FROM "slopVotes"
                        WHERE "hashedContentID" LIKE ?
                        AND "wholeProfile" > 0
                    )
                GROUP BY "profileID", "id"
            `, [`${contentIdHashPrefix}%`])
        , slopProfileFromContentHashKey(contentIdHashPrefix));
    }

    const contentVotes = await contentVotesPromise;
    const profileVotes = await profileVotesPromise;

    const processedResult: SlopByHashResult = {
        content: {},
        profile: {}
    };

    for (const contentVote of contentVotes) {
        processedResult.content[contentVote.contentID] ??= [];
        processedResult.content[contentVote.contentID].push({
            id: slopVoteIDToNames[contentVote.id],
            votes: contentVote.count
        });
    }

    for (const profileVote of profileVotes) {
        if (profileVote.count > 1 && profileVote.voteSum > 1) {
            processedResult.content[profileVote.contentID] ??= [];
            processedResult.profile[profileVote.profileID].push({
                id: slopVoteIDToNames[profileVote.id],
                voteSum: profileVote.voteSum,
                votes: profileVote.count
            });
        }
    }

    return processedResult;
}

export async function getSlopByHashEndpoint(req: Request, res: Response) {
    let contentPrefix = req.query.contentPrefix as ContentIDHash;
    let profilePrefix = req.query.profilePrefix as ProfileIDHash | undefined;
    if (!contentPrefix || !hashPrefixTester(contentPrefix) || contentPrefix.length !== 4
            || (profilePrefix && !hashPrefixTester(profilePrefix))) {
        return res.status(400).send("Hash prefix does not match format requirements."); // Exit early on faulty prefix
    }
    contentPrefix = contentPrefix.toLowerCase() as ContentIDHash;
    profilePrefix = profilePrefix ? profilePrefix.toLowerCase() as ProfileIDHash : null;

    try {
        const result = await getSlopByHash(contentPrefix, profilePrefix);

        //todo: will have to handle the fact that multiple redis keys are used, need to check both last modified
        // await getEtag("brandingHash", (contentPrefix as string), service)
        //     .then(etag => res.set("ETag", etag))
        //     .catch(() => ({}));

        const status = !isEmpty(result) ? 200 : 404;
        return res.status(status).json(result);
    } catch (e) {
        Logger.error(e as string);
        return res.status(500).send([]);
    }
}

export async function getSlopBloomFilter(req: Request, res: Response) {
    const bloomID = parseInt(req.params.bloomID);
    if (!bloomID || isNaN(bloomID) || !AllBloomFilters.includes(bloomID)) {
        return res.status(400).send("Missing or invalid bloom filter ID");
    }

    const bloom = await db.prepare("get", `SELECT "data", "timeGenerated" FROM "slopBloom" WHERE id = ?`, [bloomID]);
    const filter = bloom?.data as Buffer | undefined;

    if (filter) {
        res.setHeader("Content-Type", "application/octet-stream");

        // Send number of hashes in bloom
        {
            res.write(Buffer.from([numberOfHashes]));

            const buf = Buffer.allocUnsafe(8);
            buf.writeBigInt64LE(BigInt(bloom.timeGenerated));
            res.write(buf);
        }

        res.write(filter);

        return res.status(200).end();
    } else {
        return res.status(400).send("Bloom filter doesn't exist");
    }
}

const diffThreshold = 1000 * 60 * 60 * 24;
export async function getSlopBloomDiff(req: Request, res: Response) {
    const bloomID = parseInt(req.params.bloomID);
    if (!bloomID || isNaN(bloomID) || !AllBloomFilters.includes(bloomID)) {
        return res.status(400).send("Missing or invalid bloom filter ID");
    }

    const now = Date.now();
    const diffData = await db.prepare("all", `SELECT "index", "data" FROM "slopBloomDiff"
        WHERE "id" = ? AND "timeGenerated" > ?
        ORDER BY "data" ASC, "timeGenerated" ASC`, [bloomID, now - diffThreshold]);

    if (diffData) {
        res.setHeader("Content-Type", "application/octet-stream");

        const timeGeneratedData = await db.prepare("get", `SELECT "timeGenerated" FROM "slopBloom" WHERE "id" = ?`, [bloomID]);

        // Initial timestamp, to refetch if it's too new
        {
            res.write(Buffer.from([numberOfHashes]));

            const buf = Buffer.allocUnsafe(8);
            buf.writeBigInt64LE(BigInt(timeGeneratedData.timeGenerated));
            res.write(buf);
        }

        // Return a list of changes to zeros, then a list of changes to ones
        let lastData = false;
        for (const diff of diffData) {
            if (diff.data !== lastData) {
                // Indicate that it is now switching to ones
                res.write(Buffer.alloc(8));
                lastData = diff.data;
            }

            const buf = Buffer.allocUnsafe(4);
            buf.writeUInt32LE(diff.index);
            res.write(buf);
        }

        return res.status(200).end();
    } else {
        return res.status(400).send("Bloom filter doesn't exist");
    }
}