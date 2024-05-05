export interface QueryOption {
    useReplica?: boolean;
    forceReplica?: boolean;
}

export interface IDatabase {
    init(): Promise<void>;

    prepare(type: QueryType, query: string, params?: any[], options?: QueryOption): Promise<any | any[] | void>;

    highLoad(): boolean;

    shouldUseRedisTimeout(): boolean;
}

export type QueryType = "get" | "all" | "run";