import {getSubmissionUUID} from '../../src/utils/getSubmissionUUID';
import assert from 'assert';

describe('getSubmissionUUID', () => {
    it('Should return the hashed value', () => {
        assert.strictEqual(getSubmissionUUID('video001', 'sponsor', 'testuser001', 13.33337, 42.000001), '1d33d7016aa6482849019bd906d75c08fe6b815e64e823146df35f66c35612dd');
    });
});
