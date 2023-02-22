import axios from "axios";
import { Logger } from "../utils/logger";

export const getCWSUsers = (extID: string): Promise<number | undefined> =>
    axios.post(`https://chrome.google.com/webstore/ajax/detail?pv=20210820&id=${extID}`)
        .then(res => res.data.split("\n")[2])
        .then(data => JSON.parse(data))
        .then(data => (data[1][1][0][23]).replaceAll(/,|\+/g,""))
        .then(data => parseInt(data))
        .catch((err) => {
            Logger.error(`Error getting chrome users - ${err}`);
            return 0;
        });