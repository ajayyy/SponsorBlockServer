import {getHash} from './getHash';
import { HashedValue } from '../types/hash.model';

export function getSubmissionUUID(videoID: string, category: string, userID: string, startTime: number, endTime: number): HashedValue{
    return getHash('v2-categories' + videoID + startTime + endTime + category + userID, 1);
}
