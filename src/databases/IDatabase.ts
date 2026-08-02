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
    transaction(transaction: Transaction): Promise<void>;

    highLoad(): boolean;

    shouldUseRedisTimeout(): boolean;
}

export interface Query {
    query: string;
    params?: any[];
}

export class Transaction {
    queries: Query[] = [];
    executed = false;

    add(query: string, params?: any[]) {
        this.queries.push({
            query,
            params: params
        });
    }
}

export type QueryType = "get" | "all" | "run";
