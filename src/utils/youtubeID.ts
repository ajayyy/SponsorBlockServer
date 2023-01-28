import { VideoID } from "../types/segments.model";

const idRegex = new RegExp(/([0-9A-Za-z_-]{11})/); // group to always be index 1
const exclusiveIdegex = new RegExp(`^${idRegex.source}$`);
// match /c/, /channel/, /@channel, full UUIDs
const negativeRegex = new RegExp(/(\/(channel|c)\/.+)|(\/@.+)|([a-f0-9]{64,65})|(youtube\.com\/clip\/)/);
const urlRegex = new RegExp(`(?:v=|/|youtu.be/)${idRegex.source}(?:|/|[?&]t=\\d+s?)>?(?:\\s|$)`);
const negateIdRegex = new RegExp(/(?:[^0-9A-Za-z_-]*?)/);
const looseEndsRegex = new RegExp(`${negateIdRegex.source}${idRegex.source}${negateIdRegex.source}`);

export const validate = (id: string): boolean => exclusiveIdegex.test(id);

export const sanitize = (id: string): VideoID | null => {
    // first decode URI
    id = decodeURIComponent(id);
    // strict matching
    const strictMatch = id.match(exclusiveIdegex)?.[1];
    const urlMatch = id.match(urlRegex)?.[1];
    // return match, if not negative, return looseMatch
    const looseMatch = id.match(looseEndsRegex)?.[1];
    return strictMatch ? (strictMatch as VideoID)
        : negativeRegex.test(id) ? null
            : urlMatch ? (urlMatch as VideoID)
                : looseMatch ? (looseMatch as VideoID)
                    : null;
};