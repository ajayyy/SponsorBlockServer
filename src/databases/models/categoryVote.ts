export interface ICategoryVote {
    UUID: string;
    category: string;
    votes?: number;
    id?: number;
}

export class CategoryVote {
    public UUID: string;
    public category: string;
    public votes: number;
    // SERIAL PK
    public id: number|null;

    constructor(data: ICategoryVote) {
        this.UUID = data.UUID;
        this.category = data.category;
        this.votes = data?.votes ?? 0;
        this.id = data?.id ?? null;
    }
}
