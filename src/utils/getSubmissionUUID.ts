import {getHash} from './getHash';

export function getSubmissionUUID(videoID: string, category: string, userID: string, startTime: number, endTime: number) {
    return getHash('v2-categories' + videoID + startTime + endTime + category + userID, 1);
}
