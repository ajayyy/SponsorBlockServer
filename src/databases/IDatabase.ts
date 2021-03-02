export interface IDatabase {
    init(): void;

    prepare(type: QueryType, query: string, params?: any[]): Promise<any | any[] | void>;
}

export type QueryType = 'get' | 'all' | 'run';
