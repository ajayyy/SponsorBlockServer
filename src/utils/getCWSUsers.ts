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

/* istanbul ignore next */
export function getChromeUsers(chromeExtensionUrl: string): Promise<number> {
    return axios.get(chromeExtensionUrl)
        .then(res => {
            const body = res.data;
            // 2024-02-09
            // >20,000 users<
            const match = body.match(/>([\d,]+) users</)?.[1];
            if (match) {
                return parseInt(match.replace(/,/g, ""));
            }
        })
        .catch(/* istanbul ignore next */ () => {
            Logger.debug(`Failing to connect to ${chromeExtensionUrl}`);
            return 0;
        });
}