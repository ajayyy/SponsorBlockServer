export interface IVideoInfo {
    videoID: string;
    channelID: string;
    title: string;
    published: number;
}

export class VideoInfo {
    public videoID: string;
    public channelID: string;
    public title: string;
    public published: number;

    constructor(data: IVideoInfo) {
        this.videoID = data.videoID;
        this.channelID = data.channelID;
        this.title = data.title;
        this.published = data.published;
    }
}
