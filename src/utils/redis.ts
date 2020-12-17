import {config} from '../config';
import {Logger} from './logger';
import redis, {Callback} from 'redis';

let exportObject = {
    get: (key: string, callback?: Callback<string | null>) => callback(null, undefined),
    set: (key: string, value: string, callback?: Callback<string | null>) => callback(null, undefined)
};

if (config.redis) {
    Logger.info('Connected to redis');
    const client = redis.createClient(config.redis);
    exportObject = client;
}

export default exportObject;
