import {getHash} from './getHash';
import { HashedValue } from '../types/hash.model';
import { ActionType, Category, VideoID } from '../types/segments.model';
import { UserID } from '../types/user.model';

export function getSubmissionUUID(videoID: VideoID, actionType: ActionType, userID: UserID, startTime: number, endTime: number): HashedValue{
    return `3${getHash('v3' + videoID + startTime + endTime + userID, 1)}` as HashedValue;
}
