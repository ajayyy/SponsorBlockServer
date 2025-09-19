export interface QueryOption {
    useReplica?: boolean;
    forceReplica?: boolean;
}

export interface IDatabase {
    init(): Promise<void>;

    prepare(type: "run", query: string, params?: any[], options?: QueryOption): Promise<void>;
    prepare(type: "get", query: string, params?: any[], options?: QueryOption): Promise<any>;
    prepare(type: "all", query: string, params?: any[], options?: QueryOption): Promise<any[]>;
    prepare(type: QueryType, query: string, params?: any[], options?: QueryOption): Promise<any>;

    highLoad(): boolean;

    shouldUseRedisTimeout(): boolean;
}

export type QueryType = "get" | "all" | "run";
