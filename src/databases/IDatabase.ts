export interface QueryOption {
    useReplica?: boolean;
}

export interface IDatabase {
    init(): Promise<void>;

    prepare(type: QueryType, query: string, params?: any[], options?: QueryOption): Promise<any | any[] | void>;
}

export type QueryType = "get" | "all" | "run";