import {db} from '../databases/databases';
import {createMemoryCache} from '../utils/createMemoryCache';
import {config} from '../config';
import {Request, Response} from 'express';

const MILLISECONDS_IN_MINUTE = 60000;
const getTopUsersWithCache = createMemoryCache(generateTopUsersStats, config.getTopUsersCacheTimeMinutes * MILLISECONDS_IN_MINUTE);

function generateTopUsersStats(sortBy: string, categoryStatsEnabled: boolean = false) {
    return new Promise((resolve) => {
        let additionalFields = '';
        if (categoryStatsEnabled) {
            additionalFields += "SUM(CASE WHEN category = 'sponsor' THEN 1 ELSE 0 END) as category__sponsor, " +
                "SUM(CASE WHEN category = 'intro' THEN 1 ELSE 0 END) as category__intro, " +
                "SUM(CASE WHEN category = 'outro' THEN 1 ELSE 0 END) as category__outro, " +
                "SUM(CASE WHEN category = 'interaction' THEN 1 ELSE 0 END) as category__interaction, " +
                "SUM(CASE WHEN category = 'selfpromo' THEN 1 ELSE 0 END) as category__selfpromo, " +
                "SUM(CASE WHEN category = 'music_offtopic' THEN 1 ELSE 0 END) as category__music_offtopic, ";
        }

        const rows = db.getAll<UserStatsDbRow>( "SELECT COUNT(*) as totalSubmissions, SUM(views) as viewCount," +
            "ROUND(SUM((sponsorTimes.endTime - sponsorTimes.startTime) / 60 * sponsorTimes.views), 2) as minutesSaved, " +
            "SUM(votes) as userVotes, " +
            additionalFields +
            "IFNULL(userNames.userName, sponsorTimes.userID) as userName FROM sponsorTimes LEFT JOIN userNames ON sponsorTimes.userID=userNames.userID " +
            "LEFT JOIN privateDB.shadowBannedUsers ON sponsorTimes.userID=privateDB.shadowBannedUsers.userID " +
            "WHERE sponsorTimes.votes > -1 AND sponsorTimes.shadowHidden != 1 AND privateDB.shadowBannedUsers.userID IS NULL " +
            "GROUP BY IFNULL(userName, sponsorTimes.userID) HAVING userVotes > 20 " +
            "ORDER BY " + sortBy + " DESC LIMIT 100");

        const userStats = rows.map(row => {
            const userStatsItem: UserStats = {
                userName: row.userName,
                minutesSaved: row.minutesSaved,
                totalSubmissions: row.totalSubmissions,
                userVotes: row.userVotes,
                viewCount: row.viewCount,
            };

            if (categoryStatsEnabled) {
                userStatsItem.categoryStats = Object.entries(row)
                    .filter(([key]) => key.startsWith('category__'))
                    .map(([key, value]) => [key.substr('category__'.length), value])
                    .reduce((arr, [categoryName, value]) => {
                        const categoryStatsItem: CategoryStats = {
                            category: categoryName,
                            categoryLabel: config.getCategoryLabel(categoryName),
                            count: value,
                        };
                        arr.push(categoryStatsItem);
                        return arr;
                    }, []);
            }

            return userStatsItem;
        });

        resolve(userStats);
    });
}

export async function getTopUsers(req: Request, res: Response) {
    const sortType = parseInt(req.query.sortType as string);
    const categoryStatsEnabled = req.query.categoryStats === 'true';

    if (sortType == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //setup which sort type to use
    let sortBy = '';
    if (sortType == 0) {
        sortBy = 'minutesSaved';
    } else if (sortType == 1) {
        sortBy = 'viewCount';
    } else if (sortType == 2) {
        sortBy = 'totalSubmissions';
    } else {
        //invalid request
        return res.sendStatus(400);
    }

    const stats = await getTopUsersWithCache(sortBy, categoryStatsEnabled);

    //send this result
    res.send(stats);
}

interface UserStats {
    userName: string;
    totalSubmissions: number;
    viewCount: number;
    minutesSaved: number;
    userVotes: number;
    categoryStats?: CategoryStats[];
}

interface CategoryStats {
    category: string;
    categoryLabel: string;
    count: number;
}

interface UserStatsDbRow {
    userName: string;
    totalSubmissions: number;
    viewCount: number;
    minutesSaved: number;
    userVotes: number;
    category__sponsor?: number;
    category__intro?: number;
    category__outro?: number;
    category__interaction?: number;
    category__selfpromo?: number;
    category__music_offtopic?: number;
}
