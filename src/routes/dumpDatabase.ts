import {db} from '../databases/databases';
import {Logger} from '../utils/logger';
import {Request, Response} from 'express';
import { config } from '../config';

const ONE_MINUTE = 1000 * 60;

const styleHeader = `<style>body{font-family: sans-serif}</style>`

const licenseHeader = `<p>The API and database follow <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" rel="nofollow">CC BY-NC-SA 4.0</a> unless you have explicit permission.</p>
<p><a href="https://gist.github.com/ajayyy/4b27dfc66e33941a45aeaadccb51de71">Attribution Template</a></p>
<p>If you need to use the database or API in a way that violates this license, contact me with your reason and I may grant you access under a different license.</p></a></p>`;

const tables = config?.dumpDatabase?.tables ?? [];
const MILLISECONDS_BETWEEN_DUMPS = config?.dumpDatabase?.minTimeBetweenMs ?? ONE_MINUTE;
const exportPath = config?.dumpDatabase?.exportPath ?? '/opt/exports';

if (tables.length === 0) {
    Logger.warn('[dumpDatabase] No tables configured');
}

const links: string[] = tables.map((table) => `/database/${table.name}.csv`);

const linksHTML: string = tables.map((table) => `<p><a href="/database/${table.name}.csv">${table.name}.csv</a></p>`)
                        .reduce((acc, url) => acc + url, "");

let lastUpdate = 0;

export default function dumpDatabase(req: Request, res: Response, showPage: boolean) {
    if (config?.dumpDatabase?.enabled === false) {
        res.status(404).send("Database dump is disabled");
        return;
    }
    if (!config.postgres) {
        res.status(404).send("Not supported on this instance");
        return;
    }

    const now = Date.now();
    const updateQueued = now - lastUpdate > MILLISECONDS_BETWEEN_DUMPS;

    res.status(200)
    
    if (showPage) {
        res.send(`${styleHeader}
            <h1>SponsorBlock database dumps</h1>${licenseHeader}
            <h3>How this works</h3>
            Send a request to <code>https://sponsor.ajay.app/database.json</code>, or visit this page to trigger the database dump to run.
            Then, you can download the csv files below, or use the links returned from the JSON request.
            <h3>Links</h3>
            ${linksHTML}<br/>
            ${updateQueued ? `Update queued.` : ``} Last updated: ${lastUpdate ? new Date(lastUpdate).toUTCString() : `Unknown`}`);
    } else {
        res.send({
            lastUpdated: lastUpdate,
            updateQueued,
            links
        })
    }

    if (updateQueued) {
        lastUpdate = Date.now();

        for (const table of tables) {
            db.prepare('run', `COPY (SELECT * FROM "${table.name}"${table.order ? ` ORDER BY "${table.order}"` : ``}) 
                    TO '${exportPath}/${table.name}.csv' WITH (FORMAT CSV, HEADER true);`);
        }
    }
}
