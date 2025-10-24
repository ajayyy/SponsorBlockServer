export interface ICategoryVote {
    UUID: string;
    category: string;
    votes?: number;
    id: number;
}

export class CategoryVote {
    public UUID: string;
    public category: string;
    public votes: number = 0;
    public id: number;

    constructor(data: ICategoryVote) {
        Object.assign(this, data);
    }
}
