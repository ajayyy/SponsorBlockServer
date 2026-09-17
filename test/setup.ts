import fs from "fs";
import { Server } from "http";
import rateLimit from "express-rate-limit";

import { config } from "#config";
import { createServer } from "#app";
import { Logger } from "#utils/logger";
import { initDb } from "#databases/databases";
import redis from "#utils/redis";
import { setMockRateLimitMiddleware } from "#middleware/requestRateLimit";

import { createMockServer } from "#test/mocks";
import { resetRedis, resetPostgres } from "#test/utils/reset";
import { YouTubeAPI } from "#utils/youtubeApi";
import { YouTubeApiMock } from "#test/mocks/youtubeMock";

let mockServer: Server, server: Server;
const originalYoutubeListVideos = YouTubeAPI.listVideos;

export async function mochaGlobalSetup() {
    setMockRateLimitMiddleware(() => rateLimit({
        skip: () => true
    }));
    YouTubeAPI.listVideos = YouTubeApiMock.listVideos;

    // delete old test database
    if (fs.existsSync(config.db)) fs.unlinkSync(config.db);
    if (fs.existsSync(config.privateDB)) fs.unlinkSync(config.privateDB);
    if (config?.redis?.enabled) await resetRedis();
    if (config?.postgres) await resetPostgres();

    await initDb();

    const dbMode = "postgres";
    Logger.info(`Database Mode: ${dbMode}`);

    // set commit at headCommit
    (global as any).HEADCOMMIT = "test";

    await new Promise<void>((resolve) => {
        mockServer = createMockServer(() => {
            Logger.info("Started mock HTTP Server");
            server = createServer(() => {
                Logger.info("Started main HTTP server");
                resolve();
            });
        });
    });
}

export function mochaGlobalTeardown() {
    setMockRateLimitMiddleware(undefined);
    YouTubeAPI.listVideos = originalYoutubeListVideos;

    mockServer.close();
    server.close();
    redis.destroy();
}
