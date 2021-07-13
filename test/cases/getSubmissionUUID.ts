import {getSubmissionUUID} from '../../src/utils/getSubmissionUUID';
import assert from 'assert';
import { ActionType, VideoID } from '../../src/types/segments.model';
import { UserID } from '../../src/types/user.model';

describe('getSubmissionUUID', () => {
    it('Should return the hashed value', () => {
        assert.strictEqual(getSubmissionUUID('video001' as VideoID, 'skip' as ActionType, 'testuser001' as UserID, 13.33337, 42.000001), '3572aa64e0a2d6352c3de14ca45f8a83d193c32635669a7ae0b40c9eb36395872');
    });
});
