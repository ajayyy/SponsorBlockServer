import {config} from '../config';
import {Logger} from './logger';
import redis, {Callback} from 'redis';

let get, set;
if (config.redis) {
    Logger.info('Connected to redis');
    const client = redis.createClient(config.redis);
    get = client.get;
    set = client.set;
} else {
    get = (key: string, callback?: Callback<string | null>) => callback(null, undefined);
    set = (key: string, value: string, callback?: Callback<string | null>) => callback(null, undefined);
}

export {
    get,
    set,
};
