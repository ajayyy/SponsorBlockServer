export const slopVoteNamesToID: Record<string, number> = {
    "human": -1,
    "ai-script": 100,
    "ai-music": 110,
    "ai-thumbnail": 120,
    "ai-graphics-most": 130,
    "ai-graphics-limited": 131,
    "ai-graphics-commentary": 132,
    "tts-mostly-tts": 200,
    "tts-mostly-human": 201,
    "tts-ai": 202,
    "ai-topic-no-examples": 300,
    "ai-topic-examples": 301,
    "fiction": 400,
    "funny": 1000,
    "entertaining": 1010,
    "creative": 1020,
    "informative": 1030,
    "boring": 2000,
    "low-quality": 2010,
    "misleading": 2020,
    "scam": 2030,
    "rating": 10000
};

export const slopVoteIDToNames = Object.fromEntries(Object.entries(slopVoteNamesToID).map(a => a.reverse()));