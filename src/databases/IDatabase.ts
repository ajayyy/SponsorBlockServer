export interface IDatabase {
    init(): void;

    prepare(type: QueryType, query: string, params: any[]): any;

    get<TModel>(query: string, params: any[]): TModel;
    getAll<TModel>(query: string, params: any[]): TModel[];
    run(query: string, params: any[]): void;

    exec(query: string): any;
}

export type QueryType = 'get' | 'all' | 'run';
