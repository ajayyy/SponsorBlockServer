import {db} from '../databases/databases';
import {createMemoryCache} from '../utils/createMemoryCache';
import {config} from '../config';
import {Request, Response} from 'express';

const MILLISECONDS_IN_MINUTE = 60000;
const getCategoryStatsCache = createMemoryCache(generateCategoryStats, config.getCategoryStatsCacheTimeMinutes * MILLISECONDS_IN_MINUTE);


export async function getCategoryStats(req: Request, res: Response) {
    const sortBy = req.query.sortBy as string;
    const sortByOrder = req.query.order as string ?? 'asc';

    if (!isSortByValid(sortBy) || !isSortByOrderValid(sortByOrder)) {
        return res.sendStatus(400);
    }

    const stats = await getCategoryStatsCache(sortBy, sortByOrder.toUpperCase());

    res.send(stats);
}

function generateCategoryStats(sortBy: string, sortByOrder: string) {
    return new Promise((resolve) => {
        const query = `
            SELECT
                category,
                COUNT(*) as totalSubmissions,
                SUM(views) as viewCount,
                ROUND(SUM((sponsorTimes.endTime - sponsorTimes.startTime) / 60 * sponsorTimes.views), 2) as minutesSaved,
                SUM(votes) as userVotes 
            FROM sponsorTimes
            LEFT JOIN userNames ON sponsorTimes.userID=userNames.userID
            LEFT JOIN privateDB.shadowBannedUsers ON sponsorTimes.userID=privateDB.shadowBannedUsers.userID
            WHERE sponsorTimes.votes > -1 AND sponsorTimes.shadowHidden != 1 AND privateDB.shadowBannedUsers.userID IS NULL
            GROUP BY category
            ORDER BY ${sortBy} ${sortByOrder}
        `;

        const items = db
            .getAll<CategoryStats>(query)
            .filter(item => config.isCategoryInConfig(item.category))
            .map(item => ({...item, categoryLabel: config.getCategoryLabel(item.category)}))
        resolve(items);
    });
}

function isSortByValid(givenSortBy: string) {
    return ['category', 'totalSubmissions', 'viewCount', 'minutesSaved', 'userVotes'].includes(givenSortBy);
}

function isSortByOrderValid(givenSortByOrder: string) {
    return ['asc', 'desc'].includes(givenSortByOrder.toLowerCase());
}

interface CategoryStats {
    category: string;
    categoryLabel: string;
    totalSubmissions: number;
    viewCount: number;
    minutesSaved: number;
    userVotes: number;
}
